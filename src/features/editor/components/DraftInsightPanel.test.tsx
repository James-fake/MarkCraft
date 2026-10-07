/**
 * P2-5 DraftInsightPanel 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import DraftInsightPanel from './DraftInsightPanel'

const longText = '这是一篇较长的文章正文。'.repeat(20)

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
})

describe('<DraftInsightPanel />', () => {
  it('头部标注「本地启发式 · 不上云」', () => {
    render(<DraftInsightPanel content={longText} />)
    const badge = screen.getByTitle('本地启发式分析，不上传任何内容')
    expect(badge.textContent).toContain('本地启发式')
    expect(badge.textContent).toContain('不上云')
  })

  it('长文无来源时给出信源提示', () => {
    render(<DraftInsightPanel content={longText} />)
    expect(screen.getByText(/未检测到引用来源/)).toBeTruthy()
  })

  it('短内容显示空状态', () => {
    render(<DraftInsightPanel content="短" />)
    expect(screen.getByText('内容过短或未发现问题，继续保持。')).toBeTruthy()
  })

  it('可折叠/展开', () => {
    render(<DraftInsightPanel content={longText} />)
    expect(screen.getByText(/未检测到引用来源/)).toBeTruthy()
    act(() => { fireEvent.click(screen.getByLabelText('切换成稿核查面板')) })
    expect(screen.queryByText(/未检测到引用来源/)).toBeNull()
  })
})
