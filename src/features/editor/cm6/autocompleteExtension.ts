import { CompletionContext, autocompletion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { getAllEmojis } from '@utils/emojiData'
import type { FileNode } from '@src/types/fileManager'
import {
  buildFootnoteAppendix,
  buildMaterialCitation,
  collectBlockCandidates,
  filterBlockCandidates,
  type BlockCandidate,
} from '@services/clipMaterial'
import { extractHeadings, stripMdExtension } from '@stores/linkIndexShared'
import { rankFileMatches } from '@core/files/fileMatch'
import { getRecentFiles } from '@core/files/recentFiles'
import { extractFootnotes } from '../footnote'

/** 自动补全下拉项 + 源码模式格式化占位文案（可被调用方以目标语言覆盖） */
export interface AutocompleteMessages {
  /** 文件路径补全项的说明 */
  filePathDetail: string
  /** 素材块补全项前缀模板（{title} = 来源标题 / URL / 文件名） */
  materialPrefix: string
  /** 加粗无选区时的插入占位 */
  boldPlaceholder: string
  /** 斜体无选区时的插入占位 */
  italicPlaceholder: string
  /** 删除线无选区时的插入占位 */
  strikePlaceholder: string
  /** 行内代码无选区时的插入占位 */
  codePlaceholder: string
  /** 链接无选区时的文字占位 */
  linkTextPlaceholder: string
  /** 行内公式无选区时的插入占位 */
  mathPlaceholder: string
  /** 标题无选区时的插入占位 */
  headingPlaceholder: string
}

export const DEFAULT_AUTOCOMPLETE_MESSAGES: AutocompleteMessages = {
  filePathDetail: '文件路径',
  materialPrefix: '素材 · {title}',
  boldPlaceholder: '粗体',
  italicPlaceholder: '斜体',
  strikePlaceholder: '删除线',
  codePlaceholder: '代码',
  linkTextPlaceholder: '链接文字',
  mathPlaceholder: '公式',
  headingPlaceholder: '标题',
}

let _acMessages: AutocompleteMessages = DEFAULT_AUTOCOMPLETE_MESSAGES

function insertAndSelect(view: EditorView, insertText: string, from: number, to: number, cursorOffset?: number): boolean {
  const offset = cursorOffset ?? insertText.length
  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: EditorSelection.cursor(from + offset),
  })
  return true
}

function lineStartAtPos(doc: string, pos: number): number {
  const lineStart = doc.lastIndexOf('\n', pos - 1) + 1
  return lineStart
}

function currentLineText(doc: string, pos: number): string {
  const start = lineStartAtPos(doc, pos)
  const end = doc.indexOf('\n', pos)
  return doc.substring(start, end === -1 ? doc.length : end)
}

// Emoji 自动补全（:emoji_name 语法）
function emojiCompletions(context: CompletionContext) {
  const match = context.matchBefore(/:[\w+-]+/)
  if (!match) return null
  const query = match.text.slice(1).toLowerCase()
  const allEmojis = getAllEmojis()
  const options = allEmojis
    .filter(e => e.name.toLowerCase().includes(query) || e.keywords.toLowerCase().includes(query))
    .slice(0, 20)
    .map(e => ({ label: `:${e.name}:`, type: 'text' as const, detail: e.keywords, apply: e.emoji }))
  if (options.length === 0) return null
  return { from: match.from, options }
}

// 标题补全 — 输入 ## 后提示文档中的标题
function headingCompletions(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos)
  const lineText = line.text
  if (!lineText.startsWith('#')) return null

  const match = context.matchBefore(/##\s*\w*/)
  if (!match) return null

  // Scan document for headings
  const headings: { text: string; level: number }[] = []
  for (let i = 1; i <= context.state.doc.lines; i++) {
    const l = context.state.doc.line(i)
    const hMatch = l.text.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      headings.push({ text: hMatch[2], level: hMatch[1].length })
    }
  }

  const query = match.text.replace(/^##\s*/, '').toLowerCase()
  const options = headings
    .filter(h => h.text.toLowerCase().includes(query))
    .slice(0, 10)
    .map(h => ({ label: h.text, type: 'text' as const, detail: `H${h.level}` }))

  if (options.length === 0) return null

  const from = match.from + (match.text.startsWith('## ') ? 3 : 2)
  return { from, options }
}

