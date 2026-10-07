import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useGlobalSearch,
  parseBooleanQuery,
  evaluateBooleanQuery,
  isBooleanQuery,
} from '../useGlobalSearch'
import type { BooleanQuery } from '../useGlobalSearch'
import type { FileNode } from '@src/types/fileManager'

function file(id: string, name: string, content: string): FileNode {
  return {
    id,
    name,
    type: 'file',
    content,
    createdAt: 0,
    updatedAt: 1,
  } as FileNode
}

const ROOT: FileNode = {
  id: 'root',
  name: 'root',
  type: 'folder',
  createdAt: 0,
  updatedAt: 0,
  children: [
    file('f-ab', 'both.md', 'alpha 出现在这里\nbeta 也出现在这里'),
    file('f-a', 'only-alpha.md', 'alpha 单独出现\n没有别的东西'),
    file('f-b', 'only-beta.md', 'beta 单独出现\n没有别的东西'),
    file('f-none', 'none.md', 'gamma 与两者都无关'),
  ],
} as FileNode

function ids(results: { fileId: string }[]): string[] {
  return results.map(r => r.fileId).sort()
}

/** 编译词项正则的缓存，供 evaluateBooleanQuery 单测使用。 */
function cacheFor(groups: BooleanQuery, caseSensitive = false): Map<string, RegExp | null> {
  const map = new Map<string, RegExp | null>()
  for (const group of groups) {
    for (const clause of group) {
      const escaped = clause.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      map.set(clause.term, new RegExp(escaped, caseSensitive ? 'g' : 'gi'))
    }
  }
  return map
}

describe('isBooleanQuery', () => {
  it('识别 AND / OR / NOT 运算符', () => {
    expect(isBooleanQuery('a AND b')).toBe(true)
    expect(isBooleanQuery('a OR b')).toBe(true)
    expect(isBooleanQuery('NOT b')).toBe(true)
  })

  it('普通查询不会被误判', () => {
    expect(isBooleanQuery('android')).toBe(false)
    expect(isBooleanQuery('a and b')).toBe(false)
    expect(isBooleanQuery('nothing')).toBe(false)
  })
})

describe('parseBooleanQuery', () => {
  it('AND 归入同一组', () => {
    expect(parseBooleanQuery('a AND b')).toEqual([
      [{ term: 'a', negate: false }, { term: 'b', negate: false }],
    ])
  })

  it('相邻词项默认按 AND 处理', () => {
    expect(parseBooleanQuery('a b')).toEqual([
      [{ term: 'a', negate: false }, { term: 'b', negate: false }],
    ])
  })

  it('OR 拆分为多个组（AND 优先级更高）', () => {
    expect(parseBooleanQuery('a AND b OR c')).toEqual([
      [{ term: 'a', negate: false }, { term: 'b', negate: false }],
      [{ term: 'c', negate: false }],
    ])
  })

  it('NOT 作用于其后的单个词项', () => {
    expect(parseBooleanQuery('a NOT b')).toEqual([
      [{ term: 'a', negate: false }, { term: 'b', negate: true }],
    ])
  })

  it('支持引号短语，且引号内的关键字不被当作运算符', () => {
    expect(parseBooleanQuery('"a AND b" OR c')).toEqual([
      [{ term: 'a AND b', negate: false }],
      [{ term: 'c', negate: false }],
    ])
  })

  it('空查询返回 null', () => {
    expect(parseBooleanQuery('   ')).toBeNull()
    expect(parseBooleanQuery('AND OR')).toBeNull()
  })
})

describe('evaluateBooleanQuery', () => {
  it('AND 要求全部命中', () => {
    const g = parseBooleanQuery('alpha AND beta')!
    expect(evaluateBooleanQuery('alpha beta', g, cacheFor(g))).toBe(true)
    expect(evaluateBooleanQuery('alpha only', g, cacheFor(g))).toBe(false)
  })

  it('OR 只需任一命中', () => {
    const g = parseBooleanQuery('alpha OR beta')!
    expect(evaluateBooleanQuery('beta only', g, cacheFor(g))).toBe(true)
    expect(evaluateBooleanQuery('gamma', g, cacheFor(g))).toBe(false)
  })

  it('NOT 排除命中项', () => {
    const g = parseBooleanQuery('alpha NOT beta')!
    expect(evaluateBooleanQuery('alpha here', g, cacheFor(g))).toBe(true)
    expect(evaluateBooleanQuery('alpha and beta', g, cacheFor(g))).toBe(false)
  })

  it('重复求值不受 lastIndex 影响（全局正则复用安全）', () => {
    const g = parseBooleanQuery('alpha')!
    const cache = cacheFor(g)
    expect(evaluateBooleanQuery('alpha', g, cache)).toBe(true)
    expect(evaluateBooleanQuery('alpha', g, cache)).toBe(true)
    expect(evaluateBooleanQuery('alpha', g, cache)).toBe(true)
  })
})

describe('useGlobalSearch — 布尔模式集成', () => {
  const { result } = renderHook(() => useGlobalSearch())
  const search = result.current.search

  it('A AND B 只返回同时包含两者的文件', () => {
    const res = search(ROOT, 'alpha AND beta', { booleanQuery: true })
    expect(ids(res)).toEqual(['f-ab'])
  })

  it('A OR B 返回包含任一的文件', () => {
    const res = search(ROOT, 'alpha OR beta', { booleanQuery: true })
    expect(ids(res)).toEqual(['f-a', 'f-ab', 'f-b'])
  })

  it('A NOT B 返回含 A 但不含 B 的文件', () => {
    const res = search(ROOT, 'alpha NOT beta', { booleanQuery: true })
    expect(ids(res)).toEqual(['f-a'])
  })

  it('只高亮正向词项，NOT 词项不产生高亮', () => {
    const res = search(ROOT, 'alpha NOT gamma', { booleanQuery: true })
    const allText = res.flatMap(r => r.matches.map(m => m.text.slice(m.highlightStart, m.highlightEnd)))
    expect(allText.every(t => t.toLowerCase() === 'alpha')).toBe(true)
  })

  it('纯排除查询仍能返回文件（用首行占位）', () => {
    const res = search(ROOT, 'NOT alpha', { booleanQuery: true })
    expect(ids(res)).toEqual(['f-b', 'f-none'])
    expect(res[0].matches.length).toBeGreaterThan(0)
  })

  it('兼容大小写开关', () => {
    const res = search(ROOT, 'ALPHA AND BETA', { booleanQuery: true, caseSensitive: true })
    expect(res).toEqual([])
    const res2 = search(ROOT, 'ALPHA AND BETA', { booleanQuery: true, caseSensitive: false })
    expect(ids(res2)).toEqual(['f-ab'])
  })

  it('兼容全词匹配开关', () => {
    const res = search(ROOT, 'alph AND beta', { booleanQuery: true, wholeWord: true })
    expect(res).toEqual([])
  })

  it('未开启布尔模式时，运算符按字面量处理（行为不变）', () => {
    const res = search(ROOT, 'alpha AND beta', {})
    expect(res).toEqual([])
  })

  it('布尔模式优先于正则模式（互斥）', () => {
    const res = search(ROOT, 'alpha AND beta', { booleanQuery: true, regex: true })
    expect(ids(res)).toEqual(['f-ab'])
  })

  it('普通查询在布尔模式下退化为单词项搜索', () => {
    const res = search(ROOT, 'alpha', { booleanQuery: true })
    expect(ids(res)).toEqual(['f-a', 'f-ab'])
  })
})
