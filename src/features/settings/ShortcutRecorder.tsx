import { useState, useEffect, useCallback } from 'react'

interface ShortcutRecorderProps {
  onRecord: (key: string) => void
  onCancel: () => void
}

export default function ShortcutRecorder({ onRecord, onCancel }: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('Mod')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')

    const key = e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toLowerCase() : key)
      onRecord(parts.join('+'))
    }
  }, [onRecord])

  useEffect(() => {
    if (!recording) return
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, handleKeyDown])

  return (
    <button
      onClick={() => setRecording(true)}
      onBlur={() => { setRecording(false); onCancel() }}
      style={{
        padding: '4px 8px',
        border: recording ? '2px solid var(--button-primary)' : '1px solid var(--editor-border)',
        borderRadius: 4,
        background: 'var(--editor-bg)',
        color: 'var(--editor-text)',
        fontSize: 12,
        cursor: 'pointer',
        minWidth: 120,
      }}
    >
      {recording ? '按下快捷键...' : '点击录制'}
    </button>
  )
}
