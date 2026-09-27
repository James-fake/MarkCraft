import React from 'react'
import { BlogConfig } from '../templates'
import type { Translations } from '@src/types/translations'
import { AuroraSelect } from '@components/ui/AuroraSelect'

interface BlogConfigFormProps {
  config: BlogConfig
  setConfig: React.Dispatch<React.SetStateAction<BlogConfig>>
  t: Translations
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid var(--editor-border)',
  borderRadius: 6,
  backgroundColor: 'var(--editor-bg)',
  color: 'var(--editor-text)',
  outline: 'none',
  fontFamily: "'Inter', -apple-system, sans-serif",
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--editor-text)',
  opacity: 0.8,
  fontFamily: "'Inter', -apple-system, sans-serif",
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--link-color)'
  e.currentTarget.style.boxShadow = '0 0 0 2px var(--mc-accent-soft)'
}

const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--editor-border)'
  e.currentTarget.style.boxShadow = 'none'
}

export default function BlogConfigForm({ config, setConfig, t }: BlogConfigFormProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.siteTitle}</label>
        <input
          type="text"
          value={config.siteTitle}
          onChange={(e) => setConfig(prev => ({ ...prev, siteTitle: e.target.value }))}
          placeholder="My Blog"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.siteDescription}</label>
        <textarea
          value={config.siteDescription}
          onChange={(e) => setConfig(prev => ({ ...prev, siteDescription: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.author}</label>
        <input
          type="text"
          value={config.author}
          onChange={(e) => setConfig(prev => ({ ...prev, author: e.target.value }))}
          placeholder="Anonymous"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.siteUrl}</label>
        <input
          type="text"
          value={config.siteUrl}
          onChange={(e) => setConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
          placeholder="https://example.com"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.theme}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setConfig(prev => ({ ...prev, theme: 'light' }))}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              border: config.theme === 'light' ? '2px solid var(--link-color)' : '1px solid var(--editor-border)',
              borderRadius: 6,
              backgroundColor: config.theme === 'light' ? 'var(--mc-accent-soft)' : 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            ☀️ {t.blogModal.lightTheme}
          </button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, theme: 'dark' }))}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              border: config.theme === 'dark' ? '2px solid var(--link-color)' : '1px solid var(--editor-border)',
              borderRadius: 6,
              backgroundColor: config.theme === 'dark' ? 'var(--mc-accent-soft)' : 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            🌙 {t.blogModal.darkTheme}
          </button>
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t.blogModal.language}</label>
        <AuroraSelect
          value={config.language}
          onChange={(v) => setConfig(prev => ({ ...prev, language: v }))}
          options={[
            { value: 'zh-CN', label: '中文 (zh-CN)' },
            { value: 'en', label: 'English (en)' },
          ]}
          className="aurora-select--block"
        />
      </div>

      <div style={{ ...fieldGroupStyle, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--editor-border)' }}>
        <label style={{ ...labelStyle, fontWeight: 600 }}>扩展功能</label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setConfig(prev => ({ ...prev, enableBusuanzi: !prev.enableBusuanzi }))}
          style={{
            flex: '1 1 auto', padding: '8px 12px', fontSize: 12, fontWeight: 500,
            border: config.enableBusuanzi ? '2px solid var(--link-color)' : '1px solid var(--editor-border)',
            borderRadius: 6, cursor: 'pointer',
            backgroundColor: config.enableBusuanzi ? 'var(--mc-accent-soft)' : 'transparent',
            color: 'var(--editor-text)', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
          }}
        >👁️ 阅读量统计</button>
        <button
          onClick={() => setConfig(prev => ({ ...prev, enableApplause: !prev.enableApplause }))}
          style={{
            flex: '1 1 auto', padding: '8px 12px', fontSize: 12, fontWeight: 500,
            border: config.enableApplause ? '2px solid var(--link-color)' : '1px solid var(--editor-border)',
            borderRadius: 6, cursor: 'pointer',
            backgroundColor: config.enableApplause ? 'var(--mc-accent-soft)' : 'transparent',
            color: 'var(--editor-text)', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
          }}
        >👏 文章点赞</button>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>打赏功能</label>
        <button
          onClick={() => setConfig(prev => ({ ...prev, reward: { enable: !prev.reward?.enable, wechatQrcode: prev.reward?.wechatQrcode, alipayQrcode: prev.reward?.alipayQrcode, title: prev.reward?.title } }))}
          style={{
            padding: '6px 12px', fontSize: 12, fontWeight: 500,
            border: config.reward?.enable ? '2px solid var(--link-color)' : '1px solid var(--editor-border)',
            borderRadius: 6, cursor: 'pointer', width: 'fit-content',
            backgroundColor: config.reward?.enable ? 'var(--mc-accent-soft)' : 'transparent',
            color: 'var(--editor-text)', fontFamily: "'Inter', sans-serif",
          }}
        >{config.reward?.enable ? '✅ 已启用' : '启用打赏'}</button>
        {config.reward?.enable && (
          <>
            <input type="text" value={config.reward.wechatQrcode || ''} onChange={(e) => setConfig(prev => ({ ...prev, reward: { ...prev.reward!, wechatQrcode: e.target.value } }))} placeholder="微信收款码 URL" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            <input type="text" value={config.reward.alipayQrcode || ''} onChange={(e) => setConfig(prev => ({ ...prev, reward: { ...prev.reward!, alipayQrcode: e.target.value } }))} placeholder="支付宝收款码 URL" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
          </>
        )}
      </div>
    </div>
  )
}
