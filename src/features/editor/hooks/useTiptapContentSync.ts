import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { markdownToHtml } from '../markdownConvert'
import { imageStore } from '@core/storage/imageStore'
import type { useUndoRedo } from '@stores/UndoRedoStore'

interface UseTiptapContentSyncParams {
  editor: Editor | null
  value: string
  fileId?: string
  lastEmittedMd: MutableRefObject<string | null>
  /** 最近由**本编辑器**发出过的若干 md 值（有界）。用于识别「父级 value 只是自己的回声/滞后」 */
  recentEmits: MutableRefObject<Set<string>>
  isInternalUpdate: MutableRefObject<boolean>
  undoRedo: ReturnType<typeof useUndoRedo>
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}

export function useTiptapContentSync({
  editor,
  value,
  fileId,
  lastEmittedMd,
  recentEmits,
  isInternalUpdate,
  undoRedo,
  debounceTimerRef,
}: UseTiptapContentSyncParams) {
  const editorInitialized = useRef(false)
  const prevFileIdRef = useRef<string | undefined>(fileId)

  // `undoRedo`（useUndoRedo() 的 context value）每次 provider 渲染都是新对象，
  // 且 provider 在每次 pushHistory 后 ~50ms 强制重渲染（见 UndoRedoStore）。
  // 若把它放进依赖数组，本 effect 会在**每次敲键**后重跑：既清掉挂起的防抖 onChange
  // （自动保存丢失），又因父级 value 仍是旧值而 setContent(旧值) 回滚内容。
  // 故用 ref 读取，且依赖数组不含它。
  const undoRedoRef = useRef(undoRedo)
  undoRedoRef.current = undoRedo

  useEffect(() => {
    if (!editor) return

    const fileIdChanged = prevFileIdRef.current !== fileId
    prevFileIdRef.current = fileId

    // 仅在**切换文件**时清掉挂起的防抖 onChange（防止跨文件写入）。
    // 绝不能在无关重渲染时清：父级 value 落后于输入（onChange 有防抖），
    // 清掉它会让本次输入既不保存、又被 setContent(旧值) 回滚。
    if (fileIdChanged && debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (!editorInitialized.current) {
      editorInitialized.current = true
      isInternalUpdate.current = true
      const html = markdownToHtml(value, imageStore)
      editor.commands.setContent(html)
      editor.commands.setTextSelection(0)
      lastEmittedMd.current = value
      if (fileId) {
        undoRedoRef.current.initHistory(fileId, value)
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
        undoRedoRef.current.initHistory(fileId, value)
      }
      setTimeout(() => {
        isInternalUpdate.current = false
      }, 0)
      return
    }

    // When only value changes (from external source), skip if we emitted it ourselves
    if (value === lastEmittedMd.current) return

    // ⚠️ 第二道闸：父级 value 可能是**我们更早发出过的值** —— onChange 有 300ms 防抖，
    //    父级拿到的永远落后于 lastEmittedMd。若把这种滞后当成「外部改动」回灌，
    //    会把用户刚敲的字回滚掉（真实事故：日记里打「工作日记」，几秒后「日记」消失）。
    if (recentEmits.current.has(value)) return

    // ⚠️ 第三道闸：用户正在本编辑器里打字时，一律不回灌。
    //    此刻「父级 value 落后于输入」是常态，回灌只会丢字；真正的「外部改动」发生在失焦时。
    if (editor.isFocused) return

    isInternalUpdate.current = true
    const html = markdownToHtml(value, imageStore)
    editor.commands.setContent(html)
    editor.commands.setTextSelection(0)
    lastEmittedMd.current = value
    setTimeout(() => {
      isInternalUpdate.current = false
    }, 0)
  }, [value, editor, fileId, debounceTimerRef, isInternalUpdate, lastEmittedMd, recentEmits])
}
