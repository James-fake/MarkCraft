import { BlogDesignConfig, COLOR_SCHEMES, FONT_OPTIONS, THEME_STYLE_OPTIONS, THEME_INFO_LIST } from '../../hooks/useBlogGenerator'
import { ThemeStyle } from '../../templates'
import { useLanguage } from '@stores/LanguageStore'

// ─── Shared types ───────────────────────────────────────────

export interface PanelProps {
  designConfig: BlogDesignConfig
  handleDesignChange: <K extends keyof BlogDesignConfig>(key: K, value: BlogDesignConfig[K]) => void
  onHoverCss?: (css: string | null) => void
}

export interface ContentPanelProps extends PanelProps {
  mdFiles: Array<{ name: string; content: string }>
  selectedMdFiles: Array<{ name: string; content: string }>
  excludedFiles: Set<string>
  setExcludedFiles: React.Dispatch<React.SetStateAction<Set<string>>>
}

// ─── Label maps ─────────────────────────────────────────────

export function useLabels() {
  const { t, language } = useLanguage()
  const isZh = language === 'zh'

  // 配色标签：数据层 {zh,en} 结构，UI 侧按语言解析（避免新增 13 个语言键）
  const COLOR_SCHEME_NAMES: Record<BlogDesignConfig['colorScheme'], { zh: string; en: string }> = {
    red: { zh: '红', en: 'Red' }, 'orange-red': { zh: '橙红', en: 'Orange-red' },
    orange: { zh: '橙', en: 'Orange' }, 'orange-yellow': { zh: '橙黄', en: 'Orange-yellow' },
    yellow: { zh: '黄', en: 'Yellow' }, 'yellow-green': { zh: '黄绿', en: 'Yellow-green' },
    green: { zh: '绿', en: 'Green' }, 'blue-green': { zh: '蓝绿', en: 'Blue-green' },
    blue: { zh: '蓝', en: 'Blue' }, 'blue-purple': { zh: '蓝紫', en: 'Blue-purple' },
    purple: { zh: '紫', en: 'Purple' }, 'purple-red': { zh: '紫红', en: 'Purple-red' },
    custom: { zh: '自定义', en: 'Custom' },
  }
  const colorSchemeLabels = Object.fromEntries(
    Object.entries(COLOR_SCHEME_NAMES).map(([k, v]) => [k, isZh ? v.zh : v.en]),
  ) as Record<BlogDesignConfig['colorScheme'], string>

  const fontLabels: Record<BlogDesignConfig['font'], string> = {
    serif: t.blogStudio.serif, sans: t.blogStudio.sansSerif, mono: t.blogStudio.monospace,
  }

  // 主题名统一取 THEME_INFO_LIST 的单一权威双语数据源（name: {zh,en}）。
  // 此前此处 + RightPanel 各自硬编码 ~51 条中文映射，与 THEME_INFO_LIST 三处重复。
  const themeStyleLabels = Object.fromEntries(
    THEME_INFO_LIST.map(info => [info.key, isZh ? info.name.zh : info.name.en]),
  ) as Record<ThemeStyle, string>
  // 'custom' 主题不在 THEME_INFO_LIST 中，单独兜底
  if (!themeStyleLabels.custom) themeStyleLabels.custom = t.blogStudio.customTheme

  return { colorSchemeLabels, fontLabels, themeStyleLabels, t }
}

// Re-export constants that panels need
export { COLOR_SCHEMES, FONT_OPTIONS, THEME_STYLE_OPTIONS }
