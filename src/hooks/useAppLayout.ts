import { useMemo } from 'react'

interface LayoutParams {
  focusMode: boolean
  sidebarVisible: boolean
  showOutline: boolean
  showPreview: boolean
  showSource: boolean
  editorMode: 'source' | 'wysiwyg'
}

export function useAppLayout({ focusMode, sidebarVisible, showOutline, showPreview, showSource, editorMode }: LayoutParams) {
  const effectiveSidebarVisible = focusMode ? false : sidebarVisible
  const effectiveShowOutline = focusMode ? false : showOutline
  // 所见即所得模式下不显示源码/预览面板（它本身即编辑器）
  const isWysiwyg = editorMode === 'wysiwyg'
  const effectiveShowSource = focusMode || isWysiwyg ? false : showSource
  const effectiveShowPreview = focusMode || isWysiwyg ? false : showPreview

  const gridColumns = useMemo(() => {
    if (focusMode) return '1fr'
    // WYSIWYG 模式：编辑器占满，outline 显示时分配右侧列
    if (isWysiwyg) {
      return effectiveShowOutline ? '1fr 200px' : '1fr'
    }
    const showSourceCol = effectiveShowSource
    const showPreviewCol = effectiveShowPreview
    if (showSourceCol && showPreviewCol) {
      return effectiveShowOutline ? '1fr 1fr 200px' : '1fr 1fr'
    }
    if (showPreviewCol) {
      return effectiveShowOutline ? '1fr 200px' : '1fr'
    }
    // 默认显示源码列（即使 showSource=false 也保留一列避免空白）
    return effectiveShowOutline ? '1fr 200px' : '1fr'
  }, [focusMode, isWysiwyg, effectiveShowSource, effectiveShowPreview, effectiveShowOutline])

  return { effectiveSidebarVisible, effectiveShowOutline, effectiveShowPreview, effectiveShowSource, gridColumns }
}
