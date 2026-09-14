/**
 * CrossKbSearch - 跨知识库搜索组件
 * 全屏覆盖式面板，搜索所有知识库内的文件内容，结果按库分组展示
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useKbStore } from '@stores/useKbStore'
import { loadKb, getKbFiles } from '@stores/kbStore'
import { findNode } from '@services/fileService'
import { KB_COLORS, getKbGradient } from '../kbTheme'
import { IconNetwork, IconFolder, IconClose, IconBook, IconFileText } from './KbIcons'
import type { KnowledgeBase } from '@stores/kbTypes'

/** 搜索防抖延迟（毫秒） */
const SEARCH_DEBOUNCE_MS = 300
/** 每个库最多返回的结果数 */
const MAX_RESULTS_PER_KB = 15
/** 每个文件最多显示的匹配行数 */
const MAX_MATCHES_PER_FILE = 3

/** 单条匹配行 */
interface MatchLine {
  line: number
  text: string
  matchStart: number
  matchEnd: number
}

/** 单个文件的搜索结果 */
interface FileResult {
  fileId: string
  fileName: string
  matches: MatchLine[]
}

/** 单个知识库的搜索结果 */
interface KbResult {
  kbId: string
  kbName: string
  kbDescription: string
  gradient: string
  totalFiles: number
  results: FileResult[]
}

interface CrossKbSearchProps {
  onClose: () => void
  /** 打开文件回调（可选，参数：知识库 ID + 文件 ID） */
  onOpenFile?: (kbId: string, fileId: string) => void
}