// 代码块语言补全 — 输入 ``` 后提示语言
const LANGUAGES_LIST = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'scss', 'json', 'yaml', 'xml',
  'bash', 'powershell', 'dockerfile', 'markdown', 'latex', 'r', 'matlab', 'scala', 'lua', 'perl',
  'vue', 'jsx', 'tsx', 'shell', 'makefile', 'toml', 'ini', 'diff', 'plaintext',
]

function languageCompletions(context: CompletionContext) {
  const match = context.matchBefore(/```\w*/)
  if (!match) return null

  const query = match.text.slice(3).toLowerCase()
  const options = LANGUAGES_LIST
    .filter(l => l.startsWith(query))
    .map(l => ({ label: l, type: 'keyword' as const }))

  if (options.length === 0) return null

  return { from: match.from + 3, options }
}

/** 补全候选：文件 + 它所在的目录（目录既用于排序「同目录优先」，也用于列表展示） */
interface FileCandidate {
  id: string
  name: string
  dir: string
  updatedAt: number
}

/** 从 localStorage 的文件树展平成**带目录路径**的候选（补全排序与展示用） */
function getFileCandidatesFromStorage(): FileCandidate[] {
  try {
    const saved = localStorage.getItem('markcraft-file-manager')
    if (!saved) return []
    const parsed = JSON.parse(saved) as { rootFolder: FileNode }
    if (!parsed?.rootFolder) return []
    const out: FileCandidate[] = []
    const walk = (node: FileNode, dir: string) => {
      if (node.type === 'file') {
        out.push({ id: node.id, name: node.name, dir, updatedAt: node.updatedAt ?? 0 })
        return
      }
      const childDir = dir ? `${dir}/${node.name}` : node.name
      node.children?.forEach((c) => walk(c, childDir))
    }
    parsed.rootFolder.children?.forEach((c) => walk(c, ''))
    return out
  } catch {
    return []
  }
}

// 从 localStorage 读取文件树中的所有文件名
function getFileNamesFromStorage(): string[] {
  return getFileCandidatesFromStorage().map((c) => c.name)
}

/**
 * 按笔记名找文件内容（与 `getFileNamesFromStorage` 同源：localStorage 的文件树）。
 *
 * 匹配顺序：精确（去 .md） → 前缀 → 子串，取第一个命中 —— 用户在 `[[` 后面
 * 可能写全名也可能只写前几个字，`#` 之前的部分必须能落到**唯一**一篇笔记上。
 * 找不到返回 null（此时不弹补全，用户继续打字即可）。
 */
function findFileContentByName(query: string): string | null {
  // 查询侧也要去 .md —— 用户可能写 `[[笔记.md#`，而文件树里的名字是 `笔记.md`
  const q = stripMdExtension(query.trim()).toLowerCase()
  if (!q) return null
  try {
    const saved = localStorage.getItem('markcraft-file-manager')
    if (!saved) return null
    const parsed = JSON.parse(saved) as { rootFolder: FileNode }
    if (!parsed?.rootFolder) return null

    const files: FileNode[] = []
    const collect = (node: FileNode) => {
      if (node.type === 'file') files.push(node)
      node.children?.forEach(collect)
    }
    collect(parsed.rootFolder)

    const strip = (n: string) => stripMdExtension(n).toLowerCase()
    const hit =
      files.find(f => strip(f.name) === q) ??
      files.find(f => strip(f.name).startsWith(q)) ??
      files.find(f => strip(f.name).includes(q))
    return hit ? hit.content ?? '' : null
  } catch {
    return null
  }
}

/**
 * WikiLink 补全 —— `[[` 后补**文件名**；`[[文件名#` 后补**该文件的章节标题**。
 *
 * ⚠️ 2026-10-11 对齐两种模式：所见即所得（`WikiLinkAutocomplete`）早已支持
 *    `#` 章节 / `|` 别名 / 日期建议，而源码模式**只补文件名** ——
 *    写 `[[笔记#章节]]` 时章节名只能手打（还容易打错）。这里先把 `#` 补齐。
 */
export function wikiLinkCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\[\[([^\]]*)/)
  if (!match) return null
  // 确保是以 [[ 开头（而非已经有 ]] 闭合的）
  const fullText = context.state.doc.toString()
  const afterMatch = fullText.slice(match.from, context.pos)
  if (afterMatch.includes(']]')) return null

  const raw = match.text.slice(2) // `[[` 之后到光标

  // ① 章节模式：[[文件名# → 列出该文件的标题
  const hashIdx = raw.indexOf('#')
  if (hashIdx !== -1) {
    const nameQuery = raw.slice(0, hashIdx)
    const headingQuery = raw.slice(hashIdx + 1).toLowerCase()
    const content = findFileContentByName(nameQuery)
    if (content === null) return null

    const base = stripMdExtension(nameQuery.trim())
    const headings = extractHeadings(content)
      .filter(h => !headingQuery || h.toLowerCase().includes(headingQuery))
      .slice(0, 20)
    if (headings.length === 0) return null

    return {
      // from 设为整个 `[[...` 的起点：apply 给出的是完整 `[[文件名#标题]]`
      from: match.from,
      options: headings.map(h => ({
        label: h,
        type: 'text' as const,
        detail: 'Heading',
        apply: `[[${base}#${h}]]`,
      })),
    }
  }

  // ② 文件名模式：与所见即所得共用同一份匹配与排序（@core/files/fileMatch），
  //    不再按遍历顺序返回 —— 输入完整文件名时应排第一。
  const ranked = rankFileMatches(raw, getFileCandidatesFromStorage(), {
    recentFileIds: getRecentFiles().map((r) => r.fileId),
  })
  const options = ranked.slice(0, 20).map((c) => {
    const base = stripMdExtension(c.name)
    return {
      label: base,
      type: 'text' as const,
      // 列表里显示所在文件夹：同名笔记能分辨是哪个（2026-10-11 优化）
      detail: c.dir || 'WikiLink',
      apply: `[[${base}]]`,
    }
  })

  if (options.length === 0) return null
  return { from: match.from, options }
}

// P0-2 块/素材引用补全 — 输入 (( 后检索全库块，素材块优先并自动带出来源
function getRootFolderFromStorage(): FileNode | null {
  try {
    const saved = localStorage.getItem('markcraft-file-manager')
    if (!saved) return null
    const parsed = JSON.parse(saved) as { rootFolder?: FileNode }
    return parsed.rootFolder ?? null
  } catch {
    return null
  }
}

// 候选缓存：避免每次按键都全量重扫文件树
let _blockCandidateCache: { at: number; list: BlockCandidate[] } | null = null
const BLOCK_CANDIDATE_TTL = 2000

function getBlockCandidates(): BlockCandidate[] {
  const now = Date.now()
  if (_blockCandidateCache && now - _blockCandidateCache.at < BLOCK_CANDIDATE_TTL) {
    return _blockCandidateCache.list
  }
  const list = collectBlockCandidates(getRootFolderFromStorage() as never)
  _blockCandidateCache = { at: now, list }
  return list
}

/** 供外部在文件树变更后主动失效候选缓存 */
export function invalidateBlockCandidateCache(): void {
  _blockCandidateCache = null
}

function blockRefCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\(\(([^)\n]*)/)
  if (!match) return null
  // 已闭合的 (( ... )) 不再触发
  if (context.state.sliceDoc(match.from, context.pos).includes('))')) return null

  const query = match.text.slice(2)
  const candidates = filterBlockCandidates(getBlockCandidates(), query, 20)
  if (candidates.length === 0) return null

  return {
    from: match.from,
    options: candidates.map(c => ({
      label: c.text.slice(0, 48) || `^${c.blockId}`,
      type: 'text' as const,
      detail: c.isMaterial ? _acMessages.materialPrefix.replace('{title}', c.sourceTitle || c.sourceUrl || c.fileName) : c.fileName,
      apply: (view: EditorView, _completion: unknown, from: number, to: number) => {
        const citation = buildMaterialCitation({
          blockId: c.blockId,
          // 素材块默认插入「引用 + 来源脚注」，普通块只插入块引用
          mode: c.isMaterial ? 'footnote' : 'reference',
          text: `((${c.blockId}))`,
          source: c.sourceUrl
            ? { url: c.sourceUrl, title: c.sourceTitle || '', clippedAt: '' }
            : null,
        })

        const changes: { from: number; to?: number; insert: string }[] = [
          { from, to, insert: citation.inline },
        ]
        if (citation.footnoteDef) {
          const docText = view.state.doc.toString()
          const appendix = buildFootnoteAppendix(docText, citation.footnoteDef)
          if (appendix) changes.push({ from: view.state.doc.length, insert: appendix })
        }

        view.dispatch({
          changes,
          selection: EditorSelection.cursor(from + citation.inline.length),
        })
      },
    })),
  }
}

// 文件路径补全 — 输入 ./ 后提示文件路径（用于 markdown 链接/图片）
function filePathCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\.\//)
  if (!match) return null

  const fileNames = getFileNamesFromStorage()
  const options = fileNames
    .slice(0, 20)
    .map(name => ({
      label: name,
      type: 'text' as const,
      detail: _acMessages.filePathDetail,
      apply: `./${name}`,
    }))

  if (options.length === 0) return null
  return { from: match.from, options }
}

// 脚注 id 补全 — 输入 [^ 后列出全文已有脚注 id（带定义预览），一键复用已引来源
export function footnoteIdCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\[\^([^\]]*)/)
  if (!match) return null
  // 已闭合的 [^...] 不再触发
  if (context.state.sliceDoc(match.from, context.pos).includes(']')) return null

  const query = match.text.slice(2).toLowerCase()
  const footnotes = extractFootnotes(context.state.doc.toString())
  if (footnotes.length === 0) return null

  const options = footnotes
    .filter((f) => f.id.toLowerCase().includes(query))
    .map((f) => ({
      label: `[^${f.id}]`,
      type: 'text' as const,
      detail: f.fullContent.slice(0, 60),
      apply: (view: EditorView, _completion: unknown, from: number, to: number) => {
        view.dispatch({
          changes: { from, to, insert: `[^${f.id}]` },
          selection: EditorSelection.cursor(from + f.id.length + 3),
        })
      },
    }))
  if (options.length === 0) return null
  return { from: match.from, options }
}

