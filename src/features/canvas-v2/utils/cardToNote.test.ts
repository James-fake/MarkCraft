import { describe, it, expect } from 'vitest'
import { cardToNotePlan } from './cardToNote'

// 「便签转笔记」纯规划函数的回归锁：
// 标题/文件名派生复用 engine/cardHelpers（其自身已有单测），这里只锁转换语义本身
// —— 去重递增、大小写不敏感、空卡兜底、内容原样、批量同批错开。
describe('cardToNotePlan（便签转笔记 · 纯规划）', () => {
  it('标题 = 首行去 Markdown 装饰；内容 = 全文原样（不做改写）', () => {
    const plan = cardToNotePlan('# 会议纪要\n\n正文第二行', [])
    expect(plan.fileName).toBe('会议纪要.md')
    expect(plan.content).toBe('# 会议纪要\n\n正文第二行')
  })

  it('空卡回退「未命名笔记.md」，内容为空串', () => {
    const plan = cardToNotePlan('', [])
    expect(plan.fileName).toBe('未命名笔记.md')
    expect(plan.content).toBe('')
  })

  it('与已有文件重名 → 递增 (2)；多重名继续递增', () => {
    expect(cardToNotePlan('A', ['A.md']).fileName).toBe('A (2).md')
    expect(cardToNotePlan('A', ['A.md', 'A (2).md']).fileName).toBe('A (3).md')
  })

  it('重名比对大小写不敏感（常见文件系统语义）', () => {
    expect(cardToNotePlan('readme', ['README.md']).fileName).toBe('readme (2).md')
  })

  it('占位按全名比对（与 FileTree 命名语义一致）：文件夹「笔记」不挡「笔记.md」，同名 .md 才挡', () => {
    // 文件 `笔记.md` 与文件夹 `笔记` 可共存 → 不去重
    expect(cardToNotePlan('笔记', ['笔记']).fileName).toBe('笔记.md')
    // 全名相同的节点才占位
    expect(cardToNotePlan('笔记', ['笔记.md']).fileName).toBe('笔记 (2).md')
  })

  it('批量转换：调用方把本批次已创建名字并入后，同批同名卡依次错开', () => {
    const taken: string[] = []
    const p1 = cardToNotePlan('待办', taken)
    taken.push(p1.fileName)
    const p2 = cardToNotePlan('待办', taken)
    taken.push(p2.fileName)
    const p3 = cardToNotePlan('待办', taken)
    expect(p1.fileName).toBe('待办.md')
    expect(p2.fileName).toBe('待办 (2).md')
    expect(p3.fileName).toBe('待办 (3).md')
  })
})
