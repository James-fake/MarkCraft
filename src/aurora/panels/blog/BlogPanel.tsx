import { useState, useMemo, useRef, useLayoutEffect, useCallback, useEffect, type ReactNode, type PointerEvent as ReactPointerEvent, type Dispatch, type SetStateAction } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import type { IconName } from '../../types'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useSwipeTabs } from '../../hooks/useSwipeTabs'
import { useFileManager } from '@stores/FileStore'
import { useSettings } from '@stores/SettingsStore'
import { findNode, collectMarkdownFiles } from '@features/fileManager/fileManagerUtils'
import { loadKb, getKbFiles } from '@stores/kbStore'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'
import {
  COLOR_SCHEMES as REAL_COLOR_SCHEMES,
  THEME_INFO_LIST,
  THEME_CATEGORIES as REAL_THEME_CATEGORIES,
  THEME_STYLE_TAGS as REAL_THEME_STYLE_TAGS,
  FEATURED_THEMES,
  useBlogGenerator,
  DEFAULT_DESIGN_CONFIG,
} from '@features/blog/hooks/useBlogGenerator'
import type { BlogGenerationResult } from '@features/blog/utils/blogMultiFileGenerator'
import { generateSingleFileBlog } from '@features/blog'
import type { BlogConfig as RealBlogConfig, ThemeStyle } from '@features/blog'
import { CssEditor } from '@features/blog/components/panels/CssEditor'
import { CssSnippets } from '@features/blog/components/panels/CssSnippets'
import { VisualCssEditor } from '@features/blog/components/panels/VisualCssEditor'
import DeployPanel from '@features/blog/components/DeployPanel'
// 真实 DeployPanel 声明了 t prop 但实现中不使用（仅解构 result）；此处窄化 props 类型，避免调用处传翻译对象
const RealDeployPanel = DeployPanel as unknown as React.ComponentType<{ result: BlogGenerationResult }>
import type { RefObject } from 'react'
import '../../styles/panels/blog.css'
// —— 字数统计：复用真实 features/editor/stats 单一数据源（D4，不维护平行实现）——
import { countWords } from '@features/editor/stats'

/**
 * Aurora 博客工作室面板（Phase 2 换芯 · 接真实 BlogStudio 数据）
 *
 * 保留 Aurora `PageFrame` 外壳布局与视觉；顶部 6 个平级面板折叠为
 * 3 个分组 tab（主题/数据/高级）+ 组内次级 segmented（P1-5 信息架构，
 * 6 个子面板功能不变）；数据层替换为真实来源（禁增铁律 / D4 单一数据源）：
 * - 文档列表：遍历 `useFileManager().rootFolder` 收集全部 .md 文件（标题 + 字数为真实派生），
 *   替代写死的 MOCK_DOCS；「包含/排除」为面板本地 estado（对齐真实 excludedFiles Set）。
 * - 配色 / 主题市场：直接复用真实 BlogStudio 的 COLOR_SCHEMES / THEME_INFO_LIST / THEME_CATEGORIES /
 *   THEME_STYLE_TAGS（单一数据源，禁漂移），不再维护平行 mock 目录。
 * - 友链 / 系列文章：起始为空（对齐真实 DEFAULT_DESIGN_CONFIG.friendLinks/seriesConfig 默认空），
 *   由用户在「功能」面板添加，移除写死的 MOCK_FRIENDS / MOCK_SERIES。
 * - 站点配置 BlogConfig：为工作室本地工作态（同真实每次打开重置为默认），主题键/配色键对齐真实枚举。
 */

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

function collectMdFiles(node: FileNode): BlogDoc[] {
  return collectMarkdownFiles(node).map(toBlogDoc)
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
 * 复用控件（Aurora token 化，不使用 features 的 StudioControls）
 * ========================================================== */
function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="aurora-blog-section">{children}</div>
}

function StudioInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="aurora-blog-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function StudioTextarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      className="aurora-blog-textarea"
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function StudioSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <AuroraSelect value={value} onChange={onChange} options={options} />
}

function StudioToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`aurora-blog-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="aurora-blog-toggle__dot" />
    </button>
  )
}

function StudioChip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`aurora-blog-chip ${active ? 'is-active' : ''}`} onClick={onClick}>{children}</button>
  )
}

function StudioButton({ children, variant = 'secondary', onClick }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void }) {
  return (
    <button type="button" className={`aurora-blog-btn aurora-blog-btn--${variant}`} onClick={onClick}>{children}</button>
  )
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

/* ============================================================
 * 面板：样式（含主题市场子组件）
 * ========================================================== */
function StylePanel({ cfg, setCfg, panelOpen }: { cfg: BlogConfig; setCfg: (p: Partial<BlogConfig>) => void; panelOpen: boolean }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  // 风格筛选改为滚轮鼓单选（与设置页 AuroraSelect 同一套交互）；'' = 全部
  const [tag, setTag] = useState('')
  const [fav, setFav] = useState<Record<string, boolean>>({ magazine: true, minimal: true })
  const theme = THEME_MARKET.find((t) => t.key === cfg.themeKey)

  // 搜索框显隐：**用户把列表滚回顶端才显示**（语义链打磨定稿：刚进入面板即使列表在顶端
  // 也收起——「显示」必须由用户的回顶动作触发；中途上滑不出现；离开顶端收起）。
  // 判据 = 顶端吸附 + hasLeftTop 标志：
  // ① scrollTop > HIDE(12px) 时置 hasLeftTop=true（真正离开过顶端；2~12 滞回带内微滚不算）；
  // ② 收起态下 scrollTop ≤ SHOW(2px) 且 hasLeftTop → 显示；可见态下 > HIDE → 收起；
  //    2~12 之间维持原状（滞回防边界抖动）。
  // 常驻 DOM + is-hidden 平滑折叠（绝不条件渲染：挂载/卸载会令滚动区高度跳变引发闪烁）；
  // 已输入查询时保持可见。
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const searchVisibleRef = useRef(false)
  const hasLeftTopRef = useRef(false)
  // 展开锚定（双跑）：每次面板展开时滚动归顶端 + 重置为「未离开过顶端」的收起初始态。
  // 跑两次的原因：浮层飞入动画（--mc-dur-slow 320ms 级）期间的滚轮/布局瞬变可能产生伪滚动
  // 把 hasLeftTop 置位——第二次锚定在 SEARCH_SETTLE_MS（盖过动画）后清除动画期积累的伪状态。
  useEffect(() => {
    if (!panelOpen) return
    const anchor = () => {
      const scroller = scrollRef.current
      if (scroller) scroller.scrollTop = 0
      hasLeftTopRef.current = false
      searchVisibleRef.current = false
      setSearchVisible(false)
    }
    anchor()
    const timer = window.setTimeout(anchor, SEARCH_SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [panelOpen])

  // 卡片 tag 显示名：与真层 ThemePanel.getTagLabel 同一映射（key→zh，找不到回退原 key）。
  // 2026-09-14 前卡片直接渲染英文 key（academic/fullwidth…），与筛选行的中文 chip 割裂。
  const tagLabel = (tg: string) => THEME_STYLE_TAGS.find((t) => t.value === tg)?.label ?? tg
  const filtered = THEME_MARKET
    .filter((t) => cat === 'all' || t.category === cat)
    .filter((t) => !tag || t.tags.includes(tag))
    .filter((t) => !query || t.nameEn.toLowerCase().includes(query.toLowerCase()) || t.nameZh.includes(query))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn))

  return (
    <div className="aurora-blog-market">
      {/* 搜索框：滚动容器外的兄弟节点（FileTree 同构），常驻 DOM 靠 is-hidden 平滑折叠 */}
      <div className={`aurora-blog-search ${searchVisible || query.trim() ? '' : 'is-hidden'}`}>
        <Icon.search size={14} />
        <input
          value={query}
          placeholder="搜索主题…"
          tabIndex={searchVisible || query.trim() ? 0 : -1}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        ref={scrollRef}
        className="aurora-blog-panel__scroll"
        onScroll={() => {
          const scroller = scrollRef.current
          if (!scroller) return
          const st = scroller.scrollTop
          // 正在输入：不打扰（查询非空时搜索框保持可见）
          if (query.trim()) return
          // 真正离开过顶端（越过 HIDE）才允许「回顶显示」，刚进入的初始顶端不算
          if (st > SEARCH_TOP_HIDE) hasLeftTopRef.current = true
          const next = searchVisibleRef.current ? st <= SEARCH_TOP_HIDE : st <= SEARCH_TOP_SHOW && hasLeftTopRef.current
          if (next !== searchVisibleRef.current) {
            searchVisibleRef.current = next
            setSearchVisible(next)
          }
        }}
      >
      <SectionLabel>主题市场</SectionLabel>
      <div className="aurora-blog-tabs">
        <span className="aurora-blog-chipgroup__label">分类</span>
        <AuroraSelect value={cat} options={THEME_CATEGORIES} onChange={setCat} placeholder="全部" ariaLabel="按分类筛选主题" />
      </div>
      <div className="aurora-blog-tags">
        <span className="aurora-blog-chipgroup__label">风格</span>
        <AuroraSelect value={tag} options={THEME_STYLE_FILTER_OPTIONS} onChange={setTag} placeholder="全部" ariaLabel="按风格筛选主题" />
      </div>
      <div className="aurora-blog-theme-grid">
        {filtered.map((t) => (
          <div
            key={t.key}
            className={`aurora-blog-theme ${cfg.themeKey === t.key ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            title={t.desc}
            onClick={() => setCfg({ themeKey: t.key })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setCfg({ themeKey: t.key })
              }
            }}
          >
            <div className="aurora-blog-theme__cover" style={{ background: t.gradient }}>
              <button className={`aurora-blog-theme__fav ${fav[t.key] ? 'is-on' : ''}`} onClick={(e) => { e.stopPropagation(); setFav((p) => ({ ...p, [t.key]: !p[t.key] })) }}>
                <Icon.star size={13} />
              </button>
              {cfg.themeKey === t.key && <span className="aurora-blog-theme__check"><Icon.check size={13} /></span>}
            </div>
            <div className="aurora-blog-theme__name"><b>{t.nameZh}</b><span>{t.nameEn}</span></div>
            <div className="aurora-blog-theme__desc">{t.desc}</div>
            <div className="aurora-blog-theme__tags">
              {t.tags.map((tg) => <em key={tg}>{tagLabel(tg)}</em>)}
              {t.featured && <em className="is-featured">精选</em>}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>主题模式</SectionLabel>
      <div className="aurora-blog-seg">
        {(['light', 'dark'] as const).map((m) => (
          <button key={m} className={`aurora-blog-seg__btn ${cfg.theme === m ? 'is-active' : ''}`} onClick={() => setCfg({ theme: m })}>
            {m === 'light' ? '浅色' : '深色'}
          </button>
        ))}
      </div>
      <div className="aurora-blog-current">
        当前主题：<b>{theme?.nameZh}</b> · {theme?.nameEn}
        <span className="aurora-blog-current__grad" style={{ background: theme?.gradient }} />
      </div>
      </div>
    </div>
  )
}
/* ============================================================
 * 面板：配色
 * ========================================================== */
