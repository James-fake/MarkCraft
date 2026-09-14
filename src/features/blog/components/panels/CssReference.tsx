import { useState } from 'react'
import { useThemeTokens } from './themeTokens'

const CSS_VARIABLES: Array<{ name: string; desc: string; example: string }> = [
  { name: '--accent-warm', desc: '主题强调色', example: '#d97706' },
  { name: '--accent-cool', desc: '冷调强调色', example: '#0891b2' },
  { name: '--accent-violet', desc: '紫色强调色', example: '#7c3aed' },
  { name: '--accent-rose', desc: '玫瑰强调色', example: '#e11d48' },
  { name: '--accent-emerald', desc: '翡翠强调色', example: '#059669' },
  { name: '--accent-light', desc: '强调色浅色', example: 'rgba(...)' },
  { name: '--bg-primary', desc: '主背景色', example: '#fafaf8' },
  { name: '--bg-secondary', desc: '次背景色', example: '#f5f3ef' },
  { name: '--bg-card', desc: '卡片背景', example: 'rgba(255,255,255,0.7)' },
  { name: '--text-primary', desc: '主文字色', example: '#1a1a1a' },
  { name: '--text-secondary', desc: '次文字色', example: '#5a5a5a' },
  { name: '--text-muted', desc: '弱文字色', example: '#9a9a9a' },
  { name: '--border-color', desc: '边框色', example: 'rgba(0,0,0,0.06)' },
  { name: '--shadow-card', desc: '卡片阴影', example: '0 4px 24px rgba(...)' },
  { name: '--radius', desc: '大圆角', example: '16px' },
  { name: '--radius-sm', desc: '小圆角', example: '10px' },
  { name: '--max-width', desc: '内容最大宽度', example: '800px' },
  { name: '--transition', desc: '过渡时间', example: '0.35s ease' },
]

const CSS_SELECTORS: Array<{ selector: string; desc: string }> = [
  { selector: '.site-header', desc: '顶部导航栏' },
  { selector: '.site-title', desc: '站点标题' },
  { selector: '.site-nav', desc: '导航链接区' },
  { selector: '.hero-section', desc: '首页英雄区' },
  { selector: '.hero-title', desc: '英雄区标题' },
  { selector: '.hero-desc', desc: '英雄区描述' },
  { selector: '.featured-card', desc: '精选文章卡片' },
  { selector: '.grid-card', desc: '网格文章卡片' },
  { selector: '.minimal-item', desc: '极简列表项' },
  { selector: '.classic-card', desc: '经典卡片' },
  { selector: '.classic-sidebar', desc: '经典侧边栏' },
  { selector: '.post-header', desc: '文章标题区' },
  { selector: '.post-header h1', desc: '文章标题' },
  { selector: '.post-content', desc: '文章正文' },
  { selector: '.post-content p', desc: '正文段落' },
  { selector: '.post-content blockquote', desc: '引用块' },
  { selector: '.post-content pre', desc: '代码块' },
  { selector: '.post-content code', desc: '行内代码' },
  { selector: '.post-content img', desc: '文章图片' },
  { selector: '.post-tags', desc: '标签区域' },
  { selector: '.post-author-card', desc: '作者卡片' },
  { selector: '.back-link', desc: '返回链接' },
  { selector: '.site-footer', desc: '页脚' },
  { selector: '.tag', desc: '标签' },
  { selector: '.blog-header', desc: '博客头部(新主题)' },
  { selector: '.card', desc: '文章卡片(新主题)' },
  { selector: '.card-title', desc: '卡片标题(新主题)' },
  { selector: '.post-detail', desc: '文章详情(新主题)' },
  { selector: '.post-content', desc: '文章正文(新主题)' },
  { selector: '.blog-footer', desc: '博客页脚(新主题)' },
]

interface CssReferenceProps {
  onInsertAtCursor: (text: string) => void
}

export function CssReference({ onInsertAtCursor }: CssReferenceProps) {
  const tk = useThemeTokens()
  const [showVarRef, setShowVarRef] = useState(false)
  const [showSelRef, setShowSelRef] = useState(false)

  return (
    <>
      {/* CSS Variable Reference */}
      <div>
        <button onClick={() => setShowVarRef(!showVarRef)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '5px 0', border: 'none', background: 'transparent',
            color: tk.textMuted, cursor: 'pointer', fontSize: 10,
            fontWeight: 600, letterSpacing: '0.04em',
          }}
        >
          <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: showVarRef ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          CSS 变量参考
        </button>
        {showVarRef && (
          <div style={{
            maxHeight: 180, overflowY: 'auto', borderRadius: 8,
            border: `1px solid ${tk.border}`, background: tk.surface,
          }}>
            {CSS_VARIABLES.map(v => (
              <button key={v.name} onClick={() => onInsertAtCursor(`var(${v.name})`)}
                title={`点击插入 var(${v.name})`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '4px 10px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: `1px solid ${tk.border}`,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = tk.inputBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontSize: 10, fontFamily: "'Fira Code', monospace", color: tk.codeColor,
                  minWidth: 130, flexShrink: 0,
                }}>
                  {v.name}
                </span>
                <span style={{ fontSize: 9, color: tk.textFaint, flex: 1 }}>
                  {v.desc}
                </span>
                <span style={{ fontSize: 9, color: tk.textFaint, fontFamily: "'Fira Code', monospace" }}>
                  {v.example}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector Reference */}
      <div>
        <button onClick={() => setShowSelRef(!showSelRef)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '5px 0', border: 'none', background: 'transparent',
            color: tk.textMuted, cursor: 'pointer', fontSize: 10,
            fontWeight: 600, letterSpacing: '0.04em',
          }}
        >
          <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: showSelRef ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          选择器参考
        </button>
        {showSelRef && (
          <div style={{
            maxHeight: 180, overflowY: 'auto', borderRadius: 8,
            border: `1px solid ${tk.border}`, background: tk.surface,
          }}>
            {CSS_SELECTORS.map((s, i) => (
              <button key={`${s.selector}-${i}`} onClick={() => onInsertAtCursor(`${s.selector} {\n  \n}`)}
                title={`点击插入 ${s.selector} { }`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '4px 10px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: `1px solid ${tk.border}`,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = tk.inputBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontSize: 10, fontFamily: "'Fira Code', monospace", color: tk.selectorColor,
                  minWidth: 160, flexShrink: 0,
                }}>
                  {s.selector}
                </span>
                <span style={{ fontSize: 9, color: tk.textFaint }}>
                  {s.desc}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
