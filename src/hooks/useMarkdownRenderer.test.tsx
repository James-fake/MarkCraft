import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMarkdownRenderer } from './useMarkdownRenderer'

/**
 * 回归锁（2026-10-10 真实事故）：所见即所得里下划线/高亮正常，**切到预览却原样显示**
 * `++文本|red++` / `==文本|red==`。
 *
 * 这里锁的是**接线**：`useMarkdownRenderer` 必须把内容先过 `preprocessCustomSyntax`
 * 再交给 marked。只测 `preprocessCustomSyntax` 本身是锁不住这个 bug 的
 * （预处理函数一直是对的，漏的是「预览没调它」）。
 */
const identity = (md: string) => md

describe('useMarkdownRenderer · 必须走自定义语法预处理', () => {
  it('下划线 ++文本|red++ 不得原样显示（真实报障形态）', () => {
    const { result } = renderHook(() => useMarkdownRenderer('前 ++重点|red++ 后', identity))
    const html = result.current.renderedHtml
    expect(html, '预览不得残留 ++ 原文').not.toContain('++')
    expect(html).toContain('<u')
    expect(html).toContain('data-underline-color="red"')
  })

  it('高亮 ==文本|red== 不得原样显示', () => {
    const { result } = renderHook(() => useMarkdownRenderer('前 ==重点|red== 后', identity))
    const html = result.current.renderedHtml
    expect(html, '预览不得残留 == 原文').not.toContain('==')
    expect(html).toContain('<mark')
    expect(html).toContain('data-highlight-color="red"')
  })
})
