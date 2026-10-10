import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@services/sanitizeHtml'
import { renderMathInHtml } from '@utils/mathRenderer'
import { needsMathRenderHtml } from '@hooks/useMathRender'
import { preprocessCustomSyntax, extractMathPlaceholders, restorePlaceholders, unwrapLatexPlaceholders } from '@core/markdown/customSyntax'

const preview = (md: string) => {
  const ph: string[] = []
  return restorePlaceholders(renderMarkdown(extractMathPlaceholders(preprocessCustomSyntax(md), ph)), ph)
}

describe('用户原例：空根号', () => {
  it('$$\\n\\sqrt{}\\n$$ —— 不留原文、不崩、给出可见的 KaTeX 结果', () => {
    const md = '$$\n\\sqrt{}\n$$\n'
    const html = preview(md)
    console.log('HTML>>', html.replace(/\n/g, '\\n'))
    expect(html, '不得残留原文').not.toContain('$$')
    expect(needsMathRenderHtml(html), '必须触发渲染').toBe(true)
    const out = renderMathInHtml(unwrapLatexPlaceholders(html))
    console.log('OUT>>', out.slice(0, 300).replace(/\n/g, '\\n'))
    expect(out, 'KaTeX 至少应产出 wrapper（正常或错误态）').toMatch(/katex-(display|error)-wrapper/)
    expect(out).not.toContain('$$')
  })
})
