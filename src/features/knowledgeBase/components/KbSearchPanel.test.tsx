import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TagIndexProvider } from '@stores/TagIndexStore'
import { LinkIndexProvider } from '@stores/LinkIndexStore'
import type { FileNode } from '@src/types/fileManager'

import { KbSearchPanel } from './KbSearchPanel'

// 隔离重型 store 与外部依赖，避免触发真实索引构建 / 磁盘读取
const useKbStoreMock = vi.fn()
const getKbOverlayRootMock = vi.fn()
const getSemanticSearchMock = vi.fn()

// 注意：TagIndexStore / LinkIndexStore 之间疑似存在循环依赖，
// 同时 vi.mock 二者会在 vitest 收集期静默崩溃，故改为用真实 Provider 包裹 SUT。
vi.mock('../../../stores/useKbStore', () => ({
  useKbStore: (...args: unknown[]) => useKbStoreMock(...args),
}))
vi.mock('./kbOverlayRoot', () => ({
  getKbOverlayRoot: (...args: unknown[]) => getKbOverlayRootMock(...args),
}))
vi.mock('../ai/semanticSearch', () => ({
  getSemanticSearch: (...args: unknown[]) => getSemanticSearchMock(...args),
}))
// 隔离高级筛选子组件（工厂返回 null，避免加载其重型依赖）
vi.mock('./AdvancedFilter', () => ({
  AdvancedFilter: () => null,
}))

const rootFolder = { type: 'folder', id: 'root', name: 'root', children: [] } as unknown as FileNode

beforeEach(() => {
  useKbStoreMock.mockReturnValue({
    activeKb: null,
    loadActiveKb: vi.fn().mockResolvedValue(undefined),
    updateSavedQueries: vi.fn(),
  })
  getKbOverlayRootMock.mockReturnValue(document.body)
  getSemanticSearchMock.mockReturnValue({
    buildIndex: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
  })
})

function renderPanel(extraProps: Partial<React.ComponentProps<typeof KbSearchPanel>> = {}) {
  return render(
    <TagIndexProvider rootFolder={rootFolder}>
      <LinkIndexProvider rootFolder={rootFolder}>
        <KbSearchPanel kbId="kb1" files={[]} onClose={() => {}} {...extraProps} />
      </LinkIndexProvider>
    </TagIndexProvider>,
  )
}

describe('KbSearchPanel（阶段8 库内搜索面板）', () => {
  it('结果区不再使用 📄 emoji，并渲染统一线性图标', () => {
    const { container } = renderPanel()
    // 关键文本保留
    expect(screen.getByPlaceholderText(/搜索库内文件内容/)).toBeTruthy()
    expect(screen.getByText(/输入关键词开始搜索库内文件/)).toBeTruthy()
    // 原彩色 emoji 已移除
    expect(container.textContent).not.toContain('📄')
    // 顶栏与空状态应渲染统一矢量图标（svg）
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('按 Esc 键（返回概览）触发 onClose 回调', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    const input = screen.getByPlaceholderText(/搜索库内文件内容/)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击「筛选」展开高级筛选区', () => {
    renderPanel()
    expect(screen.queryByText('高级筛选')).toBeNull()
    fireEvent.click(screen.getByText('筛选'))
    expect(screen.getByText('高级筛选')).toBeTruthy()
  })
})
