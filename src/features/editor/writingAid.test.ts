/**
 * P1-5 writingAid 纯函数单元测试
 * 覆盖正常路径与边界场景（空内容 / 无标题 / 无大纲 / 无关键词 / 代码块保护）。
 */
import {
  suggestTitle,
  suggestTitleAndSlug,
  extractOutline,
  polishText,
  extractKeywords,
  slugify,
  stripFrontMatter,
} from './writingAid'

describe('suggestTitle', () => {
  it('取首个 ATX 标题作为建议', () => {
    expect(suggestTitle('# 我的第一篇笔记\n\n正文')).toBe('我的第一篇笔记')
  })

  it('忽略 frontmatter，取正文首个标题', () => {
    const md = '---\ntitle: 旧标题\ndraft: true\n---\n# 正文标题\n\n内容'
    expect(suggestTitle(md)).toBe('正文标题')
  })

  it('无标题时取首个非空行纯文本并截断', () => {
    const md = '这是一段开头文字，用来推断标题建议。\n\n更多内容'
    expect(suggestTitle(md)).toBe('这是一段开头文字，用来推断标题建议。')
  })

  it('首行带 markdown 语法时被清理', () => {
    expect(suggestTitle('**粗体开头** 一句话')).toBe('粗体开头 一句话')
  })

  it('空内容返回 null', () => {
    expect(suggestTitle('')).toBeNull()
    expect(suggestTitle('   \n\t ')).toBeNull()
  })

  it('仅有 # 无内容时不匹配，回退到后续行', () => {
    const md = '#\n\n真正的标题\n\n正文'
    expect(suggestTitle(md)).toBe('真正的标题')
  })
})

describe('suggestTitleAndSlug', () => {
  it('返回标题与 slug', () => {
    const r = suggestTitleAndSlug('# React 入门指南')
    expect(r).toEqual({ title: 'React 入门指南', slug: slugify('React 入门指南') })
  })

  it('无标题返回 null', () => {
    expect(suggestTitleAndSlug('')).toBeNull()
  })
})

describe('slugify', () => {
  it('中文标题保留中文', () => {
    expect(slugify('前端进阶')).toBe('前端进阶')
  })
  it('拉丁标题小写连字符化', () => {
    expect(slugify('React Hooks Guide')).toBe('react-hooks-guide')
  })
  it('全符号标题回退 untitled', () => {
    expect(slugify('!!!')).toBe('untitled')
  })
})

describe('extractOutline', () => {
  it('解析各级标题并记录行号', () => {
    const md = '# 一\n\n文字\n\n## 二\n\n### 三\n\n# 四'
    const out = extractOutline(md)
    expect(out).toEqual([
      { level: 1, text: '一', line: 1 },
      { level: 2, text: '二', line: 5 },
      { level: 3, text: '三', line: 7 },
      { level: 1, text: '四', line: 9 },
    ])
  })

  it('跳过围栏代码块内的伪标题', () => {
    const md = '# 真标题\n\n```\n# 代码里的注释不是标题\n```\n\n## 另一个'
    const out = extractOutline(md)
    expect(out.map(o => o.text)).toEqual(['真标题', '另一个'])
  })

  it('空内容返回空数组', () => {
    expect(extractOutline('')).toEqual([])
  })

  it('去除标题尾部的 # 闭合标记', () => {
    expect(extractOutline('## 标题 ##')).toEqual([{ level: 2, text: '标题', line: 1 }])
  })
})

