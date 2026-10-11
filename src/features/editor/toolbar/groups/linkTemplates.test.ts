import { describe, it, expect } from 'vitest'
import {
  buildReferenceTemplate,
  buildReferenceList,
  mergeFootnoteEntries,
  buildRelatedTemplate,
  buildRelatedListText,
  mergeRelatedNotes,
  extractWikiLinkTargets,
  buildBackindexTemplate,
  buildRecentWikilink,
  buildTodayWikilink,
  buildBacklinksList,
  stripMdExt,
} from '@features/editor/toolbar/groups/linkTemplates'

describe('知识链接模板纯函数（Slash 命令迁移，两模式共享防漂移）', () => {
  describe('stripMdExt', () => {
    it('去除 .md 后缀', () => {
      expect(stripMdExt('note.md')).toBe('note')
      expect(stripMdExt('note')).toBe('note')
    })
  })

  describe('mergeFootnoteEntries', () => {
    it('按 id 去重，同名优先带内容', () => {
      const merged = mergeFootnoteEntries([
        { id: '1', content: '' },
        { id: '1', content: '来源 A' },
        { id: '2', content: '来源 B' },
      ])
      expect(merged).toHaveLength(2)
      expect(merged.find((e) => e.id === '1')?.content).toBe('来源 A')
    })
  })

  describe('buildReferenceList 参考文献列表', () => {
    it('无条目时仅返回标题', () => {
      expect(buildReferenceList([])).toBe('## 参考文献')
    })
    it('按正文引用顺序排序输出 - [^id]: 内容', () => {
      const content = '正文 [^2] 与 [^1] 结尾'
      const out = buildReferenceList(
        [
          { id: '1', content: '来源一' },
          { id: '2', content: '来源二' },
        ],
        content,
      )
      expect(out).toBe('## 参考文献\n- [^2]: 来源二\n- [^1]: 来源一')
    })
  })

  describe('buildReferenceTemplate 参考文献模板（自动生成）', () => {
    it('无脚注时仅返回标题占位', () => {
      expect(buildReferenceTemplate()).toBe('## 参考文献')
    })
    it('扫描全文脚注定义自动汇总成列表（按引用顺序）', () => {
      const md = [
        '正文先引 [^b]，后引 [^a]。',
        '',
        '[^a]: 第一处来源',
        '[^b]: 第二处来源',
      ].join('\n')
      expect(buildReferenceTemplate(md)).toBe(
        '## 参考文献\n- [^b]: 第二处来源\n- [^a]: 第一处来源',
      )
    })
  })

  describe('extractWikiLinkTargets 提取双链目标', () => {
    it('提取 [[name]] 去重（去后缀、大小写归一、保持顺序）', () => {
      const md = '见 [[笔记A]] 与 [[笔记B]]，再提 [[笔记a]]'
      expect(extractWikiLinkTargets(md)).toEqual(['笔记A', '笔记B'])
    })
    it('忽略 #标题段与 |别名段，并去 .md', () => {
      expect(extractWikiLinkTargets('[[笔记A#章节|别名]] 与 [[笔记B.md]]')).toEqual(['笔记A', '笔记B'])
    })
    it('包含 ![[嵌入]]', () => {
      expect(extractWikiLinkTargets('![[图片说明]] 和 [[正文]]')).toEqual(['图片说明', '正文'])
    })
    it('无双链时返回空数组', () => {
      expect(extractWikiLinkTargets('普通文本 [不是链接]')).toEqual([])
    })
  })

  describe('buildRelatedListText 相关笔记文本', () => {
    it('无标题时返回标题 + 单占位', () => {
      expect(buildRelatedListText([])).toBe('## 相关笔记\n- [[]]')
    })
    it('有标题时生成 - [[name]] 列表（去 .md）', () => {
      expect(buildRelatedListText(['A.md', 'B'])).toBe('## 相关笔记\n- [[A]]\n- [[B]]')
    })
    it('排除自己（按去后缀小写）', () => {
      expect(buildRelatedListText(['当前笔记', '其它'], '当前笔记.md')).toBe('## 相关笔记\n- [[其它]]')
    })
  })

  describe('mergeRelatedNotes 合并相关笔记', () => {
    it('反链 ∪ 出链，去重（fileId 优先），排除自己，反链优先', () => {
      const back = [
        { title: '来源A', fileId: 'a' },
        { title: '共享', fileId: 'c' },
      ]
      const out = [
        { title: '共享', fileId: 'c' }, // 与反链重复 → 去重
        { title: '目标B', fileId: 'b' },
        { title: '自己', fileId: 'self' }, // 排除
      ]
      const merged = mergeRelatedNotes(back, out, 'self')
      expect(merged).toEqual([
        { title: '来源A', fileId: 'a' },
        { title: '共享', fileId: 'c' },
        { title: '目标B', fileId: 'b' },
      ])
    })
    it('无 fileId 时按去后缀小写标题去重', () => {
      const back: Array<{ title: string; fileId?: string }> = [{ title: '笔记A' }]
      const out: Array<{ title: string; fileId?: string }> = [{ title: '笔记a' }]
      expect(mergeRelatedNotes(back, out)).toHaveLength(1)
    })
  })

  describe('buildRelatedTemplate 相关笔记（自动生成）', () => {
    it('无双链时仅返回标题 + 单占位', () => {
      expect(buildRelatedTemplate()).toBe('## 相关笔记\n- [[]]')
    })
    it('扫描正文双链自动汇总成清单', () => {
      const md = '本文关联 [[笔记A]] 与 [[笔记B]]，又提到 [[笔记A]]。'
      expect(buildRelatedTemplate(md)).toBe('## 相关笔记\n- [[笔记A]]\n- [[笔记B]]')
    })
    it('排除指向自己的双链', () => {
      const md = '回顾 [[当前笔记]] 与 [[其它笔记]]'
      expect(buildRelatedTemplate(md, '当前笔记.md')).toBe('## 相关笔记\n- [[其它笔记]]')
    })
  })

  describe('buildBackindexTemplate 反向索引', () => {
    it('有文件名时引用当前文件（去 .md）', () => {
      expect(buildBackindexTemplate('我的笔记.md')).toBe('## 反向索引\n![[我的笔记]]')
    })

    it('无文件名时保留占位符', () => {
      expect(buildBackindexTemplate('')).toBe('## 反向索引\n![[{{currentFile}}]]')
    })
  })

  describe('buildRecentWikilink 快速链接', () => {
    it('有最近文件时取第一个（去 .md）', () => {
      expect(buildRecentWikilink(['a.md', 'b.md'])).toBe('[[a]]')
    })

    it('无最近文件时插入空 WikiLink', () => {
      expect(buildRecentWikilink([])).toBe('[[]]')
    })
  })

  describe('buildTodayWikilink 今日笔记', () => {
    it('固定日期输出 YYYY-MM-DD', () => {
      const now = new Date(2026, 7, 28) // 2026-08-28
      expect(buildTodayWikilink(now)).toBe('[[2026-08-28]]')
    })

    it('月份补零', () => {
      const now = new Date(2026, 0, 5) // 2026-01-05
      expect(buildTodayWikilink(now)).toBe('[[2026-01-05]]')
    })
  })

  describe('buildBacklinksList 反向链接列表', () => {
    it('有反链时输出 WikiLink 列表（去 .md）', () => {
      expect(buildBacklinksList(['来源A.md', '来源B.md'])).toBe('[[来源A]]\n[[来源B]]')
    })

    it('无反链时插入占位注释', () => {
      expect(buildBacklinksList([])).toBe('<!-- 无反向链接 -->')
    })
  })
})
