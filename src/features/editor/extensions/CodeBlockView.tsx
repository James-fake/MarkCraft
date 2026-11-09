import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { LANGUAGES, normalizeCodeLanguage } from './codeBlockLanguage'

export default function CodeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const language = (node.attrs.language as string) || ''
  // 显示层归一化（js → javascript 等）：高亮一直是好的，坏的只是下拉查不到 value。
  // ⚠️ 不写回 node.attrs —— 保存回 markdown 仍是用户写的 ```js。
  const displayLanguage = normalizeCodeLanguage(language)
  const knownLanguage = LANGUAGES.some(l => l.value === displayLanguage)
  const [collapsed, setCollapsed] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  /** 「已复制」2s 复位定时器：节点视图销毁时必须清理，否则 setState 打到已卸载组件 */
  const copyTimerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
    }
  }, [])
  const [customValue, setCustomValue] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    // ⚠️ 必须 catch（2026-11-03 审查 P2）：权限被拒（非安全上下文/用户拒绝）时
    //    writeText 返回 rejected promise，不处理就是 unhandled rejection。
    navigator.clipboard
      .writeText(node.textContent)
      .then(() => {
        setCopied(true)
        // 定时器存 ref，节点视图销毁后不再 setState（见下方 cleanup）
        if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
        copyTimerRef.current = window.setTimeout(() => {
          setCopied(false)
          copyTimerRef.current = null
        }, 2000)
      })
      .catch(() => {
        /* 复制失败：保持按钮原状即可（无需打扰用户，也没有可写回的状态） */
      })
  }, [node.textContent])

  const handleLanguageChange = useCallback((val: string) => {
    if (val === '__custom__') {
      setCustomMode(true)
      setCustomValue(language || '')
      return
    }
    setCustomMode(false)
    updateAttributes({ language: val })
  }, [language, updateAttributes])

  const handleCustomBlur = useCallback(() => {
    updateAttributes({ language: customValue })
    setCustomMode(false)
  }, [customValue, updateAttributes])

  const handleCustomKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      updateAttributes({ language: customValue })
      setCustomMode(false)
    }
    if (e.key === 'Escape') {
      setCustomMode(false)
    }
  }, [customValue, updateAttributes])

  // Get display label for the language
  const languageLabel = LANGUAGES.find(l => l.value === displayLanguage)?.label || language || 'Plain Text'

  return (
    <NodeViewWrapper as="div">
      <div
        data-type="codeBlock"
        className="tiptap-code-block"
        style={{
          position: 'relative',
          margin: '0.75em 0',
          borderRadius: 8,
          border: selected
            ? '2px solid var(--button-primary, #3b82f6)'
            : '1px solid var(--editor-border)',
          backgroundColor: 'var(--code-block-bg)',
          color: 'var(--code-block-text)',
          overflow: 'hidden',
          transition: 'border-color 0.15s',
        }}
      >
        {/* Header bar with language selector and collapse toggle */}
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid var(--editor-border, rgba(255,255,255,0.1))',
            backgroundColor: 'rgba(127, 127, 127, 0.08)',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg style={{ width: '14px', height: '14px', opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {customMode ? (
              <input
                type="text"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                onBlur={handleCustomBlur}
                onKeyDown={handleCustomKeyDown}
                autoFocus
                placeholder="Custom language..."
                style={{
                  padding: '2px 6px',
                  border: '1px solid var(--button-primary, #3b82f6)',
                  borderRadius: 3,
                  fontSize: 11,
                  backgroundColor: 'var(--editor-bg)',
                  color: 'var(--editor-text)',
                  outline: 'none',
                  width: '120px',
                  fontFamily: "'Fira Code', Consolas, monospace",
                }}
              />
            ) : (
              <AuroraSelect
                value={knownLanguage ? displayLanguage : '__custom__'}
                onChange={handleLanguageChange}
                options={LANGUAGES}
              />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={handleCopy}
              onMouseDown={e => e.preventDefault()}
              title="Copy code"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                border: 'none',
                borderRadius: 3,
                background: 'transparent',
                color: 'var(--code-block-text)',
                cursor: 'pointer',
                opacity: 0.5,
                transition: 'opacity 0.15s, background-color 0.15s',
                padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(127,127,127,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent' }}
            >
              {copied ? (
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setCollapsed(prev => !prev)}
              title={collapsed ? 'Expand code block' : 'Collapse code block'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                border: 'none',
                borderRadius: 3,
                background: 'transparent',
                color: 'var(--code-block-text)',
                cursor: 'pointer',
                opacity: 0.5,
                transition: 'opacity 0.15s, background-color 0.15s',
                padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(127,127,127,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg
                style={{
                  width: '14px',
                  height: '14px',
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Code content */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: collapsed ? '0px' : 'none',
            transition: collapsed ? 'max-height 0.2s ease-out' : 'none',
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: '14px 18px',
              overflowX: 'auto',
              background: 'transparent',
            }}
          >
            <NodeViewContent
              style={{
                background: 'none',
                padding: 0,
                fontSize: '0.85em',
                lineHeight: 1.65,
                color: 'inherit',
                fontFamily: 'var(--editor-code-font-family, Consolas, Monaco, "Fira Code", monospace)',
              }}
            />
          </pre>
        </div>

        {/* Collapsed indicator */}
        {collapsed && (
          <div
            contentEditable={false}
            style={{
              padding: '6px 18px',
              fontSize: '12px',
              opacity: 0.4,
              color: 'var(--code-block-text)',
              fontStyle: 'italic',
              userSelect: 'none',
            }}
          >
            {languageLabel} · ···
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
