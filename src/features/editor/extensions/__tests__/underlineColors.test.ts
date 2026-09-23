import { describe, it, expect } from 'vitest'
import {
  UNDERLINE_COLORS,
  UNDERLINE_COLOR_OPTIONS,
  DEFAULT_UNDERLINE_COLOR,
  isUnderlineColor,
} from '../underlineColors'
import { HIGHLIGHT_COLOR_OPTIONS, HIGHLIGHT_UI_COLORS } from '../highlightColors'

/**
 * 下划线色表回归锁。
 *
 * 与高亮的关键差异：高亮改「底色」（rgba 半透明），下划线改「文字前景色」——
 * 半透明 rgba 当前景色会让文字发灰看不清，故必须取同一批色的**不透明**版本。
 * 本组用例把这条「不能退化成 rgba」的约束钉死。
 */
describe('underlineColors 下划线色表', () => {
  it('调色板项 = auto + 与高亮同序的 16 色（两款面板视觉对齐）', () => {
    expect(UNDERLINE_COLOR_OPTIONS).toEqual(['auto', ...HIGHLIGHT_COLOR_OPTIONS])
    expect(UNDERLINE_COLOR_OPTIONS).toHaveLength(17)
  })

  it('16 色取「不透明」hex（下划线是前景色，半透明 rgba 会让字发灰）', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(UNDERLINE_COLORS[color], color).toBe(HIGHLIGHT_UI_COLORS[color])
      expect(UNDERLINE_COLORS[color], color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('色表是浅拷贝：就地改写不会污染高亮色表', () => {
    expect(UNDERLINE_COLORS).not.toBe(HIGHLIGHT_UI_COLORS)
  })

  it('默认色 = auto（跟随正文），且 auto 本身不带任何色值', () => {
    expect(DEFAULT_UNDERLINE_COLOR).toBe('auto')
    expect(UNDERLINE_COLORS.auto).toBeUndefined()
  })

  it('isUnderlineColor：auto 与全 16 色合法', () => {
    expect(isUnderlineColor('auto'), 'auto').toBe(true)
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      expect(isUnderlineColor(color), color).toBe(true)
    }
  })

  it('isUnderlineColor：拼错 / 大小写不符 / 非字符串一律非法（供持久化值回退）', () => {
    for (const bad of ['Auto', 'AUTO', 'grey', 'teal-', 'chartreuse', '', 42, null, undefined, {}, []]) {
      expect(isUnderlineColor(bad), String(bad)).toBe(false)
    }
  })
})
