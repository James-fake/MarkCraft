/**
 * ExcalidrawCanvas — 挂载 <Excalidraw> 并叠加 HTML 浮层卡片（混合架构）。
 *
 * - Excalidraw 负责平移/缩放/选中/箭头/手绘几何与交互。
 * - 引擎（CanvasEngine）作为 tldraw Editor 兼容层，桥接现有面板。
 * - CardOverlay 在其中渲染富卡片浮层。
 *
 * 注意：所有传给 <Excalidraw> 的 props 必须保持稳定引用（见下方常量与 ref 化），
 * 否则父组件（CanvasView）每次重渲染都会传入新函数/新对象，Excalidraw 会因此
 * 反复重初始化并再次触发 onChange —— 与引擎内部的 emit→setState 形成无限渲染循环。
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { useValue } from './useValue'
import { CanvasEngine } from './CanvasEngine'
import type { ExcalidrawAPILike } from './engineTypes'
import { CanvasEngineContext } from './useCanvasEngine'
import { CardOverlay } from './CardOverlay'
// 隐藏 Excalidraw 自带 UI（工具栏/菜单/缩放/右键菜单等），操作入口全部由自定义组件接管
import './excalidraw-hide-ui.css'

export interface ExcalidrawCanvasProps {
  onReady: (engine: CanvasEngine) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 上游 @excalidraw/excalidraw 类型声明被 .DELETE 破坏（见 src/excalidraw.d.ts），初始场景数据形状不可解析，沿用 any 桥接
  initialDocument?: any
  isReadonly?: boolean
  theme?: 'light' | 'dark'
}

// 静态 UI 选项（禁止内联对象，否则每次渲染都是新引用 → Excalidraw 重初始化 → 死循环）
const EXCALIDRAW_UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    export: false,
    loadScene: false,
    saveToActiveFile: false,
    saveAsImage: false,
    toggleTheme: false,
  },
}

/**
 * Memo 隔离的 Excalidraw 实例。
 *
 * 关键：onChange（每次场景变更都会触发，包括 Excalidraw 自身的 text-wysiwyg 样式更新）
 * 会经引擎 emit 更新 @tldraw/state atom，进而使父组件 CanvasView 重渲染。
 * 若不隔离，CanvasView 重渲染会同步级联到 <Excalidraw>，触发 Excalidraw 内部的
 * updateWysiwygStyle 布局副作用再次 mutateElement → onChange … 在 React 18 的
 * layout-effect 同步刷新下形成同步递归（Maximum call stack size exceeded）。
 *
 * memo 后，只要下列 props 引用/值不变，Excalidraw 就不会因父级重渲染而重渲染，
 * 从而彻底切断该递归链。所有传入 props 均为稳定引用（见下方常量与 useCallback）。
 */
const MemoExcalidraw = memo(Excalidraw) as typeof Excalidraw

/**
 * 橡皮擦覆盖层（仅当 currentTool === 'eraser' 时挂载）。
 *
 * Excalidraw 原生橡皮擦是「整元素删除」——一笔划过凡是相交的整条 free-draw 路径即被删掉。
 * 这里改为自管指针事件、局部擦除：覆盖层以 pointer-events:auto 拦截指针（原生橡皮擦收不到事件），
 * 沿指针轨迹调用 engine.eraseSegment，仅剔除被擦到的笔画片段、其余保留并重新分段。
 * 其余图元（矩形/椭圆/箭头等）仍按「整元素删除」式橡皮擦，符合常规画图工具直觉。
 */
