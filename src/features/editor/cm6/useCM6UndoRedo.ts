import { useState, useCallback, useEffect, useRef } from 'react'
import { keymap, EditorView } from '@codemirror/view'
import { useUndoRedo } from '@stores/UndoRedoStore'

/**
 * CM6 撤销/重做快捷键桥接
 * 将 Ctrl+Z/Y 映射到 UndoRedoStore，而非 CM6 的 history()。
 *
 * 回调 ref 由调用方以「实例级」传入（useCM6UndoRedo 内部用 useRef 创建），
 * 避免原模块级单例在多编辑器并存时相互串扰（审查 M4-useCM6UndoRedo）。
 */
export function createUndoRedoKeymap(
  undoRef: { current: () => void },
  redoRef: { current: () => void },
) {
  return keymap.of([
    {
      key: 'Mod-z',
      run: () => {
        undoRef.current()
        return true
      },
    },
    {
      key: 'Mod-y',
      run: () => {
        redoRef.current()
        return true
      },
    },
    {
      key: 'Mod-Shift-z',
      run: () => {
        redoRef.current()
        return true
      },
    },
  ])
}

interface UseCM6UndoRedoParams {
  fileId?: string | null
  value: string
  viewRef: React.MutableRefObject<EditorView | null>
  isUndoRedoRef: React.MutableRefObject<boolean>
  onChange: (value: string) => void
}

export function useCM6UndoRedo({
  fileId,
  value,
  viewRef,
  isUndoRedoRef,
  onChange,
}: UseCM6UndoRedoParams) {
  const undoRedo = useUndoRedo()

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // 使用ref追踪fileId和value，避免useEffect依赖导致的重复初始化
  const fileIdRef = useRef(fileId)
  fileIdRef.current = fileId
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // 实例级回调 ref：每个编辑器实例持有独立的 undo/redo 桥接引用，
  // 供 createUndoRedoKeymap(undoCallbackRef, redoCallbackRef) 闭包读取最新 handler。
  const undoCallbackRef = useRef<() => void>(() => {})
  const redoCallbackRef = useRef<() => void>(() => {})

  // UndoRedo 状态订阅
  useEffect(() => {
    if (!fileId) return
    const updateState = () => {
      if (!fileIdRef.current) return
      const state = undoRedo.getState(fileIdRef.current)
      setCanUndo(state.canUndo)
      setCanRedo(state.canRedo)
    }
    updateState()
    const unsub = undoRedo.subscribeState(updateState)
    return unsub
  }, [fileId, undoRedo])

  // 初始化历史 - 仅在fileId变化时初始化，不在value变化时重新初始化
  //（undoRedo 为 store 稳定引用，补入 deps 不改变触发时机）
  useEffect(() => {
    if (!fileId) return
    undoRedo.initHistory(fileId, valueRef.current)
  }, [fileId, undoRedo])

  // Push undo
  const pushUndo = useCallback((newValue: string, groupKey?: string) => {
    if (isUndoRedoRef.current || !fileIdRef.current) return
    const view = viewRef.current
    const cursorStart = view ? view.state.selection.main.from : 0
    const cursorEnd = view ? view.state.selection.main.to : 0
    undoRedo.pushHistory(fileIdRef.current, newValue, cursorStart, cursorEnd, groupKey)
  }, [undoRedo, isUndoRedoRef, viewRef])

  // Undo - 直接更新CM6视图内容
  const handleUndo = useCallback(() => {
    const currentFileId = fileIdRef.current
    if (!currentFileId) return
    const entry = undoRedo.undo(currentFileId)
    if (!entry) return
    isUndoRedoRef.current = true
    const view = viewRef.current
    if (view) {
      // 直接用CM6 dispatch替换文档内容，而不是通过React state间接更新
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: entry.content },
        selection: { anchor: Math.min(entry.cursorStart, entry.content.length), head: Math.min(entry.cursorEnd, entry.content.length) },
      })
    }
    onChangeRef.current(entry.content)
    // 使用setTimeout确保所有CM6 update cycle完成后再重置flag
    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 0)
  }, [undoRedo, isUndoRedoRef, viewRef])

  // Redo - 直接更新CM6视图内容
  const handleRedo = useCallback(() => {
    const currentFileId = fileIdRef.current
    if (!currentFileId) return
    const entry = undoRedo.redo(currentFileId)
    if (!entry) return
    isUndoRedoRef.current = true
    const view = viewRef.current
    if (view) {
      // 直接用CM6 dispatch替换文档内容
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: entry.content },
        selection: { anchor: Math.min(entry.cursorStart, entry.content.length), head: Math.min(entry.cursorEnd, entry.content.length) },
      })
    }
    onChangeRef.current(entry.content)
    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 0)
  }, [undoRedo, isUndoRedoRef, viewRef])

  // 将 handleUndo/handleRedo 桥接到本实例的回调 ref（不再写入模块级单例）
  useEffect(() => {
    undoCallbackRef.current = handleUndo
    redoCallbackRef.current = handleRedo
  }, [handleUndo, handleRedo])

  return {
    canUndo,
    canRedo,
    pushUndo,
    handleUndo,
    handleRedo,
    undoCallbackRef,
    redoCallbackRef,
  }
}
