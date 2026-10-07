/**
 * P2-6 FootnoteFromClipboard 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FootnoteFromClipboard from './FootnoteFromClipboard'

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { readText: vi.fn(), writeText: vi.fn() },
    configurable: true,
  })
})

describe('<FootnoteFromClipboard />', () => {
  it('剪贴板为 URL 时调用 onAddFootnote', async () => {
    const onAdd = vi.fn()
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('https://example.com')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).toHaveBeenCalledWith('https://example.com')
    expect(screen.getByText('已转为脚注')).toBeTruthy()
  })

  it('剪贴板非 URL 时提示且不调用', async () => {
    const onAdd = vi.fn()
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('plain text')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('剪贴板中不是有效 URL')).toBeTruthy()
  })
})
