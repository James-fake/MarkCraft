import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@services/sanitizeHtml'
import { preprocessCustomSyntax } from './customSyntax'
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

/** 预览管线的等价简化：预处理 → marked(+消毒) */
const renderPreview = (md: string) => renderMarkdown(preprocessCustomSyntax(md))

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
