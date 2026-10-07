/**
 * 设置全局搜索共享工具
 * - 各 section 接收可选 `query` prop，按 label / desc 过滤自身项。
 * - `active` 表示当前是否处于搜索态（非空 query），用于「整段无命中则隐藏」。
 */
export interface SettingsQuery {
  /** 已规整的小写搜索词（空串表示未搜索） */
  q: string
  /** 单项是否命中（label 或 desc 包含搜索词） */
  match: (label: string, desc?: string) => boolean
  /** 是否处于搜索态 */
  active: boolean
}

export function useSettingsQuery(query?: string): SettingsQuery {
  const q = (query ?? '').trim().toLowerCase()
  const match = (label: string, desc?: string) =>
    !q || label.toLowerCase().includes(q) || (desc ? desc.toLowerCase().includes(q) : false)
  return { q, match, active: q.length > 0 }
}

/**
 * 数字输入防护（D7）：解析 + 范围钳制，杜绝写入 NaN / 越界值。
 * - 空串或非法值返回 null（调用方据此跳过写入，保留上次有效值）。
 * - 越界值钳制到 [min, max]。
 */
export function parseNumber(value: string, min?: number, max?: number): number | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}