export const CrossKbSearch: React.FC<CrossKbSearchProps> = ({ onClose, onOpenFile }) => {
  const { kbList, rootFolder } = useKbStore()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<KbResult[]>([])
  const [error, setError] = useState('')
  /** 搜索范围：选中的知识库 ID 集合，空集表示搜索全部 */
  const [selectedKbIds, setSelectedKbIds] = useState<Set<string>>(new Set())
  const [showKbFilter, setShowKbFilter] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 加载并缓存知识库详情（含文件列表） */
  const loadKbDetails = useCallback(async (ids: string[]): Promise<{ kb: KnowledgeBase; fileIds: string[] }[]> => {
    const loaded: { kb: KnowledgeBase; fileIds: string[] }[] = []
    for (const id of ids) {
      try {
        const kb = await loadKb(id)
        if (!kb) continue
        const fileIds = getKbFiles(rootFolder, kb)
        loaded.push({ kb, fileIds })
      } catch (err) {
        console.error(`[CrossKbSearch] 加载知识库失败: ${id}`, err)
      }
    }
    return loaded
  }, [rootFolder])

  /** 执行跨库搜索 */
  const performSearch = useCallback(async (q: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (!q.trim()) {
      setResults([])
      setError('')
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        // 确定搜索范围
        const targetIds = selectedKbIds.size > 0
          ? Array.from(selectedKbIds)
          : kbList.map(k => k.id)
        if (targetIds.length === 0) {
          setResults([])
          return
        }

        // 加载知识库详情
        const details = await loadKbDetails(targetIds)

        // 对每个知识库执行搜索
        const kbResults: KbResult[] = []
        for (const { kb, fileIds } of details) {
          const fileResults: FileResult[] = []
          for (const fileId of fileIds) {
            const node = findNode(rootFolder, fileId)
            if (!node || node.type !== 'file') continue
            const matches = searchInContent(node.content ?? '', q)
            if (matches.length > 0) {
              fileResults.push({
                fileId,
                fileName: node.name,
                matches: matches.slice(0, MAX_MATCHES_PER_FILE),
              })
            }
            if (fileResults.length >= MAX_RESULTS_PER_KB) break
          }
          if (fileResults.length > 0) {
            kbResults.push({
              kbId: kb.id,
              kbName: kb.name,
              kbDescription: kb.description,
              gradient: getKbGradient(kb.id),
              totalFiles: fileIds.length,
              results: fileResults,
            })
          }
        }
        // 按匹配文件数降序
        kbResults.sort((a, b) => b.results.length - a.results.length)
        setResults(kbResults)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(`搜索失败：${message}`)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }, [kbList, selectedKbIds, loadKbDetails, rootFolder])

  // 查询变化时触发搜索
  useEffect(() => {
    void performSearch(query)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performSearch])

  /** 切换知识库选中状态 */
  const toggleKb = (kbId: string) => {
    setSelectedKbIds(prev => {
      const next = new Set(prev)
      if (next.has(kbId)) {
        next.delete(kbId)
      } else {
        next.add(kbId)
      }
      return next
    })
  }

  const totalFiles = results.reduce((sum, r) => sum + r.results.length, 0)
  const scopeText = selectedKbIds.size > 0
    ? `${selectedKbIds.size} 个知识库`
    : `全部 ${kbList.length} 个知识库`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: KB_COLORS.bg, overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 顶部栏 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px',
        backgroundColor: KB_COLORS.bgCard,
        borderBottom: `1px solid ${KB_COLORS.border}`,
      }}>
        <span style={{ display: 'inline-flex' }}><IconNetwork size={18} /></span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          placeholder="跨知识库搜索..."
          autoFocus
          style={{
            flex: 1, maxWidth: 600,
            padding: '8px 12px', borderRadius: 6,
            border: `1px solid ${KB_COLORS.border}`,
            backgroundColor: KB_COLORS.bg,
            color: KB_COLORS.textMain, fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        {/* 范围筛选 */}
        <button
          onClick={() => setShowKbFilter(!showKbFilter)}
          style={showKbFilter ? activeBtnStyle : btnStyle}
          title="选择搜索范围"
        >
          <IconFolder size={14} /> 范围 ({selectedKbIds.size > 0 ? selectedKbIds.size : '全部'})
        </button>
        <button onClick={onClose} style={btnStyle} title="关闭 (Esc)"><IconClose size={14} /></button>
      </div>

      {/* 知识库范围筛选器 */}
      {showKbFilter && (
        <div style={{
          padding: '8px 20px',
          backgroundColor: KB_COLORS.bgCard,
          borderBottom: `1px solid ${KB_COLORS.border}`,
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: KB_COLORS.textSecondary }}>搜索范围：</span>
          {kbList.length === 0 ? (
            <span style={{ fontSize: 12, color: KB_COLORS.textTertiary }}>暂无知识库</span>
          ) : (
            kbList.map(kb => (
              <label
                key={kb.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 12,
                  fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${selectedKbIds.has(kb.id) ? KB_COLORS.primary : KB_COLORS.border}`,
                  backgroundColor: selectedKbIds.has(kb.id) ? KB_COLORS.primaryLight : KB_COLORS.bg,
                  color: selectedKbIds.has(kb.id) ? KB_COLORS.primaryDark : KB_COLORS.textSecondary,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedKbIds.has(kb.id)}
                  onChange={() => toggleKb(kb.id)}
                  style={{ cursor: 'pointer', margin: 0 }}
                />
                {kb.name}
              </label>
            ))
          )}
          {selectedKbIds.size > 0 && (
            <button
              onClick={() => setSelectedKbIds(new Set())}
              style={{ ...btnStyle, padding: '3px 8px', fontSize: 11 }}
            >清除选择</button>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{
          margin: '12px 20px 0', padding: '8px 12px',
          backgroundColor: KB_COLORS.dangerBg, color: KB_COLORS.dangerText,
          borderRadius: 6, fontSize: 13,
        }}>{error}</div>
      )}

      {/* 结果区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        {/* 状态摘要 */}
        {query.trim() && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 12, fontSize: 12, color: KB_COLORS.textSecondary,
          }}>
            {searching ? (
              <span>搜索中...</span>
            ) : (
              <>
                <span>在 {scopeText} 中找到 {results.length} 个库 · {totalFiles} 个文件</span>
              </>
            )}
          </div>
        )}

        {/* 空状态 */}
        {!query.trim() && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: KB_COLORS.textTertiary, fontSize: 14,
          }}>
            <div style={{ marginBottom: 12, color: KB_COLORS.textTertiary, display: 'inline-flex' }}><IconNetwork size={40} /></div>
            输入关键词搜索所有知识库
            <div style={{ marginTop: 8, fontSize: 12 }}>
              结果将按知识库分组展示，可直接跳转到对应文件
            </div>
          </div>
        )}

        {/* 搜索结果 */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {results.map(kbResult => (
              <KbResultGroup
                key={kbResult.kbId}
                kbResult={kbResult}
                query={query}
                onOpenFile={(fileId) => onOpenFile?.(kbResult.kbId, fileId)}
              />
            ))}
          </div>
        )}

        {/* 无结果 */}
        {query.trim() && !searching && results.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: KB_COLORS.textTertiary, fontSize: 14,
          }}>
            未找到匹配结果
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 子组件：单知识库结果组 ───

const KbResultGroup: React.FC<{
  kbResult: KbResult
  query: string
  onOpenFile: (fileId: string) => void
}> = ({ kbResult, query, onOpenFile }) => {
  const [expanded, setExpanded] = useState(true)
  return (
    <div style={{
      backgroundColor: KB_COLORS.bgCard,
      borderRadius: 12,
      border: `1px solid ${KB_COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* 知识库头部 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = KB_COLORS.bgHover)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: kbResult.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#fff', flexShrink: 0,
        }}><IconBook size={14} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: KB_COLORS.textMain,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{kbResult.kbName}</div>
          {kbResult.kbDescription && (
            <div style={{
              fontSize: 11, color: KB_COLORS.textTertiary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{kbResult.kbDescription}</div>
          )}
        </div>
        <span style={{
          fontSize: 11, color: KB_COLORS.primary,
          backgroundColor: KB_COLORS.primaryLight,
          padding: '2px 8px', borderRadius: 10,
        }}>
          {kbResult.results.length} / {kbResult.totalFiles} 文件
        </span>
        <span style={{ fontSize: 12, color: KB_COLORS.textTertiary }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      {/* 文件结果列表 */}
      {expanded && (
        <div style={{ padding: '4px 0 8px' }}>
          {kbResult.results.map(file => (
            <FileResultRow
              key={file.fileId}
              file={file}
              query={query}
              onOpen={() => onOpenFile(file.fileId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 子组件：单文件结果行 ───

const FileResultRow: React.FC<{
  file: FileResult
  query: string
  onOpen: () => void
}> = ({ file, onOpen }) => {
  return (
    <div
      onClick={onOpen}
      style={{
        padding: '6px 14px', cursor: 'pointer',
        borderBottom: `1px solid ${KB_COLORS.border}`,
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = KB_COLORS.bgHover)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 500, color: KB_COLORS.textMain, marginBottom: 4,
      }}>
        <span style={{ display: 'inline-flex' }}><IconFileText size={14} /></span>
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>{file.fileName}</span>
        <span style={{ fontSize: 11, color: KB_COLORS.textTertiary }}>
          {file.matches.length} 处
        </span>
      </div>
      {/* 匹配行预览 */}
      {file.matches.map((m, idx) => {
        const before = m.text.slice(0, m.matchStart)
        const matched = m.text.slice(m.matchStart, m.matchEnd)
        const after = m.text.slice(m.matchEnd)
        return (
          <div
            key={idx}
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
              fontSize: 11, lineHeight: 1.5,
              color: KB_COLORS.textSecondary,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              paddingLeft: 20,
            }}
          >
            <span style={{ color: KB_COLORS.textTertiary, marginRight: 6 }}>L{m.line}</span>
            {before}
            <mark style={{
              backgroundColor: KB_COLORS.highlight, color: KB_COLORS.textMain,
              padding: '0 2px', borderRadius: 2,
            }}>{matched}</mark>
            {after}
          </div>
        )
      })}
    </div>
  )
}

// ─── 搜索工具函数 ───

/** 在文件内容中搜索匹配行 */
function searchInContent(content: string, query: string): MatchLine[] {
  if (!query.trim()) return []
  const lines = content.split('\n')
  const results: MatchLine[] = []
  const lowerQuery = query.toLowerCase()
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase()
    let idx = 0
    while (idx <= lowerLine.length) {
      const found = lowerLine.indexOf(lowerQuery, idx)
      if (found === -1) break
      results.push({
        line: i + 1,
        text: lines[i],
        matchStart: found,
        matchEnd: found + query.length,
      })
      idx = found + 1
      if (results.length >= MAX_MATCHES_PER_FILE) return results
    }
  }
  return results
}

// ─── 样式 ───

const btnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.border}`,
  backgroundColor: KB_COLORS.bgCard,
  color: KB_COLORS.textMain, fontSize: 12,
}

const activeBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.primary}`,
  backgroundColor: KB_COLORS.primaryLight,
  color: KB_COLORS.primaryDark, fontSize: 12,
}
