import { describe, it, expect, vi, beforeEach } from 'vitest'

// 在模块初始化前 hoist mock 工厂所需的 spy
const { mockHtml2pdf, mockSet, mockFrom, mockOutputPdf } = vi.hoisted(() => ({
  mockHtml2pdf: vi.fn(),
  mockSet: vi.fn(),
  mockFrom: vi.fn(),
  mockOutputPdf: vi.fn(),
}))

vi.mock('html2pdf.js', () => {
  const worker = {
    set: (...a: unknown[]) => { mockSet(...a); return worker },
    from: (...a: unknown[]) => { mockFrom(...a); return worker },
    outputPdf: (...a: unknown[]) => mockOutputPdf(...a),
  }
  return { default: (...a: unknown[]) => { mockHtml2pdf(...a); return worker } }
})

import { generatePdf, buildPdfHtml } from '../exportPdf'

describe('exportPdf（PDF 导出 Bug 修复）', () => {
  beforeEach(() => {
    mockOutputPdf.mockReset()
    mockOutputPdf.mockImplementation(async () =>
      new Blob(['%PDF-1.4 real pdf bytes'], { type: 'application/pdf' }),
    )
    mockSet.mockClear()
    mockFrom.mockClear()
    mockHtml2pdf.mockClear()
  })

  it('generatePdf 返回真实非空的 PDF Blob，且不再调用 window.print()（修复自动打印跳转）', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const blob = await generatePdf('# Hello\n\nWorld', '我的文档.pdf', '出错了', undefined, { includeToc: true })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(mockOutputPdf).toHaveBeenCalledWith('blob')
    // 渲染目标应为离屏 iframe 的内部 body（坐标恒为 0,0），而非 off-screen div，
    // 否则 html2canvas 会把内容排到画布之外导致"白板"PDF。
    const fromArg = mockFrom.mock.calls[0]?.[0] as HTMLElement | undefined
    expect(fromArg?.tagName).toBe('BODY')
    expect(printSpy).not.toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('generatePdf 为空时抛出错误（避免 0KB 文件落盘）', async () => {
    mockOutputPdf.mockImplementation(async () => new Blob([], { type: 'application/pdf' }))
    await expect(
      generatePdf('# x', 'doc.pdf', '空文件提示', undefined, {}),
    ).rejects.toThrow()
  })

  it('buildPdfHtml 包含 Markdown 渲染内容与 TOC 结构', () => {
    const html = buildPdfHtml('# 标题\n\n## 小节 A\n\n正文', undefined, { includeToc: true })
    expect(html).toContain('标题')
    expect(html).toContain('pdf-toc-title')
    expect(html).toContain('toc-heading-1')
    expect(html).toContain('小节 A')
  })

  it('buildPdfHtml 未请求 TOC 时不包含目录内容', () => {
    const html = buildPdfHtml('# 标题', undefined, {})
    expect(html).not.toContain('pdf-toc-title')
    expect(html).not.toContain('toc-heading-')
  })

  it('buildPdfHtml 请求页眉/页脚时注入对应元素', () => {
    const html = buildPdfHtml('# 标题', undefined, {
      headerText: '页眉文本',
      footerText: '页脚文本',
      includePageNumbers: true,
    })
    expect(html).toContain('pdf-header')
    expect(html).toContain('页眉文本')
    expect(html).toContain('pdf-footer')
    expect(html).toContain('页脚文本')
  })

  it('F3 默认注入防跨页断裂 CSS（表格/行/代码/图片不劈断，宽表换行）', () => {
    const html = buildPdfHtml('# 标题', undefined, {})
    expect(html).toContain('page-break-inside: avoid')
    expect(html).toContain('break-inside: avoid')
    expect(html).toContain('table-layout: fixed')
    expect(html).toContain('word-break: break-word')
  })

  it('F3 pageBreakHeadings 开启时 h1/h2 强制分页，默认关闭时 auto', () => {
    const on = buildPdfHtml('# 标题', undefined, { pageBreakHeadings: true })
    expect(on).toContain('page-break-before: always')
    const off = buildPdfHtml('# 标题', undefined, {})
    expect(off).not.toContain('page-break-before: always')
    expect(off).toContain('page-break-before: auto')
  })
})
