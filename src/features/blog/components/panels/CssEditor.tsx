import { useRef, useEffect, useState } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { css } from '@codemirror/lang-css'
import { syntaxHighlighting, HighlightStyle, foldGutter, indentOnInput, bracketMatching } from '@codemirror/language'
import { closeBrackets, autocompletion } from '@codemirror/autocomplete'
import { highlightSelectionMatches } from '@codemirror/search'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { tags } from '@lezer/highlight'
import { getTokensForMode } from './themeTokens'
import { checkCssCompat } from '../../utils/cssCompatChecker'
import { useLanguage } from '@stores/LanguageStore'
import type { Translations } from '@locales/zh'

// CSS Syntax validation with severity levels
type Severity = 'error' | 'warning' | 'info'

interface CssIssue {
  line: number
  message: string
  severity: Severity
}

// Common CSS property names for spell-check
const KNOWN_PROPERTIES = new Set([
  'align-content', 'align-items', 'align-self', 'animation', 'animation-delay', 'animation-direction',
  'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state',
  'animation-timing-function', 'appearance', 'aspect-ratio', 'backdrop-filter', 'backface-visibility',
  'background', 'background-attachment', 'background-blend-mode', 'background-clip', 'background-color',
  'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size',
  'border', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image',
  'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius',
  'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing',
  'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius',
  'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-decoration-break', 'box-shadow',
  'box-sizing', 'caption-side', 'caret-color', 'clear', 'clip-path', 'color', 'column-count', 'column-fill',
  'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span',
  'column-width', 'columns', 'content', 'counter-increment', 'counter-reset', 'cursor', 'direction',
  'display', 'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow',
  'flex-shrink', 'flex-wrap', 'float', 'font', 'font-family', 'font-feature-settings', 'font-kerning',
  'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight',
  'gap', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column',
  'grid-column-end', 'grid-column-gap', 'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end',
  'grid-row-gap', 'grid-row-start', 'grid-template', 'grid-template-areas', 'grid-template-columns',
  'grid-template-rows', 'height', 'justify-content', 'justify-items', 'justify-self', 'left',
  'letter-spacing', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type',
  'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width',
  'min-height', 'min-width', 'mix-blend-mode', 'object-fit', 'object-position', 'opacity', 'order',
  'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-wrap',
  'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'perspective', 'place-content', 'place-items', 'place-self', 'pointer-events', 'position',
  'resize', 'right', 'row-gap', 'scroll-behavior', 'text-align', 'text-align-last', 'text-decoration',
  'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-fill-color',
  'text-indent', 'text-justify', 'text-overflow', 'text-shadow', 'text-transform', 'top',
  'transform', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration',
  'transition-property', 'transition-timing-function', 'user-select', 'vertical-align', 'visibility',
  'white-space', 'width', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index',
  '-webkit-background-clip', '-webkit-text-fill-color', '-webkit-text-stroke', '-webkit-box-shadow',
  '-webkit-appearance', '-webkit-backdrop-filter', '-webkit-font-smoothing', '-moz-osx-font-smoothing',
  '-webkit-transform', '-webkit-transition', '-webkit-animation', '-webkit-line-clamp',
  '-webkit-background-clip', '-moz-background-clip',
])

