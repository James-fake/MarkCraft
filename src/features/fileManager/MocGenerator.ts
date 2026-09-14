import { LinkRecord } from '../../stores/LinkIndexStore'

export type MocTemplate = 'simple' | 'summary' | 'hierarchical'

export interface MocOptions {
  /** Tag-based MOC: generate from a tag path */
  tagPath?: string
  /** Link-based MOC: generate from a center file */
  centerFileId?: string
  /** Template style */
  template: MocTemplate
}

/** P1.4: MOC front matter 字段 */
export interface MocFrontMatter {
  type?: string
  autoUpdate?: boolean
  source?: 'tag' | 'backlink'
  target?: string
  template?: MocTemplate
  lastUpdated?: string
}

/**
 * Generate a MOC (Map of Content) page content.
 * This is a pure function that takes data and returns markdown string.
 */
export function generateMocContent(options: MocOptions & {
  /** Get file content by fileId */
  getFileContent: (fileId: string) => string | null
  /** Get file name by fileId */
  getFileName: (fileId: string) => string
  /** Get files by tag path */
  getFilesByTag: (tagPath: string) => string[]
  /** Get backlinks for a file */
  getBacklinks: (fileId: string) => LinkRecord[]
  /** Get outgoing links for a file */
  getOutgoingLinks: (fileId: string) => LinkRecord[]
  /** Get headings for a file */
  getFileHeadings: (fileId: string) => string[]
}): string {
  const { template, getFileContent, getFileName, getFilesByTag, getBacklinks, getFileHeadings } = options

  // Collect file IDs based on mode
  let fileIds: string[] = []
  let mocTitle = ''
  let mocSource: 'tag' | 'backlink' = 'tag'

  if (options.tagPath) {
    mocTitle = `MOC: ${options.tagPath}`
    fileIds = getFilesByTag(options.tagPath)
    mocSource = 'tag'
  } else if (options.centerFileId) {
    mocTitle = `MOC: ${getFileName(options.centerFileId).replace(/\.md$/, '')}`
    // Collect center file + all backlinks + all outgoing link targets
    const backlinkFiles = getBacklinks(options.centerFileId).map(bl => bl.sourceFileId)
    fileIds = [options.centerFileId, ...backlinkFiles]
    // Deduplicate
    fileIds = [...new Set(fileIds)]
    mocSource = 'backlink'
  }

  if (fileIds.length === 0) return ''

  const body = template === 'simple'
    ? generateSimpleMoc(mocTitle, fileIds, getFileName)
    : template === 'summary'
    ? generateSummaryMoc(mocTitle, fileIds, getFileName, getFileContent)
    : generateHierarchicalMoc(mocTitle, fileIds, getFileName, getFileContent, getFileHeadings)

  // P1.4: 生成带 front matter 的完整 MOC
  return wrapMocWithFrontMatter(body, {
    type: 'moc',
    autoUpdate: true,
    source: mocSource,
    target: options.tagPath || options.centerFileId || '',
    template,
    lastUpdated: new Date().toISOString().slice(0, 10),
  })
}

function stripMdExtension(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/** P1.4: 解析 front matter（兼容 CRLF 和 LF 行结尾） */
export function parseFrontMatter(content: string): { data: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { data: {}, body: content }
  const yamlBlock = match[1]
  const body = match[2]
  const data: Record<string, any> = {}
  for (const line of yamlBlock.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) {
      let value: any = m[2].trim()
      if (value === 'true') value = true
      else if (value === 'false') value = false
      data[m[1]] = value
    }
  }
  return { data, body }
}

