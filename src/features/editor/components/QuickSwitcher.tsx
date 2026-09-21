import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'

interface QuickSwitcherProps {
  visible: boolean
  onClose: () => void
  onOpenFile: (fileId: string) => void
}

const stripMd = (name: string) => name.endsWith('.md') ? name.slice(0, -3) : name

const QuickSwitcher: React.FC<QuickSwitcherProps> = ({ visible, onClose, onOpenFile }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { getFileHeadings } = useLinkIndex()
  const { tabs } = useFileManager()

  // 列出当前已打开的标签（名副其实的「快速切换文件」——与 quickOpen 的全库模糊打开区分）
  const allFiles = useMemo(() => {
    return tabs.map((tab) => ({
      id: tab.fileId,
      name: stripMd(tab.name),
      heading: getFileHeadings(tab.fileId)[0],
    }))
  }, [tabs, getFileHeadings])

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 20)
    const q = query.toLowerCase().trim()
    return allFiles
      .filter(f => f.name.toLowerCase().includes(q) || (f.heading?.toLowerCase().includes(q)))
      .slice(0, 20)
  }, [query, allFiles])

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.children[selectedIndex] as HTMLElement
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleSelect = useCallback((fileId: string) => {
    onOpenFile(fileId)
    onClose()
  }, [onOpenFile, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, selectedIndex, handleSelect, onClose])

  if (!visible) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 480, maxHeight: 400, background: 'var(--mc-bg-panel, #1e1e2e)', border: '1px solid var(--border-color, #333)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder="切换打开的文件…"
          style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--border-color, #333)', background: 'transparent', color: 'var(--mc-text-secondary, #e0e0e0)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        <div ref={listRef} style={{ maxHeight: 340, overflowY: 'auto', padding: '4px 0' }}>
          {results.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mc-text-secondary, #888)', opacity: 0.5, fontSize: 13 }}>
              {tabs.length === 0 ? '没有打开的文件' : '无匹配结果'}
            </div>
          )}
          {results.map((file, i) => (
            <div
              key={file.id}
              onClick={() => handleSelect(file.id)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                padding: '8px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                background: i === selectedIndex ? 'rgba(59,130,246,0.15)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--mc-text-secondary, #e0e0e0)' }}>{file.name}</span>
              {file.heading && (
                <span style={{ fontSize: 11, color: 'var(--mc-text-secondary, #888)', opacity: 0.6, marginTop: 1 }}>{file.heading}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default QuickSwitcher
