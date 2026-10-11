import { describe, it, expect } from 'vitest'
import {
  buildReferenceTemplate,
  buildReferenceList,
  mergeFootnoteEntries,
  buildRelatedTemplate,
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

  describe('buildRelatedTemplate 相关笔记', () => {
    it('产出 H2 + 2 个空 WikiLink', () => {
      expect(buildRelatedTemplate()).toBe('## 相关笔记\n- [[]]\n- [[]]')
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
