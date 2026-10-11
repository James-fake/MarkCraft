/**
 * P2-6 链接自动转脚注（纯函数，本地）
 *
 * 将粘贴的 URL 转换为脚注引用 [^n] 与文末参考列表定义 [^n]: url。
 * 全部本地处理，不上云。供编辑器「粘贴为脚注」动作调用。
 */
export interface FootnoteBuild {
  index: number
  marker: string // [^n]
  definition: string // [^n]: url
}

const DEF_RE = /\[\^(\w+)\]:/g
const REF_HEADING_RE = /^##\s*(参考|参考文献|references?)\s*$/im

/** 计算下一个脚注序号（已有最大数字序号 + 1） */
export function nextFootnoteIndex(content: string): number {
  let max = 0
  const defs = content.match(DEF_RE) || []
  for (const d of defs) {
    const m = /^\[\^(\w+)\]:/.exec(d)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return max + 1
}

/** 按序号构造脚注标记与定义 */
export function buildFootnote(url: string, index: number): FootnoteBuild {
  return { index, marker: `[^${index}]`, definition: `[^${index}]: ${url}` }
}

/** 若文末缺少「参考 / 参考文献」小节则补上（返回新内容）。统一使用「## 参考文献」。 */
export function ensureReferenceSection(content: string): string {
  if (REF_HEADING_RE.test(content.trim())) return content
  const sep = content.endsWith('\n') ? '\n' : '\n\n'
  return `${content}${sep}## 参考文献\n`
}

/** 追加脚注定义到「参考」小节，返回新内容 */
export function appendFootnoteDefinition(content: string, url: string): { content: string; build: FootnoteBuild } {
  const index = nextFootnoteIndex(content)
  const build = buildFootnote(url, index)
  let base = ensureReferenceSection(content)
  const sep = base.endsWith('\n') ? '\n' : '\n\n'
  base = `${base}${sep}${build.definition}\n`
  return { content: base, build }
}

/**
 * 将粘贴的 URL 转为脚注：在文末追加引用标记 [^n]，并补全参考列表定义。
 * 返回新内容与使用的标记。
 */
export function pasteUrlAsFootnote(content: string, url: string): { content: string; marker: string } {
  const { content: withDef, build } = appendFootnoteDefinition(content, url)
  const withMarker = `${withDef.trimEnd()}\n${build.marker}\n`
  return { content: withMarker, marker: build.marker }
}

/** 判断字符串是否为单个 URL（用于粘贴处理） */
export function isSingleUrl(text: string): boolean {
  const t = (text || '').trim()
  if (!t || t.includes('\n') || t.includes(' ')) return false
  return /^https?:\/\/\S+$/i.test(t)
}

/**
 * P2-6 增强：粘贴为脚注支持 标题+URL / DOI / 批量多行。
 * 本地处理，不上云。
 */

/** 把 DOI 归一为 https://doi.org/... 形式 */
export function normalizeDoi(s: string): string {
  const t = (s || '').trim()
  if (/^doi:/i.test(t)) return `https://doi.org/${t.slice(4).trim()}`
  if (/^10\.\d{4,9}\//.test(t)) return `https://doi.org/${t}`
  return t
}

const PASTE_URL_RE = /(https?:\/\/\S+|doi:[^\s]+|10\.\d{4,9}\/\S+)/i

/** 从一行文本解析出 { title?, url }；识别 URL / DOI / [标题](url) / 「标题 url」 */
export function parseRefLine(line: string): { title: string; url: string } | null {
  const trimmed = (line || '').trim()
  if (!trimmed) return null

  // markdown 链接 [标题](url)
  const md = trimmed.match(/^\[([^\]]+)\]\((https?:\/\/\S+|doi:[^\s]+|10\.\d{4,9}\/\S+)\)$/i)
  if (md) return { title: md[1].trim(), url: normalizeDoi(md[2]) }

  const urlMatch = trimmed.match(PASTE_URL_RE)
  if (!urlMatch) return null
  const url = normalizeDoi(urlMatch[0])
  const title = trimmed
    .replace(urlMatch[0], '')
    .replace(/[()[\]]/g, '')
    .replace(/^[\s:–—-]+/, '')
    .replace(/[\s:–—-]+$/, '')
    .trim()
  return { title, url }
}

/** 把剪贴板文本按行解析为引用列表（跳过空行 / 无 URL 行） */
export function parsePastedRefs(text: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = []
  for (const line of (text || '').split('\n')) {
    const r = parseRefLine(line)
    if (r) out.push(r)
  }
  return out
}

/**
 * 将粘贴的文本（可多行 / 含标题）转为脚注：在文末 `## 参考文献` 小节
 * 追加定义，并返回供插入到光标的引用标记 `[^n]`（多个以空格连接）。
 */
export function pasteRefsAsFootnotes(content: string, text: string): { content: string; markers: string } {
  const refs = parsePastedRefs(text)
  if (refs.length === 0) return { content, markers: '' }
  let base = ensureReferenceSection(content)
  const markers: string[] = []
  for (const r of refs) {
    const index = nextFootnoteIndex(base)
    const def = r.title ? `[^${index}]: [${r.title}](${r.url})` : `[^${index}]: ${r.url}`
    const sep = base.endsWith('\n') ? '\n' : '\n\n'
    base = `${base}${sep}${def}\n`
    markers.push(`[^${index}]`)
  }
  const markerStr = markers.join(' ')
  const withMarker = `${base.replace(/\s*$/, '')}\n${markerStr}\n`
  return { content: withMarker, markers: markerStr }
}
