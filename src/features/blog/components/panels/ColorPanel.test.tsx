import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudioThemeProvider } from '../StudioControls'
import ColorPicker from '../ColorPicker'
import { ColorPanel } from './ColorPanel'
import { DEFAULT_DESIGN_CONFIG, type BlogDesignConfig } from '../../hooks/useBlogGenerator'

function makeConfig(overrides: Partial<BlogDesignConfig> = {}): BlogDesignConfig {
  return { ...DEFAULT_DESIGN_CONFIG, ...overrides }
}

describe('ColorPicker 菜单自身配色不随调色盘变化', () => {
  it('滑块标签文字颜色固定，不引用所选颜色', () => {
    for (const color of ['#ff0000', '#00ff00', '#0000ff', '#abcdef']) {
      const { unmount } = render(
        <StudioThemeProvider value={{ isDark: true }}>
          <ColorPicker
            color={color}
            lightness={50} saturation={100} sharpness={100}
            onColorChange={vi.fn()} onLightnessChange={vi.fn()}
            onSaturationChange={vi.fn()} onSharpnessChange={vi.fn()}
          />
        </StudioThemeProvider>
      )
      const label = screen.getByText('深浅')
      // jsdom 会将 rgba 归一化为带空格的形式；标签改为右对齐固定列，颜色略提亮
      expect(label.style.color).toBe('rgba(255, 255, 255, 0.72)')
      // 右对齐固定列：标签应靠右对齐
      expect(label.style.textAlign).toBe('right')
      expect(label.style.width).toBe('30px')
      expect(label.style.color.toLowerCase()).not.toBe(color.toLowerCase())
      unmount()
    }
  })

  it('滑块拇指样式仅作用于 .mc-slider，不外泄到其它面板', () => {
    render(
      <StudioThemeProvider value={{ isDark: true }}>
        <ColorPicker
          color="#abcdef"
          lightness={50} saturation={100} sharpness={100}
          onColorChange={vi.fn()} onLightnessChange={vi.fn()}
          onSaturationChange={vi.fn()} onSharpnessChange={vi.fn()}
        />
      </StudioThemeProvider>
    )
    const styles = Array.from(document.querySelectorAll('style'))
    const pickerStyle = styles.find(s => s.textContent?.includes('mc-slider'))
    expect(pickerStyle).toBeTruthy()
    const css = pickerStyle!.textContent || ''
    // 已作用域化
    expect(css).toContain('.mc-slider input[type=range]::-webkit-slider-thumb')
    // 每个滑钮选择器都必须以 ".mc-slider " 为前缀（其前字符为空格，
    // 不属于 [^.\s]），绝不允许出现未作用域的 input[type=range]::-* 选择器
    for (const pseudo of ['::-webkit-slider-thumb', '::-moz-range-thumb']) {
      const unscoped = css.match(new RegExp(`(^|[^.\\s])input\\[type=range\\]${pseudo}`))
      expect(unscoped).toBeNull()
    }
  })

  it('三个调整滑块归入「颜色微调」分组且顺序为 深浅/饱和/锐化', () => {
    render(
      <StudioThemeProvider value={{ isDark: true }}>
        <ColorPicker
          color="#abcdef"
          lightness={50} saturation={100} sharpness={100}
          onColorChange={vi.fn()} onLightnessChange={vi.fn()}
          onSaturationChange={vi.fn()} onSharpnessChange={vi.fn()}
        />
      </StudioThemeProvider>
    )
    // 分组标题存在，建立区域层次
    expect(screen.getByText('颜色微调')).toBeTruthy()
    expect(screen.getByText('RGB 通道')).toBeTruthy()
    // 三个调整滑块标签按 深浅 → 饱和 → 锐化 顺序出现
    const order = ['深浅', '饱和', '锐化'].map((t) => screen.getByText(t))
    for (let i = 1; i < order.length; i++) {
      // order[i-1] 应位于 order[i] 之前
      expect(order[i].compareDocumentPosition(order[i - 1]) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    }
  })

  it('调整滑块（深浅/饱和/锐化）的轨道渐变固定，不引用所选颜色', () => {
    const { container } = render(
      <StudioThemeProvider value={{ isDark: true }}>
        <ColorPicker
          color="#abcdef"
          lightness={50} saturation={100} sharpness={100}
          onColorChange={vi.fn()} onLightnessChange={vi.fn()}
          onSaturationChange={vi.fn()} onSharpnessChange={vi.fn()}
        />
      </StudioThemeProvider>
    )
    const trackInputs = container.querySelectorAll('input[type=range]')
    trackInputs.forEach((input) => {
      const bg = (input as HTMLInputElement).style.background
      expect(bg.toLowerCase()).not.toContain('#abcdef')
    })
  })
})

describe('ColorPanel 自定义色块边框/背景固定', () => {
  it('colorScheme=custom 时自定义按钮边框不随 customColor 变色', () => {
    const customColor = '#00ff00'
    const { getByTitle } = render(
      <StudioThemeProvider value={{ isDark: true }}>
        <ColorPanel
          designConfig={makeConfig({ colorScheme: 'custom', customColor })}
          handleDesignChange={vi.fn()}
        />
      </StudioThemeProvider>
    )
    const btn = getByTitle('自定义颜色') as HTMLButtonElement
    expect(btn.style.border).toBe('2px solid transparent')
    expect(btn.style.background.toLowerCase()).not.toContain(customColor)
  })

  it('点击自定义颜色按钮触发 colorScheme=custom', () => {
    const onChange = vi.fn()
    const { getByTitle } = render(
      <StudioThemeProvider value={{ isDark: true }}>
        <ColorPanel
          designConfig={makeConfig({ colorScheme: 'red', customColor: '#d97706' })}
          handleDesignChange={onChange}
        />
      </StudioThemeProvider>
    )
    fireEvent.click(getByTitle('自定义颜色'))
    expect(onChange).toHaveBeenCalledWith('colorScheme', 'custom')
  })
})
