import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { EditorView } from '@tiptap/pm/view'
import type { Slice } from '@tiptap/pm/model'
import type { Translations } from '@src/types/translations'
import { imageStore, registerRelativePath } from '@core/storage/imageStore'
import { useToast } from '@components/ui/ToastProvider'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB

export interface UseTiptapImageHandlerParams {
  editorRef: React.RefObject<Editor | null>
  t: Translations
  useRelativeImagePath?: boolean
}

export interface UseTiptapImageHandlerReturn {
  handleDrop: (view: EditorView, event: DragEvent, _slice: Slice, moved: boolean) => boolean
  handlePaste: (view: EditorView, event: ClipboardEvent, _slice: Slice) => boolean
}

export function useTiptapImageHandler({ editorRef, t, useRelativeImagePath = false }: UseTiptapImageHandlerParams): UseTiptapImageHandlerReturn {
  const toast = useToast()
  const insertImage = useCallback((src: string, editor: Editor) => {
    if (useRelativeImagePath && src.startsWith('data:')) {
      const imageId = imageStore.storeBase64Image(src)
      const ext = src.match(/data:image\/(\w+);/)?.[1] || 'png'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const relativePath = `assets/image_${timestamp}_${random}.${ext}`
      registerRelativePath(relativePath, imageId)
      editor.chain().focus().setImage({ src: relativePath }).run()
    } else {
      editor.chain().focus().setImage({ src }).run()
    }
  }, [useRelativeImagePath])

  const handleDrop = useCallback((_view: EditorView, event: DragEvent, _slice: Slice, moved: boolean): boolean => {
    if (moved) return false
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return false
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        event.preventDefault()
        if (file.size > MAX_IMAGE_SIZE) {
          toast.show(`图片大小 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过限制（最大 2MB），请压缩后重试`, 'error')
          return true
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          const src = e.target?.result as string
          const ed = editorRef.current
          if (ed && !ed.isDestroyed) {
            insertImage(src, ed)
          }
        }
        reader.readAsDataURL(file)
        return true
      }
    }
    return false
  }, [editorRef, insertImage, toast])

  const handlePaste = useCallback((_view: EditorView, event: ClipboardEvent, _slice: Slice): boolean => {
    const items = event.clipboardData?.items
    if (!items) return false
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          if (file.size > MAX_IMAGE_SIZE) {
            toast.show(t.editor.imageSizeExceeded.replace('{size}', (file.size / 1024 / 1024).toFixed(1)), 'error')
            return true
          }
          const reader = new FileReader()
          reader.onload = (e) => {
            const src = e.target?.result as string
            const ed = editorRef.current
            if (ed && !ed.isDestroyed) {
              insertImage(src, ed)
            }
          }
          reader.readAsDataURL(file)
        }
        return true
      }
    }
    return false
  }, [editorRef, t, insertImage, toast])

  return { handleDrop, handlePaste }
}
