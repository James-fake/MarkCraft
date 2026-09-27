import { useState, useCallback, useRef, useEffect, useMemo, type DragEvent as ReactDragEvent } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { ExcalidrawCanvas } from '@features/canvas-v2/engine/ExcalidrawCanvas'
import { CanvasEngineContext } from '@features/canvas-v2/engine/useCanvasEngine'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import {
  getCanvasList,
  loadCanvas,
  saveCanvas,
  createCanvas,
  upsertCanvasThumbnail,
} from '@features/canvas-v2'
import type { CanvasDocument } from '@features/canvas-v2'
import { serializeCanvas } from '@features/canvas-v2'
import { useGridSnap } from '@features/canvas-v2/hooks/useGridSnap'
import { getIgnoredLinks } from '@features/canvas-v2/store/ignoredLinks'
import { RELATION_TYPES } from '@features/canvas-v2/theme/canvasTheme'
import AutoLayoutPanel from '@features/canvas-v2/components/AutoLayoutPanel'
import { exportCanvasJSON, exportCanvasPNG } from '@features/canvas-v2/utils/canvasExport'
import { cardToNotePlan } from '@features/canvas-v2/utils/cardToNote'
import { loadKb } from '@stores/kbStore'
import { inferRelationType } from '@features/canvas-v2/utils/relationInfer'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useKbStore } from '@stores/useKbStore'
import type { FileNode } from '@src/types/fileManager'
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
import { usePresence, usePresenceValue, POPOVER_EXIT_MS, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { useTheme } from '@features/themes/useTheme'
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
  const { rootFolder, openFile, createFile } = useFileManager()
  const kbStore = useKbStore()
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
    { id: 'canvas.list', title: '打开白板列表', icon: 'listTree', group: 'tools', keywords: ['list', '白板', '列表'], action: () => { setListOpen(true); setPaletteOpen(false) } },
    { id: 'canvas.view.canvas', title: '自由白板', icon: 'frame', group: 'view', keywords: ['canvas', '白板'], action: () => setView('canvas') },
    { id: 'canvas.view.mindmap', title: '思维导图视图', icon: 'frame', group: 'view', keywords: ['mindmap', '思维导图'], action: () => setView('mindmap') },
    { id: 'canvas.view.kanban', title: '看板视图', icon: 'frame', group: 'view', keywords: ['kanban', '看板'], action: () => setView('kanban') },
    { id: 'canvas.view.timeline', title: '时间轴视图', icon: 'frame', group: 'view', keywords: ['timeline', '时间轴'], action: () => setView('timeline') },
    { id: 'canvas.tool.select', title: '工具：选择', icon: 'target', group: 'tools', keywords: ['select', '选择'], action: () => engine?.setCurrentTool('select') },
    { id: 'canvas.tool.text', title: '工具：文字', icon: 'type', group: 'tools', keywords: ['text', '文字'], action: () => engine?.setCurrentTool('text') },
    { id: 'canvas.tool.draw', title: '工具：画笔', icon: 'edit', group: 'tools', keywords: ['draw', '画笔'], action: () => engine?.setCurrentTool('draw') },
    { id: 'canvas.tool.arrow', title: '工具：连线', icon: 'arrowR', group: 'tools', keywords: ['arrow', '连线'], action: () => engine?.setCurrentTool('arrow') },
    { id: 'canvas.undo', title: '撤销', icon: 'undo', group: 'edit', shortcut: ['Ctrl', 'Z'], keywords: ['undo', '撤销'], action: () => engine?.undo() },
    { id: 'canvas.redo', title: '重做', icon: 'redo', group: 'edit', shortcut: ['Ctrl', '⇧', 'Z'], keywords: ['redo', '重做'], action: () => engine?.redo() },
    { id: 'canvas.fit', title: '适应缩放', icon: 'frame', group: 'view', keywords: ['fit', '缩放', '适应'], action: () => engine?.zoomToFit() },
    { id: 'canvas.note', title: '新建便签', icon: 'file', group: 'file', keywords: ['note', '便签', '新建'], action: () => engine?.createCardFree('note-card', { text: '新便签', color: '#F59E0B' }) },
  ], [engine])
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
        const d = target ? await loadCanvas(target.id) : await createCanvas('默认白板')
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
        const ids = await kbStore.getKbsContainingCanvas(doc.id)
        if (!alive || ids.length === 0) { setOwningKb(null); return }
        const kb = await loadKb(ids[0])
        if (alive && kb) setOwningKb({ id: kb.id, name: kb.name, folderId: kb.folderId })
      } catch {
        setOwningKb(null)
      }
    })()
    return () => { alive = false }
  }, [doc?.id, kbStore])

  // 打开指定白板：重新载入文档并重挂载引擎
  const openCanvas = useCallback(async (id: string) => {
    const d = await loadCanvas(id)
    if (!d) return
    setDoc(d)
    setInitialData(d.data)
    setDocNonce((n) => n + 1)
    setListOpen(false)
  }, [])

  // 4 界面统一底色 = Aurora 暗色白板底 #0D0F15（§18 桌面原生暗色基线）。
  // 白板暗色由 unifiedInitialData 注入 Excalidraw 挂载即生效；子视图根背景由下方
  // effect 强制为同一常量，白板 / 思维导图 / 看板 / 时间轴 4 界面逐像素同色。
  const CANVAS_UNIFIED_BG = '#0D0F15'

  const handleReady = useCallback((e: CanvasEngine) => {
    setEngine(e)
  }, [])

  // 统一白板底色：在持久化文档的 initialData 中注入 viewBackgroundColor=#0D0F15，
  // 使 Excalidraw 挂载即暗（比 updateScene 更稳，不会被持久化场景的白值回退覆盖）。
  const unifiedInitialData = useMemo(() => {
    if (!initialData) return { appState: { viewBackgroundColor: CANVAS_UNIFIED_BG } }
    const base = initialData as { appState?: Record<string, unknown> }
    return {
      ...base,
      appState: { ...(base.appState ?? {}), viewBackgroundColor: CANVAS_UNIFIED_BG },
    }
  }, [initialData])

  // 子视图激活时，底层 Excalidraw 的 .excalidraw 根 div 背景直接强制为统一暗色常量
  // （不读 getAppState().viewBackgroundColor，避免被持久化场景的白值覆盖）。canvas 内容层
  // 已被 CSS 隐藏，仅根背景可见，故子视图背景与白板视图逐像素同色（§18 桌面原生暗色基线）。
  useEffect(() => {
    const el = viewportRef.current?.querySelector<HTMLElement>('.excalidraw')
    if (!el) return
    el.style.backgroundColor = view === 'canvas' ? '' : CANVAS_UNIFIED_BG
  }, [view, engine])

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
  // 鼠标靠到缘侧需“停留”约 HOVER_INTENT_MS 才滑入面板；快速掠过 / 误触会在到期前离开而被取消，
  // 不再一碰边缘就弹出。浮层覆盖区允许从容跨入：离开触发条/浮层延迟 HOVER_CLOSE_DELAY_MS 才收起，
  // 期间回到任一处即取消收起，打断「收起→触发条重现→再展开」的抖动循环。
  // 已钉住（pinned）时无需 hover，离开也不收起；空白板引导锁定（locked）时整组交互停用。
  const HOVER_INTENT_MS = 220
  const HOVER_CLOSE_DELAY_MS = 180
  const leftHoverTimer = useRef<number | null>(null)
  const leftCloseTimer = useRef<number | null>(null)
  const rightHoverTimer = useRef<number | null>(null)
  const rightCloseTimer = useRef<number | null>(null)
  const cancelLeftClose = useCallback(() => {
    if (leftCloseTimer.current) { window.clearTimeout(leftCloseTimer.current); leftCloseTimer.current = null }
  }, [])
  const cancelRightClose = useCallback(() => {
    if (rightCloseTimer.current) { window.clearTimeout(rightCloseTimer.current); rightCloseTimer.current = null }
  }, [])
  const openLeftIntent = useCallback(() => {
    if (locked || leftPinned) return
    if (leftHoverTimer.current) window.clearTimeout(leftHoverTimer.current)
    cancelLeftClose()
    leftHoverTimer.current = window.setTimeout(() => setLeftHover(true), HOVER_INTENT_MS)
  }, [locked, leftPinned, cancelLeftClose])
  const scheduleLeftClose = useCallback(() => {
    if (locked || leftPinned) return
    if (leftCloseTimer.current) window.clearTimeout(leftCloseTimer.current)
    leftCloseTimer.current = window.setTimeout(() => setLeftHover(false), HOVER_CLOSE_DELAY_MS)
  }, [locked, leftPinned])
  const closeLeftIntent = useCallback(() => {
    if (leftHoverTimer.current) { window.clearTimeout(leftHoverTimer.current); leftHoverTimer.current = null }
    scheduleLeftClose()
  }, [scheduleLeftClose])
  const openRightIntent = useCallback(() => {
    if (locked || rightPinned) return
    if (rightHoverTimer.current) window.clearTimeout(rightHoverTimer.current)
    cancelRightClose()
    rightHoverTimer.current = window.setTimeout(() => setRightHover(true), HOVER_INTENT_MS)
  }, [locked, rightPinned, cancelRightClose])
  const scheduleRightClose = useCallback(() => {
    if (locked || rightPinned) return
    if (rightCloseTimer.current) window.clearTimeout(rightCloseTimer.current)
    rightCloseTimer.current = window.setTimeout(() => setRightHover(false), HOVER_CLOSE_DELAY_MS)
  }, [locked, rightPinned])
  const closeRightIntent = useCallback(() => {
    if (rightHoverTimer.current) { window.clearTimeout(rightHoverTimer.current); rightHoverTimer.current = null }
    scheduleRightClose()
  }, [scheduleRightClose])
  // 卸载时清理挂起的 hover 定时器，避免泄漏
  useEffect(() => () => {
    if (leftHoverTimer.current) window.clearTimeout(leftHoverTimer.current)
    if (rightHoverTimer.current) window.clearTimeout(rightHoverTimer.current)
    if (leftCloseTimer.current) window.clearTimeout(leftCloseTimer.current)
    if (rightCloseTimer.current) window.clearTimeout(rightCloseTimer.current)
  }, [])

  // ─── 同步笔记链接（旧 BottomBar「同步」/ 自动同步；适配引擎 API）───
  // 关系推断统一走 utils/relationInfer（纯函数，可测；保证落在 RELATION_TYPES.id 集合内）

  const syncLinks = useCallback(async () => {
    const editor = engineRef.current
    const cur = docRef.current
    if (!editor || !cur) return
    // 忽略列表
    let ignoredSet = new Set<string>()
    try {
      const ignored = await getIgnoredLinks(cur.id)
      ignoredSet = new Set(ignored.map((l) => `${l.fromFileId}>${l.toFileId}`))
    } catch { /* 忽略列表加载失败按空处理 */ }

    const shapes = editor.getCurrentPageShapes()
    const noteCards = shapes.filter((s) => s.type === 'note-card')
    const fileToCard = new Map<string, string>()
    for (const card of noteCards) if (card.props.fileId) fileToCard.set(card.props.fileId, card.id)

    const nameToFileId = new Map<string, string>()
    const walk = (node: FileNode) => {
      if (node.name && node.id) nameToFileId.set(node.name.replace(/\.md$/, ''), node.id)
      if (node.children) for (const c of node.children) walk(c)
    }
    walk(rootFolder)

    // 期望边（排除忽略列表）
    const expectedEdges = new Set<string>()
    const edgeMeta = new Map<string, { relation: string }>()
    for (const card of noteCards) {
      if (!card.props.fileId) continue
      for (const link of getOutgoingLinks(card.props.fileId)) {
        const targetName = link.target.replace(/#.*$/, '').replace(/\.md$/, '')
        const targetFileId = nameToFileId.get(targetName)
        if (!targetFileId) continue
        if (ignoredSet.has(`${card.props.fileId}>${targetFileId}`)) continue
        const targetCardId = fileToCard.get(targetFileId)
        if (!targetCardId || targetCardId === card.id) continue
        expectedEdges.add(`${card.id}-${targetCardId}`)
        edgeMeta.set(`${card.id}-${targetCardId}`, { relation: link.relation || inferRelationType(link.context || '') })
      }
    }

    // 现有箭头（引擎箭头元素 startBinding/endBinding）
    const elements = editor.excalidrawAPI?.getSceneElements() ?? []
    const arrowEls = elements.filter((e: any) => e.type === 'arrow' && !e.isDeleted)
    const toRemove: string[] = []
    const existingPairs = new Set<string>()
    for (const a of arrowEls) {
      const from = a.startBinding?.elementId as string | undefined
      const to = a.endBinding?.elementId as string | undefined
      if (!from || !to) continue
      const pairKey = `${from}-${to}`
      const fromCard = noteCards.find((c) => c.id === from)
      const toCard = noteCards.find((c) => c.id === to)
      if (fromCard?.props.fileId && toCard?.props.fileId) {
        if (!expectedEdges.has(pairKey)) {
          if (a.customData?.autoGenerated) toRemove.push(a.id)
        } else {
          existingPairs.add(pairKey)
        }
      }
    }
    if (toRemove.length > 0) editor.deleteShapes(toRemove)

    // 创建缺失边（引擎 createBoundArrow + 关系色/autoGenerated 标记）
    let added = 0
    for (const pairKey of expectedEdges) {
      if (existingPairs.has(pairKey)) continue
      const sep = pairKey.lastIndexOf('-')
      const from = pairKey.slice(0, sep)
      const to = pairKey.slice(sep + 1)
      const relation = edgeMeta.get(pairKey)?.relation ?? 'reference'
      const arrowId = editor.createBoundArrow(from, to)
      if (!arrowId) continue
      added++
      // 关系类型：优先匹配 id，其次匹配中文名（LinkIndexStore 的 rel: 前缀为自由文本，
      // 如「支撑/反对」恰与 RELATION_TYPES.name 相等）；都未命中回落灰色「引用」
      const relDef = RELATION_TYPES.find((r) => r.id === relation || r.name === relation) ?? RELATION_TYPES[0]
      // 标记 autoGenerated + 关系色（直接 patch 箭头元素）
      const api = editor.excalidrawAPI
      if (api) {
        const els = api.getSceneElements().map((e: any) =>
          e.id === arrowId
            ? { ...e, strokeColor: relDef.color, customData: { ...(e.customData ?? {}), autoGenerated: true, relationType: relation } }
            : e,
        )
        api.updateScene({ elements: els })
      }
    }

    if (added === 0 && toRemove.length === 0) {
      toast?.('链接已是最新')
    } else {
      toast?.(`同步完成：新增 ${added} 条（虚线），移除 ${toRemove.length} 条`)
    }
  }, [rootFolder, getOutgoingLinks, toast])

  // 自动同步：链接索引变化时自动同步（对齐旧 autoSync effect）
  useEffect(() => {
    if (!autoSync || !engineRef.current) return
    const t = window.setTimeout(() => void syncLinks(), 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, indexVersion])

  // ─── 缩略图（P2-2）：保存后节流生成场景小图 → 列表封面 ───
  const lastThumb = useRef(0)
  const refreshThumbnail = useCallback(async (docId: string) => {
    const editor = engineRef.current
    const api = editor?.excalidrawAPI
    if (!api) return
    const now = Date.now()
    if (now - lastThumb.current < 5000) return // 5s 节流，避免保存热路径频繁导出
    lastThumb.current = now
    try {
      const { exportToBlob } = await import('@excalidraw/excalidraw')
      const blob = await exportToBlob({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: {},
        mimeType: 'image/png',
        scale: 0.4, // 降采样小图
      })
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = () => rej(r.error)
        r.readAsDataURL(blob)
      })
      await upsertCanvasThumbnail(docId, dataUrl)
    } catch {
      /* 缩略图失败静默（toImage null 判空先例） */
    }
  }, [])

  // 自动保存：引擎 document 变化 → 800ms 防抖 → serializeCanvas + saveCanvas
  useEffect(() => {
    if (!engine || !doc) return
    const unsub = engine.store.listen(
      () => {
        if (saveTimer.current) window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => {
          const cur = docRef.current
          if (!cur) return
          const data = serializeCanvas(engine)
          void saveCanvas({ ...cur, data, updatedAt: Date.now() })
          void refreshThumbnail(cur.id)
        }, 800)
      },
      { scope: 'document' },
    )
    return () => {
      unsub()
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [engine, doc, refreshThumbnail])

  // 键盘：⌘K 命令面板 / Delete 删除 / Ctrl+Z·Y 撤销重做 / Escape 关闭浮层
  // capture 阶段监听：canvas 内 ⌘K 只开本地面板（stopPropagation 阻断主壳全局 ⌘K 总入口，
  // 避免双面板叠加——P3-B 归一后两面板同用 .aurora-command，叠加会渲染 58 条混合命令）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setPaletteOpen((v) => !v)
        return
      }
      if (paletteOpen) return
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) engineRef.current?.redo()
        else engineRef.current?.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        engineRef.current?.redo()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = engineRef.current?.getSelectedShapeIds()
        if (ids && ids.length > 0) {
          e.preventDefault()
          engineRef.current?.deleteShapes(ids)
        }
        return
      }
      if (e.key === 'Escape') {
        setCtx(null)
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [paletteOpen])

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
    eng.createCardFree('note-card', { text: '新便签', color: '#F59E0B' })
  }, [])

  // 从「文件」Tab 拖拽文件到白板：生成带 fileId 的 note-card（落点居中于光标），点击即跳编辑器
  const handleDropFile = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    const fileId = e.dataTransfer.getData(CANVAS_FILE_DRAG_MIME)
    if (!fileId) return
    e.preventDefault()
    const eng = engineRef.current
    if (!eng) return
    const name = e.dataTransfer.getData(CANVAS_FILE_DRAG_NAME_MIME) || findNode(rootFolder, fileId)?.name || '笔记'
    const p = eng.screenToPage({ x: e.clientX, y: e.clientY })
    eng.createShape({
      type: 'note-card',
      x: p.x - 130,
      y: p.y - 100,
      props: { text: name.replace(/\.md$/i, ''), color: '#06B6D4', fileId },
    })
    toast?.(`已插入笔记：${name}`)
  }, [rootFolder, toast])

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
    toast?.(converted > 0 ? `已转为笔记 ${converted} 篇（文件列表根目录）` : '转换失败')
  }, [rootFolder, createFile, toast])

  // ─── 导出当前白板：PNG（Excalidraw 场景）+ JSON（完整数据，可再导入）───
  const handleExport = useCallback(async () => {
    const editor = engineRef.current
    const cur = docRef.current
    if (!editor || !cur) {
      toast?.('白板尚未就绪，无法导出')
      return
    }
    const base = cur.name || '白板'
    const pngOk = await exportCanvasPNG(editor, `${base}.png`)
    exportCanvasJSON(editor, `${base}.json`)
    toast?.(pngOk ? `已导出 ${base}（PNG+JSON）` : `已导出 ${base}（JSON；PNG 引擎未就绪）`)
  }, [toast])

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="白板"
      onSidebarSelect={(id) => nav?.(resolveAuroraNav(id))}
      breadcrumbs={['白板', doc?.name ?? '白板']}
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
          />

          {/* 所属知识库（反向关联 canvasIds）：可一键回跳，打通 白板 ↔ 知识库 */}
          {owningKb && (
            <div className="aurora-canvas__owning">
              <span className="aurora-canvas__owning-label">所属知识库</span>
              <button
                type="button"
                className="aurora-canvas__owning-chip"
                onClick={() => nav?.('kb', owningKb.id)}
                title={`打开知识库：${owningKb.name}`}
              >
                <Icon.book size={14} /> {owningKb.name}
              </button>
            </div>
          )}

          <div className="aurora-canvas__row">
            {/* 左栏（大纲/历史）：可折叠，独立于书脊；引擎就绪后渲染 */}
            {engine && (
            <div
              className={`aurora-canvas__hoverzone aurora-canvas__hoverzone--left ${leftPinned ? 'is-pinned' : ''}`}
              onMouseEnter={openLeftIntent}
              onMouseLeave={closeLeftIntent}
            >
              {!locked && <div className="aurora-canvas__edge aurora-canvas__edge--left" aria-hidden />}
              {leftOverlay.mounted && (
                <div
                  className="aurora-canvas__overlay aurora-canvas__overlay--left"
                  data-exiting={leftOverlay.exiting || undefined}
                  onMouseEnter={cancelLeftClose}
                  onMouseLeave={scheduleLeftClose}
                >
                  <div className="aurora-canvas__overlay-head">
                    <span className="aurora-canvas__overlay-title">浏览</span>
                    <div className="aurora-canvas__overlay-actions">
                      <button
                        type="button"
                        className={`aurora-canvas__pin ${leftPinned ? 'is-on' : ''}`}
                        onClick={() => setLeftPinned((p) => !p)}
                        aria-label={leftPinned ? '取消钉住浏览' : '钉住浏览'}
                        title={leftPinned ? '取消钉住' : '钉住常驻'}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                      </button>
                      <button
                        type="button"
                        className="aurora-canvas__overlay-close"
                        onClick={closeLeft}
                        aria-label="收起浏览"
                        title="收起"
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
                  <div className="aurora-canvas__empty-title">白板还是空的</div>
                  <div className="aurora-canvas__empty-sub">从一张便签开始，记录你的灵感</div>
                  <div className="aurora-canvas__empty-actions">
                    <button type="button" className="aurora-canvas__empty-btn aurora-canvas__empty-btn--primary" onClick={addQuickNote}>
                      <Icon.edit size={15} /> 新建便签
                    </button>
                    <button type="button" className="aurora-canvas__empty-btn" onClick={() => { setLeftInitialTab('files'); setLeftPinned(true) }}>
                      <Icon.fileText size={15} /> 文件便签
                    </button>
                  </div>
                  <button type="button" className="aurora-canvas__empty-skip" onClick={() => setGuideSkipped(true)}>
                    跳过，直接开始
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
              onMouseEnter={openRightIntent}
              onMouseLeave={closeRightIntent}
            >
              {!locked && <div className="aurora-canvas__edge aurora-canvas__edge--right" aria-hidden />}
              {rightOverlay.mounted && (
                <div
                  className="aurora-canvas__overlay aurora-canvas__overlay--right"
                  data-exiting={rightOverlay.exiting || undefined}
                  onMouseEnter={cancelRightClose}
                  onMouseLeave={scheduleRightClose}
                >
                  <div className="aurora-canvas__overlay-head">
                    <div className="aurora-canvas__overlay-actions aurora-canvas__overlay-actions--left">
                      <button
                        type="button"
                        className="aurora-canvas__overlay-close"
                        onClick={closeRight}
                        aria-label="收起检视"
                        title="收起"
                      >
                        <Icon.chevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        className={`aurora-canvas__pin ${rightPinned ? 'is-on' : ''}`}
                        onClick={() => setRightPinned((p) => !p)}
                        aria-label={rightPinned ? '取消钉住检视' : '钉住检视'}
                        title={rightPinned ? '取消钉住' : '钉住常驻'}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                      </button>
                    </div>
                    <span className="aurora-canvas__overlay-title">检视</span>
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
            const d = await createCanvas(name || '未命名白板')
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
