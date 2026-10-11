import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@services/sanitizeHtml'
import { preprocessCustomSyntax, preprocessImageAttrs } from './customSyntax'
import { markdownToHtml } from '@features/editor/mdToHtml'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 回归锁（2026-10-10 真实事故）：所见即所得里下划线/高亮正常，**切到预览却原样显示**
 * `++文本|red++` / `==文本|red==`。
 *
 * 成因：预览走的是另一条管线（`hooks/useMarkdownRenderer` → marked），
 * 而 marked 不认识本项目的方言 —— 必须先经 `preprocessCustomSyntax` 预处理。
 * 本文件同时锁「预览与所见即所得共用同一份规则」（单一来源）。
 */
const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

/** 预览管线的等价简化：图片属性 → 自定义语法 → marked(+消毒)（与 useMarkdownRenderer 同序） */
const renderPreview = (md: string) => renderMarkdown(preprocessCustomSyntax(preprocessImageAttrs(md)))

describe('自定义语法预处理 · 预览管线', () => {
  it('下划线（指定色）：不再原样显示 ++…|red++，且带 text-decoration-color', () => {
    const html = renderPreview('前 ++重点|red++ 后')
    expect(html, '不得残留原始语法').not.toContain('++')
    expect(html).toContain('<u')
    expect(html).toContain('data-underline-color="red"')
    expect(html, '颜色必须落到内联样式上（预览侧没有 data-* 的 CSS）').toContain(
      'text-decoration-color',
    )
  })

  it('高亮（指定色）：不再原样显示 ==…|red==，且带 background-color', () => {
    const html = renderPreview('前 ==重点|red== 后')
    expect(html).not.toContain('==')
    expect(html).toContain('<mark')
    expect(html).toContain('data-highlight-color="red"')
    expect(html).toContain('background-color')
  })

  it('最短形态（不带色）也能渲染，且 auto 下划线不写死颜色', () => {
    expect(renderPreview('++重点++')).toMatch(/<u[^>]*>重点<\/u>/)
    expect(renderPreview('++重点++')).not.toContain('text-decoration-color')
    expect(renderPreview('==重点==')).toMatch(/<mark[^>]*>重点<\/mark>/)
  })

  it('消毒器不得剥掉 style（否则颜色白给）', () => {
    const html = renderPreview('++重点|red++')
    expect(html, 'style 被 DOMPurify 剥掉会让预览没颜色').toMatch(/style="[^"]*text-decoration/)
  })

  it('与所见即所得产出同形（单一来源）：两边都不含原始语法', () => {
    const md = '前 ++下划线|red++ 中 ==高亮|blue== 后'
    const wysiwyg = markdownToHtml(md, noopImageStore)
    const preview = renderPreview(md)
    for (const out of [wysiwyg, preview]) {
      expect(out).not.toContain('++')
      expect(out).not.toContain('==')
      expect(out).toContain('data-underline-color="red"')
      expect(out).toContain('data-highlight-color="blue"')
    }
  })
})

/**
 * 回归锁（2026-10-11 真实事故）：所见即所得插入图片正常，切源码正常，
 * **切到预览 / 再切回所见即所得 → 图片变乱码**。
 *
 * 成因：`preprocessCustomSyntax` 把语法规则套在**整段 markdown** 上，
 * 而 base64 data URL 的字母表含 `+`（尾部还有 `=`）——`++…++` 会被下划线规则
 * 误当成 `++text++` 改写成 `<u>…</u>`，`==…==` 会被高亮规则改写，
 * 于是 URL 被撕碎。修复：跑规则前先把 URL 目标抽成占位，规则只作用于正文。
 */
describe('自定义语法预处理 · 不得破坏 URL（回归 2026-10-11）', () => {
  // 含 `++` 与尾部 `==` 的 base64 片段
  const b64 = 'iVBORw0KGgoAA++BBBB++CCCC=='
  const imgMd = `![img](data:image/png;base64,${b64})`

  it('base64 含 ++ 的图片 URL 不被下划线规则改写（整段原样返回）', () => {
    const out = preprocessCustomSyntax(imgMd)
    expect(out, 'URL 必须逐字保留').toBe(imgMd)
    expect(out).not.toContain('<u>')
  })

  it('预览管线：base64 图片 URL 原样出现在渲染结果中', () => {
    const html = renderMarkdown(preprocessCustomSyntax(imgMd))
    expect(html).toContain(b64)
    expect(html, '不得把 ++ 变成 <u>').not.toContain('<u>')
  })

  it('所见即所得管线：base64 图片 URL 也不被改写', () => {
    const html = markdownToHtml(imgMd, noopImageStore)
    expect(html).toContain(b64)
    expect(html).not.toContain('<u>')
  })

  it('markdown 链接目的地含 ++ 时不被改写', () => {
    const md = '[x](https://example.com/++p++/q)'
    expect(preprocessCustomSyntax(md)).toBe(md)
  })

  it('URL 被保护的同时，正文里的自定义语法仍照常生效', () => {
    const md = `前 ++重点++ ${imgMd} 后 ==高亮==`
    const out = preprocessCustomSyntax(md)
    expect(out, '正文下划线/高亮仍生效').toContain('<u')
    expect(out).toContain('<mark')
    expect(out, 'URL 不受影响').toContain(b64)
  })
})

/**
 * 回归锁（2026-10-11 真实事故）：所见即所得里对图片**靠左/靠右/放大缩小**有效，
 * 切到预览**毫无效果**，且图片下方**原样显示** `{align="left"}` 之类的参数。
 *
 * 成因：图片属性语法 `![alt](src){width align}` 只在所见即所得管线（`mdToHtml`）
 * 经 `preprocessImageAttrs` 转成 HTML，**预览管线漏调**，于是 marked 把 `{…}` 当普通文本。
 * 修复：`preprocessImageAttrs` 下沉到 `customSyntax`（单一来源），两条管线共用。
 */
describe('图片属性语法 · 预览与所见即所得共用（回归 2026-10-11）', () => {
  const md = '![图](https://a.com/x.png){width="200" align="left"}'

  it('preprocessImageAttrs：产出带对齐与宽度的 HTML，且不残留 {…}', () => {
    const out = preprocessImageAttrs(md)
    expect(out).toContain('data-align="left"')
    expect(out).toContain('text-align: left')
    expect(out).toContain('width="200"')
    expect(out, '不得残留属性花括号').not.toContain('{')
  })

  it('预览管线：不再原样显示 {align="left"}，且对齐/宽度生效', () => {
    const html = renderPreview(md)
    expect(html, '属性必须被消费、不能当文本显示').not.toContain('{align')
    expect(html).toContain('data-align="left"')
    expect(html).toContain('width="200"')
  })

  it('所见即所得管线：与预览同形（单一来源）', () => {
    const html = markdownToHtml(md, noopImageStore)
    expect(html).not.toContain('{align')
    expect(html).toContain('data-align="left"')
  })

  it('无属性的普通图片不受影响', () => {
    const plain = '![图](https://a.com/x.png)'
    expect(preprocessImageAttrs(plain)).toBe(plain)
  })
})
