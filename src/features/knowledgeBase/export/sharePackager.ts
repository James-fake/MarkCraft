/**
 * 知识库分享包导出/导入
 * .mcshare 格式：ZIP 包，内含 manifest.json + files/ + canvases/
 */
import JSZip from 'jszip'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

// i18n：非 React 模块，由调用方注入 messages（UI 侧传 t.exportKit）。
// 接口 key 与 locale 段 exportKit 对齐，调用方可直接传 t.exportKit。
// 中文 DEFAULT_* 兜底，保证既有断言（中文）测试零改动通过。
export interface KbExportMessages {
  kbPdfWindowBlocked: string
  kbPdfFailed: string
  kbMdFailed: string
  shareCreateFilesDirFailed: string
  shareCreateCanvasesDirFailed: string
  shareExportFailed: string
  shareMissingManifest: string
  shareManifestParseFailed: string
  shareUnsupportedFormat: string
  shareImportFailed: string
  siteBackToHome: string
  siteTagLabel: string
}

export const DEFAULT_KB_EXPORT_MESSAGES: KbExportMessages = {
  kbPdfWindowBlocked: '无法打开打印窗口，请检查浏览器是否拦截了弹窗',
  kbPdfFailed: '导出 PDF 失败：',
  kbMdFailed: '导出 Markdown 失败：',
  shareCreateFilesDirFailed: '创建 files 目录失败',
  shareCreateCanvasesDirFailed: '创建 canvases 目录失败',
  shareExportFailed: '导出分享包失败：',
  shareMissingManifest: '分享包中缺少 manifest.json，可能不是有效的 .mcshare 文件',
  shareManifestParseFailed: 'manifest.json 解析失败，文件可能已损坏',
  shareUnsupportedFormat: '不支持的分享包格式：',
  shareImportFailed: '导入分享包失败：',
  siteBackToHome: '← 返回首页',
  siteTagLabel: '标签：',
}

/** 分享包清单文件结构 */
interface ShareManifest {
  format: 'mcshare'
  version: 1
  exportedAt: number
  kb: {
    name: string
    description: string
    tags: string[]
  }
  fileCount: number
  canvasCount: number
}

