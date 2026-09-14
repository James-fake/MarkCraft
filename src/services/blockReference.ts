/**
 * P1.1 块级引用（Block Reference）
 *
 * 语法：
 *   ((block-id))            —— 块引用
 *   ((block-id|显示文字))    —— 带别名
 *   !((block-id))           —— 块嵌入
 *
 * 块 ID 标记：段落/列表项末尾的 `^block-id` 尾注
 */

export interface BlockInfo {
  blockId: string
  fileId: string
  fileName: string
  lineStart: number
  lineEnd: number
  text: string
}

export interface BlockReferenceRecord {
  sourceFileId: string
  sourceFileName: string
  targetBlockId: string
  type: 'reference' | 'embed'
  alias?: string
  line: number
}

/** 匹配行尾的 ^block-id（前面至少有一个空格） */
const BLOCK_ID_REGEX = /(?:[ \t])\^([a-zA-Z0-9_-]+)\s*$/

/** 匹配块引用语法 ((id)) 或 ((id|alias)) 或 !((id)) */
const BLOCK_REF_REGEX = /(!?)\(\(([^)]+)\)\)/g

/**
 * 从内容中提取所有块 ID 及其对应块文本。
 * 一个"块"是一个段落：以空行分隔的连续行，或单个列表项。
 * 块 ID 标记在块最后一行末尾。
 */
export function extractBlocks(content: string, fileId: string, fileName: string): Map<string, BlockInfo> {
  const blocks = new Map<string, BlockInfo>()
  const lines = content.split('\n')

  let blockStart = 0
  let blockLines: string[] = []

  const flushBlock = (endIdx: number) => {
    if (blockLines.length === 0) return
    // 检查块最后一行是否有 ^block-id
    const lastLine = blockLines[blockLines.length - 1]
    const m = lastLine.match(BLOCK_ID_REGEX)
    if (m) {
      const blockId = m[1]
      // 去掉末尾的 ^block-id 标记，得到纯文本
      const cleanLast = lastLine.replace(BLOCK_ID_REGEX, '')
      const textLines = [...blockLines.slice(0, -1), cleanLast].join('\n').trimEnd()
      if (!blocks.has(blockId)) {
        blocks.set(blockId, {
          blockId,
          fileId,
          fileName,
          lineStart: blockStart + 1,
          lineEnd: endIdx + 1,
          text: textLines,
        })
      }
    }
    blockLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      flushBlock(i - 1)
      blockStart = i + 1
    } else {
      if (blockLines.length === 0) blockStart = i
      blockLines.push(line)
    }
  }
  flushBlock(lines.length - 1)

  return blocks
}

/** 解析内容中的块引用语法 */
export function parseBlockReferences(sourceFileId: string, sourceFileName: string, content: string): BlockReferenceRecord[] {
  const refs: BlockReferenceRecord[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    let match: RegExpExecArray | null
    BLOCK_REF_REGEX.lastIndex = 0
    while ((match = BLOCK_REF_REGEX.exec(lines[i])) !== null) {
      const isEmbed = match[1] === '!'
      const inner = match[2]
      const parts = inner.split('|')
      const targetBlockId = parts[0].trim()
      const alias = parts.length > 1 ? parts.slice(1).join('|').trim() : undefined
      refs.push({
        sourceFileId,
        sourceFileName,
        targetBlockId,
        type: isEmbed ? 'embed' : 'reference',
        alias,
        line: i + 1,
      })
    }
  }

  return refs
}

/** 为指定行生成块 ID（6位随机字符，可读性优先：小写字母+数字） */
export function generateBlockId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/** 检查某行是否已包含块 ID 标记 */
export function hasBlockId(line: string): boolean {
  return BLOCK_ID_REGEX.test(line)
}

/** 为某行追加块 ID 标记（若已存在则不追加） */
export function appendBlockId(line: string, blockId?: string): string {
  if (hasBlockId(line)) return line
  const id = blockId || generateBlockId()
  return `${line.trimEnd()} ^${id}`
}
