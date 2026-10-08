import { useEffect } from 'react'

export interface KeyboardShortcutHandlers {
  onQuickOpen: () => void
  onGlobalSearch: () => void
  onToggleTypewriter: () => void
  onToggleFullscreen: () => void
  onSettings?: () => void
  onPrint?: () => void
  onGraphView?: () => void
  onCommandPalette?: () => void
  onTemplateInsert?: () => void
  onNavigateBack?: () => void
  onNavigateForward?: () => void
  onQuickSwitcher?: () => void
  onSave?: () => void
  /** ⌘⇧S / Ctrl+Shift+S → 另存为（内置《使用文档》已如此声明，此前未绑定） */
  onSaveAs?: () => void
  /** ⌘N / Ctrl+N → 新建笔记（阻止浏览器新窗口） */
  onNewFile?: () => void
  /** ⌘W / Ctrl+W → 关闭当前文档（Web 无法关窗，语义为关闭标签 / 回欢迎） */
  onCloseFile?: () => void
  /** ⌘Q / Ctrl+Q → 打开「退出 MarkCraft」确认弹窗 */
  onQuit?: () => void
  /** ⌘F / Ctrl+F → 编辑器内查找（阻止浏览器查找栏） */
  onFind?: () => void
  /** 非可编辑焦点下的撤销 / 重做兜底（编辑器聚焦时交原生处理，避免双触发） */
  onUndo?: () => void
  onRedo?: () => void
}

export function useKeyboardShortcuts({
  onQuickOpen,
  onGlobalSearch,
  onToggleTypewriter,
  onToggleFullscreen,
  onSettings,
  onPrint,
  onGraphView,
  onCommandPalette,
  onTemplateInsert,
  onNavigateBack,
  onNavigateForward,
  onQuickSwitcher,
  onSave,
  onSaveAs,
  onNewFile,
  onCloseFile,
  onQuit,
  onFind,
  onUndo,
  onRedo,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K → 命令面板（方案 A 全局总入口，真实唤起）
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        onCommandPalette?.()
      }
      // Ctrl+Shift+P → 打印/导出
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        onPrint?.()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        onGlobalSearch()
      }
      // Ctrl+Shift+T → 打字机模式（保持不变）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't' && !e.altKey) {
        e.preventDefault()
        onToggleTypewriter()
      }
      // Ctrl+Alt+T → 插入模板
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        onTemplateInsert?.()
      }
      if (e.key === 'F11') {
        e.preventDefault()
        onToggleFullscreen()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        onSettings?.()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        onQuickOpen()
      }
      // Ctrl+O (without Shift) → Quick Switcher
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        onQuickSwitcher?.()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        onGraphView?.()
      }
      // Alt+Left → Navigate back
      if (e.altKey && e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        onNavigateBack?.()
      }
      // Alt+Right → Navigate forward
      if (e.altKey && e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        onNavigateForward?.()
      }
      // Ctrl+S → 保存并创建 manual 版本（阻止浏览器默认保存网页行为）
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        onSave?.()
      }
      // Ctrl+Shift+S → 另存为（阻止浏览器默认「网页另存为」）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSaveAs?.()
      }
      // ⌘N → 新建笔记（阻止浏览器新开窗口）
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onNewFile?.()
      }
      // ⌘W → 关闭当前文档（Web 无法真正关窗，行为 = 关闭标签 / 回欢迎）
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        onCloseFile?.()
      }
      // ⌘Q → 打开「退出 MarkCraft」确认弹窗（阻止浏览器默认退出）
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        onQuit?.()
      }
      // ⌘F（无 Shift）→ 编辑器内查找（阻止浏览器查找栏）；⌘⇧F 仍是全局搜索
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        onFind?.()
      }
      // ⌘Z / ⌘⇧Z：仅在非可编辑焦点时兜底；编辑器聚焦交原生 undo/redo（避免双触发）
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
        const el = document.activeElement as HTMLElement | null
        const editable = !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('role') === 'textbox')
        if (!editable) {
          e.preventDefault()
          if (e.shiftKey) onRedo?.()
          else onUndo?.()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onQuickOpen, onGlobalSearch, onToggleTypewriter, onToggleFullscreen, onSettings, onPrint, onGraphView, onCommandPalette, onTemplateInsert, onNavigateBack, onNavigateForward, onQuickSwitcher, onSave, onSaveAs, onNewFile, onCloseFile, onQuit, onFind, onUndo, onRedo])
}
