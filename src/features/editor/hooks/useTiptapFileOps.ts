import { useState, useRef, useCallback } from 'react'

export interface UseTiptapFileOpsParams {
  onOpenFile?: () => void
  onSaveAs?: () => void
  fileId?: string
  undoRedo: { pushHistory: (fileId: string, content: string, start: number, end: number, groupKey: string) => void }
  onChange: (content: string) => void
}

export interface UseTiptapFileOpsReturn {
  showSaveAsModal: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleOpenFile: () => void
  handleSaveAs: () => void
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  setShowSaveAsModal: (show: boolean) => void
}

export function useTiptapFileOps({ onOpenFile, onSaveAs, fileId, undoRedo, onChange }: UseTiptapFileOpsParams): UseTiptapFileOpsReturn {
  const [showSaveAsModal, setShowSaveAsModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenFile = useCallback(() => {
    if (onOpenFile) {
      onOpenFile()
    } else {
      fileInputRef.current?.click()
    }
  }, [onOpenFile])

  const handleSaveAs = useCallback(() => {
    if (onSaveAs) {
      onSaveAs()
    } else {
      setShowSaveAsModal(true)
    }
  }, [onSaveAs])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validExtensions = ['.md', '.markdown']
    const fileName = file.name.toLowerCase()
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    if (!isValidExtension) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (fileId) {
        undoRedo.pushHistory(fileId, content, 0, 0, 'open-file')
      }
      onChange(content)
    }
    reader.readAsText(file, 'UTF-8')
    event.target.value = ''
  }, [fileId, undoRedo, onChange])

  return {
    showSaveAsModal,
    fileInputRef,
    handleOpenFile,
    handleSaveAs,
    handleFileChange,
    setShowSaveAsModal,
  }
}
