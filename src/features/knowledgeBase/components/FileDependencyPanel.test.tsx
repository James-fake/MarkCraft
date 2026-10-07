import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileDependencyPanel } from './FileDependencyPanel'

const mockOnClose = vi.fn()

// 仅 mock 单一 store（useLinkIndex），避免循环依赖双 store mock 导致 vitest 收集期崩溃
vi.mock('../../../stores/LinkIndexStore', () => ({
  useLinkIndex: () => ({
    getOutgoingLinks: () => [
      // 正常出链（target 可解析 → 文件图标 + 路径图标）
      { sourceFileId: 'src1', line: 10, target: 'note-x', sourceFileName: 'A.md', context: 'see [[note-x]]', type: 'wiki', relation: 'ref' },
      // 断链出链（target 不可解析 → 警告图标）
      { sourceFileId: 'src2', line: 20, target: 'missing-note', sourceFileName: 'B.md', context: 'see [[missing-note]]', type: 'wiki', relation: 'ref' },
    ],
    getBacklinks: () => [
      { sourceFileId: 'back1', line: 5, target: 'f1', sourceFileName: 'C.md', context: 'link', type: 'wiki', relation: 'ref' },
    ],
    resolveTarget: (target: string) => (target === 'missing-note' ? undefined : 'file-abc'),
    getFilePath: (id: string) => (id ? '/path/to/file.md' : ''),
  }),
}))

const EMOJIS = ['📄', '⚠️', '📁', '✅']

describe('FileDependencyPanel 图标统一（阶段8）', () => {
  beforeEach(() => { mockOnClose.mockClear() })

  it('出链 tab 无彩色 emoji 且渲染统一矢量图标', () => {
    const { container } = render(<FileDependencyPanel fileId="f1" onClose={mockOnClose} />)
    const text = container.textContent ?? ''
    EMOJIS.forEach(e => expect(text).not.toContain(e))
    // 顶部栏（链接/网络/关闭）+ 列表项（文件/警告/文件夹）应渲染多个 svg
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(3)
  })

  it('切换删除影响 tab 仍可渲染且文本无 emoji', () => {
    render(<FileDependencyPanel fileId="f1" onClose={mockOnClose} />)
    fireEvent.click(screen.getByRole('button', { name: /删除影响/ }))
    const text = document.body.textContent ?? ''
    EMOJIS.forEach(e => expect(text).not.toContain(e))
    expect(screen.getByText(/删除此文件后/)).toBeTruthy()
  })

  it('关闭按钮触发 onClose', () => {
    render(<FileDependencyPanel fileId="f1" onClose={mockOnClose} />)
    fireEvent.click(screen.getByTitle('关闭'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
