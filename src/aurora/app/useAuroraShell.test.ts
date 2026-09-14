import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { shouldAutoOpenWelcome, useAuroraShell } from './useAuroraShell'
import { viewNav } from '../../features/navigation/viewState'

/**
 * 审计 P2-1 · 首启欢迎逻辑（`shouldAutoOpenWelcome` 纯函数）固化单测。
 *
 * 守卫项：
 * 1. 首启 + 无深链 + 无博客工作室恢复 → true（自动打开欢迎）
 * 2. 已设置 seen → false（已跳过）
 * 3. URL 含 `#view=...` 深链 → false（深链优先，保留可达性）
 * 4. sessionStorage 标记博客工作室恢复 → false（保留博客上下文）
 * 5. 不抛异常（localStorage/sessionStorage 在禁用环境下 throw 也能降级）
 */
describe('P2-1 shouldAutoOpenWelcome · 首启欢迎判定', () => {
  beforeEach(() => {
    try { localStorage.removeItem('markcraft.onboarding.seen') } catch { /* ignore */ }
    try { sessionStorage.removeItem('markcraft_blog_studio') } catch { /* ignore */ }
    if (typeof location !== 'undefined') {
      // jsdom 默认 hash 为空；显式清空避免上一测残留
      window.history.replaceState(null, '', '/')
    }
  })

  afterEach(() => {
    try { localStorage.removeItem('markcraft.onboarding.seen') } catch { /* ignore */ }
    try { sessionStorage.removeItem('markcraft_blog_studio') } catch { /* ignore */ }
    if (typeof location !== 'undefined') {
      window.history.replaceState(null, '', '/')
    }
  })

  it('首启 + 无深链 + 无博客恢复 → true', () => {
    expect(shouldAutoOpenWelcome()).toBe(true)
  })

  it('已设置 seen → false（二次进入不弹）', () => {
    localStorage.setItem('markcraft.onboarding.seen', '1')
    expect(shouldAutoOpenWelcome()).toBe(false)
  })

  it('URL 含 #view=blog 深链 → false（深链优先，保留可达性）', () => {
    window.history.replaceState(null, '', '/#view=blog')
    expect(shouldAutoOpenWelcome()).toBe(false)
  })

  it('URL 含 #view=graph 等其它深链 → false', () => {
    window.history.replaceState(null, '', '/#view=graph')
    expect(shouldAutoOpenWelcome()).toBe(false)
  })

  it('sessionStorage 标记博客工作室恢复 → false', () => {
    sessionStorage.setItem('markcraft_blog_studio', '1')
    expect(shouldAutoOpenWelcome()).toBe(false)
  })

  it('深链 + 已 seen 双重条件下仍为 false（短路过早命中）', () => {
    localStorage.setItem('markcraft.onboarding.seen', '1')
    window.history.replaceState(null, '', '/#view=editor')
    expect(shouldAutoOpenWelcome()).toBe(false)
  })
})

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
