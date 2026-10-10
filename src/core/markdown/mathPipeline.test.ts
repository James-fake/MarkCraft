import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@services/sanitizeHtml'
import { renderMathInHtml } from '@utils/mathRenderer'
import { needsMathRenderHtml } from '@hooks/useMathRender'
import {
  preprocessCustomSyntax,
  extractMathPlaceholders,
  restorePlaceholders,
  unwrapLatexPlaceholders,
} from './customSyntax'

/**
 * 回归锁（2026-10-11 真实事故）：块级公式在所见即所得里正常，切到**源码/预览却显示
 * `$$\n\sqrt{}\n$$` 原文**。
 *
 * 根因有两层，缺一层都修不好：
 *  ① 预览管线**没有把公式抽成占位符**就交给 marked，而该管线用 `breaks: true` ——
 *     实测 `$$\n\sqrt{2}\n$$` 到 KaTeX 手里变成 `\sqrt{2}` 夹着 `&lt;br&gt;`，渲染成垃圾。
 *  ② `useMathRender` 的触发闸门只认 `katex-*-wrapper`（Tiptap 内核产出的标记），
 *     预览产出的是 `data-type="mathBlock"` 占位 HTML —— 闸门直接早返回，压根不渲染；
 *     而这个形态**只有 Tiptap 认识**，预览拿到的是空 div（公式直接消失）。
 */
const renderPreview = (md: string): string => {
  const placeholders: string[] = []
  const html = restorePlaceholders(
    renderMarkdown(extractMathPlaceholders(preprocessCustomSyntax(md), placeholders)),
    placeholders,
  )
  return html
}

/** 预览里实际渲染公式的那一步（与 useMathRender 内部一致） */
const renderMath = (html: string) => renderMathInHtml(unwrapLatexPlaceholders(html))

describe('块级公式 · 预览管线', () => {
  it('用户报障的形态 $$\\n\\sqrt{2}\\n$$ 必须渲染成 KaTeX（不能留原文，也不能消失）', () => {
    const md = '前文\n\n$$\n\\sqrt{2}\n$$\n\n后文'
    const html = renderPreview(md)

    // ① 公式内容必须干净：不能被 marked 的 breaks 塞进 <br>
    expect(html, '公式内容被 <br> 污染').not.toContain('<br>')
    expect(html).toContain('data-type="mathBlock"')
    expect(html).toContain('\\sqrt{2}')

    // ② 必须触发渲染，且最终产出 KaTeX
    expect(needsMathRenderHtml(html), '必须触发 KaTeX 渲染').toBe(true)
    const out = renderMath(html)
    expect(out).toContain('katex')
    expect(out, '不得残留 $$ 原文').not.toContain('$$')
  })

  it('行内公式 $...$ 同理', () => {
    const html = renderPreview('圆的面积 $\\pi r^2$ 很好记')
    expect(html).toContain('data-type="mathInlineNode"')
    expect(needsMathRenderHtml(html)).toBe(true)
    const out = renderMath(html)
    expect(out).toContain('katex')
    expect(out).not.toContain('$')
  })

  it('普通美元符号不误触发（不把「$100 和 $200」当公式）', () => {
    const html = renderMarkdown('价格是 $100 和 $200')
    expect(needsMathRenderHtml(html)).toBe(false)
  })

  it('占位符回填：marked 包进 <p> 的情况也要能还原', () => {
    const ph: string[] = []
    const html = restorePlaceholders(renderMarkdown(extractMathPlaceholders('$$\nE=mc^2\n$$', ph)), ph)
    expect(html).not.toContain('MATHBLOCKPLACEHOLDER')
    expect(html).toContain('data-type="mathBlock"')
  })

  it('解包时换行实体要还原（否则多行公式会变成一行）', () => {
    const wrapped = '<div data-type="mathBlock" data-latex="a&#10;b"></div>'
    const unwrapped = unwrapLatexPlaceholders(wrapped)
    expect(unwrapped).toBe('$$a\nb$$')
  })
})