function EraserOverlay({ engine }: { engine: CanvasEngine }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const radiusFor = useCallback(() => {
    const app = engine.excalidrawAPI?.getAppState()
    return Math.max(4, (app?.currentItemStrokeWidth as number) ?? 4)
  }, [engine])

  const moveCursor = useCallback((clientX: number, clientY: number) => {
    const host = hostRef.current
    const cur = cursorRef.current
    if (!host || !cur) return
    const r = host.getBoundingClientRect()
    // 显示直径 = 实际擦除半径(场景单位) × 缩放，再略微放大以保证可见
    const size = Math.max(14, radiusFor() * 2 * engine.getZoom() + 8)
    cur.style.width = `${size}px`
    cur.style.height = `${size}px`
    cur.style.left = `${clientX - r.left}px`
    cur.style.top = `${clientY - r.top}px`
    cur.style.opacity = '1'
  }, [engine, radiusFor])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drawing.current = true
    const p = engine.screenToPage({ x: e.clientX, y: e.clientY })
    last.current = p
    engine.eraseSegment(p, p, radiusFor())
    moveCursor(e.clientX, e.clientY)
  }, [engine, radiusFor, moveCursor])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    moveCursor(e.clientX, e.clientY)
    if (!drawing.current) return
    const p = engine.screenToPage({ x: e.clientX, y: e.clientY })
    const prev = last.current ?? p
    engine.eraseSegment(prev, p, radiusFor())
    last.current = p
  }, [engine, radiusFor, moveCursor])

  const end = useCallback((e: React.PointerEvent) => {
    drawing.current = false
    last.current = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  const onEnter = useCallback((e: React.PointerEvent) => {
    moveCursor(e.clientX, e.clientY)
  }, [moveCursor])

  return (
    <div
      ref={hostRef}
      data-eraser-overlay
      style={{ position: 'absolute', inset: 0, zIndex: 6, cursor: 'none', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerEnter={onEnter}
    >
      <div
        ref={cursorRef}
        style={{
          position: 'absolute',
          boxSizing: 'border-box',
          borderRadius: '50%',
          left: -100,
          top: -100,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0,
          border: '2px solid rgba(30,30,30,0.92)',
          background: 'rgba(30,30,30,0.10)',
          // 白色光晕：在深/浅背景上都保证可见
          boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 3px rgba(0,0,0,0.25)',
        }}
      >
        {/* 中心准星，便于精确擦除 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: 4,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(30,30,30,0.9)',
          }}
        />
      </div>
    </div>
  )
}

/**
 * 箭头连线覆盖层（仅当 currentTool === 'arrow' 时挂载）。
 *
 * 实现「点击卡片作为起点 → 点击另一张卡片作为终点 → 自动生成绑定连线」的点击式交互，
 * 替代 Excalidraw 原生「按住拖拽」画箭头的方式，且连线会持续绑定到两张卡片：
 * - 覆盖层以 pointer-events:auto 拦截指针（卡片在此工具下 pointer-events:none，故由本层接管）。
 * - 悬停到卡片上时高亮该卡片；点击设为起点；再点击另一张卡片调用 engine.createBoundArrow。
 * - 连线创建后写入 Excalidraw 的 startBinding/endBinding + 卡片 boundElements；移动任一卡片时
 *   引擎 refreshArrowsForCard 会重算两端边界点，使连线端点始终跟随卡片（见 CanvasEngine）。
 */
function ArrowLinkerOverlay({ engine }: { engine: CanvasEngine }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [startId, setStartId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const cam = useValue('cam', () => engine.getCamera(), [engine])
  const startRef = useRef<string | null>(null)
  startRef.current = startId

  const screenBox = useCallback((id: string) => {
    const b = engine.getShapePageBounds(id)
    if (!b) return null
    return {
      left: (b.x + cam.x) * cam.z,
      top: (b.y + cam.y) * cam.z,
      width: b.width * cam.z,
      height: b.height * cam.z,
    }
  }, [engine, cam])

  const hit = useCallback((clientX: number, clientY: number): string | null => {
    const p = engine.screenToPage({ x: clientX, y: clientY })
    const hits = engine.getShapesAtPoint(p)
    return hits.length ? hits[hits.length - 1].id : null
  }, [engine])

  const onMove = useCallback((e: React.PointerEvent) => {
    const host = hostRef.current
    if (!host) return
    const r = host.getBoundingClientRect()
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
    setHoverId(hit(e.clientX, e.clientY))
  }, [hit])

  const onDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const id = hit(e.clientX, e.clientY)
    if (!id) { setStartId(null); return }
    const cur = startRef.current
    if (!cur) { setStartId(id) }
    else if (cur === id) { setStartId(null) }
    else { engine.createBoundArrow(cur, id); setStartId(null) }
  }, [hit, engine])

  const onLeave = useCallback(() => setHoverId(null), [])

  const hoverBox = hoverId ? screenBox(hoverId) : null
  const startBox = startId ? screenBox(startId) : null
  const startCenter = startBox ? { x: startBox.left + startBox.width / 2, y: startBox.top + startBox.height / 2 } : null

  return (
    <div
      ref={hostRef}
      data-arrow-linker-overlay
      style={{ position: 'absolute', inset: 0, zIndex: 6, cursor: hoverId ? 'pointer' : 'crosshair', touchAction: 'none' }}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerLeave={onLeave}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        {startCenter && (
          <line
            x1={startCenter.x} y1={startCenter.y} x2={cursor.x} y2={cursor.y}
            stroke="#7C8CFF" strokeWidth={2} strokeDasharray="6 4"
          />
        )}
      </svg>
      {hoverBox && hoverId !== startId && (
        <div style={{
          position: 'absolute', left: hoverBox.left, top: hoverBox.top, width: hoverBox.width, height: hoverBox.height,
          borderRadius: 12, border: '2px solid #7C8CFF', boxSizing: 'border-box', pointerEvents: 'none',
          boxShadow: '0 0 0 3px rgba(124,140,255,0.22)',
        }} />
      )}
      {startBox && (
        <div style={{
          position: 'absolute', left: startBox.left, top: startBox.top, width: startBox.width, height: startBox.height,
          borderRadius: 12, border: '2px solid #7C8CFF', boxSizing: 'border-box', pointerEvents: 'none',
          boxShadow: '0 0 0 4px rgba(124,140,255,0.28)',
        }} />
      )}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        padding: '6px 14px', borderRadius: 8, fontSize: 12, color: '#fff',
        background: 'var(--cv-accent)', pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}>
        {startId ? '已选起点，点击另一张卡片完成连线' : '点击卡片作为连线起点（点击空白取消）'}
      </div>
    </div>
  )
}

export function ExcalidrawCanvas({ onReady, initialDocument, isReadonly, theme = 'light' }: ExcalidrawCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<CanvasEngine | null>(null)
  const readyRef = useRef(false)
  const aliveRef = useRef(true)
  // 亮出门闸：Excalidraw mount 首帧画布背景是默认白（viewBackgroundColor 默认 COLOR_PALETTE.white），
  // 须等 loadDocument 注入统一暗色（#0D0F15）后才可亮出，否则进入白板会闪一帧白（深色模式尤其刺眼）。
  const [booted, setBooted] = useState(false)
  if (!engineRef.current) engineRef.current = new CanvasEngine()
  const engine = engineRef.current
  // 真实生效主题以 <html data-theme> 为单一数据源（applyTheme 同步写入，晚于 React 首屏即已就位），
  // 保证 Excalidraw 收到的主题与整个应用完全一致；绕开 useTheme → getTheme(id).type
  // 在个别主题 id（如 system 解析为 light、或 getTheme 未命中回落 ?? 'light'）下回落 'light' 的隐患
  // （见 AURORA-OPTIMIZATION-PLAN 批次③）。调用方传入的 theme 仅作兜底（无 document / 测试环境未注入 data-theme 时）。
  const resolvedTheme: 'light' | 'dark' =
    typeof document !== 'undefined' && document.documentElement.dataset.theme
      ? (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
      : (theme ?? 'light')
  // 卸载即中止挂载期的 rAF 亮出链，避免对已卸载实例 setState。
  // 注意：Aurora 根用 <StrictMode>（dev 下 double-mount：effect → cleanup → effect），
  // body 里必须重置 aliveRef=true——否则第一次 cleanup 后 aliveRef 恒为 false，
  // 第二次挂载的 handleAPI rAF 链（onReady/booted）被永久拦死 → 白板透明且引擎不上报
  // （空态引导/Dock 全消失），表现为「白板功能使用不了」。
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  // booted 超时兜底：rAF 链被任何原因卡住（后台 tab rAF 暂停 / 异常路径）时，
  // 限时强制亮出，保证白板永不因门闸而整块不可见（最坏退回修复前的表现，而非永黑）。
  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 1500)
    return () => window.clearTimeout(t)
  }, [])

  // 将易变的回调/数据收进 ref，使 excalidrawAPI 回调引用保持绝对稳定（仅依赖 engine）
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const initialDocRef = useRef(initialDocument)
  initialDocRef.current = initialDocument

  const handleAPI = useCallback((api: ExcalidrawAPILike) => {
    if (!containerRef.current) return
    engine.attach(api, containerRef.current)
    // 仅在开发构建暴露引擎/Excalidraw API 供自动化验证使用（生产构建不暴露）
    if (import.meta.env?.DEV) {
      window.__canvasEngine = engine
      window.__exapi = api
    }
    // 延迟到下一帧再写入初始文档并通知就绪：excalidrawAPI 在 Excalidraw 初始化期间被
    // 同步调用，此时其内部 App 类组件尚未挂载完成；若此处立即 api.updateScene()
    // （loadDocument 内部），会触发 App 的 setState，React 报
    // 「Can't call setState on a component that is not yet mounted」。下帧时 App 已挂载，
    // 写入场景安全、无告警。loadDocument 与 onReady 同帧执行，也避免「引擎就绪但场景为空」
    // 的瞬时空态闪现。
    requestAnimationFrame(() => {
      // 载入初始场景。异常（历史数据畸形/结构不符等）不得阻断就绪链：
      // 降级为空白画布继续，引擎/上层仍可用（否则 booted 门闸将永久透明 + engine
      // 不上报 → 白板整体不可用、空态引导消失）。
      try {
        if (initialDocRef.current) engine.loadDocument(initialDocRef.current)
      } catch (err) {
        console.warn('[canvas] loadDocument 失败，降级为空白画布', err)
      }
      // Excalidraw 背景强制重绘兜底（AURORA-OPTIMIZATION-PLAN 批次③ 实测根因）：
      // Excalidraw 的 static + interactive 双 canvas 在挂载首帧已用默认
      // COLOR_PALETTE.white 绘制 fillRect（fillStyle=viewBackgroundColor）。
      // 对于空白板（elements=[], 无 diff），后续 updateScene 不会触发画布重绘，
      // 两画布始终保持默认浅色——即便 viewBackgroundColor 已是 #0D0F15。
      // 双保险：直接拿到两画布的 2D 上下文 fillRect 暗色覆盖 + 同步 viewBackgroundColor
      // 设置（供未来 Excalidraw 重绘时使用正确色）。下一帧 booted 亮出前完成，
      // user-visible 区域即时变为统一暗色。
      try {
        const canvases = containerRef.current?.querySelectorAll('canvas.excalidraw__canvas')
        if (canvases) {
          for (const c of Array.from(canvases)) {
            const ctx = (c as HTMLCanvasElement).getContext('2d')
            if (ctx) {
              ctx.fillStyle = '#0D0F15'
              ctx.fillRect(0, 0, (c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height)
            }
          }
        }
        if (import.meta.env?.DEV) window.__plan03_filled = canvases?.length ?? 0
        api.updateScene({ appState: { viewBackgroundColor: '#0D0F15' } })
      } catch { /* noop */ }
      if (!readyRef.current && aliveRef.current) {
        readyRef.current = true
        onReadyRef.current(engine)
      }
      // 再等一帧才亮出：让 Excalidraw 用 loadDocument 注入的 viewBackgroundColor 完成重绘，
      // 亮出首帧即是暗色画布，不泄漏任何白色首帧（白闪修复）。
      if (aliveRef.current) {
        requestAnimationFrame(() => {
          if (aliveRef.current) setBooted(true)
        })
      }
    })
  }, [engine])

  // 响应式读取当前工具（tldraw 命名），仅当为橡皮擦时挂载局部擦除覆盖层
  const tool = useValue('tool', () => engine.getCurrentToolId(), [engine])

  // Excalidraw 的 onChange 在自身 commit/layout 阶段（如文本编辑器 updateWysiwygStyle
  // 的布局副作用触发 mutateElement → informMutation → onSceneUpdated setState）同步触发。
  // 若此时同步调用 engine.syncFromScene() → emit，会使上层 CanvasView 在 Excalidraw 的
  // commit 周期内同步重渲染，打断 updateWysiwygStyle 的收敛，形成 Maximum call stack 递归。
  // 故将同步延迟到微任务：等当前 React commit 完成、文本测量收敛后再同步状态，彻底切断重入。
  const syncScheduled = useRef(false)
  const handleChange = useCallback(() => {
    if (syncScheduled.current) return
    syncScheduled.current = true
    queueMicrotask(() => {
      syncScheduled.current = false
      engine.syncFromScene()
    })
  }, [engine])

  // 原生 pointer 监听：命中空白（非卡片浮层）的单击 → 折叠侧栏
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let downX = 0, downY = 0, downT = 0
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; downT = Date.now() }
    const onUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
      const dt = Date.now() - downT
      // 命中卡片浮层时，事件目标在 overlay 内；命中空白则在 excalidraw canvas 上
      const onOverlay = (e.target as HTMLElement)?.closest('[data-card-overlay]')
      // 橡皮擦覆盖层自管指针事件；其点击不应触发空白折叠
      if (engine.getCurrentToolId() === 'eraser') return
      if (moved < 6 && dt < 400 && !onOverlay) {
        // 仅当没有选中任何卡片时视为空白点击
        if (engine.getSelectedShapeIds().length === 0) engine.fireBlankPointer()
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
    }
  }, [engine])

  // ─── 撤销历史的「手势边界」监听（capture 阶段，务必先于 Excalidraw 自身处理触发） ───
  // 这是「首次进入白板画笔首笔即可撤销」的关键：以真实的指针按下/抬起作为一次操作的
  // 边界，通知引擎在收笔后提交「一条」历史，彻底摆脱对 Excalidraw 内部 appState 字段
  // （draggingElement/multiElement 因版本而异）的依赖。capture=true 保证即使 Excalidraw
  // 在冒泡阶段 stopPropagation，我们仍能收到 pointerdown/up/cancel。覆盖了画笔、几何、
  // 文本、橡皮擦覆盖层、箭头覆盖层、卡片拖拽等所有指针驱动的操作。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const gDown = () => engine.beginPointerGesture()
    const gEnd = () => engine.endPointerGesture()
    el.addEventListener('pointerdown', gDown, true)
    el.addEventListener('pointerup', gEnd, true)
    el.addEventListener('pointercancel', gEnd, true)
    // 指针在容器外抬起（拖拽越界）也要收尾，避免手势卡住抑制后续提交
    window.addEventListener('pointerup', gEnd, true)
    window.addEventListener('pointercancel', gEnd, true)
    return () => {
      el.removeEventListener('pointerdown', gDown, true)
      el.removeEventListener('pointerup', gEnd, true)
      el.removeEventListener('pointercancel', gEnd, true)
      window.removeEventListener('pointerup', gEnd, true)
      window.removeEventListener('pointercancel', gEnd, true)
    }
  }, [engine])

  return (
    <div
      ref={containerRef}
      className="excalidraw-canvas-host"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        // 亮出门闸：loadDocument 注入统一暗色背景前保持透明（配合宿主层的暗色兜底背景），
        // 就绪后 140ms 淡入——首帧起就是暗色画布，消除「进入白板闪白」。
        opacity: booted ? 1 : 0,
        transition: 'opacity 140ms ease-out',
      }}
    >
      <MemoExcalidraw
        excalidrawAPI={handleAPI}
        onChange={handleChange}
        theme={resolvedTheme}
        viewModeEnabled={isReadonly}
        zenModeEnabled={false}
        gridModeEnabled={true}
        UIOptions={EXCALIDRAW_UI_OPTIONS}
        // 把 CanvasPanel 注入的 viewBackgroundColor（unifiedInitialData）作为 Excalidraw 的
        // initialData 传入；并配合 handleAPI 中的 gridSize 抖落强制重绘（见下方注释）。
        initialData={initialDocument}
      />
      <div
        data-card-overlay
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      >
        <CanvasEngineContext.Provider value={engine}>
          <CardOverlay engine={engine} />
        </CanvasEngineContext.Provider>
      </div>
      {tool === 'eraser' && <EraserOverlay engine={engine} />}
      {tool === 'arrow' && <ArrowLinkerOverlay engine={engine} />}
    </div>
  )
}
