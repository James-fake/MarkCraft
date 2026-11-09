import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { RealProviders } from '../../../providers/RealProviders'
import { AboutSection } from './AboutSection'

/**
 * a11y 回归锁：关于页的「隐私政策 / 服务条款 / 使用文档 / 外链」曾是
 * `<span onClick>`，键盘用户 Tab 完全跳不过去、Enter/Space 无法激活。
 * 这些是合规关键入口，必须是原生 button 且键盘可聚焦。
 */
describe('AboutSection · 链接键盘可达', () => {
  it('所有链接都是原生 button，可聚焦；无后端项带 aria-disabled', () => {
    const { container } = render(
      <RealProviders>
        <AboutSection onOpenBrowser={vi.fn()} />
      </RealProviders>,
    )
    const links = Array.from(container.querySelectorAll('.aurora-settings__about-link'))
    expect(links.length).toBeGreaterThanOrEqual(6)
    for (const el of links) {
      expect(el.tagName).toBe('BUTTON')
      expect(el.getAttribute('type')).toBe('button')
    }

    const privacy = container.querySelector('[data-testid="about-privacy"]') as HTMLButtonElement
    expect(privacy).not.toBeNull()
    privacy.focus()
    expect(document.activeElement).toBe(privacy)

    const disabled = container.querySelector('.aurora-settings__about-link--disabled') as HTMLButtonElement
    expect(disabled).not.toBeNull()
    expect(disabled.disabled).toBe(true)
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
  })
})
