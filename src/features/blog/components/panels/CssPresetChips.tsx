import { SectionLabel, StudioChip } from '../StudioControls'
import { useThemeTokens } from './themeTokens'

export type CssCategory = 'typography' | 'layout' | 'effects' | 'components' | 'animation' | 'utility' | 'theme'

// 作用范围：home=仅首页 | post=仅文章页 | both=首页和文章页都有效
export type CssScopeTarget = 'home' | 'post' | 'both'

export interface CssPreset {
  id: string
  label: string
  css: string
  description: string
  category: CssCategory
  scope: CssScopeTarget
}

// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const CSS_CATEGORIES: Array<{ key: CssCategory; label: string; icon: string }> = [
  { key: 'theme', label: '主题', icon: '🎨' },
  { key: 'typography', label: '排版', icon: 'Aa' },
  { key: 'layout', label: '布局', icon: '☐' },
  { key: 'effects', label: '效果', icon: '✦' },
  { key: 'components', label: '组件', icon: '◈' },
  { key: 'animation', label: '动画', icon: '↝' },
  { key: 'utility', label: '功能', icon: '⚙' },
]

// 作用范围标记配置
// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const SCOPE_LABELS: Array<{ key: CssScopeTarget; label: string; color: string }> = [
  { key: 'both', label: '首页+文章', color: '#34d399' },
  { key: 'home', label: '仅首页', color: '#38bdf8' },
  { key: 'post', label: '仅文章', color: '#fbbf24' },
]

