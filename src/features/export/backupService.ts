/**
 * F1 一键导出（P4 地基层 · 数据主权）
 *
 * 把虚拟文件树完整导出为真实 .md 目录的 ZIP 包：
 * - folder → 目录；file → .md 文件（内容保持 Markdown 纯文本，任意编辑器可打开）
 * - 图片：content 内 `![alt](image:<id>)` 占位符 → 从 imageStore 取 base64 → 落盘 `assets/<id>.<ext>`，
 *   引用改写为相对路径 `![alt](assets/<id>.<ext>)`；内存中缺失的图片保留占位符并记入缺失清单
 * - 附带 README.md（导出说明 + 统计）与 manifest.json（节点元数据：创建/更新时间、缺失图片）
 *
 * 依赖 jszip（已在 package.json）。纯逻辑与 DOM 解耦，便于 vitest 覆盖。
 */
import JSZip from 'jszip'
import type { FileNode } from '../../types/fileManager'
import { getBase64Image } from '@core/storage/imageStore'
import { downloadBlob } from './exportUtils'

// i18n：非 React 模块，由调用方注入 messages（UI 侧传 t.exportKit 映射后的对象）。
// 中文 DEFAULT_* 兜底，保证既有断言（中文）测试零改动通过。
export interface WorkspaceExportMessages {
  defaultFileName: string
  readmeEmpty: string
  readmeTitle: string
  readmeDate: string
  readmeFileCount: string
  readmeFolderCount: string
  readmeImageCount: string
  readmeMissingImages: string
  readmeImagesComplete: string
  readmeFooter: string
}

export const DEFAULT_WORKSPACE_EXPORT_MESSAGES: WorkspaceExportMessages = {
  defaultFileName: '未命名',
  readmeEmpty: '# MarkCraft 导出\n\n工作区为空，没有可导出的内容。\n',
  readmeTitle: '# MarkCraft 导出备份',
  readmeDate: '> 导出日期：{date} ｜ 由 MarkCraft 生成',
  readmeFileCount: '- 文件数：{n}',
  readmeFolderCount: '- 目录数：{n}',
  readmeImageCount: '- 图片：{n} 张（assets/ 目录，Markdown 以相对路径引用）',
  readmeMissingImages: '- ⚠️ 缺失图片 {n} 张（原始 base64 不在内存中，引用已保留为 image: 占位符）',
  readmeImagesComplete: '- 图片完整',
  readmeFooter: '该目录为纯 Markdown + 相对路径图片，可用任意 Markdown 编辑器（Typora / Obsidian / VS Code 等）直接打开。',
}

/** 图片引用解析结果 */
export interface ExportAsset {
  /** 图片 id（占位符中的 image:<id>） */
  id: string
  /** 落盘相对路径 assets/<id>.<ext> */
  path: string
  /** 完整 data URL（data:image/png;base64,...） */
  dataUrl: string
}

export interface ExportResult {
  /** 导出的文件数（.md） */
  fileCount: number
  /** 导出的目录数 */
  folderCount: number
  /** 成功导出的图片数 */
  assetCount: number
  /** 内存缺失、无法导出的图片 id */
  missingImages: string[]
  /** 文件名冲突处理后的文件名 */
  warnings: string[]
}

const IMAGE_REF_RE = /!\[([^\]]*)\]\((image:([^)]+))\)/g

/** 从 data URL 提取扩展名与 base64 体 */
function splitDataUrl(dataUrl: string): { ext: string; base64: string } | null {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  const extMap: Record<string, string> = { 'jpeg': 'jpg', 'svg+xml': 'svg' }
  return { ext: extMap[m[1].toLowerCase()] ?? m[1].toLowerCase(), base64: m[2] }
}

/** 转义为合法文件名（去非法字符） */
function safeFileName(
  name: string,
  defaultName: string = DEFAULT_WORKSPACE_EXPORT_MESSAGES.defaultFileName
): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || defaultName
}

/**
 * 把单个文件的 content 转为导出文本：
 * 解析 image:<id> 占位符 → 收集资产并改写为相对路径；缺失图片保留占位符。
 * 纯函数，便于测试。
 */
export function transformContentForExport(
  content: string,
  resolveImage: (id: string) => string | undefined,
): { markdown: string; assets: ExportAsset[]; missing: string[] } {
  const assets: ExportAsset[] = []
  const missing: string[] = []
  const seen = new Set<string>()

  const markdown = content.replace(IMAGE_REF_RE, (_m, alt, _full, id) => {
    if (seen.has(id)) {
      // 同 id 重复引用：指向已生成的资产路径
      const existing = assets.find((a) => a.id === id)
      return existing ? `![${alt}](${existing.path})` : `![${alt}](image:${id})`
    }
    const dataUrl = resolveImage(id)
    if (!dataUrl) {
      missing.push(id)
      return `![${alt}](image:${id})`
    }
    const parts = splitDataUrl(dataUrl)
    if (!parts) {
      missing.push(id)
      return `![${alt}](image:${id})`
    }
    seen.add(id)
    const path = `assets/${id}.${parts.ext}`
    assets.push({ id, path, dataUrl })
    return `![${alt}](${path})`
  })

  return { markdown, assets, missing }
}