function ColorPanel({ cfg, setCfg }: { cfg: BlogConfig; setCfg: (p: Partial<BlogConfig>) => void }) {
  const hex = COLOR_SCHEMES.find((c) => c.key === cfg.colorScheme)?.hex ?? '#6366f1'
  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>配色方案</SectionLabel>
      <div className="aurora-blog-colors">
        {COLOR_SCHEMES.map((c) => (
          <button key={c.key} className={`aurora-blog-color ${cfg.colorScheme === c.key ? 'is-active' : ''}`} onClick={() => setCfg({ colorScheme: c.key })} title={c.label}>
            <span style={{ background: c.hex }} />
            {cfg.colorScheme === c.key && <Icon.check size={13} />}
          </button>
        ))}
        <button className="aurora-blog-color aurora-blog-color--custom" title="自定义"><span style={{ background: 'conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#ef4444)' }} /></button>
      </div>

      <SectionLabel>预览</SectionLabel>
      <div className="aurora-blog-color-preview" style={{ background: `linear-gradient(135deg, ${hex}, ${hex}66)` }}>
        <div className="aurora-blog-color-preview__name">{COLOR_SCHEMES.find((c) => c.key === cfg.colorScheme)?.label}</div>
        <div className="aurora-blog-color-preview__dots">
          <span style={{ background: hex }} /><span style={{ background: `${hex}99` }} /><span style={{ background: `${hex}55` }} />
        </div>
      </div>

      <SectionLabel>字体</SectionLabel>
      <div className="aurora-blog-seg">
        {([{ v: 'serif', l: '衬线' }, { v: 'sans', l: '无衬线' }, { v: 'mono', l: '等宽' }] as const).map((f) => (
          <button key={f.v} className={`aurora-blog-seg__btn ${cfg.font === f.v ? 'is-active' : ''}`} onClick={() => setCfg({ font: f.v })}>{f.l}</button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
 * 面板：内容
 * ========================================================== */
function ContentPanel({ cfg, setCfg, docs, onToggleDoc, onSetAll, emptyHint, onOpenSource }: {
  cfg: BlogConfig
  setCfg: (p: Partial<BlogConfig>) => void
  docs: BlogDoc[]
  onToggleDoc: (id: string) => void
  onSetAll: (v: boolean) => void
  emptyHint?: string
  onOpenSource?: (id: string) => void
}) {
  const allOn = docs.every((d) => d.included)
  const totalWords = docs.filter((d) => d.included).reduce((s, d) => s + d.words, 0)

  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>站点信息</SectionLabel>
      <label className="aurora-blog-field"><span>站点标题</span><StudioInput value={cfg.siteTitle} onChange={(v) => setCfg({ siteTitle: v })} /></label>
      <label className="aurora-blog-field"><span>站点描述</span><StudioTextarea value={cfg.siteDescription} onChange={(v) => setCfg({ siteDescription: v })} /></label>
      <div className="aurora-blog-row2">
        <label className="aurora-blog-field"><span>作者</span><StudioInput value={cfg.author} onChange={(v) => setCfg({ author: v })} /></label>
        <label className="aurora-blog-field"><span>语言</span>
          <StudioSelect value={cfg.language} onChange={(v) => setCfg({ language: v })} options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }, { value: 'ja', label: '日本語' }]} />
        </label>
      </div>

      <SectionLabel>文档列表 <em>{docs.filter((d) => d.included).length}/{docs.length}</em></SectionLabel>
      <div className="aurora-blog-doc-actions">
        <StudioChip active={allOn} onClick={() => onSetAll(true)}>全选</StudioChip>
        <StudioChip active={!allOn} onClick={() => onSetAll(false)}>全不选</StudioChip>
      </div>
      <div className="aurora-blog-doc-list">
        {docs.length === 0 && emptyHint ? (
          <div className="aurora-blog-doc-empty">{emptyHint}</div>
        ) : docs.length === 0 ? (
          <div className="aurora-blog-doc-empty aurora-blog-doc-empty--muted">文件库中未发现任何 .md 文档</div>
        ) : docs.map((d) => (
          <label key={d.id} data-file-id={d.id} className={`aurora-blog-doc ${d.included ? 'is-on' : ''}`}>
            <input type="checkbox" checked={d.included} onChange={() => onToggleDoc(d.id)} />
            <span className="aurora-blog-doc__title">{d.title}</span>
            <span className="aurora-blog-doc__words">{d.words} 字</span>
            {onOpenSource && (
              <button
                type="button"
                className="aurora-blog-doc__open"
                title="在编辑器中打开源文件"
                onClick={(e) => { e.preventDefault(); onOpenSource(d.id) }}
              >
                <Icon.edit size={13} />
              </button>
            )}
          </label>
        ))}
      </div>
      <div className="aurora-blog-stat-inline">将发布 <b>{totalWords.toLocaleString()}</b> 字 · {docs.filter((d) => d.included).length} 篇</div>
    </div>
  )
}

/* ============================================================
 * 面板：功能（对齐 FeaturesPanel 实际功能）
 * ========================================================== */
function FeaturesPanel({ cfg, setCfg, toast, friends, setFriends, series, setSeries }: {
  cfg: BlogConfig
  setCfg: (p: Partial<BlogConfig>) => void
  toast: (m: string) => void
  friends: BlogFriend[]
  setFriends: Dispatch<SetStateAction<BlogFriend[]>>
  series: BlogSeries[]
  setSeries: Dispatch<SetStateAction<BlogSeries[]>>
}) {
  const setF = (p: Partial<BlogConfig>) => setCfg(p)

  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>文章功能</SectionLabel>
      <div className="aurora-blog-feature-chips">
        <button className={`aurora-blog-fchip ${cfg.enableViews ? 'is-on' : ''}`} onClick={() => setF({ enableViews: !cfg.enableViews })}><Icon.eye size={15} /> 阅读量</button>
        <button className={`aurora-blog-fchip ${cfg.enableLikes ? 'is-on' : ''}`} onClick={() => setF({ enableLikes: !cfg.enableLikes })}><Icon.heart size={15} /> 点赞</button>
        <button className={`aurora-blog-fchip ${cfg.enablePwa ? 'is-on' : ''}`} onClick={() => setF({ enablePwa: !cfg.enablePwa })}><Icon.mobile size={15} /> PWA</button>
      </div>

      <SectionLabel>打赏 <StudioToggle checked={cfg.enableReward} onChange={(v) => setF({ enableReward: v })} /></SectionLabel>
      {cfg.enableReward && (
        <div className="aurora-blog-row2">
          <label className="aurora-blog-field"><span>微信二维码</span><StudioInput value={cfg.rewardWechat} onChange={(v) => setF({ rewardWechat: v })} placeholder="图片 URL" /></label>
          <label className="aurora-blog-field"><span>支付宝二维码</span><StudioInput value={cfg.rewardAlipay} onChange={(v) => setF({ rewardAlipay: v })} placeholder="图片 URL" /></label>
        </div>
      )}

      <SectionLabel>关于页</SectionLabel>
      <label className="aurora-blog-field"><span>简介</span><StudioTextarea value={cfg.aboutBio} onChange={(v) => setF({ aboutBio: v })} rows={2} /></label>
      <label className="aurora-blog-field"><span>技能标签</span><StudioInput value={cfg.aboutSkills} onChange={(v) => setF({ aboutSkills: v })} placeholder="逗号分隔" /></label>

      <SectionLabel>友链 <em>{friends.length}</em></SectionLabel>
      <div className="aurora-blog-list">
        {friends.map((f) => (
          <div key={f.id} className="aurora-blog-list-item">
            <Icon.link size={14} />
            <div className="aurora-blog-list-item__body"><b>{f.name}</b><span>{f.url}</span></div>
            <button className="aurora-blog-icon-btn" onClick={() => setFriends((p) => p.filter((x) => x.id !== f.id))}><Icon.trash size={14} /></button>
          </div>
        ))}
        <button className="aurora-blog-add" onClick={() => { setFriends((p) => [...p, { id: `f${Date.now()}`, name: '新友链', url: 'https://' }]); toast?.('已添加友链') }}><Icon.plus size={14} /> 添加友链</button>
      </div>

      <SectionLabel>系列文章 <em>{series.length}</em></SectionLabel>
      <div className="aurora-blog-list">
        {series.map((s) => (
          <div key={s.id} className="aurora-blog-list-item">
            <Icon.bookmark size={14} />
            <div className="aurora-blog-list-item__body"><b>{s.name}</b><span>{s.count} 篇</span></div>
            <button className="aurora-blog-icon-btn" onClick={() => setSeries((p) => p.filter((x) => x.id !== s.id))}><Icon.trash size={14} /></button>
          </div>
        ))}
        <button className="aurora-blog-add" onClick={() => { setSeries((p) => [...p, { id: `s${Date.now()}`, name: '新系列', count: 0 }]); toast?.('已添加系列') }}><Icon.plus size={14} /> 添加系列</button>
      </div>

      <SectionLabel>配置</SectionLabel>
      <div className="aurora-blog-row2">
        <StudioButton variant="secondary" onClick={() => toast?.('已导出配置 JSON')}><Icon.download size={14} /> 导出</StudioButton>
        <StudioButton variant="ghost" onClick={() => toast?.('已导入配置')}><Icon.upload size={14} /> 导入</StudioButton>
      </div>
    </div>
  )
}

