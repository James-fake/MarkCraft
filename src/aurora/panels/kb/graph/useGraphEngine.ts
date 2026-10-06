/**
 * Aurora 知识图谱 · 引擎 hook（视口 / 力模拟 / 指针手势 / 场景现场）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出。
 * 职责：尺寸观测、平移/缩放/拖拽手势、力模拟循环（rAF）、布局目标计算与重放、
 * 按范围恢复/写回图谱现场（graphSession）。节点数据仍由主面板持有（nodesRef/edgesRef）。
 */
import { useState, useRef, useEffect, useReducer, useCallback, type Dispatch, type SetStateAction } from 'react'
import { saveGraphSession, type GraphNodePos } from '../graphSession'
import { readScopedSession } from './graphScope'
import { NODE_CLICK_SLOP, DRAG_ALPHA, clamp, simulateStep, type GNode, type GEdge, type Layout, type GraphMode } from './graphModel'

export interface GraphEngineOpts {
  /** 数据范围键（场景现场按范围隔离） */
  scope: string
  layout: Layout
  setLayout: (l: Layout) => void
  mode: GraphMode
  setMode: Dispatch<SetStateAction<GraphMode>>
  centerId: string
  setCenterId: (id: string) => void
  depth: number
  visibleIds: Set<string>
  adjacency: Map<string, Set<string>>
  nodeById: Map<string, GNode>
  nodesRef: { current: GNode[] }
  edgesRef: { current: GEdge[] }
  setSelectedId: (id: string | null) => void
  /** 当前选中（写入场景快照；主面板持有 state） */
  selectedId: string | null
  setMenu: Dispatch<SetStateAction<{ id: string; x: number; y: number } | null>>
  setInfoCard: Dispatch<SetStateAction<{ id: string } | null>>
  /** 节点「单击」语义（file → 打开笔记；非 file → 信息卡），由主面板注入 */
  activateNode: (id: string) => void
}

