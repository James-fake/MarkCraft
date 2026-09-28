/**
 * 博客工作室 · 注册表 / 常量 / 类型 / 默认配置 / 真实数据映射（P2-3 从 BlogPanel.tsx 拆出，2026-09-28）。
 * 纯数据与映射层：无 JSX；子面板与主面板都从这里取单一数据源。
 */

import type { IconName } from '../../types'
import {
  COLOR_SCHEMES as REAL_COLOR_SCHEMES,
  THEME_INFO_LIST,
  THEME_CATEGORIES as REAL_THEME_CATEGORIES,
  THEME_STYLE_TAGS as REAL_THEME_STYLE_TAGS,
  FEATURED_THEMES,
  DEFAULT_DESIGN_CONFIG,
} from '@features/blog/hooks/useBlogGenerator'
import type { BlogConfig as RealBlogConfig, ThemeStyle } from '@features/blog'
import { collectMarkdownFiles } from '@core/files/fileTree'
import type { FileNode } from '@src/types/fileManager'
import { countWords } from '@features/editor/stats'

// 批次债①：默认值单源收口——与真实层语义重叠的字段从 DEFAULT_DESIGN_CONFIG 派生（见下方 DEFAULT_CONFIG）
type PanelKey = 'style' | 'color' | 'content' | 'features' | 'css' | 'export'

/* 子面板注册表：label 供次级 segmented 与浮层标题复用（功能与旧 6 tab 一致） */
const PANELS: { key: PanelKey; label: string; icon: IconName }[] = [
  { key: 'style', label: '样式', icon: 'theme' },
  { key: 'color', label: '配色', icon: 'paint' },
  { key: 'content', label: '内容', icon: 'fileText' },
  { key: 'features', label: '功能', icon: 'sparkle' },
  { key: 'css', label: 'CSS', icon: 'code' },
  { key: 'export', label: '导出', icon: 'export' },
]

/* P1-5 信息架构：6 个平级 tab 折叠为 3 组（主题/数据/高级），
 * 组内以次级 segmented 切换子面板；子面板本身不增不减。 */
const PANEL_GROUPS: { key: string; label: string; icon: IconName; items: PanelKey[] }[] = [
  { key: 'theme', label: '主题', icon: 'theme', items: ['style', 'color'] },
  { key: 'data', label: '数据', icon: 'layers', items: ['content', 'features'] },
  { key: 'advanced', label: '高级', icon: 'settings', items: ['css', 'export'] },
]

/* ---- 配色方案（单一数据源：真实 BlogStudio 的 COLOR_SCHEMES，禁增/禁漂移）---- */
const COLOR_SCHEMES: { key: string; label: string; hex: string }[] = REAL_COLOR_SCHEMES.map((c) => ({
  key: c.key,
  label: c.label,
  hex: c.color,
}))

/* ---- 主题市场（单一数据源：真实 BlogStudio 的 THEME_INFO_LIST，覆盖全部分类）---- */
const THEME_CATEGORIES: { value: string; label: string }[] = REAL_THEME_CATEGORIES.map((c) => ({
  value: c.key,
  label: c.zh,
}))
const THEME_STYLE_TAGS: { value: string; label: string }[] = REAL_THEME_STYLE_TAGS.map((t) => ({
  value: t.key,
  label: t.zh,
}))
/* 风格筛选滚轮选项：风格行已从多选 chip 改为滚轮鼓单选（AuroraSelect），头部补「全部」 */
const THEME_STYLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  ...THEME_STYLE_TAGS,
]

// 主题市场搜索框「顶端吸附」双阈值（px）：scrollTop ≤ SHOW 视为在顶端；> HIDE 视为离开顶端
// （同时是 hasLeftTop 的置位线）；两值之间维持原状——滞回带防顶端边界抖动。
const SEARCH_TOP_SHOW = 2
const SEARCH_TOP_HIDE = 12
// 展开锚定二跑延时（ms）：第二次锚定在此时刻执行，须盖过浮层飞入动画
// （--mc-dur-slow 320ms 级），清除动画期伪滚动对 hasLeftTop 的污染。
const SEARCH_SETTLE_MS = 500