function validateCss(css: string, t: Translations): CssIssue[] {
  const issues: CssIssue[] = []
  if (!css.trim()) return issues
  const lines = css.split('\n')

  // 1. Brace matching
  let braceCount = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    for (const ch of line) {
      if (ch === '{') braceCount++
      if (ch === '}') braceCount--
      if (braceCount < 0) {
        issues.push({ line: i + 1, message: t.blogCss.cssExtraCloseBrace, severity: 'error' })
        braceCount = 0
      }
    }
  }
  if (braceCount > 0) {
    issues.push({ line: lines.length, message: t.blogCss.cssUnclosedBraces.replace('{count}', String(braceCount)), severity: 'error' })
  }

  // 2. Unclosed comments
  let inComment = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let pos = 0
    while (pos < line.length) {
      if (!inComment && line.substring(pos, pos + 2) === '/*') {
        inComment = true
        pos += 2
      } else if (inComment && line.substring(pos, pos + 2) === '*/') {
        inComment = false
        pos += 2
      } else {
        pos++
      }
    }
  }
  if (inComment) {
    issues.push({ line: lines.length, message: t.blogCss.cssUnclosedComment, severity: 'error' })
  }

  // 3. Per-line checks (skip comment-only lines)
  let inBlockComment = false
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (inBlockComment) {
      const endIdx = line.indexOf('*/')
      if (endIdx !== -1) {
        line = line.substring(endIdx + 2)
        inBlockComment = false
      } else {
        continue
      }
    }
    let cleanLine = ''
    let j = 0
    while (j < line.length) {
      if (line.substring(j, j + 2) === '/*') {
        const endIdx = line.indexOf('*/', j + 2)
        if (endIdx !== -1) {
          j = endIdx + 2
        } else {
          inBlockComment = true
          break
        }
      } else {
        cleanLine += line[j]
        j++
      }
    }
    const trimmed = cleanLine.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    // 4. Empty rule block
    if (/^[.#[\w:*][^{]*\{\s*\}$/.test(trimmed)) {
      issues.push({ line: i + 1, message: t.blogCss.cssEmptyRule, severity: 'warning' })
    }

    // 5. Missing semicolon
    if (trimmed.includes(':') && !trimmed.includes('{') && !trimmed.includes('}') && !trimmed.startsWith('@')) {
      if (!trimmed.endsWith(';') && !trimmed.endsWith(',')) {
        issues.push({ line: i + 1, message: t.blogCss.cssMissingSemicolon, severity: 'warning' })
      }

      // 6. Unknown property name check
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx > 0) {
        const propName = trimmed.substring(0, colonIdx).trim().toLowerCase()
        if (!propName.startsWith('--') && !propName.startsWith('-')) {
          if (!KNOWN_PROPERTIES.has(propName)) {
            const similar = [...KNOWN_PROPERTIES].find(p => {
              if (Math.abs(p.length - propName.length) > 1) return false
              let diff = 0
              const maxLen = Math.max(p.length, propName.length)
              for (let k = 0; k < maxLen; k++) {
                if (p[k] !== propName[k]) diff++
                if (diff > 1) return false
              }
              return diff === 1
            })
            if (similar) {
              issues.push({ line: i + 1, message: t.blogCss.cssTypoProperty.replace('{name}', propName).replace('{similar}', similar), severity: 'warning' })
            } else {
              issues.push({ line: i + 1, message: t.blogCss.cssUnknownProperty.replace('{name}', propName), severity: 'info' })
            }
          }
        }
      }
    }
  }

  return issues
}

