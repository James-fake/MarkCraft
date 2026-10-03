import { useState } from 'react'
import { useThemeTokens } from './themeTokens'
import { useLanguage } from '@stores/LanguageStore'

const CSS_VARIABLES: Array<{ name: string; zh: string; en: string; example: string }> = [
  { name: '--accent-warm', zh: '主题强调色', en: 'Theme accent color', example: '#d97706' },
  { name: '--accent-cool', zh: '冷调强调色', en: 'Cool accent color', example: '#0891b2' },
  { name: '--accent-violet', zh: '紫色强调色', en: 'Violet accent color', example: '#7c3aed' },
  { name: '--accent-rose', zh: '玫瑰强调色', en: 'Rose accent color', example: '#e11d48' },
  { name: '--accent-emerald', zh: '翡翠强调色', en: 'Emerald accent color', example: '#059669' },
  { name: '--accent-light', zh: '强调色浅色', en: 'Accent light shade', example: 'rgba(...)' },
  { name: '--bg-primary', zh: '主背景色', en: 'Primary background', example: '#fafaf8' },
  { name: '--bg-secondary', zh: '次背景色', en: 'Secondary background', example: '#f5f3ef' },
  { name: '--bg-card', zh: '卡片背景', en: 'Card background', example: 'rgba(255,255,255,0.7)' },
  { name: '--text-primary', zh: '主文字色', en: 'Primary text', example: '#1a1a1a' },
  { name: '--text-secondary', zh: '次文字色', en: 'Secondary text', example: '#5a5a5a' },
  { name: '--text-muted', zh: '弱文字色', en: 'Muted text', example: '#9a9a9a' },
  { name: '--border-color', zh: '边框色', en: 'Border color', example: 'rgba(0,0,0,0.06)' },
  { name: '--shadow-card', zh: '卡片阴影', en: 'Card shadow', example: '0 4px 24px rgba(...)' },
  { name: '--radius', zh: '大圆角', en: 'Large radius', example: '16px' },
  { name: '--radius-sm', zh: '小圆角', en: 'Small radius', example: '10px' },
  { name: '--max-width', zh: '内容最大宽度', en: 'Max content width', example: '800px' },
  { name: '--transition', zh: '过渡时间', en: 'Transition duration', example: '0.35s ease' },
]

const CSS_SELECTORS: Array<{ selector: string; zh: string; en: string }> = [
  { selector: '.site-header', zh: '顶部导航栏', en: 'Top navigation bar' },
  { selector: '.site-title', zh: '站点标题', en: 'Site title' },
  { selector: '.site-nav', zh: '导航链接区', en: 'Nav links' },
  { selector: '.hero-section', zh: '首页英雄区', en: 'Home hero section' },
  { selector: '.hero-title', zh: '英雄区标题', en: 'Hero title' },
  { selector: '.hero-desc', zh: '英雄区描述', en: 'Hero description' },
  { selector: '.featured-card', zh: '精选文章卡片', en: 'Featured post card' },
  { selector: '.grid-card', zh: '网格文章卡片', en: 'Grid post card' },
  { selector: '.minimal-item', zh: '极简列表项', en: 'Minimal list item' },
  { selector: '.classic-card', zh: '经典卡片', en: 'Classic card' },
  { selector: '.classic-sidebar', zh: '经典侧边栏', en: 'Classic sidebar' },
  { selector: '.post-header', zh: '文章标题区', en: 'Post header' },
  { selector: '.post-header h1', zh: '文章标题', en: 'Post title' },
  { selector: '.post-content', zh: '文章正文', en: 'Post content' },
  { selector: '.post-content p', zh: '正文段落', en: 'Body paragraph' },
  { selector: '.post-content blockquote', zh: '引用块', en: 'Blockquote' },
  { selector: '.post-content pre', zh: '代码块', en: 'Code block' },
  { selector: '.post-content code', zh: '行内代码', en: 'Inline code' },
  { selector: '.post-content img', zh: '文章图片', en: 'Post image' },
  { selector: '.post-tags', zh: '标签区域', en: 'Tags area' },
  { selector: '.post-author-card', zh: '作者卡片', en: 'Author card' },
  { selector: '.back-link', zh: '返回链接', en: 'Back link' },
  { selector: '.site-footer', zh: '页脚', en: 'Footer' },
  { selector: '.tag', zh: '标签', en: 'Tag' },
  { selector: '.blog-header', zh: '博客头部(新主题)', en: 'Blog header (new theme)' },
  { selector: '.card', zh: '文章卡片(新主题)', en: 'Post card (new theme)' },
  { selector: '.card-title', zh: '卡片标题(新主题)', en: 'Card title (new theme)' },
  { selector: '.post-detail', zh: '文章详情(新主题)', en: 'Post detail (new theme)' },
  { selector: '.post-content', zh: '文章正文(新主题)', en: 'Post content (new theme)' },
  { selector: '.blog-footer', zh: '博客页脚(新主题)', en: 'Blog footer (new theme)' },
]

interface CssReferenceProps {
  onInsertAtCursor: (text: string) => void
}

export function CssReference({ onInsertAtCursor }: CssReferenceProps) {
  const tk = useThemeTokens()
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
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
          {t.blogCss.cssVarRef}
        </button>
        {showVarRef && (          <div style={{
            maxHeight: 180, overflowY: 'auto', borderRadius: 8,
            border: `1px solid ${tk.border}`, background: tk.surface,
          }}>
            {CSS_VARIABLES.map(v => (
              <button key={v.name} onClick={() => onInsertAtCursor(`var(${v.name})`)}
                title={t.blogCss.insertVarTip.replace('{name}', v.name)}
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
                  {isZh ? v.zh : v.en}
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
          {t.blogCss.cssSelectorRef}
        </button>
        {showSelRef && (
          <div style={{
            maxHeight: 180, overflowY: 'auto', borderRadius: 8,
            border: `1px solid ${tk.border}`, background: tk.surface,
          }}>
            {CSS_SELECTORS.map((s, i) => (
              <button key={`${s.selector}-${i}`} onClick={() => onInsertAtCursor(`${s.selector} {\n  \n}`)}
                title={t.blogCss.insertSelectorTip.replace('{selector}', s.selector)}
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
                  {isZh ? s.zh : s.en}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
