import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import katex from 'katex'
import { livePreviewKey, type LivePreviewState } from './LivePreviewExtension'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 块级公式的节点视图。
 *
 * ⚠️ 2026-10-11 用户反馈：「需双击块级框去编辑源码，那如果不知道怎么编辑源码的用户怎么办？」
 *    排查后发现问题不是「没有提示」，而是**提示等于不存在** —— 原来的「双击编辑公式」
 *    是 `fontSize:10px / opacity:0.4 / pointerEvents:none` 的装饰文字：看不见、也点不到；
 *    而唯一的入口（双击）既不是 Web 通用约定，也没有任何键盘路径。
 *
 * 本次改动（用户选定「入口可见化 + 降低 LaTeX 门槛」两档）：
 *   ① 可见入口：hover / 选中时出现「编辑公式」按钮（双击保留为快捷方式）
 *   ② 键盘路径：选中块后 Enter 进编辑（见 MathBlock.ts 的快捷键），Esc 退出
 *   ③ 编辑态给三样东西：**实时预览**（写错当场看见）、**符号面板**（点一下插入）、
 *      **模板**（给骨架而不是给符号，不懂 LaTeX 也能拼出公式）
 */

interface SymbolItem {
  /** 按钮上显示的字形 */
  label: string
  /** 插入到源码里的文本 */
  insert: string
  /** 插入后光标相对末尾的偏移（负数表示回退到花括号内） */
  caretFromEnd?: number
  title?: string
}

const SYMBOL_ITEMS: SymbolItem[] = [
  { label: '√', insert: '\\sqrt{}', caretFromEnd: -1, title: '根号' },
  { label: 'a⁄b', insert: '\\frac{}{}', caretFromEnd: -3, title: '分数' },
  { label: 'xⁿ', insert: '^{}', caretFromEnd: -1, title: '上标' },
  { label: 'xₙ', insert: '_{}', caretFromEnd: -1, title: '下标' },
  { label: '∑', insert: '\\sum_{}^{}', caretFromEnd: -4, title: '求和' },
  { label: '∫', insert: '\\int_{}^{}', caretFromEnd: -4, title: '积分' },
  { label: 'π', insert: '\\pi ', title: '圆周率' },
  { label: 'α', insert: '\\alpha ', title: '阿尔法' },
  { label: 'θ', insert: '\\theta ', title: '西塔' },
  { label: '≤', insert: '\\leq ', title: '小于等于' },
  { label: '≥', insert: '\\geq ', title: '大于等于' },
  { label: '≠', insert: '\\neq ', title: '不等于' },
  { label: '×', insert: '\\times ', title: '乘' },
  { label: '±', insert: '\\pm ', title: '正负' },
  { label: '∞', insert: '\\infty ', title: '无穷' },
  { label: '→', insert: '\\to ', title: '趋于' },
]

