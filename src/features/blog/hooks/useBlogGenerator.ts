import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { generateSingleFileBlog, generateBlog, downloadBlogAsZip, BlogGenerationResult } from '../blogGenerator'
import { BlogConfig, ThemeStyle, RewardConfig, FriendLink, AboutConfig, SeriesConfig } from '../templates'
import { parseFrontMatter } from '@utils/frontMatter'
import { useLanguage } from '@stores/LanguageStore'
import { recordPublish, type PublishTraceEntry } from '../services/publishTrace'
import type { PostStatus } from '../services/postStatus'

export interface BlogDesignConfig {
  siteTitle: string
  siteDescription: string
  author: string
  language: string
  layout: 'magazine' | 'minimal' | 'classic'
  colorScheme: 'red' | 'orange-red' | 'orange' | 'orange-yellow' | 'yellow' | 'yellow-green' | 'green' | 'blue-green' | 'blue' | 'blue-purple' | 'purple' | 'purple-red' | 'custom'
  colorLightness: number  // 0-100, 50 = default
  colorSaturation: number // 0-200, 100 = default
  colorSharpness: number  // 0-200, 100 = default
  customColor: string     // hex color when colorScheme is 'custom'
  theme: 'light' | 'dark'
  font: 'serif' | 'sans' | 'mono'
  themeStyle: ThemeStyle
  customCss: string
  customCssDark: string  // 暗色模式专用 CSS
  
  // 扩展功能配置
  enableBusuanzi?: boolean      // 阅读量统计
  enableApplause?: boolean      // 文章点赞
  reward?: RewardConfig         // 打赏功能
  friendLinks?: FriendLink[]    // 友链
  aboutConfig?: AboutConfig     // 关于页面
  seriesConfig?: SeriesConfig[] // 系列文章配置
  favicon?: string              // 网站图标 URL
  enablePwa?: boolean           // PWA 支持
}

// 首次进入 BlogStudio 预览为空的标记（模块级变量，仅在应用运行期间有效，刷新页面后重置）
let hasBlogInitializedThisSession = false

export const DEFAULT_DESIGN_CONFIG: BlogDesignConfig = {
  siteTitle: 'My Blog',
  siteDescription: 'A simple static blog',
  author: 'Anonymous',
  language: 'zh-CN',
  layout: 'magazine',
  colorScheme: 'red',
  colorLightness: 50,
  colorSaturation: 100,
  colorSharpness: 100,
  customColor: '#d97706',
  theme: 'light',
  font: 'serif',
  themeStyle: 'magazine',
  customCss: '',
  customCssDark: '',
  // 扩展功能配置
  enableBusuanzi: false,
  enableApplause: false,
  reward: { enable: false },
  friendLinks: [],
  aboutConfig: { enable: false },
  seriesConfig: [],
  enablePwa: false,
}

export const COLOR_SCHEMES: Array<{ key: BlogDesignConfig['colorScheme']; color: string; label: string }> = [
  { key: 'red', color: '#FF0000', label: '红' },
  { key: 'orange-red', color: '#FF4500', label: '橙红' },
  { key: 'orange', color: '#FF8C00', label: '橙' },
  { key: 'orange-yellow', color: '#FFC800', label: '橙黄' },
  { key: 'yellow', color: '#FFFF00', label: '黄' },
  { key: 'yellow-green', color: '#ADFF2F', label: '黄绿' },
  { key: 'green', color: '#00FF00', label: '绿' },
  { key: 'blue-green', color: '#00CED1', label: '蓝绿' },
  { key: 'blue', color: '#0000FF', label: '蓝' },
  { key: 'blue-purple', color: '#4B0082', label: '蓝紫' },
  { key: 'purple', color: '#8B00FF', label: '紫' },
  { key: 'purple-red', color: '#FF00FF', label: '紫红' },
]

export const FONT_OPTIONS: Array<{ key: BlogDesignConfig['font']; sample: string }> = [
  { key: 'serif', sample: 'Playfair Display' },
  { key: 'sans', sample: 'Inter' },
  { key: 'mono', sample: 'JetBrains Mono' },
]

