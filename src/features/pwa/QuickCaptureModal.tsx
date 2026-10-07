import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import { buildQuickNote } from './quickCapture'
import { Button } from '../../components/ui'

interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  /** 落盘回调：由调用方决定写入哪个收件箱/根 */
  onCreate: (name: string, content: string) => void
}

const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { language } = useLanguage()
  const isZh = language === 'zh'
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const onCloseRef = useRef(onClose)
  const onCreateRef = useRef(onCreate)
  useEffect(() => {
    onCloseRef.current = onClose
    onCreateRef.current = onCreate
  }, [onClose, onCreate])

  useEffect(() => {
    if (isOpen) {
      setText('')
      requestAnimationFrame(() => {
        setVisible(true)
        setTimeout(() => textareaRef.current?.focus(), 200)
      })
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const texts = {
    title: isZh ? '快速记一笔' : 'Quick Capture',
    hint: isZh ? '离线也能记，落盘到本地收件箱' : 'Works offline, saved to your local inbox',
    placeholder: isZh ? '闪过一个念头？现在记下来…' : 'A thought? Capture it now…',
    capture: isZh ? '记一笔' : 'Capture',
    cancel: isZh ? '关闭' : 'Close',
    empty: isZh ? '先写点什么吧' : 'Write something first',
  }

  const handleCapture = useCallback(() => {
    const content = text.trim()
    if (!content) return
    const name = buildQuickNote(content).name
    onCreateRef.current(name, content)
    setText('')
    onCloseRef.current()
  }, [text])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current()
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCapture()
    }
  }, [handleCapture])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        backdropFilter: 'blur(4px)', transition: 'background-color 0.3s ease',
      }}
        onClick={onCloseRef.current}
      >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '520px',
          backgroundColor: 'var(--mc-bg-panel)', border: '1px solid var(--mc-border-subtle)',
          borderRadius: 'var(--mc-radius-lg)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          padding: 24, boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--mc-text-primary)', letterSpacing: '-0.01em' }}>
            {texts.title}
          </h2>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 999, color: '#34d399',
            border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.08)',
          }}>
            {texts.hint}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={texts.placeholder}
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            padding: '12px 14px', fontSize: 14, lineHeight: 1.6,
            border: '1px solid var(--mc-border-subtle)', borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--mc-text-primary)',
            outline: 'none', fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={onCloseRef.current}>{texts.cancel}</Button>
          <Button variant="brand" onClick={handleCapture} disabled={!text.trim()}>
            {texts.capture}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QuickCaptureModal
