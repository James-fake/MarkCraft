import type { Translations } from '../../types/translations'

interface FocusModeToolbarProps {
  typewriterMode: boolean
  onToggleTypewriterMode: () => void
  onToggleFocusMode: () => void
  t: Translations
}

/**
 * 专注模式浮动退出条（P1 重构）
 *
 * 专注模式会隐藏主工具栏与状态栏，故以一条轻量浮动胶囊（绝对定位于编辑器右上角）
 * 提供「打字机开关 + 退出专注」两个必要操作，避免用户无从退出。
 * 视觉走 Aurora token（`.mc-focus-bar`，见 styles/mermaid.css），默认低不透明度、
 * 悬停变清晰，尽量不打扰写作。两模式共用（源码 CodeMirror / 所见即所得 Tiptap）。
 */
export default function FocusModeToolbar({ typewriterMode, onToggleTypewriterMode, onToggleFocusMode, t }: FocusModeToolbarProps) {
  return (
    <div className="mc-focus-bar" role="toolbar" aria-label={t.editor.focusMode}>
      <span className="mc-focus-bar__label">
        <svg style={{ width: '13px', height: '13px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {t.editor.focusMode}
      </span>
      <button
        type="button"
        className={`mc-focus-bar__btn${typewriterMode ? ' is-active' : ''}`}
        onClick={onToggleTypewriterMode}
        aria-pressed={typewriterMode}
        title={t.editorExtra.typewriterModeTitle}
      >
        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
        </svg>
        {typewriterMode ? t.editor.typewriterOn : t.editor.typewriterOff}
      </button>
      <button
        type="button"
        className="mc-focus-bar__btn"
        onClick={onToggleFocusMode}
        title={t.editorExtra.exitFocusTitle}
      >
        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {t.editor.exitFocus}
      </button>
    </div>
  )
}
