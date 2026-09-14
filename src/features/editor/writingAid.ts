/**
 * P1-5 本地写作辅助 — 纯函数
 *
 * 所有函数均为纯函数、无网络、无 DOM 依赖，便于单元测试与「诚实本地处理」标识。
 * 四项能力：
 *  - suggestTitle    标题建议
 *  - extractOutline  大纲提取
 *  - polishText      启发式本地润色（仅作建议，可复制润色后文本）
 *  - extractKeywords 焦点关键词（基于词频 + #标签 加权）
 *
 * 设计原则：不修改调用方数据，代码块（```fence```）在润色时原样保留，避免破坏正文结构。
 */

/* ------------------------------------------------------------------ *
 * 通用文本工具
 * ------------------------------------------------------------------ */

/** 去除 YAML frontmatter（--- ... ---），便于对正文做分析 */
export function stripFrontMatter(md: string): string {
  return (md || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/** 去除行内 markdown 标记，用于从首行推导标题 */
function stripInlineMarkdown(line: string): string {
  return line
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/(\*\*|__|~~|\*|_|#)/g, '')
    .trim()
}

function truncate(s: string, n: number): string {
  return s && s.length > n ? `${s.slice(0, n).trimEnd()}…` : s || ''
}

/** 将字符串转换为 URL 友好 slug（保留中文，其余折叠为连字符） */
export function slugify(input: string, maxLength = 80): string {
  const base = (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!base) return 'untitled'
  return base.slice(0, maxLength).replace(/-+$/, '') || 'untitled'
}

/* ------------------------------------------------------------------ *
 * 标题建议
 * ------------------------------------------------------------------ */

/**
 * 从内容推导一个建议标题：
 *  1) 优先取首个 ATX 标题（# ...），这是正文已明确表达的标题；
 *  2) 否则取首个非空行的纯文本内容（截断到 60 字）。
 * 无实质内容时返回 null。
 */
export function suggestTitle(content: string): string | null {
  const body = stripFrontMatter(content)
  const text = body.trim()
  if (!text) return null

  const headingMatch = text.match(/^#{1,6}\s+(.+)$/m)
  if (headingMatch) {
    const t = headingMatch[1].trim()
    if (t) return t
  }

  const firstLine = text
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0)
  if (firstLine) {
    const cleaned = stripInlineMarkdown(firstLine)
    if (cleaned.length >= 2) return truncate(cleaned, 60)
  }
  return null
}

/** 同时给出标题与 slug（便于面板一次展示） */
export interface TitleSuggestion {
  title: string
  slug: string
}
export function suggestTitleAndSlug(content: string): TitleSuggestion | null {
  const title = suggestTitle(content)
  if (!title) return null
  return { title, slug: slugify(title) }
}

/* ------------------------------------------------------------------ *
 * 大纲提取
 * ------------------------------------------------------------------ */

export interface OutlineItem {
  /** 标题级别 1-6 */
  level: number
  /** 标题文本（已去 # 标记，未去语法） */
  text: string
  /** 在源文件中的行号（1-based） */
  line: number
}

/**
 * 解析正文中的 ATX 标题（# ~ ######）为大纲列表。
 * 跳过围栏代码块（``` ... ```）内的伪标题，返回扁平有序列表（保留 level 供缩进）。
 */
export function extractOutline(content: string): OutlineItem[] {
  const lines = (content || '').split('\n')
  const items: OutlineItem[] = []
  let inFence = false
  lines.forEach((raw, idx) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(raw)
    if (m) {
      const text = m[2].trim()
      if (text) items.push({ level: m[1].length, text, line: idx + 1 })
    }
  })
  return items
}

/* ------------------------------------------------------------------ *
 * 启发式本地润色
 * ------------------------------------------------------------------ */

export interface PolishSuggestion {
  /** 原文片段 */
  from: string
  /** 建议替换 */
  to: string
  /** 修改原因（中文） */
  reason: string
}

export interface PolishResult {
  /** 润色后的全文（代码块原样保留） */
  polished: string
  /** 所有建议（按出现顺序） */
  suggestions: PolishSuggestion[]
  /** 是否存在可润色项 */
  changed: boolean
}

interface PolishRule {
  re: RegExp
  /** 替换串（支持 $1 等捕获组引用） */
  replace: string
  reason: string
}

/** 中文冗余话语标记：仅当其后紧跟标点或空白时才移除，避免误删词义中的字 */
const ZH_FILLERS = [
  '其实', '基本上', '也就是说', '事实上', '应该说', '众所周知',
  '简单来说', '总体来看', '总的来说', '毋庸置疑', '显而易见', '毫无疑问',
]

const EN_FILLERS: Array<[string, string]> = [
  [' in order to ', ' to '],
  [' that being said', ''],
  [' in fact', ''],
  [' basically ', ''],
  [' really ', ''],
  [' needless to say', ''],
  [' in my opinion', ''],
]

/** 标点前多余空格（中英文通用） */
const SPACE_BEFORE_PUNCT = /[ \t]+([,，。、；：！？.!?])/g
/** 重复标点（！！→！、??→?、。。→。） */
const REPEAT_PUNCT = /([!?。！？])\1+/g
/** 多余空格（2 个及以上折叠为 1 个） */
const EXTRA_SPACE = /[ \t]{2,}/g
/** 中文常见叠字（的的→的、了了→了 等） */
const DOUBLE_CHAR = /(的|了|吗|呢|吧|啊|呀|哦|嗯|嘛|咯)\1/g

function buildRules(): PolishRule[] {
  const rules: PolishRule[] = []
  for (const w of ZH_FILLERS) {
    rules.push({
      re: new RegExp(`${w}(?=[，。、；：！？\\s])`, 'g'),
      replace: '',
      reason: `冗余词：${w}`,
    })
  }
  for (const [from, to] of EN_FILLERS) {
    rules.push({ re: new RegExp(from, 'gi'), replace: to, reason: `冗余表达：${from.trim()}` })
  }
  rules.push({ re: SPACE_BEFORE_PUNCT, replace: '$1', reason: '标点前多余空格' })
  rules.push({ re: REPEAT_PUNCT, replace: '$1', reason: '重复标点' })
  rules.push({ re: EXTRA_SPACE, replace: ' ', reason: '多余空格' })
  rules.push({ re: DOUBLE_CHAR, replace: '$1', reason: '重复字' })
  return rules
}

const POLISH_RULES = buildRules()

/** 将内容按围栏代码块切分为 {text, isCode} 片段（代码块原样保留，不参与润色） */
function splitPreservingFences(content: string): Array<{ text: string; isCode: boolean }> {
  const out: Array<{ text: string; isCode: boolean }> = []
  const parts = (content || '').split(/^```/m)
  // 偶数段为普通文本（首段为普通），奇数段为代码（需补回 ``` 标记）
  parts.forEach((part, i) => {
    const isCode = i % 2 === 1
    if (isCode) {
      // 还原被 split 消费的成对围栏（开 + 闭）
      out.push({ text: '```' + part + '```', isCode: true })
    } else {
      out.push({ text: part, isCode: false })
    }
  })
  return out
}

/** 将替换模板中的 $1/$2 等引用替换为对应捕获组（不依赖对 match 重跑带前瞻的正则） */
function applyReplacement(template: string, groups: string[]): string {
  return template.replace(/\$(\d+)/g, (_, n) => groups[Number(n) - 1] ?? '')
}

function polishSegment(text: string, sink: PolishSuggestion[]): string {
  let out = text
  for (const rule of POLISH_RULES) {
    out = out.replace(rule.re, (...args: string[]) => {
      const match = args[0]
      // 捕获组位于 (match, g1, g2, ..., offset, string) 之间
      const groups = args.slice(1, args.length - 2)
      const replaced = applyReplacement(rule.replace, groups)
      if (replaced !== match) {
        sink.push({ from: match, to: replaced, reason: rule.reason })
      }
      return replaced
    })
  }
  return out
}

/**
 * 启发式润色：基于本地规则清理冗余词、标点与空格，返回润色后全文与逐条建议。
 * 代码块内容原样保留，避免改动程序代码。
 */
export function polishText(content: string): PolishResult {
  const segments = splitPreservingFences(content)
  const suggestions: PolishSuggestion[] = []
  const out = segments
    .map(seg => (seg.isCode ? seg.text : polishSegment(seg.text, suggestions)))
    .join('')
  return { polished: out, suggestions, changed: suggestions.length > 0 }
}

/* ------------------------------------------------------------------ *
 * 焦点关键词
 * ------------------------------------------------------------------ */

export interface KeywordScore {
  term: string
  score: number
}

/** 本地提取 #标签（复用 deriveTags 思路，独立实现以避免跨特性耦合） */
function extractHashTags(markdown: string): string[] {
  const body = markdown.replace(/```[\s\S]*?```/g, ' ')
  const found = body.match(/(?:^|\s)#([\w一-龥-]{1,24})(?=\s|$)/g) || []
  const out: string[] = []
  for (const raw of found) {
    const tag = raw.trim().slice(1)
    if (!tag || /^\d+$/.test(tag)) continue
    if (!out.includes(tag)) out.push(tag)
  }
  return out
}

const EN_STOP = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new',
  'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say',
  'she', 'too', 'use', 'that', 'this', 'with', 'from', 'they', 'will', 'would', 'there',
  'their', 'what', 'about', 'which', 'when', 'have', 'were', 'been', 'because', 'some',
  'more', 'very', 'then', 'than', 'them', 'these', 'those', 'into', 'over', 'also',
  'each', 'just', 'your', 'such', 'only', 'here', 'where', 'should', 'other', 'after',
])

/** 常见中文双字停用词（作为焦点关键词噪声过滤） */
const ZH_BIGRAM_STOP = new Set([
  '我们', '你们', '他们', '她们', '自己', '这个', '那个', '一个', '一种', '一些', '这些', '那些',
  '因为', '所以', '但是', '如果', '这样', '那样', '已经', '时候', '通过', '进行', '以及', '由于',
  '并且', '同时', '目前', '方面', '问题', '情况', '需要', '可能', '怎么', '什么', '为什么', '如何',
  '是否', '不是', '就是', '还是', '对于', '可以', '没有', '一种', '这种', '那种', '一种', '为了',
  '而且', '而是', '虽然', '然而', '或者', '还是', '只是', '不过', '这个', '还有', '一种', '之后',
  '之前', '现在', '成为', '认为', '表示', '包括', '具有', '以及', '一直', '一样', '不少', '很多',
])

/**
 * 提取焦点关键词：
 *  - #标签 加权 +5（作者显式标注，最可信）
 *  - 拉丁词（长度≥4，去停用词）词频 +1
 *  - 中文双字 n-gram 词频 +1（出现≥2 次才保留，降低噪声）
 * 返回按分数降序、同分按词升序的前 limit 个。
 */
export function extractKeywords(content: string, limit = 8): KeywordScore[] {
  const body = stripFrontMatter(content)
  const scores = new Map<string, number>()

  for (const tag of extractHashTags(body)) {
    // 标签与正文词频按小写归并，避免 React / react 被计为两个关键词
    const key = tag.toLowerCase()
    scores.set(key, (scores.get(key) || 0) + 5)
  }

  const latinWords = body.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []
  for (const w of latinWords) {
    if (EN_STOP.has(w)) continue
    scores.set(w, (scores.get(w) || 0) + 1)
  }

  const cjkSeqs = body.match(/[一-龥]{2,}/g) || []
  for (const seq of cjkSeqs) {
    for (let i = 0; i < seq.length - 1; i++) {
      const bg = seq.slice(i, i + 2)
      if (ZH_BIGRAM_STOP.has(bg)) continue
      scores.set(bg, (scores.get(bg) || 0) + 1)
    }
  }

  return [...scores.entries()]
    .filter(([term, score]) => {
      if (/^[一-龥]{2}$/.test(term)) return score >= 2
      return score >= 1
    })
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, limit)
}
