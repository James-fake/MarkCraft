/**
 * 博客工作室 · CSS 面板 / 导出面板（P2-3 从 BlogPanel.tsx 拆出，2026-09-28）
 */

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import { Icon } from '../../icons'
import { CssEditor } from '@features/blog/components/panels/CssEditor'
import { CssSnippets } from '@features/blog/components/panels/CssSnippets'
import { VisualCssEditor } from '@features/blog/components/panels/VisualCssEditor'
import DeployPanel from '@features/blog/components/DeployPanel'
import type { BlogGenerationResult } from '@features/blog/utils/blogMultiFileGenerator'
import { THEME_MARKET, type BlogConfig, type BlogDoc } from './blogStudioModel'
import { useSettings } from '@stores/SettingsStore'
import { SectionLabel, StudioToggle, StudioButton } from './studioAtoms'
// 真实 DeployPanel 声明了 t prop 但实现中不使用（仅解构 result）；此处窄化 props 类型，避免调用处传翻译对象
const RealDeployPanel = DeployPanel as unknown as React.ComponentType<{ result: BlogGenerationResult }>


/* ============================================================
 * 面板：CSS（P0 · 1.2：组合真实 VisualCssEditor / CssEditor / CssSnippets）
 * 历史栈镜像真实 CssPanel（按 亮色/暗色 各自维护 past/present/future）
 * ========================================================== */
interface CssPanelProps {
  cfg: BlogConfig
  setCfg: (p: Partial<BlogConfig>) => void
  toast: (m: string) => void
  /** 博客预览 iframe（VisualCssEditor 选区注入用） */
  iframeRef?: RefObject<HTMLIFrameElement | null>
  /** 预览设备（VisualCssEditor 自动包裹 @media 断点） */
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
}

function CssPanel({ cfg, setCfg, toast, iframeRef, previewDevice }: CssPanelProps) {
  // useCallback 稳定化：否则 pushHistory/undo/redo（deps 含 setF）每渲染失效
  const setF = useCallback((p: Partial<BlogConfig>) => setCfg(p), [setCfg])
  // 使用优化③：亮/暗 CSS 模式跟随预览主题模式（预览暗色时默认展示"暗色 CSS"，不再固定亮色）；
  // 用户仍可手动切换 Segment 查看/编辑另一份 CSS。
  const [cssMode, setCssMode] = useState<'light' | 'dark'>(cfg.theme === 'dark' ? 'dark' : 'light')
  useEffect(() => { setCssMode(cfg.theme === 'dark' ? 'dark' : 'light') }, [cfg.theme])
  // 编辑器外壳跟随 Aurora 宿主主题（而非博客预览主题）——编辑器是面板的一部分，
  // 对齐真实层语义（effectiveIsDark = isDark ?? studioTheme.isDark）；否则亮色外壳嵌深色面板、暗色外壳嵌浅色面板均割裂。
  const { settings } = useSettings()
  const shellIsDark = settings.theme === 'dark'
  // 系统深色（prefers-color-scheme）：让暗色 CSS 在预览中生效的另一条路径，需监听变化驱动重渲染
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const currentCss = cssMode === 'light' ? cfg.customCssLight : cfg.customCssDark
  const cssField: 'customCssLight' | 'customCssDark' = cssMode === 'light' ? 'customCssLight' : 'customCssDark'

  // Undo/Redo 历史（镜像真实 CssPanel：外部变化同步入栈、切模式重置、Ctrl+Z/Y）
  const [history, setHistory] = useState<{ past: string[]; present: string; future: string[] }>({
    past: [], present: currentCss, future: [],
  })
  const isUndoRedoRef = useRef(false)

  useEffect(() => {
    if (currentCss !== history.present && !isUndoRedoRef.current) {
      setHistory((prev) => ({ past: [...prev.past, prev.present], present: currentCss, future: [] }))
    }
    isUndoRedoRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCss])

  useEffect(() => {
    setHistory({ past: [], present: currentCss, future: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssMode])

  const pushHistory = useCallback((newValue: string) => {
    setF({ [cssField]: newValue } as Partial<BlogConfig>)
  }, [cssField, setF])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const previous = prev.past[prev.past.length - 1]
      isUndoRedoRef.current = true
      setF({ [cssField]: previous } as Partial<BlogConfig>)
      return { past: prev.past.slice(0, -1), present: previous, future: [prev.present, ...prev.future] }
    })
  }, [cssField, setF])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const next = prev.future[0]
      isUndoRedoRef.current = true
      setF({ [cssField]: next } as Partial<BlogConfig>)
      return { past: [...prev.past, prev.present], present: next, future: prev.future.slice(1) }
    })
  }, [cssField, setF])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="aurora-blog-panel__scroll">
      <label className="aurora-blog-field aurora-blog-field--row">
        <span>启用自定义主题</span><StudioToggle checked={cfg.enableCustomCss} onChange={(v) => setF({ enableCustomCss: v })} />
      </label>
      {cfg.enableCustomCss && (
        <>
          <div className="aurora-blog-seg">
            <button
              className={`aurora-blog-seg__btn ${cssMode === 'light' ? 'is-active' : ''}`}
              onClick={() => setCssMode('light')}
            >亮色</button>
            <button
              className={`aurora-blog-seg__btn ${cssMode === 'dark' ? 'is-active' : ''}`}
              onClick={() => setCssMode('dark')}
            >暗色</button>
          </div>
          {/* 使用优化③b：系统深色（prefers-color-scheme）也会让暗色 CSS 在预览生效，一并提示，解释"亮色 Segment 但预览有暗色规则"的困惑 */}
          {(cfg.theme === 'dark' || sysDark) && (
            <div className="aurora-blog-banner">
              {cfg.theme === 'dark'
                ? '当前为深色模式，暗色 CSS 将优先生效。'
                : '系统为深色模式，暗色 CSS 中的颜色规则会在预览中生效。'}
            </div>
          )}

          <SectionLabel>编辑器</SectionLabel>
          <CssEditor
            value={currentCss}
            onChange={pushHistory}
            placeholder={cssMode === 'dark'
              ? '在此输入暗色模式专用 CSS...\n例如: body { background: #1a1a2e; color: #e0e0e0; }'
              : '在此输入自定义 CSS...'}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={undo}
            onRedo={redo}
            isDark={shellIsDark}
          />

          <div className="aurora-blog-row2">
            <StudioButton variant="ghost" onClick={() => toast?.('已导入 CSS')}><Icon.upload size={14} /> 导入</StudioButton>
            <StudioButton variant="ghost" onClick={() => toast?.('已导出 CSS')}><Icon.download size={14} /> 导出</StudioButton>
            <StudioButton variant="secondary" onClick={() => toast?.('已压缩 CSS')}><Icon.wand size={14} /> 压缩</StudioButton>
          </div>

          {/* 可视化 CSS 编辑器（点击预览元素取样式，仅亮色模式，与真实 CssPanel 一致） */}
          {iframeRef && cssMode === 'light' && (
            <VisualCssEditor
              iframeRef={iframeRef}
              onGenerateCss={(_selector, css) => {
                const cur = currentCss.trim()
                pushHistory(cur ? cur + '\n\n' + css : css)
              }}
              isDark={shellIsDark}
              previewDevice={previewDevice}
            />
          )}

          {/* 代码片段库（localStorage 持久化） */}
          <CssSnippets
            customCss={currentCss}
            onInsertSnippet={(css) => {
              const cur = currentCss.trim()
              pushHistory(cur ? cur + '\n\n' + css : css)
            }}
          />
        </>
      )}
      {!cfg.enableCustomCss && <div className="aurora-blog-empty">未启用自定义 CSS，博客将使用主题内置样式。</div>}
    </div>
  )
}

