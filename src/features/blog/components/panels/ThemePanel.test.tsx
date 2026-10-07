import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ThemePanel } from './ThemePanel'

function getCardByName(container: HTMLElement, name: string): HTMLElement {
  const grid = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement | null
  expect(grid).toBeTruthy()
  const card = Array.from(grid!.children).find(
    c => (c.textContent ?? '').includes(name)
  ) as HTMLElement | undefined
  expect(card).toBeTruthy()
  return card!
}

describe('ThemePanel (风格菜单) 悬停预览移除 / 单击选择', () => {
  it('单击主题卡片才触发选择；悬停（mouseOver）不触发选择或预览', () => {
    const onThemeChange = vi.fn()
    const { container } = render(
      <ThemePanel currentThemeStyle="minimal" onThemeChange={onThemeChange} />
    )
    const card = getCardByName(container, 'Magazine')

    // 初始未选择
    expect(onThemeChange).not.toHaveBeenCalled()

    // 模拟悬停（React 用 mouseOver 合成 mouseEnter）
    fireEvent.mouseOver(card)
    // 悬停不得触发选择/预览
    expect(onThemeChange).not.toHaveBeenCalled()

    // 单击才选择
    fireEvent.click(card)
    expect(onThemeChange).toHaveBeenCalledTimes(1)
    expect(onThemeChange).toHaveBeenCalledWith('magazine')
  })

  it('反复悬停多个卡片不会触发选择，仅单击生效', () => {
    const onThemeChange = vi.fn()
    const { container } = render(
      <ThemePanel currentThemeStyle="magazine" onThemeChange={onThemeChange} />
    )
    const grid = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement
    const cards = Array.from(grid.children) as HTMLElement[]
    expect(cards.length).toBeGreaterThan(2)

    // 依次悬停多张卡片
    cards.slice(0, 3).forEach(c => fireEvent.mouseOver(c))
    expect(onThemeChange).not.toHaveBeenCalled()

    // 单击其中一张才生效
    fireEvent.click(cards[2])
    expect(onThemeChange).toHaveBeenCalledTimes(1)
  })

  it('收藏按钮点击不会触发主题选择（stopPropagation）', () => {
    const onThemeChange = vi.fn()
    const { container } = render(
      <ThemePanel currentThemeStyle="minimal" onThemeChange={onThemeChange} />
    )
    const card = getCardByName(container, 'Magazine')
    const star = card.querySelector('div[title]') as HTMLElement
    expect(star).toBeTruthy()
    fireEvent.click(star)
    expect(onThemeChange).not.toHaveBeenCalled()
  })
})