// Markdown 快捷命令补全已移除（2026-08-28 触发收敛：Slash/斜杠命令类隐藏触发一律删除，
// 功能统一由工具栏与更多菜单提供；内容类补全 emoji/标题/语言/wikiLink/块引用/路径/脚注 保留）

// 自动补全扩展
export function createAutocompleteExtension(messages: AutocompleteMessages = DEFAULT_AUTOCOMPLETE_MESSAGES) {
  _acMessages = messages
  return autocompletion({
    override: [emojiCompletions, headingCompletions, languageCompletions, wikiLinkCompletions, blockRefCompletions, filePathCompletions, footnoteIdCompletions],
    activateOnTyping: true,
    icons: false,
  })
}

// 格式化操作（供 MarkdownToolbar 使用）
export function cm6FormatBold(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
    const text = selected.slice(2, -2)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `**${selected || _acMessages.boldPlaceholder}**`, from, to, selected ? from + selected.length + 4 : from + 2)
}

export function cm6FormatItalic(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('*') && selected.endsWith('*') && selected.length > 2 && !selected.startsWith('**')) {
    const text = selected.slice(1, -1)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `*${selected || _acMessages.italicPlaceholder}*`, from, to, selected ? from + selected.length + 2 : from + 1)
}

export function cm6FormatStrike(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length > 4) {
    const text = selected.slice(2, -2)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `~~${selected || _acMessages.strikePlaceholder}~~`, from, to, selected ? from + selected.length + 4 : from + 2)
}

