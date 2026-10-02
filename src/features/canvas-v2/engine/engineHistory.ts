import { HISTORY_LIMIT, asZoom, zoomValue } from './engineUtils'
import { getElements } from './engineQueries'
import type { ShapeLike, ExElementLike, EngineDocumentLike } from './engineTypes'
import type { CanvasEngine } from './CanvasEngine'

/**
 * CanvasEngine 历史栈方法组（P5-3 自类体拆出，实现逐字未动）。
 * after-state 模型：栈顶始终是最近一次操作后的状态，撤销即回退到上一条。
 * 手势边界（pointerGesture / gestureActive）由主文件的 attach / syncFromScene /
 * begin/endPointerGesture 驱动，本模块只负责指纹、快照、提交与还原。
 */

// 计算当前场景内容指纹（图元 id + type + version + 删除标记 + 几何 + 点数），
// 用于检测真实增删改。除 id/version/isDeleted 外，额外纳入 type 与几何 / 笔画点数，
// 避免「画笔收笔时 version 未变、仅 points 变长」导致指纹不变、漏判场景变化而不提交历史。
export function sceneSignature(e: CanvasEngine): string {
  const els = getElements(e) as ExElementLike[]
  let sig = ''
  for (const el of els) {
    const pts = Array.isArray(el.points) ? (el.points as number[][]).length : 0
    sig += (el.id as string) + ':' + (el.type ?? '') + ':' + (el.version ?? 0) + ':' +
      (el.isDeleted ? 1 : 0) + ':' +
      Math.round(el.x ?? 0) + ',' + Math.round(el.y ?? 0) + ',' +
      Math.round(el.width ?? 0) + ',' + Math.round(el.height ?? 0) + ',' + pts + '|'
  }
  return sig
}

export function emit(e: CanvasEngine, scope: 'document' | 'session') {
  for (const l of e.listeners) {
    if (l.scope === scope) {
      try { l.cb() } catch { /* noop */ }
    }
  }
}

// ─── 历史 ───
export function serializeState(e: CanvasEngine): string {
  const elements = getElements(e).filter((el) => !el.isDeleted).map((el) => ({ ...el }))
  const app = e.api?.getAppState() ?? {}
  const viewport = { scrollX: app.scrollX ?? 0, scrollY: app.scrollY ?? 0, zoom: zoomValue(app.zoom) }
  return JSON.stringify({ elements, viewport, shapes: Array.from(e.shapesAtom.get().values()) })
}

// 防抖提交（用于引擎自身程序化增删改）：手势进行中不提交（由手势结束统一收敛）
export function scheduleHistory(e: CanvasEngine) {
  if (e.pointerGesture || e.gestureActive) return
  if (e.historyTimer) clearTimeout(e.historyTimer)
  e.historyTimer = setTimeout(() => {
    e.historyTimer = null
    commitAfterState(e)
  }, 400)
}

// 把「当前场景」作为一条历史条目提交（after-state 模型：栈顶始终是最近一次
// 操作后的状态，撤销即回退到上一条）。与上次条目相同则跳过（避免空转）。
export function commitAfterState(e: CanvasEngine) {
  const snap = serializeState(e)
  const last = e.undoStack[e.undoStack.length - 1]
  if (last === snap) return
  e.undoStack.push(snap)
  if (e.undoStack.length > HISTORY_LIMIT) e.undoStack.shift()
  e.redoStack = []
  e.canUndoAtom.set(e.undoStack.length > 1)
  e.canRedoAtom.set(false)
  // 关键：快照状态变化时主动 emit，使工具栏的 canUndo/canRedo React 状态及时刷新。
  // ⚠ 必须同时 emit('document')：CanvasView 里 setCanUndo/setCanRedo 只挂在
  // document scope 监听器（updateState）上，session 监听器只同步 zoom/选中/工具、
  // 并不更新 canUndo/canRedo。若这里只 emit('session')，则纯画笔绘制收笔后
  // （画笔期间 syncFromScene 的 dirty 恒为 false，全程无 document emit）engine 内部
  // canUndoAtom 虽已置 true，但 React 的 canUndo 仍是旧的 false → 撤销按钮保持
  // disabled（红色 not-allowed 光标）、点击无效；只有再加卡片/画别的图形（那些操作
  // 会 emit('document')）才顺带把按钮刷亮——这正是「画笔首笔撤销按钮点不动」的根因。
  emit(e, 'document')
  emit(e, 'session')
}

export function restoreState(e: CanvasEngine, snap: string) {
  let data: EngineDocumentLike
  try {
    data = JSON.parse(snap) as EngineDocumentLike
  } catch {
    return
  }
  try {
    e.applyingRemote = true
    // 还原卡片形状
    const map = new Map<string, ShapeLike>()
    for (const s of data.shapes ?? []) map.set(s.id, s)
    e.shapesAtom.set(map)
    // 还原 Excalidraw 场景
    if (e.api && data.elements) {
      const vp = data.viewport ?? {}
      e.api.updateScene({
        elements: data.elements,
        appState: { scrollX: vp.scrollX ?? 0, scrollY: vp.scrollY ?? 0, zoom: asZoom(vp.zoom) },
      })
    }
  } catch {
    // 场景写回失败也不应卡死交互：applyingRemote 必须在 finally 中复位，
    // 否则会一直拦截 syncFromScene，导致后续所有同步/历史记录失效。
  } finally {
    e.applyingRemote = false
    // 还原后重置手势/历史中间态，避免残留的 gestureActive 抑制后续提交；
    // 并刷新场景指纹，使紧接着的编辑能正确识别为「新变化」。
    e.gestureActive = false
    e.pointerGesture = false
    if (e.pendingCommit) { clearTimeout(e.pendingCommit); e.pendingCommit = null }
    if (e.historyTimer) { clearTimeout(e.historyTimer); e.historyTimer = null }
    e.lastSceneSig = sceneSignature(e)
    emit(e, 'document')
    emit(e, 'session')
  }
}

export function undo(e: CanvasEngine): void {
  if (e.undoStack.length <= 1) return
  const current = e.undoStack.pop()!
  e.redoStack.push(current)
  const prev = e.undoStack[e.undoStack.length - 1]
  restoreState(e, prev)
  e.canUndoAtom.set(e.undoStack.length > 1)
  e.canRedoAtom.set(e.redoStack.length > 0)
  emit(e, 'session')
}

export function redo(e: CanvasEngine): void {
  if (e.redoStack.length === 0) return
  const next = e.redoStack.pop()!
  e.undoStack.push(next)
  restoreState(e, next)
  e.canUndoAtom.set(e.undoStack.length > 1)
  e.canRedoAtom.set(e.redoStack.length > 0)
  emit(e, 'session')
}
