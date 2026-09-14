import React, { useMemo, useCallback } from 'react'
import { useSettings } from '../stores/SettingsStore'
import { getTheme } from '../features/themes/ThemeManager'

export type ThemeType = 'dark' | 'light'

/**
 * 从 SettingsStore 派生主题状态。
 *
 * 主题的单一数据源是 settings.theme（EditorTheme id，如 'light'/'dark'/'github'/'sepia'/'nord'）。
 * useTheme 返回的 theme 是从该 id 推导出的类型（'light' | 'dark'），
 * 供需要区分明暗的组件使用（如 Preview、MermaidBlockView、BlogStudio）。
 *
 * 主题的实际应用（设置 data-theme 属性 + CSS 变量）由 useEditorSettings 中的
 * applyTheme(settings.theme) 负责，这里只读取派生状态。
 *
 * toggleTheme 在内置 'light' 和 'dark' 主题之间切换 settings.theme，
 * 这会触发 applyTheme 重新应用主题。
 */
export function useTheme() {
  const { settings, updateSetting } = useSettings()

  // 从 settings.theme 推导 ThemeType（仅在 settings.theme 变化时重新计算）
  const theme = useMemo<ThemeType>(() => {
    if (settings.theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'dark'
    }
    const editorTheme = getTheme(settings.theme)
    return editorTheme?.type ?? 'light'
  }, [settings.theme])

  const toggleTheme = useCallback(() => {
    // 在内置 light/dark 主题间切换
    updateSetting('theme', theme === 'dark' ? 'light' : 'dark')
  }, [theme, updateSetting])

  return { theme, toggleTheme }
}

// 兼容旧导出：ThemeProvider 不再需要，导出一个透传组件
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children)
}
