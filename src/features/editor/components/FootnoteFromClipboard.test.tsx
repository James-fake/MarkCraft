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
  it('剪贴板为 URL 时调用 onAddFootnote 并提示已转换', async () => {
    const onAdd = vi.fn().mockReturnValue(true)
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('https://example.com')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).toHaveBeenCalledWith('https://example.com')
    expect(screen.getByText('已转为脚注')).toBeTruthy()
  })

  it('剪贴板含多行链接时一并传入（由父级转换）', async () => {
    const onAdd = vi.fn().mockReturnValue(true)
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('论文A https://a.com\n论文B https://b.com')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).toHaveBeenCalledWith('论文A https://a.com\n论文B https://b.com')
    expect(screen.getByText('已转为脚注')).toBeTruthy()
  })

  it('无可转换链接时调用父级但提示未转换', async () => {
    const onAdd = vi.fn().mockReturnValue(false)
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('plain text')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).toHaveBeenCalledWith('plain text')
    expect(screen.getByText('剪贴板中没有可转为脚注的链接')).toBeTruthy()
  })

  it('剪贴板为空时提示且不调用父级', async () => {
    const onAdd = vi.fn().mockReturnValue(false)
    ;(navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue('   ')
    render(<FootnoteFromClipboard onAddFootnote={onAdd} />)
    await act(async () => { fireEvent.click(screen.getByLabelText('粘贴为脚注')) })
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('剪贴板为空')).toBeTruthy()
  })
})
