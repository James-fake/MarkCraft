import { BlogDesignConfig, COLOR_SCHEMES, FONT_OPTIONS, THEME_STYLE_OPTIONS } from '../../hooks/useBlogGenerator'
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
  const { t } = useLanguage()

  const colorSchemeLabels: Record<BlogDesignConfig['colorScheme'], string> = {
    red: '红', 'orange-red': '橙红', orange: '橙', 'orange-yellow': '橙黄',
    yellow: '黄', 'yellow-green': '黄绿', green: '绿', 'blue-green': '蓝绿',
    blue: '蓝', 'blue-purple': '蓝紫', purple: '紫', 'purple-red': '紫红',
    custom: '自定义',
  }

  const fontLabels: Record<BlogDesignConfig['font'], string> = {
    serif: t.blogStudio.serif, sans: t.blogStudio.sansSerif, mono: t.blogStudio.monospace,
  }

  const themeStyleLabels: Record<ThemeStyle, string> = {
    magazine: t.blogStudio.magazine, minimal: t.blogStudio.minimal, classic: t.blogStudio.classic,
    'ink-wash': t.blogStudio.inkWash, terminal: t.blogStudio.terminal, newspaper: t.blogStudio.newspaper,
    glassmorphism: t.blogStudio.glassmorphism, bento: t.blogStudio.bento, narrative: t.blogStudio.narrative,
    cyberpunk: '赛博朋克', aurora: '极光', academia: '学术',
    retro: '复古', garden: '花园', midnight: '午夜',
    custom: '自定义主题',
    poetry: '诗歌', typewriter: '打字机', ocean: '海洋', sunset: '日落',
    editorial: '社论', trending: '热门', dispatch: '快讯',
    carbon: '碳黑', blueprint: '蓝图', hacker: '黑客',
    showcase: '展示', mosaic: '马赛克', gallery: '画廊',
    cinematic: '电影', docs: '文档', wiki: '百科',
    neon: '霓虹', origami: '折纸',
    swiss: '瑞士', bauhaus: '包豪斯', artdeco: '装饰艺术', zen: '禅意',
    brutalist: '粗野', vaporwave: '蒸汽波', pixel: '像素', neumorphism: '新拟态',
    corporate: '企业', fashion: '时尚', forest: '森林', notion: '笔记',
    cafe: '咖啡馆', travel: '旅行', music: '音乐', sketch: '手绘',
    cosmos: '宇宙', claymorphism: '粘土', 'ice-crystal': '冰晶',
    rams: '拉姆斯', luxury: '奢华', comic: '漫画',
    steampunk: '蒸汽朋克', gothic: '哥特', noir: '黑色电影',
    recipe: '食谱', timeline: '时间线', feed: '动态流',
    pastel: '粉彩', newsletter: '简报',
  }

  return { colorSchemeLabels, fontLabels, themeStyleLabels, t }
}

// Re-export constants that panels need
export { COLOR_SCHEMES, FONT_OPTIONS, THEME_STYLE_OPTIONS }
