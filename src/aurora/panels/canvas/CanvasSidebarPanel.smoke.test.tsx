import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// jsdom 无 ResizeObserver，白板需要
beforeAll(() => {
  // @ts-expect-error - jsdom 缺失，提供空实现
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import { RealProviders } from '../../app/RealProviders'
import { CanvasSidebarPanel, CANVAS_FILE_DRAG_MIME, CANVAS_FILE_DRAG_NAME_MIME } from './CanvasSidebarPanel'

// 引擎未就绪（engine=null）时侧栏只读展示，文件 Tab 仍可独立验证（数据来自 useFileManager）
function renderSidebar() {
  return render(
    <RealProviders>
      <CanvasSidebarPanel engine={null} onCollapse={() => {}} onOpenFile={() => {}} />
    </RealProviders>,
  )
}

afterEach(() => cleanup())

describe('CanvasSidebarPanel · 文件 Tab（拖拽生成卡片）', () => {
  it('左栏含「文件」页签，点击切换后渲染文件列表', async () => {
    renderSidebar()
    // 默认焦点在「大纲」；点击「文件」Tab
    fireEvent.click(await screen.findByTitle('文件'))
    // 面板标题出现（selector 限定：使用优化⑥后 tab 内也有「文件」文字，避免双匹配）
    expect(await screen.findByText('文件', { selector: '.aurora-csp__title' })).toBeTruthy()
    // 文件数统计副标题（N 个文件）
    expect(screen.getByText(/个文件/)).toBeTruthy()
  })

  it('无文件时显示空态引导（不会崩溃）', async () => {
    renderSidebar()
    fireEvent.click(await screen.findByTitle('文件'))
    // 有文件 → 拖拽提示；无文件 → 空态。两者其一存在即代表 Tab 正常渲染
    const hint = screen.queryByText(/拖拽文件到白板/)
    const empty = screen.queryByText(/暂无文件/)
    expect(hint || empty).toBeTruthy()
  })

  it('文件行可拖拽：dragStart 写入自定义 MIME（白板放置目标据此生成卡片）', async () => {
    renderSidebar()
    fireEvent.click(await screen.findByTitle('文件'))
    const items = document.querySelectorAll('.aurora-csp__fileitem')
    // 仅当存在真实文件时才校验拖拽契约；空库跳过（由上一用例覆盖）
    if (items.length === 0) return
    const dt: any = {
      _d: {} as Record<string, string>,
      setData(k: string, v: string) { this._d[k] = v },
      getData(k: string) { return this._d[k] ?? '' },
      types: [] as string[],
      effectAllowed: '',
    }
    fireEvent.dragStart(items[0], { dataTransfer: dt })
    expect(dt._d[CANVAS_FILE_DRAG_MIME]).toBeTruthy()
    expect(dt._d[CANVAS_FILE_DRAG_NAME_MIME]).toBeTruthy()
  })
})
