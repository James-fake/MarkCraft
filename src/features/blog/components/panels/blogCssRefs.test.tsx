import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { StudioThemeProvider } from '../StudioControls'
import { CssReference } from './CssReference'
import { KeyframeEditor } from './KeyframeEditor'

function renderRef(onInsertAtCursor: (t: string) => void) {
  return render(
    <StudioThemeProvider value={{ isDark: false }}>
      <CssReference onInsertAtCursor={onInsertAtCursor} />
    </StudioThemeProvider>
  )
}

describe('CssReference (变量参考 / 选择器参考)', () => {
  it('点击「CSS 变量参考」展开，点击变量插入 var()', () => {
    const onInsert = vi.fn()
    renderRef(onInsert)
    // 展开变量参考
    fireEvent.click(screen.getByText('CSS 变量参考'))
    // 点击第一个变量（--accent-warm）
    const btn = screen.getByTitle('点击插入 var(--accent-warm)')
    fireEvent.click(btn)
    expect(onInsert).toHaveBeenCalledWith('var(--accent-warm)')
  })

  it('选中参考点击插入选择器骨架', () => {
    const onInsert = vi.fn()
    renderRef(onInsert)
    fireEvent.click(screen.getByText('选择器参考'))
    const btn = screen.getByTitle('点击插入 .site-header { }')
    fireEvent.click(btn)
    expect(onInsert).toHaveBeenCalledWith('.site-header {\n  \n}')
  })
})

describe('KeyframeEditor (动画时间轴编辑器)', () => {
  it('展开后点击「插入到编辑器」回调收到 @keyframes CSS', () => {
    const onInsert = vi.fn()
    render(
      <StudioThemeProvider value={{ isDark: false }}>
        <KeyframeEditor onInsertCss={onInsert} />
      </StudioThemeProvider>
    )
    // 默认已选中 k1，但面板需展开
    fireEvent.click(screen.getByText('🎬 动画时间轴编辑器'))
    fireEvent.click(screen.getByText('插入到编辑器'))
    expect(onInsert).toHaveBeenCalledTimes(1)
    const css = onInsert.mock.calls[0][0]
    expect(css).toContain('@keyframes')
    expect(css).toContain('animation:')
  })

  it('添加关键帧改变动画定义', () => {
    const onInsert = vi.fn()
    render(
      <StudioThemeProvider value={{ isDark: false }}>
        <KeyframeEditor onInsertCss={onInsert} />
      </StudioThemeProvider>
    )
    fireEvent.click(screen.getByText('🎬 动画时间轴编辑器'))
    fireEvent.click(screen.getByText('+ 添加关键帧'))
    // 现在应有 3 个关键帧标记
    expect(screen.getAllByTitle(/%$/).length).toBe(3)
  })

  it('界面文案已汉化（标签/说明/带中文注解的选项）', () => {
    const onInsert = vi.fn()
    render(
      <StudioThemeProvider value={{ isDark: false }}>
        <KeyframeEditor onInsertCss={onInsert} />
      </StudioThemeProvider>
    )
    fireEvent.click(screen.getByText('🎬 动画时间轴编辑器'))
    // 关键字段标签均已汉化
    expect(screen.getByText('动画名称')).toBeTruthy()
    expect(screen.getByText('作用元素（目标选择器）')).toBeTruthy()
    expect(screen.getByText('时间轴（0% 开始 → 100% 结束）')).toBeTruthy()
    expect(screen.getByText('动画时长')).toBeTruthy()
    expect(screen.getByText('缓动方式（速度曲线）')).toBeTruthy()
    expect(screen.getByText('播放次数')).toBeTruthy()
    expect(screen.getByText('实时预览（生成的 CSS 代码）')).toBeTruthy()
    // 功能说明提示存在
    expect(screen.getByText(/为指定元素添加进入动画/)).toBeTruthy()
    // 选项带中文注解，且底层 CSS 值保持不变
    expect(screen.getByText('匀速（linear）')).toBeTruthy()
    expect(screen.getByText('无限循环（infinite）')).toBeTruthy()
  })
})
