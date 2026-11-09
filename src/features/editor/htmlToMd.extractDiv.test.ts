import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from './htmlToMd'

/**
 * 阶段 3 回归锁：extractDivBlock 线性化后的正确性。
 * 原实现「每块重建字符串 + 从头找配对 div」改成「一次标签扫描 + 栈配对 + 流式构建」，
 * 行为必须逐项对齐：多个块、嵌套 div、非目标 div、未闭合、属性值含特殊字符。
 */
const mathBlock = (latex: string) =>
  `<div data-type="mathBlock" data-latex="${latex.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div>`

describe('htmlToMarkdown · extractDivBlock 线性化', () => {
  it('单个公式块还原为 $$ 块', () => {
    const md = htmlToMarkdown(`<p>前文</p>${mathBlock('E = mc^2')}<p>后文</p>`)
    expect(md).toContain('$$')
    expect(md).toContain('E = mc^2')
  })

  it('多个公式块按顺序全部还原（不丢、不串位）', () => {
    const blocks = Array.from({ length: 12 }, (_, i) => mathBlock(`x_${i} + y_${i}`))
    const html = blocks.map((b, i) => `<p>段落 ${i}</p>${b}`).join('')
    const md = htmlToMarkdown(html)
    for (let i = 0; i < 12; i++) {
      expect(md).toContain(`x_${i} + y_${i}`)
    }
    expect(md.match(/\$\$/g)?.length).toBe(24) // 每块一对 $$
  })

  it('目标块内含嵌套普通 div 时整块替换', () => {
    const html =
      `<div data-type="mathBlock" data-latex="outer"><div><span>nested</span></div></div>` +
      `<p>after</p>`
    const md = htmlToMarkdown(html)
    expect(md).toContain('outer')
    expect(md).toContain('after')
    // 内层内容属于公式块，不应泄漏成正文
    expect(md).not.toContain('nested')
  })

  it('非目标 div 不影响后续公式块配对', () => {
    const html = `<div class="wrapper"><div class="inner">x</div></div>${mathBlock('z')}`
    const md = htmlToMarkdown(html)
    expect(md).toContain('z')
    expect(md).toContain('x')
  })

  it('未闭合的目标块保持原样、不吞掉后续内容', () => {
    const html = `<div data-type="mathBlock" data-latex="broken"><p>之后的正文</p>`
    const md = htmlToMarkdown(html)
    expect(md).toContain('之后的正文')
  })

  it('属性值含 HTML 实体与 > 时不截断', () => {
    const html = `<div data-type="mathBlock" data-latex="a &gt; b &amp; c"></div>`
    const md = htmlToMarkdown(html)
    expect(md).toContain('a > b & c')
  })

  it('无公式块时输出与原实现一致（纯文本往返）', () => {
    const md = htmlToMarkdown('<h1>标题</h1><p>正文 <strong>加粗</strong></p>')
    expect(md).toContain('标题')
    expect(md).toContain('**加粗**')
  })
})
