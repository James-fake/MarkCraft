import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState, useCallback } from 'react'
import { AuroraSelect } from '@components/ui/AuroraSelect'

const LANGUAGES = [
  { value: '', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'r', label: 'R' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'scala', label: 'Scala' },
  { value: 'lua', label: 'Lua' },
  { value: 'perl', label: 'Perl' },
  { value: 'vue', label: 'Vue' },
  { value: 'jsx', label: 'React (JSX)' },
  { value: '__custom__', label: 'Custom...' },
]

export default function CodeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const language = (node.attrs.language as string) || ''
  const [collapsed, setCollapsed] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
  const languageLabel = LANGUAGES.find(l => l.value === language)?.label || language || 'Plain Text'

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
                value={LANGUAGES.some(l => l.value === language) ? language : '__custom__'}
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
