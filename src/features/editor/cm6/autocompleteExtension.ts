import { CompletionContext, autocompletion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { getAllEmojis } from '../../shared/utils/emojiData'
import type { FileNode } from '@src/types/fileManager'
import {
  buildFootnoteAppendix,
  buildMaterialCitation,
  collectBlockCandidates,
  filterBlockCandidates,
  type BlockCandidate,
} from '@services/clipMaterial'

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

// 从 localStorage 读取文件树中的所有文件名
function getFileNamesFromStorage(): string[] {
  try {
    const saved = localStorage.getItem('markcraft-file-manager')
    if (!saved) return []
    const parsed = JSON.parse(saved) as { rootFolder: FileNode }
    const names: string[] = []
    const collect = (node: FileNode) => {
      if (node.type === 'file') names.push(node.name)
      if (node.children) node.children.forEach(collect)
    }
    if (parsed.rootFolder) collect(parsed.rootFolder)
    return names
  } catch {
    return []
  }
}

// WikiLink 补全 — 输入 [[ 后提示文件名
function wikiLinkCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\[\[([^\]]*)/)
  if (!match) return null
  // 确保是以 [[ 开头（而非已经有 ]] 闭合的）
  const fullText = context.state.doc.toString()
  const afterMatch = fullText.slice(match.from, context.pos)
  if (afterMatch.includes(']]')) return null

  const query = match.text.slice(2).toLowerCase()
  const fileNames = getFileNamesFromStorage()
  const options = fileNames
    .filter(name => name.toLowerCase().includes(query))
    .slice(0, 20)
    .map(name => ({
      label: name,
      type: 'text' as const,
      detail: 'WikiLink',
      apply: `[[${name}]]`,
    }))

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
      detail: c.isMaterial ? `素材 · ${c.sourceTitle || c.sourceUrl || c.fileName}` : c.fileName,
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
      detail: '文件路径',
      apply: `./${name}`,
    }))

  if (options.length === 0) return null
  return { from: match.from, options }
}

// Markdown 快捷命令补全已移除（2026-08-28 触发收敛：Slash/斜杠命令类隐藏触发一律删除，
// 功能统一由工具栏与更多菜单提供；内容类补全 emoji/标题/语言/wikiLink/块引用/路径 保留）

// 自动补全扩展
export function createAutocompleteExtension() {
  return autocompletion({
    override: [emojiCompletions, headingCompletions, languageCompletions, wikiLinkCompletions, blockRefCompletions, filePathCompletions],
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
  return insertAndSelect(view, `**${selected || '粗体'}**`, from, to, selected ? from + selected.length + 4 : from + 2)
}

export function cm6FormatItalic(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('*') && selected.endsWith('*') && selected.length > 2 && !selected.startsWith('**')) {
    const text = selected.slice(1, -1)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `*${selected || '斜体'}*`, from, to, selected ? from + selected.length + 2 : from + 1)
}

export function cm6FormatStrike(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length > 4) {
    const text = selected.slice(2, -2)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `~~${selected || '删除线'}~~`, from, to, selected ? from + selected.length + 4 : from + 2)
}

export function cm6FormatInlineCode(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected.startsWith('`') && selected.endsWith('`') && selected.length > 2) {
    const text = selected.slice(1, -1)
    return insertAndSelect(view, text, from, to, text.length)
  }
  return insertAndSelect(view, `\`${selected || '代码'}\``, from, to, selected ? from + selected.length + 2 : from + 1)
}

export function cm6InsertLink(view: EditorView, url = ''): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const text = selected || '链接文字'
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
  return insertAndSelect(view, `$${selected || '公式'}$`, from, to, selected ? from + selected.length + 2 : from + 1)
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

  content = view.state.sliceDoc(from, to) || '标题'
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
