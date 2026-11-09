import { describe, it, expect } from 'vitest'
import { wrapHtml } from './htmlWrapper'
import { DEFAULT_BLOG_CONFIG } from './types'

/**
 * 回归锁（2026-11-08 审查 C 组）：
 * - mermaid 配了 `securityLevel:'strict'` 却又 `htmlLabels:true`（strict 下会被禁用），
 *   配置自相矛盾、导出站点图表可能退化；
 * - `r.svg` 未二次净化，直接 `innerHTML` 注入。
 * 修复：strict 下显式 `htmlLabels:false`；SVG 走 DOMPurify（foreignObject 占位保护）。
 */
describe('htmlWrapper · mermaid 配置一致性与 SVG 净化（回归 2026-11-08）', () => {
  const withMermaid = wrapHtml('标题', '<p>正文</p>', DEFAULT_BLOG_CONFIG, undefined, undefined, true)

  it('strict 下不再声明 htmlLabels:true，避免配置自相矛盾', () => {
    expect(withMermaid).toContain("securityLevel: 'strict'")
    expect(withMermaid).not.toContain('htmlLabels: true')
    expect(withMermaid).toContain('htmlLabels: false')
  })

  it('渲染结果经 DOMPurify 二次净化，且 foreignObject 有占位保护', () => {
    expect(withMermaid).toContain('dompurify')
    expect(withMermaid).toContain('sanitizeSvg(r.svg)')
    expect(withMermaid, '不得再直接注入 mermaid 原始 SVG').not.toContain('d.innerHTML=r.svg')
    expect(withMermaid).toContain('foreignObject')
  })

  it('生成的 mermaid 内联脚本语法有效（正则/占位符转义正确）', () => {
    const scripts = [...withMermaid.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    const mermaidScript = scripts.find((s) => s.includes('mermaid.initialize'))
    expect(mermaidScript, '必须注入 mermaid 初始化脚本').toBeTruthy()
    expect(() => new Function(mermaidScript as string)).not.toThrow()
  })

  it('非 mermaid 页面不注入 mermaid / DOMPurify 脚本', () => {
    const plain = wrapHtml('标题', '<p>正文</p>', DEFAULT_BLOG_CONFIG)
    expect(plain).not.toContain('mermaid.initialize')
    expect(plain).not.toContain('dompurify')
  })
})
