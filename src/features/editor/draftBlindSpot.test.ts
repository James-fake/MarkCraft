/**
 * P2-5 成稿核查纯函数测试
 */
import { describe, it, expect } from 'vitest'
import { analyzeDraft } from './draftBlindSpot'

describe('analyzeDraft', () => {
  it('内容过短不分析', () => {
    expect(analyzeDraft('短内容')).toEqual([])
  })

  it('无来源时长文提示信源覆盖', () => {
    const hints = analyzeDraft('这是一篇较长的文章。'.repeat(20))
    expect(hints.some(h => h.type === 'source' && h.severity === 'warn')).toBe(true)
  })

  it('含 URL 视为有来源', () => {
    const hints = analyzeDraft('我们参考了 https://example.com 的论述。' + '正文内容。'.repeat(20))
    expect(hints.some(h => h.type === 'source')).toBe(false)
  })

  it('含脚注定义视为有来源', () => {
    const hints = analyzeDraft('观点来自研究[^1]。' + '正文。'.repeat(20) + '\n\n[^1]: 出处说明')
    expect(hints.some(h => h.type === 'source')).toBe(false)
  })

  it('绝对化表述触发 claim 提示', () => {
    const hints = analyzeDraft('这个方法绝对是最好的，所有团队都应该使用。' + '正文。'.repeat(20))
    const claim = hints.find(h => h.type === 'claim')
    expect(claim).toBeTruthy()
    expect(claim!.message).toContain('2 处')
  })

  it('无平衡论述触发 balance 提示', () => {
    const hints = analyzeDraft('我们非常赞同这个观点，它完全正确。' + '正文。'.repeat(20))
    expect(hints.some(h => h.type === 'balance')).toBe(true)
  })

  it('含平衡论述且不绝对化且无来源时只提示信源', () => {
    const hints = analyzeDraft(
      '一方面这个方法有效，然而也存在局限。' + '正文。'.repeat(20)
    )
    expect(hints.some(h => h.type === 'balance')).toBe(false)
    expect(hints.some(h => h.type === 'claim')).toBe(false)
    expect(hints.some(h => h.type === 'source')).toBe(true)
  })
})
