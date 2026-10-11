import { describe, it, expect } from 'vitest'
import { rankFileMatches, stripMdExtension, MATCH } from './fileMatch'
import type { FileMatchCandidate } from './fileMatch'

/**
 * 回归锁（2026-10-11 优化）：补全列表的**排序**。
 *
 * 原实现是 `name.toLowerCase().includes(query)` 后**按遍历顺序返回** ——
 * 输入完整文件名时它不一定排第一，用户得上下翻找；也没有「最近打开 / 被引用多」的信号。
 * 现在两种编辑模式共用 `rankFileMatches`（所见即所得 + 源码模式），这里锁住排序规则。
 */
const c = (
  id: string,
  name: string,
  extra: Partial<FileMatchCandidate> = {},
): FileMatchCandidate => ({ id, name, ...extra })

describe('stripMdExtension', () => {
  it('去掉 .md 后缀，其它原样返回', () => {
    expect(stripMdExtension('笔记.md')).toBe('笔记')
    expect(stripMdExtension('笔记')).toBe('笔记')
    expect(stripMdExtension('a.md.md')).toBe('a.md')
  })
})

describe('rankFileMatches · 排序规则', () => {
  it('精确匹配必须排第一（原实现按遍历顺序，做不到）', () => {
    const out = rankFileMatches('工作', [
      c('1', '工作笔记.md'),
      c('2', '工作.md'),
      c('3', '上周工作.md'),
    ])
    expect(out[0].id, '输入完整名字时它应排第一').toBe('2')
  })

  it('前缀优于子串', () => {
    const out = rankFileMatches('工作', [
      c('1', '周报里提到工作.md'),
      c('2', '工作笔记.md'),
    ])
    expect(out[0].id, '以查询开头的应更靠前').toBe('2')
  })

  it('不匹配的结果被过滤掉', () => {
    const out = rankFileMatches('工作', [c('1', '工作.md'), c('2', '生活.md')])
    expect(out.map((x) => x.id)).toEqual(['1'])
  })

  it('空查询原样返回（补全刚弹出时由调用方决定顺序）', () => {
    const list = [c('1', 'A.md'), c('2', 'B.md')]
    expect(rankFileMatches('', list).map((x) => x.id)).toEqual(['1', '2'])
  })

  it('同强度时：最近打开的优先', () => {
    const out = rankFileMatches('笔记', [c('a', '笔记甲.md'), c('b', '笔记乙.md')], {
      recentFileIds: ['b', 'a'],
    })
    expect(out[0].id, 'b 最近打开过，应排前面').toBe('b')
  })

  it('同强度且都没打开过：被引用多的优先', () => {
    const out = rankFileMatches('笔记', [
      c('a', '笔记甲.md', { backlinkCount: 1 }),
      c('b', '笔记乙.md', { backlinkCount: 9 }),
    ])
    expect(out[0].id, '枢纽笔记更可能是目标').toBe('b')
  })

  it('同强度时：与当前笔记同目录的优先', () => {
    const out = rankFileMatches(
      '笔记',
      [c('a', '笔记甲.md', { dir: '归档' }), c('b', '笔记乙.md', { dir: '工作' })],
      { currentDir: '工作' },
    )
    expect(out[0].id).toBe('b')
  })

  it('比较时忽略 .md 后缀（查询与名字都要去）', () => {
    const out = rankFileMatches('笔记.md', [c('1', '笔记.md'), c('2', '笔记大全.md')])
    expect(out[0].id).toBe('1')
  })

  it('大小写不敏感', () => {
    expect(rankFileMatches('ABC', [c('1', 'abc.md')]).map((x) => x.id)).toEqual(['1'])
  })

  it('不修改传入的数组（返回新数组）', () => {
    const list = [c('1', '工作.md'), c('2', '生活.md')]
    rankFileMatches('工', list)
    expect(list).toHaveLength(2)
  })
})

describe('MATCH 强度常量', () => {
  it('数值越小越优先，且预留了拼音两档', () => {
    expect(MATCH.EXACT).toBeLessThan(MATCH.PREFIX)
    expect(MATCH.PREFIX).toBeLessThan(MATCH.PINYIN_INITIALS)
    expect(MATCH.PINYIN_INITIALS).toBeLessThan(MATCH.PINYIN_FULL)
    expect(MATCH.PINYIN_FULL).toBeLessThan(MATCH.SUBSTRING)
  })
})
