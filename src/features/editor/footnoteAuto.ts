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
const REF_HEADING_RE = /^##\s*(参考|references?)\s*$/im

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

/** 若文末缺少「参考」小节则补上（返回新内容） */
export function ensureReferenceSection(content: string): string {
  if (REF_HEADING_RE.test(content.trim())) return content
  const sep = content.endsWith('\n') ? '\n' : '\n\n'
  return `${content}${sep}## 参考\n`
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
