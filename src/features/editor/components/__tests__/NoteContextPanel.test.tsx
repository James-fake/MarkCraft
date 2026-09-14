/**
 * P1-4 NoteContextPanel 组件测试
 * 通过 vi.mock 替换 useLinkIndex，验证反链渲染、点击跳转、迷你图谱节点交互。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NoteContextPanel from '../NoteContextPanel'

const mockLinkIndex = vi.hoisted(() => ({
  getBacklinks: vi.fn(() => []),
  getGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
  indexVersion: 1,
}))

vi.mock('../../../../stores/LinkIndexStore', () => ({
  useLinkIndex: () => mockLinkIndex,
}))

describe('<NoteContextPanel />', () => {
  beforeEach(() => {
    mockLinkIndex.getBacklinks.mockReset()
    mockLinkIndex.getGraphData.mockReset()
    mockLinkIndex.getBacklinks.mockReturnValue([])
    mockLinkIndex.getGraphData.mockReturnValue({ nodes: [], edges: [] })
    mockLinkIndex.indexVersion = 1
  })

  it('无反链时显示空状态', () => {
    mockLinkIndex.getBacklinks.mockReturnValue([])
    render(<NoteContextPanel activeFileId="a" onOpenNote={() => {}} />)
    expect(screen.getByText('暂无其他笔记链接到此。')).toBeTruthy()
  })

  it('渲染反链列表并支持点击打开', () => {
    const onOpen = vi.fn()
    mockLinkIndex.getBacklinks.mockReturnValue([
      { sourceFileId: 'b', sourceFileName: '笔记B', target: 'a', type: 'wikilink', line: 1 },
      { sourceFileId: 'b', sourceFileName: '笔记B', target: 'a', type: 'wikilink', line: 5 }, // 重复应去重
      { sourceFileId: 'c', sourceFileName: '笔记C', target: 'a', type: 'wikilink', line: 2 },
    ])
    render(<NoteContextPanel activeFileId="a" onOpenNote={onOpen} />)

    const by = screen.getByText('↩ 笔记B')
    const cy = screen.getByText('↩ 笔记C')
    expect(by).toBeTruthy()
    expect(cy).toBeTruthy()

    fireEvent.click(by)
    expect(onOpen).toHaveBeenCalledWith('b')
    fireEvent.click(cy)
    expect(onOpen).toHaveBeenCalledWith('c')
    // 去重：仅 2 个反链按钮
    expect(screen.getAllByText(/↩ /).length).toBe(2)
  })

  it('反链计数徽标显示数量', () => {
    mockLinkIndex.getBacklinks.mockReturnValue([
      { sourceFileId: 'b', sourceFileName: '笔记B', target: 'a', type: 'wikilink', line: 1 },
      { sourceFileId: 'c', sourceFileName: '笔记C', target: 'a', type: 'wikilink', line: 1 },
    ])
    render(<NoteContextPanel activeFileId="a" onOpenNote={() => {}} />)
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('渲染迷你图谱并点击邻居节点跳转', () => {
    const onOpen = vi.fn()
    mockLinkIndex.getGraphData.mockReturnValue({
      nodes: [
        { id: 'a', label: '当前', links: 2 },
        { id: 'b', label: '邻居', links: 1 },
      ],
      edges: [{ source: 'a', target: 'b', type: 'wikilink' }],
    })
    const { container } = render(<NoteContextPanel activeFileId="a" onOpenNote={onOpen} />)

    const svg = container.querySelector('svg[role="img"]')
    expect(svg).toBeTruthy()
    // 中心 + 邻居 两个节点组
    const groups = svg!.querySelectorAll('g')
    expect(groups.length).toBe(2)
    // 邻居组（第 2 个）点击跳转
    fireEvent.click(groups[1])
    expect(onOpen).toHaveBeenCalledWith('b')
  })

  it('无 activeFileId 时图谱区提示', () => {
    render(<NoteContextPanel activeFileId={undefined} onOpenNote={() => {}} />)
    expect(screen.getByText('打开笔记后显示关联图谱。')).toBeTruthy()
  })

  it('可折叠/展开', () => {
    mockLinkIndex.getBacklinks.mockReturnValue([
      { sourceFileId: 'b', sourceFileName: '笔记B', target: 'a', type: 'wikilink', line: 1 },
    ])
    render(<NoteContextPanel activeFileId="a" onOpenNote={() => {}} />)
    // 展开态可见反链
    expect(screen.getByText('↩ 笔记B')).toBeTruthy()
    // 点击头部折叠
    fireEvent.click(screen.getByLabelText('切换关联面板'))
    expect(screen.queryByText('↩ 笔记B')).toBeNull()
  })
})
