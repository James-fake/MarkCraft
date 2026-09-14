import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { markdownToHtml } from '../markdownConvert'
import { imageStore } from '../../shared/storage/imageStore'
import type { useUndoRedo } from '@stores/UndoRedoStore'

interface UseTiptapContentSyncParams {
  editor: Editor | null
  value: string
  fileId?: string
  lastEmittedMd: MutableRefObject<string | null>
  isInternalUpdate: MutableRefObject<boolean>
  undoRedo: ReturnType<typeof useUndoRedo>
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}

export function useTiptapContentSync({
  editor,
  value,
  fileId,
  lastEmittedMd,
  isInternalUpdate,
  undoRedo,
  debounceTimerRef,
}: UseTiptapContentSyncParams) {
  const editorInitialized = useRef(false)
  const prevFileIdRef = useRef<string | undefined>(fileId)

  useEffect(() => {
    if (!editor) return

    // Clear pending debounced onChange when file changes to prevent cross-file write
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const fileIdChanged = prevFileIdRef.current !== fileId
    prevFileIdRef.current = fileId

    if (!editorInitialized.current) {
      editorInitialized.current = true
      isInternalUpdate.current = true
      const html = markdownToHtml(value, imageStore)
      editor.commands.setContent(html)
      editor.commands.setTextSelection(0)
      lastEmittedMd.current = value
      if (fileId) {
        undoRedo.initHistory(fileId, value)
      }
      setTimeout(() => {
        isInternalUpdate.current = false
      }, 0)
      return
    }

    // When fileId changes, reset content — unless the value already matches what we last emitted
    // (e.g. a draft being promoted to a real file mid-typing), so we avoid a needless cursor jump.
    if (fileIdChanged) {
      if (value === lastEmittedMd.current) {
        return
      }
      isInternalUpdate.current = true
      const html = markdownToHtml(value, imageStore)
      editor.commands.setContent(html)
      editor.commands.setTextSelection(0)
      lastEmittedMd.current = value
      if (fileId) {
        undoRedo.initHistory(fileId, value)
      }
      setTimeout(() => {
        isInternalUpdate.current = false
      }, 0)
      return
    }

    // When only value changes (from external source), skip if we emitted it ourselves
    if (value === lastEmittedMd.current) return
    isInternalUpdate.current = true
    const html = markdownToHtml(value, imageStore)
    editor.commands.setContent(html)
    editor.commands.setTextSelection(0)
    lastEmittedMd.current = value
    setTimeout(() => {
      isInternalUpdate.current = false
    }, 0)
  }, [value, editor, fileId])
}