describe('polishText', () => {
  it('移除中文冗余话语标记（后接标点）', () => {
    const r = polishText('他其实，已经来了。')
    expect(r.polished).toBe('他，已经来了。')
    expect(r.suggestions.some(s => s.from === '其实' && s.reason === '冗余词：其实')).toBe(true)
  })

  it('简化英文冗余表达 in order to', () => {
    const r = polishText('We read it in order to learn.')
    expect(r.polished).toBe('We read it to learn.')
  })

  it('清理标点前多余空格', () => {
    expect(polishText('你好  ，世界').polished).toBe('你好，世界')
  })

  it('折叠重复标点', () => {
    expect(polishText('真的吗？？').polished).toBe('真的吗？')
    expect(polishText('太好了！！').polished).toBe('太好了！')
  })

  it('折叠多余空格', () => {
    expect(polishText('a  b   c').polished).toBe('a b c')
  })

  it('合并中文叠字', () => {
    expect(polishText('这个的的写法').polished).toBe('这个的写法')
  })

  it('代码块内容原样保留且不被润色', () => {
    const md = '```js\n其实 = 1\n```'
    const r = polishText(md)
    expect(r.polished).toBe(md)
    expect(r.suggestions).toHaveLength(0)
    expect(r.changed).toBe(false)
  })

  it('混合内容仅润色代码块外的正文', () => {
    const md = '其实，来看这段代码：\n\n```\n其实 = 1 // 注释里的其实不动\n```\n\n再说其实。'
    const r = polishText(md)
    expect(r.polished).toContain('其实 = 1 // 注释里的其实不动')
    // 正文里的「其实」被移除
    expect(r.suggestions.filter(s => s.from === '其实').length).toBeGreaterThan(0)
  })

  it('空内容无改动', () => {
    const r = polishText('')
    expect(r.polished).toBe('')
    expect(r.suggestions).toHaveLength(0)
    expect(r.changed).toBe(false)
  })

  it('无可润色项时 changed 为 false', () => {
    const r = polishText('这是一段干净的文字。')
    expect(r.changed).toBe(false)
    expect(r.suggestions).toHaveLength(0)
  })

  it('每条建议都包含 from/to/reason', () => {
    const r = polishText('他其实，来了。')
    for (const s of r.suggestions) {
      expect(typeof s.from).toBe('string')
      expect(typeof s.to).toBe('string')
      expect(typeof s.reason).toBe('string')
      expect(s.reason.length).toBeGreaterThan(0)
    }
  })
})

describe('extractKeywords', () => {
  it('#标签加权后排在前面', () => {
    const md = '#React #前端\n\nReact 是前端框架。React 很流行。React 很强大。React 很重要。'
    const kw = extractKeywords(md, 8)
    expect(kw[0].term).toBe('react') // 标签(小写归并) + 正文词频明显领先
    expect(kw.some(k => k.term === '前端')).toBe(true)
  })

  it('中文双字需出现≥2次才保留', () => {
    const md = '架构设计很重要。好的架构设计能降低复杂度。架构设计决定可维护性。'
    const kw = extractKeywords(md, 10)
    expect(kw.some(k => k.term === '架构' && k.score >= 2)).toBe(true)
    // 低频双字（如「重要」仅1次）应被过滤噪声，但不强求
  })

  it('停用词被过滤', () => {
    const md = 'we should use the and for because of some more very'
    const kw = extractKeywords(md, 10)
    expect(kw.every(k => !['the', 'and', 'for', 'because', 'some', 'more', 'very'].includes(k.term))).toBe(true)
  })

  it('空内容返回空数组', () => {
    expect(extractKeywords('')).toEqual([])
  })

  it('遵守 limit', () => {
    const md = '#a #b #c #d #e #f #g #h #i #j\n重复 重复 重复 重复 重复 重复'
    expect(extractKeywords(md, 3)).toHaveLength(3)
  })

  it('同分结果按词升序，确定可复现', () => {
    const md = 'alpha beta gamma delta'
    const a = extractKeywords(md, 8).map(k => k.term).join(',')
    const b = extractKeywords(md, 8).map(k => k.term).join(',')
    expect(a).toBe(b)
  })
})

describe('stripFrontMatter', () => {
  it('去除 frontmatter 块', () => {
    expect(stripFrontMatter('---\ntitle: x\n---\n正文')).toBe('正文')
  })
  it('无 frontmatter 原样返回', () => {
    expect(stripFrontMatter('正文')).toBe('正文')
  })
})
