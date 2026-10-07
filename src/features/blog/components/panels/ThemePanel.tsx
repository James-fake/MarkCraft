import { useState, useCallback, useEffect } from 'react'
import { THEME_INFO_LIST, THEME_CATEGORIES, THEME_STYLE_TAGS, FEATURED_THEMES, type ThemeInfo, type ThemeCategory, type ThemeTag } from '../../hooks/useBlogGenerator'
import { ThemeStyle } from '../../templates'
import { useLanguage } from '@stores/LanguageStore'
import { SectionLabel, useStudioTheme } from '../StudioControls'
import { useDensity, scaleGap } from '@hooks/useDensity'

const FAVORITE_KEY = 'markcraft-blog-theme-favorites'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveFavorites(favs: Set<string>) {
  try {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(Array.from(favs)))
  } catch {
    // ignore
  }
}

interface ThemePanelProps {
  currentThemeStyle: ThemeStyle
  onThemeChange: (themeStyle: ThemeStyle) => void
}

export function ThemePanel({ currentThemeStyle, onThemeChange }: ThemePanelProps) {
  const { language } = useLanguage()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(16, density)
  const isZh = language === 'zh'

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ThemeCategory | 'all'>('all')
  const [activeTags, setActiveTags] = useState<ThemeTag[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites())

  // 同步其他面板的收藏变更（如多标签页场景）
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === FAVORITE_KEY) setFavorites(loadFavorites())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const handleToggleFavorite = useCallback((e: React.MouseEvent, themeKey: string) => {
    e.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(themeKey)) {
        next.delete(themeKey)
      } else {
        next.add(themeKey)
      }
      saveFavorites(next)
      return next
    })
  }, [])

  // Theme-aware color tokens
  const card = {
    border: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
    bg: d ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)',
    color: d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)',
    activeColor: d ? '#e4e4e7' : '#1a1a1a',
    hoverBg: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    hoverBorder: d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
  }

  const displayThemes = THEME_INFO_LIST.filter(theme => {
    // 默认视图（无搜索/无分类/无标签）只露精品主题；主动搜索/筛选时展示全部可探索（P1-1.3 B1）
    if (!searchQuery && activeCategory === 'all' && activeTags.length === 0 && !FEATURED_THEMES.includes(theme.key)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const match = theme.name.zh.includes(q) || theme.name.en.toLowerCase().includes(q) || theme.description.zh.includes(q) || theme.description.en.toLowerCase().includes(q) || theme.tags.some(t => t.includes(q))
      if (!match) return false
    }
    if (activeCategory !== 'all' && theme.category !== activeCategory) return false
    if (activeTags.length > 0 && !activeTags.every(t => theme.tags.includes(t as ThemeTag))) return false
    return true
  }).sort((a, b) => {
    // 严格按英文名称首字母 A-Z 排序（第二个字母 A-Z 以此类推）
    // 使用 base sensitivity 忽略重音符号（如 Café 当作 Cafe），保证稳定排序
    const aName = a.name.en.toLowerCase()
    const bName = b.name.en.toLowerCase()
    return aName.localeCompare(bName, 'en', { sensitivity: 'base' })
  })

  const handleTagToggle = useCallback((tag: ThemeTag) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleThemeSelect = useCallback((theme: ThemeInfo) => {
    // 仅通过单击选择切换主题：直接提交，避免任何悬停预览的中间态造成闪烁
    onThemeChange(theme.key)
  }, [onThemeChange])

  const getCategoryLabel = (cat: ThemeCategory) => {
    const found = THEME_CATEGORIES.find(c => c.key === cat)
    return found ? (isZh ? found.zh : found.en) : cat
  }

  const getTagLabel = (tag: ThemeTag) => {
    const found = THEME_STYLE_TAGS.find(t => t.key === tag)
    return found ? (isZh ? found.zh : found.en) : tag
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      {/* Search Box */}
      <div>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24"
            stroke={d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
            strokeWidth={2}
            style={{ position: 'absolute', left: 10, flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isZh ? '搜索主题...' : 'Search themes...'}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: 12,
              border: `1px solid ${d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 10,
              backgroundColor: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              color: d ? '#e4e4e7' : '#1a1a1a',
              outline: 'none',
              fontFamily: "'Inter', -apple-system, sans-serif",
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8,
                width: 18, height: 18, border: 'none', borderRadius: 9,
                background: d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                color: d ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, lineHeight: 1,
              }}
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div>
        <SectionLabel>{isZh ? '分类' : 'Category'}</SectionLabel>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
        }}>
          {THEME_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  border: `1px solid ${isActive ? 'rgba(167,139,250,0.4)' : card.border}`,
                  borderRadius: 8,
                  background: isActive ? 'rgba(167,139,250,0.12)' : card.bg,
                  color: isActive ? '#a78bfa' : card.color,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(167,139,250,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)'
                    e.currentTarget.style.color = '#a78bfa'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = card.bg
                    e.currentTarget.style.borderColor = card.border
                    e.currentTarget.style.color = card.color
                  }
                }}
              >
                {isZh ? cat.zh : cat.en}
              </button>
            )
          })}
        </div>
      </div>

      {/* Style Tag Filters */}
      <div>
        <SectionLabel>{isZh ? '风格标签' : 'Style Tags'}</SectionLabel>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
        }}>
          {THEME_STYLE_TAGS.map(tag => {
            const isActive = activeTags.includes(tag.key)
            return (
              <button
                key={tag.key}
                onClick={() => handleTagToggle(tag.key)}
                style={{
                  padding: '3px 8px',
                  fontSize: 9.5,
                  fontWeight: isActive ? 600 : 500,
                  border: `1px solid ${isActive ? 'rgba(56,189,248,0.4)' : card.border}`,
                  borderRadius: 6,
                  background: isActive ? 'rgba(56,189,248,0.12)' : card.bg,
                  color: isActive ? '#38bdf8' : card.color,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(56,189,248,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)'
                    e.currentTarget.style.color = '#38bdf8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = card.bg
                    e.currentTarget.style.borderColor = card.border
                    e.currentTarget.style.color = card.color
                  }
                }}
              >
                {isZh ? tag.zh : tag.en}
              </button>
            )
          })}
        </div>
      </div>

      {/* Theme Card Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionLabel>{isZh ? '主题市场' : 'Theme Marketplace'}</SectionLabel>
          <span style={{ fontSize: 9, color: card.color }}>
            {displayThemes.length} {isZh ? '个主题' : 'themes'}
          </span>
        </div>

        {displayThemes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 0',
            color: card.color, fontSize: 12,
          }}>
            {isZh ? '没有匹配的主题' : 'No matching themes'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {displayThemes.map(theme => {
              const isSelected = currentThemeStyle === theme.key
              return (
                <div
                  key={theme.key}
                  onClick={() => handleThemeSelect(theme)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = card.hoverBg
                      e.currentTarget.style.borderColor = card.hoverBorder
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = card.bg
                      e.currentTarget.style.borderColor = card.border
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 12,
                    border: isSelected
                      ? '1.5px solid rgba(167,139,250,0.6)'
                      : `1px solid ${card.border}`,
                    backgroundColor: isSelected
                      ? 'rgba(167,139,250,0.06)'
                      : card.bg,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    position: 'relative',
                    boxShadow: isSelected
                      ? '0 2px 12px rgba(167,139,250,0.15)'
                      : 'none',
                  }}
                >
                  {/* Gradient Preview Bar */}
                  <div style={{
                    height: 60,
                    background: theme.gradient,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* SVG Icon */}
                    <svg
                      width="24" height="24" fill="none" viewBox="0 0 24 24"
                      stroke="rgba(255,255,255,0.85)" strokeWidth={1.5}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={theme.icon} />
                    </svg>

                    {/* Favorite Star — 点击收藏/取消收藏 */}
                    <div
                      onClick={(e) => handleToggleFavorite(e, theme.key)}
                      title={favorites.has(theme.key) ? (isZh ? '取消收藏' : 'Remove from favorites') : (isZh ? '添加收藏' : 'Add to favorites')}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 22, height: 22, borderRadius: 11,
                        background: favorites.has(theme.key) ? 'rgba(251,191,36,0.9)' : 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: favorites.has(theme.key) ? '0 1px 4px rgba(251,191,36,0.5)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!favorites.has(theme.key)) {
                          e.currentTarget.style.background = 'rgba(251,191,36,0.4)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!favorites.has(theme.key)) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
                        }
                      }}
                    >
                      <svg width="11" height="11" fill={favorites.has(theme.key) ? '#fff' : 'rgba(255,255,255,0.7)'} viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>

                    {/* Selected Check */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', bottom: 6, right: 6,
                        width: 20, height: 20, borderRadius: 10,
                        background: 'rgba(167,139,250,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 8px rgba(167,139,250,0.5)',
                      }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Category Label */}
                    <div style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: '#a78bfa',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}>
                      {getCategoryLabel(theme.category)}
                    </div>

                    {/* Theme Name — 始终以英文名为主显示，使 A-Z 排序直观可见 */}
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? card.activeColor : (d ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'),
                      lineHeight: 1.2,
                    }}>
                      {theme.name.en}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 400,
                        color: card.color,
                        marginLeft: 4,
                      }}>
                        {theme.name.zh}
                      </span>
                    </div>

                    {/* Description */}
                    <div style={{
                      fontSize: 10,
                      color: card.color,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {isZh ? theme.description.zh : theme.description.en}
                    </div>

                    {/* Style Tags */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2,
                    }}>
                      {theme.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '1px 5px',
                          fontSize: 8,
                          fontWeight: 500,
                          borderRadius: 4,
                          background: d ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.06)',
                          color: d ? 'rgba(56,189,248,0.7)' : 'rgba(14,165,233,0.7)',
                          border: `1px solid ${d ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.12)'}`,
                        }}>
                          {getTagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
