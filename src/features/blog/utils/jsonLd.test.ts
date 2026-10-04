import { describe, it, expect } from 'vitest'
import { safeJsonLd } from './jsonLd'

/**
 * 回归（2026-10-04 代码审查 C5）：JSON-LD 内联进 <script type="application/ld+json"> 时，
 * 用户可控字段不得提前闭合脚本块。
 */
describe('safeJsonLd', () => {
  it('转义 </script> 防止脚本块逃逸', () => {
    const out = safeJsonLd({ headline: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('\\u003c')
  })

  it('转义 < > &', () => {
    const out = safeJsonLd({ a: '<b>&</b>' })
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).not.toContain('&')
  })

  it('仍可被 JSON.parse 还原为等价对象', () => {
    const original = { headline: '</script>', n: 1, nested: { x: '<a>' } }
    expect(JSON.parse(safeJsonLd(original))).toEqual(original)
  })
})