/* ============================================================
 * 面板：CSS（P0 · 1.2：组合真实 VisualCssEditor / CssEditor / CssSnippets）
 * 历史栈镜像真实 CssPanel（按 亮色/暗色 各自维护 past/present/future）
 * ========================================================== */
interface CssPanelProps {
  cfg: BlogConfig
  setCfg: (p: Partial<BlogConfig>) => void
  toast: (m: string) => void
  /** 博客预览 iframe（VisualCssEditor 选区注入用） */
  iframeRef?: RefObject<HTMLIFrameElement | null>
  /** 预览设备（VisualCssEditor 自动包裹 @media 断点） */
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
}

function CssPanel({ cfg, setCfg, toast, iframeRef, previewDevice }: CssPanelProps) {
  const setF = (p: Partial<BlogConfig>) => setCfg(p)
  // 使用优化③：亮/暗 CSS 模式跟随预览主题模式（预览暗色时默认展示"暗色 CSS"，不再固定亮色）；
  // 用户仍可手动切换 Segment 查看/编辑另一份 CSS。
  const [cssMode, setCssMode] = useState<'light' | 'dark'>(cfg.theme === 'dark' ? 'dark' : 'light')
  useEffect(() => { setCssMode(cfg.theme === 'dark' ? 'dark' : 'light') }, [cfg.theme])
  // 编辑器外壳跟随 Aurora 宿主主题（而非博客预览主题）——编辑器是面板的一部分，
  // 对齐真实层语义（effectiveIsDark = isDark ?? studioTheme.isDark）；否则亮色外壳嵌深色面板、暗色外壳嵌浅色面板均割裂。
  const { settings } = useSettings()
  const shellIsDark = settings.theme === 'dark'
  // 系统深色（prefers-color-scheme）：让暗色 CSS 在预览中生效的另一条路径，需监听变化驱动重渲染
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const currentCss = cssMode === 'light' ? cfg.customCssLight : cfg.customCssDark
  const cssField: 'customCssLight' | 'customCssDark' = cssMode === 'light' ? 'customCssLight' : 'customCssDark'

  // Undo/Redo 历史（镜像真实 CssPanel：外部变化同步入栈、切模式重置、Ctrl+Z/Y）
  const [history, setHistory] = useState<{ past: string[]; present: string; future: string[] }>({
    past: [], present: currentCss, future: [],
  })
  const isUndoRedoRef = useRef(false)

  useEffect(() => {
    if (currentCss !== history.present && !isUndoRedoRef.current) {
      setHistory((prev) => ({ past: [...prev.past, prev.present], present: currentCss, future: [] }))
    }
    isUndoRedoRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCss])

  useEffect(() => {
    setHistory({ past: [], present: currentCss, future: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssMode])

  const pushHistory = useCallback((newValue: string) => {
    setF({ [cssField]: newValue } as Partial<BlogConfig>)
  }, [cssField, setF])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const previous = prev.past[prev.past.length - 1]
      isUndoRedoRef.current = true
      setF({ [cssField]: previous } as Partial<BlogConfig>)
      return { past: prev.past.slice(0, -1), present: previous, future: [prev.present, ...prev.future] }
    })
  }, [cssField, setF])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const next = prev.future[0]
      isUndoRedoRef.current = true
      setF({ [cssField]: next } as Partial<BlogConfig>)
      return { past: [...prev.past, prev.present], present: next, future: prev.future.slice(1) }
    })
  }, [cssField, setF])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="aurora-blog-panel__scroll">
      <label className="aurora-blog-field aurora-blog-field--row">
        <span>启用自定义主题</span><StudioToggle checked={cfg.enableCustomCss} onChange={(v) => setF({ enableCustomCss: v })} />
      </label>
      {cfg.enableCustomCss && (
        <>
          <div className="aurora-blog-seg">
            <button
              className={`aurora-blog-seg__btn ${cssMode === 'light' ? 'is-active' : ''}`}
              onClick={() => setCssMode('light')}
            >亮色</button>
            <button
              className={`aurora-blog-seg__btn ${cssMode === 'dark' ? 'is-active' : ''}`}
              onClick={() => setCssMode('dark')}
            >暗色</button>
          </div>
          {/* 使用优化③b：系统深色（prefers-color-scheme）也会让暗色 CSS 在预览生效，一并提示，解释"亮色 Segment 但预览有暗色规则"的困惑 */}
          {(cfg.theme === 'dark' || sysDark) && (
            <div className="aurora-blog-banner">
              {cfg.theme === 'dark'
                ? '当前为深色模式，暗色 CSS 将优先生效。'
                : '系统为深色模式，暗色 CSS 中的颜色规则会在预览中生效。'}
            </div>
          )}

          <SectionLabel>编辑器</SectionLabel>
          <CssEditor
            value={currentCss}
            onChange={pushHistory}
            placeholder={cssMode === 'dark'
              ? '在此输入暗色模式专用 CSS...\n例如: body { background: #1a1a2e; color: #e0e0e0; }'
              : '在此输入自定义 CSS...'}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={undo}
            onRedo={redo}
            isDark={shellIsDark}
          />

          <div className="aurora-blog-row2">
            <StudioButton variant="ghost" onClick={() => toast?.('已导入 CSS')}><Icon.upload size={14} /> 导入</StudioButton>
            <StudioButton variant="ghost" onClick={() => toast?.('已导出 CSS')}><Icon.download size={14} /> 导出</StudioButton>
            <StudioButton variant="secondary" onClick={() => toast?.('已压缩 CSS')}><Icon.wand size={14} /> 压缩</StudioButton>
          </div>

          {/* 可视化 CSS 编辑器（点击预览元素取样式，仅亮色模式，与真实 CssPanel 一致） */}
          {iframeRef && cssMode === 'light' && (
            <VisualCssEditor
              iframeRef={iframeRef}
              onGenerateCss={(_selector, css) => {
                const cur = currentCss.trim()
                pushHistory(cur ? cur + '\n\n' + css : css)
              }}
              isDark={shellIsDark}
              previewDevice={previewDevice}
            />
          )}

          {/* 代码片段库（localStorage 持久化） */}
          <CssSnippets
            customCss={currentCss}
            onInsertSnippet={(css) => {
              const cur = currentCss.trim()
              pushHistory(cur ? cur + '\n\n' + css : css)
            }}
          />
        </>
      )}
      {!cfg.enableCustomCss && <div className="aurora-blog-empty">未启用自定义 CSS，博客将使用主题内置样式。</div>}
    </div>
  )
}

