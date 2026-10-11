import { describe, it, expect } from 'vitest'
import { isInsideLink, convertMentionToLink } from './wikiLink'

/**
 * 回归锁（2026-10-11）：「未链接提及」的数据早已在链接索引里算好
 * （`buildLinkIndex` / `LinkIndexStore` 维护 `unlinkedMentions`），但**界面没有任何入口**
 * 消费它 —— 而内置说明书三处承诺它在反向链接面板里。
 *
 * 补上界面后，需要一个**安全的改写函数**把提及转成 `[[链接]]`：
 * 只改指定行、只改第一个未被链接包裹的出现，绝不全文乱替换
 * （`String.replace` 全量替换会把正文里同名的普通词一并改掉）。
 */
describe('isInsideLink · 判定文本是否已在 [[]] 内', () => {
  it('未包裹 → false', () => {
    expect(isInsideLink('这里提到 工作总结 这个词', 5)).toBe(false)
  })

  it('已包裹 → true', () => {
    const line = '参见 [[工作总结]] 一文'
    expect(isInsideLink(line, line.indexOf('工作总结'))).toBe(true)
  })

  it('前一个链接已闭合 → 后面的文本不算在内', () => {
    const line = '[[甲]] 与 乙'
    expect(isInsideLink(line, line.indexOf('乙'))).toBe(false)
  })

  it('嵌入语法 ![[x]] 同样算已包裹', () => {
    const line = '![[工作总结]]'
    expect(isInsideLink(line, line.indexOf('工作总结'))).toBe(true)
  })
})

describe('convertMentionToLink · 把提及转成链接', () => {
  it('基本：只把该行的提及包成 [[]]', () => {
    const md = '第一行\n今天要写 工作总结 了\n第三行'
    const out = convertMentionToLink(md, 2, '工作总结')
    expect(out).toBe('第一行\n今天要写 [[工作总结]] 了\n第三行')
  })

  it('只改目标行，其它行的同名文本原样保留', () => {
    const md = '工作总结 很重要\n这行不动 工作总结\n'
    const out = convertMentionToLink(md, 1, '工作总结')
    expect(out).toBe('[[工作总结]] 很重要\n这行不动 工作总结\n')
  })

  it('已被链接包裹的出现会被跳过（不产生 [[[[x]]]]）', () => {
    const md = '先看 [[工作总结]] 再看 工作总结 这里'
    const out = convertMentionToLink(md, 1, '工作总结')
    // 第一处已包裹 → 应改第二处
    expect(out).toBe('先看 [[工作总结]] 再看 [[工作总结]] 这里')
  })

  it('该行唯一的出现已在链接内 → 返回 null（调用方据此降级）', () => {
    expect(convertMentionToLink('只有 [[工作总结]] 一处', 1, '工作总结')).toBeNull()
  })

  it('行号越界 / 空目标 → 返回 null，不抛错', () => {
    expect(convertMentionToLink('一行', 5, '目标')).toBeNull()
    expect(convertMentionToLink('一行', 0, '目标')).toBeNull()
    expect(convertMentionToLink('一行', 1, '')).toBeNull()
  })

  it('该行没有该文本 → 返回 null', () => {
    expect(convertMentionToLink('完全没有', 1, '工作总结')).toBeNull()
  })

  it('不改变行数与其它内容（只做局部替换）', () => {
    const md = 'a\nb\nc\nd'
    const out = convertMentionToLink(md, 3, 'c')
    expect(out).toBe('a\nb\n[[c]]\nd')
    expect(out!.split('\n')).toHaveLength(4)
  })

  it('中文与标点：包裹后两侧标点保持原样', () => {
    const md = '他提到「项目复盘」，然后继续。'
    const out = convertMentionToLink(md, 1, '项目复盘')
    expect(out).toBe('他提到「[[项目复盘]]」，然后继续。')
  })
})
