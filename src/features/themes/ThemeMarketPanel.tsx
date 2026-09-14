import { useState } from 'react'
import { fetchMarketThemes, installMarketTheme, DEFAULT_THEME_MARKET_ENDPOINT } from './ThemeMarket'
import type { EditorTheme } from './ThemeManager'
import { logger } from '../../utils/logger'

interface ThemeMarketPanelProps {
  open: boolean
  onClose: () => void
  onApplied: (themeId: string) => void
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const panelStyle: React.CSSProperties = {
  width: 'min(520px, 92vw)',
  maxHeight: '80vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--sidebar-bg, #fff)',
  color: 'var(--sidebar-text, #222)',
  border: '1px solid var(--sidebar-border, #ddd)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid var(--sidebar-border, #ddd)',
  fontWeight: 600,
}

const closeBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  color: 'inherit',
}

const bodyStyle: React.CSSProperties = {
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--sidebar-border, #ddd)',
  background: 'var(--editor-bg, #fff)',
  color: 'var(--editor-text, #222)',
  fontSize: 12,
  outline: 'none',
}

const fetchBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--button-primary, #2563eb)',
  background: 'var(--button-primary-bg, rgba(37,99,235,0.1))',
  color: 'var(--button-primary, #2563eb)',
  fontSize: 12,
  cursor: 'pointer',
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--sidebar-border, #ddd)',
}

const applyBtnStyle: React.CSSProperties = {
  padding: '4px 14px',
  borderRadius: 6,
  border: '1px solid var(--button-primary, #2563eb)',
  background: 'var(--button-primary, #2563eb)',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
}

export default function ThemeMarketPanel({ open, onClose, onApplied }: ThemeMarketPanelProps) {
  const [endpoint, setEndpoint] = useState(DEFAULT_THEME_MARKET_ENDPOINT)
  const [themes, setThemes] = useState<EditorTheme[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchMarketThemes(endpoint)
      setThemes(list)
      if (list.length === 0) setError('市场返回为空')
    } catch (e) {
      setError(e instanceof Error ? e.message : '拉取失败')
      logger.error('[ThemeMarketPanel] fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (theme: EditorTheme) => {
    installMarketTheme(theme)
    onApplied(theme.id)
    onClose()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>🎨 主题市场</span>
          <button onClick={onClose} style={closeBtnStyle} aria-label="关闭">✕</button>
        </div>
        <div style={bodyStyle}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="市场清单 URL（返回 JSON 主题数组）"
              style={inputStyle}
            />
            <button onClick={handleFetch} disabled={loading} style={fetchBtnStyle}>
              {loading ? '拉取中…' : '拉取'}
            </button>
          </div>

          {error && <div style={{ color: '#e55', fontSize: 12 }}>{error}</div>}

          {themes.length === 0 && !loading && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              尚无主题。配置市场地址后点击「拉取」（应用前会自动净化 @import / 外部 url() / javascript:）。
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {themes.map((t) => (
              <div key={t.id} style={cardStyle}>
                <div>
                  <div style={{ fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {t.type === 'dark' ? '深色' : '浅色'} · 净化后应用
                  </div>
                </div>
                <button onClick={() => handleApply(t)} style={applyBtnStyle}>应用</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
