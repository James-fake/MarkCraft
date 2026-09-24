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

  // 命令浮层：复用 aurora 单源命令面板类（遮罩 rgba(0,0,0,.45)、顶部 15vh 定位、
  // z-index 9000 带、材质/圆角/阴影全部由 .aurora-command* 提供）。
  // createPortal 到 body 已脱离 #aurora-root，内部不得使用任何局部作用域变量。
  return createPortal(
    <div className="aurora-command-overlay" onClick={onClose}>
      <div className="aurora-command" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="aurora-command__input-wrap">
          <input
            ref={inputRef}
            className="aurora-command__input"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="切换打开的文件…"
          />
        </div>
        <div ref={listRef} className="aurora-command__list" style={{ maxHeight: 340 }}>
          {results.length === 0 && (
            <div className="aurora-command__empty">
              {tabs.length === 0 ? '没有打开的文件' : '无匹配结果'}
            </div>
          )}
          {results.map((file, i) => (
            <div
              key={file.id}
              onClick={() => handleSelect(file.id)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`aurora-command__item${i === selectedIndex ? ' aurora-command__item--highlighted' : ''}`}
              style={{ height: 'auto', padding: '8px 12px' }}
            >
              <div className="aurora-command__item-content">
                <span className="aurora-command__item-title">{file.name}</span>
                {file.heading && <span className="aurora-command__item-desc">{file.heading}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default QuickSwitcher