// eslint-disable-next-line react-refresh/only-export-components -- 预设常量表与唯一消费组件同文件聚合，非跨组件共享
export const CSS_PRESETS: CssPreset[] = [
  // ─── 完整主题 ────────────────────────
  { id: 'theme-elegant', label: '优雅学术', category: 'theme', scope: 'post',
    description: '衬线字体 + 大行距 + 深色引用块 + 暖色强调',
    css: '.post-content, .post-content p { font-family: "Noto Serif SC", "Playfair Display", Georgia, serif; } .post-content { font-size: 1.1em; line-height: 2.2; } .post-content blockquote { border-left: 4px solid var(--accent-warm); background: rgba(0,0,0,0.15); border-radius: 0 12px 12px 0; font-style: italic; } .post-header h1, .post-title { color: var(--accent-warm); } :root { --max-width: 720px; }' },
  { id: 'theme-minimalist', label: '极简主义', category: 'theme', scope: 'both',
    description: '无边框 + 无阴影 + 紧凑间距 + 单色强调',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { border: none; box-shadow: none; border-radius: 0; } .tag { border: none; background: transparent; color: var(--text-muted); } .post-content { line-height: 1.8; } :root { --radius: 0px; --shadow-card: none; }' },
  { id: 'theme-magazine', label: '杂志风格', category: 'theme', scope: 'both',
    description: '大标题 + 分栏布局 + 图片圆角 + 醒目标签',
    css: '.post-header h1, .post-title { font-size: 2.8em; font-weight: 900; letter-spacing: -0.02em; } .grid-card img, .card img { border-radius: 16px; } .tag { background: var(--accent-warm); color: #fff; border-radius: 4px; font-weight: 700; font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.1em; } .post-content { column-count: 1; } @media (min-width: 900px) { .post-content { column-count: 2; column-gap: 40px; } }' },
  { id: 'theme-terminal', label: '终端风格', category: 'theme', scope: 'both',
    description: '等宽字体 + 深色背景 + 绿色强调 + 代码块无边框',
    css: '.post-content, .post-content p, .post-header h1, .post-header h2, .post-title { font-family: "Fira Code", "JetBrains Mono", "Consolas", monospace; } body { background: #0d1117 !important; color: #c9d1d9 !important; } .post-content a { color: #58a6ff; } :root { --accent-warm: #3fb950; --accent-cool: #58a6ff; } .post-content pre { background: #161b22 !important; border: none; border-radius: 0; } .tag { border-color: #3fb950; color: #3fb950; }' },
  { id: 'theme-warm', label: '暖色调', category: 'theme', scope: 'both',
    description: '暖色背景 + 圆角卡片 + 柔和阴影 + 橙色强调',
    css: ':root { --accent-warm: #f97316; --bg-primary: #fffbf5; --bg-secondary: #fef3e2; --bg-card: #fff8f0; --text-primary: #4a3728; --text-secondary: #7c6a5a; --border-color: #e8d5c0; --radius: 20px; --shadow-card: 0 4px 20px rgba(249,115,22,0.08); } body { background: var(--bg-primary); color: var(--text-primary); }' },
  { id: 'theme-cool', label: '冷色调', category: 'theme', scope: 'both',
    description: '冷色背景 + 直角卡片 + 锐利阴影 + 蓝色强调',
    css: ':root { --accent-warm: #3b82f6; --bg-primary: #f0f4f8; --bg-secondary: #e2e8f0; --bg-card: #f8fafc; --text-primary: #1e293b; --text-secondary: #475569; --border-color: #cbd5e1; --radius: 4px; --shadow-card: 0 2px 8px rgba(0,0,0,0.1); } body { background: var(--bg-primary); color: var(--text-primary); }' },
  { id: 'theme-reading', label: '阅读模式', category: 'theme', scope: 'both',
    description: '超大行距 + 窄屏居中 + 衬线字体 + 去除装饰',
    css: ':root { --max-width: 600px; } .post-content { font-family: "Noto Serif SC", Georgia, serif; font-size: 1.15em; line-height: 2.4; letter-spacing: 0.02em; } .featured-deco, .deco-circle, .deco-diamond, .deco-dot, .post-header-deco, .ornament-line, .ornament-dot, .hero-seal, .footer-ornament { display: none !important; } .post-content p { margin-bottom: 1.8em; }' },
  { id: 'theme-photo', label: '图片博客', category: 'theme', scope: 'both',
    description: '全宽图片 + 大圆角 + 悬浮放大 + 暗色遮罩',
    css: '.post-content img { width: 100%; border-radius: 16px; transition: transform 0.3s ease; } .post-content img:hover { transform: scale(1.02); } .grid-card img, .card img, .post-item img { border-radius: 16px; } .featured-card, .card, .post-item { border-radius: 24px; overflow: hidden; } .hero-section, .blog-hero { border-radius: 24px; } :root { --radius: 20px; }' },

  // ─── 排版 ────────────────────────
  { id: 'serif-body', label: '正文衬线', category: 'typography', scope: 'post',
    description: '正文切换为衬线字体，更优雅',
    css: '.post-content, .post-content p { font-family: "Noto Serif SC", "Playfair Display", Georgia, serif; }' },
  { id: 'larger-text', label: '加大字号', category: 'typography', scope: 'both',
    description: '增大正文字号和行高，更易阅读',
    css: '.post-content { font-size: 1.2em; line-height: 2.2; } .hero-desc, .hero-description, .post-excerpt { font-size: 1.3em; }' },
  { id: 'drop-cap', label: '首字下沉', category: 'typography', scope: 'post',
    description: '文章首字母放大装饰',
    css: '.post-content p:first-of-type::first-letter { font-size: 3.5em; float: left; line-height: 0.8; margin: 6px 12px 0 0; font-weight: 900; }' },
  { id: 'gradient-title', label: '标题渐变色', category: 'typography', scope: 'post',
    description: '文章标题使用渐变色文字',
    css: '.post-header h1, .post-title { background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose), var(--accent-violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }' },
  { id: 'compact-line', label: '紧凑行距', category: 'typography', scope: 'post',
    description: '缩小行距，信息密度更高',
    css: '.post-content { line-height: 1.6; } .post-content p { margin-bottom: 0.8em; }' },
  { id: 'small-compact', label: '小号紧凑', category: 'typography', scope: 'post',
    description: '小字号紧凑排版，信息密度极高',
    css: '.post-content { font-size: 0.9em; line-height: 1.5; } .post-content p { margin-bottom: 0.6em; } .post-content h2 { font-size: 1.3em; } .post-content h3 { font-size: 1.1em; }' },
  { id: 'center-title', label: '标题居中', category: 'typography', scope: 'post',
    description: '文章标题和元信息居中对齐',
    css: '.post-header { text-align: center; } .post-header h1, .post-title { text-align: center; } .post-meta { justify-content: center; }' },
  { id: 'cn-optimize', label: '中文优化', category: 'typography', scope: 'post',
    description: '针对中文排版的优化设置',
    css: '.post-content { font-family: "Noto Serif SC", "Source Han Serif CN", serif; letter-spacing: 0.05em; line-height: 2; text-align: justify; } .post-content p { text-indent: 2em; }' },
  { id: 'en-optimize', label: '英文优化', category: 'typography', scope: 'post',
    description: '针对英文排版的优化设置',
    css: '.post-content { font-family: "Merriweather", "Georgia", serif; letter-spacing: 0.01em; line-height: 1.9; hanging-punctuation: first; } .post-content p { orphans: 3; widows: 3; }' },

  // ─── 布局 ────────────────────────
  { id: 'wide-layout', label: '宽屏布局', category: 'layout', scope: 'both',
    description: '内容区域扩展到 1200px',
    css: ':root { --max-width: 1200px; } .main-content, .post-detail-wrapper, .blog-container, .post-detail { max-width: 1200px; }' },
  { id: 'narrow-center', label: '窄屏居中', category: 'layout', scope: 'both',
    description: '内容区域缩窄到 640px，更聚焦',
    css: ':root { --max-width: 640px; } .main-content, .post-detail-wrapper, .blog-container, .post-detail { max-width: 640px; }' },
  { id: 'hide-sidebar', label: '隐藏侧边栏', category: 'layout', scope: 'home',
    description: '隐藏经典布局的侧边栏（仅 magazine/classic 主题）',
    css: '.classic-sidebar { display: none !important; } .classic-layout { grid-template-columns: 1fr; }' },
  { id: 'more-spacing', label: '增大间距', category: 'layout', scope: 'both',
    description: '增大卡片和段落间距',
    css: '.featured-card, .card, .post-item { margin-bottom: 64px; } .grid-card { margin-bottom: 32px; } .post-content p { margin-bottom: 2em; }' },
  { id: 'full-hero', label: '全宽英雄区', category: 'layout', scope: 'home',
    description: '英雄区占满全宽，视觉冲击力更强',
    css: '.hero-section, .blog-hero { margin: 0 -40px; padding: 120px 60px; } .main-content, .blog-container { max-width: 100%; }' },
  { id: 'two-column', label: '双栏布局', category: 'layout', scope: 'post',
    description: '文章内容双栏排版',
    css: '@media (min-width: 900px) { .post-content { column-count: 2; column-gap: 40px; column-rule: 1px solid var(--border-color); } }' },
  { id: 'card-grid', label: '卡片网格', category: 'layout', scope: 'home',
    description: '首页卡片使用更紧凑的网格布局',
    css: '.grid-cards, .card-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; } .main-content { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }' },
  { id: 'timeline-layout', label: '时间线布局', category: 'layout', scope: 'home',
    description: '文章列表以时间线形式展示',
    css: '.classic-card, .card, .post-item { position: relative; padding-left: 32px; border-left: 2px solid var(--accent-warm); margin-bottom: 24px; } .classic-card::before, .card::before, .post-item::before { content: ""; position: absolute; left: -6px; top: 20px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent-warm); }' },

  // ─── 效果 ────────────────────────
  { id: 'neon-glow', label: '霓虹发光', category: 'effects', scope: 'both',
    description: '链接和标签添加发光效果',
    css: 'a:hover { text-shadow: 0 0 8px currentColor; } .tag { box-shadow: 0 0 6px rgba(167,139,250,0.3); }' },
  { id: 'glass-nav', label: '毛玻璃导航', category: 'effects', scope: 'both',
    description: '导航栏增强毛玻璃效果',
    css: '.site-header, .blog-header, .blog-nav, .nav-links { backdrop-filter: blur(32px) saturate(200%); -webkit-backdrop-filter: blur(32px) saturate(200%); background: rgba(10,10,15,0.5) !important; }' },
  { id: 'dark-overlay', label: '暗色遮罩', category: 'effects', scope: 'home',
    description: '英雄区添加暗色渐变遮罩',
    css: '.hero-section, .blog-hero { background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3)); border-radius: 20px; padding: 60px 40px; } .hero-title, .hero-desc, .hero-description { color: #fff; }' },
  { id: 'color-border', label: '卡片彩色边框', category: 'effects', scope: 'home',
    description: '卡片添加主题色边框',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { border: 2px solid var(--accent-warm); border-radius: 20px; }' },
  { id: 'gradient-bg', label: '渐变背景', category: 'effects', scope: 'both',
    description: '页面背景添加微妙的渐变色',
    css: 'body { background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%); }' },
  { id: 'paper-texture', label: '纸张纹理', category: 'effects', scope: 'post',
    description: '内容区添加纸张质感背景',
    css: '.post-detail-wrapper, .post-detail, .post-content { background: #faf8f5; padding: 40px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px); }' },
  { id: 'frosted-card', label: '磨砂卡片', category: 'effects', scope: 'home',
    description: '卡片使用毛玻璃效果',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }' },
  { id: 'deep-shadow', label: '阴影深度', category: 'effects', scope: 'home',
    description: '卡片添加更深的阴影效果',
    css: '.featured-card, .grid-card, .classic-card, .card, .post-item { box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); } .featured-card:hover, .grid-card:hover, .card:hover, .post-item:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08); }' },

  // ─── 组件 ────────────────────────
  { id: 'rounded-tags', label: '圆角标签', category: 'components', scope: 'both',
    description: '标签使用更圆润的样式',
    css: '.tag { border-radius: 12px; padding: 5px 14px; font-size: 0.8em; }' },
  { id: 'circle-avatar', label: '圆形头像', category: 'components', scope: 'post',
    description: '作者头像使用圆形样式',
    css: '.author-avatar, .about-avatar { border-radius: 50%; width: 48px; height: 48px; }' },
  { id: 'gradient-btn', label: '渐变按钮', category: 'components', scope: 'both',
    description: '按钮和返回链接使用渐变背景',
    css: '.featured-cta, .grid-cta, .back-link, .nav-link, .nav-links a { background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose)); color: #fff; border: none; padding: 10px 24px; border-radius: 24px; }' },
  { id: 'fancy-quote', label: '美化引用块', category: 'components', scope: 'post',
    description: '引用块添加装饰性样式',
    css: '.post-content blockquote { border-left: 4px solid var(--accent-warm); background: linear-gradient(135deg, var(--accent-light, rgba(231,76,60,0.08)), transparent); border-radius: 0 12px 12px 0; font-style: italic; }' },
  { id: 'dark-code', label: '代码块暗色', category: 'components', scope: 'post',
    description: '代码块使用深色背景',
    css: '.post-content pre { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; } .post-content code { color: #e2b3ff; }' },
  { id: 'beautify-table', label: '表格美化', category: 'components', scope: 'post',
    description: '表格添加斑马纹和圆角',
    css: '.post-content table { border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); } .post-content tr:nth-child(even) { background: var(--bg-secondary); } .post-content th { background: var(--accent-warm); color: #fff; font-weight: 600; } .post-content td, .post-content th { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }' },
  { id: 'divider-deco', label: '分割线装饰', category: 'components', scope: 'post',
    description: '分割线使用装饰性样式',
    css: '.post-content hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, var(--accent-warm), transparent); margin: 3em 0; } .post-content hr::after { content: "◆"; display: block; text-align: center; color: var(--accent-warm); margin-top: -10px; font-size: 12px; }' },
  { id: 'toc-sidebar', label: '目录侧边栏', category: 'components', scope: 'post',
    description: '目录固定在页面侧边',
    css: '@media (min-width: 1200px) { .post-toc { position: fixed; top: 100px; right: 40px; width: 200px; max-height: 60vh; overflow-y: auto; background: var(--bg-card); border-radius: 12px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); } }' },

  // ─── 动画 ────────────────────────
  { id: 'fade-scroll', label: '淡入滚动', category: 'animation', scope: 'home',
    description: '页面元素滚动时淡入显示',
    css: '@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .featured-card, .grid-card, .classic-card, .card, .post-item { animation: fadeInUp 0.6s ease both; }' },
  { id: 'float-breathe', label: '悬浮呼吸', category: 'animation', scope: 'home',
    description: '卡片轻微上下浮动',
    css: '@keyframes breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } } .featured-card:hover, .card:hover, .post-item:hover { animation: breathe 2s ease-in-out infinite; }' },
  { id: 'underline-anim', label: '链接下划线动画', category: 'animation', scope: 'both',
    description: '链接悬停时下划线从左滑入',
    css: 'a { position: relative; } a::after { content: ""; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: var(--accent-warm); transition: width 0.3s ease; } a:hover::after { width: 100%; }' },
  { id: 'card-hover', label: '卡片悬停放大', category: 'animation', scope: 'home',
    description: '卡片悬停时轻微放大',
    css: '.featured-card:hover, .card:hover, .post-item:hover { transform: scale(1.02); } .grid-card:hover { transform: scale(1.03); }' },
  { id: 'img-fadein', label: '图片淡入', category: 'animation', scope: 'post',
    description: '图片加载时淡入显示',
    css: '@keyframes imgFadeIn { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } } .post-content img { animation: imgFadeIn 0.5s ease both; }' },
  { id: 'typewriter-title', label: '标题打字机', category: 'animation', scope: 'post',
    description: '文章标题打字机效果',
    css: '@keyframes typewriter { from { width: 0; } to { width: 100%; } } @keyframes blink { 50% { border-color: transparent; } } .post-header h1, .post-title { overflow: hidden; white-space: nowrap; border-right: 3px solid var(--accent-warm); animation: typewriter 2s steps(40) both, blink 0.8s step-end infinite; }' },

  // ─── 功能 ────────────────────────
  { id: 'no-decoration', label: '去除装饰', category: 'utility', scope: 'both',
    description: '移除所有装饰性元素',
    css: '.featured-deco, .deco-circle, .deco-diamond, .deco-dot, .post-header-deco, .ornament-line, .ornament-dot, .hero-seal, .footer-ornament, .footer-seal, .footer-end-mark { display: none !important; }' },
  { id: 'hide-date', label: '隐藏日期', category: 'utility', scope: 'both',
    description: '隐藏文章发布日期',
    css: '.post-meta .meta-item:first-child, .minimal-date, .timeline-date, .card-date, .archive-item-date { display: none; }' },
  { id: 'selection-color', label: '选中高亮色', category: 'utility', scope: 'both',
    description: '自定义文本选中时的颜色',
    css: '::selection { background: var(--accent-warm); color: #fff; } ::-moz-selection { background: var(--accent-warm); color: #fff; }' },
  { id: 'print-optimize', label: '打印优化', category: 'utility', scope: 'both',
    description: '优化打印输出样式',
    css: '@media print { .site-header, .blog-header, .site-nav, .blog-nav, .nav-links, .site-footer, .blog-footer, .post-toc, .post-share, .back-link { display: none !important; } .post-content { font-size: 12pt; } body { background: #fff; color: #000; } }' },
  { id: 'hide-footer', label: '隐藏页脚', category: 'utility', scope: 'both',
    description: '隐藏页脚区域',
    css: '.site-footer, .blog-footer { display: none !important; }' },
  { id: 'hide-tags', label: '隐藏标签', category: 'utility', scope: 'both',
    description: '隐藏文章标签',
    css: '.tag, .post-tags, .post-tags-section, .card-tags { display: none !important; }' },
  { id: 'hide-author', label: '隐藏作者卡片', category: 'utility', scope: 'post',
    description: '隐藏文章底部的作者信息卡片',
    css: '.author-card, .post-author, .post-author-card { display: none !important; }' },
  { id: 'auto-dark-code', label: '暗色代码块自动', category: 'utility', scope: 'post',
    description: '根据系统主题自动切换代码块样式',
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
  const filteredPresets = CSS_PRESETS.filter(p => p.category === activeCategory)

  const isPresetApplied = (preset: CssPreset) => customCss.includes(preset.css)

  return (
    <div>
      <SectionLabel>预设样式</SectionLabel>
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
              title={cat.label}
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
              <span style={{ fontSize: 8, letterSpacing: '0.04em' }}>{cat.label}</span>
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
            {s.label}
          </span>
        ))}
      </div>

      {/* Preset Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {filteredPresets.map(preset => {
          const applied = isPresetApplied(preset)
          const scopeInfo = SCOPE_LABELS.find(s => s.key === preset.scope)!
          const title = `${preset.description}\n作用范围：${scopeInfo.label}`
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
                label={preset.label}
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
