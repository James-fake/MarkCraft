interface ScrollPositionEntry {
  scrollTop: number
  scrollHeight: number
}

interface ScrollPositions {
  editorCM: { docPos: number }
  editorWysiwyg: ScrollPositionEntry
  preview: ScrollPositionEntry
}

const scrollPositions = new Map<string, ScrollPositions>()

function getOrCreate(fileId: string): ScrollPositions {
  let existing = scrollPositions.get(fileId)
  if (!existing) {
    existing = {
      editorCM: { docPos: 0 },
      editorWysiwyg: { scrollTop: 0, scrollHeight: 0 },
      preview: { scrollTop: 0, scrollHeight: 0 }
    }
    scrollPositions.set(fileId, existing)
  }
  return existing
}

// CodeMirror 编辑器：保存视口顶部的行号
export function saveEditorScrollCM(fileId: string, lineNum: number): void {
  const entry = getOrCreate(fileId)
  entry.editorCM.docPos = Math.max(0, lineNum)
}

export function getEditorScrollCM(fileId: string): number {
  const pos = scrollPositions.get(fileId)?.editorCM
  if (!pos) return 0
  return pos.docPos
}

// WYSIWYG 编辑器
export function saveEditorScroll(fileId: string, scrollTop: number, scrollHeight?: number): void {
  const entry = getOrCreate(fileId)
  // 只在 scrollTop > 0 时更新，避免文件切换时 setTextSelection(0) 触发的
  // scroll-to-top 用 0 覆盖之前保存的正确位置
  if (scrollTop > 0) {
    entry.editorWysiwyg.scrollTop = scrollTop
  }
  if (scrollHeight !== undefined && scrollHeight > 0) {
    entry.editorWysiwyg.scrollHeight = scrollHeight
  }
}

export function getEditorScroll(fileId: string, currentScrollHeight?: number): number {
  const pos = scrollPositions.get(fileId)?.editorWysiwyg
  if (!pos || pos.scrollTop <= 0) return 0
  if (currentScrollHeight !== undefined && currentScrollHeight > 0 && pos.scrollHeight > 0) {
    const ratio = pos.scrollTop / pos.scrollHeight
    const clampedRatio = Math.max(0, Math.min(1, ratio))
    return clampedRatio * currentScrollHeight
  }
  return pos.scrollTop
}

export function hasSavedScrollPosition(fileId: string): boolean {
  const pos = scrollPositions.get(fileId)
  if (!pos) return false
  return pos.editorCM.docPos > 0 || pos.editorWysiwyg.scrollTop > 0 || pos.preview.scrollTop > 0
}

export function savePreviewScroll(fileId: string, scrollTop: number, scrollHeight?: number): void {
  const entry = getOrCreate(fileId)
  entry.preview.scrollTop = Math.max(0, scrollTop)
  if (scrollHeight !== undefined && scrollHeight > 0) {
    entry.preview.scrollHeight = scrollHeight
  }
}

export function getPreviewScroll(fileId: string, currentScrollHeight?: number): number {
  const pos = scrollPositions.get(fileId)?.preview
  if (!pos || pos.scrollTop <= 0) return 0
  if (currentScrollHeight !== undefined && currentScrollHeight > 0 && pos.scrollHeight > 0) {
    const ratio = pos.scrollTop / pos.scrollHeight
    const clampedRatio = Math.max(0, Math.min(1, ratio))
    return clampedRatio * currentScrollHeight
  }
  return pos.scrollTop
}

export function clearScrollPositions(fileId: string): void {
  scrollPositions.delete(fileId)
}

if (typeof window !== 'undefined') {
  (window as unknown as { __scrollPositions: unknown }).__scrollPositions = scrollPositions
}

