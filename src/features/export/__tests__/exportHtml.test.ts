import { describe, it, expect } from 'vitest'
import { generateHtmlBlob } from '../utils/exportHtml'

const MD = '# Hello\n\nSome content.\n\n## Sub\n\nMore.'

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('generateHtmlBlob - 结构化模板 (F2)', () => {
  it('默认无模板：标题为 Exported Document 且不渲染 header', async () => {
    const blob = await generateHtmlBlob(MD)
    const html = await readBlob(blob)
    expect(html).toContain('<title>Exported Document</title>')
    expect(html).not.toContain('<header class="export-header">')
    expect(html).toContain('id="hello"')
  })

  it('自定义标题/作者/日期：渲染 header 与 meta', async () => {
    const blob = await generateHtmlBlob(MD, undefined, {
      title: '我的文档',
      author: '张三',
      date: '2026-07-31',
    })
    const html = await readBlob(blob)
    expect(html).toContain('<title>我的文档</title>')
    expect(html).toContain('<header class="export-header">')
    expect(html).toContain('<span class="export-author">')
    expect(html).toContain('张三')
    expect(html).toContain('2026-07-31')
  })

  it('包含目录：生成 TOC 且锚点对应 heading id', async () => {
    const blob = await generateHtmlBlob(MD, undefined, { toc: true })
    const html = await readBlob(blob)
    expect(html).toContain('<nav class="export-toc"')
    expect(html).toContain('href="#hello"')
    expect(html).toContain('href="#sub"')
    expect(html).toContain('id="hello"')
    expect(html).toContain('id="sub"')
  })

  it('用户文本被 HTML 转义以防注入', async () => {
    const blob = await generateHtmlBlob(MD, undefined, {
      title: '<script>alert(1)</script>',
      author: '<img src=x onerror=1>',
    })
    const html = await readBlob(blob)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<img src=x onerror=1>')
  })

  it('仅 footer：渲染 footer 容器', async () => {
    const blob = await generateHtmlBlob(MD, undefined, { footer: '版权所有' })
    const html = await readBlob(blob)
    expect(html).toContain('<footer class="export-footer">')
    expect(html).toContain('版权所有')
  })

  it('自定义 CSS 透传并生效', async () => {
    const blob = await generateHtmlBlob(MD, 'body { color: red; }', { title: 'T' })
    const html = await readBlob(blob)
    expect(html).toContain('body { color: red; }')
  })
})
