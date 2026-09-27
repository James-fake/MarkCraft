import { describe, it, expect, beforeEach } from 'vitest'
import {
  setBlogEntryFileId,
  peekBlogEntryFileId,
  clearBlogEntryFileId,
  __resetBlogEntryFileIdForTest,
} from '@services/blogEntry'

/**
 * P2-1 回归锁：博客「单篇发布」入口通道。
 * 生产者 EditorPanel 写 id → 消费者 BlogPanel 读并清除（一次性意图，消费即失效）。
 * 夹具幂等：每条用例前重置通道（模块级变量，不重置会跨用例污染）。
 */
describe('blogEntry 发布入口通道', () => {
  beforeEach(() => {
    __resetBlogEntryFileIdForTest()
  })

  it('初始为空：未写入时不产生单篇锁定', () => {
    expect(peekBlogEntryFileId()).toBeNull()
  })

  it('写入后可被读取（peek 不清除，供渲染期多次判定）', () => {
    setBlogEntryFileId('file-1')
    expect(peekBlogEntryFileId()).toBe('file-1')
    expect(peekBlogEntryFileId()).toBe('file-1') // 连续读不失效
  })

  it('消费后清除：避免重复生效（一次性导航意图）', () => {
    setBlogEntryFileId('file-2')
    clearBlogEntryFileId()
    expect(peekBlogEntryFileId()).toBeNull()
  })

  it('可写入 null 表示「无指定目标」', () => {
    setBlogEntryFileId('file-3')
    setBlogEntryFileId(null)
    expect(peekBlogEntryFileId()).toBeNull()
  })
})
