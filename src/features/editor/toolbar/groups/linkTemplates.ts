/**
 * 知识链接模板纯函数
 *
 * 由 Slash 命令迁移而来（2026-08-28 触发收敛：删除 Slash 触发，知识链接能力
 * 统一迁入工具栏「更多」菜单）。两模式（WYSIWYG / 源码）共用本模块生成插入文本，
 * 确保同一功能在两种模式下产出完全一致的模板 —— 模板升级只改这里，不会漂移。
 */

import { extractFootnotes } from '@features/editor/footnote'

/** 去除 .md 后缀（如有） */
export function stripMdExt(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/** 参考文献条目（用于自动汇总） */
export interface ReferenceEntry {
  id: string
  content: string
}

/** 去重合并脚注条目（按 id；同名时优先带内容的） */
export function mergeFootnoteEntries(entries: ReferenceEntry[]): ReferenceEntry[] {
  const map = new Map<string, ReferenceEntry>()
  for (const e of entries) {
    const prev = map.get(e.id)
    if (!prev || (!prev.content && e.content)) map.set(e.id, e)
  }
  return [...map.values()]
}

function footnoteOrder(id: string, content: string): number {
  const re = new RegExp(`\\[\\^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?!:)`, 'g')
  const m = re.exec(content)
  return m ? m.index : Number.MAX_SAFE_INTEGER
}

/**
 * 由脚注条目生成「参考文献」列表（## 参考文献 + 每条 [^id]: 内容）。
 * 传入 content 时按正文 [^id] 首次出现顺序排序。
 */
export function buildReferenceList(entries: ReferenceEntry[], content = ''): string {
  const merged = mergeFootnoteEntries(entries)
  if (merged.length === 0) return '## 参考文献'
  const sorted = [...merged].sort((a, b) => footnoteOrder(a.id, content) - footnoteOrder(b.id, content))
  const lines = sorted.map((e) => `- [^${e.id}]: ${e.content}`)
  return `## 参考文献\n${lines.join('\n')}`
}

/**
 * 参考文献模板（升级为自动生成）：扫描全文脚注定义，去重、按引用出现顺序
 * 汇总成「参考文献」列表。无脚注时仅插入标题占位。
 */
export function buildReferenceTemplate(content = ''): string {
  const footnotes = extractFootnotes(content)
  return buildReferenceList(
    footnotes.map((f) => ({ id: f.id, content: f.fullContent })),
    content,
  )
}

/** 相关笔记模板 */
export function buildRelatedTemplate(): string {
  return '## 相关笔记\n- [[]]\n- [[]]'
}

/** 反向索引模板（基于当前文件名；无文件名时保留占位符） */
export function buildBackindexTemplate(currentFileName: string): string {
  const displayName = stripMdExt(currentFileName)
  return displayName
    ? `## 反向索引\n![[${displayName}]]`
    : '## 反向索引\n![[{{currentFile}}]]'
}

/** 快速链接：取最近打开的文件名；无则插入空 WikiLink */
export function buildRecentWikilink(recentFileNames: string[]): string {
  if (recentFileNames.length > 0) return `[[${stripMdExt(recentFileNames[0])}]]`
  return '[[]]'
}

/** 今日笔记链接（YYYY-MM-DD） */
export function buildTodayWikilink(now: Date = new Date()): string {
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `[[${dateStr}]]`
}

/** 反向链接列表（来自 sourceFileNames 的 WikiLink 列表；无则插入占位注释） */
export function buildBacklinksList(sourceFileNames: string[]): string {
  if (sourceFileNames.length > 0) {
    return sourceFileNames.map(n => `[[${stripMdExt(n)}]]`).join('\n')
  }
  return '<!-- 无反向链接 -->'
}
