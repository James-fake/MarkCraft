/**
 * KbSearchPanel - 库内全文搜索面板
 * 集成到知识库统一布局（左侧导航 + 右侧内容区），支持正则/全词/语义检索（本地统计），结果按文件分组并高亮关键词
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useKbStore } from '@stores/useKbStore'
import { getKbOverlayRoot } from './kbOverlayRoot'
import { useTagIndex } from '@stores/TagIndexStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { getSemanticSearch } from '../ai/semanticSearch'
import { IconSearch, IconTag, IconFileText } from './KbIcons'
import { AdvancedFilter } from './AdvancedFilter'
import { useLanguage } from '../../../stores/LanguageStore'
import type { FileNode } from '@src/types/fileManager'
import type { QueryFilters, SavedQuery } from '@stores/kbTypes'

type SearchMode = 'text' | 'regex' | 'word' | 'semantic'

/** 单条匹配结果 */
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
  semanticScore?: number
}

interface KbSearchPanelProps {
  kbId: string
  files: FileNode[]
  onClose: () => void
  /** 初始筛选器（可选） */
  filters?: QueryFilters
  /** 打开文件回调 */
  onOpenFile?: (fileId: string) => void
}

/** 搜索防抖延迟（毫秒） */
const SEARCH_DEBOUNCE_MS = 250
/** 每个文件最多显示的匹配行数 */
const MAX_MATCHES_PER_FILE = 20

/** 搜索模式（顶栏分段控件）—— labelKey 经 t.kbSearch 解析 */
const SEARCH_MODES: { id: SearchMode; labelKey: 'modeText' | 'modeRegex' | 'modeWord' | 'modeSemantic' }[] = [
  { id: 'text', labelKey: 'modeText' },
  { id: 'regex', labelKey: 'modeRegex' },
  { id: 'word', labelKey: 'modeWord' },
  { id: 'semantic', labelKey: 'modeSemantic' },
]

