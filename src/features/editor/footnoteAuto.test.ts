/**
 * P2-6 链接转脚注纯函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  nextFootnoteIndex, buildFootnote, ensureReferenceSection,
  appendFootnoteDefinition, pasteUrlAsFootnote, isSingleUrl,
  normalizeDoi, parseRefLine, parsePastedRefs, pasteRefsAsFootnotes,
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
  it('缺少参考小节时补上（统一 ## 参考文献）', () => {
    expect(ensureReferenceSection('正文')).toContain('## 参考文献')
  })
  it('已有参考文献小节则不重复添加', () => {
    const c = ensureReferenceSection('正文\n\n## 参考文献\n')
    expect(c.match(/## 参考文献/g)?.length).toBe(1)
  })
})

describe('appendFootnoteDefinition', () => {
  it('追加定义并补全参考小节', () => {
    const { content, build } = appendFootnoteDefinition('正文', 'https://a.com')
    expect(content).toContain('## 参考文献')
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
    expect(content).toContain('## 参考文献')
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

describe('normalizeDoi', () => {
  it('doi: 前缀归一为 https://doi.org/...', () => {
    expect(normalizeDoi('doi:10.1000/xyz')).toBe('https://doi.org/10.1000/xyz')
  })
  it('裸 DOI 10.x/ 归一', () => {
    expect(normalizeDoi('10.1145/3292500.3330701')).toBe('https://doi.org/10.1145/3292500.3330701')
  })
  it('普通 URL 原样返回', () => {
    expect(normalizeDoi('https://example.com')).toBe('https://example.com')
  })
})

describe('parseRefLine', () => {
  it('识别裸 URL', () => {
    expect(parseRefLine('https://a.com')).toEqual({ title: '', url: 'https://a.com' })
  })
  it('识别 标题 + URL 形式并拆分标题', () => {
    expect(parseRefLine('一篇好文 https://a.com')).toEqual({ title: '一篇好文', url: 'https://a.com' })
  })
  it('识别 markdown 链接 [标题](url)', () => {
    expect(parseRefLine('[标题](https://a.com)')).toEqual({ title: '标题', url: 'https://a.com' })
  })
  it('识别 DOI', () => {
    expect(parseRefLine('10.1000/xyz')).toEqual({ title: '', url: 'https://doi.org/10.1000/xyz' })
  })
  it('无 URL 行返回 null', () => {
    expect(parseRefLine('随便写点文字')).toBeNull()
  })
})

describe('parsePastedRefs', () => {
  it('多行批量解析，跳过空行与无 URL 行', () => {
    const text = [
      '论文A https://a.com',
      '',
      '随便文字不解析',
      '论文B https://b.com',
    ].join('\n')
    expect(parsePastedRefs(text)).toHaveLength(2)
    expect(parsePastedRefs(text)[0]).toEqual({ title: '论文A', url: 'https://a.com' })
  })
})

describe('pasteRefsAsFootnotes', () => {
  it('多行粘贴追加到 ## 参考文献 并回传引用标记（空格连接）', () => {
    const { content, markers } = pasteRefsAsFootnotes('正文。', '论文A https://a.com\n论文B https://b.com')
    expect(content).toContain('## 参考文献')
    expect(content).toContain('[^1]: [论文A](https://a.com)')
    expect(content).toContain('[^2]: [论文B](https://b.com)')
    expect(markers).toBe('[^1] [^2]')
  })
  it('无 URL 时原样返回', () => {
    const { content, markers } = pasteRefsAsFootnotes('正文。', '无链接文字')
    expect(content).toBe('正文。')
    expect(markers).toBe('')
  })
})
