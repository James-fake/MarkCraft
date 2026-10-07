// Aurora 分类色单一来源（D4 收口）
// 文件类型色、图谱分组色集中于此，各面板 import 复用，杜绝跨面板重复定义漂移。
// 色值单源 = tokens.css §12.2/§15 `--mc-cat-*`（dark :root + [data-theme='light'] 覆盖，
// 跨模式联动）；此处仅持 var() 引用，禁写硬编码 hex（批次⑩ P3-C）。
// 设计纪律（B 重审 2026-08-30）：桌面原生色板，禁用 AI 紫(#8B5CF6/#A78BFA)/粉(#F472B6/#EC4899) 味，
// 改用 teal/orange/blue 等原生可读色相；改色前先确认八类文件 + 六分组在 file-tree / graph 中仍互异。
import type { FileNode } from '@src/types/fileManager'
import { Icon } from '../icons'

export type TreeFileType =
  | 'folder' | 'markdown' | 'canvas' | 'image' | 'pdf' | 'template' | 'daily' | 'unknown'

/** 文件类型 → 图标 + 颜色（FileTree / CanvasSidebarPanel 共用，色板唯一） */
export const FILE_TYPE_META: Record<TreeFileType, { icon: keyof typeof Icon; color: string }> = {
  folder:   { icon: 'folder',   color: 'var(--mc-cat-folder)' },
  markdown: { icon: 'fileText', color: 'var(--mc-cat-markdown)' },
  canvas:   { icon: 'layout',   color: 'var(--mc-cat-canvas)' },
  image:    { icon: 'image',    color: 'var(--mc-cat-image)' },
  pdf:      { icon: 'filePdf',  color: 'var(--mc-cat-pdf)' },
  template: { icon: 'fileText', color: 'var(--mc-cat-template)' },
  daily:    { icon: 'calendar', color: 'var(--mc-cat-daily)' },
  unknown:  { icon: 'file',     color: 'var(--mc-cat-unknown)' },
}

/** 由真实文件名推导类型（FileNode 自身不带 fileType） */
export function deriveFileType(node: FileNode): TreeFileType {
  if (node.type === 'folder') return 'folder'
  const n = node.name.toLowerCase()
  if (n.endsWith('.canvas')) return 'canvas'
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(n)) return 'image'
  if (n.endsWith('.pdf')) return 'pdf'
  if (/^\d{4}-\d{2}-\d{2}\.md$/.test(n)) return 'daily'
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'markdown'
  if (n.endsWith('.template')) return 'template'
  return 'unknown'
}

/** 文件类型 → 图标 + 颜色（单一来源入口，替代各面板内联 filesMeta/fileTypeMeta） */
export function fileTypeMeta(node: FileNode): { icon: keyof typeof Icon; color: string } {
  return FILE_TYPE_META[deriveFileType(node)]
}

/** 图谱分组色（单一来源；持久化的 group.color 存 var() 引用，渲染时随主题解析） */
export const GROUP_COLORS = [
  'var(--mc-cat-group-1)',
  'var(--mc-cat-group-2)',
  'var(--mc-cat-group-3)',
  'var(--mc-cat-group-4)',
  'var(--mc-cat-group-5)',
  'var(--mc-cat-group-6)',
]
