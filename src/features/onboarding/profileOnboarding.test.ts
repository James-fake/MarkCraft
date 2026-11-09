import { describe, it, expect, beforeEach } from 'vitest'
import {
  PROFILE_ONBOARDING_KEY,
  markProfileOnboardingDone,
  shouldShowProfileOnboarding,
} from './profileOnboarding'

beforeEach(() => {
  localStorage.clear()
})

describe('档案引导 · 展示判定', () => {
  it('全新用户（没名字、没标记）→ 展示', () => {
    expect(shouldShowProfileOnboarding({ nickname: '' })).toBe(true)
  })

  it('已经填过名字 → 不打扰（哪怕从没点过「开始吧」）', () => {
    expect(shouldShowProfileOnboarding({ nickname: '小明' })).toBe(false)
  })

  it('只有空白字符的名字不算填过', () => {
    expect(shouldShowProfileOnboarding({ nickname: '   ' })).toBe(true)
  })

  it('点过跳过 → 不再展示', () => {
    markProfileOnboardingDone()
    expect(localStorage.getItem(PROFILE_ONBOARDING_KEY)).toBe('1')
    expect(shouldShowProfileOnboarding({ nickname: '' })).toBe(false)
  })

  it('标记值不是 1 时仍按未完成处理', () => {
    localStorage.setItem(PROFILE_ONBOARDING_KEY, '0')
    expect(shouldShowProfileOnboarding({ nickname: '' })).toBe(true)
  })
})
