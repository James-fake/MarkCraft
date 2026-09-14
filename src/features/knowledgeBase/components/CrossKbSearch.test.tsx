import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// 隔离重型 store 与外部依赖，避免触发真实磁盘读取
const useKbStoreMock = vi.fn()
const loadKbMock = vi.fn()
const getKbFilesMock = vi.fn()
const findNodeMock = vi.fn()

vi.mock('../../../stores/useKbStore', () => ({
  useKbStore: (...args: unknown[]) => useKbStoreMock(...args),
}))
vi.mock('../../../stores/kbStore', () => ({
  loadKb: (...args: unknown[]) => loadKbMock(...args),
  getKbFiles: (...args: unknown[]) => getKbFilesMock(...args),
}))
vi.mock('../../../services/fileService', () => ({
  findNode: (...args: unknown[]) => findNodeMock(...args),
}))
// kbTheme 仅提供颜色 token 与渐变函数，避免 inline style 取 undefined
vi.mock('../kbTheme', () => ({
  KB_COLORS: {
    bg: '#ffffff', bgCard: '#ffffff', border: '#dddddd', textMain: '#111111',
    textSecondary: '#444444', textTertiary: '#888888', primary: '#0066ff',
    primaryLight: '#eeeeff', primaryDark: '#0044cc', bgHover: '#f5f5f5',
    dangerBg: '#ffeeee', dangerText: '#cc0000', highlight: '#ffff00',
  },
  getKbGradient: () => 'linear-gradient(135deg,#0066ff,#0088ff)',
}))

import { CrossKbSearch } from './CrossKbSearch'

const rootFolder = { type: 'folder', id: 'root', name: 'root', children: [] }

beforeEach(() => {
  useKbStoreMock.mockReturnValue({ kbList: [], rootFolder })
  loadKbMock.mockResolvedValue(null)
  getKbFilesMock.mockReturnValue([])
  findNodeMock.mockReturnValue(null)
})

describe('CrossKbSearch（阶段8 跨库搜索浮层）', () => {
  it('顶栏与空状态不再使用彩色 emoji，并渲染统一线性图标', () => {
    const { container } = render(<CrossKbSearch onClose={() => {}} />)
    // 关键文本保留
    expect(screen.getByPlaceholderText(/跨知识库搜索/)).toBeTruthy()
    expect(screen.getByText(/输入关键词搜索所有知识库/)).toBeTruthy()
    // 原彩色 emoji 已全部替换为 KbIcons
    const forbidden = ['🌐', '📂', '✕', '📚', '📄', '⏳']
    for (const e of forbidden) {
      expect(container.textContent).not.toContain(e)
    }
    // 顶栏应渲染统一矢量图标（svg）
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('点击「范围」按钮展开知识库筛选器', () => {
    render(<CrossKbSearch onClose={() => {}} />)
    const scopeBtn = screen.getByText(/范围/)
    fireEvent.click(scopeBtn)
    expect(screen.getByText(/搜索范围：/)).toBeTruthy()
  })

  it('点击关闭按钮触发 onClose 回调', () => {
    const onClose = vi.fn()
    const { container } = render(<CrossKbSearch onClose={onClose} />)
    const closeBtn = container.querySelector('button[title="关闭 (Esc)"]')
    expect(closeBtn).toBeTruthy()
    fireEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