/* ============================================================
 * 面板：导出（对齐 RightPanel/ExportPanel）
 * 生成/下载/单文件全部接真实 useBlogGenerator（P0 · 1.2，替换 setTimeout 桩）
 * ========================================================== */
interface ExportPanelProps {
  cfg: BlogConfig
  toast: (m: string) => void
  docs: BlogDoc[]
  /** 真实生成（handleGenerate：generateBlog + 发布留痕） */
  onGenerate: () => void
  isGenerating: boolean
  /** 真实生成结果（供 DeployPanel 部署） */
  result: BlogGenerationResult | null
  /** 在浏览器新标签打开当前站点（使用优化②：原顶栏「打开」按钮迁入） */
  onOpenPreview: () => void
  /** 真实文件夹版下载（downloadBlogAsZip） */
  onDownloadFolder: () => void
  /** 真实单文件版下载（generateSingleFileBlog） */
  onDownloadSingleFile: () => void
  isDownloading: boolean
  genError: string | null
}

function ExportPanel({ cfg, docs, onGenerate, isGenerating, result, onOpenPreview, onDownloadFolder, onDownloadSingleFile, isDownloading, genError }: ExportPanelProps) {
  const docCount = docs.filter((d) => d.included).length
  const totalWords = docs.filter((d) => d.included).reduce((s, d) => s + d.words, 0)
  const themeName = THEME_MARKET.find((t) => t.key === cfg.themeKey)?.nameZh ?? cfg.themeKey

  return (
    <div className="aurora-blog-panel__scroll">
      <div className="aurora-blog-stats">
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot" /><b>{docCount}</b><span>文档</span></div>
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot aurora-blog-stat__dot--2" /><b>{totalWords.toLocaleString()}</b><span>字数</span></div>
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot aurora-blog-stat__dot--3" /><b>{themeName}</b><span>主题</span></div>
      </div>

      {genError && <div className="aurora-blog-banner aurora-blog-banner--error">{genError}</div>}

      <SectionLabel>步骤 1 · 生成</SectionLabel>
      <button className={`aurora-blog-generate ${isGenerating ? 'is-loading' : ''}`} onClick={onGenerate} disabled={isGenerating || docCount === 0}>
        {isGenerating ? <><Icon.refresh size={15} className="spin" /> 生成中…</> : <><Icon.sparkle size={15} /> 生成博客站点</>}
      </button>

      {result && (
        <>
          <SectionLabel>步骤 2 · 查看 / 下载</SectionLabel>
          <div className="aurora-blog-download">
            <button className="aurora-blog-dl" onClick={onOpenPreview}><Icon.externalLink size={18} /><span>打开</span><em>新标签页</em></button>
            <button className="aurora-blog-dl" onClick={onDownloadFolder} disabled={isDownloading}><Icon.folder size={18} /><span>文件夹</span><em>多文件</em></button>
            <button className="aurora-blog-dl" onClick={onDownloadSingleFile} disabled={isDownloading}><Icon.file size={18} /><span>单文件</span><em>自包含</em></button>
          </div>

          {/* P0 · 1.2：真实部署面板（平台选择/Token 验证/仓库/进度/成功 URL，deployToPages） */}
          <RealDeployPanel result={result} />
        </>
      )}
    </div>
  )
}

/* ============================================================
 * 主面板
 * ========================================================== */
export interface BlogPanelProps {
  nav?: (id: string) => void
  toast?: (msg: string) => void
  /** 发布来源知识库 id：提供时只显示该库内笔记，空库显示专属引导空态（由知识库「发布博客」跳转带入） */
  kbId?: string
}

/**
 * B3 发布闭环入口标记：编辑器「发布为博客」（右栏辅助 Tab / 标签右键菜单 / ⌘K）跳转时
 * 写入目标文件 id，BlogPanel 激活后进入「单篇」模式 —— 待发布清单只显示这一篇
 * （可点来源条「查看全部笔记」退出）；消费后自动清除。
 */
let blogEntryFileId: string | null = null
export function setBlogEntryFileId(id: string | null): void {
  blogEntryFileId = id
}

