import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuickCaptureModal from './QuickCaptureModal'

function renderModal() {
  const onCreate = vi.fn()
  const onClose = vi.fn()
  render(<QuickCaptureModal isOpen onCreate={onCreate} onClose={onClose} />)
  return { onCreate, onClose }
}

describe('QuickCaptureModal', () => {
  it('内容为空时点击「记一笔」不会落盘', () => {
    const { onCreate } = renderModal()
    const btn = screen.getByRole('button', { name: '记一笔' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('输入内容后点击「记一笔」回调收到名称与内容', () => {
    const { onCreate } = renderModal()
    const ta = screen.getByPlaceholderText(/闪过一个念头/)
    fireEvent.change(ta, { target: { value: '一个绝妙的想法' } })
    const btn = screen.getByRole('button', { name: '记一笔' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onCreate).toHaveBeenCalledTimes(1)
    const [name, content] = onCreate.mock.calls[0]
    expect(content).toBe('一个绝妙的想法')
    expect(name).toContain('一个绝妙的想法')
    expect(name.startsWith('快速记一笔')).toBe(true)
  })

  it('Ctrl+Enter 也可记一笔', () => {
    const { onCreate } = renderModal()
    const ta = screen.getByPlaceholderText(/闪过一个念头/)
    fireEvent.change(ta, { target: { value: '快捷记录' } })
    fireEvent.keyDown(ta, { key: 'Enter', ctrlKey: true })
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate.mock.calls[0][1]).toBe('快捷记录')
  })
})