interface ThemeItem {
  key: string
  nameEn: string
  nameZh: string
  gradient: string
  category: string
  tags: string[]
  desc: string
  featured?: boolean
}

// 主题市场只露精品（P1-1.3 B1）：默认展示 12 个差异风格；已存配置仍可引用其余主题渲染
const THEME_MARKET: ThemeItem[] = THEME_INFO_LIST
  .filter((t) => FEATURED_THEMES.includes(t.key))
  .map((t) => ({
  key: t.key,
  nameEn: t.name.en,
  nameZh: t.name.zh,
  gradient: t.gradient,
  category: t.category,
  tags: t.tags,
  desc: t.description.zh,
  featured: !!t.featured,
}))

/* ---- 真实文档收集：遍历 FileStore.rootFolder 收集全部 .md 文件（禁 mock 文档列表）---- */
interface BlogDoc {
  id: string
  title: string
  words: number
  included: boolean
  /** 原始内容（供真实生成器使用） */
  content: string
}

/** 单个 .md 文件节点 → 博客文档项（内容取真实文件 content，字数走 features/editor/stats 单一数据源） */
function toBlogDoc(f: FileNode): BlogDoc {
  const content = typeof f.content === 'string' ? f.content : ''
  return { id: f.id, title: f.name.replace(/\.md$/i, ''), words: countWords(content), included: true, content }
}

function collectMdFiles(node: FileNode, hiddenIds?: ReadonlySet<string>): BlogDoc[] {
  const files = collectMarkdownFiles(node)
  // `hiddenIds` = 应从**编辑器文件列表**排除的节点 id（判定单源 @core/files/usageDocs，
  // 经 useUsageDocsScope 取用）。内置《MarkCraft 使用文档》是**应用说明书**，不是用户的博客内容：
  // 它已从文件列表隐藏，此处若不过滤，手册就会以「博客文章」的面貌重新出现在待发布清单
  // 与预览里（用户 2026-09-23 报障）。**不在此另写一份判定** —— 与 FileTree#visibleRecent 同源同写法。
  // 集合为空（没有内置文档）时不额外分配数组。
  const visible = hiddenIds && hiddenIds.size > 0 ? files.filter((f) => !hiddenIds.has(f.id)) : files
  return visible.map(toBlogDoc)
}

/* ---- 友链 / 系列文章：起始为空，由用户在「功能」面板添加（对齐真实 BlogStudio 默认 friendLinks/seriesConfig 为空）---- */
interface BlogFriend {
  id: string
  name: string
  url: string
}
interface BlogSeries {
  id: string
  name: string
  count: number
}

interface BlogConfig {
  siteTitle: string
  siteDescription: string
  author: string
  language: string
  themeKey: string
  theme: 'light' | 'dark'
  colorScheme: string
  font: 'serif' | 'sans' | 'mono'
  // 功能
  enableViews: boolean
  enableLikes: boolean
  enablePwa: boolean
  enableReward: boolean
  rewardWechat: string
  rewardAlipay: string
  aboutBio: string
  aboutSkills: string
  // CSS
  enableCustomCss: boolean
  customCssLight: string
  customCssDark: string
}