export function useGraphEngine(p: GraphEngineOpts) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 1200, h: 800 })

  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 })
  const viewRef = useRef(view)
  viewRef.current = view

  // 仅用于驱动「每帧重渲染」：位置数据在 ref 上原地可变，故不需要读计数本身
  const [, bump] = useReducer((x: number) => (x + 1) % 1_000_000, 0)

  const alphaRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  // rect 在按下时缓存一次：拖拽中不再逐次 getBoundingClientRect（那是强制同步重排，是「不丝滑」的一大来源）
  const dragRef = useRef<{ id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean; rect: DOMRect | null } | null>(null)
  // 最新指针位置：pointermove 只登记坐标，真正落点由 rAF 步进每帧取一次（把高频 pointermove 合并到每帧一次，
  // 指针报告率高于刷新率时不再做重复计算与多余渲染）
  const dragPtrRef = useRef<{ x: number; y: number } | null>(null)
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  // 本次手势是否始于节点：setPointerCapture 会把节点的 click 也重定向到 <svg>，
  // 画布的「点空白处清空选中」必须据此区分，否则点完节点立刻被自己清掉
  const nodeGestureRef = useRef(false)

  // —— 按范围恢复现场：范围变化（含首次挂载、面板内切换）时，把**该范围**的现场取回来 ——
  // 三档范围的节点集合不同，坐标/视口/选中/中心互不相通；不但要读对范围，还要在范围变化时
  // 立刻重新应用（此前是 useState 惰性初值，只在挂载时读一次 —— 面板内切范围会串台）。
  const applyLayoutRef = useRef<((l: Layout) => void) | null>(null)
  const scopeAppliedRef = useRef(false)
  useEffect(() => {
    // 挂载那一次与「后面切范围」的处理必须分开：
    //  • 挂载：只恢复**状态**（视口/选中/模式/布局），不重放布局 —— 与旧版惰性初值等价，
    //    也避免在布点之前就把力模拟循环启动起来（行为上等于「不自动启动力模拟」的既有约定）；
    //  • 切范围：必须重放布局（重算目标点位 + 唤醒模拟），否则控件显示同心圆/树形、画布还是旧点位。
    const first = !scopeAppliedRef.current
    scopeAppliedRef.current = true
    const s = readScopedSession(p.scope)
    setView(s?.view ?? { scale: 1, tx: 0, ty: 0 })
    p.setSelectedId(s?.selectedId ?? null)
    p.setMode(s?.mode ?? 'global')
    if (!s) {
      // 该范围没有现场 ⇒ 回到干净的默认图（布局也回默认，不留上一范围的观感）
      p.setLayout('force')
      return
    }
    if (s.centerId) p.setCenterId(s.centerId)
    if (first) p.setLayout(s.layout)
    else applyLayoutRef.current?.(s.layout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.scope])

  // —— 图谱现场写回：每次渲染刷新快照（6 个字段，开销可忽略），卸载时连同节点坐标存入 graphSession ——
  // 卸载清理对「任何离开方式」都成立（侧栏切换 / ⌘K 跳编辑器 / 节点跳转），
  // 因此不必在每个出口手动登记；返回图谱时由上面的 restore 读取。
  // 快照含「数据范围」—— 范围不同的现场互不复原，见 readScopedSession。
  const sceneRef = useRef({ view, layout: p.layout, mode: p.mode, centerId: p.centerId, selectedId: p.selectedId, scope: p.scope })
  sceneRef.current = { view, layout: p.layout, mode: p.mode, centerId: p.centerId, selectedId: p.selectedId, scope: p.scope }
  useEffect(
    () => () => {
      const positions: Record<string, GraphNodePos> = {}
      for (const n of p.nodesRef.current) positions[n.id] = { x: n.x, y: n.y, vx: n.vx, vy: n.vy, tx: n.tx, ty: n.ty }
      saveGraphSession({ ...sceneRef.current, positions })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ---- 尺寸 ----
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      setSize({ w: cr.width, h: cr.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- 布局目标计算 ----
  const computeTargets = useCallback(
    (lay: Layout) => {
      const nodes = p.nodesRef.current
      const W = size.w || 1200
      const Hh = size.h || 800
      const cx = W / 2
      const cy = Hh / 2
      const byId = new Map(nodes.map((n) => [n.id, n]))
      const visIds = nodes.filter((n) => p.visibleIds.has(n.id))
      if (lay === 'force') {
        nodes.forEach((n) => {
          n.tx = n.x
          n.ty = n.y
        })
        return
      }
      if (lay === 'grid') {
        const cols = Math.max(1, Math.ceil(Math.sqrt(visIds.length)))
        const rows = Math.ceil(visIds.length / cols)
        const gx = W / (cols + 1)
        const gy = Hh / (rows + 1)
        visIds.forEach((n, i) => {
          const c = i % cols
          const r = Math.floor(i / cols)
          n.tx = gx * (c + 1)
          n.ty = gy * (r + 1)
        })
        return
      }
      // concentric / tree 都以 centerId 为根做 BFS 分层
      const root = byId.get(p.centerId) || visIds[0]
      if (!root) return
      const depthMap = new Map<string, number>([[root.id, 0]])
      let frontier = [root.id]
      for (let d = 0; d < 8; d++) {
        const next: string[] = []
        frontier.forEach((id) =>
          (p.adjacency.get(id) || []).forEach((nid) => {
            if (!depthMap.has(nid) && p.visibleIds.has(nid)) {
              depthMap.set(nid, d + 1)
              next.push(nid)
            }
          }),
        )
        frontier = next
      }
      visIds.forEach((n) => {
        if (!depthMap.has(n.id)) depthMap.set(n.id, 1)
      })
      const maxD = Math.max(1, ...Array.from(depthMap.values()))
      const perLayer: Record<number, number> = {}
      visIds.forEach((n) => {
        const d = depthMap.get(n.id)!
        perLayer[d] = (perLayer[d] || 0) + 1
      })
      const counters: Record<number, number> = {}
      const ringR = Math.min(W, Hh) * 0.34
      visIds.forEach((n) => {
        const d = depthMap.get(n.id)!
        const count = perLayer[d]
        const idx = counters[d] || 0
        counters[d] = idx + 1
        if (lay === 'concentric') {
          const a = (idx / count) * Math.PI * 2 - Math.PI / 2
          const rr = d === 0 ? 0 : ringR * (d / maxD)
          n.tx = cx + Math.cos(a) * rr
          n.ty = cy + Math.sin(a) * rr
        } else {
          const y = 70 + d * ((Hh - 140) / Math.max(1, maxD))
          const x = ((idx + 1) / (count + 1)) * W
          n.tx = x
          n.ty = y
        }
      })
    },
    [size, p.visibleIds, p.centerId, p.adjacency, p.nodesRef],
  )

  // 布局切换 → 计算目标并轻微 reheat（保持普通函数：loop 声明在后，且事件期调用时必已初始化）
  const applyLayout = (lay: Layout) => {
    p.setLayout(lay)
    computeTargets(lay)
    alphaRef.current = Math.max(alphaRef.current, lay === 'force' ? 0.4 : 0.4)
    if (!runningRef.current) loop()
  }
  // 供「按范围恢复现场」调用（那条 effect 声明在 applyLayout 之前，故通过 ref 取最新实现）
  applyLayoutRef.current = applyLayout

  // ---- 力模拟 ----
  const step = useCallback(() => {
    const drag = dragRef.current
    // 拖拽期维持一个温和的 alpha 下限：旧版每次 pointermove 都 reheat(0.35) 把力持续打满，
    // 是「抖、不丝滑」的主因之一；这里改为「按下时唤醒一次 + 拖拽期温和维持」。
    const a = drag ? Math.max(alphaRef.current, DRAG_ALPHA) : alphaRef.current
    // 把最新指针换算成世界坐标。rect 用按下时缓存的那份（拖拽中不再 getBoundingClientRect ⇒ 不再强制重排）
    let dragWorld: { x: number; y: number } | null = null
    if (drag && dragPtrRef.current) {
      const rect = drag.rect ?? svgRef.current?.getBoundingClientRect()
      if (rect) {
        const v = viewRef.current
        dragWorld = {
          x: (dragPtrRef.current.x - rect.left - v.tx) / v.scale,
          y: (dragPtrRef.current.y - rect.top - v.ty) / v.scale,
        }
      }
    }
    const { maxTargetDelta } = simulateStep({
      nodes: p.nodesRef.current,
      edges: p.edgesRef.current,
      nodeById: p.nodeById,
      layout: p.layout,
      size,
      alpha: a,
      drag: drag ? { id: drag.id, dx: drag.dx, dy: drag.dy } : null,
      dragWorld,
    })
    if (p.layout !== 'force' && maxTargetDelta < 0.6 && !drag) alphaRef.current = 0
    alphaRef.current *= 0.94
    if (alphaRef.current < 0.025 && !drag) alphaRef.current = 0
  }, [p.layout, size, p.nodeById, p.nodesRef, p.edgesRef])

  const loop = useCallback(() => {
    runningRef.current = true
    step()
    bump()
    if (alphaRef.current > 0.01 || dragRef.current) {
      rafRef.current = requestAnimationFrame(loop)
    } else {
      runningRef.current = false
    }
  }, [step])

  const reheat = useCallback(
    (a = 0.6) => {
      alphaRef.current = Math.max(alphaRef.current, a)
      if (!runningRef.current) loop()
    },
    [loop],
  )

  useEffect(() => {
    // 不自动启动力模拟；保留初始环形布局。用户交互（拖拽/切布局）时再 reheat
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      runningRef.current = false
    }
  }, [])

  // 可见性/模式/布局相关变化 → 重新计算目标并 reheat（非力导向时平滑过渡）
  useEffect(() => {
    if (p.layout !== 'force') {
      computeTargets(p.layout)
      reheat(0.5)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.visibleIds, p.mode, p.centerId, p.depth, p.layout])

  // ---- 平移 ----
  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    nodeGestureRef.current = false // 画布手势：随后的 click 属于「点空白处」，应清空选中
    p.setMenu(null)
    p.setInfoCard(null)
    panRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (drag) {
      // 拖拽阈值：小于 4px 的抖动仍算单击（否则手一抖就被判成拖拽、节点被挪动且点不开）
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) <= NODE_CLICK_SLOP) return
      drag.moved = true
      // 只登记最新指针坐标，实际落点由 rAF 步进每帧取一次：
      //  • 指针报告率可高于刷新率，合并后每帧只算一次（不再做重复计算与多余渲染）
      //  • 不在事件里调 getBoundingClientRect（强制同步重排），rect 已在按下时缓存
      dragPtrRef.current = { x: e.clientX, y: e.clientY }
      if (!runningRef.current) loop()
      return
    }
    if (panRef.current) {
      const start = panRef.current
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      // 捕获 start（非 null），避免 setState 延迟执行时 panRef 已被 onPointerUp 置空
      setView((v) => ({ ...v, tx: start.tx + dx, ty: start.ty + dy }))
    }
  }
  // 节点「单击」必须在 pointerup 上兑现，不能挂在 click 上：
  // onNodePointerDown 会把指针捕获到 <svg>（拖拽时指针移出画布仍收得到事件），
  // 而捕获会把随后的 click 重定向到捕获元素（svg）→ 节点的 onClick 在真实浏览器里永不触发
  // （jsdom 不实现捕获重定向，于是单测全绿、真机点击无反应；2026-09-13 CDP 实测确认）。
  const onPointerUp = () => {
    const drag = dragRef.current
    panRef.current = null
    dragRef.current = null
    dragPtrRef.current = null
    if (drag && !drag.moved) {
      p.activateNode(drag.id)
    } else if (drag) {
      // 松手即锁死被拖拽节点的速度：否则它会带着拖拽期残留的速度继续滑行（报障的「飞出去」）。
      const n = p.nodeById.get(drag.id)
      if (n) { n.vx = 0; n.vy = 0 }
      bump() // 立即重渲染一次，清掉 SVG 上的 is-dragging（拖拽期已关闭脉冲/过渡）
    }
  }
  const onPointerCancel = () => {
    panRef.current = null
    dragRef.current = null
    dragPtrRef.current = null
    bump()
  }

  // ---- 滚轮缩放（光标居中）----
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const v = viewRef.current
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const ns = clamp(v.scale * factor, 0.2, 3)
    const wx = (sx - v.tx) / v.scale
    const wy = (sy - v.ty) / v.scale
    setView({ scale: ns, tx: sx - wx * ns, ty: sy - wy * ns })
  }

  // 画布空白 click（svg onClick 逻辑上提为回调）：以手势来源（nodeGestureRef）区分「点节点/点空白」
  const onCanvasClick = (e: React.MouseEvent) => {
    if (nodeGestureRef.current) {
      nodeGestureRef.current = false
      return
    }
    if (e.target === svgRef.current) {
      p.setSelectedId(null)
      p.setInfoCard(null)
      p.setMenu(null)
    }
  }

  // ---- 节点指针 ----
  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    // 仅主键拖拽：右键要留给 contextmenu（抢了指针捕获会把 contextmenu 也重定向到 svg）
    if (e.button !== 0) return
    e.stopPropagation()
    // rect 在按下时缓存一次，整段拖拽复用（拖拽中不再逐次 getBoundingClientRect ⇒ 不再强制重排）
    const rect = svgRef.current?.getBoundingClientRect() ?? null
    const n = p.nodeById.get(id)
    if (!n || !rect) return
    nodeGestureRef.current = true
    const v = viewRef.current
    const wx = (e.clientX - rect.left - v.tx) / v.scale
    const wy = (e.clientY - rect.top - v.ty) / v.scale
    dragRef.current = { id, dx: wx - n.x, dy: wy - n.y, startX: e.clientX, startY: e.clientY, moved: false, rect }
    dragPtrRef.current = { x: e.clientX, y: e.clientY }
    // 按下时唤醒一次力模拟；整个拖拽期由 step 的 alpha 下限持续维持（旧版每次 pointermove 打满 alpha）
    reheat(0.4)
    ;(svgRef.current as Element).setPointerCapture?.(e.pointerId)
  }

  const focusCenter = () => {
    const n = p.nodesRef.current.find((x) => x.id === p.centerId)
    if (!n) return
    const v = viewRef.current
    setView({ scale: clamp(Math.max(v.scale, 1.2), 0.2, 3), tx: size.w / 2 - n.x * v.scale, ty: size.h / 2 - n.y * v.scale })
    reheat(0.4)
  }

  const toggleFullscreen = () => {
    const el = wrapRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }

  const cull = (x: number, y: number) => {
    const v = view
    const sx = v.tx + v.scale * x
    const sy = v.ty + v.scale * y
    return sx < -60 || sx > size.w + 60 || sy < -60 || sy > size.h + 60
  }

  return {
    wrapRef, svgRef, size, view, setView, viewRef,
    // 渲染期快照：主组件每帧经 bump 重渲染时重估（等价于旧 JSX 里的 panRef.current 直读）
    panActive: !!panRef.current, dragActive: !!dragRef.current,
    reheat, applyLayout, sceneRef,
    onBgPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    onWheel, onCanvasClick, onNodePointerDown,
    focusCenter, toggleFullscreen, cull,
  }
}
