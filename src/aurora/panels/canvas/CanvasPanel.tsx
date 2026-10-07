import { useState, useCallback, useRef, useEffect, useMemo, type DragEvent as ReactDragEvent } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { ExcalidrawCanvas } from '@features/canvas-v2/engine/ExcalidrawCanvas'
import { CanvasEngineContext } from '@features/canvas-v2/engine/useCanvasEngine'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { unifiedCanvasBg } from '@features/canvas-v2/engine/engineUtils'
import {
  getCanvasList,
  loadCanvas,
  saveCanvas,
  createCanvas,
} from '@features/canvas-v2'
import type { CanvasDocument } from '@features/canvas-v2'
import { serializeCanvas } from '@features/canvas-v2'
import { useGridSnap } from '@features/canvas-v2/hooks/useGridSnap'
import AutoLayoutPanel from '@features/canvas-v2/components/AutoLayoutPanel'
import { exportCanvasJSON, exportCanvasPNG } from '@features/canvas-v2/utils/canvasExport'
import { syncCanvasLinks } from '@features/canvas-v2/utils/syncCanvasLinks'
import { generateCanvasThumbnail } from '@features/canvas-v2/utils/canvasThumbnail'
import { cardToNotePlan } from '@features/canvas-v2/utils/cardToNote'
import { loadKb } from '@stores/kbStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useKbStore } from '@stores/useKbStore'
import { findNode } from '@core/files/fileTree'
import { CanvasTopbar } from './CanvasTopbar'
import { CanvasDock } from './CanvasDock'
import { CanvasZoomControls } from './CanvasZoomControls'
import { CanvasInspectorPanel } from './CanvasInspectorPanel'
import { CanvasSidebarPanel, CANVAS_FILE_DRAG_MIME, CANVAS_FILE_DRAG_NAME_MIME, type TabId } from './CanvasSidebarPanel'
import { Icon } from '../../icons'
import { CanvasContextMenu } from './CanvasContextMenu'
import { CommandPalette, type CommandItem } from '../../components/command-palette/CommandPalette'
import { CanvasListMenu } from './CanvasListMenu'
import { RealCanvasView } from './RealCanvasView'
import { useEngineSnapshot } from './canvasHooks'
import { useEdgePanelIntent } from './useEdgePanelIntent'
import { useCanvasHotkeys } from './useCanvasHotkeys'
import { usePresence, usePresenceValue, POPOVER_EXIT_MS, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { useTheme } from '@features/themes/useTheme'
import { useLanguage } from '@stores/LanguageStore'
import '../../styles/panels/canvas.css'

/**
 * Aurora 白板视图面板 —— 重构：Aurora 界面外壳 + Excalidraw 真实引擎
 *
 * 界面 100% Aurora（顶栏/视图切换/Dock/缩放/检查器/命令面板/右键/列表/分享，
 * 复用 canvas.css 全套 Aurora 样式）；底层由 features/canvas-v2 的
 * ExcalidrawCanvas + CanvasEngine（tldraw 同形兼容层）驱动，canvasStore 持久化。
 * 4 个非自由视图（思维导图/看板/时间轴/仪表盘）复用真实引擎驱动视图
 * （features/canvas-v2/components/views/*，接收 CanvasEngine）。
 */
export type CanvasViewId = 'canvas' | 'mindmap' | 'kanban' | 'timeline'

export interface CanvasPanelProps {
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
  /** 由白板文件元素 / 命令触发：打开白板文件查看器（复用真实 KbNoteViewer） */
  onOpenFile?: (id: string) => void
  /** 由知识库「打开关联白板」带入：挂载即定位到该白板 */
  canvasId?: string
}

export function CanvasPanel({ nav, toast, onOpenFile, canvasId }: CanvasPanelProps) {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const CP = t.canvasPanel
  const { rootFolder, openFile, createFile } = useFileManager()
  // 只取稳定的 useCallback（[] 依赖），不要把整个 useKbStore() 对象放进 effect 依赖 ——
  // 该对象每次渲染都是新引用，会导致 effect 自激（每次 setOwningKb → 重渲染 → 再查库）。
  const { getKbsContainingCanvas } = useKbStore()
  // 默认白板名仅用于「新建」时刻；用 ref 读取，避免把本地化文案放进挂载 effect 依赖
  // （否则切换语言会重跑挂载逻辑、覆盖当前打开的文档）。
  const defaultCanvasNameRef = useRef(CP.defaultCanvas)
  defaultCanvasNameRef.current = CP.defaultCanvas
  const [engine, setEngine] = useState<CanvasEngine | null>(null)
  const [doc, setDoc] = useState<CanvasDocument | null>(null)
  // ExcalidrawCanvas initialDocument（doc 切换时用 key 重挂载重新载入）
  const [initialData, setInitialData] = useState<unknown>(null)
  const [docNonce, setDocNonce] = useState(0)
  const [view, setView] = useState<CanvasViewId>('canvas')
  // 边缘悬停召唤面板（对齐编辑器 v7）：默认两栏均隐藏，鼠标靠左/右缘滑入，移开收起；图钉可钉成常驻栏
  const [leftHover, setLeftHover] = useState(false)
  const [leftPinned, setLeftPinned] = useState(false)
  const [rightHover, setRightHover] = useState(false)
  const [rightPinned, setRightPinned] = useState(false)
  // 选区驱动的检视展开：选中便签/标签等可检视元素 → 自动展开「检视」并停留在属性 Tab；
  // 取消选中 → 自动折叠。与 hover/pin 并列，三者任一为真即显示（pin 常驻优先级最高）。
  const [rightSelectionOpen, setRightSelectionOpen] = useState(false)
  const leftShown = leftPinned || leftHover
  const rightShown = rightPinned || rightHover || rightSelectionOpen
  // 左栏初始 Tab（「文件便签」按钮要求直接打开到文件列表）
  const [leftInitialTab, setLeftInitialTab] = useState<TabId>('outline')
  // 空态引导「跳过」：点跳过视为已引导过，本会话内不再弹，同时解除首启锁定（正常进入白板）
  const [guideSkipped, setGuideSkipped] = useState(false)
  const closeLeft = useCallback(() => { setLeftHover(false); setLeftPinned(false) }, [])
  const closeRight = useCallback(() => { setRightHover(false); setRightPinned(false); setRightSelectionOpen(false) }, [])
  const [listOpen, setListOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // P3-B 归一：canvas ⌘K 面板直接复用主壳 CommandPalette（单一实现），
  // 引擎动作在本地构造为 CommandItem[]（engine 为面板局部实例，不入全局 registry）
  const canvasCommands = useMemo<CommandItem[]>(() => [
    { id: 'canvas.list', title: CP.cmdOpenList, icon: 'listTree', group: 'tools', keywords: ['list', '白板', '列表'], action: () => { setListOpen(true); setPaletteOpen(false) } },
    { id: 'canvas.view.canvas', title: CP.cmdViewCanvas, icon: 'frame', group: 'view', keywords: ['canvas', '白板'], action: () => setView('canvas') },
    { id: 'canvas.view.mindmap', title: CP.cmdViewMindmap, icon: 'frame', group: 'view', keywords: ['mindmap', '思维导图'], action: () => setView('mindmap') },
    { id: 'canvas.view.kanban', title: CP.cmdViewKanban, icon: 'frame', group: 'view', keywords: ['kanban', '看板'], action: () => setView('kanban') },
    { id: 'canvas.view.timeline', title: CP.cmdViewTimeline, icon: 'frame', group: 'view', keywords: ['timeline', '时间轴'], action: () => setView('timeline') },
    { id: 'canvas.tool.select', title: CP.cmdToolSelect, icon: 'target', group: 'tools', keywords: ['select', '选择'], action: () => engine?.setCurrentTool('select') },
    { id: 'canvas.tool.text', title: CP.cmdToolText, icon: 'type', group: 'tools', keywords: ['text', '文字'], action: () => engine?.setCurrentTool('text') },
    { id: 'canvas.tool.draw', title: CP.cmdToolDraw, icon: 'edit', group: 'tools', keywords: ['draw', '画笔'], action: () => engine?.setCurrentTool('draw') },
    { id: 'canvas.tool.arrow', title: CP.cmdToolArrow, icon: 'arrowR', group: 'tools', keywords: ['arrow', '连线'], action: () => engine?.setCurrentTool('arrow') },
    { id: 'canvas.undo', title: t.canvasDock.undo, icon: 'undo', group: 'edit', shortcut: ['Ctrl', 'Z'], keywords: ['undo', '撤销'], action: () => engine?.undo() },
    { id: 'canvas.redo', title: t.canvasDock.redo, icon: 'redo', group: 'edit', shortcut: ['Ctrl', '⇧', 'Z'], keywords: ['redo', '重做'], action: () => engine?.redo() },
    { id: 'canvas.fit', title: CP.cmdFitZoom, icon: 'frame', group: 'view', keywords: ['fit', '缩放', '适应'], action: () => engine?.zoomToFit() },
    { id: 'canvas.note', title: t.canvasDock.note, icon: 'file', group: 'file', keywords: ['note', '便签', '新建'], action: () => engine?.createCardFree('note-card', { text: t.canvasDock.newNoteDefault, color: '#F59E0B' }) },
  ], [engine, CP, t])
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)
  // 右键菜单退场相位（动效审计 P0-3）：setCtx(null) 后仍保留最后一份 x/y 播完 100ms 再卸载，
  // 于是菜单「从光标处长出来的，就缩回光标处」。
  const ctxMenu = usePresenceValue(ctx, POPOVER_EXIT_MS)
  // 所属知识库（反向查询 canvasIds）：挂载白板后解析，顶部显示可回跳
  const [owningKb, setOwningKb] = useState<{ id: string; name: string; folderId?: string } | null>(null)
  const saveTimer = useRef<number | null>(null)
  const docRef = useRef<CanvasDocument | null>(null)
  docRef.current = doc
  const engineRef = useRef<CanvasEngine | null>(null)
  engineRef.current = engine
  // 底层白板视口（子视图激活时承载透出的白板背景）
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const { getOutgoingLinks, indexVersion } = useLinkIndex()
  // 底部工具栏附加状态：网格吸附 / 自动同步 / 自动布局弹层
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false)
  const [autoSync, setAutoSync] = useState(false)
  const [autoLayoutOpen, setAutoLayoutOpen] = useState(false)

  // 网格吸附（真实引擎 hook）：更多菜单「网格吸附」切换
  useGridSnap(engine, gridSnapEnabled, 20)

  // 挂载：优先定位到 canvasId（由知识库关联白板带入）；否则加载最近白板（无则新建「默认白板」）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (canvasId) {
          const d = await loadCanvas(canvasId)
          if (d && alive) {
            setDoc(d)
            setInitialData(d.data)
            return
          }
        }
        const list = await getCanvasList()
        if (!alive) return
        const target = list.length > 0 ? list[0] : null
        const d = target ? await loadCanvas(target.id) : await createCanvas(defaultCanvasNameRef.current)
        if (d && alive) {
          setDoc(d)
          setInitialData(d.data)
        }
      } catch {
        /* 降级为空白白板 */
      }
    })()
    return () => {
      alive = false
    }
  }, [canvasId])

  // 反向解析所属知识库（canvasIds），供顶部「所属知识库」芯片回跳
  useEffect(() => {
    let alive = true
    if (!doc?.id) { setOwningKb(null); return }
    (async () => {
      try {
        const ids = await getKbsContainingCanvas(doc.id)
        if (!alive || ids.length === 0) { setOwningKb(null); return }
        const kb = await loadKb(ids[0])
        if (alive && kb) setOwningKb({ id: kb.id, name: kb.name, folderId: kb.folderId })
      } catch {
        setOwningKb(null)
      }
    })()
    return () => { alive = false }
  }, [doc?.id, getKbsContainingCanvas])

  // 打开指定白板：重新载入文档并重挂载引擎
  const openCanvas = useCallback(async (id: string) => {
    const d = await loadCanvas(id)
    if (!d) return
    setDoc(d)
    setInitialData(d.data)
    setDocNonce((n) => n + 1)
    setListOpen(false)
  }, [])

  // 4 界面统一底色随主题（单源 = desktop-chrome.css --canvas-unified-bg）：
  // 暗色档 = §18 桌面原生暗色基线 #0D0F15；浅色档 = Excalidraw 标准白 #FFFFFF。
  // 白板底色由 unifiedInitialData 注入 Excalidraw 挂载即生效；子视图根背景由下方
  // effect 强制为同一常量，白板 / 思维导图 / 看板 / 时间轴 4 界面逐像素同色。
  // 每次渲染重取（主题切换 → useTheme 重渲染 → 取到新 token 值）。
  const CANVAS_UNIFIED_BG = unifiedCanvasBg()

  const handleReady = useCallback((e: CanvasEngine) => {
    setEngine(e)
  }, [])

  // 统一白板底色：在持久化文档的 initialData 中注入 viewBackgroundColor，
  // 使 Excalidraw 挂载即带正确底色（比 updateScene 更稳，不会被持久化场景的旧值回退覆盖）。
  const unifiedInitialData = useMemo(() => {
    if (!initialData) return { appState: { viewBackgroundColor: CANVAS_UNIFIED_BG } }
    const base = initialData as { appState?: Record<string, unknown> }
    return {
      ...base,
      appState: { ...(base.appState ?? {}), viewBackgroundColor: CANVAS_UNIFIED_BG },
    }
  }, [initialData, CANVAS_UNIFIED_BG])

  // 子视图激活时，底层 Excalidraw 的 .excalidraw 根 div 背景直接强制为统一暗色常量
  // （不读 getAppState().viewBackgroundColor，避免被持久化场景的白值覆盖）。canvas 内容层
  // 已被 CSS 隐藏，仅根背景可见，故子视图背景与白板视图逐像素同色（§18 桌面原生暗色基线）。
  useEffect(() => {
    const el = viewportRef.current?.querySelector<HTMLElement>('.excalidraw')
    if (!el) return
    el.style.backgroundColor = view === 'canvas' ? '' : CANVAS_UNIFIED_BG
  }, [view, engine, CANVAS_UNIFIED_BG])

  // 主题切换时，白板视图的 Excalidraw 场景底色实时跟随
  // （viewBackgroundColor 在挂载时经 initialData 注入，切主题后需显式 updateScene；
  //  仅改 appState 不动 elements → 场景指纹不变，不会误提交历史）。
  useEffect(() => {
    const api = engine?.excalidrawAPI
    if (!api) return
    try { api.updateScene({ appState: { viewBackgroundColor: CANVAS_UNIFIED_BG } }) } catch { /* noop */ }
  }, [engine, CANVAS_UNIFIED_BG])

  // 空场景检测：仅「白板整体确实没有任何内容」时才显示「空白白板」引导。
  // 判定必须是「白板整体」而非「只看自由白板场景」——便签（note-card）与思维导图 /
  // 看板 / 时间轴的结构化节点走卡片体系（shapesAtom），未必以未删除场景图元形式存在于
  // 自由白板场景；若只看场景，则自由白板为空但白板已有内容时，会每次进入都误弹空态。
  // 兜底用 false（「未知即非空」）：引擎未就绪（useEngineSnapshot 返回 undefined）时绝不显示。
  const isCanvasEmpty = useEngineSnapshot(
    engine,
    (e) => {
      const api = e.excalidrawAPI
      if (!api) return undefined // 引擎就绪但 API 尚未挂载 → 未知，不显示
      // 1) 自由白板场景本身有任意未删除图元 → 非空
      const els = api.getSceneElements?.() ?? []
      if (els.some((x) => x && !x.isDeleted)) return false
      // 2) 场景为空时，再检查卡片体系是否已有内容（便签 / 结构化视图节点）；有则不算空白
      const shapes = e.getCurrentPageShapes?.() ?? []
      return shapes.length === 0
    },
    'document',
  ) ?? false

  // 锁定态：白板整体为空（没有任何便签 / 文件便签）时进入首启锁定——
  // 隐藏底部 Dock、禁用左右栏边缘悬停召唤与思维导图/看板/时间轴切换，
  // 仅保留空态引导的「新建便签 / 文件便签」两个入口。
  // 用户点「跳过」后视为已引导，锁定随之解除，可正常进入白板。
  const locked = isCanvasEmpty && !guideSkipped

  // 退场相位（动效审计 P1-5）：面板悬浮栏关闭时不再瞬时卸载，先播 180ms 沿原路滑出
  // （入场 420ms ↔ 退场 180ms = Modal 同一进出比例）。可中断 —— hover 重新召回立即回 open。
  const leftOverlay = usePresence(leftShown, OVERLAY_EXIT_MS)
  const rightOverlay = usePresence(rightShown && !locked, OVERLAY_EXIT_MS)

  // 选区签名订阅（仅非箭头可检视元素）：驱动检视面板的自动展开/折叠。
  // 选中（便签/标签等）→ 展开；取消选中（签名为空）→ 折叠。
  // 与右侧 hover/pin 是独立来源，二者皆空且未钉住时才真正收起。
  const selectionSig = useEngineSnapshot(
    engine,
    (e) => {
      const ids = e.getSelectedShapeIds()
      if (ids.length === 0) return ''
      const shapes = e.getCurrentPageShapes?.() ?? []
      const real = ids.filter((id) => shapes.some((s) => s.id === id && s.type !== 'arrow'))
      return real.join('|')
    },
    'session',
  ) ?? ''
  useEffect(() => {
    setRightSelectionOpen(selectionSig.length > 0)
  }, [selectionSig])

  // —— 边缘 hover 防误触（hover-intent，对齐编辑器 v7 手感）——
  // 鼠标靠到缘侧需「停留」才滑入面板；快速掠过 / 误触被取消；浮层覆盖区允许从容跨入，
  // 离开后延迟收起（期间回到任一处即取消收起）。已钉住时不收起；锁定（locked）时停用。
  // 手势细节（220ms 意图窗口 / 180ms 关闭延迟 / 定时器清理）单源在 useEdgePanelIntent。
  const leftIntent = useEdgePanelIntent(setLeftHover, locked, leftPinned)
  const rightIntent = useEdgePanelIntent(setRightHover, locked, rightPinned)

  // ─── 同步笔记链接（旧 BottomBar「同步」/ 自动同步；适配引擎 API）───
  // 忽略列表 / 期望边推导 / 箭头增删的编排逻辑单源在 utils/syncCanvasLinks（纯函数，可测）；
  // 本回调只做引擎/文档取值与结果播报。

  const syncLinks = useCallback(async () => {
    const editor = engineRef.current
    const cur = docRef.current
    if (!editor || !cur) return
    const { added, removed } = await syncCanvasLinks({
      engine: editor,
      docId: cur.id,
      rootFolder,
      getOutgoingLinks,
    })
    if (added === 0 && removed === 0) {
      toast?.(CP.linksUpToDate)
    } else {
      toast?.(CP.syncDone.replace(String.raw`{added}`, String(added)).replace(String.raw`{removed}`, String(removed)))
    }
  }, [rootFolder, getOutgoingLinks, toast, CP])

  // 自动同步：链接索引变化时自动同步（对齐旧 autoSync effect）
  useEffect(() => {
    if (!autoSync || !engineRef.current) return
    const t = window.setTimeout(() => void syncLinks(), 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, indexVersion])

  // ─── 缩略图（P2-2）：保存后节流生成场景小图 → 列表封面 ───
  // 导出与 upsert 细节单源在 utils/canvasThumbnail；本回调只做 5s 节流判定
  const lastThumb = useRef(0)
  const refreshThumbnail = useCallback(async (docId: string) => {
    const editor = engineRef.current
    if (!editor?.excalidrawAPI) return
    const now = Date.now()
    if (now - lastThumb.current < 5000) return // 5s 节流，避免保存热路径频繁导出
    lastThumb.current = now
    await generateCanvasThumbnail(editor, docId)
  }, [])

  // 自动保存：引擎 document 变化 → 800ms 防抖 → serializeCanvas + saveCanvas
  useEffect(() => {
    if (!engine || !doc) return
    // 立即落盘挂起的保存。注意用**本次 effect 捕获的** engine/doc，而非 docRef.current ——
    // 切文档后 docRef 已指向新文档，用它会「把旧场景写进新文档」。
    const flush = () => {
      if (!saveTimer.current) return
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
      try {
        const data = serializeCanvas(engine)
        void saveCanvas({ ...doc, data, updatedAt: Date.now() })
      } catch {
        /* 引擎可能已销毁（卸载路径）：忽略 */
      }
    }
    const unsub = engine.store.listen(
      () => {
        if (saveTimer.current) window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => {
          saveTimer.current = null
          const data = serializeCanvas(engine)
          void saveCanvas({ ...doc, data, updatedAt: Date.now() })
          void refreshThumbnail(doc.id)
        }, 800)
      },
      { scope: 'document' },
    )
    return () => {
      unsub()
      // 卸载/切文档：把挂起的保存立即落盘（否则 800ms 窗口内的编辑被静默丢弃）
      flush()
    }
  }, [engine, doc, refreshThumbnail])

  // 键盘：⌘K 命令面板 / Delete 删除 / Ctrl+Z·Y 撤销重做 / Escape 关闭浮层
  // capture 阶段监听（细节单源在 useCanvasHotkeys）；本组件只提供开合动作
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), [])
  const closeOverlays = useCallback(() => { setCtx(null); setPaletteOpen(false) }, [])
  useCanvasHotkeys(paletteOpen, engineRef, togglePalette, closeOverlays)

  // 打开白板上的笔记卡片：默认跳转编辑器打开（镜像知识图谱范本），
  // 仅当外部显式传入 onOpenFile（嵌入式场景）时才交给外部处理
  const handleOpenFile = useCallback((id: string) => {
    if (onOpenFile) {
      onOpenFile(id)
      return
    }
    openFile(id)
    nav?.('editor')
  }, [onOpenFile, openFile, nav])

  // 空状态引导区：快捷新建一张便签
  // 落点对齐视口左上；若与已有卡片重叠则自动向右下偏移，避免后建的便签遮挡先建的
  const addQuickNote = useCallback(() => {
    const eng = engineRef.current
    if (!eng) return
    eng.createCardFree('note-card', { text: t.canvasDock.newNoteDefault, color: '#F59E0B' })
  }, [t.canvasDock.newNoteDefault])

  // 从「文件」Tab 拖拽文件到白板：生成带 fileId 的 note-card（落点居中于光标），点击即跳编辑器
  const handleDropFile = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    const fileId = e.dataTransfer.getData(CANVAS_FILE_DRAG_MIME)
    if (!fileId) return
    e.preventDefault()
    const eng = engineRef.current
    if (!eng) return
    const name = e.dataTransfer.getData(CANVAS_FILE_DRAG_NAME_MIME) || findNode(rootFolder, fileId)?.name || CP.noteWord
    const p = eng.screenToPage({ x: e.clientX, y: e.clientY })
    eng.createShape({
      type: 'note-card',
      x: p.x - 130,
      y: p.y - 100,
      props: { text: name.replace(/\.md$/i, ''), color: '#06B6D4', fileId },
    })
    toast?.(CP.insertedNote.replace(String.raw`{name}`, name))
  }, [rootFolder, toast, CP])

  // ─── 转为笔记：把选中的自由便签（无 fileId 的 note-card）全文落成真实笔记文件 ───
  // 文件建在根目录（openAfterCreate=false：留在白板不打断），新文件 id 回写绑定到卡片
  // → 卡片原地升级为「文件便签」：点卡跳编辑器 / 改首行标题同步文件名 / 参与「同步笔记链接」。
  // 命名/去重规划在 cardToNotePlan（纯函数，含单测）；本回调只做编排（引擎读写 + FileStore + toast）。
  const convertSelectedNotes = useCallback(() => {
    const eng = engineRef.current
    if (!eng) return
    // 只取「未绑文件」的便签；已绑文件的是笔记替身，无需也无法转换
    const cards = eng
      .getSelectedShapeIds()
      .flatMap((id) => {
        const s = eng.getShape(id)
        return s && s.type === 'note-card' && !s.props.fileId ? [s] : []
      })
    if (cards.length === 0) return
    // 占位集合 = 根目录已有节点名 + 本批次已创建名（大小写不敏感去重在 plan 内做）
    const taken = new Set((rootFolder.children ?? []).map((c) => c.name))
    let converted = 0
    for (const card of cards) {
      const plan = cardToNotePlan(String(card.props.text ?? ''), taken)
      const fileId = createFile(rootFolder.id, plan.fileName, plan.content, false)
      if (!fileId) continue
      eng.updateShape({ id: card.id, props: { fileId } })
      taken.add(plan.fileName)
      converted++
    }
    toast?.(converted > 0 ? CP.convertedNotes.replace('{n}', String(converted)) : CP.convertFailed)
  }, [rootFolder, createFile, toast, CP])

  // ─── 导出当前白板：PNG（Excalidraw 场景）+ JSON（完整数据，可再导入）───
  const handleExport = useCallback(async () => {
    const editor = engineRef.current
    const cur = docRef.current
    if (!editor || !cur) {
      toast?.(CP.notReadyExport)
      return
    }
    const base = cur.name || CP.canvasWord
    const pngOk = await exportCanvasPNG(editor, `${base}.png`)
    exportCanvasJSON(editor, `${base}.json`)
    toast?.(pngOk
      ? CP.exportedPngJson.replace(String.raw`{base}`, base)
      : CP.exportedJsonOnly.replace(String.raw`{base}`, base))
  }, [toast, CP])

  return (
    <PageFrame
      sidebarGroups={buildAuroraSidebarGroups(t)}
      sidebarActiveId="canvas"
      onSidebarSelect={(id) => nav?.(resolveAuroraNav(id))}
      breadcrumbs={owningKb ? [CP.canvasWord, owningKb.name, doc?.name ?? CP.canvasWord] : [CP.canvasWord, doc?.name ?? CP.canvasWord]}
    >
      <CanvasEngineContext.Provider value={engine}>
        <div className="aurora-canvas">
          <CanvasTopbar
            view={view}
            onView={setView}
            canvasName={doc?.name ?? ''}
            onOpenList={() => setListOpen(true)}
            onExport={handleExport}
            locked={locked}
            owningKb={owningKb}
            onOpenOwningKb={() => owningKb && nav?.('kb', owningKb.id)}
          />

          <div className="aurora-canvas__row">
            {/* 左栏（大纲/历史）：可折叠，独立于书脊；引擎就绪后渲染 */}
            {engine && (
            <div
              className={`aurora-canvas__hoverzone aurora-canvas__hoverzone--left ${leftPinned ? 'is-pinned' : ''}`}
              onMouseEnter={leftIntent.openIntent}
              onMouseLeave={leftIntent.closeIntent}
            >
              {!locked && <div className="aurora-canvas__edge aurora-canvas__edge--left" aria-hidden />}
              {leftOverlay.mounted && (
                <div
                  className="aurora-canvas__overlay aurora-canvas__overlay--left"
                  data-exiting={leftOverlay.exiting || undefined}
                  onMouseEnter={leftIntent.cancelClose}
                  onMouseLeave={leftIntent.scheduleClose}
                >
                  <div className="aurora-canvas__overlay-head">
                    <span className="aurora-canvas__overlay-title">{CP.browseTitle}</span>
                    <div className="aurora-canvas__overlay-actions">
                      <button
                        type="button"
                        className={`aurora-canvas__pin ${leftPinned ? 'is-on' : ''}`}
                        onClick={() => setLeftPinned((p) => !p)}
                        aria-label={leftPinned ? CP.unpinBrowse : CP.pinBrowse}
                        title={leftPinned ? CP.unpin : CP.pin}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                      </button>
                      <button
                        type="button"
                        className="aurora-canvas__overlay-close"
                        onClick={closeLeft}
                        aria-label={CP.collapseBrowse}
                        title={CP.collapse}
                      >
                        <Icon.chevronLeft size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="aurora-canvas__overlay-body">
                    <CanvasSidebarPanel engine={engine} onOpenFile={handleOpenFile} initialTab={leftInitialTab} />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 内容区 */}
            <div className="aurora-canvas__main">
              {/* 底层：白板始终挂载，子视图浮于其上；切换子视图瞬时回到白板，不卸载 */}
              <div
                ref={viewportRef}
                className={`aurora-canvas__viewport${view !== 'canvas' ? ' aurora-canvas__viewport--behind' : ''}`}
                onDragOver={(e) => {
                  // 仅当拖拽源是白板「文件」Tab 时才允许放置（自定义 MIME），
                  // 避免拦截 Excalidraw 原生的图片等拖放行为。
                  if (e.dataTransfer.types.includes(CANVAS_FILE_DRAG_MIME)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                  }
                }}
                onDrop={handleDropFile}
                onContextMenu={(e) => {
                  // 白板右键菜单只属于白板视口：工具栏/顶栏/侧栏/检查器等 chrome 区域
                  // 右键不再触发（事件不再冒泡到根容器弹菜单）
                  e.preventDefault()
                  setCtx({ x: e.clientX, y: e.clientY })
                }}
              >
                <ExcalidrawCanvas
                  key={`${doc?.id ?? 'blank'}-${docNonce}`}
                  onReady={handleReady}
                  initialDocument={unifiedInitialData}
                  theme={theme}
                />
              </div>

              {/* 子视图浮层（仅非自由视图）：白板作为背景保留，底部 dock 隐藏 */}
              {view !== 'canvas' && (
                <RealCanvasView
                  key={`view-${view}-${doc?.id ?? ''}`}
                  view={view}
                  onClose={() => setView('canvas')}
                />
              )}

              {/* 空状态引导：仅自由白板视图、且无任何元素时显示；容器不拦截交互，卡片按钮可点 */}
              {view === 'canvas' && isCanvasEmpty && !guideSkipped && (
                <div className="aurora-canvas__empty">
                  <div className="aurora-canvas__empty-inner">
                  <div className="aurora-canvas__empty-title">{CP.emptyTitle}</div>
                  <div className="aurora-canvas__empty-sub">{CP.emptySub}</div>
                  <div className="aurora-canvas__empty-actions">
                    <button type="button" className="aurora-canvas__empty-btn aurora-canvas__empty-btn--primary" onClick={addQuickNote}>
                      <Icon.edit size={15} /> {CP.emptyNewNote}
                    </button>
                    <button type="button" className="aurora-canvas__empty-btn" onClick={() => { setLeftInitialTab('files'); setLeftPinned(true) }}>
                      <Icon.fileText size={15} /> {CP.emptyFileNote}
                    </button>
                  </div>
                  <button type="button" className="aurora-canvas__empty-skip" onClick={() => setGuideSkipped(true)}>
                    {CP.emptySkip}
                  </button>
                  </div>
                </div>
              )}

              {/* rightPanelOpen = 右栏浮层挂载中（含退场相位）：缩放控件整体左移避让，不与检视浮层重叠 */}
              {engine && view === 'canvas' && (
                <CanvasZoomControls engine={engine} rightPanelOpen={rightOverlay.mounted} />
              )}
              {engine && view === 'canvas' && !locked && (
                <CanvasDock
                  engine={engine}
                  toast={toast}
                  onSync={() => void syncLinks()}
                  autoSync={autoSync}
                  onToggleAutoSync={() => setAutoSync((v) => !v)}
                  gridSnapEnabled={gridSnapEnabled}
                  onToggleGrid={() => setGridSnapEnabled((v) => !v)}
                  onAutoLayout={() => setAutoLayoutOpen(true)}
                />
              )}
            </div>

            {/* 右栏（检视）：可折叠，与左栏同交互（折叠=右缘竖条按钮，展开=280px 面板）；引擎就绪后渲染 */}
            {engine && (
            <div
              className={`aurora-canvas__hoverzone aurora-canvas__hoverzone--right ${rightPinned ? 'is-pinned' : ''}`}
              onMouseEnter={rightIntent.openIntent}
              onMouseLeave={rightIntent.closeIntent}
            >
              {!locked && <div className="aurora-canvas__edge aurora-canvas__edge--right" aria-hidden />}
              {rightOverlay.mounted && (
                <div
                  className="aurora-canvas__overlay aurora-canvas__overlay--right"
                  data-exiting={rightOverlay.exiting || undefined}
                  onMouseEnter={rightIntent.cancelClose}
                  onMouseLeave={rightIntent.scheduleClose}
                >
                  <div className="aurora-canvas__overlay-head">
                    <div className="aurora-canvas__overlay-actions aurora-canvas__overlay-actions--left">
                      <button
                        type="button"
                        className="aurora-canvas__overlay-close"
                        onClick={closeRight}
                        aria-label={CP.collapseInspect}
                        title={CP.collapse}
                      >
                        <Icon.chevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        className={`aurora-canvas__pin ${rightPinned ? 'is-on' : ''}`}
                        onClick={() => setRightPinned((p) => !p)}
                        aria-label={rightPinned ? CP.unpinInspect : CP.pinInspect}
                        title={rightPinned ? CP.unpin : CP.pin}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                      </button>
                    </div>
                    <span className="aurora-canvas__overlay-title">{CP.inspectTitle}</span>
                  </div>
                  <div className="aurora-canvas__overlay-body">
                    <CanvasInspectorPanel engine={engine} />
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </CanvasEngineContext.Provider>

      {/* 浮层：命令面板 / 白板列表 / 分享 / 右键菜单 */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={canvasCommands}
      />

      {listOpen && (
        <CanvasListMenu
          open={listOpen}
          currentId={doc?.id ?? ''}
          onClose={() => setListOpen(false)}
          onOpen={openCanvas}
          onCreate={async (name) => {
            const d = await createCanvas(name || t.canvasList.untitled)
            await openCanvas(d.id)
          }}
          toast={toast}
        />
      )}

      {/* 自动布局（真实引擎驱动面板） */}
      {autoLayoutOpen && engine && (
        <AutoLayoutPanel editor={engine} onClose={() => setAutoLayoutOpen(false)} />
      )}

      {ctxMenu.mounted && ctxMenu.value && (
        <CanvasContextMenu
          x={ctxMenu.value.x}
          y={ctxMenu.value.y}
          engine={engine}
          onConvertToNote={convertSelectedNotes}
          exiting={ctxMenu.exiting}
          onClose={() => setCtx(null)}
        />
      )}
    </PageFrame>
  )
}
