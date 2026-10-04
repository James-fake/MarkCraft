import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  escapeAttr,
  escapeCss,
  escapeJsString,
  safeCssUrl,
} from './templateHelpers'

describe('H10 模板转义工具', () => {
  describe('escapeHtml', () => {
    it('转义基础 HTML 元字符', () => {
      expect(escapeHtml(`<img src=x onerror=alert(1)>`)).toBe(
        '&lt;img src=x onerror=alert(1)&gt;',
      )
      expect(escapeHtml(`a&b"c'd`)).toBe('a&amp;b&quot;c&#39;d')
    })
  })

  describe('escapeAttr', () => {
    it('转义属性上下文的引号与尖括号', () => {
      expect(escapeAttr(`"><script>alert(1)</script>`)).toBe(
        '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
      )
    })
  })

  describe('escapeJsString', () => {
    it('转义内联脚本字符串字面量（H10 shareButtons）', () => {
      // 单引号可闭合 writeText('...') 字面量 → 必须被转义
      const payload = `');alert(1)//`
      expect(escapeJsString(payload)).toBe(`\\');alert(1)//`)
    })
    it('转义反斜杠与尖括号（防 </script> 逃逸）', () => {
      expect(escapeJsString(`a\\b<c>`)).toBe('a\\\\b\\u003cc\\u003e')
    })
  })

  describe('escapeCss', () => {
    it('转义 CSS 上下文的括号/分号/引号（防 url() 逃逸与声明注入）', () => {
      const payload = `x);background:red;/*`
      expect(escapeCss(payload)).toBe(`x\\)\\;background:red\\;/*`)
    })
    it('转义尖括号与反斜杠（防 </style> 逃逸）', () => {
      expect(escapeCss(`</style>\\`)).toBe('\\3c /style\\3e \\\\')
    })
  })

  describe('safeCssUrl (H10 seriesTemplate)', () => {
    it('合法 http(s) 路径用单引号包裹，不破坏外层 HTML 双引号属性', () => {
      expect(safeCssUrl('https://example.com/a.jpg')).toBe(
        "url('https://example.com/a.jpg')",
      )
      expect(safeCssUrl('/img/cover.png')).toBe("url('/img/cover.png')")
    })
    it('拒绝 javascript:/file:/data: 非图片 等危险协议', () => {
      expect(safeCssUrl('javascript:alert(1)')).toBe('')
      expect(safeCssUrl('file:///etc/passwd')).toBe('')
      expect(safeCssUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    })
    it('拒绝含引号/括号/分号/空白的值，避免 CSS 与 HTML 双重逃逸', () => {
      expect(safeCssUrl(`x"onload=alert(1)`)).toBe('')
      expect(safeCssUrl(`x);background:red`)).toBe('')
      expect(safeCssUrl(`a b.jpg`)).toBe('')
    })
    it('data:image 允许（base64 不含危险字符）', () => {
      expect(safeCssUrl('data:image/png;base64,AAAA')).toBe(
        "url('data:image/png;base64,AAAA')",
      )
    })
  })
})