/** 从文件内容中提取标签（#tag 形式，支持中文） */
function extractTags(files: FileNode[]): string[] {
  const tagSet = new Set<string>()
  for (const file of files) {
    const content = file.content ?? ''
    const matches = content.match(/(?:^|\s)#([\w\u4e00-\u9fa5-]+)/g)
    if (matches) {
      for (const m of matches) {
        tagSet.add(m.trim().slice(1))
      }
    }
  }
  return Array.from(tagSet)
}

/**
 * ZIP 内唯一名：不同目录下的同名文件（如 a/README.md、b/README.md）扁平化到 files/ 后会
 * 互相覆盖，导致导出静默丢文件。此处按需追加 -2/-3… 后缀（保扩展名）。
 */
function uniqueZipName(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 2
  let candidate = `${base}-${i}${ext}`
  while (used.has(candidate)) {
    i += 1
    candidate = `${base}-${i}${ext}`
  }
  used.add(candidate)
  return candidate
}

/**
 * 导出知识库为分享包（.mcshare）
 * @param kb 知识库
 * @param files 文件列表
 * @param canvases 关联画布数据（可选）
 * @returns ZIP 格式的 Blob
 */
export async function exportKbPackage(
  kb: KnowledgeBase,
  files: FileNode[],
  canvases?: { id: string; name: string; data: unknown }[],
  messages: KbExportMessages = DEFAULT_KB_EXPORT_MESSAGES,
): Promise<Blob> {
  try {
    const zip = new JSZip()
    const now = Date.now()
    const tags = extractTags(files)

    // 1. 收集文件内容并写入 files/
    const filesFolder = zip.folder('files')
    if (!filesFolder) {
      throw new Error(messages.shareCreateFilesDirFailed)
    }
    const usedFileNames = new Set<string>()
    for (const file of files) {
      const content = file.content ?? ''
      // 文件名可能含路径分隔符，统一取文件名避免目录嵌套
      const safeName = file.name.split(/[\\/]/).pop() || file.name
      // 去重：避免不同目录同名文件在扁平化后互相覆盖（静默丢文件）
      filesFolder.file(uniqueZipName(usedFileNames, safeName), content)
    }

    // 2. 收集关联画布数据并写入 canvases/
    const canvasList = canvases ?? []
    if (canvasList.length > 0) {
      const canvasesFolder = zip.folder('canvases')
      if (!canvasesFolder) {
        throw new Error(messages.shareCreateCanvasesDirFailed)
      }
      const usedCanvasNames = new Set<string>()
      for (const cv of canvasList) {
        const safeName = (cv.name.split(/[\\/]/).pop() || cv.name).replace(/\.json$/i, '')
        // 去重：同名画布在扁平化后互相覆盖
        canvasesFolder.file(uniqueZipName(usedCanvasNames, `${safeName}.json`), JSON.stringify({
          id: cv.id,
          name: cv.name,
          data: cv.data,
        }))
      }
    }

    // 3. 生成清单文件
    const manifest: ShareManifest = {
      format: 'mcshare',
      version: 1,
      exportedAt: now,
      kb: {
        name: kb.name,
        description: kb.description,
        tags,
      },
      fileCount: files.length,
      canvasCount: canvasList.length,
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // 4. 打包为 Blob（使用 DEFLATE 压缩）
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    return blob
  } catch (err) {
    console.error('[KB] 导出分享包失败:', err)
    throw new Error(`${messages.shareExportFailed}${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * 从分享包导入（解析元数据与文件列表）
 * 注意：本函数只解析返回数据，不创建知识库实体，由调用者处理。
 * 传入的 createFolder/createFile/updateFileContent 回调预留给调用者在
 * 创建知识库与写入文件时使用，本函数内部不调用。
 * @param blob .mcshare 文件 Blob
 * @param createFolder 创建文件夹回调（由调用者使用）
 * @param createFile 创建文件回调（由调用者使用）
 * @param updateFileContent 更新文件内容回调（由调用者使用）
 * @returns 知识库元数据、文件列表与标签集合
 */
export async function importKbPackage(
  blob: Blob,
  createFolder: (parentId: string, name: string) => string,
  createFile: (parentId: string, name: string) => void,
  updateFileContent: (id: string, content: string) => void,
  messages: KbExportMessages = DEFAULT_KB_EXPORT_MESSAGES,
): Promise<{
  name: string
  description: string
  files: { name: string; content: string }[]
  tags: string[]
}> {
  // 引用回调参数以表明已被识别（实际文件创建由调用者完成，避免重复写入）
  void createFolder
  void createFile
  void updateFileContent

  try {
    // 1. 用 JSZip 解压
    const zip = await JSZip.loadAsync(blob)

    // 2. 读取 manifest.json
    const manifestFile = zip.file('manifest.json')
    if (!manifestFile) {
      throw new Error(messages.shareMissingManifest)
    }
    const manifestText = await manifestFile.async('string')
    let manifest: ShareManifest
    try {
      manifest = JSON.parse(manifestText) as ShareManifest
    } catch {
      throw new Error(messages.shareManifestParseFailed)
    }

    if (manifest.format !== 'mcshare') {
      throw new Error(`${messages.shareUnsupportedFormat}${manifest.format}`)
    }

    // 3. 读取 files/ 目录下所有文件
    const filesResult: { name: string; content: string }[] = []
    const fileEntries = Object.values(zip.files).filter(
      entry => !entry.dir && entry.name.startsWith('files/'),
    )
    for (const entry of fileEntries) {
      const content = await entry.async('string')
      const name = entry.name.replace(/^files\//, '')
      filesResult.push({ name, content })
    }

    // 4. 返回知识库元数据和文件列表
    return {
      name: manifest.kb.name,
      description: manifest.kb.description,
      files: filesResult,
      tags: manifest.kb.tags ?? [],
    }
  } catch (err) {
    console.error('[KB] 导入分享包失败:', err)
    throw new Error(`${messages.shareImportFailed}${err instanceof Error ? err.message : String(err)}`)
  }
}
