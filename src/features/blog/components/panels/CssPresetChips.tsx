import { SectionLabel, StudioChip } from '../StudioControls'
import { useThemeTokens } from './themeTokens'
import { useLanguage } from '@stores/LanguageStore'

export type CssCategory = 'typography' | 'layout' | 'effects' | 'components' | 'animation' | 'utility' | 'theme'

// 作用范围：home=仅首页 | post=仅文章页 | both=首页和文章页都有效
export type CssScopeTarget = 'home' | 'post' | 'both'

export interface CssPreset {
  id: string
  zh: string
  en: string
  css: string
  zhDesc: string
  enDesc: string
  category: CssCategory
  scope: CssScopeTarget
}

// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const CSS_CATEGORIES: Array<{ key: CssCategory; labelKey: 'catTheme' | 'catTypography' | 'catLayout' | 'catEffect' | 'catComponent' | 'catAnimation' | 'catUtility'; icon: string }> = [
  { key: 'theme', labelKey: 'catTheme', icon: '🎨' },
  { key: 'typography', labelKey: 'catTypography', icon: 'Aa' },
  { key: 'layout', labelKey: 'catLayout', icon: '☐' },
  { key: 'effects', labelKey: 'catEffect', icon: '✦' },
  { key: 'components', labelKey: 'catComponent', icon: '◈' },
  { key: 'animation', labelKey: 'catAnimation', icon: '↝' },
  { key: 'utility', labelKey: 'catUtility', icon: '⚙' },
]

// 作用范围标记配置
// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const SCOPE_LABELS: Array<{ key: CssScopeTarget; labelKey: 'scopeHomePost' | 'scopeHomeOnly' | 'scopePostOnly'; color: string }> = [
  { key: 'both', labelKey: 'scopeHomePost', color: '#34d399' },
  { key: 'home', labelKey: 'scopeHomeOnly', color: '#38bdf8' },
  { key: 'post', labelKey: 'scopePostOnly', color: '#fbbf24' },
]

// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const CSS_PRESETS: CssPreset[] = [
  // ─── 完整主题 ────────────────────────
  { id: 'theme-elegant', zh: '优雅学术', en: 'Elegant Academic', category: 'theme', scope: 'post',
    zhDesc: '衬线字体 + 大行距 + 深色引用块 + 暖色强调',
    enDesc: 'Serif font + generous line height + dark blockquote + warm accent',
    css: '.post-content, .post-content p { font-family: "Noto Serif SC", "Playfair Display", Georgia, serif; } .post-content { font-size: 1.1em; line-height: 2.2; } .post-content blockquote { border-left: 4px solid var(--accent-warm); background: rgba(0,0,0,0.15); border-radius: 0 12px 12px 0; font-style: italic; } .post-header h1, .post-title { color: var(--accent-warm); } :root { --max-width: 720px; }' },
  { id: 'theme-minimalist', zh: '极简主义', en: 'Minimalist', category: 'theme', scope: 'both',
    zhDesc: '无边框 + 无阴影 + 紧凑间距 + 单色强调',
    enDesc: 'No borders + no shadows + compact spacing + monochrome accent',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { border: none; box-shadow: none; border-radius: 0; } .tag { border: none; background: transparent; color: var(--text-muted); } .post-content { line-height: 1.8; } :root { --radius: 0px; --shadow-card: none; }' },
  { id: 'theme-magazine', zh: '杂志风格', en: 'Magazine', category: 'theme', scope: 'both',
    zhDesc: '大标题 + 分栏布局 + 图片圆角 + 醒目标签',
    enDesc: 'Large headings + multi-column layout + rounded images + bold tags',
    css: '.post-header h1, .post-title { font-size: 2.8em; font-weight: 900; letter-spacing: -0.02em; } .grid-card img, .card img { border-radius: 16px; } .tag { background: var(--accent-warm); color: #fff; border-radius: 4px; font-weight: 700; font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.1em; } .post-content { column-count: 1; } @media (min-width: 900px) { .post-content { column-count: 2; column-gap: 40px; } }' },
  { id: 'theme-terminal', zh: '终端风格', en: 'Terminal', category: 'theme', scope: 'both',
    zhDesc: '等宽字体 + 深色背景 + 绿色强调 + 代码块无边框',
    enDesc: 'Monospace font + dark background + green accent + borderless code blocks',
    css: '.post-content, .post-content p, .post-header h1, .post-header h2, .post-title { font-family: "Fira Code", "JetBrains Mono", "Consolas", monospace; } body { background: #0d1117 !important; color: #c9d1d9 !important; } .post-content a { color: #58a6ff; } :root { --accent-warm: #3fb950; --accent-cool: #58a6ff; } .post-content pre { background: #161b22 !important; border: none; border-radius: 0; } .tag { border-color: #3fb950; color: #3fb950; }' },
  { id: 'theme-warm', zh: '暖色调', en: 'Warm Tone', category: 'theme', scope: 'both',
    zhDesc: '暖色背景 + 圆角卡片 + 柔和阴影 + 橙色强调',
    enDesc: 'Warm background + rounded cards + soft shadows + orange accent',
    css: ':root { --accent-warm: #f97316; --bg-primary: #fffbf5; --bg-secondary: #fef3e2; --bg-card: #fff8f0; --text-primary: #4a3728; --text-secondary: #7c6a5a; --border-color: #e8d5c0; --radius: 20px; --shadow-card: 0 4px 20px rgba(249,115,22,0.08); } body { background: var(--bg-primary); color: var(--text-primary); }' },
  { id: 'theme-cool', zh: '冷色调', en: 'Cool Tone', category: 'theme', scope: 'both',
    zhDesc: '冷色背景 + 直角卡片 + 锐利阴影 + 蓝色强调',
    enDesc: 'Cool background + square cards + sharp shadows + blue accent',
    css: ':root { --accent-warm: #3b82f6; --bg-primary: #f0f4f8; --bg-secondary: #e2e8f0; --bg-card: #f8fafc; --text-primary: #1e293b; --text-secondary: #475569; --border-color: #cbd5e1; --radius: 4px; --shadow-card: 0 2px 8px rgba(0,0,0,0.1); } body { background: var(--bg-primary); color: var(--text-primary); }' },
  { id: 'theme-reading', zh: '阅读模式', en: 'Reading Mode', category: 'theme', scope: 'both',
    zhDesc: '超大行距 + 窄屏居中 + 衬线字体 + 去除装饰',
    enDesc: 'Extra-large line height + narrow centered column + serif + no decoration',
    css: ':root { --max-width: 600px; } .post-content { font-family: "Noto Serif SC", Georgia, serif; font-size: 1.15em; line-height: 2.4; letter-spacing: 0.02em; } .featured-deco, .deco-circle, .deco-diamond, .deco-dot, .post-header-deco, .ornament-line, .ornament-dot, .hero-seal, .footer-ornament { display: none !important; } .post-content p { margin-bottom: 1.8em; }' },
  { id: 'theme-photo', zh: '图片博客', en: 'Photo Blog', category: 'theme', scope: 'both',
    zhDesc: '全宽图片 + 大圆角 + 悬浮放大 + 暗色遮罩',
    enDesc: 'Full-width images + large radius + hover zoom + dark overlay',
    css: '.post-content img { width: 100%; border-radius: 16px; transition: transform 0.3s ease; } .post-content img:hover { transform: scale(1.02); } .grid-card img, .card img, .post-item img { border-radius: 16px; } .featured-card, .card, .post-item { border-radius: 24px; overflow: hidden; } .hero-section, .blog-hero { border-radius: 24px; } :root { --radius: 20px; }' },

  // ─── 排版 ────────────────────────
  { id: 'serif-body', zh: '正文衬线', en: 'Serif Body', category: 'typography', scope: 'post',
    zhDesc: '正文切换为衬线字体，更优雅',
    enDesc: 'Switch body text to a serif font for a more elegant look',
    css: '.post-content, .post-content p { font-family: "Noto Serif SC", "Playfair Display", Georgia, serif; }' },
  { id: 'larger-text', zh: '加大字号', en: 'Larger Text', category: 'typography', scope: 'both',
    zhDesc: '增大正文字号和行高，更易阅读',
    enDesc: 'Increase body font size and line height for easier reading',
    css: '.post-content { font-size: 1.2em; line-height: 2.2; } .hero-desc, .hero-description, .post-excerpt { font-size: 1.3em; }' },
  { id: 'drop-cap', zh: '首字下沉', en: 'Drop Cap', category: 'typography', scope: 'post',
    zhDesc: '文章首字母放大装饰',
    enDesc: 'Enlarge the first letter of the article as decoration',
    css: '.post-content p:first-of-type::first-letter { font-size: 3.5em; float: left; line-height: 0.8; margin: 6px 12px 0 0; font-weight: 900; }' },
  { id: 'gradient-title', zh: '标题渐变色', en: 'Gradient Title', category: 'typography', scope: 'post',
    zhDesc: '文章标题使用渐变色文字',
    enDesc: 'Use gradient text for post titles',
    css: '.post-header h1, .post-title { background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose), var(--accent-violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }' },
  { id: 'compact-line', zh: '紧凑行距', en: 'Compact Line Height', category: 'typography', scope: 'post',
    zhDesc: '缩小行距，信息密度更高',
    enDesc: 'Reduce line height for higher information density',
    css: '.post-content { line-height: 1.6; } .post-content p { margin-bottom: 0.8em; }' },
  { id: 'small-compact', zh: '小号紧凑', en: 'Small Compact', category: 'typography', scope: 'post',
    zhDesc: '小字号紧凑排版，信息密度极高',
    enDesc: 'Small font with compact layout for very high density',
    css: '.post-content { font-size: 0.9em; line-height: 1.5; } .post-content p { margin-bottom: 0.6em; } .post-content h2 { font-size: 1.3em; } .post-content h3 { font-size: 1.1em; }' },
  { id: 'center-title', zh: '标题居中', en: 'Centered Title', category: 'typography', scope: 'post',
    zhDesc: '文章标题和元信息居中对齐',
    enDesc: 'Center-align the post title and meta info',
    css: '.post-header { text-align: center; } .post-header h1, .post-title { text-align: center; } .post-meta { justify-content: center; }' },
  { id: 'cn-optimize', zh: '中文优化', en: 'Chinese Optimization', category: 'typography', scope: 'post',
    zhDesc: '针对中文排版的优化设置',
    enDesc: 'Typographic optimizations for Chinese text',
    css: '.post-content { font-family: "Noto Serif SC", "Source Han Serif CN", serif; letter-spacing: 0.05em; line-height: 2; text-align: justify; } .post-content p { text-indent: 2em; }' },
  { id: 'en-optimize', zh: '英文优化', en: 'English Optimization', category: 'typography', scope: 'post',
    zhDesc: '针对英文排版的优化设置',
    enDesc: 'Typographic optimizations for English text',
    css: '.post-content { font-family: "Merriweather", "Georgia", serif; letter-spacing: 0.01em; line-height: 1.9; hanging-punctuation: first; } .post-content p { orphans: 3; widows: 3; }' },

  // ─── 布局 ────────────────────────
  { id: 'wide-layout', zh: '宽屏布局', en: 'Wide Layout', category: 'layout', scope: 'both',
    zhDesc: '内容区域扩展到 1200px',
    enDesc: 'Expand the content area to 1200px',
    css: ':root { --max-width: 1200px; } .main-content, .post-detail-wrapper, .blog-container, .post-detail { max-width: 1200px; }' },
  { id: 'narrow-center', zh: '窄屏居中', en: 'Narrow Centered', category: 'layout', scope: 'both',
    zhDesc: '内容区域缩窄到 640px，更聚焦',
    enDesc: 'Narrow the content area to 640px for more focus',
    css: ':root { --max-width: 640px; } .main-content, .post-detail-wrapper, .blog-container, .post-detail { max-width: 640px; }' },
  { id: 'hide-sidebar', zh: '隐藏侧边栏', en: 'Hide Sidebar', category: 'layout', scope: 'home',
    zhDesc: '隐藏经典布局的侧边栏（仅 magazine/classic 主题）',
    enDesc: 'Hide the sidebar in classic layouts (magazine/classic themes only)',
    css: '.classic-sidebar { display: none !important; } .classic-layout { grid-template-columns: 1fr; }' },
  { id: 'more-spacing', zh: '增大间距', en: 'More Spacing', category: 'layout', scope: 'both',
    zhDesc: '增大卡片和段落间距',
    enDesc: 'Increase card and paragraph spacing',
    css: '.featured-card, .card, .post-item { margin-bottom: 64px; } .grid-card { margin-bottom: 32px; } .post-content p { margin-bottom: 2em; }' },
  { id: 'full-hero', zh: '全宽英雄区', en: 'Full-width Hero', category: 'layout', scope: 'home',
    zhDesc: '英雄区占满全宽，视觉冲击力更强',
    enDesc: 'Make the hero section full width for a stronger impact',
    css: '.hero-section, .blog-hero { margin: 0 -40px; padding: 120px 60px; } .main-content, .blog-container { max-width: 100%; }' },
  { id: 'two-column', zh: '双栏布局', en: 'Two-column Layout', category: 'layout', scope: 'post',
    zhDesc: '文章内容双栏排版',
    enDesc: 'Lay out the post content in two columns',
    css: '@media (min-width: 900px) { .post-content { column-count: 2; column-gap: 40px; column-rule: 1px solid var(--border-color); } }' },
  { id: 'card-grid', zh: '卡片网格', en: 'Card Grid', category: 'layout', scope: 'home',
    zhDesc: '首页卡片使用更紧凑的网格布局',
    enDesc: 'Use a tighter grid layout for home page cards',
    css: '.grid-cards, .card-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; } .main-content { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }' },
  { id: 'timeline-layout', zh: '时间线布局', en: 'Timeline Layout', category: 'layout', scope: 'home',
    zhDesc: '文章列表以时间线形式展示',
    enDesc: 'Display the post list as a timeline',
    css: '.classic-card, .card, .post-item { position: relative; padding-left: 32px; border-left: 2px solid var(--accent-warm); margin-bottom: 24px; } .classic-card::before, .card::before, .post-item::before { content: ""; position: absolute; left: -6px; top: 20px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent-warm); }' },

  // ─── 效果 ────────────────────────
  { id: 'neon-glow', zh: '霓虹发光', en: 'Neon Glow', category: 'effects', scope: 'both',
    zhDesc: '链接和标签添加发光效果',
    enDesc: 'Add a glow effect to links and tags',
    css: 'a:hover { text-shadow: 0 0 8px currentColor; } .tag { box-shadow: 0 0 6px rgba(167,139,250,0.3); }' },
  { id: 'glass-nav', zh: '毛玻璃导航', en: 'Glass Navigation', category: 'effects', scope: 'both',
    zhDesc: '导航栏增强毛玻璃效果',
    enDesc: 'Enhance the frosted-glass effect on the navigation bar',
    css: '.site-header, .blog-header, .blog-nav, .nav-links { backdrop-filter: blur(32px) saturate(200%); -webkit-backdrop-filter: blur(32px) saturate(200%); background: rgba(10,10,15,0.5) !important; }' },
  { id: 'dark-overlay', zh: '暗色遮罩', en: 'Dark Overlay', category: 'effects', scope: 'home',
    zhDesc: '英雄区添加暗色渐变遮罩',
    enDesc: 'Add a dark gradient overlay to the hero section',
    css: '.hero-section, .blog-hero { background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3)); border-radius: 20px; padding: 60px 40px; } .hero-title, .hero-desc, .hero-description { color: #fff; }' },
  { id: 'color-border', zh: '卡片彩色边框', en: 'Colored Card Border', category: 'effects', scope: 'home',
    zhDesc: '卡片添加主题色边框',
    enDesc: 'Add a theme-colored border to cards',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { border: 2px solid var(--accent-warm); border-radius: 20px; }' },
  { id: 'gradient-bg', zh: '渐变背景', en: 'Gradient Background', category: 'effects', scope: 'both',
    zhDesc: '页面背景添加微妙的渐变色',
    enDesc: 'Add a subtle gradient to the page background',
    css: 'body { background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%); }' },
  { id: 'paper-texture', zh: '纸张纹理', en: 'Paper Texture', category: 'effects', scope: 'post',
    zhDesc: '内容区添加纸张质感背景',
    enDesc: 'Add a paper-like texture background to the content area',
    css: '.post-detail-wrapper, .post-detail, .post-content { background: #faf8f5; padding: 40px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px); }' },
  { id: 'frosted-card', zh: '磨砂卡片', en: 'Frosted Card', category: 'effects', scope: 'home',
    zhDesc: '卡片使用毛玻璃效果',
    enDesc: 'Apply a frosted-glass effect to cards',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }' },
  { id: 'deep-shadow', zh: '阴影深度', en: 'Deep Shadow', category: 'effects', scope: 'home',
    zhDesc: '卡片添加更深的阴影效果',
    enDesc: 'Add a deeper shadow effect to cards',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); } .featured-card:hover, .grid-card:hover, .card:hover, .post-item:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08); }' },

  // ─── 组件 ────────────────────────
  { id: 'rounded-tags', zh: '圆角标签', en: 'Rounded Tags', category: 'components', scope: 'both',
    zhDesc: '标签使用更圆润的样式',
    enDesc: 'Use a rounder style for tags',
    css: '.tag { border-radius: 12px; padding: 5px 14px; font-size: 0.8em; }' },
  { id: 'circle-avatar', zh: '圆形头像', en: 'Circle Avatar', category: 'components', scope: 'post',
    zhDesc: '作者头像使用圆形样式',
    enDesc: 'Use a circular style for author avatars',
    css: '.author-avatar, .about-avatar { border-radius: 50%; width: 48px; height: 48px; }' },
  { id: 'gradient-btn', zh: '渐变按钮', en: 'Gradient Button', category: 'components', scope: 'both',
    zhDesc: '按钮和返回链接使用渐变背景',
    enDesc: 'Use a gradient background for buttons and back links',
    css: '.featured-cta, .grid-cta, .back-link, .nav-link, .nav-links a { background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose)); color: #fff; border: none; padding: 10px 24px; border-radius: 24px; }' },
  { id: 'fancy-quote', zh: '美化引用块', en: 'Fancy Blockquote', category: 'components', scope: 'post',
    zhDesc: '引用块添加装饰性样式',
    enDesc: 'Add decorative styling to blockquotes',
    css: '.post-content blockquote { border-left: 4px solid var(--accent-warm); background: linear-gradient(135deg, var(--accent-light, rgba(231,76,60,0.08)), transparent); border-radius: 0 12px 12px 0; font-style: italic; }' },
  { id: 'dark-code', zh: '代码块暗色', en: 'Dark Code Block', category: 'components', scope: 'post',
    zhDesc: '代码块使用深色背景',
    enDesc: 'Use a dark background for code blocks',
    css: '.post-content pre { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; } .post-content code { color: #e2b3ff; }' },
  { id: 'beautify-table', zh: '表格美化', en: 'Beautify Table', category: 'components', scope: 'post',
    zhDesc: '表格添加斑马纹和圆角',
    enDesc: 'Add zebra striping and rounded corners to tables',
    css: '.post-content table { border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); } .post-content tr:nth-child(even) { background: var(--bg-secondary); } .post-content th { background: var(--accent-warm); color: #fff; font-weight: 600; } .post-content td, .post-content th { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }' },
  { id: 'divider-deco', zh: '分割线装饰', en: 'Decorative Divider', category: 'components', scope: 'post',
    zhDesc: '分割线使用装饰性样式',
    enDesc: 'Use a decorative style for dividers',
    css: '.post-content hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, var(--accent-warm), transparent); margin: 3em 0; } .post-content hr::after { content: "◆"; display: block; text-align: center; color: var(--accent-warm); margin-top: -10px; font-size: 12px; }' },
  { id: 'toc-sidebar', zh: '目录侧边栏', en: 'TOC Sidebar', category: 'components', scope: 'post',
    zhDesc: '目录固定在页面侧边',
    enDesc: 'Pin the table of contents to the page side',
    css: '@media (min-width: 1200px) { .post-toc { position: fixed; top: 100px; right: 40px; width: 200px; max-height: 60vh; overflow-y: auto; background: var(--bg-card); border-radius: 12px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); } }' },

  // ─── 动画 ────────────────────────
  { id: 'fade-scroll', zh: '淡入滚动', en: 'Fade-in on Scroll', category: 'animation', scope: 'home',
    zhDesc: '页面元素滚动时淡入显示',
    enDesc: 'Fade page elements in as they scroll into view',
    css: '@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .featured-card, .grid-card, .classic-card, .card, .post-item { animation: fadeInUp 0.6s ease both; }' },
  { id: 'float-breathe', zh: '悬浮呼吸', en: 'Floating Breathe', category: 'animation', scope: 'home',
    zhDesc: '卡片轻微上下浮动',
    enDesc: 'Cards gently float up and down',
    css: '@keyframes breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } } .featured-card:hover, .card:hover, .post-item:hover { animation: breathe 2s ease-in-out infinite; }' },
  { id: 'underline-anim', zh: '链接下划线动画', en: 'Link Underline Animation', category: 'animation', scope: 'both',
    zhDesc: '链接悬停时下划线从左滑入',
    enDesc: 'Underline slides in from the left on link hover',
    css: 'a { position: relative; } a::after { content: ""; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: var(--accent-warm); transition: width 0.3s ease; } a:hover::after { width: 100%; }' },
  { id: 'card-hover', zh: '卡片悬停放大', en: 'Card Hover Zoom', category: 'animation', scope: 'home',
    zhDesc: '卡片悬停时轻微放大',
    enDesc: 'Cards slightly scale up on hover',
    css: '.featured-card:hover, .card:hover, .post-item:hover { transform: scale(1.02); } .grid-card:hover { transform: scale(1.03); }' },
  { id: 'img-fadein', zh: '图片淡入', en: 'Image Fade-in', category: 'animation', scope: 'post',
    zhDesc: '图片加载时淡入显示',
    enDesc: 'Images fade in as they load',
    css: '@keyframes imgFadeIn { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } } .post-content img { animation: imgFadeIn 0.5s ease both; }' },
  { id: 'typewriter-title', zh: '标题打字机', en: 'Typewriter Title', category: 'animation', scope: 'post',
    zhDesc: '文章标题打字机效果',
    enDesc: 'Typewriter effect for post titles',
    css: '@keyframes typewriter { from { width: 0; } to { width: 100%; } } @keyframes blink { 50% { border-color: transparent; } } .post-header h1, .post-title { overflow: hidden; white-space: nowrap; border-right: 3px solid var(--accent-warm); animation: typewriter 2s steps(40) both, blink 0.8s step-end infinite; }' },

  // ─── 功能 ────────────────────────
  { id: 'no-decoration', zh: '去除装饰', en: 'Remove Decoration', category: 'utility', scope: 'both',
    zhDesc: '移除所有装饰性元素',
    enDesc: 'Remove all decorative elements',
    css: '.featured-deco, .deco-circle, .deco-diamond, .deco-dot, .post-header-deco, .ornament-line, .ornament-dot, .hero-seal, .footer-ornament, .footer-seal, .footer-end-mark { display: none !important; }' },
  { id: 'hide-date', zh: '隐藏日期', en: 'Hide Date', category: 'utility', scope: 'both',
    zhDesc: '隐藏文章发布日期',
    enDesc: 'Hide the post publish date',
    css: '.post-meta .meta-item:first-child, .minimal-date, .timeline-date, .card-date, .archive-item-date { display: none; }' },
  { id: 'selection-color', zh: '选中高亮色', en: 'Selection Color', category: 'utility', scope: 'both',
    zhDesc: '自定义文本选中时的颜色',
    enDesc: 'Customize the text selection color',
    css: '::selection { background: var(--accent-warm); color: #fff; } ::-moz-selection { background: var(--accent-warm); color: #fff; }' },
  { id: 'print-optimize', zh: '打印优化', en: 'Print Optimization', category: 'utility', scope: 'both',
    zhDesc: '优化打印输出样式',
    enDesc: 'Optimize styles for print output',
    css: '@media print { .site-header, .blog-header, .site-nav, .blog-nav, .nav-links, .site-footer, .blog-footer, .post-toc, .post-share, .back-link { display: none !important; } .post-content { font-size: 12pt; } body { background: #fff; color: #000; } }' },
  { id: 'hide-footer', zh: '隐藏页脚', en: 'Hide Footer', category: 'utility', scope: 'both',
    zhDesc: '隐藏页脚区域',
    enDesc: 'Hide the footer area',
    css: '.site-footer, .blog-footer { display: none !important; }' },
  { id: 'hide-tags', zh: '隐藏标签', en: 'Hide Tags', category: 'utility', scope: 'both',
    zhDesc: '隐藏文章标签',
    enDesc: 'Hide post tags',
    css: '.tag, .post-tags, .post-tags-section, .card-tags { display: none !important; }' },
  { id: 'hide-author', zh: '隐藏作者卡片', en: 'Hide Author Card', category: 'utility', scope: 'post',
    zhDesc: '隐藏文章底部的作者信息卡片',
    enDesc: 'Hide the author info card at the bottom of posts',
    css: '.author-card, .post-author, .post-author-card { display: none !important; }' },
  { id: 'auto-dark-code', zh: '暗色代码块自动', en: 'Auto Dark Code Block', category: 'utility', scope: 'post',
    zhDesc: '根据系统主题自动切换代码块样式',
    enDesc: 'Automatically switch code block styles based on system theme',
    css: '@media (prefers-color-scheme: dark) { .post-content pre { background: #1a1a2e; color: #e2b3ff; } }' },
]

