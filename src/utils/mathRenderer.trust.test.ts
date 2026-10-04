import { describe, it, expect } from 'vitest'
import { renderMathInHtml } from './mathRenderer'

/**
 * 回归（2026-10-04 代码审查 C2）：KaTeX `trust` 不得放行任意协议。
 * 此前 `trust: true` 使 `\href{javascript:…}` 生成可点击的 javascript: 链接，
 * 且该输出直接进入预览 DOM（不再二次净化）→ 存储型 XSS。
 *
 * 说明：拒绝时 KaTeX 把 `\href` 渲染为红色错误文本；原始 TeX 源码仍会出现在
 * MathML 的 <annotation> 文本节点里（非链接、不执行），故断言只针对 href 属性。
 */
describe('mathRenderer · trust 协议白名单', () => {
  it('拒绝 javascript: 协议（不产出 javascript: 链接）', () => {
    const html = renderMathInHtml('$\\href{javascript:alert(1)}{x}$')
    expect(html.toLowerCase()).not.toMatch(/href\s*=\s*["']?javascript:/)
  })

  it('拒绝 data: 协议', () => {
    const html = renderMathInHtml('$\\href{data:text/html,x}{x}$')
    expect(html.toLowerCase()).not.toMatch(/href\s*=\s*["']?data:/)
  })

  it('放行 https 链接', () => {
    const html = renderMathInHtml('$\\href{https://example.com}{x}$')
    expect(html).toMatch(/href\s*=\s*["']https:\/\/example\.com["']/)
  })
})
