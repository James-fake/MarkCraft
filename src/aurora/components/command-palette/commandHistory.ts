/**
 * 命令面板「最近使用」记录（localStorage 持久化，纯内置、无依赖）。
 *
 * - 执行命令时 `recordCommandUse(id)` 写入，去重置顶，上限 8。
 * - 面板空查询时读取 `getRecentCommandIds()` 在分组顶部展示「最近使用」组。
 */

const STORAGE_KEY = 'markcraft.command.recent'
const MAX = 8

export function recordCommandUse(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

export function getRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
