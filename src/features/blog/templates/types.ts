export type DeployPlatform = 'github' | 'gitee' | 'vercel' | 'cloudflare' | 'netlify'
export type CommentSystem = 'none' | 'giscus' | 'utterances' | 'waline'

export interface CommentConfig {
  system: CommentSystem
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
  utterancesRepo?: string
  walineServerUrl?: string
}

export interface NavLink {
  label: string
  url: string
}

export type SocialPlatform = 'github' | 'twitter' | 'email' | 'rss' | 'zhihu' | 'weibo' | 'bilibili'

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

export interface AnalyticsConfig {
  googleAnalyticsId?: string
  baiduTongjiId?: string
  plausibleDomain?: string
  umamiWebsiteId?: string
  umamiSrc?: string
}

export interface RewardConfig {
  enable: boolean
  wechatQrcode?: string
  alipayQrcode?: string
  title?: string
}

export interface FriendLink {
  name: string
  url: string
  avatar?: string
  description?: string
}

export interface AboutConfig {
  enable: boolean
  avatar?: string
  bio?: string
  skills?: string[]
  contact?: { label: string; url: string }[]
}

// 系列文章配置
export interface SeriesConfig {
  name: string
  slug: string
  description?: string
  coverImage?: string
}

export type ThemeStyle = 'magazine' | 'minimal' | 'classic' | 'ink-wash' | 'terminal' | 'newspaper' | 'glassmorphism' | 'bento' | 'narrative' | 'cyberpunk' | 'aurora' | 'academia' | 'retro' | 'garden' | 'midnight' | 'custom' | 'poetry' | 'typewriter' | 'ocean' | 'sunset' | 'editorial' | 'trending' | 'dispatch' | 'carbon' | 'blueprint' | 'hacker' | 'showcase' | 'mosaic' | 'gallery' | 'cinematic' | 'docs' | 'wiki' | 'neon' | 'origami' | 'swiss' | 'bauhaus' | 'artdeco' | 'zen' | 'brutalist' | 'vaporwave' | 'pixel' | 'neumorphism' | 'corporate' | 'fashion' | 'forest' | 'notion' | 'cafe' | 'travel' | 'music' | 'sketch' | 'cosmos' | 'claymorphism' | 'ice-crystal' | 'rams' | 'luxury' | 'comic' | 'steampunk' | 'gothic' | 'noir' | 'recipe' | 'timeline' | 'feed' | 'pastel' | 'newsletter'

export interface BlogConfig {
  siteUrl: string
  siteTitle: string
  siteDescription: string
  author: string
  language: string
  postsPerPage: number
  dateFormat: string
  theme: 'light' | 'dark' | 'auto'
  layout: 'magazine' | 'minimal' | 'classic'
  colorScheme: 'red' | 'orange-red' | 'orange' | 'orange-yellow' | 'yellow' | 'yellow-green' | 'green' | 'blue-green' | 'blue' | 'blue-purple' | 'purple' | 'purple-red' | 'custom'
  colorLightness: number  // 0-100, 50 = default
  colorSaturation: number // 0-200, 100 = default
  colorSharpness: number  // 0-200, 100 = default
  customColor?: string    // hex color when colorScheme is 'custom'
  font: 'serif' | 'sans' | 'mono'
  themeStyle: ThemeStyle
  comment?: CommentConfig
  enableSearch?: boolean
  customCss?: string
  customCssDark?: string  // 暗色模式专用 CSS — 自动包裹在 @media (prefers-color-scheme: dark) 和 [data-theme="dark"] 中
  customMeta?: string
  navLinks?: NavLink[]
  socialLinks?: SocialLink[]
  analytics?: AnalyticsConfig
  enableBusuanzi?: boolean
  enableApplause?: boolean
  reward?: RewardConfig
  friendLinks?: FriendLink[]
  aboutConfig?: AboutConfig
  seriesConfig?: SeriesConfig[]  // 系列文章配置
  favicon?: string               // 网站图标 URL
  enablePwa?: boolean           // PWA 支持
  autoSeo?: boolean             // 缺失 FrontMatter 时自动推导描述/标签/slug（默认开启）
  autoCover?: boolean           // 无封面时本地生成 OG 封面图（默认开启，纯本地 SVG）
  coverAccent?: string          // 自动封面主色（十六进制）
}

export interface BlogPost {
  title: string
  slug: string
  date: string
  tags: string[]
  category: string
  description: string
  author: string
  coverImage: string
  draft: boolean
  content: string
  rawContent: string
  customSlug: string
  layout: 'post' | 'page'
  permalink: string
  updated: string
  excerpt: string
  weight: number
  series?: string        // 系列名称
  seriesOrder?: number   // 系列内文章顺序
  publishDate?: string   // 定时发布日期（ISO 8601 格式）
  status?: 'draft' | 'pending' | 'published' // P1-3 发布状态机：草稿 / 待发布 / 已发布（缺省 published）
  ogImage?: string       // 社交分享图（无封面时由本地自动生成，仅用于 SEO meta，不影响卡片渲染）
  wordCount?: number     // 正文字数（中日韩按字、拉丁按词）
  readingMinutes?: number // 预计阅读时长（分钟）
}

export const DEFAULT_BLOG_CONFIG: BlogConfig = {
  siteUrl: 'https://example.com',
  siteTitle: 'My Blog',
  siteDescription: 'A simple static blog',
  author: 'Anonymous',
  language: 'zh-CN',
  postsPerPage: 10,
  dateFormat: 'YYYY-MM-DD',
  theme: 'auto',
  layout: 'magazine',
  colorScheme: 'red',
  colorLightness: 50,
  colorSaturation: 100,
  colorSharpness: 100,
  customColor: '#d97706',
  font: 'serif',
  themeStyle: 'magazine',
  comment: { system: 'none' },
  enableSearch: true,
}
