import { useCallback, useRef, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { djb2Hash } from '@utils/hash'
import { markdownToHtml } from '../markdownConvert'
import { imageStore } from '@core/storage/imageStore'
import type { useUndoRedo } from '@stores/UndoRedoStore'

interface UseTiptapUndoRedoParams {
  fileId?: string
  editorRef: MutableRefObject<Editor | null>
  undoRedo: ReturnType<typeof useUndoRedo>
  onChange: (value: string) => void
  htmlSnapshotRef: MutableRefObject<Map<number, { md: string; html: string }>>
  lastEmittedMd: MutableRefObject<string | null>
  isInternalUpdate: MutableRefObject<boolean>
}

export function useTiptapUndoRedo({
  fileId,
  editorRef,
  undoRedo,
  onChange,
  htmlSnapshotRef,
  lastEmittedMd,
  isInternalUpdate,
}: UseTiptapUndoRedoParams) {
  // 使用useRef保持稳定的引用，避免每次渲染重新创建
  const isUndoRedoRef = useRef(false)

  const undoFn = useCallback(() => {
    if (!fileId) return
    const entry = undoRedo.undo(fileId)
    if (!entry) return
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    isUndoRedoRef.current = true
    isInternalUpdate.current = true
    const cacheKey = djb2Hash(entry.content)
    const cached = htmlSnapshotRef.current.get(cacheKey)
    const html = (cached && cached.md === entry.content) ? cached.html : markdownToHtml(entry.content, imageStore)
    ed.commands.setContent(html)
    lastEmittedMd.current = entry.content
    onChange(entry.content)
    // 使用setTimeout确保Tiptap的onUpdate已经执行完毕后再重置flag
    setTimeout(() => {
      isInternalUpdate.current = false
      isUndoRedoRef.current = false
    }, 0)
  }, [fileId, undoRedo, onChange, editorRef, htmlSnapshotRef, lastEmittedMd, isInternalUpdate])

  const redoFn = useCallback(() => {
    if (!fileId) return
    const entry = undoRedo.redo(fileId)
    if (!entry) return
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    isUndoRedoRef.current = true
    isInternalUpdate.current = true
    const cacheKey = djb2Hash(entry.content)
    const cached = htmlSnapshotRef.current.get(cacheKey)
    const html = (cached && cached.md === entry.content) ? cached.html : markdownToHtml(entry.content, imageStore)
    ed.commands.setContent(html)
    lastEmittedMd.current = entry.content
    onChange(entry.content)
    setTimeout(() => {
      isInternalUpdate.current = false
      isUndoRedoRef.current = false
    }, 0)
  }, [fileId, undoRedo, onChange, editorRef, htmlSnapshotRef, lastEmittedMd, isInternalUpdate])

  return { undoFn, redoFn, isUndoRedoRef }
}