export function BlogPanel({ nav, toast, kbId }: BlogPanelProps) {
  const [panel, setPanel] = useState<PanelKey>('style')
  const [panelOpen, setPanelOpen] = useState(false) // 功能面板浮层：首次打开默认收起（专注预览），点顶部标签展开
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [cfg, setCfgState] = useState<BlogConfig>(DEFAULT_CONFIG)

  const { rootFolder, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()

  // —— 发布来源（知识库 → 博客工作室）：仅展示该库内笔记，空库显示引导空态 ——
  //    保存整个 KnowledgeBase：库内笔记的判定要复用 kbStore.getKbFiles（单一数据源），
  //    仅靠 folderId 会漏掉「手动添加 fileIds」「规则匹配」两类库内文件。
  const [kbSource, setKbSource] = useState<KnowledgeBase | null>(null)
  const [kbMissing, setKbMissing] = useState(false)
  useEffect(() => {
    let alive = true
    setKbSource(null)
    setKbMissing(false)
    if (!kbId) return
    loadKb(kbId)
      .then((kb) => { if (!alive) return; if (kb) setKbSource(kb); else setKbMissing(true) })
      .catch(() => { if (alive) setKbMissing(true) })
    return () => { alive = false }
  }, [kbId])

  const allDocs = useMemo(() => {
    // 博客入口（无 kbId）：内容 = 文件列表中的全部 .md
    if (!kbId) return collectMdFiles(rootFolder)
    if (!kbSource) return []
    // 知识库入口：与知识库「笔记」tab 同一定义（folderId 子文件 + 手动添加 + 规则匹配），
    // 保证「发布博客」看到的清单与知识库详情页完全一致；博客只发布 .md，故按扩展名收口。
    return getKbFiles(rootFolder, kbSource)
      .map((id) => findNode(rootFolder, id))
      .filter((n): n is FileNode => !!n && n.type === 'file' && /\.md$/i.test(n.name))
      .map(toBlogDoc)
  }, [rootFolder, kbSource, kbId])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // 单篇发布（编辑器「发布为博客」带入）：待发布清单只保留这一篇，其余笔记整篇不显示
  const [singleFileId, setSingleFileId] = useState<string | null>(null)

  // B3 发布闭环：来自编辑器「发布为博客」时，锁定该文件为唯一待发布笔记
  const appliedEntryFile = useRef<string | null>(null)
  useLayoutEffect(() => {
    const target = blogEntryFileId
    if (!target || target === appliedEntryFile.current) return
    // 目标尚未出现在清单里（知识库来源异步加载中）或文件已不存在：本次不锁定，等清单变化后重试
    if (!allDocs.some((d) => d.id === target)) return
    appliedEntryFile.current = target
    blogEntryFileId = null
    setSingleFileId(target)
    setExcluded(new Set())
    toast?.('已切换为单篇发布，仅发布当前笔记')
  }, [allDocs, toast])

  // 单篇模式下的可见清单（标题 / 字数为真实派生，不走平行数据）
  const scopedDocs = useMemo(
    () => (singleFileId ? allDocs.filter((d) => d.id === singleFileId) : allDocs),
    [allDocs, singleFileId],
  )
  const singleDoc = useMemo(
    () => (singleFileId ? allDocs.find((d) => d.id === singleFileId) ?? null : null),
    [allDocs, singleFileId],
  )

  const docs = useMemo(
    () => scopedDocs.map((d) => ({ ...d, included: !excluded.has(d.id) })),
    [scopedDocs, excluded],
  )
  const toggleDoc = useCallback((id: string) => {
    setExcluded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])
  const setAllDocs = useCallback(
    (v: boolean) => setExcluded(v ? new Set() : new Set(scopedDocs.map((d) => d.id))),
    [scopedDocs],
  )

  // 文档列表空态文案：区分「知识库加载中 / 知识库已不可用 / 库内暂无笔记 / 文件库无文档」，
  // 避免知识库来源的加载瞬间或失效 ID 被误报成「文件库中未发现任何 .md 文档」。
  const docsEmptyHint = useMemo(() => {
    // 单篇模式但目标已消失（在别处删除 / 改名）：给出可退出的指引，而不是报「文件库无文档」
    if (singleFileId && scopedDocs.length === 0) {
      return '目标笔记不存在或已被删除，可点上方「查看全部笔记」重新选择。'
    }
    if (kbId && !kbSource) {
      return kbMissing ? '知识库不存在或已被删除，可在博客入口查看全部笔记。' : '正在加载知识库…'
    }
    if (kbSource) return `知识库「${kbSource.name}」暂未添加文件，请先在知识库中添加笔记。`
    return undefined
  }, [singleFileId, scopedDocs, kbId, kbSource, kbMissing])

  // —— P0 · 1.2：挂载真实 useBlogGenerator（generateBlog 生成 + 发布留痕 + 下载），
  //    替换 ExportPanel 的 setTimeout 桩；isOpen 恒真（博客为页面非模态）——
  const blogFiles = useMemo(
    () =>
      docs
        .filter((d) => d.included && d.content)
        .map((d) => ({ name: d.title.endsWith('.md') ? d.title : `${d.title}.md`, content: d.content })),
    [docs],
  )
  const {
    handleGenerate,
    isGenerating,
    result,
    handleDownloadFolder,
    handleDownloadSingleFile,
    isDownloading,
    error: blogError,
  } = useBlogGenerator(true, () => {}, blogFiles)

  const setCfg = (p: Partial<BlogConfig>) => setCfgState((prev) => ({ ...prev, ...p }))
  const activePanel = PANELS.find((p) => p.key === panel)!
  // 当前分组由 panel 派生（单一状态源，无平行 group state）
  const activeGroup = PANEL_GROUPS.find((g) => g.items.includes(panel))!

  // 友链 / 系列文章：状态提升至主组件（受控），预览 iframe 用真实生成器渲染时能如实反映
  const [friends, setFriends] = useState<BlogFriend[]>([])
  const [series, setSeries] = useState<BlogSeries[]>([])

  // P0 · 1.2：预览 iframe ref（VisualCssEditor 选区注入）
  const previewIframeRef = useRef<HTMLIFrameElement>(null)

  const handleNav = (id: string) => nav?.(resolveAuroraNav(id))

  // P0 修复：预览 = 真实 generateSingleFileBlog（themeStyle 驱动 60+ 主题模板渲染）。
  // 与真实 BlogStudio 的 updatePreview 同源（单一数据源），themeKey/colorScheme/font/
  // 自定义 CSS/友链/系列/功能开关任一变化都会重新生成并即时反映到 iframe。
  // 预览失败/空态占位（iframe 内联 HTML）：让"生成异常"可见，不再静默空白
  const previewFallback = useMemo(() => {
    const wrap = (icon: string, title: string, body: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;background:#fafafa;color:#333;display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;box-sizing:border-box"><div style="max-width:460px;text-align:center"><div style="font-size:30px;margin-bottom:12px">${icon}</div><div style="font-weight:600;margin-bottom:8px;font-size:15px">${title}</div><div style="font-size:13px;color:#666;line-height:1.6;word-break:break-all">${body}</div></div></body></html>`
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const included = docs.filter((d) => d.included && d.content.trim())
    if (included.length === 0) {
      // 知识库来源空态：库内无任何笔记（界面级引导，区别于默认全部笔记的诊断文案）
      if (kbSource) {
        return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/></svg>', '知识库暂未添加文件', `知识库「${kbSource.name}」内还没有任何笔记。\n请先在知识库中添加笔记，再回到此处发布博客。`)
      }
      const mdTotal = docs.length
      const emptyCount = docs.filter((d) => !d.content.trim()).length
      const body = mdTotal === 0
        ? '诊断：文件库中未发现任何 .md 文档（若编辑器侧边栏有文件，请反馈此信息）'
        : `诊断：共发现 ${mdTotal} 篇 .md 文档，其中 ${emptyCount} 篇内容为空。请到「内容」面板确认，或反馈此信息。`
      return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>', '暂无待预览文档', body)
    }
    try {
      return generateSingleFileBlog(
        included.map((d) => ({
          name: d.title.endsWith('.md') ? d.title : `${d.title}.md`,
          content: d.content,
        })),
        toRealBlogConfig(cfg, friends, series),
      )
    } catch (e) {
      // 诊断埋点（Aurora 层）：预览生成异常时如实上报，避免静默空白
      console.error('[BlogPanel] 预览生成失败:', e)
      return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5"><path d="M12 4 4 20h16L12 4Z"/><path d="M12 10v4M12 17v1"/></svg>', '博客预览生成失败', `错误信息：${esc(String((e as Error)?.message ?? e))}<br><br><span style="font-size:12px;color:#999">请复制上方错误信息反馈</span>`)
    }
  }, [cfg, docs, friends, series, kbSource])

  // 功能列表浮层：仅允许停靠在「博客界面」最左 / 最右贴边位置（2 个停靠点）。
  // 交互 = 抓住表头向左/向右「甩丢」：拖动时实时跟随指针，松手按抛掷速度吸附到对应贴边，
  // 配合 transform 的 spring 过渡实现快速顺滑的贴边切换动画（audit 2026-09-14 #2：原用 left，
  // 属布局属性动画会逐帧触发 layout；改 translateX 后全程留在合成器，位移值语义不变）。
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState<0 | 1>(0)        // 0 = 最左贴边，1 = 最右贴边
  const [panelLeft, setPanelLeft] = useState(0)      // 实时横向位移 px（拖动时跟随指针；写进 translateX）
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startLeft: number; lastX: number; lastT: number; vx: number } | null>(null)

  /**
   * 滑动切「组内子面板」。手势**同时**挂到顶栏 segmented（`.aurora-blog__subseg`）
   * 与浮层内容体（`.aurora-blog__panelzone-body`）两处。
   *
   * 博客与设置/知识库的本质差异：
   *   - 设置/知识库：tab → 可切换的内容主体（内容区即 tab 的载体）
   *   - 博客：tab → **浮层面板**，主体是预览 iframe
   *
   * 因此各自的取舍：
   *   1. **不挂预览区** —— 预览区是 iframe，pointer 事件被 iframe 吞掉，手势无法生效；
   *   2. **浮层表头不挂** —— 表头已有「甩丢停靠」拖拽手势，重叠会互相打架；
   *   3. **手势必须常驻可用**（`enabled: true`）—— 顶栏 tab 行始终可见，
   *      用户在该行左右滑就该切子面板；若跟 `panelOpen` 绑定，浮层默认收起时
   *      （`useState(false)`）滑动会完全无响应 —— 这正是「tab 栏滑不动」的根因。
   *      位移目标在收起时为空，由 hook 内部空判兜住（不位移但照常切 tab）。
   *
   * 只滑「组内」（DesignBrief §4.2 D2）：跨组会同时改 group + panel 两个状态，
   * 动画目标不唯一且语义跳跃大（主题 ↔ 高级），故跨组必须点 tab。
   * 组内只有 2 项时，到边后继续同向滑会被边界阻尼回弹 —— 预期行为。
   */
  const blogPanelBodyRef = useRef<HTMLDivElement>(null)
  /**
   * 吸附判定基准（始终存在）。
   *
   * ⚠️ 不能直接用 `blogPanelBodyRef` 作 measure：浮层内容体在 `panelOpen=false`
   * 时条件渲染、不挂载 → ref.current 为 null → 手势会退回用 99px 宽的 tab 行
   * 做 32% 阈值基准，从 tab 行起手时「轻轻一划」就被误判翻页。
   * 预览区（`.aurora-blog__stage`）常驻，用它的宽度作基准才是稳定的。
   */
  const blogMeasureRef = useRef<HTMLDivElement>(null)
  const handleBlogOffset = useCallback((offset: number) => {
    const root = rootRef.current
    if (!root) return
    const width = (blogPanelBodyRef.current ?? blogMeasureRef.current)?.clientWidth || 1
    root.style.setProperty('--swipe-progress', String(Math.max(-1, Math.min(1, offset / width))))
  }, [])
  const blogSwipe = useSwipeTabs({
    index: Math.max(0, PANEL_GROUPS.find((g) => g.items.includes(panel))!.items.indexOf(panel)),
    count: PANEL_GROUPS.find((g) => g.items.includes(panel))!.items.length,
    // 顶栏 tab 行**常驻可见** → 手势必须始终可用（不受浮层开合影响）。
    // 位移目标（targetRef）在浮层收起时为 null，由 applyOffset 内部空判兜住。
    enabled: true,
    onIndexChange: (next) => {
      const g = PANEL_GROUPS.find((x) => x.items.includes(panel))!
      setPanel(g.items[next])
    },
    onOffsetChange: handleBlogOffset,
    // 只位移浮层内容体（预览区不该跟着抖）
    targetRef: panelOpen ? blogPanelBodyRef : undefined,
    measureRef: blogMeasureRef,
  })
  useEffect(() => {
    if (!blogSwipe.dragging) rootRef.current?.style.setProperty('--swipe-progress', '0')
  }, [blogSwipe.dragging])

  /**
   * 手势同时挂到 subbar 的**子面板 segmented** 与**浮层内容体**两处。
   * segmented 那份额外吃掉横滑后的 click（否则会把刚滑到的子面板又点回去）。
   */
  const blogBind = useMemo(() => blogSwipe.makeBind(), [blogSwipe])

  // 最右贴边 = 博客界面内容区宽度 − 功能列表宽度
  const edgeMax = () => Math.max(0, (rootRef.current?.offsetWidth ?? 0) - (panelRef.current?.offsetWidth ?? 0))

  // 依据博客界面（.aurora-blog）内容区宽度对齐贴边位置；窗口/密度变化或停靠切换时重新对齐
  useLayoutEffect(() => {
    const compute = () => {
      const max = edgeMax()
      // 拖动态保持指针位置；非拖动态吸附到当前 slot 对应贴边
      setPanelLeft((prev) => (dragging ? prev : slot === 1 ? max : 0))
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (rootRef.current) ro.observe(rootRef.current)
    if (panelRef.current) ro.observe(panelRef.current)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [slot, dragging])

  // 抓住表头向左/右「甩丢」：实时跟随，松手按抛掷速度（或位移）吸附到对应贴边
  const onHeaderDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startLeft: panelLeft, lastX: e.clientX, lastT: e.timeStamp, vx: 0 }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHeaderMove = (e: ReactPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const max = edgeMax()
    const dx = e.clientX - d.startX
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.vx = (e.clientX - d.lastX) / dt  // 像素/毫秒，衡量「甩」的速度
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    setPanelLeft(Math.min(Math.max(0, d.startLeft + dx), max))
  }
  const onHeaderUp = (e: ReactPointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    const max = edgeMax()
    const dx = e.clientX - d.startX
    const VTHRESH = 0.35 // px/ms ≈ 350px/s，超过即判定为「甩」的抛掷手势
    let target: 0 | 1 = slot
    if (Math.abs(d.vx) > VTHRESH) target = d.vx < 0 ? 0 : 1        // 向左甩 → 左贴边；向右甩 → 右贴边
    else if (Math.abs(dx) > 48) target = dx < 0 ? 0 : 1            // 缓慢拖过阈值也应切换
    setDragging(false)
    if (target !== slot) setSlot(target)
    else setPanelLeft(target === 1 ? max : 0)                      // 未达切换阈值则回弹到当前贴边
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  // 在新标签打开当前预览（真实行为：导出 iframe 当前 HTML 为 blob 并在浏览器打开）
  const handleOpenPreview = () => {
    const doc = previewIframeRef.current?.srcdoc
    if (!doc) { toast?.('预览尚未生成'); return }
    try {
      const blob = new Blob([doc], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      toast?.('打开预览失败')
    }
  }

  const renderPanel = () => {
    switch (panel) {
      case 'style': return <StylePanel cfg={cfg} setCfg={setCfg} panelOpen={panelOpen} />
      case 'color': return <ColorPanel cfg={cfg} setCfg={setCfg} />
      case 'content': return <ContentPanel cfg={cfg} setCfg={setCfg} docs={docs} onToggleDoc={toggleDoc} onSetAll={setAllDocs} emptyHint={docsEmptyHint} onOpenSource={(id) => { openFile(id); nav?.('editor') }} />
      case 'features': return <FeaturesPanel cfg={cfg} setCfg={setCfg} toast={toast!} friends={friends} setFriends={setFriends} series={series} setSeries={setSeries} />
      case 'css': return <CssPanel cfg={cfg} setCfg={setCfg} toast={toast!} iframeRef={previewIframeRef} previewDevice={device} />
      case 'export': return (
        <ExportPanel
          cfg={cfg}
          toast={toast!}
          docs={docs}
          // 批次债①：生成必须携带面板 cfg 映射——否则 handleGenerate 内部走
          // DEFAULT_DESIGN_CONFIG（red/Anonymous），与预览（toRealBlogConfig）分裂。
          onGenerate={() => handleGenerate(toRealBlogConfig(cfg, friends, series))}
          isGenerating={isGenerating}
          result={result}
          onOpenPreview={handleOpenPreview}
          onDownloadFolder={() => void handleDownloadFolder()}
          onDownloadSingleFile={handleDownloadSingleFile}
          isDownloading={isDownloading}
          genError={blogError}
        />
      )
    }
  }

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="博客"
      onSidebarSelect={handleNav}
      breadcrumbs={['博客工作室']}
      statusLeftItems={[{ content: '博客工作室' }, { content: `${docs.filter((d) => d.included).length} 篇待发布` }]}
      statusRightItems={[{ content: `主题 ${THEME_MARKET.find((t) => t.key === cfg.themeKey)?.nameZh ?? cfg.themeKey}` }, { content: cfg.theme === 'dark' ? '深色' : '浅色' }, { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() }]}
    >
      <div className="aurora-blog" ref={rootRef}>
        {/* 单篇发布提示条：编辑器「发布为博客」带入时显示，可一键退回全部笔记 */}
        {singleDoc && (
          <div className="aurora-blog-source-bar">
            <span className="aurora-blog-source-bar__label">
              <Icon.blog size={14} /> 单篇发布：{singleDoc.title}
            </span>
            <button
              className="aurora-blog-source-bar__clear"
              onClick={() => {
                setSingleFileId(null)
                setExcluded(new Set())
                toast?.('已恢复全部笔记')
              }}
            >
              查看全部笔记
            </button>
          </div>
        )}
        {/* 发布来源提示条：知识库跳转带来源时显示，可一键退回全部笔记 */}
        {kbSource && (
          <div className="aurora-blog-source-bar">
            <span className="aurora-blog-source-bar__label"><Icon.book size={14} /> 发布来源：{kbSource.name}</span>
            <button className="aurora-blog-source-bar__clear" onClick={() => nav?.('blog')}>查看全部笔记</button>
          </div>
        )}
        {/* 顶部子栏：分组 tab（主题/数据/高级）+ 组内次级 segmented + 设备切换 */}
        <div className="aurora-blog__subbar">
          <div className="aurora-blog__tabs">
            {PANEL_GROUPS.map((g) => {
              const I = Icon[g.icon]
              const groupActive = activeGroup.key === g.key
              return (
                <button
                  key={g.key}
                  className={`aurora-blog__tab ${groupActive ? 'is-active' : ''}`}
                  onClick={() => {
                    // 同组再点 = 切换浮层收/展；切组 = 落到组内子面板并展开
                    if (groupActive) setPanelOpen((v) => !v)
                    else { setPanel(g.items[0]); setPanelOpen(true) }
                  }}
                  title={g.label}
                >
                  <I size={16} />
                  <span>{g.label}</span>
                </button>
              )
            })}
          </div>
          <div className="aurora-blog__subseg" role="tablist" aria-label="子面板切换" data-swiping={blogSwipe.dragging || undefined} {...blogBind}>
            {activeGroup.items.map((key) => {
              const p = PANELS.find((x) => x.key === key)!
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={panel === key}
                  className={`aurora-blog__subseg-btn ${panel === key ? 'is-active' : ''}`}
                  onClick={() => { setPanel(key); setPanelOpen(true) }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="aurora-blog__subbar-right">
            <div className="aurora-blog__device">
              {([{ k: 'desktop', i: 'desktop' as IconName, l: '桌面' }, { k: 'tablet', i: 'tablet' as IconName, l: '平板' }, { k: 'mobile', i: 'mobile' as IconName, l: '手机' }] as const).map((d) => {
                const DevIcon = Icon[d.i]
                return (
                  <button key={d.k} className={`aurora-blog__device-btn ${device === d.k ? 'is-active' : ''}`} onClick={() => setDevice(d.k)} title={d.l}>
                    <DevIcon size={15} />
                  </button>
                )
              })}
            </div>
            {/* 使用优化②：顶栏「打开」按钮已迁入导出面板步骤 2（handleOpenPreview 保留） */}
          </div>
        </div>

        {/* 功能列表浮层：高度 = 预览区高度；仅停靠最左 / 最右贴边；
            抓住表头向左/向右「甩丢」即丝滑吸附到对应贴边（transform 过渡 + 抛掷速度判定） */}
        <div
          ref={panelRef}
          className={`aurora-blog__panelzone ${panelOpen ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''} ${slot === 1 ? 'is-right' : 'is-left'}`}
          style={{ transform: `translateX(${panelLeft}px)` }}
        >
          <div
            className="aurora-blog__panelzone-head"
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            onPointerCancel={onHeaderUp}
          >
            <span className="aurora-blog__panel-dot" style={{ background: 'var(--mc-accent)' }} />
            <span className="aurora-blog__panelzone-title">{activePanel.label}</span>
            <span className="aurora-blog__panel-grip" title="按住表头并向左右甩动，可切换停靠侧"><Icon.grip size={15} /></span>
          </div>
          {panelOpen && (
            <div
              className={`aurora-blog__panelzone-body ${blogSwipe.dragging ? 'is-swiping' : ''}`}
              ref={blogPanelBodyRef}
              {...blogBind}
            >
              {renderPanel()}
            </div>
          )}
        </div>

        {/* 中央预览区（占据剩余空间） */}
        {/* 注：此节点常驻 → 兼作滑动手势的吸附判定基准（见 blogMeasureRef） */}
        <div className="aurora-blog__stage" ref={blogMeasureRef}>
          <div className="aurora-blog__preview">
            <div className="aurora-blog__preview-stage">
              <div className={`aurora-blog__frame aurora-blog__frame--${device}`}>
                <iframe ref={previewIframeRef} title="博客预览" srcDoc={previewFallback} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  )
}
