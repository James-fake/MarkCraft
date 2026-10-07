import { describe, it, expect } from 'vitest'
import { markdownToHtml, htmlToMarkdown } from '../markdownConvert'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

// markdownToHtml 仅用 imageStore 解析图片占位符；PDF 测试无需真实图片库
const mockImageStore = { getBase64Image: () => null } as unknown as ImageStoreAPI

describe('markdownConvert - PDF 内嵌 (C3)', () => {
  it('@[pdf](url) → <div data-type="pdfEmbed" data-src>', () => {
    const html = markdownToHtml('@[pdf](https://example.com/a.pdf)', mockImageStore)
    expect(html).toContain('data-type="pdfEmbed"')
    expect(html).toContain('data-src="https://example.com/a.pdf"')
  })

  it('@[pdf](pdfId) → data-pdf-id', () => {
    const html = markdownToHtml('@[pdf](pdf-abc123)', mockImageStore)
    expect(html).toContain('data-type="pdfEmbed"')
    expect(html).toContain('data-pdf-id="pdf-abc123"')
  })

  it('HTML → MD 往返保留外链', () => {
    const md = htmlToMarkdown('<div data-type="pdfEmbed" data-src="https://example.com/a.pdf"></div>')
    expect(md).toContain('@[pdf](https://example.com/a.pdf)')
  })

  it('HTML → MD 往返保留 pdfId', () => {
    const md = htmlToMarkdown('<div data-type="pdfEmbed" data-pdf-id="pdf-abc123"></div>')
    expect(md).toContain('@[pdf](pdf-abc123)')
  })

  it('完整往返：md → html → md 不丢链接', () => {
    const original = '@[pdf](https://example.com/a.pdf)'
    const html = markdownToHtml(original, mockImageStore)
    const back = htmlToMarkdown(html)
    expect(back).toContain(original)
  })
})
