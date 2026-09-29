import { useCallback } from 'react'
import { FileNode } from '../../types/fileManager'

export interface GlobalSearchMatch {
  line: number
  column: number
  text: string
  highlightStart: number
  highlightEnd: number
}

export interface GlobalSearchResult {
  fileId: string
  fileName: string
  filePath: string
  updatedAt: number
  matches: GlobalSearchMatch[]
}

export interface SearchFilters {
  /** 路径过滤：只在这些文件夹 ID 内搜索（空 = 全部） */
  folderIds?: string[]
  /** 标签过滤：文件必须包含这些标签（空 = 全部） */
  tags?: string[]
  /** 时间过滤：起始时间戳（0 = 不限） */
  startTime?: number
  /** 时间过滤：结束时间戳（0 = 不限） */
  endTime?: number
}

const MAX_RESULTS_PER_FILE = 20
const MAX_TOTAL_RESULTS = 200
const MAX_FILE_SIZE_FOR_SEARCH = 500000

/* -------------------------------------------------------------------------- */
/* C1: 布尔查询（AND / OR / NOT）                                              */
/* -------------------------------------------------------------------------- */

/** 单个布尔子句：一个词项 + 是否取反。 */
export interface BooleanClause {
  term: string
  negate: boolean
}

/**
 * 解析后的布尔查询：OR 连接的若干 AND 组（析取范式）。
 * 例：`a AND b OR c` → `[[a, b], [c]]`（AND 优先级高于 OR）。
 */
export type BooleanQuery = BooleanClause[][]

/** 布尔运算符关键字（必须大写且独立成词，避免误伤正文中的 and/or）。 */
const BOOLEAN_OPERATORS = new Set(['AND', 'OR', 'NOT'])

/** 查询串是否包含布尔运算符（用于 UI 自动提示 / 自动启用）。 */
export function isBooleanQuery(query: string): boolean {
  return /(^|\s)(AND|OR|NOT)(\s|$)/.test(query)
}

/**
 * 将查询串切分为 token：支持 `"带空格的短语"` 与裸词。
 * 引号内的 AND/OR/NOT 视为普通文本。
 */
function tokenizeBooleanQuery(query: string): { value: string; quoted: boolean }[] {
  const tokens: { value: string; quoted: boolean }[] = []
  let i = 0
  while (i < query.length) {
    const ch = query[i]
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++
      continue
    }
    if (ch === '"' || ch === '\'') {
      const quote = ch
      const end = query.indexOf(quote, i + 1)
      if (end === -1) {
        // 未闭合引号：剩余内容整体作为短语
        tokens.push({ value: query.slice(i + 1), quoted: true })
        break
      }
      tokens.push({ value: query.slice(i + 1, end), quoted: true })
      i = end + 1
      continue
    }
    let end = i
    while (end < query.length && !/\s/.test(query[end])) end++
    tokens.push({ value: query.slice(i, end), quoted: false })
    i = end
  }
  return tokens.filter(t => t.value.length > 0 || t.quoted)
}

/**
 * 解析布尔查询为析取范式（OR 组的数组，组内为 AND 子句）。
 *
 * 规则：
 * - `AND` 为默认连接符，相邻词项之间省略 AND 时按 AND 处理；
 * - `AND` 优先级高于 `OR`；
 * - `NOT` 作用于其后的单个词项；
 * - 不支持括号（首批范围，后续可增强）。
 *
 * 无有效词项时返回 `null`。
 */
export function parseBooleanQuery(query: string): BooleanQuery | null {
  const tokens = tokenizeBooleanQuery(query)
  const groups: BooleanClause[][] = []
  let current: BooleanClause[] = []
  let pendingNegate = false

  for (const token of tokens) {
    if (!token.quoted && BOOLEAN_OPERATORS.has(token.value)) {
      if (token.value === 'NOT') {
        pendingNegate = true
      } else if (token.value === 'OR') {
        if (current.length > 0) groups.push(current)
        current = []
        pendingNegate = false
      }
      // AND 是默认连接符，无需额外处理
      continue
    }
    if (!token.value) continue
    current.push({ term: token.value, negate: pendingNegate })
    pendingNegate = false
  }

  if (current.length > 0) groups.push(current)
  if (groups.length === 0) return null
  return groups
}

