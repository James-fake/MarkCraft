import { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

// Smart punctuation rules
interface PunctuationRule {
  trigger: string       // Text that triggers the replacement
  replace: string       // What to replace with
  description: string   // For settings UI
  enabled: boolean      // Default enabled state
}

const DEFAULT_RULES: PunctuationRule[] = [
  { trigger: '--', replace: '\u2014', description: '-- → — (破折号)', enabled: true },
  { trigger: '...', replace: '\u2026', description: '... → … (省略号)', enabled: true },
  { trigger: '<<', replace: '\u300a', description: '<< → 《 (左书名号)', enabled: true },
  { trigger: '>>', replace: '\u300b', description: '>> → 》 (右书名号)', enabled: true },
]

// Get enabled rules from localStorage
function getEnabledRules(): PunctuationRule[] {
  try {
    const saved = localStorage.getItem('markcraft_smart_punctuation')
    if (saved) {
      const overrides = JSON.parse(saved) as Record<string, boolean>
      return DEFAULT_RULES.map(rule => ({
        ...rule,
        enabled: overrides[rule.trigger] !== undefined ? overrides[rule.trigger] : rule.enabled,
      }))
    }
  } catch {}
  return DEFAULT_RULES
}

export function smartPunctuation(): Extension {
  return EditorView.inputHandler.of((view, from, _to, text) => {
    // Check if smart punctuation is enabled
    if (localStorage.getItem('markcraft_smart_punctuation_enabled') === 'false') return false

    // Don't apply in code blocks
    const line = view.state.doc.lineAt(from)
    const lineText = line.text
    if (lineText.trimStart().startsWith('```') || lineText.trimStart().startsWith('    ')) return false

    const rules = getEnabledRules()

    // Check if the inserted text + preceding text matches any rule
    for (const rule of rules) {
      if (!rule.enabled) continue

      const triggerLen = rule.trigger.length
      if (triggerLen <= 1) continue

      // The text before the cursor + the inserted text
      const precedingText = view.state.doc.sliceString(
        Math.max(from, from - triggerLen + text.length),
        from
      )
      const combined = precedingText + text

      if (combined.endsWith(rule.trigger)) {
        const replaceFrom = from - (triggerLen - text.length)
        view.dispatch({
          changes: { from: replaceFrom, to: from + text.length, insert: rule.replace },
          selection: { anchor: replaceFrom + rule.replace.length },
        })
        return true
      }
    }

    return false
  })
}

export { DEFAULT_RULES, getEnabledRules }
export type { PunctuationRule }
