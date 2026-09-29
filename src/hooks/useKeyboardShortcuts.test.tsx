import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { useKeyboardShortcuts, KeyboardShortcutHandlers } from './useKeyboardShortcuts'

afterEach(() => cleanup())

function Harness({ handlers }: { handlers: Partial<KeyboardShortcutHandlers> }) {
  useKeyboardShortcuts(handlers as unknown as KeyboardShortcutHandlers)
  return <div />
}

describe('useKeyboardShortcuts · 批次② P0-B 键位注册', () => {
  it('⌘Q / Ctrl+Q 触发 onQuit', () => {
    const onQuit = vi.fn()
    render(<Harness handlers={{ onQuit }} />)
    fireEvent.keyDown(document, { key: 'q', metaKey: true })
    expect(onQuit).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'q', ctrlKey: true })
    expect(onQuit).toHaveBeenCalledTimes(2)
  })

  it('⌘N / Ctrl+N 触发 onNewFile', () => {
    const onNewFile = vi.fn()
    render(<Harness handlers={{ onNewFile }} />)
    fireEvent.keyDown(document, { key: 'n', metaKey: true })
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true })
    expect(onNewFile).toHaveBeenCalledTimes(2)
  })

  it('⌘W / Ctrl+W 触发 onCloseFile', () => {
    const onCloseFile = vi.fn()
    render(<Harness handlers={{ onCloseFile }} />)
    fireEvent.keyDown(document, { key: 'w', metaKey: true })
    fireEvent.keyDown(document, { key: 'w', ctrlKey: true })
    expect(onCloseFile).toHaveBeenCalledTimes(2)
  })

  it('⌘F（无 Shift）触发 onFind；⌘⇧F 不触发 onFind（交全局搜索）', () => {
    const onFind = vi.fn()
    const onGlobalSearch = vi.fn()
    render(<Harness handlers={{ onFind, onGlobalSearch }} />)
    fireEvent.keyDown(document, { key: 'f', metaKey: true })
    expect(onFind).toHaveBeenCalledTimes(1)
    expect(onGlobalSearch).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'F', metaKey: true, shiftKey: true })
    expect(onGlobalSearch).toHaveBeenCalledTimes(1)
  })

  it('⌘Z 在可编辑焦点时不触发 onUndo（交编辑器原生 undo）', () => {
    const onUndo = vi.fn()
    render(<Harness handlers={{ onUndo }} />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(document, { key: 'z', metaKey: true })
    expect(onUndo).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true })
    expect(onUndo).not.toHaveBeenCalled()
    input.remove()
  })

  it('⌘Z / ⌘⇧Z 在非可编辑焦点时兜底触发 onUndo / onRedo', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    render(<Harness handlers={{ onUndo, onRedo }} />)
    document.body.focus()
    fireEvent.keyDown(document, { key: 'z', metaKey: true })
    expect(onUndo).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true })
    expect(onRedo).toHaveBeenCalledTimes(1)
  })
})
