/**
 * P2-6 粘贴为脚注（编辑器右侧栏轻量动作）
 * 点击后读取剪贴板：若为单个 URL，则交给父级转为脚注（本地、不上云）。
 */
import { useState } from 'react'
import { useLanguage } from '@stores/LanguageStore'

export interface FootnoteFromClipboardProps {
  /** 传入剪贴板文本（可多行 / 标题+URL / DOI）；返回是否成功转为脚注 */
  onAddFootnote: (text: string) => boolean
}

export default function FootnoteFromClipboard({ onAddFootnote }: FootnoteFromClipboardProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<string | null>(null)

  const handleClick = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) {
        setStatus(t.editorWidgets.clipboardEmpty)
        return
      }
      const ok = onAddFootnote(text)
      setStatus(ok ? t.editorWidgets.clipboardFootnoteAdded : t.editorWidgets.clipboardNotUrl)
    } catch {
      setStatus(t.editorWidgets.clipboardReadFailed)
    }
  }

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--mc-border-subtle)' }}>
      <button
        onClick={handleClick}
        aria-label={t.editorWidgets.clipboardFootnoteAria}
        style={{
          width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8,
          border: '1px solid var(--mc-border-subtle)', background: 'transparent',
          cursor: 'pointer', color: 'var(--editor-text)', fontSize: 11,
        }}
      >
        {t.editorWidgets.clipboardFootnoteButton}
      </button>
      {status && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6, color: 'var(--editor-text)' }}>
          {status}
        </div>
      )}
    </div>
  )
}
