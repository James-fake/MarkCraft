/**
 * P0-2 剪藏 × 块引用联动
 *
 * 目标：网页剪藏落地为「素材库」笔记 —— 自动写入来源元数据、自动为每个可引用段落
 * 追加 `^blockId` 标记；写作时通过 `((` 检索素材块，插入带来源的引用 / 嵌入 / 脚注。
 *
 * 本模块只包含纯函数，不依赖 DOM、React 与任何存储实现，便于单元测试。
 */
import { appendBlockId, extractBlocks, generateBlockId, hasBlockId } from './blockReference'

/** 剪藏素材统一归档的文件夹名 */
export const MATERIAL_FOLDER_NAME = '素材库'

/** 剪藏来源元数据 */
export interface ClipSource {
  /** 原始网址 */
  url: string
  /** 网页标题 */
  title: string
  /** 剪藏日期（YYYY-MM-DD） */
  clippedAt: string
  /** 作者（可选） */
  author?: string
  /** 站点名（可选） */
  siteName?: string
}

/** 文件树节点的最小结构（与 FileNode 结构兼容，避免耦合业务类型） */
export interface NodeLike {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: NodeLike[]
}

const FENCE_RE = /^(```|~~~)/

/** 结构性行：无法安全追加块 ID 标记的行 */
function isStructuralLine(line: string): boolean {
  const t = line.trim()
  if (t === '') return true
  if (/^#{1,6}\s/.test(t)) return true // 标题
  if (/^>/.test(t)) return true // 引用块
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return true // 分割线
  if (/^\|/.test(t)) return true // 表格行
  if (FENCE_RE.test(t)) return true // 代码围栏
  if (/^!\[[^\]]*\]\([^)]*\)$/.test(t)) return true // 纯图片行
  return false
}

/**
 * 为 markdown 正文中的每个可引用块追加 `^blockId` 标记。
 *
 * 规则与 `extractBlocks` 保持一致：一个「块」= 连续的非空行；标记只追加到块的最后一行，
 * 否则 `extractBlocks` 无法识别。以下情况跳过：
 * - frontmatter 区域、代码围栏内部
 * - 标题 / 引用 / 分割线 / 表格 / 纯图片等结构性行结尾的块
 * - 已有块 ID 的行（幂等）
 * - 纯文本长度小于 `minLength` 的碎片块
 */
export function annotateBlockIds(
  markdown: string,
  idGen: () => string = generateBlockId,
  minLength = 8,
): string {
  if (!markdown) return markdown

  const out = markdown.split('\n')
  let i = 0

  // 跳过 frontmatter
  if (out[0]?.trim() === '---') {
    for (let k = 1; k < out.length; k++) {
      if (out[k].trim() === '---') {
        i = k + 1
        break
      }
    }
  }

  let groupStart = -1
  let groupSkip = false

  const flush = (endIdx: number) => {
    if (groupStart < 0 || endIdx < groupStart) {
      groupStart = -1
      groupSkip = false
      return
    }
    const start = groupStart
    const skip = groupSkip
    groupStart = -1
    groupSkip = false
    if (skip) return

    const lastLine = out[endIdx]
    if (hasBlockId(lastLine)) return
    if (isStructuralLine(lastLine)) return

    const plain = out.slice(start, endIdx + 1).join(' ').replace(/\s+/g, ' ').trim()
    if (plain.length < minLength) return

    out[endIdx] = appendBlockId(lastLine, idGen())
  }

  let inFence = false
  for (; i < out.length; i++) {
    const line = out[i]

    if (FENCE_RE.test(line.trim())) {
      if (!inFence) {
        flush(i - 1)
        inFence = true
        groupStart = i
        groupSkip = true
      } else {
        inFence = false
        groupStart = -1
        groupSkip = false
      }
      continue
    }

    if (inFence) continue

    if (line.trim() === '') {
      flush(i - 1)
    } else if (groupStart < 0) {
      groupStart = i
      groupSkip = false
    }
  }
  flush(out.length - 1)

  return out.join('\n')
}

/**
 * YAML 标量：仅在会造成解析歧义时加引号。
 * URL（`https://x/y`）中的冒号后无空格，属于合法裸标量，不应被引号包裹。
 */
function yamlValue(v: string): string {
  if (v === '') return '""'
  const needsQuote =
    /^[\s>|&*!%@`?:,[\]{}#-]/.test(v) || // 起始特殊字符
    /\s$/.test(v) || // 尾部空白
    /:\s/.test(v) || // 冒号 + 空白（键值歧义）
    /\s#/.test(v) || // 行内注释起始
    /[\n"']/.test(v) // 换行或引号
  if (!needsQuote) return v
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`
}

/**
 * 构建素材笔记：frontmatter（来源元数据） + 标题 + 来源提示 + 已标注块 ID 的正文
 */
export function buildMaterialNote(
  source: ClipSource,
  body: string,
  idGen: () => string = generateBlockId,
): string {
  const title = source.title || '网页剪藏'
  const fmLines = [
    '---',
    `title: ${yamlValue(title)}`,
    `source: ${yamlValue(source.url)}`,
    `clipped: ${yamlValue(source.clippedAt)}`,
  ]
  if (source.author) fmLines.push(`author: ${yamlValue(source.author)}`)
  if (source.siteName) fmLines.push(`site: ${yamlValue(source.siteName)}`)
  fmLines.push('type: clip', '---')

  const attribution = `> 剪藏来源：[${title}](${source.url})${source.clippedAt ? ` · ${source.clippedAt}` : ''}`
  const annotated = annotateBlockIds(body || '', idGen).trim()

  return `${fmLines.join('\n')}\n\n# ${title}\n\n${attribution}\n\n${annotated}\n`
}

/** 去掉 YAML 标量的包裹引号 */
function unquote(v: string): string {
  const t = v.trim()
  if (t.length > 1 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return t
}

/**
 * 解析素材笔记的来源元数据。
 * 优先读 frontmatter，其次兼容旧剪藏格式的 `> 来源：...` 行；无来源返回 null。
 */
export function parseMaterialSource(content: string): ClipSource | null {
  if (!content) return null

  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm) {
    const map: Record<string, string> = {}
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
      if (m) map[m[1]] = unquote(m[2])
    }
    if (map.source) {
      return {
        url: map.source,
        title: map.title || '',
        clippedAt: map.clipped || '',
        author: map.author || undefined,
        siteName: map.site || undefined,
      }
    }
  }

  const linked = content.match(/^>\s*(?:剪藏)?来源[：:]\s*\[([^\]]*)\]\(([^)]+)\)/m)
  if (linked) return { url: linked[2].trim(), title: linked[1].trim(), clippedAt: '' }

  const plain = content.match(/^>\s*(?:剪藏)?来源[：:]\s*(\S+)/m)
  if (plain) return { url: plain[1].trim(), title: '', clippedAt: '' }

  return null
}

