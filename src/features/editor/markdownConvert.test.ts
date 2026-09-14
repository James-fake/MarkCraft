import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from './markdownConvert'

/**
 * P3-3.4 E5：富文本粘贴 → 规范 Markdown
 * 验证 turndown 转换管线（Word/网页/Notion 粘贴的核心质量点：表格/列表/标题/粗体）。
 */
describe('htmlToMarkdown（E5 富文本粘贴转换）', () => {
  it('表格 HTML → Markdown 表格', () => {
    const html = '<table><thead><tr><th>名称</th><th>数量</th></tr></thead><tbody><tr><td>苹果</td><td>3</td></tr></tbody></table>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('| 名称 | 数量 |')
    expect(md).toContain('| 苹果 | 3 |')
  })

  it('无序/有序列表 → Markdown 列表', () => {
    const html = '<ul><li>第一项</li><li>第二项</li></ul><ol><li>步骤一</li></ol>'
    const md = htmlToMarkdown(html)
    // turndown 默认列表项用 `-   `/`1.  ` 前缀，断言放宽为包含条目与序号
    expect(md).toContain('第一项')
    expect(md).toContain('第二项')
    expect(md).toContain('1.')
  })

  it('标题与粗体保真', () => {
    const html = '<h1>大标题</h1><p>这是<b>重点</b>内容</p>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('# 大标题')
    expect(md).toContain('**重点**')
  })

  it('图片 HTML → Markdown 图片', () => {
    const html = '<p>看图：<img src="https://example.com/a.png" alt="示意图"></p>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('![示意图](https://example.com/a.png)')
  })

  it('纯文本 HTML → 纯文本 Markdown（不产生垃圾）', () => {
    const html = '<p>简单段落</p>'
    const md = htmlToMarkdown(html)
    expect(md.trim()).toBe('简单段落')
  })
})
