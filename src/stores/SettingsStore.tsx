import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { safeJsonParseOrNull } from '@utils/safeJson'
import { isRecord } from '@utils/schemaGuards'
import { DEFAULT_PLANTUML_ENDPOINT } from '@core/constants/plantuml'

export interface AppSettings {
  // Editor
  editorMode: 'source' | 'wysiwyg'
  /** 上次使用的高亮颜色（高亮按钮「记住上次颜色」用）。值域由 features 层校验，非法值回退 yellow。 */
  lastHighlightColor: string
  /** 上次使用的下划线颜色（下划线按钮「记住上次颜色」用）。值域由 features 层校验，非法值回退 'auto'（跟随正文）。 */
  lastUnderlineColor: string
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
}

const SETTINGS_KEY = 'markcraft_settings'
// 一次性迁移标志：E1「source → wysiwyg」范式收敛只执行一次，
// 之后用户主动设回 source 不再被每次加载覆盖。
const EDITOR_MODE_MIGRATED_KEY = 'markcraft-editor-mode-wysiwyg-migrated'

export const DEFAULT_SETTINGS: AppSettings = {
  // 默认范式收敛：WYSIWYG（TipTap + Live Preview）为默认；源码模式为可选高级模式（P1-1.2 E1）
  editorMode: 'wysiwyg',
  lastHighlightColor: 'yellow',
  lastUnderlineColor: 'auto',
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
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const rawParsed = safeJsonParseOrNull<Partial<AppSettings>>(raw)
      const validRaw: Partial<AppSettings> = rawParsed && isRecord(rawParsed) ? rawParsed : {}
      const parsed = { ...DEFAULT_SETTINGS, ...validRaw }
      // 迁移：旧的 'split' 模式已废弃，统一回退为 'source'
      if ((parsed.editorMode as string) === 'split') {
        parsed.editorMode = 'source'
        parsed.previewVisible = true
        parsed.sourceVisible = true
        saveSettings(parsed)
      }
      // 迁移：P1-1.2 E1 范式收敛——老用户默认从 'source' 升级到 'wysiwyg'
      // 一次性：由 EDITOR_MODE_MIGRATED_KEY 记录；置位后用户主动设回 source 不再被覆盖。
      // （此前无标志位，每次加载都把 'source' 改回 'wysiwyg'，用户选择永远不生效。）
      if (localStorage.getItem(EDITOR_MODE_MIGRATED_KEY) !== '1') {
        if (parsed.editorMode === 'source') {
          parsed.editorMode = 'wysiwyg'
          saveSettings(parsed)
        }
        try { localStorage.setItem(EDITOR_MODE_MIGRATED_KEY, '1') } catch { /* ignore */ }
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
          if (validRaw[settingKey] === undefined) {
            try {
              (parsed as Record<string, unknown>)[settingKey] = safeJsonParseOrNull(oldVal)
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
    const oldKeys: Record<string, keyof AppSettings> = {
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
          (migrated as Record<string, unknown>)[settingKey] = safeJsonParseOrNull(val)
        } catch {
          (migrated as Record<string, unknown>)[settingKey] = val
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