export const THEME_STYLE_OPTIONS: Array<{ key: ThemeStyle; gradient: string; icon: string }> = [
  { key: 'magazine', gradient: 'linear-gradient(135deg, #d97706, #e11d48)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v3h-3V8zm-5 5h8v2H8v-2z' },
  { key: 'minimal', gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)', icon: 'M4 6h16M4 10h16M4 14h10M4 18h7' },
  { key: 'classic', gradient: 'linear-gradient(135deg, #059669, #34d399)', icon: 'M4 4h8v8H4V4zm10 0h6v3h-6V4zm0 5h6v3h-6V9zM4 14h16v6H4v-6z' },
  { key: 'ink-wash', gradient: 'linear-gradient(135deg, #1a1a1a, #c23b22)', icon: 'M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 2c.5 0 1 .1 1.5.2C12.5 7 10 10 7 10.5 7.5 7 9.5 5 12 5z' },
  { key: 'terminal', gradient: 'linear-gradient(135deg, #0a0a0a, #00ff41)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2l3 2-3 2m5 0h3' },
  { key: 'newspaper', gradient: 'linear-gradient(135deg, #f5f0e1, #8b0000)', icon: 'M3 4h18v16H3V4zm2 2v12h14V6H5zm2 2h4v4H7V8zm6 0h4v1h-4V8zm0 3h4v1h-4v-1zm-6 3h10v1H7v-1z' },
  { key: 'glassmorphism', gradient: 'linear-gradient(135deg, #a78bfa, #f472b6, #38bdf8)', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { key: 'bento', gradient: 'linear-gradient(135deg, #fbbf24, #f97316, #ef4444)', icon: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm8 0h10v8H11v-8z' },
  { key: 'narrative', gradient: 'linear-gradient(135deg, #92400e, #d97706, #fbbf24)', icon: 'M4 4h16v2H4V4zm0 4h12v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z' },
  { key: 'cyberpunk', gradient: 'linear-gradient(135deg, #0a0a14, #00f0ff, #ff00aa)', icon: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2l8 4v8l-8 4-8-4V8l8-4z' },
  { key: 'aurora', gradient: 'linear-gradient(135deg, #0a0f1a, #00ff88, #0088ff, #8800ff)', icon: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 2c3.3 0 6.2 1.8 7.8 4.5L12 12V4z' },
  { key: 'academia', gradient: 'linear-gradient(135deg, #1a2744, #8b1a1a, #c4a35a)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm0 3h16v1H4v-1zm0 3h10v1H4v-1zm0 3h12v1H4v-1zm0 3h8v1H4v-1z' },
  { key: 'retro', gradient: 'linear-gradient(135deg, #6b8e23, #daa520, #cc5500)', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v2h-4V7zm0 4h4v1h-4v-1zM7 13h10v2H7v-2z' },
  { key: 'garden', gradient: 'linear-gradient(135deg, #7c9a5e, #e8b4b8, #b8a9c9)', icon: 'M12 2C8 2 4 6 4 10c0 3 2 5 4 7v3h8v-3c2-2 4-4 4-7 0-4-4-8-8-8zm0 2c3 0 6 3 6 6s-2 4-4 6h-4c-2-2-4-3-4-6s3-6 6-6z' },
  { key: 'midnight', gradient: 'linear-gradient(135deg, #0d1b2a, #778da9, #e0e1dd)', icon: 'M12 3a6 6 0 00-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 00-6-6zm0 2a4 4 0 014 4c0 2-2 5-4 7-2-2-4-5-4-7a4 4 0 014-4z' },
  { key: 'poetry', gradient: 'linear-gradient(135deg, #c4b5fd, #f9a8d4)', icon: 'M4 6h16M4 10h10M4 14h14M4 18h6' },
  { key: 'typewriter', gradient: 'linear-gradient(135deg, #f5f0e1, #8b6914)', icon: 'M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm1 3h10v1H7V7zm0 3h10v1H7v-1zm0 3h7v1H7v-1z' },
  { key: 'ocean', gradient: 'linear-gradient(135deg, #0077b6, #90e0ef, #caf0f8)', icon: 'M3 17l6-6 4 4 8-8' },
  { key: 'sunset', gradient: 'linear-gradient(135deg, #ffba08, #f48c06, #e85d04, #dc2f02)', icon: 'M12 2v20M2 12l4-4 4 4 4-4 4 4' },
  { key: 'editorial', gradient: 'linear-gradient(135deg, #1a1a1a, #ffffff, #8b0000)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm2 3h12v6H6v-6z' },
  { key: 'trending', gradient: 'linear-gradient(135deg, #7c3aed, #ec4899, #f97316)', icon: 'M13 7h8m-8 4h5m-5 4h8M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z' },
  { key: 'dispatch', gradient: 'linear-gradient(135deg, #1e3a5f, #ea580c)', icon: 'M5 4h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm0 6h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a1 1 0 011-1zm0 6h8a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a1 1 0 011-1z' },
  { key: 'carbon', gradient: 'linear-gradient(135deg, #0d1117, #30363d, #4ade80)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v2H8V8zm5 0h3v1h-3V8zm0 3h3v1h-3v-1zm-5 3h8v1H8v-1z' },
  { key: 'blueprint', gradient: 'linear-gradient(135deg, #1e3a5f, #ffffff, #2563eb)', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8M8 12h8M8 15h5' },
  { key: 'hacker', gradient: 'linear-gradient(135deg, #000000, #00ff41, #ffffff)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 2l4 4-4 4m5 0h3' },
  { key: 'showcase', gradient: 'linear-gradient(135deg, #ffffff, #6b7280, #111827)', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { key: 'mosaic', gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)', icon: 'M3 3h4v8H3V3zm6 0h4v5H9V3zm6 0h4v3h-4V3zM3 13h4v8H3v-8zm6-2h4v10H9V11zm6 4h4v6h-4v-6z' },
  { key: 'gallery', gradient: 'linear-gradient(135deg, #ffffff, #f3f4f6)', icon: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z' },
  { key: 'cinematic', gradient: 'linear-gradient(135deg, #0a0a0a, #1e3a5f, #d4a843)', icon: 'M2 4h20v16H2V4zm2 2v12h16V6H4zm4 2l6 4-6 4V8z' },
  { key: 'docs', gradient: 'linear-gradient(135deg, #ffffff, #2563eb)', icon: 'M4 6h16M4 10h10M4 14h14M4 18h8' },
  { key: 'wiki', gradient: 'linear-gradient(135deg, #ffffff, #9ca3af, #336699)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8h-4a4 4 0 00-4-4V4z' },
  { key: 'neon', gradient: 'linear-gradient(135deg, #0a0a14, #ff00ff, #00f0ff, #8800ff)', icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
  { key: 'origami', gradient: 'linear-gradient(135deg, #fefefe, #bfdbfe, #9ca3af)', icon: 'M6 2l6 6-6 6V2zm6 6l6-6v12l-6-6zm-6 6h12v2H6v-2z' },
]

// 主题分类类型
export type ThemeCategory = 'personal' | 'magazine' | 'portfolio' | 'tech' | 'photography' | 'documentation' | 'creative'
export type ThemeTag = 'minimal' | 'dark' | 'retro' | 'futuristic' | 'natural' | 'academic' | 'typography' | 'fullwidth' | 'grid' | 'illustration'
export type ThemeFeature = 'responsive' | 'darkmode' | 'code' | 'search' | 'comments' | 'social' | 'i18n'

export interface ThemeInfo {
  key: ThemeStyle
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  category: ThemeCategory
  tags: ThemeTag[]
  features: ThemeFeature[]
  gradient: string
  icon: string
  featured?: boolean
  isNew?: boolean
  isDarkDefault?: boolean
}

export const THEME_CATEGORIES: Array<{ key: ThemeCategory | 'all'; zh: string; en: string }> = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'personal', zh: '个人博客', en: 'Personal' },
  { key: 'magazine', zh: '杂志资讯', en: 'Magazine' },
  { key: 'portfolio', zh: '作品集', en: 'Portfolio' },
  { key: 'tech', zh: '技术博客', en: 'Tech' },
  { key: 'photography', zh: '摄影', en: 'Photography' },
  { key: 'documentation', zh: '文档', en: 'Docs' },
  { key: 'creative', zh: '创意', en: 'Creative' },
]

export const THEME_STYLE_TAGS: Array<{ key: ThemeTag; zh: string; en: string }> = [
  { key: 'minimal', zh: '极简', en: 'Minimal' },
  { key: 'dark', zh: '暗色', en: 'Dark' },
  { key: 'retro', zh: '复古', en: 'Retro' },
  { key: 'futuristic', zh: '未来感', en: 'Futuristic' },
  { key: 'natural', zh: '自然', en: 'Natural' },
  { key: 'academic', zh: '学术', en: 'Academic' },
  { key: 'typography', zh: '排版', en: 'Typography' },
  { key: 'grid', zh: '网格', en: 'Grid' },
  // 2026-09-14 补齐：ThemeTag 类型含 fullwidth/illustration（bento/ink-wash 等主题在用），
  // 但映射表漏了这两项 —— 两层 UI 的 tag 一律回退英文 key，中文界面里中英混杂。
  // 在单一数据源补齐（而非各 UI 层自带兜底映射），真层筛选行会随之多出「通栏/插画」两个合法筛选项。
  { key: 'fullwidth', zh: '通栏', en: 'Fullwidth' },
  { key: 'illustration', zh: '插画', en: 'Illustration' },
]

export const THEME_INFO_LIST: ThemeInfo[] = [
  // === 现有 16 个主题 ===
  { key: 'magazine', name: { zh: '杂志', en: 'Magazine' }, description: { zh: '多栏杂志布局，适合资讯类博客', en: 'Multi-column magazine layout' }, category: 'magazine', tags: ['grid', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #d97706, #e11d48)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v3h-3V8zm-5 5h8v2H8v-2z', featured: true },
  { key: 'minimal', name: { zh: '极简', en: 'Minimal' }, description: { zh: '极简设计，专注内容阅读', en: 'Minimalist design, content-focused' }, category: 'personal', tags: ['minimal', 'typography'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)', icon: 'M4 6h16M4 10h16M4 14h10M4 18h7' },
  { key: 'classic', name: { zh: '经典', en: 'Classic' }, description: { zh: '经典博客风格，简洁大方', en: 'Classic blog style, clean and elegant' }, category: 'personal', tags: ['minimal'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #059669, #34d399)', icon: 'M4 4h8v8H4V4zm10 0h6v3h-6V4zm0 5h6v3h-6V9zM4 14h16v6H4v-6z' },
  { key: 'ink-wash', name: { zh: '水墨', en: 'Ink Wash' }, description: { zh: '中国水墨画风格，意境悠远', en: 'Chinese ink wash painting style' }, category: 'creative', tags: ['natural', 'illustration'], features: ['responsive'], gradient: 'linear-gradient(135deg, #1a1a1a, #c23b22)', icon: 'M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 2c.5 0 1 .1 1.5.2C12.5 7 10 10 7 10.5 7.5 7 9.5 5 12 5z' },
  { key: 'terminal', name: { zh: '终端', en: 'Terminal' }, description: { zh: '程序员终端风格，极客必备', en: 'Terminal style for developers' }, category: 'tech', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #0a0a0a, #00ff41)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2l3 2-3 2m5 0h3', featured: true },
  { key: 'newspaper', name: { zh: '报纸', en: 'Newspaper' }, description: { zh: '传统报纸排版，信息密度高', en: 'Traditional newspaper layout' }, category: 'magazine', tags: ['grid', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #f5f0e1, #8b0000)', icon: 'M3 4h18v16H3V4zm2 2v12h14V6H5zm2 2h4v4H7V8zm6 0h4v1h-4V8zm0 3h4v1h-4v-1zm-6 3h10v1H7v-1z' },
  { key: 'glassmorphism', name: { zh: '玻璃拟态', en: 'Glassmorphism' }, description: { zh: '毛玻璃效果，现代设计趋势', en: 'Frosted glass effect, modern design' }, category: 'creative', tags: ['futuristic', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #a78bfa, #f472b6, #38bdf8)', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { key: 'bento', name: { zh: '便当盒', en: 'Bento' }, description: { zh: '卡片式网格布局，展示作品', en: 'Card grid layout for showcasing work' }, category: 'portfolio', tags: ['grid', 'fullwidth'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #fbbf24, #f97316, #ef4444)', icon: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm8 0h10v8H11v-8z' },
  { key: 'narrative', name: { zh: '叙事', en: 'Narrative' }, description: { zh: '故事叙述风格，沉浸式阅读', en: 'Storytelling style, immersive reading' }, category: 'personal', tags: ['typography', 'minimal'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #92400e, #d97706, #fbbf24)', icon: 'M4 4h16v2H4V4zm0 4h12v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z' },
  { key: 'cyberpunk', name: { zh: '赛博朋克', en: 'Cyberpunk' }, description: { zh: '未来赛博朋克风格，霓虹闪烁', en: 'Futuristic cyberpunk with neon effects' }, category: 'creative', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #0a0a14, #00f0ff, #ff00aa)', icon: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2l8 4v8l-8 4-8-4V8l8-4z' },
  { key: 'aurora', name: { zh: '极光', en: 'Aurora' }, description: { zh: '北极光渐变效果，梦幻色彩', en: 'Northern lights gradient, dreamy colors' }, category: 'creative', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0a0f1a, #00ff88, #0088ff, #8800ff)', icon: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 2c3.3 0 6.2 1.8 7.8 4.5L12 12V4z', featured: true },
  { key: 'academia', name: { zh: '学术', en: 'Academia' }, description: { zh: '学术论文风格，严谨排版', en: 'Academic paper style, rigorous layout' }, category: 'documentation', tags: ['academic', 'typography'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #1a2744, #8b1a1a, #c4a35a)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm0 3h16v1H4v-1zm0 3h10v1H4v-1zm0 3h12v1H4v-1zm0 3h8v1H4v-1z' },
  { key: 'retro', name: { zh: '复古', en: 'Retro' }, description: { zh: '怀旧复古风格，温暖色调', en: 'Nostalgic retro style, warm tones' }, category: 'creative', tags: ['retro', 'illustration'], features: ['responsive'], gradient: 'linear-gradient(135deg, #6b8e23, #daa520, #cc5500)', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v2h-4V7zm0 4h4v1h-4v-1zM7 13h10v2H7v-2z' },
  { key: 'garden', name: { zh: '花园', en: 'Garden' }, description: { zh: '清新花园风格，自然色调', en: 'Fresh garden style, natural tones' }, category: 'personal', tags: ['natural', 'illustration'], features: ['responsive'], gradient: 'linear-gradient(135deg, #7c9a5e, #e8b4b8, #b8a9c9)', icon: 'M12 2C8 2 4 6 4 10c0 3 2 5 4 7v3h8v-3c2-2 4-4 4-7 0-4-4-8-8-8zm0 2c3 0 6 3 6 6s-2 4-4 6h-4c-2-2-4-3-4-6s3-6 6-6z' },
  { key: 'midnight', name: { zh: '午夜', en: 'Midnight' }, description: { zh: '深夜静谧风格，沉稳优雅', en: 'Late night style, calm and elegant' }, category: 'personal', tags: ['dark', 'minimal'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0d1b2a, #778da9, #e0e1dd)', icon: 'M12 3a6 6 0 00-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 00-6-6zm0 2a4 4 0 014 4c0 2-2 5-4 7-2-2-4-5-4-7a4 4 0 014-4z' },
  // === 新增 18 个主题 ===
  { key: 'poetry', name: { zh: '诗歌', en: 'Poetry' }, description: { zh: '淡雅文艺风格，纯文字排版', en: 'Elegant literary style, pure typography' }, category: 'personal', tags: ['minimal', 'typography'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #c4b5fd, #f9a8d4)', icon: 'M4 6h16M4 10h10M4 14h14M4 18h6', isNew: true },
  { key: 'typewriter', name: { zh: '打字机', en: 'Typewriter' }, description: { zh: '复古打字机风格，等宽字体', en: 'Vintage typewriter style, monospace' }, category: 'personal', tags: ['retro', 'typography'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #f5f0e1, #8b6914)', icon: 'M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm1 3h10v1H7V7zm0 3h10v1H7v-1zm0 3h7v1H7v-1z', isNew: true },
  { key: 'ocean', name: { zh: '海洋', en: 'Ocean' }, description: { zh: '清新海洋风，渐变背景', en: 'Fresh ocean style, gradient background' }, category: 'personal', tags: ['natural', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0077b6, #90e0ef, #caf0f8)', icon: 'M3 17l6-6 4 4 8-8', isNew: true },
  { key: 'sunset', name: { zh: '日落', en: 'Sunset' }, description: { zh: '暖色调渐变天空', en: 'Warm sunset gradient sky' }, category: 'personal', tags: ['natural', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ffba08, #f48c06, #e85d04, #dc2f02)', icon: 'M12 2v20M2 12l4-4 4 4 4-4 4 4', isNew: true },
  { key: 'editorial', name: { zh: '社论', en: 'Editorial' }, description: { zh: '纽约时报风格，强排版', en: 'NYT style, strong typography' }, category: 'magazine', tags: ['grid', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #1a1a1a, #ffffff, #8b0000)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm2 3h12v6H6v-6z', isNew: true },
  { key: 'trending', name: { zh: '热门', en: 'Trending' }, description: { zh: '现代资讯流，卡片式', en: 'Modern news feed, card style' }, category: 'magazine', tags: ['grid', 'fullwidth'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #7c3aed, #ec4899, #f97316)', icon: 'M13 7h8m-8 4h5m-5 4h8M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z', isNew: true },
  { key: 'dispatch', name: { zh: '快讯', en: 'Dispatch' }, description: { zh: '新闻快讯风格，紧凑布局', en: 'News dispatch, compact layout' }, category: 'magazine', tags: ['grid', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #1e3a5f, #ea580c)', icon: 'M5 4h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm0 6h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a1 1 0 011-1zm0 6h8a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a1 1 0 011-1z', isNew: true },
  { key: 'carbon', name: { zh: '碳黑', en: 'Carbon' }, description: { zh: 'VS Code 暗色主题风格', en: 'VS Code dark theme style' }, category: 'tech', tags: ['dark', 'minimal'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #0d1117, #30363d, #4ade80)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v2H8V8zm5 0h3v1h-3V8zm0 3h3v1h-3v-1zm-5 3h8v1H8v-1z', isNew: true, isDarkDefault: true },
  { key: 'blueprint', name: { zh: '蓝图', en: 'Blueprint' }, description: { zh: '工程蓝图风格，技术感', en: 'Engineering blueprint style' }, category: 'tech', tags: ['academic', 'grid'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #1e3a5f, #ffffff, #2563eb)', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8M8 12h8M8 15h5', isNew: true },
  { key: 'hacker', name: { zh: '黑客', en: 'Hacker' }, description: { zh: '矩阵风格，绿色终端', en: 'Matrix style, green terminal' }, category: 'tech', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode', 'code'], gradient: 'linear-gradient(135deg, #000000, #00ff41, #ffffff)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 2l4 4-4 4m5 0h3', isNew: true, isDarkDefault: true },
  { key: 'showcase', name: { zh: '展示', en: 'Showcase' }, description: { zh: 'Apple 产品页风格', en: 'Apple product page style' }, category: 'portfolio', tags: ['fullwidth', 'minimal'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #ffffff, #6b7280, #111827)', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', isNew: true },
  { key: 'mosaic', name: { zh: '马赛克', en: 'Mosaic' }, description: { zh: 'Pinterest 瀑布流布局', en: 'Pinterest masonry layout' }, category: 'portfolio', tags: ['grid', 'fullwidth'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)', icon: 'M3 3h4v8H3V3zm6 0h4v5H9V3zm6 0h4v3h-4V3zM3 13h4v8H3v-8zm6-2h4v10H9V11zm6 4h4v6h-4v-6z', isNew: true },
  { key: 'gallery', name: { zh: '画廊', en: 'Gallery' }, description: { zh: '美术馆白墙风格', en: 'Art gallery white wall style' }, category: 'photography', tags: ['minimal', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ffffff, #f3f4f6)', icon: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z', isNew: true },
  { key: 'cinematic', name: { zh: '电影', en: 'Cinematic' }, description: { zh: '电影海报风格', en: 'Movie poster style' }, category: 'photography', tags: ['dark', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0a0a0a, #1e3a5f, #d4a843)', icon: 'M2 4h20v16H2V4zm2 2v12h16V6H4zm4 2l6 4-6 4V8z', isNew: true, isDarkDefault: true },
  { key: 'docs', name: { zh: '文档', en: 'Docs' }, description: { zh: 'GitBook 风格文档主题', en: 'GitBook style documentation theme' }, category: 'documentation', tags: ['academic', 'typography'], features: ['responsive', 'darkmode', 'code', 'search'], gradient: 'linear-gradient(135deg, #ffffff, #2563eb)', icon: 'M4 6h16M4 10h10M4 14h14M4 18h8', isNew: true },
  { key: 'wiki', name: { zh: '百科', en: 'Wiki' }, description: { zh: 'Wikipedia 风格百科主题', en: 'Wikipedia style wiki theme' }, category: 'documentation', tags: ['academic', 'grid'], features: ['responsive', 'darkmode', 'code', 'search'], gradient: 'linear-gradient(135deg, #ffffff, #9ca3af, #336699)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8h-4a4 4 0 00-4-4V4z', isNew: true },
  { key: 'neon', name: { zh: '霓虹', en: 'Neon' }, description: { zh: '霓虹灯效果，未来感', en: 'Neon light effects, futuristic' }, category: 'creative', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0a0a14, #ff00ff, #00f0ff, #8800ff)', icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z', isNew: true, isDarkDefault: true },
  { key: 'origami', name: { zh: '折纸', en: 'Origami' }, description: { zh: '纸质纹理、折角效果', en: 'Paper texture, folded corner effects' }, category: 'creative', tags: ['minimal', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #fefefe, #bfdbfe, #9ca3af)', icon: 'M6 2l6 6-6 6V2zm6 6l6-6v12l-6-6zm-6 6h12v2H6v-2z', isNew: true },
  // === 新增 12 个主题 ===
  { key: 'swiss', name: { zh: '瑞士', en: 'Swiss' }, description: { zh: '瑞士国际主义设计，严格网格排版', en: 'Swiss Design, strict grid typography' }, category: 'creative', tags: ['typography', 'grid'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #000000, #ff0000, #ffffff)', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h3v3H8V8zm5 0h3v1h-3V8zm0 3h3v1h-3v-1zm-5 3h8v1H8v-1z', isNew: true },
  { key: 'bauhaus', name: { zh: '包豪斯', en: 'Bauhaus' }, description: { zh: '包豪斯风格，三原色几何装饰', en: 'Bauhaus style, primary colors & geometry' }, category: 'creative', tags: ['illustration', 'grid'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #e63946, #f1c40f, #2980b9)', icon: 'M12 2L2 7v10l10 5 10-5V7L12 2zM5 9l7-3.5L19 9l-7 3.5L5 9z', isNew: true },
  { key: 'artdeco', name: { zh: '装饰艺术', en: 'Art Deco' }, description: { zh: '1920s装饰艺术风格，金色奢华', en: '1920s Art Deco, gold & luxury' }, category: 'creative', tags: ['retro', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #1a1a2e, #d4a843, #16213e)', icon: 'M12 2l2 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z', isNew: true },
  { key: 'zen', name: { zh: '禅意', en: 'Zen' }, description: { zh: '日式枯山水美学，极度留白', en: 'Japanese zen garden, extreme whitespace' }, category: 'personal', tags: ['minimal', 'natural'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #f5f0eb, #d4c5a9, #8b7d6b)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8c0 4-4 8-8 10-4-2-8-6-8-10a8 8 0 018-8z', isNew: true },
  { key: 'brutalist', name: { zh: '粗野', en: 'Brutalist' }, description: { zh: '粗野主义设计，粗边框高对比', en: 'Brutalist design, bold borders & contrast' }, category: 'creative', tags: ['minimal', 'typography'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #000000, #ffffff, #000000)', icon: 'M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h16v4H4v-4z', isNew: true },
  { key: 'vaporwave', name: { zh: '蒸汽波', en: 'Vaporwave' }, description: { zh: '蒸汽波美学，粉紫青渐变', en: 'Vaporwave aesthetic, pink-purple-cyan' }, category: 'creative', tags: ['retro', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ff71ce, #01cdfe, #05ffa1, #b967ff)', icon: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2l8 4v8l-8 4-8-4V8l8-4z', isNew: true, isDarkDefault: true },
  { key: 'pixel', name: { zh: '像素', en: 'Pixel' }, description: { zh: '8-bit像素风格，游戏UI', en: '8-bit pixel art style, game UI' }, category: 'creative', tags: ['illustration', 'retro'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #6b8cff, #ff6b6b, #6bff6b)', icon: 'M5 5h3v3H5V5zm5 0h3v3h-3V5zm5 0h3v3h-3V5zM5 10h3v3H5v-3zm5 0h3v3h-3v-3zm5 0h3v3h-3v-3zM5 15h3v3H5v-3zm5 0h3v3h-3v-3zm5 0h3v3h-3v-3z', isNew: true },
  { key: 'neumorphism', name: { zh: '新拟态', en: 'Neumorphism' }, description: { zh: '柔和凸起凹陷效果，新拟态设计', en: 'Soft raised/sunken effects, neumorphism' }, category: 'creative', tags: ['minimal', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #e0e5ec, #a3b1c6, #e0e5ec)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8 8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8z', isNew: true },
  { key: 'corporate', name: { zh: '企业', en: 'Corporate' }, description: { zh: '专业企业官网风格', en: 'Professional corporate website style' }, category: 'portfolio', tags: ['minimal', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v1H8V8zm0 3h8v1H8v-1zm0 3h5v1H8v-1z', isNew: true },
  { key: 'fashion', name: { zh: '时尚', en: 'Fashion' }, description: { zh: '时尚杂志风格，编辑式排版', en: 'Fashion magazine, editorial layout' }, category: 'magazine', tags: ['typography', 'fullwidth'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #000000, #c8a97e, #ffffff)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm2 3h12v6H6v-6z', isNew: true },
  { key: 'forest', name: { zh: '森林', en: 'Forest' }, description: { zh: '自然森林风格，温暖绿棕色调', en: 'Natural forest style, warm green & brown' }, category: 'personal', tags: ['natural', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #2d5016, #5a8a32, #c8b88a)', icon: 'M12 2L7 7h3v7h4V7h3L12 2zM5 16v4h14v-4H5z', isNew: true },
  { key: 'notion', name: { zh: '笔记', en: 'Notion' }, description: { zh: 'Notion风格笔记主题，侧边栏导航', en: 'Notion-style notes, sidebar navigation' }, category: 'documentation', tags: ['minimal', 'academic'], features: ['responsive', 'darkmode', 'code', 'search'], gradient: 'linear-gradient(135deg, #ffffff, #e8e8e8, #000000)', icon: 'M4 6h16M4 10h10M4 14h14M4 18h8', isNew: true },
  // === 新增 10 个主题 ===
  { key: 'cafe', name: { zh: '咖啡馆', en: 'Café' }, description: { zh: '独立咖啡馆风格，温暖舒适', en: 'Indie café style, warm and cozy' }, category: 'personal', tags: ['natural', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #6b4226, #c8a882, #f5f0e8)', icon: 'M4 4h16v2H4V4zm1 4h14v10H5V8zm5 3v4h4v-4h-4z', isNew: true },
  { key: 'travel', name: { zh: '旅行', en: 'Travel' }, description: { zh: '旅行日志风格，虚线路线', en: 'Travel journal style, dashed routes' }, category: 'personal', tags: ['natural', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #1e90ff, #87ceeb, #f4a460)', icon: 'M12 2C8 2 4 6 4 10c0 4 8 12 8 12s8-8 8-12c0-4-4-8-8-8zm0 2a3 3 0 110 6 3 3 0 010-6z', isNew: true },
  { key: 'music', name: { zh: '音乐', en: 'Music' }, description: { zh: 'Spotify风格音乐主题，音波动画', en: 'Spotify-style music theme, sound wave animation' }, category: 'creative', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #121212, #1db954, #191414)', icon: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z', isNew: true, isDarkDefault: true },
  { key: 'sketch', name: { zh: '手绘', en: 'Sketch' }, description: { zh: '手绘草图风格，便签纸涂鸦', en: 'Hand-drawn sketch style, sticky note doodles' }, category: 'creative', tags: ['illustration', 'minimal'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #fff9c4, #ffecb3, #d7ccc8)', icon: 'M4 4h12l4 4v12H4V4zm2 2v12h12V9h-3V6H6zm3 5h6v1H9v-1zm0 3h4v1H9v-1z', isNew: true },
  { key: 'cosmos', name: { zh: '宇宙', en: 'Cosmos' }, description: { zh: 'NASA太空探索风格，星空背景', en: 'NASA space exploration, starfield background' }, category: 'creative', tags: ['dark', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0b0d17, #1a1a5e, #4a0e8f, #ff6b35)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.5 0 3 .3 4.3.9L12 12V4zm-6.5 2.5A8 8 0 005 12h5L5.5 6.5z', isNew: true, isDarkDefault: true },
  { key: 'claymorphism', name: { zh: '粘土', en: 'Claymorphism' }, description: { zh: '粘土拟态3D凸起效果', en: 'Clay morphism, 3D raised effects' }, category: 'creative', tags: ['illustration', 'futuristic'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 017 7 7 7 0 01-7 7 7 7 0 01-7-7 7 7 0 017-7z', isNew: true },
  { key: 'ice-crystal', name: { zh: '冰晶', en: 'Ice Crystal' }, description: { zh: '冰蓝毛玻璃效果，冷色调', en: 'Ice blue frosted glass, cool tones' }, category: 'creative', tags: ['futuristic', 'fullwidth'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #e0f7fa, #80deea, #00acc1, #006064)', icon: 'M12 2l2 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z', isNew: true },
  { key: 'rams', name: { zh: '拉姆斯', en: 'Rams' }, description: { zh: 'Dieter Rams功能主义，极致极简', en: 'Dieter Rams functionalism, extreme minimalism' }, category: 'creative', tags: ['minimal', 'typography'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #f5f5f5, #bdbdbd, #424242)', icon: 'M4 6h16M4 10h16M4 14h10M4 18h6', isNew: true },
  { key: 'luxury', name: { zh: '奢华', en: 'Luxury' }, description: { zh: '黑金奢华风格，高端品牌感', en: 'Black & gold luxury, premium brand feel' }, category: 'portfolio', tags: ['typography', 'minimal'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #0a0a0a, #c9a84c, #0a0a0a)', icon: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2l8 4v8l-8 4-8-4V8l8-4z', isNew: true },
  { key: 'comic', name: { zh: '漫画', en: 'Comic' }, description: { zh: '漫画书风格，粗边框半色调', en: 'Comic book style, bold borders & halftone' }, category: 'creative', tags: ['illustration', 'retro'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ffeb3b, #ff5722, #2196f3)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 2h6l-3 5h4l-5 6v-4H8l3-5H9V8z', isNew: true },
  // === 新增 8 个主题 ===
  { key: 'steampunk', name: { zh: '蒸汽朋克', en: 'Steampunk' }, description: { zh: '维多利亚+机械齿轮风格', en: 'Victorian + clockwork gears style' }, category: 'creative', tags: ['retro', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #3e2723, #b87333, #d4a843)', icon: 'M12 2a3 3 0 100 6 3 3 0 000-6zm0 2a1 1 0 110 2 1 1 0 010-2zm-6 4a3 3 0 100 6 3 3 0 000-6zm12 0a3 3 0 100 6 3 3 0 000-6zm-6 6a3 3 0 100 6 3 3 0 000-6z', isNew: true },
  { key: 'gothic', name: { zh: '哥特', en: 'Gothic' }, description: { zh: '哥特暗黑风格，尖拱装饰', en: 'Gothic dark style, pointed arch decoration' }, category: 'creative', tags: ['dark', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #0a0010, #4a0e4e, #8b0000)', icon: 'M12 2L4 22h2l2-4h12l2 4h2L12 2zm0 5l4 9H8l4-9z', isNew: true, isDarkDefault: true },
  { key: 'noir', name: { zh: '黑色电影', en: 'Noir' }, description: { zh: 'Film Noir风格，纯黑白灰', en: 'Film Noir style, pure black & white' }, category: 'creative', tags: ['dark', 'minimal'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #000000, #333333, #000000)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm4 2h4l-2 6h2l-4 4v-4H8l2-6z', isNew: true, isDarkDefault: true },
  { key: 'recipe', name: { zh: '食谱', en: 'Recipe' }, description: { zh: '美食博客风格，食谱卡片', en: 'Food blog style, recipe cards' }, category: 'personal', tags: ['natural', 'illustration'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #fff8f0, #e74c3c, #27ae60)', icon: 'M4 4h16v2H4V4zm0 4h16v1H4V8zm2 3h12v8H6v-8zm4 2v4h4v-4h-4z', isNew: true },
  { key: 'timeline', name: { zh: '时间线', en: 'Timeline' }, description: { zh: '垂直时间线布局，时间序列', en: 'Vertical timeline layout, chronological' }, category: 'personal', tags: ['typography', 'grid'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #f8f9fa, #6c757d, #343a40)', icon: 'M12 2v20M8 6h8M8 10h6M8 14h8M8 18h4', isNew: true },
  { key: 'feed', name: { zh: '动态流', en: 'Feed' }, description: { zh: '社交媒体信息流风格', en: 'Social media feed style' }, category: 'magazine', tags: ['grid', 'typography'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #1da1f2, #f5f8fa, #657786)', icon: 'M4 4h16v2H4V4zm0 4h12v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z', isNew: true },
  { key: 'pastel', name: { zh: '粉彩', en: 'Pastel' }, description: { zh: '柔和粉彩风格，梦幻可爱', en: 'Soft pastel style, dreamy & kawaii' }, category: 'creative', tags: ['illustration', 'minimal'], features: ['responsive', 'darkmode'], gradient: 'linear-gradient(135deg, #ffc1cc, #c9b1ff, #a0d8ef, #b5ead7)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8 8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8zm-4 6a1 1 0 110 2 1 1 0 010-2zm8 0a1 1 0 110 2 1 1 0 010-2z', isNew: true },
  { key: 'newsletter', name: { zh: '简报', en: 'Newsletter' }, description: { zh: 'Substack风格邮件简报', en: 'Substack-style email newsletter' }, category: 'magazine', tags: ['typography', 'minimal'], features: ['responsive', 'darkmode', 'social'], gradient: 'linear-gradient(135deg, #ffffff, #f0f0f0, #666666)', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v1H8V8zm0 3h8v1H8v-1zm0 3h5v1H8v-1z', isNew: true },
]

/**
 * 精品主题清单（P1-1.3 B1）——主题市场默认只露 12 个差异风格精品：
 * 覆盖 程序员(terminal)/资讯(magazine/newspaper)/中文特色(ink-wash)/创意(cyberpunk/aurora)/
 * 暗色极简(midnight)/基础款(minimal)/现代(glassmorphism)/学术(academia)/作品集(bento)/沉浸阅读(narrative)。
 * 其余主题保留完整定义（已存配置可继续引用渲染；搜索/分类/标签主动探索时仍可看到全部）。
 */
export const FEATURED_THEMES: ThemeStyle[] = [
  'terminal',
  'magazine',
  'ink-wash',
  'cyberpunk',
  'midnight',
  'minimal',
  'newspaper',
  'glassmorphism',
  'academia',
  'bento',
  'aurora',
  'narrative',
]

export type LeftTab = 'style' | 'color' | 'content'

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function designConfigToBlogConfig(design: BlogDesignConfig): Partial<BlogConfig> {
  return {
    siteTitle: design.siteTitle,
    siteDescription: design.siteDescription,
    author: design.author,
    language: design.language,
    theme: design.theme,
    layout: design.layout,
    colorScheme: design.colorScheme,
    colorLightness: design.colorLightness,
    colorSaturation: design.colorSaturation,
    colorSharpness: design.colorSharpness,
    customColor: design.customColor,
    font: design.font,
    themeStyle: design.themeStyle,
    customCss: design.customCss,
    customCssDark: design.customCssDark,
    // 扩展功能配置
    enableBusuanzi: design.enableBusuanzi,
    enableApplause: design.enableApplause,
    reward: design.reward,
    friendLinks: design.friendLinks?.length ? design.friendLinks : undefined,
    aboutConfig: design.aboutConfig?.enable ? design.aboutConfig : undefined,
    seriesConfig: design.seriesConfig?.length ? design.seriesConfig : undefined,
    favicon: design.favicon || undefined,
    enablePwa: design.enablePwa,
  }
}

export function useBlogGenerator(
  isOpen: boolean,
  onClose: () => void,
  currentFile: Array<{ name: string; content: string }>
) {
  const [designConfig, setDesignConfig] = useState<BlogDesignConfig>({ ...DEFAULT_DESIGN_CONFIG })
  const [result, setResult] = useState<BlogGenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<LeftTab>('style')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set())
  const [blogOpenCount, setBlogOpenCount] = useState(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 首次进入 BlogStudio 时预览为空，需手动选择主题；之后再次进入正常显示
  const [isFirstOpen, setIsFirstOpen] = useState(() => !hasBlogInitializedThisSession)
  const isFirstOpenRef = useRef(isFirstOpen)
  isFirstOpenRef.current = isFirstOpen

  const { t } = useLanguage()

  // Use ref for currentFile to always access latest value in callbacks
  const currentFileRef = useRef(currentFile)
  currentFileRef.current = currentFile

  const mdFiles = useMemo(
    () => currentFile.filter(f => f.name.endsWith('.md')),
    [currentFile]
  )

  const selectedMdFiles = useMemo(
    () => mdFiles.filter(f => !excludedFiles.has(f.name)),
    [mdFiles, excludedFiles]
  )

  // Track file count for triggering updates when files are added/removed
  const fileCountSignature = selectedMdFiles.map(f => f.name).join(',')

  const totalWordCount = useMemo(() => {
    return selectedMdFiles.reduce((sum, f) => {
      const text = f.content.replace(/[#*_`~\[\]()>|+-]/g, '').trim()
      return sum + text.length
    }, 0)
  }, [selectedMdFiles])

  const updatePreview = useCallback((design: BlogDesignConfig) => {
    // Always read from ref to get latest files
    const latestFiles = currentFileRef.current.filter(f => f.name.endsWith('.md') && !excludedFiles.has(f.name))
    if (latestFiles.length === 0) {
      setPreviewHtml('')
      return
    }
    try {
      const blogConfig = designConfigToBlogConfig(design)
      const html = generateSingleFileBlog(
        latestFiles.map(f => {
          const parsed = parseFrontMatter(f.content)
          return {
            name: f.name.replace(/\.md$/, ''),
            content: parsed.content,
            frontMatter: parsed.frontMatter,
          }
        }),
        blogConfig
      )
      setPreviewHtml(html)
    } catch {
      setPreviewHtml('')
    }
  }, [excludedFiles])

  const debouncedUpdatePreview = useCallback((design: BlogDesignConfig) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      updatePreview(design)
    }, 500)
  }, [updatePreview])

  const handleDesignChange = useCallback(<K extends keyof BlogDesignConfig>(key: K, value: BlogDesignConfig[K]) => {
    setDesignConfig(prev => {
      const next = { ...prev, [key]: value }
      // 所有配置变更都需要重新生成预览（包括 customCss）
      // customCss 会被嵌入到生成的 HTML <style> 标签中，确保 CSS 变量覆盖等生效
      // 同时 injectLiveCss 机制提供即时反馈（无需等待 500ms 防抖）
      debouncedUpdatePreview(next)
      return next
    })
    // 用户手动修改配置（如选择主题）后，标记为已初始化，后续可正常自动预览
    if (isFirstOpenRef.current) {
      setIsFirstOpen(false)
      hasBlogInitializedThisSession = true
    }
  }, [debouncedUpdatePreview])

  const updatePreviewRef = useRef(updatePreview)
  updatePreviewRef.current = updatePreview

  const designConfigRef = useRef(designConfig)
  designConfigRef.current = designConfig

  useEffect(() => {
    if (isOpen) {
      setDesignConfig({ ...DEFAULT_DESIGN_CONFIG })
      setResult(null)
      setIsGenerating(false)
      setIsDownloading(false)
      setPreviewHtml('')
      setError(null)
      setLeftTab('style')
      setPreviewDevice('desktop')
      setExcludedFiles(new Set())
      // Increment counter to trigger the selectedMdFiles effect
      // 注意：首次打开时 isFirstOpen 仍为 true，自动预览会被跳过
      setBlogOpenCount(prev => prev + 1)
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || blogOpenCount === 0) return
    // 首次进入时预览为空，需要用户手动选择主题后才生成
    if (isFirstOpenRef.current) return
    if (selectedMdFiles.length === 0) {
      setPreviewHtml('')
      return
    }
    updatePreviewRef.current(designConfigRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileCountSignature, blogOpenCount])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // configOverride（批次债①）：调用方可传生成器级 Partial<BlogConfig> 覆盖内部 designConfig 的转换结果。
  // 真实 BlogStudio 不传 → 行为不变（仍走 designConfig）；Aurora BlogPanel 传入面板 cfg 映射，
  // 修复「预览用面板配置、生成/发布却走 DEFAULT_DESIGN_CONFIG」的分裂脑。调用处禁止把本函数
  // 直接作为 onClick 引用（event 会被误当 override），须包一层 () => handleGenerate(...)。
  const handleGenerate = useCallback((configOverride?: Partial<BlogConfig>) => {
    setIsGenerating(true)
    setError(null)
    try {
      const blogConfig = { ...designConfigToBlogConfig(designConfig), ...configOverride }
      const genResult = generateBlog(selectedMdFiles, blogConfig)
      setResult(genResult)

      // P1-3: 发布后本地留痕（仅记录已发布文章，失败不影响主流程）
      try {
        const now = new Date()
        const entries: PublishTraceEntry[] = genResult.posts
          .filter(p => (p.status || 'published') === 'published' && !(p.publishDate && new Date(p.publishDate) > now))
          .map(p => ({
            slug: p.slug,
            title: p.title,
            status: 'published' as PostStatus,
            publishedAt: now.toISOString(),
            series: p.series,
          }))
        if (entries.length > 0) recordPublish(entries, now)
      } catch {
        // 留痕失败不阻断发布
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.blogStudio.unknownError
      setError(`${t.blogStudio.generateFailed}: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedMdFiles, designConfig, t])

  const handleDownloadFolder = useCallback(async () => {
    if (!result) return
    setIsDownloading(true)
    setError(null)
    try {
      await downloadBlogAsZip(result)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsDownloading(false)
        return
      }
      const msg = err instanceof Error ? err.message : t.blogStudio.unknownError
      setError(`${t.blogStudio.downloadFailed}: ${msg}`)
    } finally {
      setIsDownloading(false)
    }
  }, [result, t])

  const handleDownloadSingleFile = useCallback(() => {
    if (!result) return
    setIsDownloading(true)
    setError(null)
    try {
      const html = generateSingleFileBlog(
        result.posts.map(p => ({
          name: p.slug,
          content: p.rawContent,
          frontMatter: {
            title: p.title,
            date: p.date,
            tags: p.tags,
            category: p.category,
            description: p.description,
            author: p.author,
            coverImage: p.coverImage,
            draft: p.draft,
          },
        })),
        result.config
      )
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'blog.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.blogStudio.unknownError
      setError(`${t.blogStudio.downloadFailed}: ${msg}`)
    } finally {
      setIsDownloading(false)
    }
  }, [result, t])

  const totalSize = result
    ? result.files.reduce((sum, f) => sum + new Blob([f.content]).size, 0)
    : 0

  const previewSize = previewHtml ? (new Blob([previewHtml]).size / 1024).toFixed(1) : ''

  return {
    designConfig,
    handleDesignChange,
    result,
    isGenerating,
    isDownloading,
    previewHtml,
    error,
    leftTab,
    setLeftTab,
    previewDevice,
    setPreviewDevice,
    excludedFiles,
    setExcludedFiles,
    handleGenerate,
    handleDownloadFolder,
    handleDownloadSingleFile,
    mdFiles,
    selectedMdFiles,
    totalWordCount,
    totalSize,
    previewSize,
  }
}
