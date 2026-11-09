import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { RealProviders } from '../providers/RealProviders'
import { resetUserProfile } from '@stores/UserProfileStore'
import { OnboardingScreen } from './OnboardingScreen'

/**
 * 首启独立引导：整屏四步（欢迎 → 认识你 → 隐私政策 → 体验改善计划）。
 * 这里锁的是「流程能否走通 + 标记是否落盘」，视觉细节交给截图验收。
 */
function renderScreen(onDone = vi.fn()) {
  const utils = render(
    <RealProviders>
      <OnboardingScreen onDone={onDone} />
    </RealProviders>,
  )
  return { ...utils, onDone }
}

const primary = (c: HTMLElement) => c.querySelector('.aurora-onboarding__primary') as HTMLElement

beforeEach(() => {
  resetUserProfile()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OnboardingScreen · 独立引导界面', () => {
  it('第一步是欢迎：标题 + 三个要点，还没有表单', () => {
    const { container } = renderScreen()
    expect(container.querySelector('.aurora-onboarding')).not.toBeNull()
    expect(container.textContent).toContain('欢迎来到 MarkCraft')
    expect(container.textContent).toContain('文件是普通 Markdown')
    expect(container.querySelector('#mc-onboarding-name')).toBeNull()
  })

  it('保留标题栏（Electron 无边框窗口靠它最小化/关闭）', () => {
    const { container } = renderScreen()
    expect(container.querySelector('.aurora-titlebar')).not.toBeNull()
    expect(container.querySelector('.aurora-wincontrols')).not.toBeNull()
  })

  it('点「继续」→ 第二步出现档案表单', () => {
    const { container } = renderScreen()
    fireEvent.click(primary(container))
    expect(container.querySelector('#mc-onboarding-name')).not.toBeNull()
    expect(container.textContent).toContain('先认识一下')
    // 第一步的要点已退场
    expect(container.textContent).not.toContain('文件是普通 Markdown')
  })

  it('填名字 → 隐私页 → 勾选确认 → 体验改善计划 → 加入：回调触发、标记落盘、名字与授权写入', () => {
    const { container, onDone } = renderScreen()
    fireEvent.click(primary(container)) // 欢迎 → 档案
    fireEvent.change(container.querySelector('#mc-onboarding-name') as HTMLInputElement, {
      target: { value: '小明' },
    })
    fireEvent.click(primary(container)) // 档案 → 隐私页

    // 第三步：隐私政策独立页已出现
    expect(container.textContent).toContain('隐私政策')
    // 未勾选确认时，继续按钮禁用
    const enterBefore = primary(container) as HTMLButtonElement
    expect(enterBefore.disabled).toBe(true)

    // 勾选「我已阅读并理解」后按钮可用
    const ack = container.querySelector('.aurora-onboarding__ack input') as HTMLInputElement
    fireEvent.click(ack)
    expect((primary(container) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(primary(container)) // 隐私页 → 体验改善计划（第四步）

    // 第四步：体验改善计划（opt-in）已出现
    expect(container.textContent).toContain('帮助我们把 MarkCraft 做得更好')
    const consentAck = container.querySelector('.aurora-onboarding__ack input') as HTMLInputElement
    fireEvent.click(consentAck) // 勾选「我同意匿名加入」
    fireEvent.click(primary(container)) // 加入 → 进入 MarkCraft

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('markcraft.onboardingProfile.v1')).toBe('1')
    expect(localStorage.getItem('markcraft.userprofile')).toContain('小明')
    // 授权状态已写入设置（勾选加入 → granted）
    const settings = JSON.parse(localStorage.getItem('markcraft_settings') ?? '{}')
    expect(settings.telemetryConsent).toBe('granted')
  })

  it('「以后再说」→ 隐私页 → 勾选确认 → 体验改善计划 → 暂不：同样结束引导并落盘（授权记为拒绝）', () => {
    const { container, onDone } = renderScreen()
    fireEvent.click(primary(container)) // 欢迎 → 档案
    fireEvent.click(container.querySelector('.aurora-onboarding__ghost') as HTMLElement) // 跳过 → 隐私页

    expect(container.textContent).toContain('隐私政策')
    const ack = container.querySelector('.aurora-onboarding__ack input') as HTMLInputElement
    fireEvent.click(ack)
    fireEvent.click(primary(container)) // 隐私页 → 体验改善计划

    // 第四步：体验改善计划已出现
    expect(container.textContent).toContain('帮助我们把 MarkCraft 做得更好')
    // 点击「暂不，保持隐私」（拒绝）
    const decline = Array.from(container.querySelectorAll('.aurora-onboarding__ghost')).find(
      (b) => (b.textContent ?? '').includes('暂不'),
    ) as HTMLElement
    fireEvent.click(decline)

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('markcraft.onboardingProfile.v1')).toBe('1')
    const settings = JSON.parse(localStorage.getItem('markcraft_settings') ?? '{}')
    expect(settings.telemetryConsent).toBe('denied')
  })

  it('输入名字不会让界面自己消失（字段是输入即保存的）', () => {
    const { container, onDone } = renderScreen()
    fireEvent.click(primary(container))
    fireEvent.change(container.querySelector('#mc-onboarding-name') as HTMLInputElement, {
      target: { value: '阿' },
    })
    expect(container.querySelector('.aurora-onboarding')).not.toBeNull()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('首步按 Esc 结束引导并落完成标记（避免下次启动被强制重走）', () => {
    const { container, onDone } = renderScreen()
    fireEvent.keyDown(container.querySelector('.aurora-onboarding') as HTMLElement, { key: 'Escape' })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('markcraft.onboardingProfile.v1')).toBe('1')
  })
})