/** 常用整公式骨架：给「不懂 LaTeX 的人」一条能直接用的路 */
const TEMPLATES: { label: string; latex: string; caretFromEnd?: number }[] = [
  { label: '一元二次求根', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: '求和', latex: '\\sum_{i=1}^{n} a_i' },
  { label: '定积分', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: '极限', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
  { label: '分数', latex: '\\frac{}{}', caretFromEnd: -3 },
  { label: '根号', latex: '\\sqrt{}', caretFromEnd: -1 },
]

export default function MathBlockView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const latexAttr = (node.attrs.latex as string) || ''
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(latexAttr)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const livePreviewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lpEditingRef = useRef(false)
  // KaTeX 缓存：内容未变时跳过重渲染
  const lastLatexRef = useRef('')
  const { t } = useLanguage()
  const M = t.mathBlock

  useEffect(() => {
    if (editing || !previewRef.current) return

    // 内容未变，跳过渲染
    if (latexAttr === lastLatexRef.current && previewRef.current.querySelector('.katex')) {
      return
    }

    const latex = latexAttr
    if (!latex.trim()) {
      previewRef.current.innerHTML = `<span style="opacity:0.3;font-style:italic">${M.empty}</span>`
      lastLatexRef.current = ''
      return
    }
    try {
      katex.render(latex, previewRef.current, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      })
      lastLatexRef.current = latex
    } catch {
      if (previewRef.current) {
        previewRef.current.textContent = latex
      }
    }
  }, [latexAttr, editing, M.empty])

  // 编辑态实时预览：每敲一个字就重渲染，写错当场看得见（这是「降低门槛」最关键的一环）
  useEffect(() => {
    if (!editing || !livePreviewRef.current) return
    const value = editValue.trim()
    if (!value) {
      livePreviewRef.current.innerHTML = `<span style="opacity:0.35;font-style:italic">${M.previewEmpty}</span>`
      return
    }
    try {
      katex.render(value, livePreviewRef.current, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      })
    } catch {
      livePreviewRef.current.textContent = value
    }
  }, [editing, editValue, M.previewEmpty])

  useEffect(() => {
    setEditValue(latexAttr)
  }, [latexAttr])

  const beginEditing = useCallback(() => {
    lpEditingRef.current = false
    setEditing(true)
    setEditValue(latexAttr)
  }, [latexAttr])

  const finishEditing = useCallback(() => {
    lpEditingRef.current = false
    setEditing(false)
    updateAttributes({ latex: editValue })
  }, [editValue, updateAttributes])

  // 键盘路径：选中块后按 Enter 进入编辑（快捷键在 MathBlock.ts 里注册，这里只订阅事件）
  useEffect(() => {
    const onRequestEdit = () => beginEditing()
    editor.on('mathBlock:requestEdit', onRequestEdit)
    return () => {
      editor.off('mathBlock:requestEdit', onRequestEdit)
    }
  }, [editor, beginEditing])

  // Live Preview：光标进入数学公式块时自动进入编辑模式
  useEffect(() => {
    const updateActive = () => {
      const lpState = livePreviewKey.getState(editor.state) as LivePreviewState | undefined
      if (!lpState || !lpState.enabled) return

      const pos = getPos()
      if (pos === null || pos === undefined) return

      const { activeNodePos } = lpState
      const isActive = pos === activeNodePos

      if (isActive && !editing) {
        lpEditingRef.current = true
        setEditing(true)
        setEditValue(latexAttr)
      } else if (!isActive && editing && lpEditingRef.current) {
        lpEditingRef.current = false
        setEditing(false)
        updateAttributes({ latex: editValue })
      }
    }

    // 不在挂载时立即调用 updateActive()，避免 setContent 后光标短暂落在公式块内
    // 触发自动编辑模式。只在用户实际操作触发 selectionUpdate 时才检查。
    editor.on('selectionUpdate', updateActive)
    return () => {
      editor.off('selectionUpdate', updateActive)
    }
  }, [editor, getPos, editing, latexAttr, editValue, updateAttributes])

  const handleDoubleClick = () => beginEditing()

  const handleBlur = () => {
    if (lpEditingRef.current) return
    finishEditing()
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        finishEditing()
        return
      }
      // 公式常常是多行的，故 Enter 保留为换行；用 Ctrl/Cmd+Enter 表示「完成」
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        finishEditing()
      }
    },
    [finishEditing],
  )

  /** 在光标处插入文本（并把光标放到合适位置），用于符号面板与模板 */
  const insertAtCaret = useCallback(
    (text: string, caretFromEnd = 0) => {
      const ta = textareaRef.current
      if (!ta) {
        setEditValue((v) => v + text)
        return
      }
      const start = ta.selectionStart ?? editValue.length
      const end = ta.selectionEnd ?? start
      const next = editValue.slice(0, start) + text + editValue.slice(end)
      setEditValue(next)
      const caret = start + text.length + caretFromEnd
      requestAnimationFrame(() => {
        ta.focus()
        ta.setSelectionRange(caret, caret)
      })
    },
    [editValue],
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latexAttr)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }, [latexAttr])

  const handleDelete = useCallback(() => {
    const pos = getPos()
    if (pos === null || pos === undefined) return
    editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
  }, [editor, getPos, node.nodeSize])

  const btnStyle: React.CSSProperties = {
    fontSize: 12,
    lineHeight: 1.4,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid var(--editor-border)',
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
    cursor: 'pointer',
  }

  return (
    <NodeViewWrapper>
      <div
        data-type="mathBlock"
        data-latex={latexAttr}
        style={{
          position: 'relative',
          margin: '0.75em 0',
          padding: '12px 16px',
          borderRadius: '8px',
          border: selected ? '2px solid var(--button-primary, #3b82f6)' : '1px solid var(--editor-border)',
          backgroundColor: 'rgba(127, 127, 127, 0.04)',
          transition: 'border-color 0.15s',
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {editing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder={M.placeholder}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '8px',
                border: '1px solid var(--editor-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--editor-bg)',
                color: 'var(--editor-text)',
                fontFamily: "'Fira Code', Consolas, monospace",
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* 实时预览：写错当场看见，不用来回切模式 */}
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 4,
                backgroundColor: 'rgba(127,127,127,0.06)',
                textAlign: 'center',
                overflowX: 'auto',
                minHeight: 34,
              }}
            >
              <div ref={livePreviewRef} />
            </div>

            {/* 符号面板：不会 LaTeX 的人点一下就插入 */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {SYMBOL_ITEMS.map((s) => (
                <button
                  key={s.insert}
                  type="button"
                  title={s.title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCaret(s.insert, s.caretFromEnd ?? 0)}
                  style={{
                    minWidth: 30,
                    padding: '3px 6px',
                    fontSize: 13,
                    borderRadius: 5,
                    border: '1px solid var(--editor-border)',
                    backgroundColor: 'var(--editor-bg)',
                    color: 'var(--editor-text)',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 模板：给骨架而不是给符号 —— 不懂 LaTeX 也能直接改数字 */}
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setEditValue(tpl.latex)
                    const ta = textareaRef.current
                    const caret = tpl.latex.length + (tpl.caretFromEnd ?? 0)
                    requestAnimationFrame(() => {
                      ta?.focus()
                      ta?.setSelectionRange(caret, caret)
                    })
                  }}
                  style={{
                    fontSize: 12,
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: '1px dashed var(--editor-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--editor-text)',
                    cursor: 'pointer',
                    opacity: 0.85,
                  }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--editor-text)',
                opacity: 0.6,
              }}
            >
              {M.editingHint}
            </div>
          </div>
        ) : (
          <div
            ref={previewRef}
            style={{
              textAlign: 'center',
              overflowX: 'auto',
              padding: '4px 0',
              cursor: 'pointer',
            }}
          />
        )}

        {/* 可见入口：hover 或选中时出现。原来的「双击编辑公式」是 10px/40% 透明且点不动的
            装饰文字 —— 用户根本看不到，本次换成真正可点的按钮。 */}
        {!editing && (hovered || selected) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 6,
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={beginEditing}
              style={{
                ...btnStyle,
                borderColor: 'var(--button-primary, #3b82f6)',
                color: 'var(--button-primary, #3b82f6)',
              }}
            >
              {M.edit}
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleCopy} style={btnStyle}>
              {copied ? M.copied : M.copy}
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleDelete} style={btnStyle}>
              {M.remove}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
