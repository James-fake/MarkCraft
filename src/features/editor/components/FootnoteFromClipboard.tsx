/**
 * P2-6 粘贴为脚注（编辑器右侧栏轻量动作）
 * 点击后读取剪贴板：若为单个 URL，则交给父级转为脚注（本地、不上云）。
 */
import { useState } from 'react'

export interface FootnoteFromClipboardProps {
  onAddFootnote: (url: string) => void
}

export default function FootnoteFromClipboard({ onAddFootnote }: FootnoteFromClipboardProps) {
  const [status, setStatus] = useState<string | null>(null)

  const handleClick = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text || !/^https?:\/\/\S+$/i.test(text)) {
        setStatus('剪贴板中不是有效 URL')
        return
      }
      onAddFootnote(text)
      setStatus('已转为脚注')
    } catch {
      setStatus('无法读取剪贴板')
    }
  }

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--mc-border-subtle)' }}>
      <button
        onClick={handleClick}
        aria-label="粘贴为脚注"
        style={{
          width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8,
          border: '1px solid var(--mc-border-subtle)', background: 'transparent',
          cursor: 'pointer', color: 'var(--editor-text)', fontSize: 11,
        }}
      >
        粘贴剪贴板 URL 为脚注
      </button>
      {status && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6, color: 'var(--editor-text)' }}>
          {status}
        </div>
      )}
    </div>
  )
}
