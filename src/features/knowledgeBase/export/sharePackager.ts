/**
 * 知识库分享包导出/导入
 * .mcshare 格式：ZIP 包，内含 manifest.json + files/ + canvases/
 */
import JSZip from 'jszip'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

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
): Promise<Blob> {
  try {
    const zip = new JSZip()
    const now = Date.now()
    const tags = extractTags(files)

    // 1. 收集文件内容并写入 files/
    const filesFolder = zip.folder('files')
    if (!filesFolder) {
      throw new Error('创建 files 目录失败')
    }
    for (const file of files) {
      const content = file.content ?? ''
      // 文件名可能含路径分隔符，统一取文件名避免目录嵌套
      const safeName = file.name.split(/[\\/]/).pop() || file.name
      filesFolder.file(safeName, content)
    }

    // 2. 收集关联画布数据并写入 canvases/
    const canvasList = canvases ?? []
    if (canvasList.length > 0) {
      const canvasesFolder = zip.folder('canvases')
      if (!canvasesFolder) {
        throw new Error('创建 canvases 目录失败')
      }
      for (const cv of canvasList) {
        const safeName = (cv.name.split(/[\\/]/).pop() || cv.name).replace(/\.json$/i, '')
        canvasesFolder.file(`${safeName}.json`, JSON.stringify({
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
    throw new Error(`导出分享包失败：${err instanceof Error ? err.message : String(err)}`)
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
      throw new Error('分享包中缺少 manifest.json，可能不是有效的 .mcshare 文件')
    }
    const manifestText = await manifestFile.async('string')
    let manifest: ShareManifest
    try {
      manifest = JSON.parse(manifestText) as ShareManifest
    } catch {
      throw new Error('manifest.json 解析失败，文件可能已损坏')
    }

    if (manifest.format !== 'mcshare') {
      throw new Error(`不支持的分享包格式：${manifest.format}`)
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
    throw new Error(`导入分享包失败：${err instanceof Error ? err.message : String(err)}`)
  }
}
