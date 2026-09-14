/**
 * P1-5 WritingAidPanel 组件测试
 * 验证四区块渲染、复制（navigator.clipboard）、应用标题回调、空内容降级与折叠交互。
 * 纯函数逻辑已在 writingAid.test.ts 覆盖，此处聚焦组件行为与「本地处理·不上云」标识。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import WritingAidPanel from './WritingAidPanel'

const content = `# 本地优先写作\n\nReact 是前端框架。React 很流行。React 很强大。\n他其实，已经来了。\n\n## 小节一\n\n正文中出现 前端 一词多次。前端 很重要。\n\n### 子节\n\n普通段落。`

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('<WritingAidPanel />', () => {
  it('渲染头部并显著标注「本地处理 · 不上云」', () => {
    render(<WritingAidPanel content={content} />)
    expect(screen.getByText('写作辅助')).toBeTruthy()
    const badge = screen.getByTitle('所有分析均在前端本地完成，不上传任何内容')
    expect(badge.textContent).toContain('本地处理')
    expect(badge.textContent).toContain('不上云')
  })

  it('标题区块展示建议标题与 slug', () => {
    render(<WritingAidPanel content={content} />)
    // 首个 # 标题被采纳（标题区块与大纲列表均会出现该文本，故用 getAllByText）
    expect(screen.getAllByText('本地优先写作').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/slug: 本地优先写作/)).toBeTruthy()
  })

  it('点击「应用」触发 onApplyTitle 回调', () => {
    const onApply = vi.fn()
    render(<WritingAidPanel content={content} onApplyTitle={onApply} />)
    fireEvent.click(screen.getByLabelText('应用建议标题'))
    expect(onApply).toHaveBeenCalledWith('本地优先写作')
  })

  it('未传 onApplyTitle 时不渲染「应用」按钮', () => {
    render(<WritingAidPanel content={content} />)
    expect(screen.queryByLabelText('应用建议标题')).toBeNull()
  })

  it('大纲区块列出标题并标注行号', () => {
    render(<WritingAidPanel content={content} />)
    expect(screen.getByText('行 1')).toBeTruthy() // # 本地优先写作 在行 1
    expect(screen.getByText('行 6')).toBeTruthy() // ## 小节一 在行 6（含空行）
    expect(screen.getByText('行 10')).toBeTruthy() // ### 子节 在行 10（含空行）
    expect(screen.getByLabelText('大纲').textContent).toContain('3')
  })

  it('润色区块报告冗余词建议', () => {
    render(<WritingAidPanel content={content} />)
    // 「他其实，已经来了。」应被识别为冗余词
    expect(screen.getByText(/冗余词/)).toBeTruthy()
    expect(screen.getByLabelText('润色建议').textContent).toContain('1')
  })

  it('焦点关键词区块列出加权关键词', () => {
    render(<WritingAidPanel content={content} />)
    expect(screen.getByLabelText('焦点关键词').textContent).toContain('2')
    // react 来自 # 标签加权 + 词频，应出现在区块内
    expect(screen.getByText(/react/)).toBeTruthy()
  })

  it('复制 slug 调用 navigator.clipboard.writeText', async () => {
    render(<WritingAidPanel content={content} />)
    fireEvent.click(screen.getByLabelText('复制标题'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    // 标题「本地优先写作」slug 保留中文 → 期望原样
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('本地优先写作')
  })

  it('复制润色后全文', async () => {
    render(<WritingAidPanel content={content} />)
    fireEvent.click(screen.getByLabelText('复制润色后全文'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    const called = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(called).not.toContain('其实') // 冗余词已被移除
  })

  it('复制关键词列表', async () => {
    render(<WritingAidPanel content={content} />)
    fireEvent.click(screen.getByLabelText('复制关键词'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
    const called = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(called).toContain('react')
  })

  it('空内容时各区块降级为空状态且不崩溃', () => {
    render(<WritingAidPanel content="" />)
    expect(screen.getByText('开始写作后将自动建议标题。')).toBeTruthy()
    expect(screen.getByText('暂无标题结构。')).toBeTruthy()
    expect(screen.getByText('暂无明显可优化项。')).toBeTruthy()
    expect(screen.getByText('暂无可提取关键词。')).toBeTruthy()
  })

  it('可折叠 / 展开', () => {
    render(<WritingAidPanel content={content} />)
    expect(screen.getByText('行 1')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByLabelText('切换写作辅助面板')) })
    expect(screen.queryByText('行 1')).toBeNull()
    act(() => { fireEvent.click(screen.getByLabelText('切换写作辅助面板')) })
    expect(screen.getByText('行 1')).toBeTruthy()
  })
})