/** 递归收集树内全部文件节点（深度优先，稳定顺序）。统一委托 fileTree.collectAllFiles（D4 单一数据源） */
import { collectAllFiles as collectFiles } from '@core/files/fileTree'
export { collectFiles }

/** 递归收集树内全部文件夹节点 */
export function collectFolders(root: FileNode | null): FileNode[] {
  const out: FileNode[] = []
  const walk = (node: FileNode) => {
    if (node.type === 'folder') {
      out.push(node)
      for (const child of node.children ?? []) walk(child)
    }
  }
  if (root) walk(root)
  return out
}

/** 计算文件树在磁盘上的相对路径（文件夹链 + 文件名） */
export function resolveRelativePath(root: FileNode, node: FileNode): string {
  const segments: string[] = [safeFileName(node.name)]
  let parent = node.parentId ? findById(root, node.parentId) : null
  let guard = 0
  while (parent && parent.type === 'folder' && parent.id !== root.id && guard++ < 64) {
    segments.unshift(safeFileName(parent.name))
    parent = parent.parentId ? findById(root, parent.parentId) : null
  }
  if (root.type === 'folder') {
    segments.unshift(safeFileName(root.name))
  }
  return segments.join('/')
}

function findById(root: FileNode, id: string): FileNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const hit = findById(child, id)
    if (hit) return hit
  }
  return null
}

/**
 * 一键导出：把整棵文件树打包为真实 .md 目录 ZIP。
 * 返回 Blob（可直接 downloadBlob）。
 */
export async function buildWorkspaceZip(
  root: FileNode | null,
  messages: WorkspaceExportMessages = DEFAULT_WORKSPACE_EXPORT_MESSAGES
): Promise<Blob> {
  const zip = new JSZip()
  const result: ExportResult = { fileCount: 0, folderCount: 0, assetCount: 0, missingImages: [], warnings: [] }

  if (!root) {
    zip.file('README.md', messages.readmeEmpty)
    return zip.generateAsync({ type: 'blob' })
  }

  const files = collectFiles(root)
  const assetById = new Map<string, ExportAsset>()
  const usedNames = new Set<string>()

  for (const file of files) {
    // 处理重名：目录内同名文件加后缀
    const base = safeFileName(file.name).replace(/\.md$/i, '')
    let name = `${base}.md`
    let n = 2
    while (usedNames.has(name)) {
      name = `${base}-${n++}.md`
    }
    usedNames.add(name)

    const relPath = resolveRelativePath(root, file).replace(/[^/]+$/, name)
    // md 所在目录（图片相对引用基于此目录解析）
    const mdDir = relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/') + 1) : ''
    const { markdown, assets, missing } = transformContentForExport(file.content ?? '', getBase64Image)

    for (const a of assets) {
      if (!assetById.has(a.id)) {
        assetById.set(a.id, a)
        // 图片落盘位置 = md 目录 + assets/<id>.<ext>（与 md 内相对引用一致）
        zip.file(`${mdDir}${a.path}`, a.dataUrl.split(',')[1] ?? '', { base64: true })
        result.assetCount++
      }
    }
    result.missingImages.push(...missing)
    zip.file(relPath, markdown)
    result.fileCount++
  }

  result.folderCount = collectFolders(root).length

  // README 说明
  const now = new Date().toISOString().slice(0, 10)
  const readme = [
    messages.readmeTitle,
    '',
    messages.readmeDate.replace(String.raw`{date}`, now),
    '',
    messages.readmeFileCount.replace(String.raw`{n}`, String(result.fileCount)),
    messages.readmeFolderCount.replace(String.raw`{n}`, String(result.folderCount)),
    messages.readmeImageCount.replace(String.raw`{n}`, String(result.assetCount)),
    result.missingImages.length
      ? messages.readmeMissingImages.replace(String.raw`{n}`, String(result.missingImages.length))
      : messages.readmeImagesComplete,
    '',
    messages.readmeFooter,
    '',
  ].join('\n')
  zip.file('README.md', readme)

  // manifest.json 元数据
  const manifest = {
    app: 'MarkCraft',
    exportedAt: new Date().toISOString(),
    stats: {
      files: result.fileCount,
      folders: result.folderCount,
      assets: result.assetCount,
      missingImages: result.missingImages.length,
    },
    nodes: files.map((f) => ({
      id: f.id,
      path: resolveRelativePath(root, f),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

/** 一键导出并触发下载（UI 入口调用） */
export async function exportWorkspaceZip(
  root: FileNode | null,
  messages: WorkspaceExportMessages = DEFAULT_WORKSPACE_EXPORT_MESSAGES
): Promise<ExportResult> {
  const blob = await buildWorkspaceZip(root, messages)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `markcraft-export-${stamp}.zip`)
  // 轻量统计（blob 已产出，这里重新走一遍纯逻辑拿统计）
  if (!root) return { fileCount: 0, folderCount: 0, assetCount: 0, missingImages: [], warnings: [] }
  const files = collectFiles(root)
  const missing: string[] = []
  let assets = 0
  for (const f of files) {
    const r = transformContentForExport(f.content ?? '', getBase64Image)
    assets += r.assets.length
    missing.push(...r.missing)
  }
  return { fileCount: files.length, folderCount: collectFolders(root).length, assetCount: assets, missingImages: [...new Set(missing)], warnings: [] }
}
