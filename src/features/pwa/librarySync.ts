import { FileNode } from '../../types/fileManager'
import { platform } from '@platform'

/**
 * P2-8 PWA 深化 · 本地/手动库同步
 *
 * 诚实本地：同步完全发生在本机——导出为本地 .json 备份，导入读取本地文件，
 * 不上传任何内容、不依赖云。合并策略：导入的备份优先于较旧的本地产物
 * （按 updatedAt 判定），避免把刚编辑的笔记被旧备份覆盖。
 */

export interface LibraryBundleFile {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface LibraryBundle {
  type: 'markcraft-library'
  version: 1
  exportedAt: string
  files: LibraryBundleFile[]
}

/** 收集文件树中所有笔记（递归）。统一委托 fileTree.collectAllFiles（D4 单一数据源） */
import { collectAllFiles as collectFiles } from '@core/files/fileTree'
export { collectFiles }

/** 导出整个库为 JSON 字符串（备份包） */
export function exportLibraryBundle(root: FileNode, now: Date = new Date()): string {
  const files: LibraryBundleFile[] = collectFiles(root).map(f => ({
    id: f.id,
    name: f.name,
    content: f.content ?? '',
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }))
  const bundle: LibraryBundle = {
    type: 'markcraft-library',
    version: 1,
    exportedAt: now.toISOString(),
    files,
  }
  return JSON.stringify(bundle, null, 2)
}

/** 解析并校验库备份包；非法则抛错 */
export function parseLibraryBundle(json: string): LibraryBundle {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('不是有效的 MarkCraft 库备份文件')
  }
  if (
    !data ||
    typeof data !== 'object' ||
    (data as { type?: unknown }).type !== 'markcraft-library' ||
    !Array.isArray((data as { files?: unknown }).files)
  ) {
    throw new Error('不是有效的 MarkCraft 库备份文件')
  }
  return data as LibraryBundle
}

export interface MergeResult {
  merged: LibraryBundleFile[]
  added: number
  updated: number
  skipped: number
  total: number
}

/** 合并现有库与导入备份，按 id 归一、按 updatedAt 取新 */
export function mergeLibraryFiles(
  existing: LibraryBundleFile[],
  incoming: LibraryBundleFile[]
): MergeResult {
  const map = new Map<string, LibraryBundleFile>()
  let added = 0
  let updated = 0
  let skipped = 0

  for (const f of existing) map.set(f.id, f)
  for (const f of incoming) {
    const prev = map.get(f.id)
    if (!prev) {
      map.set(f.id, f)
      added++
    } else if (f.updatedAt > prev.updatedAt) {
      map.set(f.id, f)
      updated++
    } else {
      skipped++
    }
  }

  const merged = Array.from(map.values())
  return { merged, added, updated, skipped, total: merged.length }
}

/** 浏览器端下载辅助（受控：非浏览器环境静默跳过） */
export function downloadTextFile(filename: string, text: string): void {
  try {
    const blob = new Blob([text], { type: 'application/json' })
    // 经平台层落盘（浏览器 = 下载；桌面端 = 原生保存框）；失败静默，保持「非浏览器环境不报错」的原语义
    void platform.saveBlob(blob, filename).catch(() => {
      /* 忽略保存失败（如非浏览器 / 无 DOM 环境） */
    })
  } catch {
    /* 忽略下载失败（如非浏览器环境） */
  }
}
