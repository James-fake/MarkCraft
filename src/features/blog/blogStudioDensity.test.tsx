import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { StudioThemeProvider, SectionLabel } from './components/StudioControls'
import { DENSITY_ATTR } from '../../hooks/useDensity'

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf-8')

describe('BlogStudio 密度联动（运行时）', () => {
  beforeEach(() => document.documentElement.removeAttribute(DENSITY_ATTR))
  afterEach(() => {
    document.documentElement.removeAttribute(DENSITY_ATTR)
  })

  it('SectionLabel 随全局密度放大下边距（中心化控制，一处改动影响全部面板）', async () => {
    const { container } = render(
      <StudioThemeProvider value={{ isDark: true }}>
        <SectionLabel>测试标题</SectionLabel>
      </StudioThemeProvider>
    )
    const el = container.querySelector('div')!
    expect(el.style.marginBottom).toBe('8px')

    await act(async () => {
      document.documentElement.setAttribute(DENSITY_ATTR, 'comfortable')
    })
    expect(el.style.marginBottom).toBe('11px')
  })
})

/**
 * 阶段9 静态接线回归：确认 BlogStudio 各纯内联样式组件已接入全局密度广播
 * （<html data-density>），通过 useDensity + scaleGap 实现与 CSS 选择器同构的
 * 密度联动。BlogStudio 无 CSS 类文件，内联样式须由 JS 缩放。
 */
describe('BlogStudio 密度联动（源码接线）', () => {
  it('BlogStudio 外壳接入 useDensity 并按密度缩放内联间距', () => {
    const src = read('BlogStudio.tsx')
    expect(src).toContain('useDensity')
    expect(src).toContain('isComfortable')
    // 顶栏横向内边距已随密度缩放（紧凑 20 / 舒适 26）
    expect(src).toContain('isComfortable ? 26 : 20')
    // 侧栏滚动区、设备工具栏、预览区等均已随 isComfortable 缩放
    expect(src).toContain('isComfortable ? 28 : 20')
  })

  it('StudioControls.SectionLabel 接入密度并按密度缩放下边距', () => {
    const src = read('components/StudioControls.tsx')
    expect(src).toContain('useDensity')
    expect(src).toContain('isComfortable ? 11 : 8')
  })

  it('六个面板根 gap 均通过 scaleGap 随密度缩放', () => {
    // 各面板基础间距：StylePanel 20 / ColorPanel 16 / ThemePanel 16 / ContentPanel 14 / FeaturesPanel 16 / CssPanel 12 / ExportPanel 14
    const pairs: Array<[string, number]> = [
      ['components/panels/StylePanel.tsx', 20],
      ['components/panels/ColorPanel.tsx', 16],
      ['components/panels/ThemePanel.tsx', 16],
      ['components/panels/ContentPanel.tsx', 14],
      ['components/panels/FeaturesPanel.tsx', 16],
      ['components/panels/CssPanel.tsx', 12],
      ['components/RightPanel.tsx', 14],
    ]
    for (const [file, base] of pairs) {
      const src = read(file)
      expect(src).toContain(`scaleGap(${base}, density)`)
      // 根容器使用计算后的 panelGap（而非硬编码常量）
      expect(src).toContain('gap: panelGap')
    }
  })
})
