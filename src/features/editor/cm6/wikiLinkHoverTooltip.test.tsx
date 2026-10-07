import { describe, it, expect } from 'vitest'
import { matchWikiLinkAt } from './wikiLinkHoverTooltip'

describe('matchWikiLinkAt（CM6 源码模式 WikiLink 悬浮命中检测）', () => {
  it('命中普通 [[note]] 链接内部', () => {
    const line = '前置 [[目标笔记]] 后置'
    // 目标文本第一个字符位置（relPos 5 = '目'）
    expect(matchWikiLinkAt(line, 5)).toEqual({ target: '目标笔记', from: 3, to: 11 })
    expect(matchWikiLinkAt(line, 8)).toEqual({ target: '目标笔记', from: 3, to: 11 })
  })

  it('命中嵌入 ![[note]]', () => {
    const line = '前 ![[note.md]] 后'
    // '前 ![[note.md]] 后'：! 在 2，目标文本 n 在 5，链接结束位 14
    expect(matchWikiLinkAt(line, 5)).toEqual({ target: 'note.md', from: 2, to: 14 })
  })

  it('管道语法 target 只取前段', () => {
    const line = '[[别名|显示文本]]'
    // 链接全长 11（[[2 + 别名2 + |1 + 显示文本4 + ]]2）
    expect(matchWikiLinkAt(line, 2)).toEqual({ target: '别名', from: 0, to: 11 })
  })

  it('锚点语法保留 # 段（由调用方解析）', () => {
    const line = '[[笔记#第三章]]'
    // 链接全长 10（[[2 + 笔记2 + #1 + 第三章3 + ]]2）
    expect(matchWikiLinkAt(line, 2)).toEqual({ target: '笔记#第三章', from: 0, to: 10 })
  })

  it('悬停在 [[ 或 ! 前缀上不触发', () => {
    const line = '前置 [[目标]]'
    // [[ 在 3,4 → relPos 3/4 不命中
    expect(matchWikiLinkAt(line, 3)).toBeNull()
    const embed = '![[目标]]'
    // ! 在 0，[ 在 1,2 → relPos 0/1/2 不命中
    expect(matchWikiLinkAt(embed, 0)).toBeNull()
    expect(matchWikiLinkAt(embed, 2)).toBeNull()
  })

  it('不在链接内返回 null', () => {
    const line = '纯文本 [[note]] 其他'
    expect(matchWikiLinkAt(line, 1)).toBeNull()
    expect(matchWikiLinkAt(line, 15)).toBeNull()
  })
})
