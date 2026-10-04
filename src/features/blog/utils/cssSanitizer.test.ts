import { describe, it, expect } from 'vitest'
import { sanitizeCssFast, sanitizeCss } from './cssSanitizer'

/**
 * 回归（2026-10-04 代码审查 C3）：自定义 CSS 以 `<style>${sanitizeCssFast(css)}</style>` 注入，
 * 必须消除 `</style>` / `</script>` / `<!--` 等可提前结束 style 元素（或诱发怪异解析）的序列。
 */
describe('cssSanitizer · 闭合标签逃逸', () => {
  it('消除 </style> 逃逸', () => {
    const out = sanitizeCssFast('x{}</style><script>alert(1)</script><style>')
    expect(out.toLowerCase()).not.toContain('</style')
    expect(out.toLowerCase()).not.toContain('</script')
  })

  it('大小写/空白变体同样消除', () => {
    expect(sanitizeCssFast('a{}< / STYLE >b{}').toLowerCase()).not.toContain('</style')
    expect(sanitizeCssFast('a{}</ script>b{}').toLowerCase()).not.toContain('</script')
  })

  it('消除 <!-- 注释序列', () => {
    expect(sanitizeCssFast('a{}<!--b{}')).not.toContain('<!--')
  })

  it('保留正常 CSS 不变', () => {
    const css = '.post{color:#333;background:url(https://x/y.png)}'
    expect(sanitizeCssFast(css)).toBe(css)
  })

  it('既有向量仍被过滤（expression / javascript:）', () => {
    expect(sanitizeCssFast('a{width:expression(alert(1))}')).not.toMatch(/expression\s*\(/i)
    expect(sanitizeCssFast('a{background:url(javascript:alert(1))}')).not.toMatch(/url\s*\(\s*["']?\s*javascript:/i)
  })

  it('sanitizeCss 记录威胁', () => {
    const r = sanitizeCss('x{}</style>')
    expect(r.hasThreats).toBe(true)
    expect(r.sanitized.toLowerCase()).not.toContain('</style')
  })
})
