/**
 * 阶段8 数据层图标统一回归测试
 * 验证 kbTheme 中的色彩/状态配置不含彩色 emoji（死 emoji 字段已清理）。
 */
import { describe, it, expect } from 'vitest'
import { KB_STAT_COLORS, KB_CARD_GRADIENTS } from './kbTheme'

const EMOJIS = ['🌐', '📂', '✕', '📚', '📄', '⏳', '📦', '📖', '📝', '🎯', '🔬', '🎨', '📅', '📎', '⚠️', '✅', '📊', '🏷️']

describe('kbTheme 图标统一', () => {
  it('KB_STAT_COLORS 的 icon 字段不含彩色 emoji（死字段已清理）', () => {
    for (const c of KB_STAT_COLORS) {
      for (const e of EMOJIS) {
        expect(c.icon).not.toContain(e)
      }
    }
  })

  it('KB_CARD_GRADIENTS 为纯 CSS 渐变字符串，不含 emoji', () => {
    for (const g of KB_CARD_GRADIENTS) {
      expect(g.startsWith('linear-gradient')).toBe(true)
      for (const e of EMOJIS) expect(g).not.toContain(e)
    }
  })
})
