import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// jsdom 无 ResizeObserver，白板需要
beforeAll(() => {
  // @ts-expect-error - jsdom 缺失，提供空实现
  global.ResizeObserver = class {
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
  }
})

afterEach(() => cleanup())

// 真实引擎存储：mock IndexedDB 调用，jsdom 下确定性验证
vi.mock('../../../features/canvas-v2/canvasStore', () => ({
  getCanvasList: vi.fn(async () => [{ id: 'c-1', name: '产品脑图', createdAt: 0, updatedAt: Date.now(), cardCount: 0 }]),
  loadCanvas: vi.fn(async () => ({ id: 'c-1', name: '产品脑图', createdAt: 0, updatedAt: Date.now(), data: { version: 2, viewport: { scrollX: 0, scrollY: 0, zoom: 1 }, elements: [], shapes: [] } })),
  saveCanvas: vi.fn(async () => {}),
  createCanvas: vi.fn(async (name: string) => ({ id: 'c-new', name, createdAt: 0, updatedAt: Date.now(), data: null })),
  deleteCanvas: vi.fn(async () => {}),
  getTrash: vi.fn(async () => []),
  restoreCanvas: vi.fn(async () => null),
  purgeFromTrash: vi.fn(async () => {}),
  clearTrash: vi.fn(async () => {}),
}))

// 重构：Aurora 外壳 + Excalidraw 引擎。mock 引擎渲染（jsdom 不加载 @excalidraw），
// 断言 Aurora chrome（顶栏视图切换/Dock）真实渲染、无旧假白板残留。
vi.mock('../../../features/canvas-v2/engine/ExcalidrawCanvas', () => ({
  ExcalidrawCanvas: () => <div data-testid="excalidraw-canvas">Excalidraw 引擎</div>,
}))

import { RealProviders } from '../../providers/RealProviders'
import { CanvasPanel } from './CanvasPanel'

function renderPanel() {
  return render(
    <RealProviders>
      <CanvasPanel />
    </RealProviders>,
  )
}

describe('CanvasPanel 重构（Aurora 外壳 + Excalidraw 引擎）', () => {
  it('挂载无崩溃，渲染 Aurora 视图切换与真实引擎', async () => {
    renderPanel()
    // Aurora 顶栏视图切换
    expect(await screen.findByRole('tab', { name: '白板' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '思维导图' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '看板' })).toBeTruthy()
    // 真实 Excalidraw 引擎渲染（mock）
    expect(screen.getByTestId('excalidraw-canvas')).toBeTruthy()
    // 白板名来自真实列表（异步加载）；UI 两处展示：面包屑标题 + 顶栏白板名
    expect((await screen.findAllByText('产品脑图')).length).toBeGreaterThan(0)
  })

  it('不渲染旧 mock 白板名（假列表已退役）', async () => {
    renderPanel()
    expect(screen.queryByText('架构图')).toBeNull()
    expect(screen.queryByText('项目排期')).toBeNull()
  })

  it('白板列表含「白板列表/回收站」页签（P0-2 回收站 UI）', async () => {
    renderPanel()
    await screen.findByRole('tab', { name: '白板' })
    // 打开白板列表（顶栏白板名）
    fireEvent.click(await screen.findByTitle('白板列表'))
    // 弹层出现列表/回收站页签
    expect(await screen.findByRole('tab', { name: /白板列表（/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /回收站（/ })).toBeTruthy()
    // 切到回收站：空态文案
    fireEvent.click(screen.getByRole('tab', { name: /回收站（/ }))
    expect(await screen.findByText(/回收站为空/)).toBeTruthy()
  })

  it('顶栏提供「导出当前白板」入口（P0-1 导出）', async () => {
    renderPanel()
    await screen.findByRole('tab', { name: '白板' })
    expect(await screen.findByTitle('导出当前白板（PNG+JSON）')).toBeTruthy()
  })

})