// CodeMirror 语法高亮（明暗两套，按主题 token 生成真正的 HighlightStyle）。
// 此前用 defaultHighlightStyle（亮色深字）：暗色编辑器底上 token 近乎不可读（"内容显示不清楚"根因）；
// theme 内的 .cm-propertyName 等自定义类 CM6 不会产出，纯死样式，已删除——高亮唯一入口就是这里。
function createCssHighlightStyle(isDark: boolean) {
  const tk = getTokensForMode(isDark)
  return HighlightStyle.define([
    { tag: tags.propertyName, color: tk.propertyColor },
    { tag: tags.attributeName, color: tk.propertyColor },
    { tag: tags.tagName, color: isDark ? '#f472b6' : '#be185d' },
    { tag: tags.className, color: isDark ? '#fbbf24' : '#b45309' },
    { tag: tags.string, color: tk.codeColor },
    { tag: tags.comment, color: tk.commentColor, fontStyle: 'italic' },
    { tag: tags.number, color: isDark ? '#a78bfa' : '#6d28d9' },
    { tag: tags.bool, color: isDark ? '#a78bfa' : '#6d28d9' },
    { tag: tags.unit, color: isDark ? '#a78bfa' : '#6d28d9' },
    { tag: tags.color, color: tk.valueColor },
    { tag: tags.keyword, color: isDark ? '#f472b6' : '#be185d' },
    { tag: tags.operator, color: isDark ? '#94a3b8' : '#475569' },
    { tag: tags.punctuation, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
    { tag: tags.variableName, color: tk.valueColor },
  ])
}

// CodeMirror 6 theme for CSS editor
function createCssEditorTheme(isDark: boolean) {
  const tk = getTokensForMode(isDark)
  return EditorView.theme({
    '&': {
      fontSize: '11px',
      fontFamily: "'Fira Code', 'Consolas', monospace",
      lineHeight: '1.6',
      background: 'transparent',
      color: tk.text,
    },
    '.cm-content': {
      padding: '10px 12px',
      caretColor: tk.accent,
    },
    '.cm-cursor': {
      borderLeftColor: tk.accent,
      borderLeftWidth: '2px',
    },
    '.cm-activeLine': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    '.cm-gutters': {
      background: 'transparent',
      color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
      border: 'none',
      borderRight: `1px solid ${tk.border}`,
      minWidth: '32px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 6px 0 0',
      textAlign: 'right',
      fontSize: '10px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      cursor: 'pointer',
    },
    '.cm-selectionBackground': {
      backgroundColor: isDark ? 'rgba(52,211,153,0.15) !important' : 'rgba(5,150,105,0.15) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: isDark ? 'rgba(52,211,153,0.2) !important' : 'rgba(5,150,105,0.2) !important',
    },
    '.cm-matchingBracket': {
      backgroundColor: isDark ? 'rgba(52,211,153,0.25)' : 'rgba(5,150,105,0.25)',
      color: `${tk.text} !important`,
      outline: `1px solid ${isDark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.4)'}`,
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(250,204,21,0.15)',
      outline: '1px solid rgba(250,204,21,0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(250,204,21,0.25)',
    },
    '.cm-tooltip': {
      background: isDark ? '#1e1e2e' : '#f8f8fc',
      border: `1px solid ${tk.border}`,
      borderRadius: '6px',
      color: tk.text,
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li': {
        padding: '2px 8px',
      },
      '& > ul > li[aria-selected]': {
        background: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)',
        color: tk.text,
      },
    },
    '.cm-panels': {
      background: isDark ? '#1a1a2e' : '#f0f0f5',
      color: tk.text,
    },
    '.cm-search': {
      padding: '4px 8px',
      '& input': {
        background: tk.inputBg,
        border: `1px solid ${tk.inputBorder}`,
        borderRadius: '4px',
        color: tk.text,
        padding: '2px 6px',
      },
      '& button': {
        background: tk.inputBg,
        border: `1px solid ${tk.inputBorder}`,
        borderRadius: '4px',
        color: tk.text,
        cursor: 'pointer',
      },
    },
    '.cm-placeholder': { color: tk.textFaint },
    // 语法高亮唯一入口 = createCssHighlightStyle（HighlightStyle，按明暗 token 生成）；
    // 下方 .cm-propertyName 等自定义类 CM6 不产出（历史死样式），高亮规则勿写在这里。
  })
}

interface CssEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  isDark?: boolean
}

