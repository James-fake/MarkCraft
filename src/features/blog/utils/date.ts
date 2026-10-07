/**
 * 博客日期格式化（D4 单一数据源）。
 * 输入 ISO 字符串（如 '2026-08-29' 或带时间的 '2026-08-29T10:00:00'），
 * 统一返回 YYYY-MM-DD；非法输入原样返回，空串返回空串。
 * 此前该实现分散于 blogConvert.ts 与 templateHelpers.ts 两份逐字节相同的副本，现收敛于此。
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toISOString().split('T')[0]
  } catch {
    return dateStr
  }
}
