/**
 * P2-5 成稿「信源覆盖 / 观点盲区」轻量核查（纯函数，本地启发式）
 *
 * 注意：本模块为本地启发式，不调用任何远程 / AI / 云端模型。
 * 仅对当前笔记正文做轻量模式匹配，提供「信源覆盖」「绝对化表述」「视角单一」三类提示。
 * UI 须显著标注「本地启发式·不上云」（诚实本地处理原则）。
 */
import { countWords } from './stats'

export type DraftHintType = 'source' | 'claim' | 'balance'
export type DraftHintSeverity = 'info' | 'warn'

export interface DraftHint {
  type: DraftHintType
  severity: DraftHintSeverity
  message: string
}

/**
 * 三类提示的文案（纯函数不触达 React 语言上下文，故按形参传入）。
 *
 * 注意：检测用的正则（ABSOLUTE_RE / BALANCE_RE）目前只覆盖**中文**绝对化词与转折词，
 * 英文正文不会命中 claim / balance 两类（属能力范围，非本次 i18n 目标）。
 * 若未来要支持英文正文，需另加英文模式表 —— 那是功能变更，不是翻译。
 */
export interface DraftMessages {
  /** {n} = 绝对化表述命中次数 */
  noSource: string
  absoluteCount: string
  unbalanced: string
}

/** 中文默认文案（未显式传入时使用，保持既有调用点行为不变） */
export const DEFAULT_DRAFT_MESSAGES: DraftMessages = {
  noSource: '未检测到引用来源，长文建议为关键论点标注出处。',
  absoluteCount: '存在 {n} 处绝对化表述，可考虑补充限定或依据。',
  unbalanced: '观点较单一，可补充不同视角或反面论证以增强严谨性。',
}

const ABSOLUTE_RE = /(绝对|所有|永远|必然|一定|毫无例外|全都|无一例外)/g
const BALANCE_RE = /(但是|然而|不过|另一方面|反方|换个角度|也存在|与之相反|从反面)/g

/**
 * 对单篇成稿做轻量核查，返回提示列表（按严重度：warn 先于 info）。
 * 内容过短（< 50 字）不做分析，返回空数组。
 */
export function analyzeDraft(
  content: string,
  messages: DraftMessages = DEFAULT_DRAFT_MESSAGES,
): DraftHint[] {
  const body = (content || '').replace(/^---[\s\S]*?---\s*/, '') // 去除 frontmatter
  const hints: DraftHint[] = []
  const words = countWords(body)
  if (words < 50) return hints

  const hasSource =
    /https?:\/\//.test(body) ||
    /\[\^[\w一-龥]+\]:/.test(body) ||
    /#(来源|引用|参考|reference|source)/i.test(body)

  if (!hasSource) {
    hints.push({
      type: 'source',
      severity: 'warn',
      message: messages.noSource,
    })
  }

  const absolutes = body.match(ABSOLUTE_RE)
  if (absolutes && absolutes.length > 0) {
    hints.push({
      type: 'claim',
      severity: 'info',
      message: messages.absoluteCount.replace(String.raw`{n}`, String(absolutes.length)),
    })
  }

  const balanced = BALANCE_RE.test(body)
  if (!balanced) {
    hints.push({
      type: 'balance',
      severity: 'info',
      message: messages.unbalanced,
    })
  }

  return hints
}
