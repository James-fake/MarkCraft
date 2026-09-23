import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, markdownToHtml } from './markdownConvert'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import { HIGHLIGHT_COLOR_OPTIONS } from '@features/editor/extensions/highlightColors'

/** 高亮往返只关心文本管线，图片存储给个最小桩即可 */
const noopImageStore = { getBase64Image: () => null } as unknown as ImageStoreAPI

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

/**
 * 高亮（==文本== / ==文本|颜色==）Markdown 往返。
 *
 * 背景：调色板由 5 色扩到 16 色后，色名里出现了 **连字符** 形态
 * （deep-orange / light-blue / deep-purple / light-green）。旧的 `\w+` 正则
 * 不匹配连字符 ⇒ 这些颜色会**退化成默认黄**（用户挑的是深橙、落盘却是黄），
 * 且往返一次再也读不回来。本组用例锁住两侧正则。
 */
describe('高亮色名 Markdown 往返', () => {
  it('默认黄：==文本== ⇄ <mark>', () => {
    expect(markdownToHtml('==重点==', noopImageStore)).toContain('<mark>重点</mark>')
    expect(htmlToMarkdown('<p><mark>重点</mark></p>').trim()).toBe('==重点==')
  })

  it('指定色：==文本|red== ⇄ <mark data-highlight-color="red">', () => {
    expect(markdownToHtml('==重点|red==', noopImageStore)).toContain('data-highlight-color="red"')
    expect(htmlToMarkdown('<p><mark data-highlight-color="red">重点</mark></p>').trim()).toBe('==重点|red==')
  })

  it('连字符色名不丢色（deep-orange / light-blue / deep-purple / light-green）', () => {
    for (const color of ['deep-orange', 'light-blue', 'deep-purple', 'light-green']) {
      const html = markdownToHtml(`==重点|${color}==`, noopImageStore)
      expect(html, `${color} → html`).toContain(`data-highlight-color="${color}"`)
      expect(html, `${color} 不应退化成默认黄`).not.toMatch(/<mark>重点<\/mark>/)

      const md = htmlToMarkdown(`<p><mark data-highlight-color="${color}">重点</mark></p>`).trim()
      expect(md, `${color} → md`).toBe(`==重点|${color}==`)
    }
  })

  it('全 16 色逐一往返不失真（yellow 归一化为无后缀形态）', () => {
    for (const color of HIGHLIGHT_COLOR_OPTIONS) {
      const md = `==重点|${color}==`
      // 解析侧：显式写了 |yellow 也要能读出色属性，不能吞掉
      expect(markdownToHtml(md, noopImageStore), color).toContain(`data-highlight-color="${color}"`)
      // 回写侧：yellow 是默认色，Turndown 规则刻意归一化为最短形态 `==文本==`
      // （历史文档里两种写法并存，统一成短形态才不会每次编辑都改 diff）
      const expectedMd = color === 'yellow' ? '==重点==' : md
      const back = htmlToMarkdown(`<p><mark data-highlight-color="${color}">重点</mark></p>`).trim()
      expect(back, color).toBe(expectedMd)
    }
  })

  it('颜色名大小写不敏感形态不误判（未知色名仍按连字符词吃掉，不污染正文）', () => {
    // 未知色名不是本层的职责（合法性由 features 层 isHighlightColor 校验），
    // 但至少要保证「解析不崩、不把 |xxx== 漏进正文」。
    const html = markdownToHtml('==重点|not-a-color==', noopImageStore)
    expect(html).toContain('not-a-color')
    expect(html).not.toContain('==')
  })
})