export function cm6FormatInlineCode(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('`') && selected.endsWith('`') && selected.length > 2) {
    const text = selected.slice(1, -1)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `\`${selected || _acMessages.codePlaceholder}\``, from, to, selected ? from + selected.length + 2 : from + 1)
}

export function cm6InsertLink(view: EditorView, url = ''): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const text = selected || _acMessages.linkTextPlaceholder
  const href = url || 'https://'
  // 插入 [text](href)，光标停在文字末尾
  return insertAndSelect(view, `[${text}](${href})`, from, to, from + 1 + text.length)
}

export function cm6FormatCodeBlock(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  return insertAndSelect(view, `\`\`\`\n${selected}\n\`\`\`\n`, from, to, from + 4)
}

export function cm6FormatInlineMath(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  return insertAndSelect(view, `$${selected || _acMessages.mathPlaceholder}$`, from, to, selected ? from + selected.length + 2 : from + 1)
}

export function cm6FormatBlockMath(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  return insertAndSelect(view, `$$\n${selected}\n$$\n`, from, to, from + 3)
}

export function cm6FormatHeading(view: EditorView, level: number): boolean {
  const { from, to } = view.state.selection.main
  const lineStart = lineStartAtPos(view.state.doc.toString(), from)
  const lineText = currentLineText(view.state.doc.toString(), from)
  const prefix = '#'.repeat(level) + ' '

  // 移除已有标题前缀
  const existingMatch = lineText.match(/^#{1,6}\s/)
  let content: string
  let start: number
  if (existingMatch && from >= lineStart && from <= lineStart + existingMatch[0].length) {
    // 光标在标题标记内，替换整个前缀
    content = lineText.replace(/^#{1,6}\s/, '')
    start = lineStart
    const end = lineStart + lineText.length
    return insertAndSelect(view, prefix + content, start, end, prefix.length + content.length)
  }

  content = view.state.sliceDoc(from, to) || _acMessages.headingPlaceholder
  return insertAndSelect(view, `${prefix}${content}`, from, to, prefix.length + content.length)
}

export function cm6InsertFootnote(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  // 生成唯一脚注 ID
  const existingFootnotes = doc.match(/\[\^\d+\]/g) || []
  let maxNum = 0
  for (const f of existingFootnotes) {
    const num = parseInt(f.match(/\d+/)?.[0] || '0')
    if (num > maxNum) maxNum = num
  }
  const footnoteId = maxNum + 1
  const insertText = `[^${footnoteId}]`
  // 在文档末尾添加脚注定义
  const footDef = `\n\n[^${footnoteId}]: `
  view.dispatch({
    changes: [
      { from, to, insert: insertText },
      { from: view.state.doc.length, insert: footDef },
    ],
    selection: EditorSelection.cursor(from + insertText.length),
  })
  return true
}

export function cm6InsertImage(view: EditorView, imageUrl: string, altText: string): boolean {
  const { from, to } = view.state.selection.main
  const insertText = `![${altText}](${imageUrl})`
  return insertAndSelect(view, insertText, from, to, insertText.length)
}

export function cm6InsertMathTemplate(view: EditorView, latex: string, mode: 'inline' | 'block'): boolean {
  const { from, to } = view.state.selection.main
  const insertText = mode === 'inline' ? `$${latex}$` : `$$\n${latex}\n$$`
  const cursorOffset = mode === 'inline' ? insertText.length : 3
  return insertAndSelect(view, insertText, from, to, cursorOffset)
}

export function cm6InsertMermaidBlock(view: EditorView, code: string): boolean {
  const { from, to } = view.state.selection.main
  const insertText = `\n\`\`\`mermaid\n${code}\n\`\`\`\n`
  return insertAndSelect(view, insertText, from, to, insertText.length)
}

/**
 * 源码模式：在光标处插入任意模板文本（知识链接 6 命令共用）。
 * 文本内容统一来自 toolbar/groups/linkTemplates.ts 纯函数，与 WYSIWYG 一致。
 */
export function cm6InsertTemplate(view: EditorView, text: string): boolean {
  const { from, to } = view.state.selection.main
  return insertAndSelect(view, text, from, to, from + text.length)
}