export function CssEditor({ value, onChange, placeholder, canUndo, canRedo, onUndo, onRedo, isDark = true }: CssEditorProps) {
  const { t } = useLanguage()
  const tk = getTokensForMode(isDark)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // 主题 Compartment（模块级复用安全：同一编辑器实例只有一份 extensions）
  const themeCompartment = useRef(new Compartment()).current

  // isDark 热切换：宿主/博客主题变化时重建主题+高亮配置（编辑器状态不丢）
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure([
        createCssEditorTheme(isDark),
        syntaxHighlighting(createCssHighlightStyle(isDark), { fallback: true }),
      ]),
    })
  }, [isDark, themeCompartment])

  // ─── 折叠状态：默认展开，确保 CodeMirror 能正确初始化并显示 CSS 内容 ───
  // 折叠后编辑器隐藏但 DOM 保留，再次展开时 CSS 内容仍在
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 展开编辑器时，确保 CodeMirror 刷新（尺寸正确）
  useEffect(() => {
    if (!isCollapsed && viewRef.current) {
      // 延迟一帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        viewRef.current?.focus()
        viewRef.current?.dispatch({
          effects: EditorView.scrollIntoView(0),
        })
      })
    }
  }, [isCollapsed])

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        css(),
        // 主题+高亮走 Compartment：isDark 变化时 reconfigure 热切换（不销毁编辑器、不丢历史/焦点）
        themeCompartment.of([
          createCssEditorTheme(isDark),
          syntaxHighlighting(createCssHighlightStyle(isDark), { fallback: true }),
        ]),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        cmPlaceholder(placeholder),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only create once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g., preset apply, undo/redo from parent)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      })
    }
  }, [value])

  const syntaxIssues = validateCss(value, t)
  const hasErrors = syntaxIssues.some(i => i.severity === 'error')
  const hasWarnings = syntaxIssues.some(i => i.severity === 'warning')

  // CSS 摘要信息
  const lineCount = value ? value.split('\n').length : 0
  const charCount = value ? value.length : 0
  const errorCount = syntaxIssues.filter(i => i.severity === 'error').length
  const warningCount = syntaxIssues.filter(i => i.severity === 'warning').length
  const infoCount = syntaxIssues.filter(i => i.severity === 'info').length

  return (
    <div>
      {/* ─── 可点击的标题栏（折叠/展开切换） ─── */}
      <div
        onClick={() => setIsCollapsed(prev => !prev)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', cursor: 'pointer',
          borderRadius: isCollapsed ? 8 : '8px 8px 0 0',
          border: `1px solid ${isCollapsed ? tk.border : tk.accentBorder}`,
          borderBottom: isCollapsed ? `1px solid ${tk.border}` : 'none',
          background: isCollapsed ? tk.surface : tk.inputBg,
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => { if (isCollapsed) e.currentTarget.style.borderColor = tk.accentBorder }}
        onMouseLeave={(e) => { if (isCollapsed) e.currentTarget.style.borderColor = tk.border }}
      >
        {/* 左侧：状态指示灯 + 标题 + 摘要 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          {/* 折叠/展开箭头 */}
          <span style={{
            fontSize: 8, color: tk.textMuted,
            transition: 'transform 0.2s ease',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            display: 'inline-block', flexShrink: 0,
          }}>
            ▸
          </span>
          {/* 状态指示灯 */}
          <div style={{
            width: 3, height: 10, borderRadius: 2, flexShrink: 0,
            background: hasErrors ? '#ef4444' : hasWarnings ? '#f59e0b' : (value.trim() ? tk.accent : tk.textFaint),
            boxShadow: value.trim() ? `0 0 6px ${hasErrors ? 'rgba(239,68,68,0.3)' : hasWarnings ? 'rgba(245,158,11,0.3)' : `rgba(${isDark ? '52,211,153' : '5,150,105'},0.3)`}` : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: tk.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
            {t.blogCss.customCode}
          </span>
          {/* 摘要信息 */}
          {value.trim() ? (
            <span style={{ fontSize: 9, color: tk.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {t.blogCss.editorMetaLines.replace('{lines}', String(lineCount)).replace('{chars}', String(charCount))}
              {errorCount > 0 && <span style={{ color: 'rgba(239,68,68,0.85)', marginLeft: 4 }}>· {t.blogCss.editorMetaErrors.replace('{count}', String(errorCount))}</span>}
              {warningCount > 0 && <span style={{ color: 'rgba(245,158,11,0.85)', marginLeft: 4 }}>· {t.blogCss.editorMetaWarnings.replace('{count}', String(warningCount))}</span>}
              {infoCount > 0 && <span style={{ color: 'rgba(96,165,250,0.85)', marginLeft: 4 }}>· {t.blogCss.editorMetaHints.replace('{count}', String(infoCount))}</span>}
            </span>
          ) : (
            <span style={{ fontSize: 9, color: tk.textFaint, fontStyle: 'italic' }}>
              · {t.blogCss.editorMetaEmpty}
            </span>
          )}
        </div>

        {/* 右侧：撤销/重做按钮（阻止冒泡，不触发折叠） */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onUndo} disabled={!canUndo}
            title={t.blogCss.undoTitle}
            style={{
              padding: '3px 8px', borderRadius: 5, border: `1px solid ${tk.border}`,
              background: !canUndo ? 'transparent' : tk.inputBg,
              color: !canUndo ? tk.textFaint : tk.textSub,
              cursor: !canUndo ? 'default' : 'pointer',
              fontSize: 10, transition: 'all 0.15s ease',
            }}
          >
            ↶
          </button>
          <button onClick={onRedo} disabled={!canRedo}
            title={t.blogCss.redoTitle}
            style={{
              padding: '3px 8px', borderRadius: 5, border: `1px solid ${tk.border}`,
              background: !canRedo ? 'transparent' : tk.inputBg,
              color: !canRedo ? tk.textFaint : tk.textSub,
              cursor: !canRedo ? 'default' : 'pointer',
              fontSize: 10, transition: 'all 0.15s ease',
            }}
          >
            ↷
          </button>
        </div>
      </div>

      {/* ─── CodeMirror 编辑器容器（始终渲染，通过 CSS 控制显示/隐藏） ─── */}
      {/* 不能用条件渲染，否则 CodeMirror 初始化时 DOM 不存在 */}
      <div
        ref={editorRef}
        style={{
          borderRadius: isCollapsed ? 8 : '0 0 8px 8px',
          border: `1px solid ${isCollapsed ? tk.border : tk.accentBorder}`,
          borderTop: 'none',
          background: tk.surface,
          overflow: 'auto',
          minHeight: 120,
          maxHeight: isCollapsed ? 0 : 320,
          height: isCollapsed ? 0 : undefined,
          transition: 'max-height 0.2s ease, border-color 0.2s ease',
          display: isCollapsed ? 'none' : 'block',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = tk.accentBorder }}
        onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = tk.border }}
      />

      {/* 展开时的辅助区域：收起按钮 + 语法错误 */}
      {!isCollapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px' }}>
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                fontSize: 9, color: tk.textMuted, cursor: 'pointer',
                border: 'none', background: 'transparent', padding: '2px 6px',
                borderRadius: 4, transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = tk.textSub; e.currentTarget.style.background = tk.inputBg }}
              onMouseLeave={(e) => { e.currentTarget.style.color = tk.textMuted; e.currentTarget.style.background = 'transparent' }}
            >
              {t.blogCss.collapseEditor}
            </button>
          </div>

          {/* Syntax Issues — 仅展开时显示 */}
          {syntaxIssues.length > 0 && (
            <div style={{
              padding: '6px 10px', borderRadius: 8,
              background: hasErrors ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${hasErrors ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
              maxHeight: 120, overflowY: 'auto',
            }}>
              {syntaxIssues.map((issue, i) => {
                const colorMap = { error: 'rgba(239,68,68,0.85)', warning: 'rgba(245,158,11,0.85)', info: 'rgba(96,165,250,0.85)' }
                const iconMap = { error: '✕', warning: '⚠', info: 'ℹ' }
                return (
                  <div key={i} style={{
                    fontSize: 10, color: colorMap[issue.severity],
                    fontFamily: "'Fira Code', monospace",
                    lineHeight: 1.5,
                  }}>
                    {iconMap[issue.severity]} {t.blogCss.issueLine.replace('{line}', String(issue.line)).replace('{message}', issue.message)}
                  </div>
                )
              })}
            </div>
          )}

          {/* 兼容性提示 — 检测需前缀属性和兼容性有限的新特性 */}
          {(() => {
            const compatIssues = checkCssCompat(value, t.cssCompat)
            if (compatIssues.length === 0) return null
            return (
              <div style={{
                padding: '6px 10px', borderRadius: 8,
                background: 'rgba(96,165,250,0.06)',
                border: '1px solid rgba(96,165,250,0.15)',
                maxHeight: 120, overflowY: 'auto',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'rgba(96,165,250,0.85)',
                  marginBottom: 3, letterSpacing: '0.04em',
                }}>
                  {t.blogCss.compatTitle.replace('{count}', String(compatIssues.length))}
                </div>
                {compatIssues.map((issue, i) => {
                  const iconMap = { prefix_needed: '🔧', low_support: '⚠', experimental: '🧪' }
                  const labelMap = { prefix_needed: t.blogCss.compatPrefixNeeded, low_support: t.blogCss.compatLowSupport, experimental: t.blogCss.compatExperimental }
                  return (
                    <div key={i} style={{
                      fontSize: 9, color: 'rgba(96,165,250,0.75)',
                      fontFamily: "'Fira Code', monospace", lineHeight: 1.5,
                    }}>
                      {iconMap[issue.type]} {t.blogCss.compatIssueLine.replace('{line}', String(issue.line)).replace('{label}', labelMap[issue.type]).replace('{property}', issue.property).replace('{detail}', issue.detail)}
                      {issue.browsers && (
                        <span style={{ color: 'rgba(96,165,250,0.5)' }}>
                          {' '}— IE:{issue.browsers.ie} FF:{issue.browsers.firefox} Chrome:{issue.browsers.chrome} Safari:{issue.browsers.safari}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
