import { useState, useRef, useCallback, useEffect } from 'react'
import { PanelProps } from './shared'
import { useLanguage } from '@stores/LanguageStore'
import { useStudioTheme, StudioChip } from '../StudioControls'
import { CssPresetChips, CssCategory } from './CssPresetChips'
import { CssEditor } from './CssEditor'
import { CssReference } from './CssReference'
import { CssSnippets } from './CssSnippets'
import { CssVariablesPanel } from './CssVariablesPanel'
import { VisualCssEditor } from './VisualCssEditor'
import { KeyframeEditor } from './KeyframeEditor'
import { sanitizeCss, type CssSanitizationThreat } from '../../utils/cssSanitizer'
import { minifyCss, getCompressionStats } from '../../utils/cssMinifier'
import { applyScope, SCOPE_OPTIONS, type CssScope } from '../../utils/scopeWrapper'
import { useThemeTokens } from './themeTokens'
import type { ThemeStyle } from '../../templates'
import { useDensity, scaleGap } from '@hooks/useDensity'

// History management
interface CssHistory {
  past: string[]
  present: string
  future: string[]
}

type CssMode = 'light' | 'dark'

interface CssPanelProps extends PanelProps {
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
  isDark?: boolean
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
}

export function CssPanel({ designConfig, handleDesignChange, onHoverCss, iframeRef, isDark, previewDevice }: CssPanelProps) {
  const { t } = useLanguage()
  const studioTheme = useStudioTheme()
  const tk = useThemeTokens()
  const effectiveIsDark = isDark ?? studioTheme.isDark
  const density = useDensity()
  const panelGap = scaleGap(12, density)

  // ─── Light / Dark CSS mode switch ───
  const [cssMode, setCssMode] = useState<CssMode>('light')

  // ─── 自定义博客主题模式：启用后使用 custom 主题骨架，CSS 完全接管样式 ───
  const isCustomThemeMode = designConfig.themeStyle === 'custom'
  const prevThemeStyleRef = useRef<ThemeStyle | null>(null)

  const handleToggleCustomTheme = useCallback(() => {
    if (isCustomThemeMode) {
      // 关闭：恢复之前选择的主题
      handleDesignChange('themeStyle', prevThemeStyleRef.current ?? 'magazine')
      prevThemeStyleRef.current = null
    } else {
      // 启用：记录当前主题，切换到 custom
      prevThemeStyleRef.current = designConfig.themeStyle
      handleDesignChange('themeStyle', 'custom')
    }
  }, [isCustomThemeMode, designConfig.themeStyle, handleDesignChange])

  // Minify on export
  const [minifyOnExport, setMinifyOnExport] = useState(false)

  // 当前激活的 CSS 值（根据 cssMode 切换）
  const currentCss = cssMode === 'light' ? designConfig.customCss : designConfig.customCssDark
  const cssField: 'customCss' | 'customCssDark' = cssMode === 'light' ? 'customCss' : 'customCssDark'

  // Category tab state
  const [activeCategory, setActiveCategory] = useState<CssCategory>('typography')

  // Hover preview state — only applies in light mode (hover preview targets the main CSS)
  const [hoverPresetCss, setHoverPresetCss] = useState<string | null>(null)

  // Notify parent of hover CSS changes
  useEffect(() => {
    if (onHoverCss) onHoverCss(cssMode === 'light' ? hoverPresetCss : null)
  }, [hoverPresetCss, onHoverCss, cssMode])

  // Undo/Redo history — separate history per mode
  const [history, setHistory] = useState<CssHistory>({
    past: [], present: currentCss, future: [],
  })
  const isUndoRedoRef = useRef(false)

  // Sync history when external changes happen (e.g., preset click)
  useEffect(() => {
    if (currentCss !== history.present && !isUndoRedoRef.current) {
      setHistory(prev => ({
        past: [...prev.past, prev.present],
        present: currentCss,
        future: [],
      }))
    }
    isUndoRedoRef.current = false
  }, [currentCss, history.present])

  // Reset history when switching mode (each mode has its own history session)
  useEffect(() => {
    setHistory({ past: [], present: currentCss, future: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssMode])

  const pushHistory = useCallback((newValue: string) => {
    handleDesignChange(cssField, newValue)
  }, [handleDesignChange, cssField])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev
      const previous = prev.past[prev.past.length - 1]
      isUndoRedoRef.current = true
      handleDesignChange(cssField, previous)
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      }
    })
  }, [handleDesignChange, cssField])

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev
      const next = prev.future[0]
      isUndoRedoRef.current = true
      handleDesignChange(cssField, next)
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      }
    })
  }, [handleDesignChange, cssField])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Insert text at end of CSS (CodeMirror manages its own cursor)
  const insertAtCursor = useCallback((text: string) => {
    const cur = currentCss.trim()
    pushHistory(cur ? cur + '\n\n' + text : text)
  }, [currentCss, pushHistory])

  // Handle preset apply/remove
  const handleApplyPreset = useCallback((css: string, applied: boolean) => {
    if (applied) {
      pushHistory(currentCss.replace(css, '').replace(/\n{3,}/g, '\n\n').trim() + '\n')
    } else {
      const separator = currentCss.trim() ? '\n' : ''
      pushHistory(currentCss.trimEnd() + separator + css + '\n')
    }
  }, [currentCss, pushHistory])

  // Import/Export handlers
  const handleExport = useCallback(() => {
    const cssToExport = minifyOnExport ? minifyCss(currentCss) : currentCss
    const blob = new Blob([cssToExport], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = cssMode === 'dark' ? '-dark' : ''
    const minSuffix = minifyOnExport ? '.min' : ''
    a.download = `markcraft-custom${suffix}${minSuffix}-${new Date().toISOString().slice(0, 10)}.css`
    a.click()
    URL.revokeObjectURL(url)
  }, [currentCss, cssMode, minifyOnExport])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.css'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const css = reader.result as string
        const cur = currentCss.trim()
        pushHistory(cur ? cur + '\n\n' + css : css)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [currentCss, pushHistory])

  // Insert snippet handler
  const handleInsertSnippet = useCallback((css: string) => {
    const cur = currentCss.trim()
    pushHistory(cur ? cur + '\n\n' + css : css)
  }, [currentCss, pushHistory])

  // 清除所有样式 — 同时重置可视化编辑器修改的 inline style
  const handleClearAll = useCallback(() => {
    pushHistory('')
    // 重置 iframe 中被可视化编辑器修改的 inline style
    if (iframeRef?.current) {
      try {
        const win = iframeRef.current.contentWindow as unknown as Record<string, unknown>
        if (typeof win.__mcResetAllInlineStyles === 'function') {
          (win.__mcResetAllInlineStyles as () => void)()
        }
      } catch {
        // cross-origin
      }
    }
  }, [pushHistory, iframeRef])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      {/* ─── 自定义博客主题模式开关 ─── */}
      <div style={{
        padding: '8px 10px', borderRadius: 10,
        background: isCustomThemeMode ? 'rgba(99,102,241,0.08)' : tk.surface,
        border: `1px solid ${isCustomThemeMode ? 'rgba(99,102,241,0.4)' : tk.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        transition: 'all 0.2s ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isCustomThemeMode ? (effectiveIsDark ? '#a5b4fc' : '#6366f1') : tk.text,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653A2.652 2.652 0 013.551 16.65l5.877-5.877m11.886 0a8.532 8.532 0 01-2.375-.99l-4.5-2.598a8.532 8.532 0 01-2.375-.99m5.25 4.498a8.532 8.532 0 002.375-.99l4.5-2.598a8.532 8.532 0 012.375-.99m-1.125 1.125l-3.375 3.375M6.75 6.75l3.375 3.375" />
            </svg>
            {t.blogCss.customBlogTheme}
          </span>
          <span style={{ fontSize: 9, color: tk.textMuted, lineHeight: 1.4 }}>
            {isCustomThemeMode ? t.blogCss.cssOverrideActive : t.blogCss.cssOverrideIdle}
          </span>
        </div>
        <button
          onClick={handleToggleCustomTheme}
          style={{
            position: 'relative', width: 36, height: 20, borderRadius: 10,
            border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            background: isCustomThemeMode ? '#6366f1' : (effectiveIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
            transition: 'background 0.2s ease',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: isCustomThemeMode ? 18 : 2,
            width: 16, height: 16, borderRadius: 8, background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* ─── Light / Dark CSS Mode Switcher ─── */}
      <div style={{
        display: 'flex', gap: 2, padding: 2,
        background: tk.surface, borderRadius: 8,
        border: `1px solid ${tk.border}`,
      }}>
        <button
          onClick={() => setCssMode('light')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', borderRadius: 6,
            background: cssMode === 'light' ? tk.inputBg : 'transparent',
            color: cssMode === 'light' ? tk.text : tk.textMuted,
            cursor: 'pointer', fontSize: 10, fontWeight: cssMode === 'light' ? 700 : 500,
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {t.blogCss.cssLight}
        </button>
        <button
          onClick={() => setCssMode('dark')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', borderRadius: 6,
            background: cssMode === 'dark' ? tk.inputBg : 'transparent',
            color: cssMode === 'dark' ? tk.text : tk.textMuted,
            cursor: 'pointer', fontSize: 10, fontWeight: cssMode === 'dark' ? 700 : 500,
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {t.blogCss.cssDark}
        </button>
      </div>

      {/* Dark mode info banner — only show in dark mode */}
      {cssMode === 'dark' && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(125,211,252,0.06)',
          border: '1px solid rgba(125,211,252,0.2)',
          fontSize: 9, color: 'rgba(125,211,252,0.85)', lineHeight: 1.5,
        }}>
          ℹ {t.blogCss.cssDarkBannerPre}<code style={{ fontFamily: "'Fira Code', monospace" }}>@media (prefers-color-scheme: dark)</code>{t.blogCss.cssDarkBannerMid}<code style={{ fontFamily: "'Fira Code', monospace" }}>[data-theme="dark"]</code>{t.blogCss.cssDarkBannerPost}
        </div>
      )}

      {/* Preset Chips */}
      <CssPresetChips
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        customCss={currentCss}
        onApplyPreset={handleApplyPreset}
        onHoverPreset={cssMode === 'light' ? setHoverPresetCss : () => {}}
      />

      {/* Editor with undo/redo */}
      <CssEditor
        value={currentCss}
        onChange={pushHistory}
        placeholder={cssMode === 'dark'
          ? t.blogCss.cssDarkPlaceholder
          : t.blogStudio.customCssPlaceholder}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        isDark={effectiveIsDark}
      />

      {/* Security warning — XSS threat detection */}
      {(() => {
        const sanitizationResult = sanitizeCss(currentCss)
        if (!sanitizationResult.hasThreats) return null
        return (
          <div style={{
            padding: '8px 10px', borderRadius: 8,
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.9)',
              marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {t.blogCss.cssSecurityWarnings.replace('{count}', String(sanitizationResult.threats.length))}
              <span style={{ fontWeight: 400, fontSize: 9 }}>
                {t.blogCss.cssSecurityAutoFilter}
              </span>
            </div>
            {sanitizationResult.threats.slice(0, 5).map((threat: CssSanitizationThreat, i: number) => (
              <div key={i} style={{
                fontSize: 9, color: 'rgba(239,68,68,0.75)',
                fontFamily: "'Fira Code', monospace", lineHeight: 1.6,
              }}>
                {t.blogCss.cssSecurityLine.replace('{line}', String(threat.line)).replace('{reason}', threat.reason)}
              </div>
            ))}
            {sanitizationResult.threats.length > 5 && (
              <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.6)', marginTop: 2 }}>
                {t.blogCss.cssSecurityMore.replace('{count}', String(sanitizationResult.threats.length - 5))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Action buttons: Clear + Import + Export + Minify option */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {currentCss.trim() && (
          <StudioChip
            label={t.blogStudio.clearCustomCss}
            onClick={handleClearAll}
            variant="danger"
          />
        )}
        <StudioChip
          label={t.blogCss.cssImport}
          onClick={handleImport}
          variant="default"
        />
        {currentCss.trim() && (
          <StudioChip
            label={t.blogCss.cssExport.replace('{scope}', cssMode === 'dark' ? t.blogCss.cssExportDark : '')}
            onClick={handleExport}
            variant="default"
          />
        )}
      </div>

      {/* Minify on export option */}
      {currentCss.trim() && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: tk.textSub, cursor: 'pointer',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={minifyOnExport}
            onChange={(e) => setMinifyOnExport(e.target.checked)}
            style={{ accentColor: tk.accent, cursor: 'pointer' }}
          />
          <span>{t.blogCss.cssExportMinify}</span>
          {minifyOnExport && (
            <span style={{
              color: '#34d399', fontFamily: "'Fira Code', monospace", fontSize: 9,
            }}>
              ({getCompressionStats(currentCss, minifyCss(currentCss)).ratio}% ↓)
            </span>
          )}
        </label>
      )}

      {/* Visual CSS Editor (click element to edit) — only in light mode for clarity */}
      {iframeRef && isDark !== undefined && cssMode === 'light' && (
        <VisualCssEditor
          iframeRef={iframeRef}
          onGenerateCss={(_selector, css) => {
            const cur = currentCss.trim()
            pushHistory(cur ? cur + '\n\n' + css : css)
          }}
          isDark={effectiveIsDark}
          previewDevice={previewDevice}
        />
      )}

      {/* CSS Variables GUI */}
      <CssVariablesPanel
        customCss={currentCss}
        onApplyVariables={pushHistory}
      />

      {/* CSS Snippets */}
      <CssSnippets
        customCss={currentCss}
        onInsertSnippet={handleInsertSnippet}
      />

      {/* ─── P2-14: 条件生效范围 — 将当前 CSS 包裹到指定页面作用域 ─── */}
      <ScopeSelector
        customCss={currentCss}
        onApplyScoped={pushHistory}
        tk={tk}
      />

      {/* ─── P2-12: 动画时间轴编辑器 — 可视化编辑 @keyframes ─── */}
      <KeyframeEditor
        onInsertCss={(css) => {
          const cur = currentCss.trim()
          pushHistory(cur ? cur + '\n\n' + css : css)
        }}
      />

      {/* CSS Reference */}
      <CssReference onInsertAtCursor={insertAtCursor} />
    </div>
  )
}

// ─── P2-14: 条件生效范围选择器组件 ───────────────────────────
function ScopeSelector({ customCss, onApplyScoped, tk }: {
  customCss: string
  onApplyScoped: (css: string) => void
  tk: ReturnType<typeof useThemeTokens>
}) {
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
  const [expanded, setExpanded] = useState(false)
  const [scope, setScope] = useState<CssScope>('homepage')
  const [customSelector, setCustomSelector] = useState('')

  const handleApply = useCallback(() => {
    if (!customCss.trim()) return
    const scoped = applyScope(customCss, scope, customSelector)
    onApplyScoped(scoped)
    setExpanded(false)
  }, [customCss, scope, customSelector, onApplyScoped])

  if (!customCss.trim()) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '5px 0', border: 'none', background: 'transparent',
          color: tk.textMuted, cursor: 'pointer', fontSize: 10,
          fontWeight: 600, letterSpacing: '0.04em',
        }}
      >
        <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {t.blogCss.scopeConditionLabel}
      </button>

      {expanded && (
        <div style={{
          padding: 10, borderRadius: 8,
          background: tk.inputBg, border: `1px solid ${tk.border}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 9, color: tk.textFaint, lineHeight: 1.4 }}>
            {t.blogCss.scopeConditionDesc}
          </div>

          {/* 作用域选择 */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {SCOPE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setScope(opt.key)}
                title={isZh ? opt.zhDesc : opt.enDesc}
                style={{
                  padding: '4px 8px', borderRadius: 5, border: 'none',
                  background: scope === opt.key ? tk.accentBg : 'transparent',
                  color: scope === opt.key ? tk.accentText : tk.textMuted,
                  cursor: 'pointer', fontSize: 9, fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                {isZh ? opt.zh : opt.en}
              </button>
            ))}
            <button
              onClick={() => setScope('custom')}
              style={{
                padding: '4px 8px', borderRadius: 5, border: 'none',
                background: scope === 'custom' ? tk.accentBg : 'transparent',
                color: scope === 'custom' ? tk.accentText : tk.textMuted,
                cursor: 'pointer', fontSize: 9, fontWeight: 600,
              }}
            >
              {t.blogCss.scopeCustom}
            </button>
          </div>

          {/* 自定义选择器输入 */}
          {scope === 'custom' && (
            <input
              value={customSelector}
              onChange={(e) => setCustomSelector(e.target.value)}
              placeholder={t.blogCss.scopeCustomPlaceholder}
              style={{
                padding: '4px 8px', fontSize: 9,
                border: `1px solid ${tk.inputBorder}`, borderRadius: 5,
                background: tk.surface, color: tk.text,
                outline: 'none', fontFamily: "'Fira Code', monospace",
              }}
            />
          )}

          {/* 当前选择的描述 */}
          <div style={{ fontSize: 8, color: tk.textFaint }}>
            {scope === 'global' ? t.blogCss.scopeGlobalHint :
             scope === 'custom' ? (customSelector ? t.blogCss.scopeWrappedHint.replace('{selector}', customSelector) : t.blogCss.scopeNeedCustom) :
             (() => { const o = SCOPE_OPTIONS.find(o => o.key === scope); return o ? (isZh ? o.zhDesc : o.enDesc) : '' })()}
          </div>

          <StudioChip
            label={t.blogCss.scopeApplyLabel}
            onClick={handleApply}
            variant="accent"
          />
        </div>
      )}
    </div>
  )
}
