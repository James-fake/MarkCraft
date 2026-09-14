import { useState, useCallback, useEffect, useRef } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import { useTheme } from '../../hooks/useTheme'
import { useDensity } from '../../hooks/useDensity'
import { useBlogGenerator, BlogDesignConfig } from './hooks/useBlogGenerator'
import IconSidebar, { PanelKey } from './components/IconSidebar'
import { StylePanel, ColorPanel, ContentPanel, FeaturesPanel, CssPanel } from './components/LeftPanel'
import ExportPanel from './components/RightPanel'
import { StudioThemeProvider } from './components/StudioControls'

interface BlogStudioProps {
  isOpen: boolean
  onClose: () => void
  currentFile: Array<{ name: string; content: string }>
  onLoadSample?: () => void
}

export default function BlogStudio({ isOpen, onClose, currentFile, onLoadSample }: BlogStudioProps) {
  const {
    designConfig, handleDesignChange, result, isGenerating, isDownloading,
    previewHtml, error, previewDevice, setPreviewDevice,
    excludedFiles, setExcludedFiles,
    handleGenerate, handleDownloadFolder, handleDownloadSingleFile,
    mdFiles, selectedMdFiles, totalWordCount, totalSize, previewSize,
  } = useBlogGenerator(isOpen, onClose, currentFile)

  const { t } = useLanguage()
  const { theme } = useTheme()
  // 阶段9：消费全局密度广播，缩放 BlogStudio 外壳内联间距（内联样式无法被 CSS 选择器覆盖，须 JS 读取）
  const density = useDensity()
  const isComfortable = density === 'comfortable'
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null)
  const [hoverCustomCss, setHoverCustomCss] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Inject custom CSS into iframe via DOM manipulation (avoids iframe reload)
  const injectLiveCss = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc || !doc.head) return

      // ─── Light / global custom CSS ───
      let styleEl = doc.getElementById('markcraft-live-css') as HTMLStyleElement | null
      const css = hoverCustomCss || designConfig.customCss
      if (!css) {
        if (styleEl) styleEl.remove()
      } else {
        if (!styleEl) {
          styleEl = doc.createElement('style')
          styleEl.id = 'markcraft-live-css'
          doc.head.appendChild(styleEl)
        }
        styleEl.textContent = css
      }

      // ─── Dark mode custom CSS ───
      let darkStyleEl = doc.getElementById('markcraft-live-css-dark') as HTMLStyleElement | null
      const darkCss = designConfig.customCssDark
      if (!darkCss) {
        if (darkStyleEl) darkStyleEl.remove()
      } else {
        if (!darkStyleEl) {
          darkStyleEl = doc.createElement('style')
          darkStyleEl.id = 'markcraft-live-css-dark'
          doc.head.appendChild(darkStyleEl)
        }
        // 包裹在 @media (prefers-color-scheme: dark) 和 [data-theme="dark"] 中
        darkStyleEl.textContent = `@media (prefers-color-scheme: dark) {\n${darkCss}\n}\n[data-theme="dark"] {\n${darkCss}\n}`
      }
    } catch {
      // cross-origin or not loaded yet
    }
  }, [hoverCustomCss, designConfig.customCss, designConfig.customCssDark])

  useEffect(() => {
    injectLiveCss()
  }, [injectLiveCss, previewHtml])

  // Re-inject CSS after iframe loads (e.g., when previewHtml changes)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => injectLiveCss()
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [injectLiveCss, previewHtml])

  // 注入预览专用样式：
  // 1) body 内部滚动（保持 sticky TOC 工作）
  // 2) 强制双列 grid 布局，覆盖媒体查询的单列塌缩
  // 3) 强制显示 TOC，覆盖媒体查询的 display:none
  // 4) 长内容自动换行，消除水平滚动条：
  //    - pre/code: white-space 换行 + 移除 overflow-x
  //    - table: 表格布局固定 + 单元格换行
  //    - p/li 等: 长单词/URL 强制断行
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return
    const STYLE_ID = 'markcraft-preview-fix'
    const injectScrollStyle = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc || !doc.head) return
        // 移除旧注入，避免幂等检查导致新文档上失效
        const existing = doc.getElementById(STYLE_ID)
        if (existing) existing.remove()
        const style = doc.createElement('style')
        style.id = STYLE_ID
        style.textContent = `
          html, body { height: 100%; margin: 0; }
          body { overflow-y: auto; overflow-x: hidden; }
          /* 锚点跳转偏移：避免 sticky header 遮挡标题，让目标标题对齐到视口顶部下方 */
          html, body { scroll-padding-top: 40px !important; }
          .post-content :is(h1, h2, h3, h4, h5, h6) { scroll-margin-top: 40px !important; }
          /* 强制双列布局，避免媒体查询在窄宽度时塌缩为单列导致 TOC 跑到文章下方 */
          .post-body-layout { grid-template-columns: 1fr 200px !important; gap: 32px !important; min-width: 0 !important; }
          .post-content { min-width: 0 !important; }
          /* 强制显示 TOC，覆盖 @media (max-width: 1024px) { .post-toc { display: none } } */
          .post-toc { display: block !important; }
          /* === 长内容自动换行，消除水平滚动条 === */
          /* 代码块：自动换行，移除水平滚动 */
          .post-content pre {
            overflow-x: hidden !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          .post-content code {
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          /* 表格：固定布局，单元格内容换行 */
          .post-content table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          .post-content th, .post-content td {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          /* 段落、列表：长 URL/英文单词强制断行 */
          .post-content p, .post-content li, .post-content blockquote {
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }
          /* 图片/iframe 等替换元素不超出容器 */
          .post-content img, .post-content video, .post-content iframe {
            max-width: 100% !important;
          }
        `
        doc.head.appendChild(style)
      } catch {
        // iframe 可能未就绪
      }
    }
    const handleLoad = () => {
      // load 后立即注入一次
      injectScrollStyle()
      // 再用 rAF 延迟一帧注入，确保文档完全解析
      requestAnimationFrame(injectScrollStyle)
    }
    iframe.addEventListener('load', handleLoad)
    // 立即尝试注入（srcDoc 可能已加载完成）
    injectScrollStyle()
    requestAnimationFrame(injectScrollStyle)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [previewHtml, previewDevice])

  // Theme tokens for Blog Studio
  const isDark = theme === 'dark'
  const tk = isDark ? {
    bg: '#08080c',
    surface: 'rgba(10, 10, 16, 0.95)',
    border: 'rgba(255,255,255,0.06)',
    borderSub: 'rgba(255,255,255,0.04)',
    borderFaint: 'rgba(255,255,255,0.03)',
    text: '#e4e4e7',
    textSub: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.35)',
    textFaint: 'rgba(255,255,255,0.2)',
    surfaceBg: 'rgba(255,255,255,0.02)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    surfaceActive: 'rgba(255,255,255,0.06)',
    overlay: 'rgba(0,0,0,0.3)',
    glow: 'rgba(167,139,250,0.02)',
  } : {
    bg: '#f5f5f0',
    surface: 'rgba(255, 255, 255, 0.97)',
    border: 'rgba(0,0,0,0.08)',
    borderSub: 'rgba(0,0,0,0.05)',
    borderFaint: 'rgba(0,0,0,0.04)',
    text: '#1a1a1a',
    textSub: 'rgba(0,0,0,0.6)',
    textMuted: 'rgba(0,0,0,0.5)',
    textFaint: 'rgba(0,0,0,0.35)',
    surfaceBg: 'rgba(0,0,0,0.02)',
    surfaceHover: 'rgba(0,0,0,0.04)',
    surfaceActive: 'rgba(0,0,0,0.06)',
    overlay: 'rgba(0,0,0,0.05)',
    glow: 'rgba(167,139,250,0.03)',
  }

  const handlePanelChange = useCallback((panel: PanelKey | null) => {
    setActivePanel(prev => prev === panel ? null : panel)
  }, [])

  // Panel stays open until user explicitly closes it (via icon or overlay click)
  // Previously auto-closed on window blur, but that breaks visual inspect mode
  // where clicking iframe elements is expected behavior


  if (!isOpen) return null

  const DEVICE_CONFIG: Array<{ key: 'desktop' | 'tablet' | 'mobile'; label: string; width: string; icon: string }> = [
    { key: 'desktop', label: t.blogStudio.desktop, width: '100%', icon: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z' },
    { key: 'tablet', label: t.blogStudio.tablet, width: '768px', icon: 'M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z' },
    { key: 'mobile', label: t.blogStudio.mobile, width: '375px', icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
  ]

  const panelTitles: Record<PanelKey, string> = {
    style: t.blogStudio.styleTab,
    color: t.blogStudio.colorTab,
    content: t.blogStudio.contentTab,
    features: t.blogStudio.featuresTab,
    css: t.blogStudio.customCss,
    export: t.blogStudio.generateBlog,
  }

  const panelAccents: Record<PanelKey, string> = {
    style: '#a78bfa',
    color: '#f472b6',
    content: '#38bdf8',
    features: '#fb923c',
    css: '#34d399',
    export: '#fbbf24',
  }

  const SIDEBAR_WIDTH = 300

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column',
      backgroundColor: tk.bg, color: tk.text,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ─── Minimal Top Bar (44px) ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${isComfortable ? 26 : 20}px`, height: 44, flexShrink: 0,
        borderBottom: `1px solid ${tk.borderSub}`,
        background: tk.overlay,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isComfortable ? 14 : 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 300, letterSpacing: '0.08em',
            color: tk.textSub,
          }}>
            MarkCraft Studio
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isComfortable ? 14 : 12 }}>
          {mdFiles.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: isComfortable ? 8 : 6,
              padding: '3px 10px', borderRadius: 20,
              background: tk.surfaceBg,
              border: `1px solid ${tk.borderSub}`,
              fontSize: 10, color: tk.textMuted,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: previewHtml ? '#34d399' : tk.textFaint, transition: 'background 0.3s ease' }} />
              {selectedMdFiles.length} {t.blogStudio.docsCount} · {totalWordCount.toLocaleString()} {t.blogStudio.words}
            </div>
          )}
          <button onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, border: `1px solid ${tk.border}`,
              borderRadius: 8, background: tk.surfaceBg,
              color: tk.textMuted, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = tk.surfaceHover; e.currentTarget.style.color = tk.textSub }}
            onMouseLeave={(e) => { e.currentTarget.style.background = tk.surfaceBg; e.currentTarget.style.color = tk.textMuted }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Main Area: IconSidebar + Sidebar + Preview ────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Icon Sidebar (always visible, 48px) */}
        <IconSidebar activePanel={activePanel} onPanelChange={handlePanelChange} isDark={isDark} />

        {/* Sidebar Panel (slides in, pushes preview) */}
        <div style={{
          width: activePanel ? SIDEBAR_WIDTH : 0,
          minWidth: activePanel ? SIDEBAR_WIDTH : 0,
          maxWidth: activePanel ? SIDEBAR_WIDTH : 0,
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), min-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), max-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          borderRight: activePanel ? `1px solid ${tk.border}` : '1px solid transparent',
          display: 'flex',
          flexDirection: 'column',
          background: tk.surface,
          flexShrink: 0,
        }}>
          {activePanel && (
            <>
              {/* Sidebar Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: `${isComfortable ? 12 : 10}px ${isComfortable ? 16 : 14}px ${isComfortable ? 8 : 6}px`, flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: panelAccents[activePanel],
                    boxShadow: `0 0 8px ${panelAccents[activePanel]}60`,
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    color: tk.textSub, textTransform: 'uppercase',
                  }}>
                    {panelTitles[activePanel]}
                  </span>
                </div>
                <button
                  onClick={() => setActivePanel(null)}
                  style={{
                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: 6, background: tk.surfaceBg,
                    color: tk.textFaint, cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = tk.surfaceHover; e.currentTarget.style.color = tk.textSub }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = tk.surfaceBg; e.currentTarget.style.color = tk.textFaint }}
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Accent line */}
              <div style={{
                height: 2, margin: `0 ${isComfortable ? 16 : 14}px ${isComfortable ? 10 : 8}px`,
                background: `linear-gradient(90deg, ${panelAccents[activePanel]}, ${panelAccents[activePanel]}40, transparent)`,
                borderRadius: 1,
              }} />

              {/* Sidebar Content (scrollable) */}
              {/* 关键修复：flex 列项必须 minHeight: 0 才能成为受限滚动视口；
                  否则会因 min-height:auto 撑开到内容高度，导致底部面板（动画时间轴编辑器等）
                  溢出被 overflow:hidden 裁剪、无法滚动到达、点击无响应。 */}
              <div style={{
                flex: 1, minHeight: 0, overflowY: 'auto', padding: `${isComfortable ? 6 : 4}px ${isComfortable ? 16 : 14}px ${isComfortable ? 18 : 14}px`,
              }}>
                <style>{`
                  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
                  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                  .sidebar-scroll::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}; border-radius: 2px; }
                  .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}; }
                `}</style>
                <div className="sidebar-scroll" style={{ overflowY: 'auto', maxHeight: '100%' }}>
                  <StudioThemeProvider value={{ isDark }}>
                    {activePanel === 'style' && <StylePanel designConfig={designConfig} handleDesignChange={handleDesignChange} />}
                    {activePanel === 'color' && <ColorPanel designConfig={designConfig} handleDesignChange={handleDesignChange} />}
                    {activePanel === 'content' && <ContentPanel designConfig={designConfig} handleDesignChange={handleDesignChange} mdFiles={mdFiles} selectedMdFiles={selectedMdFiles} excludedFiles={excludedFiles} setExcludedFiles={setExcludedFiles} />}
                    {activePanel === 'features' && <FeaturesPanel designConfig={designConfig} handleDesignChange={handleDesignChange} />}
                    {activePanel === 'css' && <CssPanel designConfig={designConfig} handleDesignChange={handleDesignChange} onHoverCss={setHoverCustomCss} iframeRef={iframeRef} isDark={isDark} previewDevice={previewDevice} />}
                    {activePanel === 'export' && <ExportPanel designConfig={designConfig} result={result} isGenerating={isGenerating} isDownloading={isDownloading} error={error} handleGenerate={handleGenerate} handleDownloadFolder={handleDownloadFolder} handleDownloadSingleFile={handleDownloadSingleFile} selectedMdFiles={selectedMdFiles} mdFiles={mdFiles} totalWordCount={totalWordCount} totalSize={totalSize} />}
                  </StudioThemeProvider>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Preview Canvas */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: `radial-gradient(ellipse at 50% 30%, ${tk.glow} 0%, transparent 60%)`,
        }}>
          {/* Device toolbar */}
          <div style={{
            padding: `${isComfortable ? 6 : 4}px ${isComfortable ? 20 : 16}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${tk.borderFaint}`, flexShrink: 0,
            background: tk.surfaceBg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isComfortable ? 6 : 4 }}>
              {DEVICE_CONFIG.map(device => {
                const isActive = previewDevice === device.key
                return (
                  <button key={device.key} onClick={() => setPreviewDevice(device.key)} title={device.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, border: 'none', borderRadius: 6,
                      background: isActive ? tk.surfaceActive : 'transparent',
                      color: isActive ? tk.textSub : tk.textFaint,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = tk.surfaceBg }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={device.icon} />
                    </svg>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {previewSize && (
                <span style={{ fontSize: 10, color: tk.textFaint, fontFamily: "'Fira Code', monospace" }}>
                  {previewSize} KB
                </span>
              )}
            </div>
          </div>

          {/* Preview content */}
          <div
            onClick={() => { if (activePanel) setActivePanel(null) }}
            style={{
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              overflow: 'auto', padding: isComfortable ? 28 : 20, position: 'relative',
            }}
          >
            {/* Preview iframe */}
            {previewHtml ? (
              <div style={{
                width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                maxWidth: '100%',
                height: previewDevice === 'desktop' ? '100%' : 'auto',
                minHeight: previewDevice !== 'desktop' ? 600 : undefined,
                display: 'flex', flexDirection: 'column',
                borderRadius: previewDevice === 'desktop' ? 0 : 12,
                overflow: 'hidden',
                border: previewDevice === 'desktop' ? 'none' : `1px solid ${tk.border}`,
                boxShadow: previewDevice === 'desktop' ? 'none' : `0 8px 40px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
                transition: 'width 0.3s ease, border-radius 0.3s ease',
              }}>
                {previewDevice !== 'desktop' && (
                  <div style={{
                    height: 28, background: tk.surfaceBg,
                    borderBottom: `1px solid ${tk.borderSub}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: tk.textFaint }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: tk.textFaint }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: tk.textFaint }} />
                  </div>
                )}
                <iframe ref={iframeRef} srcDoc={previewHtml}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: previewDevice === 'desktop' ? '100%' : '600px',
                    flex: 1,
                    border: 'none', backgroundColor: '#fff', display: 'block',
                  }}
                  sandbox="allow-scripts allow-same-origin" title={t.blogStudio.blogPreview}
                />
              </div>
            ) : (
              selectedMdFiles.length === 0 ? (
                /* ─── 发布即作品 · 首因引导 ───────────────────── */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', gap: 18, padding: '24px', textAlign: 'center',
                }}>
                  {/* Badge */}
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: tk.textSub, padding: '4px 12px', borderRadius: 20,
                    border: `1px solid ${tk.borderSub}`, background: tk.surfaceBg,
                  }}>
                    {t.blogStudio.publishAsWork}
                  </div>
                  <div style={{ maxWidth: 360 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: tk.text, lineHeight: 1.4 }}>
                      {t.blogStudio.publishAsWorkTitle}
                    </div>
                    <div style={{ fontSize: 12, color: tk.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                      {t.blogStudio.publishAsWorkSub}
                    </div>
                  </div>

                  {/* 载入示例文章 CTA */}
                  {onLoadSample && (
                    <button onClick={onLoadSample}
                      style={{
                        padding: '10px 18px', border: 'none', borderRadius: 12,
                        background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 40%, #f472b6 100%)',
                        color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 4px 18px rgba(167,139,250,0.3)',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(167,139,250,0.42)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(167,139,250,0.3)' }}
                    >
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t.blogStudio.loadSamplePost}
                    </button>
                  )}

                  {/* 模板快速开始 */}
                  <div style={{ width: '100%', maxWidth: 420 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tk.textFaint, marginBottom: 8 }}>
                      {t.blogStudio.templateQuickStart}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {(
                        [
                          { key: 'personal', style: 'magazine', name: t.blogStudio.templatePersonal, accent: '#a78bfa' },
                          { key: 'portfolio', style: 'bento', name: t.blogStudio.templatePortfolio, accent: '#f472b6' },
                          { key: 'tech', style: 'terminal', name: t.blogStudio.templateTech, accent: '#38bdf8' },
                        ] as const
                      ).map((card) => (
                        <button key={card.key}
                          onClick={() => { handleDesignChange('themeStyle', card.style as BlogDesignConfig['themeStyle']); setActivePanel(null) }}
                          style={{
                            padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                            background: tk.surfaceBg, border: `1px solid ${tk.borderSub}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = card.accent; e.currentTarget.style.transform = 'translateY(-2px)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = tk.borderSub; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${card.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: card.accent }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: tk.textSub }}>{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 流程提示 */}
                  <div style={{ fontSize: 11, color: tk.textFaint, letterSpacing: '0.04em' }}>
                    {t.blogStudio.publishFlowHint}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', gap: 16, color: tk.textFaint,
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: tk.surfaceBg, border: `1px solid ${tk.borderSub}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13 }}>
                    {t.blogStudio.generatingPreview}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