/** P1.4: 生成 front matter，并用 <!-- auto --> 标记包裹 body（使新建 MOC 立即可被自动更新） */
function wrapMocWithFrontMatter(body: string, fm: MocFrontMatter): string {
  const lines: string[] = ['---']
  lines.push(`type: ${fm.type || 'moc'}`)
  lines.push(`autoUpdate: ${fm.autoUpdate ?? true}`)
  lines.push(`source: ${fm.source || 'tag'}`)
  lines.push(`target: ${fm.target || ''}`)
  lines.push(`template: ${fm.template || 'summary'}`)
  lines.push(`lastUpdated: ${fm.lastUpdated || new Date().toISOString().slice(0, 10)}`)
  lines.push('---', '')
  // 用 auto 区间标记包裹自动生成的内容，使 updateAutoMoc 能正确识别并更新
  return lines.join('\n') + '<!-- auto -->\n' + body + '\n<!-- /auto -->\n'
}

/** P1.4: 检查是否为自动更新 MOC */
export function isAutoMoc(content: string): boolean {
  const { data } = parseFrontMatter(content)
  return data.type === 'moc' && data.autoUpdate === true
}

/** P1.4: 解析 MOC front matter */
export function parseMocFrontMatter(content: string): MocFrontMatter | null {
  const { data } = parseFrontMatter(content)
  if (data.type !== 'moc') return null
  return {
    type: data.type,
    autoUpdate: data.autoUpdate,
    source: data.source,
    target: data.target,
    template: data.template,
    lastUpdated: data.lastUpdated,
  }
}

/**
 * P1.4: 自动更新 MOC 内容
 * 保留用户手动添加的内容（在 <!-- /auto --> 之后的部分），重新生成自动区间。
 */
export function updateAutoMoc(
  currentContent: string,
  newAutoContent: string
): string {
  const { data, body } = parseFrontMatter(currentContent)

  // 提取手动内容（<!-- /auto --> 之后的部分，兼容 CRLF）
  const manualMatch = body.match(/<!-- \/auto -->\r?\n?([\s\S]*)$/)
  const manualContent = manualMatch ? manualMatch[1].trim() : ''

  // 更新 lastUpdated
  data.lastUpdated = new Date().toISOString().slice(0, 10)

  // 重建 front matter
  const fmLines: string[] = ['---']
  for (const [key, value] of Object.entries(data)) {
    fmLines.push(`${key}: ${value}`)
  }
  fmLines.push('---', '')

  const result = fmLines.join('\n') +
    '<!-- auto -->\n' +
    newAutoContent +
    '\n<!-- /auto -->\n' +
    (manualContent ? '\n' + manualContent : '')

  return result
}

/** P1.4: 检查内容是否已有 auto 区间标记 */
export function hasAutoSection(content: string): boolean {
  return content.includes('<!-- auto -->') && content.includes('<!-- /auto -->')
}

/** P1.4: 改进的语义摘要提取（150字符） */
function extractSummary(content: string): string {
  const { body } = parseFrontMatter(content)
  const lines = body.split('\n')

  // 1. 优先提取 description front matter
  const descMatch = content.match(/^description:\s*(.+)$/m)
  if (descMatch) {
    return cleanSummary(descMatch[1], 150)
  }

  // 2. 提取首段（非标题、非 front matter、非空行）
  const firstParagraph: string[] = []
  let inParagraph = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('<!--')) {
      if (inParagraph && firstParagraph.length > 0) break
      continue
    }
    if (trimmed.startsWith('#')) {
      if (inParagraph && firstParagraph.length > 0) break
      continue
    }
    if (trimmed.startsWith('![[')) {
      if (inParagraph && firstParagraph.length > 0) break
      continue
    }
    inParagraph = true
    firstParagraph.push(trimmed)
  }
  if (firstParagraph.length > 0) {
    return cleanSummary(firstParagraph.join(' '), 150)
  }

  // 3. 提取首个列表项
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return cleanSummary(trimmed.slice(2), 150)
    }
  }

  // 4. Fallback: 首行
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return cleanSummary(trimmed, 150)
    }
  }
  return ''
}

/** 清理 markdown 语法，保留可读性 */
function cleanSummary(text: string, maxLength: number): string {
  const clean = text
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > maxLength ? clean.slice(0, maxLength) + '...' : clean
}