/** 把一个布尔词项编译为正则（复用普通搜索的大小写 / 全词规则）。 */
function compileTermRegex(
  term: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean }
): RegExp | null {
  try {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped
    return new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
  } catch {
    return null
  }
}

/** 判断内容是否满足布尔查询（文档级求值）。 */
export function evaluateBooleanQuery(
  content: string,
  groups: BooleanQuery,
  regexCache: Map<string, RegExp | null>
): boolean {
  for (const group of groups) {
    let groupOk = true
    for (const clause of group) {
      const re = regexCache.get(clause.term)
      if (!re) {
        groupOk = false
        break
      }
      re.lastIndex = 0
      const hit = re.test(content)
      if (hit === clause.negate) {
        groupOk = false
        break
      }
    }
    if (groupOk) return true
  }
  return false
}

export function useGlobalSearch() {
  const search = useCallback((
    rootFolder: FileNode,
    query: string,
    options: {
      regex?: boolean
      caseSensitive?: boolean
      wholeWord?: boolean
      /** C1: 启用 AND/OR/NOT 布尔查询（与 regex 互斥，boolean 优先） */
      booleanQuery?: boolean
      filters?: SearchFilters
    } = {}
  ): GlobalSearchResult[] => {
    if (!query.trim() || !rootFolder) return []

    // P1.2: 构建标签 -> fileId Set 的过滤集（若启用了标签过滤）
    const filters = options.filters

    // P1.2: 路径过滤 —— 收集所选文件夹子树下所有文件/文件夹 ID
    let pathFilteredIds: Set<string> | null = null
    if (filters?.folderIds && filters.folderIds.length > 0) {
      pathFilteredIds = new Set<string>(filters.folderIds)
      const collectSubtree = (node: FileNode) => {
        pathFilteredIds!.add(node.id)
        if (node.children) for (const c of node.children) collectSubtree(c)
      }
      const walkCollect = (node: FileNode) => {
        if (filters!.folderIds!.includes(node.id)) {
          collectSubtree(node)
        }
        if (node.children) for (const c of node.children) walkCollect(c)
      }
      walkCollect(rootFolder)
    }

    let tagFilteredIds: Set<string> | null = null
    if (filters?.tags && filters.tags.length > 0) {
      // 提取所有文件的标签，收集命中任一过滤标签的文件 ID
      tagFilteredIds = new Set<string>()
      const walk = (node: FileNode) => {
        if (node.type === 'file' && node.content) {
          const content = node.content
          const fileTags = new Set<string>()
          // 简单提取 #tag 语法（与 tagExtractor 保持一致，首字符需为字母或中文）
          const tagRegex = /(?:^|\s)#([a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5/-]*)/g
          let m: RegExpExecArray | null
          while ((m = tagRegex.exec(content)) !== null) {
            fileTags.add(m[1])
          }
          for (const ft of fileTags) {
            if (filters.tags!.some(t => ft === t || ft.startsWith(t + '/'))) {
              tagFilteredIds!.add(node.id)
              break
            }
          }
        }
        if (node.children) for (const c of node.children) walk(c)
      }
      walk(rootFolder)
    }

    const results: GlobalSearchResult[] = []

    // C1: 布尔模式（与 regex 互斥，booleanQuery 优先）
    const booleanGroups = options.booleanQuery ? parseBooleanQuery(query) : null
    /** term -> 编译后的正则，供文档级求值复用 */
    const termRegexCache = new Map<string, RegExp | null>()
    /** 需要高亮的正向词项（NOT 词项不高亮） */
    const positiveTerms: string[] = []

    if (booleanGroups) {
      for (const group of booleanGroups) {
        for (const clause of group) {
          if (!termRegexCache.has(clause.term)) {
            termRegexCache.set(clause.term, compileTermRegex(clause.term, options))
          }
          if (!clause.negate && !positiveTerms.includes(clause.term)) {
            positiveTerms.push(clause.term)
          }
        }
      }
      // 任一词项编译失败 → 该查询无法求值
      if ([...termRegexCache.values()].some(re => re === null)) return []
    }

    let searchRegex: RegExp

    try {
      if (options.regex && !booleanGroups) {
        searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped
        searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
      }
    } catch {
      return []
    }

    /** 布尔模式下逐行收集正向词项的高亮片段。 */
    function collectBooleanMatches(lines: string[]): GlobalSearchMatch[] {
      const matches: GlobalSearchMatch[] = []
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx]
        const lineHits: GlobalSearchMatch[] = []
        for (const term of positiveTerms) {
          const base = termRegexCache.get(term)
          if (!base) continue
          const regex = new RegExp(base.source, base.flags)
          let match: RegExpExecArray | null
          while ((match = regex.exec(line)) !== null) {
            lineHits.push({
              line: idx + 1,
              column: match.index + 1,
              text: line,
              highlightStart: match.index,
              highlightEnd: match.index + match[0].length,
            })
            if (match[0].length === 0) regex.lastIndex++
          }
        }
        lineHits.sort((a, b) => a.highlightStart - b.highlightStart)
        for (const hit of lineHits) {
          matches.push(hit)
          if (matches.length >= MAX_RESULTS_PER_FILE) return matches
        }
      }
      // 纯排除查询（如 `NOT foo`）没有正向词项时，用首行占位以便文件仍可见
      if (matches.length === 0 && positiveTerms.length === 0) {
        const firstLineIdx = lines.findIndex(l => l.trim().length > 0)
        const idx = firstLineIdx === -1 ? 0 : firstLineIdx
        matches.push({
          line: idx + 1,
          column: 1,
          text: lines[idx] ?? '',
          highlightStart: 0,
          highlightEnd: 0,
        })
      }
      return matches
    }

    let totalMatches = 0

    function searchNode(node: FileNode, path: string = '') {
      if (totalMatches >= MAX_TOTAL_RESULTS) return

      if (node.type === 'file' && node.content) {
        // P1.2: 路径过滤
        if (pathFilteredIds && !pathFilteredIds.has(node.id)) return

        if (node.content.length > MAX_FILE_SIZE_FOR_SEARCH) return

        // P1.2: 时间过滤
        if (filters?.startTime && node.updatedAt < filters.startTime) return
        if (filters?.endTime && node.updatedAt > filters.endTime) return

        // P1.2: 标签过滤
        if (tagFilteredIds && !tagFilteredIds.has(node.id)) return

        const lines = node.content.split('\n')
        let matches: GlobalSearchMatch[] = []

        if (booleanGroups) {
          // C1: 文档级布尔求值决定文件是否命中，命中后再逐行高亮正向词项
          if (!evaluateBooleanQuery(node.content, booleanGroups, termRegexCache)) return
          matches = collectBooleanMatches(lines)
        } else {
          for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx]
            let match
            const regex = new RegExp(searchRegex.source, searchRegex.flags)
            while ((match = regex.exec(line)) !== null) {
              matches.push({
                line: idx + 1,
                column: match.index + 1,
                text: line,
                highlightStart: match.index,
                highlightEnd: match.index + match[0].length,
              })
              if (matches.length >= MAX_RESULTS_PER_FILE) break
            }
            if (matches.length >= MAX_RESULTS_PER_FILE) break
          }
        }

        if (matches.length > 0) {
          const filePath = path ? `${path} / ${node.name}` : node.name
          results.push({
            fileId: node.id,
            fileName: node.name,
            filePath,
            updatedAt: node.updatedAt,
            matches,
          })
          totalMatches += matches.length
        }
      }

      if (node.children) {
        const childPath = node.id === 'root' ? '' : (path ? `${path} / ${node.name}` : node.name)
        for (const child of node.children) {
          searchNode(child, childPath)
        }
      }
    }

    searchNode(rootFolder)
    results.sort((a, b) => b.matches.length - a.matches.length)
    return results
  }, [])

  /** P1.2: 全局替换 —— 在指定文件集合中执行替换，返回被修改的文件 ID 及新内容 */
  const replaceAll = useCallback((
    rootFolder: FileNode,
    query: string,
    replacement: string,
    options: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean; filters?: SearchFilters } = {}
  ): { fileId: string; newContent: string; matchCount: number }[] => {
    if (!query.trim() || !rootFolder) return []

    let searchRegex: RegExp
    try {
      if (options.regex) {
        searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped
        searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
      }
    } catch {
      return []
    }

    const filters = options.filters
    const modified: { fileId: string; newContent: string; matchCount: number }[] = []

    function walk(node: FileNode) {
      if (node.type === 'file' && node.content) {
        if (node.content.length > MAX_FILE_SIZE_FOR_SEARCH) return
        if (filters?.startTime && node.updatedAt < filters.startTime) return
        if (filters?.endTime && node.updatedAt > filters.endTime) return

        const content = node.content
        const matches = content.match(new RegExp(searchRegex.source, searchRegex.flags))
        if (matches && matches.length > 0) {
          const newContent = content.replace(new RegExp(searchRegex.source, searchRegex.flags), replacement)
          if (newContent !== content) {
            modified.push({ fileId: node.id, newContent, matchCount: matches.length })
          }
        }
      }
      if (node.children) for (const c of node.children) walk(c)
    }

    walk(rootFolder)
    return modified
  }, [])

  /** P1.2: 单条替换 —— 在指定文件的指定位置替换匹配文本，返回新内容（由调用方调用 updateFileContent） */
  const replaceOne = useCallback((
    rootFolder: FileNode,
    fileId: string,
    match: GlobalSearchMatch,
    replacement: string
  ): { fileId: string; newContent: string } | null => {
    const file = findFileNode(rootFolder, fileId)
    if (!file || file.content === undefined || file.content === null) return null

    const lines = file.content.split('\n')
    const lineIdx = match.line - 1
    if (lineIdx < 0 || lineIdx >= lines.length) return null

    const line = lines[lineIdx]
    // 使用记录的 highlight 位置做精确位置替换
    const start = Math.max(0, Math.min(match.highlightStart, line.length))
    const end = Math.max(start, Math.min(match.highlightEnd, line.length))
    const newLine = line.substring(0, start) + replacement + line.substring(end)
    lines[lineIdx] = newLine
    const newContent = lines.join('\n')
    return { fileId, newContent }
  }, [])

  /** P1.2: 仅替换当前文件 —— 在指定文件中替换所有匹配，返回新内容（由调用方调用 updateFileContent） */
  const replaceAllInFile = useCallback((
    rootFolder: FileNode,
    fileId: string,
    query: string,
    replacement: string,
    options: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean } = {}
  ): { fileId: string; newContent: string; matchCount: number } | null => {
    if (!query.trim() || !rootFolder) return null

    const file = findFileNode(rootFolder, fileId)
    if (!file || file.content === undefined || file.content === null) return null
    if (file.content.length > MAX_FILE_SIZE_FOR_SEARCH) return null

    let searchRegex: RegExp
    try {
      if (options.regex) {
        searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped
        searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
      }
    } catch {
      return null
    }

    const content = file.content
    const matches = content.match(new RegExp(searchRegex.source, searchRegex.flags))
    if (!matches || matches.length === 0) return null

    const newContent = content.replace(new RegExp(searchRegex.source, searchRegex.flags), replacement)
    if (newContent === content) return null

    return { fileId, newContent, matchCount: matches.length }
  }, [])

  return { search, replaceAll, replaceOne, replaceAllInFile }
}

/** 在文件树中递归查找指定 ID 的文件节点 */
function findFileNode(node: FileNode, fileId: string): FileNode | null {
  if (node.id === fileId) return node
  if (node.children) {
    for (const c of node.children) {
      const found = findFileNode(c, fileId)
      if (found) return found
    }
  }
  return null
}
