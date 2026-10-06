import { describe, it, expect } from 'vitest'
import { importHtmlToMarkdown } from '../importHtml'

describe('importHtmlToMarkdown（GFM 保真）', () => {
  it('转换 GFM 表格（此前 turndown 默认会整块丢弃）', () => {
    const html =
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    const md = importHtmlToMarkdown(html)
    expect(md).toContain('| A | B |')
    expect(md).toContain('| 1 | 2 |')
  })

  it('标题转为 ATX 风格', () => {
    expect(importHtmlToMarkdown('<h2>标题</h2>')).toContain('## 标题')
  })

  it('有序/无序列表保留', () => {
    // turndown 列表项为「标记 + 对齐空格」，用宽松匹配
    expect(importHtmlToMarkdown('<ul><li>一</li><li>二</li></ul>')).toMatch(/- +一/)
    expect(importHtmlToMarkdown('<ol><li>一</li></ol>')).toMatch(/1\. +一/)
  })

  it('内联 base64 图片转为 image: 占位符（与粘贴图片同一管线）', () => {
    const md = importHtmlToMarkdown('<img src="data:image/png;base64,AAAA" alt="x">')
    expect(md).toMatch(/!\[x\]\(image:img_\d+\)/)
  })
})
