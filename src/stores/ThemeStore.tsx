/**
 * 主题状态管理 — 已统一到 SettingsStore。
 *
 * 历史上这里有一个独立的 ThemeProvider + useTheme Context，
 * 但它与 ThemeManager（settings.theme）冲突，导致主题切换时 UI 不一致。
 *
 * 现已将 useTheme 重构为从 SettingsStore 派生的普通 hook，
 * 这里仅做重新导出以保持现有导入路径兼容。
 */
export type { ThemeType } from '../hooks/useTheme'
export { useTheme, ThemeProvider } from '../hooks/useTheme'
