// 下划线调色板配色（纯常量，无副作用）。
// 供 UnderlineColor 扩展与「上次颜色」偏好（underlineColorPref）共用；
// 单独成模块是为了避免「扩展 ↔ 偏好」互相 import 形成环（与 highlightColors 同构）。
//
// ⚠️ 与高亮的关键差异：高亮改的是「底色」（用 rgba 半透明，正文压上去仍清晰）；
// 下划线改的是「文字前景色」——直接套半透明 rgba 会让文字发灰看不清，
// 故这里取同一 16 色的「不透明」版本（HIGHLIGHT_UI_COLORS），
// 好处是「调色板里看到的色块」与「正文里得到的字色」完全一致。

import { HIGHLIGHT_COLOR_OPTIONS, HIGHLIGHT_UI_COLORS } from './highlightColors'

/** 16 色前景色值（浅拷贝，避免被就地改写污染高亮色表） */
export const UNDERLINE_COLORS: Record<string, string> = { ...HIGHLIGHT_UI_COLORS }

/** 默认下划线色 = 跟随正文颜色（不写 text-decoration-color，随主题/正文色自然变化） */
export const DEFAULT_UNDERLINE_COLOR = 'auto'

/**
 * 调色板项顺序：'auto'（跟随正文）在首位，其后为与高亮同序的 16 色。
 * ⚠️ 与 highlightColors 不同，此数组**不是**字面量元组 —— 因为它是
 * 「默认值 + 16 色」拼接，类型由 HighlightColor 联合推出。
 */
export const UNDERLINE_COLOR_OPTIONS: readonly string[] = ['auto', ...HIGHLIGHT_COLOR_OPTIONS]

export type UnderlineColor = string

/** 校验任意字符串是否为合法的下划线色名（含 'auto'）；用于持久化值回退 */
export function isUnderlineColor(value: unknown): value is UnderlineColor {
  return typeof value === 'string' && UNDERLINE_COLOR_OPTIONS.includes(value)
}

export function underlineStyle(color: string): string {
  const base = 'text-decoration: underline'
  if (!color || color === DEFAULT_UNDERLINE_COLOR) return base
  return `${base}; text-decoration-color: ${UNDERLINE_COLORS[color] || 'currentColor'}`
}
