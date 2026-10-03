import { useState, useMemo, useLayoutEffect, useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import { useUsageDocsScope } from '@hooks/useUsageDocsScope'
import { useFileManager } from '@stores/FileStore'
import { loadKb, getKbFiles } from '@stores/kbStore'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'
import { findNode } from '@core/files/fileTree'
import { peekBlogEntryFileId, clearBlogEntryFileId } from '@services/blogEntry'
import { useBlogGenerator } from '@features/blog/hooks/useBlogGenerator'
import { generateSingleFileBlog } from '@features/blog'
import '../../styles/panels/blog.css'
import { PANELS, PANEL_GROUPS, THEME_MARKET, DEFAULT_CONFIG, toRealBlogConfig, collectMdFiles, toBlogDoc,
  type PanelKey, type BlogConfig, type BlogFriend, type BlogSeries } from './blogStudioModel'
import { StylePanel, ColorPanel, ContentPanel, FeaturesPanel } from './settingPanels'
import { CssPanel, ExportPanel } from './deployPanels'
import { useLanguage } from '@stores/LanguageStore'

/**
 * Aurora 博客工作室面板（Phase 2 换芯 · 接真实 BlogStudio 数据）
 *
 * 保留 Aurora `PageFrame` 外壳布局与视觉；顶部 6 个平级面板折叠为
 * 3 个分组 tab（主题/数据/高级）+ 组内次级 segmented（P1-5 信息架构，
 * 6 个子面板功能不变）；数据层替换为真实来源（禁增铁律 / D4 单一数据源）：
 * - 文档列表：遍历 `useFileManager().rootFolder` 收集全部 .md 文件（标题 + 字数为真实派生），
 *   替代写死的 MOCK_DOCS；「包含/排除」为面板本地 estado（对齐真实 excludedFiles Set）。
 *   ⚠️ 需排除内置《MarkCraft 使用文档》（应用说明书不是用户的博客内容）—— 用与编辑器文件列表
 *   同一份判定（`useUsageDocsScope().hiddenIds`），保证「博客清单 = 我在文件列表里看到的东西」。
 * - 配色 / 主题市场：直接复用真实 BlogStudio 的 COLOR_SCHEMES / THEME_INFO_LIST / THEME_CATEGORIES /
 *   THEME_STYLE_TAGS（单一数据源，禁漂移），不再维护平行 mock 目录。
 * - 友链 / 系列文章：起始为空（对齐真实 DEFAULT_DESIGN_CONFIG.friendLinks/seriesConfig 默认空），
 *   由用户在「功能」面板添加，移除写死的 MOCK_FRIENDS / MOCK_SERIES。
 * - 站点配置 BlogConfig：为工作室本地工作态（同真实每次打开重置为默认），主题键/配色键对齐真实枚举。
 * 🧩 P2-3（2026-09-28）：注册表/类型/默认配置/数据映射拆至 blogStudioModel.ts，
 *    原子控件拆至 studioAtoms.tsx，设置面板组拆至 settingPanels.tsx，CSS/导出面板拆至
 *    deployPanels.tsx；本文件只剩主面板（状态编排 + 布局，行为不变）。
 */

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
 * B3 发布闭环：编辑器「发布为博客」（右栏辅助 Tab / 标签右键菜单 / ⌘K）跳转时
 * 写入目标文件 id，BlogPanel 激活后进入「单篇」模式 —— 待发布清单只显示这一篇
 * （可点来源条「查看全部笔记」退出）；消费后自动清除。
 *
 * 通道本体位于 `@services/blogEntry`（P2-1）：此前它是本文件的模块级变量，
 * 逼得 EditorPanel 直接 import BlogPanel（平级面板横向耦合）。现两端各自依赖 services，
 * 本文件只作为**消费者**（peek / clear）。
 */

export function BlogPanel({ nav, toast, kbId }: BlogPanelProps) {
  const [panel, setPanel] = useState<PanelKey>('style')
  const [panelOpen, setPanelOpen] = useState(false) // 功能面板浮层：首次打开默认收起（专注预览），点顶部标签展开
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [cfg, setCfgState] = useState<BlogConfig>(DEFAULT_CONFIG)

  const { rootFolder, openFile } = useFileManager()
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
  const B = t.blog
  const { openCommandPalette } = useCommandPalette()
  // 内置《使用文档》作用域（判定单源：@core/files/usageDocs ← useUsageDocsScope）：
  // 供下面「博客入口」的清单过滤复用，避免同一判定各自手写 → 行为漂移（项目已有教训）。
  const usageDocs = useUsageDocsScope()

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
    // 博客入口（无 kbId）：内容 = **编辑器文件列表中可见的**全部 .md
    //   —— 与文件列表用同一集合（hiddenIds）过滤，保证口径就是「我在文件列表里看到的东西」。
    // 边界（有意为之，别当 bug）：知识库入口**不过滤** —— 它的口径是「与该库详情页的笔记列表
    //   完全一致」（见下），而内置文档所在的那个库本身就是「说明书的浏览入口」，
    //   若在此过滤会让一个非空库显示成空库，反而对不上详情页。
    if (!kbId) return collectMdFiles(rootFolder, usageDocs.hiddenIds)
    if (!kbSource) return []
    // 知识库入口：与知识库「笔记」tab 同一定义（folderId 子文件 + 手动添加 + 规则匹配），
    // 保证「发布博客」看到的清单与知识库详情页完全一致；博客只发布 .md，故按扩展名收口。
    return getKbFiles(rootFolder, kbSource)
      .map((id) => findNode(rootFolder, id))
      .filter((n): n is FileNode => !!n && n.type === 'file' && /\.md$/i.test(n.name))
      .map(toBlogDoc)
  }, [rootFolder, kbSource, kbId, usageDocs])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // 单篇发布（编辑器「发布为博客」带入）：待发布清单只保留这一篇，其余笔记整篇不显示
  const [singleFileId, setSingleFileId] = useState<string | null>(null)

  // B3 发布闭环：来自编辑器「发布为博客」时，锁定该文件为唯一待发布笔记
  const appliedEntryFile = useRef<string | null>(null)
  useLayoutEffect(() => {
    const target = peekBlogEntryFileId()
    if (!target || target === appliedEntryFile.current) return
    // 目标尚未出现在清单里（知识库来源异步加载中）或文件已不存在：本次不锁定，等清单变化后重试
    if (!allDocs.some((d) => d.id === target)) return
    appliedEntryFile.current = target
    clearBlogEntryFileId()
    setSingleFileId(target)
    setExcluded(new Set())
    toast?.(B.switchedSingle)
  }, [allDocs, toast, B.switchedSingle])

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
      return B.targetMissing
    }
    if (kbId && !kbSource) {
      return kbMissing ? B.kbMissing : B.loadingKb
    }
    if (kbSource) return `知识库「${kbSource.name}」暂未添加文件，请先在知识库中添加笔记。`
    return undefined
  }, [singleFileId, scopedDocs, kbId, kbSource, kbMissing, B.kbMissing, B.loadingKb, B.targetMissing])

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
        return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/></svg>', B.kbNoFilesTitle, B.kbNoFilesBody.replace('{name}', kbSource.name))
      }
      const mdTotal = docs.length
      const emptyCount = docs.filter((d) => !d.content.trim()).length
      const body = mdTotal === 0
        ? B.diagNoMd
        : `诊断：共发现 ${mdTotal} 篇 .md 文档，其中 ${emptyCount} 篇内容为空。请到「内容」面板确认，或反馈此信息。`
      return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>', B.noPreviewDoc, body)
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
      return wrap('<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5"><path d="M12 4 4 20h16L12 4Z"/><path d="M12 10v4M12 17v1"/></svg>', B.previewFailedTitle, `${B.previewFailedBody.replace('{msg}', esc(String((e as Error)?.message ?? e)))}<br><br><span style="font-size:12px;color:#999">${B.previewFailedHint}</span>`)
    }
  }, [cfg, docs, friends, series, kbSource, B])

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
   * 顶栏 segmented = Apple 分段控件式滑块（需求 N 第四轮定案）。
   *
   * 一条**常驻滑块**覆盖在选中项上；按住 tab 拖动时**只有滑块**跟手滑，
   * tab 文字与内容区一个像素都不动；松手滑块过渡滑到最近的 tab（拖过一半就切）。
   *
   * 博客与设置/知识库的差异（沿用第三轮结论）：
   *   1. **不挂预览区** —— 预览区是 iframe，pointer 事件被 iframe 吞掉，手势无法生效；
   *   2. **浮层表头不挂** —— 表头已有「甩丢停靠」拖拽手势，重叠会互相打架；
   *   3. **手势必须常驻可用**（`enabled: true`）—— 顶栏 segmented 始终可见，
   *      用户在该行左右滑就该切子面板；若跟 `panelOpen` 绑定，浮层默认收起时
   *      （`useState(false)`）滑动会完全无响应 —— 这正是「tab 栏滑不动」的根因。
   *
   * 只滑「组内」（DesignBrief §4.2 D2）：跨组会同时改 group + panel 两个状态，
   * 动画目标不唯一且语义跳跃大（主题 ↔ 高级），故跨组必须点 tab。
   * 组内只有 2 项时，到边后继续同向滑会被边界阻尼回弹 —— 预期行为。
   */
  const blogTabs = useTabStripThumb({
    index: Math.max(0, PANEL_GROUPS.find((g) => g.items.includes(panel))!.items.indexOf(panel)),
    count: PANEL_GROUPS.find((g) => g.items.includes(panel))!.items.length,
    // 顶栏 segmented **常驻可见** → 手势必须始终可用（不受浮层开合影响）
    enabled: true,
    onIndexChange: (next) => {
      const g = PANEL_GROUPS.find((x) => x.items.includes(panel))!
      setPanel(g.items[next])
    },
  })

  /**
   * 顶部**功能分组** tab（主题 / 数据 / 高级）= 同一套分段控件滑块（需求 N 第七轮）。
   *
   * 与组内子面板 segmented（`blogTabs`）的区别：这一层切的是**组** ——
   * 切组会连带换掉组内子面板并展开浮层，与点击语义一致
   * （点击时同组 = 开合浮层、异组 = 落组内首项并展开）。
   *
   * 「同组再点 = 收/展浮层」仍**只由 click 触发**：滑块落点回到原格时 hook
   * 不会回调 onIndexChange（`useSwipeTabs` 里 `targetIndex !== next.index` 判定），
   * 所以拖一下就松手（回到原格）不会把浮层误开。
   * 手势常驻可用：这一行始终可见，与浮层开合无关。
   */
  const groupTabs = useTabStripThumb({
    index: Math.max(0, PANEL_GROUPS.findIndex((g) => g.key === activeGroup.key)),
    count: PANEL_GROUPS.length,
    enabled: true,
    onIndexChange: (next) => {
      const g = PANEL_GROUPS[next]
      setPanel(g.items[0])
      setPanelOpen(true)
    },
  })

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
    if (!doc) { toast?.(B.notGenerated); return }
    try {
      const blob = new Blob([doc], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      toast?.(B.openPreviewFailed)
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
      breadcrumbs={[B.studio]}
      statusLeftItems={[{ content: B.studio }, { content: B.pendingCount.replace('{n}', String(docs.filter((d) => d.included).length)) }]}
      statusRightItems={[{ content: B.themeLabel.replace('{name}', isZh ? (THEME_MARKET.find((x) => x.key === cfg.themeKey)?.nameZh ?? cfg.themeKey) : (THEME_MARKET.find((x) => x.key === cfg.themeKey)?.nameEn ?? cfg.themeKey)) }, { content: cfg.theme === 'dark' ? B.darkMode : B.lightMode }, { content: t.welcome.cmdPalette, clickable: true, onClick: () => openCommandPalette() }]}
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
                toast?.(B.restoredAll)
              }}
            >
              查看全部笔记
            </button>
          </div>
        )}
        {/* 发布来源提示条：知识库跳转带来源时显示，可一键退回全部笔记 */}
        {kbSource && (
          <div className="aurora-blog-source-bar">
            <span className="aurora-blog-source-bar__label"><Icon.book size={14} /> {B.sourceLabel.replace('{name}', kbSource.name)}</span>
            <button className="aurora-blog-source-bar__clear" onClick={() => nav?.('blog')}>{B.viewAllNotes}</button>
          </div>
        )}
        {/* 顶部子栏：分组 tab（主题/数据/高级）+ 组内次级 segmented + 设备切换 */}
        <div className="aurora-blog__subbar">
          {/* 功能分组 tab = 分段控件滑块（需求 N 第七轮）：按住任一分组左右拖，
              只有滑块跟手走（可跨组直达），分组文字零位移；松手落到最近分组 */}
          <div
            className="aurora-blog__tabs"
            role="tablist"
            aria-label={B.ariaGroups}
            data-swiping={groupTabs.dragging || undefined}
            {...groupTabs.bind}
          >
            {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中，常驻） */}
            <div className="aurora-blog__tabs-track" ref={groupTabs.trackRef}>
              {/* 滑块：选中态的视觉承载者（选中底色/阴影已从 tab 迁到这里） */}
              <span className="aurora-blog__tabs-thumb" ref={groupTabs.thumbRef} aria-hidden="true" />
              {PANEL_GROUPS.map((g) => {
                const I = Icon[g.icon]
                const groupActive = activeGroup.key === g.key
                return (
                  <button
                    key={g.key}
                    type="button"
                    role="tab"
                    aria-selected={groupActive}
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
          </div>
          <div className="aurora-blog__subseg" role="tablist" aria-label={B.ariaSubTabs} data-swiping={blogTabs.dragging || undefined} {...blogTabs.bind}>
            {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中，常驻） */}
            <div className="aurora-blog__subseg-track" ref={blogTabs.trackRef}>
              {/* 滑块：选中态的视觉承载者（选中底色已从 tab 迁到这里） */}
              <span className="aurora-blog__subseg-thumb" ref={blogTabs.thumbRef} aria-hidden="true" />
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
          </div>
          <div className="aurora-blog__subbar-right">
            <div className="aurora-blog__device">
              {([{ k: 'desktop', i: 'desktop' as IconName, l: B.deviceDesktop }, { k: 'tablet', i: 'tablet' as IconName, l: B.deviceTablet }, { k: 'mobile', i: 'mobile' as IconName, l: B.deviceMobile }] as const).map((d) => {
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
            <span className="aurora-blog__panel-grip" title={B.gripTitle}><Icon.grip size={15} /></span>
          </div>
          {panelOpen && (
            /* 内容区：完全不参与滑动（需求 N 第四轮：内容区零位移） */
            <div className="aurora-blog__panelzone-body">
              {renderPanel()}
            </div>
          )}
        </div>

        {/* 中央预览区（占据剩余空间） */}
        <div className="aurora-blog__stage">
          <div className="aurora-blog__preview">
            <div className="aurora-blog__preview-stage">
              <div className={`aurora-blog__frame aurora-blog__frame--${device}`}>
                <iframe ref={previewIframeRef} title={B.previewTitle} srcDoc={previewFallback} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  )
}
