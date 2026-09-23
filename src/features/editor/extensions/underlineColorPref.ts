// 「上次使用的下划线颜色」读写。单一数据源 = SettingsStore 的 lastUnderlineColor
// （持久化在 localStorage `markcraft_settings`）。
//
// 语义与 highlightColorPref 完全一致：只有「在调色板里显式挑色」才会改写上次颜色；
// 主按钮 / Ctrl+U / 右键菜单都只是「应用（切换）上次颜色」。
import { loadSettings, updateSetting } from '@stores/SettingsStore'
import { DEFAULT_UNDERLINE_COLOR, isUnderlineColor } from './underlineColors'

/** 读取「上次使用的下划线颜色」；非法值（手改 localStorage / 旧色名）一律回退 'auto'（跟随正文）。 */
export function getLastUnderlineColor(): string {
  try {
    const value = loadSettings().lastUnderlineColor
    return isUnderlineColor(value) ? value : DEFAULT_UNDERLINE_COLOR
  } catch {
    return DEFAULT_UNDERLINE_COLOR
  }
}

/** 写回「上次使用的下划线颜色」（非 React 语境：直接落 SettingsStore）。 */
export function persistLastUnderlineColor(color: string): void {
  try {
    updateSetting('lastUnderlineColor', color)
  } catch {
    /* 持久化失败不影响交互 */
  }
}
