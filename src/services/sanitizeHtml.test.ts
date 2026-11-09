import { describe, it, expect } from 'vitest'
import { sanitizeRawHtml } from './sanitizeHtml'

/**
 * H-5 回归：sanitizeRawHtml 是「笔记原始 HTML / data-html 值」注入 DOM 前的唯一闸门
 * （RawHtmlBlock.ts:47）。下面带「反例」标注的用例在修复前会失败：旧配置会原样保留
 * srcdoc（内联文档里的 onerror/script 可执行）与用户可控的 sandbox="allow-same-origin"。
 */
describe('sanitizeRawHtml — H-5 script-execution surface', () => {
  it('keeps legitimate iframe embeds with src, forcing a safe sandbox', () => {
    const out = sanitizeRawHtml('<iframe src="https://example.com/demo" width="600"></iframe>')
    expect(out).toContain('<iframe')
    expect(out).toContain('src="https://example.com/demo"')
    expect(out).toContain('sandbox="allow-scripts"')
    expect(out).not.toContain('allow-same-origin')
  })

  it('[反例] strips srcdoc entirely — inline document may carry onerror/onload script', () => {
    const out = sanitizeRawHtml('<iframe srcdoc="<img src=x onerror=alert(1)>"></iframe>')
    expect(out).not.toContain('srcdoc')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert(')
    expect(out).toContain('sandbox="allow-scripts"')
  })

  it('[反例] overrides user-supplied sandbox — never allows allow-same-origin', () => {
    const out = sanitizeRawHtml(
      '<iframe src="https://example.com" sandbox="allow-scripts allow-same-origin"></iframe>',
    )
    expect(out).not.toContain('allow-same-origin')
    expect(out).toContain('sandbox="allow-scripts"')
  })

  it('[反例] neutralises the report vector: srcdoc <script> + allow-same-origin sandbox', () => {
    const out = sanitizeRawHtml(
      '<iframe srcdoc="<script>alert(1)</script>" sandbox="allow-scripts allow-same-origin"></iframe>',
    )
    expect(out).not.toContain('srcdoc')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('allow-same-origin')
    expect(out).toContain('sandbox="allow-scripts"')
  })

  it('still strips <script> and on* handlers, keeps benign rich HTML', () => {
    const out = sanitizeRawHtml(
      '<details><summary>x</summary><b onclick="alert(1)">hi</b><script>bad()</script></details>',
    )
    expect(out).toContain('<details>')
    expect(out).toContain('<b>hi</b>')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('<script')
  })

  it('[反例] data-html value re-sanitised at RawHtmlBlock.ts:47 cannot reintroduce srcdoc/same-origin', () => {
    const malicious =
      '<iframe srcdoc="<img src=x onerror=alert(1)>" sandbox="allow-scripts allow-same-origin"></iframe>'
    // mdToHtml.ts:261 用 escapeHtmlAttr 把原始 HTML 转义后放进 data-html；
    // RawHtmlBlock 读回的是 HTML 解析后已解码的属性值（node.attrs.html）。
    const escaped = malicious
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const probe = document.createElement('div')
    probe.innerHTML = `<div data-raw-html="true" data-html="${escaped}"></div>`
    const dataHtml = probe.querySelector('div')?.getAttribute('data-html') ?? ''
    expect(dataHtml).toContain('iframe') // 恶意载荷确实到达二次净化入口
    expect(dataHtml).toContain('srcdoc')

    // RawHtmlBlock.ts:47 的实际调用：dom.innerHTML = sanitizeRawHtml(node.attrs.html)
    const dom = document.createElement('div')
    dom.innerHTML = sanitizeRawHtml(dataHtml)
    const iframe = dom.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.hasAttribute('srcdoc')).toBe(false)
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts')
    expect(dom.innerHTML).not.toContain('allow-same-origin')
  })
})
