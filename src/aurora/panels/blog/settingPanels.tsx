/**
 * 博客工作室 · 设置面板组：样式（含主题市场）/ 配色 / 内容 / 功能
 * （P2-3 从 BlogPanel.tsx 拆出，2026-09-28；纯展示组件，状态经 props 上行）
 */
import { useLanguage } from '@stores/LanguageStore'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '../../icons'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import type { Dispatch, SetStateAction } from 'react'
import {
  THEME_CATEGORIES, THEME_STYLE_TAGS, THEME_STYLE_FILTER_OPTIONS, THEME_MARKET, COLOR_SCHEMES,
  SEARCH_TOP_SHOW, SEARCH_TOP_HIDE, SEARCH_SETTLE_MS,
  type BlogConfig, type BlogDoc, type BlogFriend, type BlogSeries,
} from './blogStudioModel'
import { SectionLabel, StudioInput, StudioTextarea, StudioSelect, StudioToggle, StudioChip, StudioButton } from './studioAtoms'

/* ============================================================
 * 面板：样式（含主题市场子组件）
 * ========================================================== */
function StylePanel({ cfg, setCfg, panelOpen }: { cfg: BlogConfig; setCfg: (p: Partial<BlogConfig>) => void; panelOpen: boolean }) {
  const { t, language } = useLanguage()
  const B = t.blog
  // 数据层选项携带 zh/en 双语文案，展示文案随界面语言
  const pickLabel = (o: { zh: string; en: string }) => (language === 'en' ? o.en : o.zh)
  const catOptions = THEME_CATEGORIES.map((o) => ({ value: o.value, label: pickLabel(o) }))
  const styleFilterOptions = THEME_STYLE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: pickLabel(o) }))
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
  const tagLabel = (tg: string) => {
    const f = THEME_STYLE_TAGS.find((s) => s.value === tg)
    return f ? pickLabel(f) : tg
  }
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
          placeholder={B.searchTheme}
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
      <SectionLabel>{B.themeMarket}</SectionLabel>
      <div className="aurora-blog-tabs">
        <span className="aurora-blog-chipgroup__label">{B.catLabel}</span>
        <AuroraSelect value={cat} options={catOptions} onChange={setCat} placeholder={B.all} ariaLabel={B.ariaByCat} />
      </div>
      <div className="aurora-blog-tags">
        <span className="aurora-blog-chipgroup__label">{B.styleLabel}</span>
        <AuroraSelect value={tag} options={styleFilterOptions} onChange={setTag} placeholder={B.all} ariaLabel={B.ariaByStyle} />
      </div>
      <div className="aurora-blog-theme-grid">
        {filtered.map((t) => (
          <div
            key={t.key}
            className={`aurora-blog-theme ${cfg.themeKey === t.key ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            title={language === 'en' ? t.descEn : t.desc}
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
            <div className="aurora-blog-theme__desc">{language === 'en' ? t.descEn : t.desc}</div>
            <div className="aurora-blog-theme__tags">
              {t.tags.map((tg) => <em key={tg}>{tagLabel(tg)}</em>)}
              {t.featured && <em className="is-featured">{B.featured}</em>}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>{B.themeMode}</SectionLabel>
      <div className="aurora-blog-seg">
        {(['light', 'dark'] as const).map((m) => (
          <button key={m} className={`aurora-blog-seg__btn ${cfg.theme === m ? 'is-active' : ''}`} onClick={() => setCfg({ theme: m })}>
            {m === 'light' ? B.lightMode : B.darkMode}
          </button>
        ))}
      </div>
      <div className="aurora-blog-current">
        {B.currentTheme}<b>{theme?.nameZh}</b> · {theme?.nameEn}
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
  const { t } = useLanguage()
  const B = t.blog
  const hex = COLOR_SCHEMES.find((c) => c.key === cfg.colorScheme)?.hex ?? '#6366f1'
  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>{B.colorScheme}</SectionLabel>
      <div className="aurora-blog-colors">
        {COLOR_SCHEMES.map((c) => (
          <button key={c.key} className={`aurora-blog-color ${cfg.colorScheme === c.key ? 'is-active' : ''}`} onClick={() => setCfg({ colorScheme: c.key })} title={c.label}>
            <span style={{ background: c.hex }} />
            {cfg.colorScheme === c.key && <Icon.check size={13} />}
          </button>
        ))}
        <button className="aurora-blog-color aurora-blog-color--custom" title={B.custom}><span style={{ background: 'conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#ef4444)' }} /></button>
      </div>

      <SectionLabel>{B.previewLabel}</SectionLabel>
      <div className="aurora-blog-color-preview" style={{ background: `linear-gradient(135deg, ${hex}, ${hex}66)` }}>
        <div className="aurora-blog-color-preview__name">{COLOR_SCHEMES.find((c) => c.key === cfg.colorScheme)?.label}</div>
        <div className="aurora-blog-color-preview__dots">
          <span style={{ background: hex }} /><span style={{ background: `${hex}99` }} /><span style={{ background: `${hex}55` }} />
        </div>
      </div>

      <SectionLabel>{B.fontLabel}</SectionLabel>
      <div className="aurora-blog-seg">
        {([{ v: 'serif', l: B.fontSerif }, { v: 'sans', l: B.fontSans }, { v: 'mono', l: B.fontMono }] as const).map((f) => (
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
  const { t } = useLanguage()
  const B = t.blog
  const allOn = docs.every((d) => d.included)
  const totalWords = docs.filter((d) => d.included).reduce((s, d) => s + d.words, 0)

  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>{B.siteInfoLabel}</SectionLabel>
      <label className="aurora-blog-field"><span>{B.siteTitle}</span><StudioInput value={cfg.siteTitle} onChange={(v) => setCfg({ siteTitle: v })} /></label>
      <label className="aurora-blog-field"><span>{B.siteDesc}</span><StudioTextarea value={cfg.siteDescription} onChange={(v) => setCfg({ siteDescription: v })} /></label>
      <div className="aurora-blog-row2">
        <label className="aurora-blog-field"><span>{B.author}</span><StudioInput value={cfg.author} onChange={(v) => setCfg({ author: v })} /></label>
        <label className="aurora-blog-field"><span>{B.language}</span>
          <StudioSelect value={cfg.language} onChange={(v) => setCfg({ language: v })} options={[{ value: 'zh-CN', label: B.langZh }, { value: 'en', label: 'English' }, { value: 'ja', label: '日本語' }]} />
        </label>
      </div>

      <SectionLabel>{B.docsLabel} <em>{docs.filter((d) => d.included).length}/{docs.length}</em></SectionLabel>
      <div className="aurora-blog-doc-actions">
        <StudioChip active={allOn} onClick={() => onSetAll(true)}>全选</StudioChip>
        <StudioChip active={!allOn} onClick={() => onSetAll(false)}>全不选</StudioChip>
      </div>
      <div className="aurora-blog-doc-list">
        {docs.length === 0 && emptyHint ? (
          <div className="aurora-blog-doc-empty">{emptyHint}</div>
        ) : docs.length === 0 ? (
          <div className="aurora-blog-doc-empty aurora-blog-doc-empty--muted">{B.noMdDocs}</div>
        ) : docs.map((d) => (
          <label key={d.id} data-file-id={d.id} className={`aurora-blog-doc ${d.included ? 'is-on' : ''}`}>
            <input type="checkbox" checked={d.included} onChange={() => onToggleDoc(d.id)} />
            <span className="aurora-blog-doc__title">{d.title}</span>
            <span className="aurora-blog-doc__words">{B.wordsUnit.replace('{n}', String(d.words))}</span>
            {onOpenSource && (
              <button
                type="button"
                className="aurora-blog-doc__open"
                title={B.openInEditor}
                onClick={(e) => { e.preventDefault(); onOpenSource(d.id) }}
              >
                <Icon.edit size={13} />
              </button>
            )}
          </label>
        ))}
      </div>
      <div className="aurora-blog-stat-inline">{B.willPublish.replace('{n}', totalWords.toLocaleString()).replace('{m}', String(docs.filter((d) => d.included).length))}</div>
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
  const { t } = useLanguage()
  const B = t.blog
  const setF = (p: Partial<BlogConfig>) => setCfg(p)

  return (
    <div className="aurora-blog-panel__scroll">
      <SectionLabel>{B.featuresLabel}</SectionLabel>
      <div className="aurora-blog-feature-chips">
        <button className={`aurora-blog-fchip ${cfg.enableViews ? 'is-on' : ''}`} onClick={() => setF({ enableViews: !cfg.enableViews })}><Icon.eye size={15} /> {B.views}</button>
        <button className={`aurora-blog-fchip ${cfg.enableLikes ? 'is-on' : ''}`} onClick={() => setF({ enableLikes: !cfg.enableLikes })}><Icon.heart size={15} /> {B.likes}</button>
        <button className={`aurora-blog-fchip ${cfg.enablePwa ? 'is-on' : ''}`} onClick={() => setF({ enablePwa: !cfg.enablePwa })}><Icon.mobile size={15} /> PWA</button>
      </div>

      <SectionLabel>{B.rewardLabel} <StudioToggle checked={cfg.enableReward} onChange={(v) => setF({ enableReward: v })} /></SectionLabel>
      {cfg.enableReward && (
        <div className="aurora-blog-row2">
          <label className="aurora-blog-field"><span>{B.wechatQr}</span><StudioInput value={cfg.rewardWechat} onChange={(v) => setF({ rewardWechat: v })} placeholder={B.imageUrl} /></label>
          <label className="aurora-blog-field"><span>{B.alipayQr}</span><StudioInput value={cfg.rewardAlipay} onChange={(v) => setF({ rewardAlipay: v })} placeholder={B.imageUrl} /></label>
        </div>
      )}

      <SectionLabel>关于页</SectionLabel>
      <label className="aurora-blog-field"><span>{B.bio}</span><StudioTextarea value={cfg.aboutBio} onChange={(v) => setF({ aboutBio: v })} rows={2} /></label>
      <label className="aurora-blog-field"><span>{B.skills}</span><StudioInput value={cfg.aboutSkills} onChange={(v) => setF({ aboutSkills: v })} placeholder={B.commaSeparated} /></label>

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
            <div className="aurora-blog-list-item__body"><b>{s.name}</b><span>{B.seriesCount.replace('{n}', String(s.count))}</span></div>
            <button className="aurora-blog-icon-btn" onClick={() => setSeries((p) => p.filter((x) => x.id !== s.id))}><Icon.trash size={14} /></button>
          </div>
        ))}
        <button className="aurora-blog-add" onClick={() => { setSeries((p) => [...p, { id: `s${Date.now()}`, name: B.newSeries, count: 0 }]); toast?.(B.seriesAdded) }}><Icon.plus size={14} /> {B.addSeries}</button>
      </div>

      <SectionLabel>配置</SectionLabel>
      <div className="aurora-blog-row2">
        <StudioButton variant="secondary" onClick={() => toast?.(B.configExported)}><Icon.download size={14} /> {B.exportBtn}</StudioButton>
        <StudioButton variant="ghost" onClick={() => toast?.(B.configImported)}><Icon.upload size={14} /> {B.importBtn}</StudioButton>
      </div>
    </div>
  )
}

// —— P2-3 拆分导出（消费方：主面板/兄弟模块）——
export {
  StylePanel,
  ColorPanel,
  ContentPanel,
  FeaturesPanel,
}
