export interface FrontMatter {
  title: string
  date: string
  tags: string[]
  category: string
  description: string
  author: string
  coverImage: string
  draft: boolean
  slug: string
  layout: string
  permalink: string
  updated: string
  excerpt: string
  [key: string]: string | string[] | boolean | number | undefined
}

export interface ParsedDocument {
  frontMatter: FrontMatter
  content: string
  rawFrontMatter: string
}

export const DEFAULT_FRONT_MATTER: FrontMatter = {
  title: '',
  date: '',
  tags: [],
  category: '',
  description: '',
  author: '',
  coverImage: '',
  draft: false,
  slug: '',
  layout: 'post',
  permalink: '',
  updated: '',
  excerpt: '',
}

function parseValue(value: string): string | string[] | boolean {
  const trimmed = value.trim()

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
    return inner
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  if (/^- /.test(trimmed)) {
    return trimmed
      .split('\n')
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((item) => item.length > 0)
  }

  return trimmed
}

export function parseFrontMatter(markdown: string): ParsedDocument {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)

  if (!match) {
    return {
      frontMatter: { ...DEFAULT_FRONT_MATTER },
      content: markdown,
      rawFrontMatter: '',
    }
  }

  const rawFrontMatter = match[1]
  const content = markdown.slice(match[0].length).replace(/^\r?\n/, '')
  const frontMatter: FrontMatter = { ...DEFAULT_FRONT_MATTER }

  const lines = rawFrontMatter.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/)

    if (kvMatch) {
      const key = kvMatch[1]
      const value = kvMatch[2]

      if (value.trim() === '' && i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
        const items: string[] = []
        i++
        while (i < lines.length && lines[i].match(/^\s+-\s/)) {
          items.push(lines[i].replace(/^\s+-\s*/, '').trim())
          i++
        }
        frontMatter[key] = items
        continue
      }

      frontMatter[key] = parseValue(value)
    }

    i++
  }

  return { frontMatter, content, rawFrontMatter }
}

export function extractTitle(markdown: string): string {
  const { frontMatter, content } = parseFrontMatter(markdown)

  if (frontMatter.title) {
    return frontMatter.title
  }

  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    return headingMatch[1].trim()
  }

  return ''
}

export function generateFrontMatter(fm: Partial<FrontMatter>): string {
  const lines: string[] = []

  const keys = Object.keys(fm) as (keyof FrontMatter)[]

  for (const key of keys) {
    const value = fm[key]

    if (value === undefined) continue

    if (key === 'draft') {
      if (value === true) {
        lines.push(`${key}: true`)
      }
      continue
    }

    if (key === 'layout') {
      if (value && value !== 'post') {
        lines.push(`${key}: ${value}`)
      }
      continue
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`${key}: [${value.join(', ')}]`)
      }
      continue
    }

    if (typeof value === 'string' && value !== '') {
      lines.push(`${key}: ${value}`)
      continue
    }

    if (typeof value === 'boolean' && value) {
      lines.push(`${key}: true`)
    }
  }

  if (lines.length === 0) return ''

  return `---\n${lines.join('\n')}\n---`
}