/* ============================================================
 * 面板：导出（对齐 RightPanel/ExportPanel）
 * 生成/下载/单文件全部接真实 useBlogGenerator（P0 · 1.2，替换 setTimeout 桩）
 * ========================================================== */
interface ExportPanelProps {
  cfg: BlogConfig
  toast: (m: string) => void
  docs: BlogDoc[]
  /** 真实生成（handleGenerate：generateBlog + 发布留痕） */
  onGenerate: () => void
  isGenerating: boolean
  /** 真实生成结果（供 DeployPanel 部署） */
  result: BlogGenerationResult | null
  /** 在浏览器新标签打开当前站点（使用优化②：原顶栏「打开」按钮迁入） */
  onOpenPreview: () => void
  /** 真实文件夹版下载（downloadBlogAsZip） */
  onDownloadFolder: () => void
  /** 真实单文件版下载（generateSingleFileBlog） */
  onDownloadSingleFile: () => void
  isDownloading: boolean
  genError: string | null
}

function ExportPanel({ cfg, docs, onGenerate, isGenerating, result, onOpenPreview, onDownloadFolder, onDownloadSingleFile, isDownloading, genError }: ExportPanelProps) {
  const docCount = docs.filter((d) => d.included).length
  const totalWords = docs.filter((d) => d.included).reduce((s, d) => s + d.words, 0)
  const themeName = THEME_MARKET.find((t) => t.key === cfg.themeKey)?.nameZh ?? cfg.themeKey

  return (
    <div className="aurora-blog-panel__scroll">
      <div className="aurora-blog-stats">
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot" /><b>{docCount}</b><span>文档</span></div>
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot aurora-blog-stat__dot--2" /><b>{totalWords.toLocaleString()}</b><span>字数</span></div>
        <div className="aurora-blog-stat"><span className="aurora-blog-stat__dot aurora-blog-stat__dot--3" /><b>{themeName}</b><span>主题</span></div>
      </div>

      {genError && <div className="aurora-blog-banner aurora-blog-banner--error">{genError}</div>}

      <SectionLabel>步骤 1 · 生成</SectionLabel>
      <button className={`aurora-blog-generate ${isGenerating ? 'is-loading' : ''}`} onClick={onGenerate} disabled={isGenerating || docCount === 0}>
        {isGenerating ? <><Icon.refresh size={15} className="spin" /> 生成中…</> : <><Icon.sparkle size={15} /> 生成博客站点</>}
      </button>

      {result && (
        <>
          <SectionLabel>步骤 2 · 查看 / 下载</SectionLabel>
          <div className="aurora-blog-download">
            <button className="aurora-blog-dl" onClick={onOpenPreview}><Icon.externalLink size={18} /><span>打开</span><em>新标签页</em></button>
            <button className="aurora-blog-dl" onClick={onDownloadFolder} disabled={isDownloading}><Icon.folder size={18} /><span>文件夹</span><em>多文件</em></button>
            <button className="aurora-blog-dl" onClick={onDownloadSingleFile} disabled={isDownloading}><Icon.file size={18} /><span>单文件</span><em>自包含</em></button>
          </div>

          {/* P0 · 1.2：真实部署面板（平台选择/Token 验证/仓库/进度/成功 URL，deployToPages） */}
          <RealDeployPanel result={result} />
        </>
      )}
    </div>
  )
}


// —— P2-3 拆分导出（消费方：主面板/兄弟模块）——
export {
  CssPanel,
  ExportPanel,
}
