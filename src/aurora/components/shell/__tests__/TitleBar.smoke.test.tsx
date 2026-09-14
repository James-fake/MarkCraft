// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TitleBar } from '../TitleBar'

/**
 * TitleBar（P1-2 顶栏 breadcrumb 强化）烟雾测试
 * - 纯展示组件，无 store 依赖，无需 Providers
 * - 断言：crumb 分区渲染 / 分隔箭头 / 末级加粗 / 未保存圆点 / 祖先可点击回调 / 空态不渲染
 */

describe('Aurora TitleBar 面包屑测试', () => {
  it('渲染面包屑：分区线 + 分段箭头 + 末级当前态', () => {
    render(<TitleBar breadcrumbs={['项目', '设计', 'Aurora.md']} />)
    // 分区线（菜单 → 文档上下文）
    expect(document.querySelector('.aurora-titlebar__ctx-divider')).toBeTruthy()
    // 分段与末级
    expect(screen.getByText('项目')).toBeTruthy()
    expect(screen.getByText('设计')).toBeTruthy()
    expect(screen.getByText('Aurora.md')).toHaveClass('aurora-titlebar__crumb--current')
    // 两个箭头分隔（三段 → 2 个 sep）
    expect(document.querySelectorAll('.aurora-titlebar__crumb-sep').length).toBe(2)
  })

  it('modified 为真时在当前文档名前显示未保存圆点', () => {
    const { rerender } = render(<TitleBar breadcrumbs={['项目', 'Aurora.md']} modified />)
    expect(document.querySelector('.aurora-titlebar__modified-dot')).toBeTruthy()
    rerender(<TitleBar breadcrumbs={['项目', 'Aurora.md']} />)
    expect(document.querySelector('.aurora-titlebar__modified-dot')).toBeNull()
  })

  it('祖先面包屑点击触发 breadcrumbOnClick（末级不可点）', () => {
    const onClick = vi.fn()
    render(<TitleBar breadcrumbs={['项目', '设计', 'Aurora.md']} breadcrumbOnClick={onClick} />)
    fireEvent.click(screen.getByText('项目'))
    expect(onClick).toHaveBeenCalledWith(0)
    fireEvent.click(screen.getByText('设计'))
    expect(onClick).toHaveBeenCalledWith(1)
    // 末级是纯 span，不可点
    const current = screen.getByText('Aurora.md')
    expect(current.tagName).toBe('SPAN')
  })

  it('无面包屑时不渲染分区线与 crumb 容器', () => {
    render(<TitleBar />)
    expect(document.querySelector('.aurora-titlebar__ctx-divider')).toBeNull()
    expect(document.querySelector('.aurora-titlebar__breadcrumbs')).toBeNull()
  })
})
