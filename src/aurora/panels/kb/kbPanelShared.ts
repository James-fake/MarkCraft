import type { IconName } from '../../types'
import type { calculateKbHealth } from '@features/knowledgeBase'
import type { FileNode } from '@src/types/fileManager'
import type { Translations } from '@locales/zh'

// KbPanel 拆分共享层（P4-1）：Tab 模型 / 概览派生数据 / 纯格式化助手。
// 各 Tab 子组件（OverviewTab / NotesTab / DependencyTab / MocTab / 各 Modal /
// KbCanvasSection）单向依赖本文件；禁止反向 import KbPanel.tsx（防环）。

export type KbTab =
  | 'overview' | 'notes' | 'search' | 'tasks' | 'goals'
  | 'review' | 'chat' | 'dependency' | 'moc' | 'blindspot' | 'export'

// 知识库模块 Tab（P1-1.5 K1 真落点：隐藏任务/目标/回顾/盲区 4 入口——从 TABS 移除，
// 避免半成品模块分散注意力；其余 7 个 Tab 全部接入真实功能组件，无占位桩）
//
// key 为稳定的 tab id（不随语言变化）；label 由 kbTabs(t) 按语言解析。
type KbTabDef = { id: KbTab; labelKey: keyof Translations['kbPanel']; icon: IconName }

export const TABS: KbTabDef[] = [
  { id: 'overview', labelKey: 'tabOverview', icon: 'dashboard' },
  { id: 'notes', labelKey: 'tabNotes', icon: 'file' },
  { id: 'search', labelKey: 'tabSearch', icon: 'search' },
  { id: 'chat', labelKey: 'tabChat', icon: 'chat' },
  { id: 'dependency', labelKey: 'tabDependency', icon: 'link' },
  { id: 'moc', labelKey: 'tabMoc', icon: 'layers' },
  { id: 'export', labelKey: 'tabExport', icon: 'download' },
]

/** 按当前语言解析 Tab 显示标签（id 保持不变，供 setTab / 激活判定使用） */
export function kbTabs(t: Translations): { id: KbTab; label: string; icon: IconName }[] {
  return TABS.map((d) => ({ id: d.id, label: t.kbPanel[d.labelKey], icon: d.icon }))
}

// 健康度评分：按阈值着色（≥80 绿 / 60–79 黄 / <60 红），对齐审计 P1-5
export const healthColor = (pct: number): string =>
  pct >= 80 ? 'var(--mc-success)' : pct >= 60 ? 'var(--mc-warning)' : 'var(--mc-danger)'

export const pctOf = (score: number, max = 25) => Math.round((score / max) * 100)
export const compactNum = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

export interface OverviewData {
  fileCount: number
  canvasCount: number
  tagCount: number
  totalWords: number
  linkCount: number
  health: ReturnType<typeof calculateKbHealth> | null
  recentFiles: FileNode[]
  topTags: { tag: string; count: number }[]
  aiSummary?: string
  miniNodes: { id: string; label: string }[]
  miniEdges: [string, string][]
}