/** Simple template: just a list of links */
function generateSimpleMoc(title: string, fileIds: string[], getFileName: (id: string) => string): string {
  const lines: string[] = [`# ${title}`, '']
  for (const fileId of fileIds) {
    const name = stripMdExtension(getFileName(fileId))
    lines.push(`- [[${name}]]`)
  }
  lines.push('')
  return lines.join('\n')
}

/** Summary template: links with semantic summaries */
function generateSummaryMoc(
  title: string, fileIds: string[],
  getFileName: (id: string) => string,
  getFileContent: (id: string) => string | null
): string {
  const lines: string[] = [`# ${title}`, '', '## 概述', '', `共 ${fileIds.length} 篇关联笔记`, '', '## 关联笔记', '']
  for (const fileId of fileIds) {
    const name = stripMdExtension(getFileName(fileId))
    const content = getFileContent(fileId) || ''
    const summary = extractSummary(content)
    if (summary) {
      lines.push(`- [[${name}]] — ${summary}`)
    } else {
      lines.push(`- [[${name}]]`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/** Hierarchical template: grouped by first heading level */
function generateHierarchicalMoc(
  title: string, fileIds: string[],
  getFileName: (id: string) => string,
  getFileContent: (id: string) => string | null,
  getFileHeadings: (id: string) => string[]
): string {
  const lines: string[] = [`# ${title}`, '', '## 概述', '', `共 ${fileIds.length} 篇关联笔记`, '']

  // Group files by their first heading (or "未分类" if none)
  const groups = new Map<string, { fileId: string; name: string; summary: string }[]>()
  for (const fileId of fileIds) {
    const name = stripMdExtension(getFileName(fileId))
    const content = getFileContent(fileId) || ''
    const headings = getFileHeadings(fileId)
    const firstHeading = headings.length > 0 ? headings[0] : '未分类'
    const summary = extractSummary(content)

    if (!groups.has(firstHeading)) {
      groups.set(firstHeading, [])
    }
    groups.get(firstHeading)!.push({ fileId, name, summary })
  }

  for (const [heading, files] of groups) {
    lines.push(`## ${heading}`, '')
    for (const file of files) {
      if (file.summary) {
        lines.push(`- [[${file.name}]] — ${file.summary}`)
      } else {
        lines.push(`- [[${file.name}]]`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * P1.4: 生成反向 MOC（基于出链而非反链）
 * 收集文件的所有出链目标，按目标分组，生成"我引用了什么"的索引。
 */
export function generateReverseMoc(
  centerFileId: string,
  getFileName: (id: string) => string,
  getOutgoingLinks: (id: string) => LinkRecord[],
  getFileContent: (id: string) => string | null
): string {
  const fileName = stripMdExtension(getFileName(centerFileId))
  const title = `反向 MOC: ${fileName}`

  const outgoing = getOutgoingLinks(centerFileId)
  if (outgoing.length === 0) return ''

  // 按出链目标分组
  const grouped = new Map<string, { target: string; count: number }>()
  for (const link of outgoing) {
    const key = link.target
    const existing = grouped.get(key)
    if (existing) {
      existing.count++
    } else {
      grouped.set(key, { target: link.target, count: 1 })
    }
  }

  const lines: string[] = [
    `# ${title}`, '',
    '## 概述', '',
    `${fileName} 引用了 ${grouped.size} 个不同目标，共 ${outgoing.length} 次引用`,
    '',
    '## 引用目标', '',
  ]

  for (const [, { target, count }] of grouped) {
    const targetContent = getFileContent(target) || ''
    const summary = extractSummary(targetContent)
    lines.push(`- [[${target}]]${count > 1 ? ` (×${count})` : ''}${summary ? ` — ${summary}` : ''}`)
  }
  lines.push('')

  return lines.join('\n')
}