export const KbSearchPanel: React.FC<KbSearchPanelProps> = ({
  kbId,
  files,
  onClose,
  filters: initialFilters,
  onOpenFile,
}) => {
  const { activeKb, loadActiveKb, updateSavedQueries } = useKbStore()
  const { getAllTags } = useTagIndex()
  const { getOutgoingLinks, getBacklinks } = useLinkIndex()
  const { t } = useLanguage()
  const KS = t.kbSearch

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('text')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [filters, setFilters] = useState<QueryFilters>(initialFilters ?? {})
  const [results, setResults] = useState<FileResult[]>([])
  const [searching, setSearching] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [error, setError] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const semanticIndexBuiltRef = useRef(false)

  // 加载知识库（用于读取已保存的查询）
  useEffect(() => {
    if (kbId && (!activeKb || activeKb.id !== kbId)) {
      void loadActiveKb(kbId)
    }
  }, [kbId, activeKb, loadActiveKb])

  // 收集可用标签
  const availableTags = useMemo(() => getAllTags(), [getAllTags])

  // 应用筛选器过滤文件
  const filteredFiles = useMemo(() => {
    return files.filter(f => matchFilters(f, filters, getOutgoingLinks, getBacklinks))
  }, [files, filters, getOutgoingLinks, getBacklinks])

  /** 执行搜索（防抖） */
  const performSearch = useCallback(async (q: string, m: SearchMode) => {
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
        if (m === 'semantic') {
          // 语义搜索：使用 SemanticSearch 引擎
          const engine = getSemanticSearch()
          // 首次搜索时构建索引
          if (!semanticIndexBuiltRef.current) {
            await engine.buildIndex(filteredFiles)
            semanticIndexBuiltRef.current = true
          }
          const hits = await engine.search(q, 30)
          const resultById = new Map<string, FileResult>()
          for (const hit of hits) {
            const file = filteredFiles.find(f => f.id === hit.fileId)
            if (!file) continue
            resultById.set(hit.fileId, {
              fileId: hit.fileId,
              fileName: file.name,
              matches: [],
              semanticScore: hit.score,
            })
          }
          // 为语义结果补充首个相关片段
          for (const [fileId, res] of resultById) {
            const file = filteredFiles.find(f => f.id === fileId)
            if (!file) continue
            const snippet = extractFirstSnippet(file.content ?? '', q)
            if (snippet) {
              res.matches.push(snippet)
            }
          }
          setResults(Array.from(resultById.values()))
        } else {
          // 文本/正则/全词搜索
          const fileResults: FileResult[] = []
          for (const file of filteredFiles) {
            const matches = searchInContent(file.content ?? '', q, m, caseSensitive, KS.invalidRegex)
            if (matches.length > 0) {
              fileResults.push({
                fileId: file.id,
                fileName: file.name,
                matches: matches.slice(0, MAX_MATCHES_PER_FILE),
              })
            }
          }
          // 文本搜索按匹配数降序
          fileResults.sort((a, b) => b.matches.length - a.matches.length)
          setResults(fileResults)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(KS.searchFailed.replace(String.raw`{msg}`, message))
        setResults([])
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }, [filteredFiles, caseSensitive, KS])

  // 当查询/模式/大小写变化时触发搜索
  useEffect(() => {
    void performSearch(query, mode)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, mode, caseSensitive, performSearch])

  // 文件列表变化时重置语义索引标志
  useEffect(() => {
    semanticIndexBuiltRef.current = false
  }, [filteredFiles])

  /** 保存当前查询 */
  const handleSaveQuery = () => {
    if (!saveName.trim() || !activeKb) return
    const newQuery: SavedQuery = {
      id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: saveName.trim(),
      query,
      filters,
      createdAt: Date.now(),
    }
    const existing = activeKb.savedQueries ?? []
    void updateSavedQueries(kbId, [...existing, newQuery])
    setShowSaveDialog(false)
    setSaveName('')
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <div className="kb-searchpanel">
      {/* 顶部工具栏：搜索框（主） + 匹配选项（模式/大小写） + 右侧操作（筛选/保存/关闭） */}
      <div className="kb-searchpanel-top">
        <div className="kb-searchpanel-field">
          <IconSearch size={16} />
          <input
            className="kb-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            placeholder={KS.searchPlaceholder}
            autoFocus
          />
        </div>

        <div className="kb-searchpanel-match">
          <div className="kb-searchpanel-modes" role="tablist" aria-label={KS.modesAria}>
            {SEARCH_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={`kb-searchpanel-mode ${mode === m.id ? 'is-active' : ''}`}
                onClick={() => setMode(m.id)}
                title={KS[m.labelKey]}
              >{KS[m.labelKey]}</button>
            ))}
          </div>
          <label className="kb-searchpanel-case" title={KS.caseTitle}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={e => setCaseSensitive(e.target.checked)}
            />
            Aa
          </label>
        </div>

        <div className="kb-searchpanel-actions">
          <div className="kb-searchpanel-actions-tray">
            <button
              type="button"
              className={'kb-btn' + (filterVisible ? ' kb-btn-active' : '')}
              onClick={() => setFilterVisible(!filterVisible)}
              title={KS.advancedFilter}
            >{KS.filterBtn}</button>
            <button
              type="button"
              className="kb-btn"
              onClick={() => setShowSaveDialog(true)}
              disabled={!query.trim()}
              title={KS.saveQuery}
            >{KS.saveBtn}</button>
          </div>
        </div>
      </div>

      {error && <div className="kb-searchpanel-error">{error}</div>}

      <div className="kb-searchpanel-body">
        {filterVisible && (
          <aside className="kb-searchpanel-filter">
            <div className="kb-section-title" style={{ marginBottom: 12 }}><IconTag /> {KS.advancedFilterTitle}</div>
            <AdvancedFilter filters={filters} onChange={setFilters} availableTags={availableTags} />
          </aside>
        )}

        <div className="kb-searchpanel-results">
          {query.trim() && (
            <div className="kb-searchpanel-summary">
              {searching ? <span>{KS.searching}</span> : (
                <>
                  <span>{KS.foundFiles.replace('{n}', String(results.length))}</span>
                  {mode !== 'semantic' && <span>{KS.matchesSuffix.replace('{n}', String(totalMatches))}</span>}
                  <span>{KS.filteredFiles.replace('{n}', String(filteredFiles.length))}</span>
                </>
              )}
            </div>
          )}
          {mode === 'semantic' && query.trim() && !searching && (
            <p className="kb-searchpanel-note">{KS.semanticNote}</p>
          )}

          {!query.trim() && (
            <div className="kb-empty">
              <div className="kb-empty-ico"><IconSearch /></div>
              <p>{KS.emptyHint}</p>
              <p className="kb-empty-sub">{KS.emptySupport}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="kb-searchpanel-list">
              {results.map(result => (
                <FileResultCard key={result.fileId} result={result} onOpen={() => onOpenFile?.(result.fileId)} />
              ))}
            </div>
          )}

          {query.trim() && !searching && results.length === 0 && !error && (
            <div className="kb-empty">
              <div className="kb-empty-ico"><IconSearch /></div>
              <p>{KS.noResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* 保存查询对话框：独立 portal，避免被 .kb-content-inner 的 transform 约束 */}
      {showSaveDialog && createPortal(
        <div className="kb-modal-mask" onClick={() => setShowSaveDialog(false)}>
          <div className="kb-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="kb-section-title" style={{ margin: '0 0 12px' }}>{KS.saveDialogTitle}</div>
            <input
              className="kb-input"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveQuery() }}
              placeholder={KS.namePlaceholder}
              autoFocus
            />
            <div className="kb-faint" style={{ marginTop: 8, fontSize: 12 }}>
              {KS.contentLabel.replace('{q}', query || KS.contentEmpty)}
              {Object.keys(filters).length > 0 && KS.hasFilters}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="kb-btn" onClick={() => setShowSaveDialog(false)}>{KS.cancel}</button>
              <button
                type="button"
                className="kb-btn kb-btn-primary"
                onClick={handleSaveQuery}
                disabled={!saveName.trim()}
              >{KS.saveBtn}</button>
            </div>
          </div>
        </div>,
        getKbOverlayRoot(),
      )}
    </div>
  )
}

