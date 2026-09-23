import { describe, it, expect } from 'vitest'
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_UI_COLORS,
  HIGHLIGHT_COLOR_OPTIONS,
  DEFAULT_HIGHLIGHT_COLOR,
  isHighlightColor,
} from '../highlightColors'

/**
 * 高亮调色板常量表回归锁。
 *
 * 背景：调色板由 5 色扩到 16 色、并新增「记住上次颜色」特性。三张表（正文底色 /
 * UI 不透明色 / 顺序元组）必须**键集合完全一致**，否则会出现「调色板色块点得动、
 * 但落盘到 markdown 的是 undefined 底色」这类只在特定颜色上暴露的静默失败。
 */
describe('highlightColors 常量表', () => {
  it('三张表键集合完全一致（顺序元组即唯一真源）', () => {
    const fromOptions = [...HIGHLIGHT_COLOR_OPTIONS].sort()
    expect(Object.keys(HIGHLIGHT_COLORS).sort()).toEqual(fromOptions)
    expect(Object.keys(HIGHLIGHT_UI_COLORS).sort()).toEqual(fromOptions)
  })

  it('共 16 色，且无重复项', () => {
    expect(HIGHLIGHT_COLOR_OPTIONS).toHaveLength(16)
    expect(new Set(HIGHLIGHT_COLOR_OPTIONS).size).toBe(16)
  })

  it('调色板顺序与设计一致（暖 → 冷 → 中性，两行 × 8）', () => {
    expect([...HIGHLIGHT_COLOR_OPTIONS]).toEqual([
      'yellow', 'amber', 'orange', 'deep-orange', 'red', 'pink', 'purple', 'deep-purple',
      'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'gray',
    ])
  })

  it('每个色名在两张色值表里都有非空值', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(HIGHLIGHT_COLORS[color], `HIGHLIGHT_COLORS[${color}]`).toBeTruthy()
      expect(HIGHLIGHT_UI_COLORS[color], `HIGHLIGHT_UI_COLORS[${color}]`).toBeTruthy()
    }
  })

  it('正文底色一律半透明 rgba（不能压住正文）', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(HIGHLIGHT_COLORS[color], color).toMatch(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0?\.\d+\s*\)$/)
    }
  })

  it('UI 色为不透明 hex（深底上也能分辨）', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(HIGHLIGHT_UI_COLORS[color], color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('默认色为 yellow，且在色表中', () => {
    expect(DEFAULT_HIGHLIGHT_COLOR).toBe('yellow')
    expect(HIGHLIGHT_COLOR_OPTIONS).toContain(DEFAULT_HIGHLIGHT_COLOR)
  })
})

describe('isHighlightColor 类型守卫', () => {
  it('接受全部合法色名', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(isHighlightColor(color)).toBe(true)
    }
  })

  it('保留旧 5 色兼容（用户历史 markdown 里的旧色名仍能解析）', () => {
    for (const legacy of ['yellow', 'green', 'blue', 'pink', 'purple']) {
      expect(isHighlightColor(legacy)).toBe(true)
    }
  })

  it('拒绝非法值（手改 localStorage / 旧版已废弃色名）', () => {
    for (const bad of ['', 'Yellow', 'grey', 'chartreuse', 'red ', ' red', undefined, null, 42, {}, []]) {
      expect(isHighlightColor(bad as unknown), String(bad)).toBe(false)
    }
  })
})
