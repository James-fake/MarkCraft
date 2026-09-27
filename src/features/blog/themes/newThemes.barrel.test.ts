import { describe, it, expect } from 'vitest'
import * as newThemes from './newThemes'

/**
 * P1-3 回归锁（2026-09-27）：`newThemes.ts` 由 22,752 行单文件拆为
 * `themes/generators/<theme>.ts`（48 个），原文件退化为桶。
 *
 * 锁两件事：
 *  1. **对外 API 不缩水**——桶必须仍能拿到全部 `getXCss` 生成器（数量不得减少）；
 *  2. **生成器仍可调用且产物合法**——拆分只挪位置、不改内容，每个都应返回含 `:root` 的 CSS 串。
 *
 * 新增主题的正确姿势：在 `generators/` 加一个文件并登记到 `newThemes.ts` 桶，
 * 本用例会自动把它纳入校验（数量断言需同步 +1）。
 */
describe('newThemes 桶（P1-3 巨型文件拆分后）', () => {
  const generators = Object.entries(newThemes).filter(
    ([name, value]) => typeof value === 'function' && /^get\w+Css$/.test(name),
  ) as [string, (isDark: boolean) => string][]

  it('对外仍导出全部 48 个主题生成器（拆分未丢 API）', () => {
    expect(generators.length).toBe(48)
  })

  it('每个生成器在明暗两种模式下都返回合法 CSS（内容未被拆分破坏）', () => {
    for (const [name, fn] of generators) {
      for (const isDark of [false, true]) {
        const css = fn(isDark)
        expect(typeof css, `${name}(${isDark}) 应返回字符串`).toBe('string')
        expect(css.length, `${name}(${isDark}) 不应为空`).toBeGreaterThan(100)
        expect(css, `${name}(${isDark}) 应含 :root 变量块`).toContain(':root')
      }
    }
  })

  it('明暗模式产物确有差异（生成器未退化为忽略 isDark 的常量）', () => {
    // 对照组：cinematic / neon 两个生成器签名是 _isDark（不使用该参数），需排除
    const varying = generators.filter(([name]) => !['getCinematicCss', 'getNeonCss'].includes(name))
    const sample = varying.slice(0, 8)
    for (const [name, fn] of sample) {
      expect(fn(false), `${name} 明暗应不同`).not.toBe(fn(true))
    }
  })
})
