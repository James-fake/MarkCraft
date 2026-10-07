import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useFileManager } from '../../stores/FileStore'
import { useLanguage } from '../../stores/LanguageStore'

interface Props {
  visible: boolean
  onClose: () => void
}

const LinkRedirectDialog: React.FC<Props> = ({ visible, onClose }) => {
  const [fromTarget, setFromTarget] = useState('')
  const [toTarget, setToTarget] = useState('')
  const [preview, setPreview] = useState<{ fileCount: number; linkCount: number } | null>(null)
  const { fileIndex, indexVersion } = useLinkIndex()
  const { getFileContent, updateFileContent } = useFileManager()
  const { t } = useLanguage()

  void indexVersion

  const handlePreview = useCallback(() => {
    if (!fromTarget.trim()) return
    let fileCount = 0
    let linkCount = 0
    for (const [, entry] of fileIndex) {
      const content = getFileContent(entry.fileId)
      if (!content) continue
      const regex = new RegExp(`\\[\\[${fromTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\|[^\\]]+)?\\]\\]`, 'g')
      const matches = content.match(regex)
      if (matches && matches.length > 0) {
        fileCount++
        linkCount += matches.length
      }
    }
    setPreview({ fileCount, linkCount })
  }, [fromTarget, fileIndex, getFileContent])

  const handleRedirect = useCallback(() => {
    if (!fromTarget.trim() || !toTarget.trim()) return
    const fromRegex = new RegExp(`\\[\\[${fromTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]+)?\\]\\]`, 'g')

    for (const [, entry] of fileIndex) {
      const content = getFileContent(entry.fileId)
      if (!content) continue
      const newContent = content.replace(fromRegex, (_, pipe) => `[[${toTarget}${pipe || ''}]]`)
      if (newContent !== content) {
        updateFileContent(entry.fileId, newContent)
      }
    }

    setFromTarget('')
    setToTarget('')
    setPreview(null)
    onClose()
  }, [fromTarget, toTarget, fileIndex, getFileContent, updateFileContent, onClose])

  if (!visible) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{ width: 420, background: 'var(--mc-bg-panel, #1e1e2e)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mc-text-secondary)', marginBottom: 16 }}>{t.linkRedirectDialog.title}</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--mc-text-secondary)', opacity: 0.6, display: 'block', marginBottom: 4 }}>{t.linkRedirectDialog.fromLabel}</label>
          <input value={fromTarget} onChange={e => { setFromTarget(e.target.value); setPreview(null) }} placeholder={t.linkRedirectDialog.fromPlaceholder} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--mc-text-secondary)', opacity: 0.6, display: 'block', marginBottom: 4 }}>{t.linkRedirectDialog.toLabel}</label>
          <input value={toTarget} onChange={e => setToTarget(e.target.value)} placeholder={t.linkRedirectDialog.toPlaceholder} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={handlePreview} style={btnStyle}>{t.linkRedirectDialog.previewBtn}</button>
          <button onClick={handleRedirect} disabled={!fromTarget.trim() || !toTarget.trim()} style={{ ...btnStyle, opacity: (!fromTarget.trim() || !toTarget.trim()) ? 0.5 : 1 }}>{t.linkRedirectDialog.applyBtn}</button>
        </div>

        {preview && (
          <div style={{ fontSize: 12, color: 'var(--mc-text-secondary)', opacity: 0.7, padding: '8px 12px', background: 'var(--mc-accent-soft)', borderRadius: 6 }}>
            {t.linkRedirectDialog.previewResult
              .replace('{files}', String(preview.fileCount))
              .replace('{links}', String(preview.linkCount))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)',
  color: 'var(--mc-text-secondary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)',
  background: 'var(--mc-accent-soft)', color: 'var(--mc-accent)', fontSize: 12, cursor: 'pointer',
}

export default LinkRedirectDialog
