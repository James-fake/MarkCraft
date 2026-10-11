import { describe, it, expect } from 'vitest'
import { sanitizeMermaidSvg } from './mermaidCache'

/**
 * 回归锁（2026-10-11 用户报障）：**预览里思维导图只画出了框和连线，一个字都没有**。
 *
 * 根因：DOMPurify 的 svg profile 会把 `<foreignObject>` **连内容一起**剥掉，
 * 而 mermaid 的 HTML 标签（flowchart / mindmap 节点文字）正放在 `<foreignObject>` 里
 * → 只剩形状、文字全丢。修法：消毒前把 foreignObject 整块抽成占位、消毒后原样放回。
 */
const mindmapSvg =
  '<svg xmlns="http://www.w3.org/2000/svg"><g class="mindmap-node"><path d="M0 0h10v10H0z"/><foreignObject width="40" height="20"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"><p>中心主题</p></span></div></foreignObject></g></svg>'

describe('sanitizeMermaidSvg（思维导图文字回归锁）', () => {
  it('保留 foreignObject 里的节点文字（否则只剩框没有字）', () => {
    const out = sanitizeMermaidSvg(mindmapSvg)
    expect(out, '节点文字必须保留').toContain('中心主题')
    expect(/foreignObject/i.test(out), 'foreignObject 必须保留').toBe(true)
    expect(out, '形状也要在').toContain('<path')
  })

  it('普通 SVG（无 foreignObject）照常消毒', () => {
    const plain = '<svg xmlns="http://www.w3.org/2000/svg"><text x="1" y="2">PLAIN</text></svg>'
    const out = sanitizeMermaidSvg(plain)
    expect(out).toContain('PLAIN')
  })

  it('仍剥离 <script> / on* / javascript: 链接（安全底线）', () => {
    const evil =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g><a onclick="alert(2)" href="javascript:alert(3)"><text>x</text></a></g></svg>'
    const out = sanitizeMermaidSvg(evil)
    expect(out.includes('<script')).toBe(false)
    expect(/onclick/i.test(out)).toBe(false)
    expect(/javascript:/i.test(out)).toBe(false)
  })
})