// 批次债①：默认值单源收口——与真实层语义重叠的字段从 DEFAULT_DESIGN_CONFIG 派生，
// 真实层改默认值时此处自动跟随；有意分歧的字段逐项注释，禁止无说明的平行字面量。
const DEFAULT_CONFIG: BlogConfig = {
  siteTitle: DEFAULT_DESIGN_CONFIG.siteTitle,
  siteDescription: '用 MarkCraft 构建的个人博客，记录设计与思考。', // 有意分歧：Aurora 中文本地化（真实层 'A simple static blog'）
  author: '作者', // 有意分歧：Aurora 本地化（真实层 'Anonymous'）
  language: DEFAULT_DESIGN_CONFIG.language,
  themeKey: DEFAULT_DESIGN_CONFIG.layout, // 语义映射：themeKey ↔ 真实层 layout
  theme: DEFAULT_DESIGN_CONFIG.theme,
  colorScheme: 'blue-purple', // 有意分歧：P2-C 用户拍板，默认不落最高饱和 violet 端（purple→#8B00FF），收敛为同族 blue-purple（真实层默认 'red'）
  font: DEFAULT_DESIGN_CONFIG.font,
  enableViews: true, // 有意分歧：Aurora 产品默认开启阅读量/点赞（真实层 enableBusuanzi/enableApplause 默认 false）
  enableLikes: true,
  enablePwa: true, // 有意分歧：Aurora 默认开启 PWA（真实层默认 false）
  enableReward: false,
  rewardWechat: '',
  rewardAlipay: '',
  aboutBio: '一名喜欢设计与写作的创作者。',
  aboutSkills: '设计系统, 前端, 写作',
  enableCustomCss: false,
  customCssLight: '/* 自定义亮色样式 */\n:root {\n  --blog-radius: 10px;\n}',
  // 使用优化③b：暗色示例改为纯注释——原示例含 body{background:#0d0f15}，被注入模板的
  // @media(prefers-color-scheme:dark)/[data-theme=dark] 包裹后，系统深色用户一开 toggle 预览就被刷成暗色（与亮色 Segment 割裂）。
  customCssDark: '/* 自定义暗色样式（仅在深色模式生效）\n示例：\nbody {\n  background: #0d0f15;\n  color: #e0e0e0;\n}\n*/',
}
/* ============================================================
 * 预览 HTML 生成（P0 修复 · 主题市场切换不生效）
 * 原 buildPreviewHtml 是自写简化版，themeKey 仅体现在文字上、预览 CSS 完全不随
 * 主题变化；现改为调用真实 generateSingleFileBlog（按 themeStyle 渲染 60+ 主题
 * 模板，含新主题 newThemeTemplate / 经典主题 classicHtmlTemplate / custom），
 * 与真实 BlogStudio 的 iframe 预览同源（D4 单一数据源，禁平行 mock）。
 * ========================================================== */
function toRealBlogConfig(cfg: BlogConfig, friends: BlogFriend[], series: BlogSeries[]): Partial<RealBlogConfig> {
  const layout: RealBlogConfig['layout'] =
    cfg.themeKey === 'minimal' || cfg.themeKey === 'classic' ? cfg.themeKey : 'magazine'
  return {
    siteTitle: cfg.siteTitle,
    siteDescription: cfg.siteDescription,
    author: cfg.author,
    language: cfg.language,
    theme: cfg.theme,
    layout,
    colorScheme: cfg.colorScheme as RealBlogConfig['colorScheme'],
    font: cfg.font,
    themeStyle: cfg.themeKey as ThemeStyle,
    // 自定义 CSS：启用时注入亮/暗两份（真实生成器自动包裹 @media prefers-color-scheme）
    customCss: cfg.enableCustomCss ? cfg.customCssLight : undefined,
    customCssDark: cfg.enableCustomCss ? cfg.customCssDark : undefined,
    // 扩展功能
    enableBusuanzi: cfg.enableViews,
    enableApplause: cfg.enableLikes,
    enablePwa: cfg.enablePwa,
    reward: cfg.enableReward
      ? { enable: true, wechatQrcode: cfg.rewardWechat || undefined, alipayQrcode: cfg.rewardAlipay || undefined }
      : { enable: false },
    friendLinks: friends.map((f) => ({ name: f.name, url: f.url })),
    seriesConfig: series.map((s) => ({ name: s.name, slug: s.name.toLowerCase().replace(/\s+/g, '-') })),
    aboutConfig: {
      enable: Boolean(cfg.aboutBio.trim() || cfg.aboutSkills.trim()),
      bio: cfg.aboutBio.trim() || undefined,
      skills: cfg.aboutSkills.split(',').map((s) => s.trim()).filter(Boolean),
    },
  }
}

// —— P2-3 拆分导出（消费方：主面板/兄弟模块）——
export {
  PANELS, PANEL_GROUPS, COLOR_SCHEMES, THEME_CATEGORIES, THEME_STYLE_TAGS, THEME_STYLE_FILTER_OPTIONS,
  SEARCH_TOP_SHOW, SEARCH_TOP_HIDE, SEARCH_SETTLE_MS, THEME_MARKET,
  toBlogDoc, collectMdFiles, DEFAULT_CONFIG, toRealBlogConfig,
}
export type {
  PanelKey, ThemeItem, BlogDoc, BlogFriend, BlogSeries, BlogConfig,
}
