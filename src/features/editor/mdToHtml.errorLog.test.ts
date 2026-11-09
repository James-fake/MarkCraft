import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 回归锁（2026-11-08 审查 C 组）：整条渲染管线一个大 try/catch，catch 静默吞异常、
 * 降级为「转义后的原始 md」且无任何日志 —— 线上渲染异常无从排查。
 * 修复要求：降级行为不变，但必须用项目 logger 记录错误（保留 Error 对象以带出堆栈）。
 */
const { renderMarkdownMock, loggerErrorMock } = vi.hoisted(() => ({
  renderMarkdownMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}))

vi.mock('@services/sanitizeHtml', () => ({ renderMarkdown: renderMarkdownMock }))
vi.mock('@utils/logger', () => ({
  logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn() },
}))

import { markdownToHtml } from './mdToHtml'

const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

describe('markdownToHtml · 渲染异常可观测（回归 2026-11-08）', () => {
  beforeEach(() => {
    renderMarkdownMock.mockReset()
    loggerErrorMock.mockReset()
  })

  it('catch 分支记录错误对象（含堆栈），而不是静默吞掉', () => {
    const err = new Error('marked boom')
    renderMarkdownMock.mockImplementation(() => {
      throw err
    })

    const out = markdownToHtml('正文 <tag>', noopImageStore)

    expect(loggerErrorMock, '异常必须进日志').toHaveBeenCalledTimes(1)
    const [message, logged] = loggerErrorMock.mock.calls[0]
    expect(String(message)).toContain('markdownToHtml')
    expect(logged, '必须记录原始 Error 以保留堆栈').toBe(err)
    // 优雅降级行为保持不变：转义后的原始 md 包进 <p>
    expect(out).toBe('<p>正文 &lt;tag&gt;</p>')
  })

  it('正常路径不产生错误日志，输出不变', () => {
    renderMarkdownMock.mockReturnValue('<p>ok</p>')

    expect(markdownToHtml('ok', noopImageStore)).toBe('<p>ok</p>')
    expect(loggerErrorMock).not.toHaveBeenCalled()
  })
})
