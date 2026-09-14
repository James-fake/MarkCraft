import type { Translations } from '../../types/translations'

interface FocusModeToolbarProps {
  typewriterMode: boolean
  onToggleTypewriterMode: () => void
  onToggleFocusMode: () => void
  t: Translations
}

export default function FocusModeToolbar({ typewriterMode, onToggleTypewriterMode, onToggleFocusMode, t }: FocusModeToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: 'var(--editor-bg)',
        borderBottom: '1px solid var(--editor-border)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(to right, transparent, var(--button-primary), transparent)',
          opacity: 0.5,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.4 }}>
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--editor-text)', fontWeight: 500 }}>{t.editor.focusMode}</span>
      </div>
      <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--editor-border)' }} />
      <button
        onClick={onToggleTypewriterMode}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
          border: typewriterMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--editor-border)',
          backgroundColor: typewriterMode ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          color: typewriterMode ? 'var(--link-color)' : 'var(--mc-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = typewriterMode ? 'rgba(59, 130, 246, 0.15)' : 'var(--mc-bg-panel)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = typewriterMode ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
        }}
        title={t.editorExtra.typewriterModeTitle}
      >
        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
        </svg>
        {typewriterMode ? t.editor.typewriterOn : t.editor.typewriterOff}
      </button>
      <button
        onClick={onToggleFocusMode}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
          border: '1px solid var(--editor-border)',
          backgroundColor: 'transparent',
          color: 'var(--mc-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)'
          e.currentTarget.style.color = 'var(--editor-text)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--mc-text-secondary)'
        }}
        title={t.editorExtra.exitFocusTitle}
      >
        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {t.editor.exitFocus}
      </button>
    </div>
  )
}
