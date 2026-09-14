/**
 * 按压反馈一致性契约测试（MOTION-AUDIT 2026-09-14 §4 · PLAN-04）
 * ------------------------------------------------------------
 * 事故背景：AUDIT.md 规定所有可点按元素的按下态须有「物理下沉」信号
 * （`transform: scale(0.97)`，区间 0.95–0.98，配 160ms 级 ease-out）。
 * 全仓范本 = `kb.css:136` 的 `.aurora-kb-btn:active { transform: scale(0.97); }`。
 * 但主按钮族（`.aurora-btn` 五变体 + 博客 `.aurora-blog-btn--primary`）
 * 只有背景/阴影变化，**零 transform 反馈** —— 按下时视觉不"跟手"。
 *
 * 本测试锁死四件事：
 *  1) 六个 :active 变体都带 scale(0.97)；
 *  2) 两个基类都声明了 transform 的 transition（否则 scale 会瞬间跳变）；
 *  3) disabled 态不可触发按压（pointer-events:none 或 :not(:disabled) 守卫）；
 *  4) 指针门控块（PLAN-01）**不得**含 scale 归零规则 —— 按压反馈是
 *     瞬时态（:active），与悬停门控（:hover）职责不同，误伤会让触屏按下无反馈。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const components = readFileSync(resolve(__dirname, 'components.css'), 'utf-8')
const blog = readFileSync(resolve(__dirname, 'panels/blog.css'), 'utf-8')
const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf-8')

/** 取出一条规则的完整文本（选择器 + 声明块）。 */
function ruleOf(css: string, selector: string): string {
  const i = css.indexOf(selector)
  if (i < 0) return ''
  const open = css.indexOf('{', i)
  const close = css.indexOf('}', open)
  if (open < 0 || close < 0) return ''
  return css.slice(i, close + 1)
}

describe('按压反馈 · 六处 :active 变体均带物理下沉', () => {
  const cases: Array<[string, string, string]> = [
    ['components.css', '.aurora-btn--primary:active', components],
    ['components.css', '.aurora-btn--secondary:active', components],
    ['components.css', '.aurora-btn--ghost:active', components],
    ['components.css', '.aurora-btn--danger:active', components],
    ['components.css', '.aurora-btn--danger-solid:active', components],
    ['blog.css', '.aurora-blog-btn--primary:active', blog],
  ]

  it.each(cases)('%s → %s 含 transform: scale(0.97)', (_file, selector, css) => {
    const rule = ruleOf(css, selector)
    expect(rule, `规则 ${selector} 不存在`).not.toBe('')
    expect(rule).toMatch(/transform:\s*scale\(0\.97\)/)
  })

  it('缩放幅度落在 AUDIT.md 允许区间 0.95–0.98', () => {
    for (const [, selector, css] of cases) {
      const m = ruleOf(css, selector).match(/scale\(([\d.]+)\)/)
      expect(m, `${selector} 未取到 scale 值`).not.toBeNull()
      const v = parseFloat(m![1])
      expect(v).toBeGreaterThanOrEqual(0.95)
      expect(v).toBeLessThanOrEqual(0.98)
    }
  })

  it('不使用 scale(0)（AUDIT.md 明令禁止的入场/按压写法）', () => {
    for (const [, selector, css] of cases) {
      expect(ruleOf(css, selector)).not.toMatch(/scale\(0\)/)
    }
  })
})

describe('按压反馈 · 基类声明 transform 过渡（防瞬时跳变）', () => {
  it('.aurora-btn 基类 transition 含 transform', () => {
    const base = ruleOf(components, '.aurora-btn {')
    expect(base).not.toBe('')
    expect(base).toMatch(/transition[\s\S]*transform/)
  })

  it('.aurora-blog-btn 基类 transition 含 transform', () => {
    const base = ruleOf(blog, '.aurora-blog-btn {')
    expect(base).not.toBe('')
    expect(base).toMatch(/transition[\s\S]*transform/)
  })

  it('两个基类的 transform 过渡都消费统一动效 token（非硬编码毫秒）', () => {
    for (const css of [components, blog]) {
      const base = ruleOf(css, css === components ? '.aurora-btn {' : '.aurora-blog-btn {')
      const decl = base.slice(base.indexOf('transition'))
      const transformPart = decl.slice(decl.indexOf('transform'))
      expect(transformPart).toMatch(/var\(--mc-dur-/)
    }
  })
})

describe('按压反馈 · disabled 态不可触发', () => {
  it('.aurora-btn:disabled 用 pointer-events:none 屏蔽 :active', () => {
    const rule = ruleOf(components, '.aurora-btn:disabled')
    expect(rule, '.aurora-btn:disabled 规则缺失').not.toBe('')
    expect(rule).toMatch(/pointer-events:\s*none/)
  })
})

describe('按压反馈 · 与 PLAN-01 指针门控职责不冲突', () => {
  /** 取出指针门控块全文。 */
  function gatingBlock(): string {
    const start = tokens.search(/@media\s*\(hover:\s*none\)\s*,\s*\(pointer:\s*coarse\)\s*\{/)
    if (start < 0) return ''
    let i = tokens.indexOf('{', start)
    let depth = 0
    for (; i < tokens.length; i++) {
      if (tokens[i] === '{') depth++
      else if (tokens[i] === '}') {
        depth--
        if (depth === 0) return tokens.slice(start, i + 1)
      }
    }
    return ''
  }

  it('门控块只管 :hover，不写 :active 归零（否则触屏按下无反馈）', () => {
    const block = gatingBlock()
    expect(block).not.toBe('')
    expect(block).not.toMatch(/:active/)
  })

  it('门控块内的 scale 归零只出现在 hover 选择器上', () => {
    const block = gatingBlock()
    // 门控块对缩放型 hover 用 `transform: none`（非 scale(0)/scale(1)）
    const scaleDecls = block.match(/transform:\s*scale\([^)]*\)/g) ?? []
    expect(scaleDecls).toHaveLength(0)
  })
})
