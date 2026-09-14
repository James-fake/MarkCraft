import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FloatingFormatToolbar from './FloatingFormatToolbar'

const rect = { left: 100, top: 200, right: 300, bottom: 220 }

describe('FloatingFormatToolbar', () => {
  it('renders bold/italic/strike/code/link buttons', () => {
    render(<FloatingFormatToolbar rect={rect} language="zh" onFormat={vi.fn()} />)
    expect(screen.getByTitle('加粗')).toBeTruthy()
    expect(screen.getByTitle('斜体')).toBeTruthy()
    expect(screen.getByTitle('删除线')).toBeTruthy()
    expect(screen.getByTitle('行内代码')).toBeTruthy()
    expect(screen.getByTitle('插入链接')).toBeTruthy()
  })

  it('calls onFormat with the right kind on mousedown', () => {
    const onFormat = vi.fn()
    render(<FloatingFormatToolbar rect={rect} language="zh" onFormat={onFormat} />)
    fireEvent.mouseDown(screen.getByTitle('加粗'))
    expect(onFormat).toHaveBeenCalledWith('bold')
    fireEvent.mouseDown(screen.getByTitle('斜体'))
    expect(onFormat).toHaveBeenCalledWith('italic')
    fireEvent.mouseDown(screen.getByTitle('删除线'))
    expect(onFormat).toHaveBeenCalledWith('strike')
    fireEvent.mouseDown(screen.getByTitle('行内代码'))
    expect(onFormat).toHaveBeenCalledWith('code')
  })

  it('reflects active marks via aria-pressed', () => {
    render(
      <FloatingFormatToolbar
        rect={rect}
        language="en"
        activeMarks={{ bold: true, link: true }}
        onFormat={vi.fn()}
      />
    )
    expect(screen.getByTitle('Bold')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('Italic')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('Insert link')).toHaveAttribute('aria-pressed', 'true')
  })

  it('link editing flow applies url on Enter', () => {
    const onFormat = vi.fn()
    render(<FloatingFormatToolbar rect={rect} language="zh" onFormat={onFormat} />)
    fireEvent.mouseDown(screen.getByTitle('插入链接'))
    const input = screen.getByPlaceholderText('输入链接地址') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'https://a.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onFormat).toHaveBeenCalledWith('link', 'https://a.com')
  })

  it('link editing shows input and applies on check button', () => {
    const onFormat = vi.fn()
    render(<FloatingFormatToolbar rect={rect} language="en" onFormat={onFormat} />)
    fireEvent.mouseDown(screen.getByTitle('Insert link'))
    const input = screen.getByPlaceholderText('Enter URL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://b.com' } })
    fireEvent.mouseDown(screen.getByTitle('Apply link'))
    expect(onFormat).toHaveBeenCalledWith('link', 'https://b.com')
  })
})
