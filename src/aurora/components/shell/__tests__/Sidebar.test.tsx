import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { AURORA_SIDEBAR_GROUPS } from '@aurora/panels/aurora-nav'

/**
 * P1-1.1 导航分层 · Sidebar 折叠分组冒烟
 * 目标：验证「核心+高频常驻、差异化独立、辅助折叠（更多组默认收起）」
 * + 激活项所在组自动展开 + 窄书脊强制显示图标。
 * Sidebar 为纯组件（无 Provider 依赖），直接渲染。
 */
afterEach(() => {
  cleanup()
})

describe('Sidebar · 导航分层（更多组折叠）', () => {
  it('展开态默认收起「更多」组：核心/高频/发布常驻，辅助功能视觉隐藏（组折叠过渡后内容常驻渲染）', () => {
    render(<Sidebar groups={AURORA_SIDEBAR_GROUPS} />)
    // 核心 + 高频 + 差异化常驻
    expect(screen.getByText('编辑器')).toBeTruthy()
    expect(screen.getByText('日记')).toBeTruthy()
    expect(screen.getByText('博客')).toBeTruthy()
    // 更多组默认收起：内容常驻渲染但视觉隐藏（grid-rows 0fr + aria-hidden + inert，Apple 抽屉语义）
    const moreBtn = screen.getByRole('button', { name: /更多/ })
    expect(moreBtn.getAttribute('aria-expanded')).toBe('false')
    const collapsedBody = document.querySelector('.aurora-sidebar__group-body.is-collapsed')
    expect(collapsedBody).toBeTruthy()
    expect(collapsedBody.getAttribute('aria-hidden')).toBe('true')
    expect(collapsedBody.getAttribute('inert')).toBe('')
    expect(collapsedBody.textContent).toContain('白板')
    expect(collapsedBody.textContent).toContain('双链图谱')
    expect(collapsedBody.textContent).toContain('知识库')
    expect(collapsedBody.textContent).toContain('设置')
    // 常驻组不在收起区内（编辑器所在 body 未折叠）
    const editorBody = screen.getByText('编辑器').closest('.aurora-sidebar__group-body')
    expect(editorBody).toBeTruthy()
    expect(editorBody.classList.contains('is-collapsed')).toBe(false)
  })

  it('点击「更多」展开辅助功能，再点收起', () => {
    render(<Sidebar groups={AURORA_SIDEBAR_GROUPS} />)
    const moreBtn = screen.getByRole('button', { name: /更多/ })
    fireEvent.click(moreBtn)
    expect(moreBtn.getAttribute('aria-expanded')).toBe('true')
    const moreBody = screen.getByText('白板').closest('.aurora-sidebar__group-body')
    expect(moreBody).toBeTruthy()
    expect(moreBody.getAttribute('aria-hidden')).toBeNull()
    expect(moreBody.getAttribute('inert')).toBeNull()
    expect(screen.getByText('设置')).toBeTruthy()
    fireEvent.click(moreBtn)
    expect(moreBtn.getAttribute('aria-expanded')).toBe('false')
    expect(moreBody.getAttribute('aria-hidden')).toBe('true')
  })

  it('激活项所在折叠组自动展开（如当前在白板视图）', () => {
    render(<Sidebar groups={AURORA_SIDEBAR_GROUPS} activeId="canvas" />)
    const moreBtn = screen.getByRole('button', { name: /更多/ })
    expect(moreBtn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('白板')).toBeTruthy()
  })

  it('窄书脊（collapsed）下强制显示全部图标项', () => {
    render(<Sidebar groups={AURORA_SIDEBAR_GROUPS} collapsed />)
    expect(screen.getByText('白板')).toBeTruthy()
    expect(screen.getByText('双链图谱')).toBeTruthy()
    expect(screen.getByText('知识库')).toBeTruthy()
    expect(screen.getByText('设置')).toBeTruthy()
  })
})