/** 引用形态 */
export type CitationMode = 'reference' | 'embed' | 'quote' | 'footnote'

export interface CitationInput {
  blockId: string
  mode: CitationMode
  /** 块正文（quote / footnote 形态使用） */
  text?: string
  /** 引用别名（reference 形态使用） */
  alias?: string
  /** 素材来源，存在时自动带出出处 */
  source?: ClipSource | null
}

export interface CitationResult {
  /** 插入光标处的文本 */
  inline: string
  /** 需要追加到文末的脚注定义（仅 footnote 形态） */
  footnoteDef?: string
}

/** 生成带来源的引用文本 */
export function buildMaterialCitation(input: CitationInput): CitationResult {
  const id = (input.blockId || '').trim()
  if (!id) return { inline: '' }

  const text = (input.text || '').trim()
  const source = input.source && input.source.url ? input.source : null
  const sourceLabel = source ? source.title || source.url : ''

  switch (input.mode) {
    case 'embed':
      return { inline: `!((${id}))` }

    case 'quote': {
      const quoted = (text || `((${id}))`)
        .split('\n')
        .map(l => `> ${l}`.trimEnd())
        .join('\n')
      if (source) return { inline: `${quoted}\n>\n> —— [${sourceLabel}](${source.url})` }
      return { inline: quoted }
    }

    case 'footnote': {
      const label = `src-${id}`
      const body = text || `((${id}))`
      const def = source
        ? `[^${label}]: 来源：[${sourceLabel}](${source.url})`
        : `[^${label}]: 来源：本地块 ^${id}`
      return { inline: `${body}[^${label}]`, footnoteDef: def }
    }

    case 'reference':
    default:
      return { inline: input.alias ? `((${id}|${input.alias}))` : `((${id}))` }
  }
}

