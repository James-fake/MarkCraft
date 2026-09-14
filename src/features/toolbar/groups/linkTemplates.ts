/**
 * 知识链接模板纯函数
 *
 * 由 Slash 命令迁移而来（2026-08-28 触发收敛：删除 Slash 触发，知识链接能力
 * 统一迁入工具栏「更多」菜单）。两模式（WYSIWYG / 源码）共用本模块生成插入文本，
 * 确保同一功能在两种模式下产出完全一致的模板 —— 模板升级只改这里，不会漂移。
 */

/** 去除 .md 后缀（如有） */
export function stripMdExt(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/** 参考文献模板 */
export function buildReferenceTemplate(): string {
  return '## 参考文献\n- [[]]\n- [[]]\n- [[]]'
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
