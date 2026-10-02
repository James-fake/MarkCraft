import { useCallback, useState } from 'react'

/**
 * 编辑模式机制（对齐项目真实实现 useEditorSettings）。
 * editorMode：源码 / 所见即所得（TipTap 富文本）双内核；sourceVisible/previewVisible 为源码模式下的窗格开关。
 * 默认范式收敛：初始值取真实设置 settings.editorMode（P1-1.2 E1，默认 wysiwyg）。
 */
export function useEditorModeSwitch(initialMode: 'source' | 'wysiwyg') {
  const [editorMode, setEditorMode] = useState<'source' | 'wysiwyg'>(initialMode)
  const [sourceVisible, setSourceVisible] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)

  // —— 模式切换状态机（Aurora 工具栏驱动，映射真实 EditorLayout props）——
  // 叠加式视图切换：源码 / 预览 两个独立窗格，二者同开 = 双屏（左源码右预览）
  // 所见即所得为独立内核，与源码/预览互斥。
  // 切换语义（对齐用户确认的 4 态循环）：
  //   - 纯源码(A) ⇄ 纯预览(C) 独占互切；双屏(B)下点某窗格 = 收起该窗格转入独占
  //   - 点「源码」：A→C, B→C, C→B ；点「预览」：A→C, B→A, C→A
  //   （分段控件是互斥单选，天生无法表达 B 这个复合态，故用两个窗格按钮 + 一个内核按钮）
  const handleSourceClick = useCallback(() => {
    if (editorMode === 'wysiwyg') {
      // 从所见即所得切回：纯源码视图
      setEditorMode('source'); setSourceVisible(true); setPreviewVisible(false); return
    }
    if (sourceVisible && !previewVisible) {
      // A → C（关源码 → 纯预览）
      setSourceVisible(false); setPreviewVisible(true)
    } else if (sourceVisible && previewVisible) {
      // B → C（收起源码 → 纯预览）
      setSourceVisible(false)
    } else {
      // C（S关P开）→ B（开源码 → 双屏）
      setSourceVisible(true)
    }
  }, [editorMode, sourceVisible, previewVisible])

  const togglePreview = useCallback(() => {
    if (editorMode === 'wysiwyg') {
      // 从所见即所得切回：纯预览视图
      setEditorMode('source'); setSourceVisible(false); setPreviewVisible(true); return
    }
    if (sourceVisible && !previewVisible) {
      // A → C（开预览 → 纯预览）
      setSourceVisible(false); setPreviewVisible(true)
    } else if (sourceVisible && previewVisible) {
      // B → A（收起预览 → 纯源码）
      setPreviewVisible(false)
    } else {
      // C（S关P开）→ A（开源码 → 纯源码）
      setSourceVisible(true); setPreviewVisible(false)
    }
  }, [editorMode, sourceVisible, previewVisible])

  const toggleWysiwyg = useCallback(() => {
    setEditorMode((m) => (m === 'wysiwyg' ? 'source' : 'wysiwyg'))
    // 退出所见即所得后回到纯源码视图
    if (editorMode === 'wysiwyg') {
      setSourceVisible(true); setPreviewVisible(false)
    }
  }, [editorMode])

  return {
    editorMode, setEditorMode,
    sourceVisible, setSourceVisible,
    previewVisible, setPreviewVisible,
    handleSourceClick, togglePreview, toggleWysiwyg,
  }
}
