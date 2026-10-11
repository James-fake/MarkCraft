import { describe, it, expect } from 'vitest'
import { initialsOf, hasKnownInitials } from './pinyinInitials'
import { rankFileMatches } from './fileMatch'

/**
 * 回归锁（2026-10-11 优化）：补全的**拼音首字母搜索**。
 *
 * 中文用户的核心痛点：输入 `gz` 找不到「工作总结」—— 原实现是纯子串匹配，
 * 不切换输入法就搜不到。现在 `rankFileMatches` 会额外比对拼音首字母。
 *
 * ⚠️ 字表只收录常用字（见 pinyinInitials.ts 的说明），未收录的字**没有**首字母 ——
 *    这是刻意的取舍：宁可少匹配，也不给出错误的首字母。中文直接搜始终有效。
 */
describe('initialsOf', () => {
  it('常用词的首字母正确', () => {
    expect(initialsOf('工作')).toBe('gz')
    expect(initialsOf('总结')).toBe('zj')
    expect(initialsOf('工作总结')).toBe('gzzj')
    expect(initialsOf('日记')).toBe('rj')
    expect(initialsOf('项目')).toBe('xm')
  })

  it('英文与数字原样参与（中英混排也能搜）', () => {
    expect(initialsOf('react 笔记')).toBe('reactbj')
  })

  it('未收录的字被跳过（不产生字母，也不报错）', () => {
    // 「龘」是生僻字，字表里没有
    expect(() => initialsOf('龘')).not.toThrow()
    expect(hasKnownInitials('龘')).toBe(false)
  })

  it('hasKnownInitials：至少一个可识别汉字', () => {
    expect(hasKnownInitials('工作')).toBe(true)
    expect(hasKnownInitials('abc')).toBe(false)
  })
})

describe('rankFileMatches · 拼音首字母命中', () => {
  const files = [
    { id: '1', name: '工作总结.md' },
    { id: '2', name: '生活记录.md' },
    { id: '3', name: '会议纪要.md' },
  ]

  it('gz → 命中「工作总结」（这正是用户报的痛点）', () => {
    const out = rankFileMatches('gz', files)
    expect(out.map((f) => f.id)).toEqual(['1'])
  })

  it('gzzj 也同样命中（可继续打字收窄）', () => {
    expect(rankFileMatches('gzzj', files).map((f) => f.id)).toEqual(['1'])
  })

  it('hyjy → 命中「会议纪要」', () => {
    expect(rankFileMatches('hyjy', files).map((f) => f.id)).toEqual(['3'])
  })

  it('中文查询照常走文本匹配，不受拼音影响', () => {
    const out = rankFileMatches('工作', files)
    expect(out[0].id).toBe('1')
  })

  it('单个字母不触发拼音（否则噪声过大：a/b 会命中大量笔记）', () => {
    // 「工」首字母 g，但单字母 g 不应命中「工作总结」
    expect(rankFileMatches('g', files), '单字母不启用拼音匹配').toEqual([])
  })

  it('拼音命中优先于无关的子串命中', () => {
    const list = [
      { id: 'gz', name: '含gz子串的英文笔记.md' },
      { id: 'target', name: '工作总结.md' },
    ]
    expect(rankFileMatches('gz', list)[0].id).toBe('target')
  })

  it('未收录的字不会给出错误匹配（宁可搜不到）', () => {
    expect(rankFileMatches('zzzz', [{ id: '1', name: '龘龘.md' }])).toEqual([])
  })
})
