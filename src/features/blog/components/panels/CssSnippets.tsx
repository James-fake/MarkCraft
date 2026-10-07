import { useState, useEffect, useCallback } from 'react'
import { SectionLabel, StudioChip } from '../StudioControls'
import { useThemeTokens } from './themeTokens'
import { useLanguage } from '@stores/LanguageStore'

const STORAGE_KEY = 'markcraft-css-snippets'

export interface CssSnippet {
  id: string
  name: string
  css: string
  createdAt: number
}

function loadSnippets(): CssSnippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSnippets(snippets: CssSnippet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
}

interface CssSnippetsProps {
  customCss: string
  onInsertSnippet: (css: string) => void
}

export function CssSnippets({ customCss, onInsertSnippet }: CssSnippetsProps) {
  const tk = useThemeTokens()
  const { t } = useLanguage()
  const [snippets, setSnippets] = useState<CssSnippet[]>(loadSnippets)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [snippetName, setSnippetName] = useState('')

  useEffect(() => {
    saveSnippets(snippets)
  }, [snippets])

  const handleSave = useCallback(() => {
    const name = snippetName.trim()
    if (!name || !customCss.trim()) return
    const newSnippet: CssSnippet = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      css: customCss.trim(),
      createdAt: Date.now(),
    }
    setSnippets(prev => [newSnippet, ...prev])
    setSnippetName('')
    setShowSaveInput(false)
  }, [snippetName, customCss])

  const handleDelete = useCallback((id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id))
  }, [])

  if (snippets.length === 0 && !showSaveInput) {
    return (
      <div>
        <SectionLabel>{t.blogCss.mySnippets}</SectionLabel>
        {customCss.trim() ? (
          <StudioChip
            label={t.blogCss.saveSnippet}
            onClick={() => setShowSaveInput(true)}
            variant="default"
          />
        ) : (
          <div style={{ fontSize: 10, color: tk.textMuted, fontStyle: 'italic' }}>
            {t.blogCss.snippetEmptyHint}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <SectionLabel>{t.blogCss.mySnippets}</SectionLabel>

      {/* Snippet list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {snippets.map(snippet => (
          <div key={snippet.id} style={{
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '3px 6px', borderRadius: 8,
            background: tk.inputBg,
            border: `1px solid ${tk.border}`,
            maxWidth: 160,
          }}>
            <button
              onClick={() => onInsertSnippet(snippet.css)}
              title={`${snippet.name}\n${snippet.css.slice(0, 100)}...`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: tk.textSub, fontSize: 10,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', padding: 0, textAlign: 'left',
              }}
            >
              {snippet.name}
            </button>
            <button
              onClick={() => handleDelete(snippet.id)}
              title={t.blogCss.snippetDelete}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: tk.textFaint, fontSize: 10, padding: 0,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Save button / input */}
      {showSaveInput ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            value={snippetName}
            onChange={(e) => setSnippetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
            placeholder={t.blogCss.snippetNamePlaceholder}
            autoFocus
            style={{
              flex: 1, padding: '4px 8px', fontSize: 10,
              border: `1px solid ${tk.inputBorder}`, borderRadius: 6,
              background: tk.inputBg, color: tk.text,
              outline: 'none', fontFamily: "'Inter', sans-serif",
            }}
          />
          <StudioChip label={t.blogCss.snippetSave} onClick={handleSave} variant="accent" />
          <StudioChip label={t.blogCss.snippetCancel} onClick={() => { setShowSaveInput(false); setSnippetName('') }} variant="default" />
        </div>
      ) : (
        customCss.trim() && (
          <StudioChip
            label={t.blogCss.saveSnippet}
            onClick={() => setShowSaveInput(true)}
            variant="default"
          />
        )
      )}
    </div>
  )
}