/** 判断文档中是否已存在同名脚注定义 */
export function footnoteDefExists(content: string, def: string): boolean {
  const label = def.match(/^\[\^([^\]]+)\]:/)?.[1]
  if (!label) return false
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\[\\^${escaped}\\]:`, 'm').test(content)
}

/**
 * 计算需要在文末「追加」的文本（含必要的分隔空行）。
 * 供编辑器按位置增量插入使用；脚注已存在或定义为空时返回 null。
 */
export function buildFootnoteAppendix(content: string, def: string): string | null {
  if (!def) return null
  if (footnoteDefExists(content, def)) return null
  if (content === '') return `${def}\n`
  const separator = content.endsWith('\n\n') ? '' : content.endsWith('\n') ? '\n' : '\n\n'
  return `${separator}${def}\n`
}

/** 将脚注定义追加到文末（同名脚注已存在时不重复追加） */
export function appendFootnoteDef(content: string, def: string): string {
  if (!def) return content
  if (footnoteDefExists(content, def)) return content
  const trimmed = content.replace(/\s+$/, '')
  return trimmed ? `${trimmed}\n\n${def}\n` : `${def}\n`
}

/** `((` 补全候选项 */
export interface BlockCandidate {
  blockId: string
  fileId: string
  fileName: string
  /** 压缩为单行的块文本 */
  text: string
  sourceTitle?: string
  sourceUrl?: string
  /** 是否来自剪藏素材（带来源） */
  isMaterial: boolean
}

/** 遍历文件树，收集全部带块 ID 的块作为引用候选 */
export function collectBlockCandidates(root: NodeLike | null | undefined): BlockCandidate[] {
  if (!root) return []
  const out: BlockCandidate[] = []
  const seen = new Set<string>()

  const walk = (node: NodeLike) => {
    if (node.type === 'file') {
      const content = node.content ?? ''
      if (content) {
        const source = parseMaterialSource(content)
        for (const [id, info] of extractBlocks(content, node.id, node.name)) {
          if (seen.has(id)) continue
          seen.add(id)
          out.push({
            blockId: id,
            fileId: node.id,
            fileName: node.name,
            text: info.text.replace(/\s+/g, ' ').trim(),
            sourceTitle: source?.title || undefined,
            sourceUrl: source?.url || undefined,
            isMaterial: !!source,
          })
        }
      }
    }
    if (node.children) node.children.forEach(walk)
  }

  walk(root)
  return out
}

/** 过滤候选项：匹配块 ID / 正文 / 文件名 / 来源标题；素材块优先 */
export function filterBlockCandidates(
  list: BlockCandidate[],
  query: string,
  limit = 20,
): BlockCandidate[] {
  const q = (query || '').trim().toLowerCase()
  const matched = q
    ? list.filter(
        c =>
          c.blockId.toLowerCase().includes(q) ||
          c.text.toLowerCase().includes(q) ||
          c.fileName.toLowerCase().includes(q) ||
          (c.sourceTitle || '').toLowerCase().includes(q),
      )
    : list
  const sorted = [...matched].sort((a, b) => Number(b.isMaterial) - Number(a.isMaterial))
  return limit > 0 ? sorted.slice(0, limit) : []
}

/** 在根节点的直接子级中按名称查找文件夹，返回其 id */
export function findChildFolderIdByName(
  root: NodeLike | null | undefined,
  name: string,
): string | null {
  if (!root || !root.children) return null
  for (const child of root.children) {
    if (child.type === 'folder' && child.name === name) return child.id
  }
  return null
}
