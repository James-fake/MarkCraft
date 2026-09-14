/**
 * P1-6 TemplateInsertModal 测试
 * 验证「模板 / 范例」双标签切换、场景模板与范例库的一键载入。
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TemplateInsertModal from './TemplateInsertModal'
import { ToastProvider } from '../../components/ui/ToastProvider'

const renderModal = (onInsert = vi.fn()) =>
  render(
    <ToastProvider>
      <TemplateInsertModal isOpen onClose={() => {}} onInsert={onInsert} />
    </ToastProvider>
  )

describe('<TemplateInsertModal /> P1-6', () => {
  it('默认展示模板标签并含场景模板', () => {
    renderModal()
    expect(screen.getByText('模板')).toBeTruthy()
    expect(screen.getByText('范例')).toBeTruthy()
    // 场景模板可见
    expect(screen.getByText('博客发文')).toBeTruthy()
    expect(screen.getByText('Newsletter 期')).toBeTruthy()
    expect(screen.getByText('系列专栏')).toBeTruthy()
  })

  it('插入模板会套用变量（{{title}} → 实际值）', () => {
    const onInsert = vi.fn()
    renderModal(onInsert)
    // 选中「博客发文」
    fireEvent.click(screen.getByText('博客发文'))
    fireEvent.click(screen.getByText('插入'))
    expect(onInsert).toHaveBeenCalledTimes(1)
    const content = onInsert.mock.calls[0][0] as string
    expect(content).toContain('博客发文：')
    expect(content).not.toContain('{{title}}')
  })

  it('切换到范例标签并一键载入成稿范例', () => {
    const onInsert = vi.fn()
    renderModal(onInsert)
    act(() => { fireEvent.click(screen.getByText('范例')) })
    // 范例条目可见（列表项与预览区均含该名称，故用 getAllByText）
    expect(screen.getAllByText(/范例 · 博客/).length).toBeGreaterThanOrEqual(1)
    // 点击列表中的范例条目
    fireEvent.click(screen.getAllByText(/范例 · 博客/)[0])
    fireEvent.click(screen.getByText('插入'))
    expect(onInsert).toHaveBeenCalledTimes(1)
    const content = onInsert.mock.calls[0][0] as string
    expect(content).toContain('本地优先写作')
  })

  it('范例标签下不显示「分享此模板」按钮', () => {
    renderModal()
    act(() => { fireEvent.click(screen.getByText('范例')) })
    // 分享按钮文案仅在模板标签渲染
    expect(screen.queryByText('分享此模板')).toBeNull()
  })
})
