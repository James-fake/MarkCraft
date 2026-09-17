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

    // 选项带中文注解：AuroraSelect 已由原生 <select> 换成自定义滚轮浮层
    // → 关闭态 DOM 里只有「当前值」一项，其余选项须展开滚轮后才挂载。
    // 故分两步验：① 触发器显示的值文本即中文注解；② 展开后全部选项（含注解）都在 DOM 中。
    // 注意：触发器（button）与展开后的滚轮浮层（dialog）带同一个 aria-label
    // → 取触发器必须限定 button 角色，否则浮层退场窗口内会命中两个元素。
    const trigger = (name: string) => screen.getByRole('button', { name })

    expect(trigger('缓动方式').textContent).toContain('平滑（ease）')
    expect(trigger('播放次数').textContent).toContain('1 次（播放一次）')

    fireEvent.click(trigger('缓动方式'))
    expect(screen.getByText('匀速（linear）')).toBeTruthy()
    expect(screen.getByText('渐入渐出（ease-in-out）')).toBeTruthy()

    // 中文注解只是 label，底层 CSS 值仍是关键字：选「匀速」→ 预览 CSS 里是 linear 而非中文
    fireEvent.click(screen.getByText('匀速（linear）'))
    expect(trigger('缓动方式').textContent).toContain('匀速（linear）')
    expect(screen.getByText(/animation:[^;]*\slinear\s/)).toBeTruthy()

    fireEvent.click(trigger('播放次数'))
    expect(screen.getByText('无限循环（infinite）')).toBeTruthy()
    fireEvent.click(screen.getByText('无限循环（infinite）'))
    expect(screen.getByText(/animation:[^;]*\sinfinite;/)).toBeTruthy()
  })
})