// ─── 子组件：单文件结果卡片 ───

const FileResultCard: React.FC<{
  result: FileResult
  onOpen: () => void
}> = ({ result, onOpen }) => {
  const { t } = useLanguage()
  const KS = t.kbSearch
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="kb-result">
      <div className="kb-result-head" onClick={onOpen}>
        <IconFileText size={14} className="kb-result-ico" />
        <span className="kb-result-name">{result.fileName}</span>
        {result.semanticScore !== undefined && (
          <span className="kb-result-badge">{KS.similarity.replace('{n}', (result.semanticScore * 100).toFixed(0))}</span>
        )}
        {result.matches.length > 0 && (
          <span className="kb-result-count">{KS.matchesCount.replace('{n}', String(result.matches.length))}</span>
        )}
        <button
          type="button"
          className="kb-result-toggle"
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          aria-label={expanded ? KS.collapse : KS.expand}
        >{expanded ? '▼' : '▶'}</button>
      </div>
      {expanded && result.matches.length > 0 && (
        <div className="kb-result-body">
          {result.matches.map((m, idx) => (
            <MatchLineView key={idx} match={m} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 子组件：单行匹配 ───

const MatchLineView: React.FC<{
  match: MatchLine
  onOpen: () => void
}> = ({ match, onOpen }) => {
  // 高亮显示匹配部分
  const before = match.text.slice(0, match.matchStart)
  const matched = match.text.slice(match.matchStart, match.matchEnd)
  const after = match.text.slice(match.matchEnd)
  return (
    <div className="kb-match" onClick={onOpen}>
      <span className="kb-match-ln">L{match.line}</span>
      <span className="kb-match-text">{before}<mark className="kb-hl">{matched}</mark>{after}</span>
    </div>
  )
}

// ─── 搜索工具函数 ───

/**
 * 在文件内容中搜索匹配行
 * @returns MatchLine[] 匹配行列表（含上下文）
 */
function searchInContent(
  content: string,
  query: string,
  mode: SearchMode,
  caseSensitive: boolean,
  /** 正则无效时的提示模板（含 {msg}）；由 UI 层按语言传入，纯函数不触达语言上下文 */
  invalidRegexTpl: string = '正则表达式无效：{msg}',
): MatchLine[] {
  if (!query.trim()) return []
  const lines = content.split('\n')
  const results: MatchLine[] = []

  let matcher: (line: string) => { start: number; end: number }[]
  try {
    if (mode === 'regex') {
      const flags = caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(query, flags)
      matcher = line => {
        const hits: { start: number; end: number }[] = []
        regex.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = regex.exec(line)) !== null) {
          if (m[0].length === 0) {
            regex.lastIndex++
            continue
          }
          hits.push({ start: m.index, end: m.index + m[0].length })
        }
        return hits
      }
    } else if (mode === 'word') {
      // 全词匹配：使用 \b 边界
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flags = caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(`\\b${escaped}\\b`, flags)
      matcher = line => {
        const hits: { start: number; end: number }[] = []
        regex.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = regex.exec(line)) !== null) {
          hits.push({ start: m.index, end: m.index + m[0].length })
        }
        return hits
      }
    } else {
      // 普通文本：indexOf 查找所有出现
      const needle = caseSensitive ? query : query.toLowerCase()
      matcher = line => {
        const hits: { start: number; end: number }[] = []
        const haystack = caseSensitive ? line : line.toLowerCase()
        let idx = 0
        while (idx <= haystack.length) {
          const found = haystack.indexOf(needle, idx)
          if (found === -1) break
          hits.push({ start: found, end: found + query.length })
          idx = found + 1
        }
        return hits
      }
    }
  } catch (err) {
    throw new Error(invalidRegexTpl.replace(String.raw`{msg}`, err instanceof Error ? err.message : String(err)))
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hits = matcher(line)
    for (const hit of hits) {
      results.push({
        line: i + 1,
        text: line,
        matchStart: hit.start,
        matchEnd: hit.end,
      })
      if (results.length >= MAX_MATCHES_PER_FILE) return results
    }
  }
  return results
}

/**
 * 提取内容中首个包含查询关键词的片段（用于语义搜索结果展示）
 */
function extractFirstSnippet(content: string, query: string): MatchLine | null {
  if (!query.trim()) return null
  const lines = content.split('\n')
  const lowerQuery = query.toLowerCase()
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase()
    const idx = lowerLine.indexOf(lowerQuery)
    if (idx !== -1) {
      return {
        line: i + 1,
        text: lines[i],
        matchStart: idx,
        matchEnd: idx + query.length,
      }
    }
  }
  // 未找到精确匹配，返回首行作为预览
  if (lines.length > 0 && lines[0].trim()) {
    return { line: 1, text: lines[0], matchStart: 0, matchEnd: 0 }
  }
  return null
}

/**
 * 判断文件是否符合筛选器条件
 */
function matchFilters(
  file: FileNode,
  filters: QueryFilters,
  getOutgoingLinks: (fileId: string) => { length: number },
  getBacklinks: (fileId: string) => { length: number },
): boolean {
  const content = file.content ?? ''

  // 包含标签（AND 或 OR 逻辑）
  if (filters.tags && filters.tags.length > 0) {
    const fileTags = extractTagsFromContent(content)
    const logic = filters.tagLogic ?? 'and'
    if (logic === 'and') {
      // AND：必须包含所有标签
      for (const t of filters.tags) {
        if (!fileTags.has(t)) return false
      }
    } else {
      // OR：至少包含一个
      const hasAny = filters.tags.some(t => fileTags.has(t))
      if (!hasAny) return false
    }
  }

  // 排除标签（NOT）
  if (filters.tagsNot && filters.tagsNot.length > 0) {
    const fileTags = extractTagsFromContent(content)
    for (const t of filters.tagsNot) {
      if (fileTags.has(t)) return false
    }
  }

  // 路径模式
  if (filters.pathPattern) {
    // 简易路径匹配：文件名包含模式（无完整路径信息时退化为名称匹配）
    if (!file.name.toLowerCase().includes(filters.pathPattern.toLowerCase())) {
      // 也检查 content 中的路径引用
      return false
    }
  }

  // 日期范围
  if (filters.dateRange) {
    if (file.updatedAt < filters.dateRange.start || file.updatedAt > filters.dateRange.end) {
      return false
    }
  }

  // 字数范围
  if (filters.wordCountRange) {
    const wordCount = countWords(content)
    if (wordCount < filters.wordCountRange.min || wordCount > filters.wordCountRange.max) {
      return false
    }
  }

  // 链接数范围
  if (filters.linkCountRange) {
    const linkCount = getOutgoingLinks(file.id).length + getBacklinks(file.id).length
    if (linkCount < filters.linkCountRange.min || linkCount > filters.linkCountRange.max) {
      return false
    }
  }

  // 是否关联画布（此处简化：检查内容中是否有画布嵌入语法 ![[...]]）
  if (filters.hasCanvas === true) {
    if (!/!\[\[.+\]\]/.test(content)) return false
  }

  return true
}

/** 从内容中提取标签（#tag 形式，支持嵌套 #a/b） */
function extractTagsFromContent(content: string): Set<string> {
  const tags = new Set<string>()
  const regex = /(?:^|\s)#([\w\u4e00-\u9fa5][\w\u4e00-\u9fa5/]*)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) {
    tags.add(m[1])
  }
  return tags
}

/** 统计字数（中文按字，英文按词） */
function countWords(content: string): number {
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(Boolean)).length
  return cn + en
}
