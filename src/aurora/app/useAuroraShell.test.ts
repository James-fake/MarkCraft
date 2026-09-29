import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuroraShell } from './useAuroraShell'
import { viewNav } from '../../features/navigation/viewState'

/**
 * nav() 的 param 语义（视图来源上下文）。
 *
 * 守卫项（2026-09-13 修复）：`nav('blog', kbId)` 必须把来源库写进 `params.kbId` ——
 * AuroraShell 据此把它作为 `kbId` 传给 BlogPanel，博客工作室才只发布「该库内笔记」。
 * 修复前 blog 落到 `else extra = { id: param }`，params.kbId 恒为 undefined，
 * 于是从知识库点「发布博客」拿到的仍是文件列表里的全部笔记（用户报障的根因）。
 * 反向：无 param 的 `nav('blog')`（侧栏「博客」入口 / 命令面板）不得残留旧 kbId，
 * 否则博客入口会被上一次的知识库来源污染。
 */
describe('nav() param 语义 · 博客发布来源', () => {
  afterEach(() => {
    viewNav.openView('editor')
    try { sessionStorage.removeItem('markcraft_blog_studio') } catch { /* ignore */ }
  })

  it('nav("blog", kbId) → params.kbId（来自知识库「发布博客」）', () => {
    const { result } = renderHook(() => useAuroraShell())
    act(() => { result.current.nav('blog', 'kb-1') })
    expect(viewNav.getState().view).toBe('blog')
    expect(viewNav.getState().params?.kbId).toBe('kb-1')
  })

  it('nav("blog") 无 param → 不携带 kbId（博客入口 = 文件列表全部笔记）', () => {
    const { result } = renderHook(() => useAuroraShell())
    act(() => { result.current.nav('blog', 'kb-1') })
    act(() => { result.current.nav('blog') })
    expect(viewNav.getState().view).toBe('blog')
    expect(viewNav.getState().params?.kbId).toBeUndefined()
  })

  it('nav("kb", kbId) 保持原有语义（回归保护）', () => {
    const { result } = renderHook(() => useAuroraShell())
    act(() => { result.current.nav('kb', 'kb-2') })
    expect(viewNav.getState().view).toBe('kb')
    expect(viewNav.getState().params?.kbId).toBe('kb-2')
  })

  it('nav("canvas", id) 仍映射 canvasId，未被 blog 分支影响', () => {
    const { result } = renderHook(() => useAuroraShell())
    act(() => { result.current.nav('canvas', 'cv-1') })
    expect(viewNav.getState().params?.canvasId).toBe('cv-1')
    expect(viewNav.getState().params?.kbId).toBeUndefined()
  })
})
