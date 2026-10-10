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

    // —— 统一判定「这个 fileId 变化是不是真的换了文件」——
    // ⚠️ 真实事故（2026-10-10 用户二次报障）：日记面板是「首次输入即建文件」的草稿流，
    //    fileId 会从 undefined 提升为新 id；而父级此刻传下来的 value 是**建文件那一刻**的内容
    //    （落后于用户已敲的字）。旧代码只挡 `value === lastEmittedMd.current`，挡不住这种滞后
    //    → 走「切换文件」分支 → setContent(旧值)（丢字）+ setTextSelection(0)（光标跳回开头）。
    //    故：**上一个 fileId 为空 = 草稿提升**，不是换文件，绝不能回灌。
    const prevFileId = prevFileIdRef.current
    const fileIdChanged = prevFileId !== fileId
    prevFileIdRef.current = fileId
    const isOwnEcho = value === lastEmittedMd.current || recentEmits.current.has(value)
    /** 草稿 → 真实文件（原先没有 fileId）：保留用户正在编辑的内容与光标 */
    const promotedFromDraft = fileIdChanged && prevFileId === undefined

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

    // 草稿提升 / 回声：不动内容、不动光标，只把撤销历史挂到新文件上
    // （否则撤销会串到上一个文件）。内容已由用户输入驱动，父级 value 只是滞后回声。
    if (promotedFromDraft || isOwnEcho) {
      if (fileIdChanged && fileId) {
        undoRedoRef.current.initHistory(fileId, lastEmittedMd.current ?? value)
      }
      return
    }

    // 真正的切换文件（两个 fileId 都是真实文件）：重置内容与光标
    if (fileIdChanged) {
      // ⚠️⚠️ 但「同一个文件因 Vault 重载被换了新 id」也会走到这里（loadVault 会重新生成 id）。
      //     若此刻用户仍在编辑，重置会把编辑器内容换成磁盘版本（丢字）并把光标拽回开头 ——
      //     正是用户报障的两个现象。真正的「切换文件」发生在用户点文件树时，那时编辑器已失焦。
      //     故：聚焦中且不是自己的回声 → 不回灌，只把撤销历史挂到新 id 上。
      if (editor.isFocused) {
        if (fileId) {
          undoRedoRef.current.initHistory(fileId, lastEmittedMd.current ?? value)
        }
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
