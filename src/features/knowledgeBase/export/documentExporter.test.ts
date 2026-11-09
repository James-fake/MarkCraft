import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportPdf } from './documentExporter'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

/**
 * 回归锁（2026-11-08 审查 C 组）：`inlineMd` 先 `escapeHtml` 再对 href 二次转义
 * → 生成的导出物出现 `&amp;amp;`，查询串/锚点被写坏。
 * 修复：href 从未转义原文提取，再各做一次正确的属性转义。
 */
const kb = { id: 'kb1', name: 'KB', description: 'desc' } as unknown as KnowledgeBase

function makeFile(content: string): FileNode {
  return { id: 'f1', name: 'a.md', type: 'file', content, createdAt: 0, updatedAt: 0 }
}

describe('documentExporter · href 只转义一次（回归 2026-11-08）', () => {
  let written = ''

  beforeEach(() => {
    written = ''
    vi.useFakeTimers()
    const fakeWindow = {
      document: {
        write: (html: string) => {
          written += html
        },
        close: () => {},
      },
      focus: () => {},
      print: () => {},
    }
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('查询串中的 & 只编码为 &amp;，不出现 &amp;amp;', async () => {
    await exportPdf(kb, [makeFile('[查询](https://example.com/?a=1&b=2)')])

    expect(written).toContain('href="https://example.com/?a=1&amp;b=2"')
    expect(written, '二次转义会产生 &amp;amp;').not.toContain('&amp;amp;')
  })

  it('非法协议退化为纯文本，label 中的 & 正常转义', async () => {
    await exportPdf(kb, [makeFile('[A & B](javascript:alert(1))')])

    expect(written).toContain('A &amp; B')
    expect(written).not.toContain('href="javascript:')
  })

  it('正常链接 label 的粗体仍然生效（不因占位还原而丢失）', async () => {
    await exportPdf(kb, [makeFile('[**重点**](https://example.com/)')])

    expect(written).toContain('<a href="https://example.com/"><strong>重点</strong></a>')
  })
})
