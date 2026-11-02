import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DeployPanel from './DeployPanel'
import type { BlogGenerationResult } from '../utils/blogMultiFileGenerator'
import { zh } from '@locales/zh'
import { en } from '@locales/en'
import { StudioThemeProvider } from './StudioControls'

/**
 * 回归（2026-11-02 线上报错「Cannot read properties of undefined (reading 'blogCss')」）：
 * DeployPanel 首渲染即读 `t.blogCss.deployStep`。语言包两个命名空间都必须携带
 * deploy* 键；本测试锁死「真实 zh/en 语言包下 DeployPanel 可完整挂载」，防止
 * 语言包重构（改名/搬迁命名空间）悄悄弄丢 deploy 键导致整面板崩溃。
 */
describe('DeployPanel · 语言包挂载回归', () => {
  const fakeResult = { files: [] } as unknown as BlogGenerationResult

  it('zh 语言包下完整挂载并显示部署步骤文案', () => {
    render(
      <StudioThemeProvider value={{ isDark: true }}>
        <DeployPanel result={fakeResult} t={zh} />
      </StudioThemeProvider>,
    )
    expect(screen.getByText(/一键部署/)).toBeTruthy()
  })

  it('en 语言包下完整挂载', () => {
    render(
      <StudioThemeProvider value={{ isDark: true }}>
        <DeployPanel result={fakeResult} t={en} />
      </StudioThemeProvider>,
    )
    expect(screen.getByText(/One-click Deploy/)).toBeTruthy()
  })

  it('zh/en 语言包均含 DeployPanel 所需的全部 deploy* 键（结构性锁）', () => {
    const need = ['deployStep', 'deployStart', 'deployFailed', 'deployValidateFailed'] as const
    for (const pack of [zh, en]) {
      const ns = (pack as unknown as Record<string, Record<string, string>>).blogCss
      expect(ns, 'blogCss 命名空间必须存在').toBeTruthy()
      for (const k of need) {
        expect(typeof ns[k], `blogCss.${k} 必须是字符串`).toBe('string')
      }
    }
  })
})
