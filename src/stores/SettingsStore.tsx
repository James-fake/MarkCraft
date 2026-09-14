import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { DEFAULT_PLANTUML_ENDPOINT } from '../features/shared/utils/plantumlConstants'

export interface AppSettings {
  // Editor
  editorMode: 'source' | 'wysiwyg'
  autoSaveInterval: number
  spellCheck: boolean
  smartPunctuation: boolean
  autocomplete: boolean
  focusMode: boolean
  typewriterMode: boolean
  livePreview: boolean
  codeBlockDefaultLang: string
  paragraphIndent: boolean
  editorMaxWidth: number
  tabSize: number
  autoPairBrackets: boolean
  autoPairQuotes: boolean
  autoPairMarkdown: boolean
  defaultSidebarVisible: boolean

  // Appearance
  theme: string
  /** 高对比度备选（a11y · HIG §11.7）：'normal' | 'high'，广播到 <html data-contrast>（批次⑫ P3-E） */
  contrast: 'normal' | 'high'
  fontFamily: string
  fontSize: number
  lineHeight: number
  codeFontFamily: string
  codeTheme: string
  sidebarWidth: number

  // View (从独立 localStorage 迁移而来)
  outlineVisible: boolean
  previewVisible: boolean
  sourceVisible: boolean
  fullscreen: boolean

  // Image
  imageHostType: 'none' | 'picgo' | 'custom'
  /** PicGo 可执行文件 / 上传命令的完整路径（imageHostType === 'picgo' 时使用） */
  imageHostPicgoPath: string
  /** 自定义图床上传地址（imageHostType === 'custom' 时使用） */
  imageHostCustomUrl: string
  /** 自定义图床鉴权 Token */
  imageHostCustomToken: string
  useRelativeImagePath: boolean

  // Export
  defaultExportFormat: string
  defaultExportStyle: string

  // Diagram (E3)
  /** PlantUML 渲染端点（SVG 输出）。留空则禁用远程渲染，图表降级为代码块。 */
  plantumlEndpoint: string

  // Audience (P0-3 首启叙事+默认收口)
  /** 首启身份选择：知识型写作者 / 独立博主 / 学生·终身学习者。null 表示尚未选择。 */
  audience: 'writer' | 'blogger' | 'student' | null
}

const SETTINGS_KEY = 'markcraft_settings'

export const DEFAULT_SETTINGS: AppSettings = {
  // 默认范式收敛：WYSIWYG（TipTap + Live Preview）为默认；源码模式为可选高级模式（P1-1.2 E1）
  editorMode: 'wysiwyg',
  autoSaveInterval: 30,
  // 拼写检查默认关闭：英文词典对中文用户价值≈0（P1-1.2 E3）
  spellCheck: false,
  smartPunctuation: true,
  autocomplete: true,
  focusMode: false,
  typewriterMode: false,
  livePreview: true,
  codeBlockDefaultLang: '',
  paragraphIndent: false,
  editorMaxWidth: 800,
  tabSize: 2,
  autoPairBrackets: true,
  autoPairQuotes: true,
  autoPairMarkdown: true,
  defaultSidebarVisible: true,
  theme: 'dark',
  contrast: 'normal',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 15,
  lineHeight: 1.7,
  codeFontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
  codeTheme: 'default',
  sidebarWidth: 240,
  // View
  outlineVisible: true,
  previewVisible: false,
  sourceVisible: true,
  fullscreen: false,
  imageHostType: 'picgo',
  imageHostPicgoPath: '',
  imageHostCustomUrl: '',
  imageHostCustomToken: '',
  useRelativeImagePath: false,
  defaultExportFormat: 'html',
  defaultExportStyle: 'default',
  plantumlEndpoint: DEFAULT_PLANTUML_ENDPOINT,
  audience: null,
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const rawParsed = JSON.parse(raw)
      const parsed = { ...DEFAULT_SETTINGS, ...rawParsed }
      // 迁移：旧的 'split' 模式已废弃，统一回退为 'source'
      if ((parsed as any).editorMode === 'split') {
        (parsed as any).editorMode = 'source'
        parsed.previewVisible = true
        parsed.sourceVisible = true
        saveSettings(parsed)
      }
      // 迁移：P1-1.2 E1 范式收敛——老用户默认从 'source' 升级到 'wysiwyg'
      // （之前源码模式是默认；本升级一次性，若用户后续主动设回 source 不再覆盖）
      if ((parsed as any).editorMode === 'source') {
        (parsed as any).editorMode = 'wysiwyg'
        saveSettings(parsed)
      }
      // 迁移：从独立 localStorage key 迁移 view 相关设置
      // 仅当主 store 中保存的数据不含这些字段时（旧版本用户）
      const viewKeys: Record<string, keyof AppSettings> = {
        'outline-visibility': 'outlineVisible',
        'preview-visibility': 'previewVisible',
        'source-visibility': 'sourceVisible',
        'fullscreen-mode': 'fullscreen',
      }
      let migrated = false
      for (const [oldKey, settingKey] of Object.entries(viewKeys)) {
        const oldVal = localStorage.getItem(oldKey)
        if (oldVal !== null) {
          // 仅当保存的 JSON 中没有该字段时才迁移
          if (rawParsed[settingKey] === undefined) {
            try {
              (parsed as any)[settingKey] = JSON.parse(oldVal)
              migrated = true
            } catch {}
          }
          // 迁移后清除旧 key
          localStorage.removeItem(oldKey)
        }
      }
      if (migrated) saveSettings(parsed)
      return parsed
    }
    // First run: try to migrate from old keys
    const migrated = { ...DEFAULT_SETTINGS }
    const oldKeys: Record<string, string> = {
      'editor-mode': 'editorMode',
      'markcraft_spell_check': 'spellCheck',
      'markcraft_smart_punctuation_enabled': 'smartPunctuation',
      'autocomplete-enabled': 'autocomplete',
      'focus-mode': 'focusMode',
      'typewriter-mode': 'typewriterMode',
      'live-preview': 'livePreview',
    }
    for (const [oldKey, settingKey] of Object.entries(oldKeys)) {
      const val = localStorage.getItem(oldKey)
      if (val !== null) {
        try {
          (migrated as any)[settingKey] = JSON.parse(val)
        } catch {
          (migrated as any)[settingKey] = val
        }
      }
    }
    saveSettings(migrated)
    return migrated
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export function updateSetting(key: keyof AppSettings, value: AppSettings[keyof AppSettings]): AppSettings {
  const current = loadSettings()
  const updated = { ...current, [key]: value }
  saveSettings(updated)
  return updated
}

/**
 * P0-3 首启默认收口：根据首启身份选择返回应套用的默认设置。
 * 纯函数，便于单元测试覆盖正常/边界路径。
 * - 知识型写作者 / 独立博主 / 学生·终身学习者：默认开启大纲（PKM 友好），其余沿用默认。
 * - null / 未知：返回空对象，不改变任何设置。
 */
export function applyAudienceDefaults(audience: AppSettings['audience']): Partial<AppSettings> {
  if (audience !== 'writer' && audience !== 'blogger' && audience !== 'student') {
    return {}
  }
  return {
    audience,
    outlineVisible: true,
  }
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => void
  resetSettings: () => void
}

export const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const handleUpdateSetting = useCallback((key: keyof AppSettings, value: AppSettings[typeof key]) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value }
      saveSettings(updated)
      return updated
    })
  }, [])

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS)
    setSettings({ ...DEFAULT_SETTINGS })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting: handleUpdateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
