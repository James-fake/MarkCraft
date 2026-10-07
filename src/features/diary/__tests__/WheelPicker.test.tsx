import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import WheelPicker from '../WheelPicker'

const items = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` }))

describe('WheelPicker 键盘无障碍', () => {
  it('role=listbox 且可聚焦', () => {
    const { container } = render(<WheelPicker items={items} selectedIndex={0} onSelect={vi.fn()} ariaLabel="选择月份" loop />)
    const wheel = container.querySelector('.dv-wheel') as HTMLElement
    expect(wheel.getAttribute('role')).toBe('listbox')
    expect(wheel.getAttribute('tabindex')).toBe('0')
    expect(wheel.getAttribute('aria-label')).toBe('选择月份')
  })

  it('ArrowDown 在循环模式下前进到下一项', () => {
    const onSelect = vi.fn()
    const { container } = render(<WheelPicker items={items} selectedIndex={0} onSelect={onSelect} loop />)
    const wheel = container.querySelector('.dv-wheel') as HTMLElement
    fireEvent.keyDown(wheel, { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('ArrowUp 在循环模式下环绕到最后一项', () => {
    const onSelect = vi.fn()
    const { container } = render(<WheelPicker items={items} selectedIndex={0} onSelect={onSelect} loop />)
    const wheel = container.querySelector('.dv-wheel') as HTMLElement
    fireEvent.keyDown(wheel, { key: 'ArrowUp' })
    expect(onSelect).toHaveBeenCalledWith(11)
  })

  it('End 跳到末项（非循环年份滚轮场景）', () => {
    const onSelect = vi.fn()
    const yearItems = Array.from({ length: 5 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))
    const { container } = render(<WheelPicker items={yearItems} selectedIndex={0} onSelect={onSelect} />)
    const wheel = container.querySelector('.dv-wheel') as HTMLElement
    fireEvent.keyDown(wheel, { key: 'End' })
    expect(onSelect).toHaveBeenCalledWith(4)
  })
})