interface CssPresetChipsProps {
  activeCategory: CssCategory
  onCategoryChange: (cat: CssCategory) => void
  customCss: string
  onApplyPreset: (css: string, applied: boolean) => void
  onHoverPreset: (css: string | null) => void
}

export function CssPresetChips({ activeCategory, onCategoryChange, customCss, onApplyPreset, onHoverPreset }: CssPresetChipsProps) {
  const tk = useThemeTokens()
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
  const catLabel = (key: 'catTheme' | 'catTypography' | 'catLayout' | 'catEffect' | 'catComponent' | 'catAnimation' | 'catUtility') => t.blogCss[key]
  const scopeLabel = (key: 'scopeHomePost' | 'scopeHomeOnly' | 'scopePostOnly') => t.blogCss[key]
  const filteredPresets = CSS_PRESETS.filter(p => p.category === activeCategory)

  const isPresetApplied = (preset: CssPreset) => customCss.includes(preset.css)

  return (
    <div>
      <SectionLabel>{t.blogCss.presetStyles}</SectionLabel>
      <div style={{
        display: 'flex', gap: 2, padding: 2,
        background: tk.surface,
        borderRadius: 8, border: `1px solid ${tk.border}`,
        marginBottom: 6,
      }}>
        {CSS_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key
          return (
            <button key={cat.key} onClick={() => onCategoryChange(cat.key)}
              title={catLabel(cat.labelKey)}
              style={{
                flex: 1, padding: '5px 0', border: 'none', borderRadius: 6,
                background: isActive ? tk.accentBg : 'transparent',
                color: isActive ? tk.accentText : tk.textMuted,
                cursor: 'pointer', fontSize: 10, fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 12 }}>{cat.icon}</span>
              <span style={{ fontSize: 8, letterSpacing: '0.04em' }}>{catLabel(cat.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* Scope legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        {SCOPE_LABELS.map(s => (
          <span key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 8.5, color: tk.textMuted, fontWeight: 500,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: s.color, flexShrink: 0,
            }} />
            {scopeLabel(s.labelKey)}
          </span>
        ))}
      </div>

      {/* Preset Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {filteredPresets.map(preset => {
          const applied = isPresetApplied(preset)
          const scopeInfo = SCOPE_LABELS.find(s => s.key === preset.scope)!
          const title = `${isZh ? preset.zhDesc : preset.enDesc}\n${t.blogCss.presetScopeTitle.replace('{scope}', scopeLabel(scopeInfo.labelKey))}`
          return (
            <span
              key={preset.id}
              title={title}
              style={{
                display: 'inline-flex', alignItems: 'center',
                position: 'relative',
              }}
            >
              <StudioChip
                label={isZh ? preset.zh : preset.en}
                onClick={() => onApplyPreset(preset.css, applied)}
                onMouseEnter={() => onHoverPreset(preset.css)}
                onMouseLeave={() => onHoverPreset(null)}
                variant={applied ? 'accent' : 'default'}
              />
              {/* 作用范围小圆点标记 */}
              <span
                style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 7, height: 7, borderRadius: '50%',
                  background: scopeInfo.color,
                  border: '1.5px solid ' + (tk.surface || '#fff'),
                  pointerEvents: 'none',
                  boxShadow: `0 0 4px ${scopeInfo.color}80`,
                }}
              />
            </span>
          )
        })}
      </div>
    </div>
  )
}
