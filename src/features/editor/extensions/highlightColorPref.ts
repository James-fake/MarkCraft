// 「上次使用的高亮颜色」读写。单一数据源 = SettingsStore 的 lastHighlightColor
// （持久化在 localStorage `markcraft_settings`）。
//
// 语义：只有「在调色板里显式挑色」才会改写上次颜色；主按钮 / Ctrl+Shift+H / 右键菜单
// 都只是「应用（切换）上次颜色」。这样三条入口行为一致，符合 Word / VS Code 直觉。
import { loadSettings, updateSetting } from '@stores/SettingsStore'
import { DEFAULT_HIGHLIGHT_COLOR, isHighlightColor, type HighlightColor } from './highlightColors'

/** 读取「上次使用的高亮颜色」；非法值（手改 localStorage / 旧色名）一律回退默认黄。 */
export function getLastHighlightColor(): HighlightColor {
  try {
    const value = loadSettings().lastHighlightColor
    return isHighlightColor(value) ? value : DEFAULT_HIGHLIGHT_COLOR
  } catch {
    return DEFAULT_HIGHLIGHT_COLOR
  }
}

/** 写回「上次使用的高亮颜色」（非 React 语境：直接落 SettingsStore）。 */
export function persistLastHighlightColor(color: HighlightColor): void {
  try {
    updateSetting('lastHighlightColor', color)
  } catch {
    /* 持久化失败不影响交互 */
  }
}
