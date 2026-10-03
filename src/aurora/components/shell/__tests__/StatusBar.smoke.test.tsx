import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatusBar } from '../StatusBar'

/**
 * Aurora StatusBar 烟雾测试（P1-4 · 净化语义）
 * 目标：证明「保存态 = 文档型面板专属」——未传 savedState 不渲染伪「已保存」；
 * left/right 空容器整体隐藏；保存态渲染在 leftItems 最前。
 * 纯展示组件，无需 Providers。
 */

afterEach(() => {
  cleanup()
})

describe('Aurora StatusBar · P1-4 语义', () => {
  it('未传 savedState 时不渲染伪保存态，left 空则整段隐藏', () => {
    render(<StatusBar rightItems={[{ content: '⌘K 命令面板' }]} />)
    expect(screen.queryByText('已保存')).toBeNull()
    expect(screen.queryByText('未保存')).toBeNull()
    expect(screen.queryByText('Saved')).toBeNull()
    expect(screen.queryByText('Unsaved')).toBeNull()
    expect(document.querySelector('.aurora-statusbar__left')).toBeNull()
    expect(screen.getByText('⌘K 命令面板')).toBeTruthy()
  })

  it('savedState="saved" 时渲染保存态 + 绿点', () => {
    render(<StatusBar savedState="saved" savedText="已保存" />)
    expect(screen.getByText('已保存')).toBeTruthy()
    const dot = document.querySelector('.aurora-statusbar__dot')
    expect(dot).toBeTruthy()
    expect(dot?.classList.contains('aurora-statusbar__dot--unsaved')).toBe(false)
  })

  it('savedState="unsaved" 时渲染未保存 + 黄点', () => {
    render(<StatusBar savedState="unsaved" savedText="未保存" />)
    expect(screen.getByText('未保存')).toBeTruthy()
    const dot = document.querySelector('.aurora-statusbar__dot')
    expect(dot?.classList.contains('aurora-statusbar__dot--unsaved')).toBe(true)
  })

  it('保存态渲染在 leftItems 最前，且与后续项用 · 分隔', () => {
    render(<StatusBar savedState="saved" savedText="已保存" leftItems={[{ content: '120 字' }, { content: 'UTF-8' }]} />)
    const left = document.querySelector('.aurora-statusbar__left')
    expect(left?.textContent).toMatch(/已保存/)
    // 顺序：已保存 先于 字数
    const text = left?.textContent ?? ''
    expect(text.indexOf('已保存')).toBeLessThan(text.indexOf('120 字'))
  })

  it('right 空时不渲染右容器', () => {
    render(<StatusBar savedState="saved" savedText="已保存" />)
    expect(document.querySelector('.aurora-statusbar__right')).toBeNull()
  })
})
