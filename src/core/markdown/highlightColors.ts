// 高亮调色板配色（纯常量，无副作用）。
// 供 HighlightMark 扩展与「上次颜色」偏好（highlightColorPref）共用；
// 单独成模块是为了避免「扩展 ↔ 偏好」互相 import 形成环。
//
// 调色板 16 色 · 顺序即调色板显示顺序（两行 × 8）。

/** 文本底色：半透明 rgba，正文压在底色上仍清晰可读 */
export const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'rgba(255, 235, 59, 0.40)',
  amber: 'rgba(255, 193, 7, 0.38)',
  orange: 'rgba(255, 152, 0, 0.35)',
  'deep-orange': 'rgba(255, 87, 34, 0.32)',
  red: 'rgba(244, 67, 54, 0.30)',
  pink: 'rgba(233, 30, 99, 0.30)',
  purple: 'rgba(156, 39, 176, 0.30)',
  'deep-purple': 'rgba(103, 58, 183, 0.30)',
  indigo: 'rgba(63, 81, 181, 0.30)',
  blue: 'rgba(33, 150, 243, 0.30)',
  'light-blue': 'rgba(3, 169, 244, 0.30)',
  cyan: 'rgba(0, 188, 212, 0.30)',
  teal: 'rgba(0, 150, 136, 0.30)',
  green: 'rgba(76, 175, 80, 0.30)',
  'light-green': 'rgba(139, 195, 74, 0.35)',
  gray: 'rgba(158, 158, 158, 0.35)',
}

/** 同一 16 色的「不透明」版本，仅供调色板色块与「上次颜色」指示条使用（深底上也能分辨） */
export const HIGHLIGHT_UI_COLORS: Record<string, string> = {
  yellow: '#facc15',
  amber: '#fbbf24',
  orange: '#fb923c',
  'deep-orange': '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  purple: '#a855f7',
  'deep-purple': '#7c3aed',
  indigo: '#6366f1',
  blue: '#3b82f6',
  'light-blue': '#38bdf8',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  green: '#22c55e',
  'light-green': '#84cc16',
  gray: '#9ca3af',
}

export const HIGHLIGHT_COLOR_OPTIONS = [
  'yellow', 'amber', 'orange', 'deep-orange', 'red', 'pink', 'purple', 'deep-purple',
  'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'gray',
] as const

export type HighlightColor = typeof HIGHLIGHT_COLOR_OPTIONS[number]

/** 默认高亮色（未选择过任何颜色时） */
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow'

/** 校验任意字符串是否为合法的高亮色名（用于持久化值回退） */
export function isHighlightColor(value: unknown): value is HighlightColor {
  return typeof value === 'string' && (HIGHLIGHT_COLOR_OPTIONS as readonly string[]).includes(value)
}
