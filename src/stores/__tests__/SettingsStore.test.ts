import { describe, it, expect } from 'vitest'
import { applyAudienceDefaults } from '../SettingsStore'

describe('applyAudienceDefaults (P0-3 首启默认收口)', () => {
  it('writer 返回受众与大纲开启', () => {
    expect(applyAudienceDefaults('writer')).toEqual({ audience: 'writer', outlineVisible: true })
  })

  it('blogger 返回受众与大纲开启', () => {
    expect(applyAudienceDefaults('blogger')).toEqual({ audience: 'blogger', outlineVisible: true })
  })

  it('student 返回受众与大纲开启', () => {
    expect(applyAudienceDefaults('student')).toEqual({ audience: 'student', outlineVisible: true })
  })

  it('边界：null 返回空对象，不改变任何设置', () => {
    expect(applyAudienceDefaults(null)).toEqual({})
  })

  it('边界：未知字符串返回空对象', () => {
    // @ts-expect-error 测试非法输入
    expect(applyAudienceDefaults('unknown')).toEqual({})
  })

  it('边界：空字符串返回空对象', () => {
    // @ts-expect-error 测试非法输入
    expect(applyAudienceDefaults('')).toEqual({})
  })
})
