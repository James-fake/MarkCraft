/**
 * diaryDateUtils —— 日记/日历纯函数工具集（无 React、无 localStorage、无副作用）
 *
 * 集中收纳所有与「日期/年月/月历网格/范围/时区」相关的逻辑，
 * 便于单测、跨组件复用，并统一时区处理口径（一律使用本地时区分量，
 * 杜绝 new Date('YYYY-MM-DD') 被当作 UTC 午夜带来的偏移问题）。
 */

export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD
  content: string
  title: string
  excerpt: string
  words: number
  tags: string[]
}

export const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']
export const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

/** 本地时区安全的 YYYY-MM-DD 格式化 */
export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYMD(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { y, m, d }
}

/** 本地时区下取星期（0=周日）。显式 append 'T00:00:00' 避免被解析为 UTC 导致的跨日偏移。 */
export function weekdayOf(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

export function weekdayLabel(dateStr: string): string {
  return `星期${WEEKDAYS_ZH[weekdayOf(dateStr)]}`
}

/** 某年某月天数（自动处理闰年）。m 为 1-12。 */
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** 跨月/跨年安全偏移：m 为 1-12，返回可能越界的 { y, m }（如 12 月 +1 → 次年 1 月） */
export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return { y: ny, m: nm }
}

/** 在 dateStr 基础上偏移若干天（本地时区） */
export function addDays(dateStr: string, delta: number): string {
  const { y, m, d } = parseYMD(dateStr)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return fmtDate(dt)
}

/** 将 d 收敛到 (y,m) 当月合法天数（如 1 月 31 日 +1 月 → 2 月 28/29 日） */
export function clampDay(y: number, m: number, d: number): number {
  return Math.min(d, daysInMonth(y, m))
}

/** dateStr 是否属于指定的 (年,月) */
export function isSameMonth(dateStr: string, y: number, m: number): boolean {
  return dateStr.startsWith(`${y}-${String(m).padStart(2, '0')}`)
}

/** 构建月历网格（周日为每周首日），按周分组，空白格为 null */
export function buildMonthGrid(y: number, m: number): (number | null)[][] {
  const firstDow = new Date(y, m - 1, 1).getDay()
  const dim = daysInMonth(y, m)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 含闭区间 [start, end] 的日期字符串列表（自动处理 start>end） */
export function rangeBetween(start: string, end: string): string[] {
  if (start > end) return rangeBetween(end, start)
  const out: string[] = [start]
  let cur = start
  while (cur < end) {
    cur = addDays(cur, 1)
    out.push(cur)
  }
  return out
}

/** On This Day：返回与 date 同月同日、但不同年的所有日记，近→远排序 */
export function onThisDay(entries: DiaryEntry[], date: string): DiaryEntry[] {
  const md = date.slice(5)
  return entries
    .filter(e => e.date.slice(5) === md && e.date !== date)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Year in Pixels：12×31 网格，无该日的格为 null（2 月 30/31 号等） */
export interface YearCell {
  date: string
  words: number
  hasEntry: boolean
  mood?: string[]
}
export function buildYearGrid(
  entries: DiaryEntry[],
  moods: Record<string, string | string[]>,
  year: number,
): (YearCell | null)[][] {
  const byDate = new Map(entries.map(e => [e.date, e]))
  const grid: (YearCell | null)[][] = []
  for (let m = 1; m <= 12; m++) {
    const row: (YearCell | null)[] = []
    const dim = daysInMonth(year, m)
    for (let d = 1; d <= 31; d++) {
      if (d > dim) {
        row.push(null)
        continue
      }
      const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const e = byDate.get(ds)
      row.push({ date: ds, words: e ? e.words : 0, hasEntry: !!e, mood: Array.isArray(moods[ds]) ? (moods[ds] as string[]) : undefined })
    }
    grid.push(row)
  }
  return grid
}

/** 自然语言日期解析（本地规则，隐私优先，不依赖联网大模型） */
export interface DateQueryResult {
  date?: string
  error?: string
}
export function parseDateQuery(
  input: string,
  now: Date,
  _entries: DiaryEntry[],
): DateQueryResult {
  const q = input.trim()
  if (!q) return { error: '请输入日期描述' }
  const today = fmtDate(now)

  // 复合短语优先：避免被下方通用「今天/昨天」抢先匹配（如「去年今天」）
  if (q.includes('去年今天')) {
    return { date: `${now.getFullYear() - 1}-${today.slice(5)}` }
  }

  const rel: Record<string, number> = {
    今天: 0, 今日: 0, 昨天: -1, 昨日: -1, 前天: -2, 明天: 1, 明日: 1,
  }
  for (const [k, v] of Object.entries(rel)) {
    if (q.includes(k)) return { date: addDays(today, v) }
  }

  const ym = q.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
  if (ym) {
    const y = Number(ym[1])
    const m = Number(ym[2])
    if (m < 1 || m > 12) return { error: '月份不合法（应为 1-12）' }
    return { date: `${y}-${String(m).padStart(2, '0')}-01` }
  }

  const ym2 = q.match(/(\d{4})[/-](\d{1,2})(?:[/-](\d{1,2}))?/)
  if (ym2) {
    const y = Number(ym2[1])
    const m = Number(ym2[2])
    if (m < 1 || m > 12) return { error: '月份不合法（应为 1-12）' }
    return { date: `${y}-${String(m).padStart(2, '0')}-01` }
  }

  if (q.includes('最近一篇')) {
    return { error: '「最近一篇」需结合情绪/标签存储，当前版本暂未接入' }
  }

  return { error: '无法识别的日期描述，试试「去年今天」「2026年3月」等' }
}
