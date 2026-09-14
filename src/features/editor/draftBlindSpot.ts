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

const ABSOLUTE_RE = /(绝对|所有|永远|必然|一定|毫无例外|全都|无一例外)/g
const BALANCE_RE = /(但是|然而|不过|另一方面|反方|换个角度|也存在|与之相反|从反面)/g

/**
 * 对单篇成稿做轻量核查，返回提示列表（按严重度：warn 先于 info）。
 * 内容过短（< 50 字）不做分析，返回空数组。
 */
export function analyzeDraft(content: string): DraftHint[] {
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
      message: '未检测到引用来源，长文建议为关键论点标注出处。',
    })
  }

  const absolutes = body.match(ABSOLUTE_RE)
  if (absolutes && absolutes.length > 0) {
    hints.push({
      type: 'claim',
      severity: 'info',
      message: `存在 ${absolutes.length} 处绝对化表述，可考虑补充限定或依据。`,
    })
  }

  const balanced = BALANCE_RE.test(body)
  if (!balanced) {
    hints.push({
      type: 'balance',
      severity: 'info',
      message: '观点较单一，可补充不同视角或反面论证以增强严谨性。',
    })
  }

  return hints
}
