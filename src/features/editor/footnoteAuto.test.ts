/**
 * P2-6 链接转脚注纯函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  nextFootnoteIndex, buildFootnote, ensureReferenceSection,
  appendFootnoteDefinition, pasteUrlAsFootnote, isSingleUrl,
} from './footnoteAuto'

describe('nextFootnoteIndex', () => {
  it('空内容从 1 开始', () => {
    expect(nextFootnoteIndex('')).toBe(1)
  })
  it('取已有最大数字序号 + 1', () => {
    expect(nextFootnoteIndex('[^1]: a\n[^3]: b')).toBe(4)
  })
})

describe('buildFootnote', () => {
  it('构造标记与定义', () => {
    const b = buildFootnote('https://x.com', 2)
    expect(b.marker).toBe('[^2]')
    expect(b.definition).toBe('[^2]: https://x.com')
  })
})

describe('ensureReferenceSection', () => {
  it('缺少参考小节时补上', () => {
    expect(ensureReferenceSection('正文')).toContain('## 参考')
  })
  it('已有参考小节则不重复添加', () => {
    const c = ensureReferenceSection('正文\n\n## 参考\n')
    expect(c.match(/## 参考/g)?.length).toBe(1)
  })
})

describe('appendFootnoteDefinition', () => {
  it('追加定义并补全参考小节', () => {
    const { content, build } = appendFootnoteDefinition('正文', 'https://a.com')
    expect(content).toContain('## 参考')
    expect(content).toContain('[^1]: https://a.com')
    expect(build.index).toBe(1)
  })
  it('已有脚注时序号递增', () => {
    const { build } = appendFootnoteDefinition('[^1]: x', 'https://y.com')
    expect(build.index).toBe(2)
  })
})

describe('pasteUrlAsFootnote', () => {
  it('文末追加引用标记与定义', () => {
    const { content, marker } = pasteUrlAsFootnote('正文段落。', 'https://z.com')
    expect(content).toContain('## 参考')
    expect(content).toContain('[^1]: https://z.com')
    expect(content.trimEnd().endsWith('[^1]')).toBe(true)
    expect(marker).toBe('[^1]')
  })
})

describe('isSingleUrl', () => {
  it('识别单个 URL', () => {
    expect(isSingleUrl('https://example.com')).toBe(true)
    expect(isSingleUrl('http://a.b/c')).toBe(true)
  })
  it('排除非 URL / 多行 / 含空格', () => {
    expect(isSingleUrl('not a url')).toBe(false)
    expect(isSingleUrl('https://a.com\nhttps://b.com')).toBe(false)
    expect(isSingleUrl('just text')).toBe(false)
  })
})
