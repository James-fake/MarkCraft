/**
 * 命令面板去动画契约测试（MOTION-AUDIT 2026-09-14 §1 · PLAN-03）
 * --------------------------------------------------------------------------
 * 决策依据：AUDIT.md §1 频率门控铁律 ——
 *   「100+ times/day (keyboard shortcuts, command palette toggle) → No animation. Ever.」
 *   "The strongest fix is often delete the animation."
 * 业界标杆 = Raycast 的命令面板开合零动画。
 *
 * 为什么这里动画有害：键盘用户手速远快于 200ms 动画 → 每次调用都被延迟感知，
 * 产生「迟钝」错觉；面板是瞬态工具而非空间内容，无需传达「从哪来」。
 *
 * 本测试锁死四件事：
 *  1) overlay / panel 均无任何 animation 声明；
 *  2) 两个关键帧已被彻底删除（不留死代码）；
 *  3) reduced-motion 块仍在（防御性，防未来加回动画时漏掉可达性处理）；
 *  4) 面板的**静态视觉**未被误删（宽高/圆角/阴影等，证明只删了动画而非整段裁剪）。
 *
 * 特别注意（防回退）：本测试的价值在于**阻止**未来有人「顺手加回一点出现感」。
 * 若确需回退为「120ms 纯 opacity」的弱版本，必须先改本测试并说明理由。
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'command-palette.css'), 'utf-8')

/** 剥离 CSS 注释后的内容（断言「无某声明」时必须在无注释文本上判断，
 *  否则注释里对旧值的说明文字会造成假失败）。 */
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** 取出指定选择器的完整声明块（同样剥离注释）。 */
function ruleOf(selector: string): string {
  const i = cssNoComments.indexOf(selector)
  if (i < 0) return ''
  const open = cssNoComments.indexOf('{', i)
  if (open < 0) return ''
  let depth = 0
  for (let j = open; j < cssNoComments.length; j++) {
    if (cssNoComments[j] === '{') depth++
    else if (cssNoComments[j] === '}') {
      depth--
      if (depth === 0) return cssNoComments.slice(i, j + 1)
    }
  }
  return ''
}

describe('PLAN-03 · 命令面板无入场动画', () => {
  it('.aurora-command-overlay 无 animation 声明', () => {
    const rule = ruleOf('.aurora-command-overlay')
    expect(rule, '规则缺失').not.toBe('')
    expect(rule).not.toMatch(/animation\s*:/)
  })

  it('.aurora-command 无 animation 声明', () => {
    const rule = ruleOf('.aurora-command {')
    expect(rule, '规则缺失').not.toBe('')
    expect(rule).not.toMatch(/animation\s*:/)
  })

  it('不存在任何 aurora-command-in 关键帧定义', () => {
    expect(cssNoComments).not.toMatch(/@keyframes\s+aurora-command-in\b/)
  })

  it('不存在任何 aurora-command-overlay-in 关键帧定义', () => {
    expect(cssNoComments).not.toMatch(/@keyframes\s+aurora-command-overlay-in\b/)
  })

  it('文件中无残留的 200ms / 180ms 入场动画时长', () => {
    // 面板本体不应再有动效时长（其它元素如 transient 提示不在本文件）
    expect(ruleOf('.aurora-command {')).not.toMatch(/200ms|180ms/)
    expect(ruleOf('.aurora-command-overlay')).not.toMatch(/200ms|180ms/)
  })
})

describe('PLAN-03 · 全仓无残留消费者', () => {
  it('src 下除文档与测试外无代码引用 aurora-command-in / overlay-in', () => {
    const root = resolve(__dirname, '../../..')
    const hits: string[] = []
    const selfFile = resolve(__dirname, 'commandPaletteNoAnim.test.ts')
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        const st = statSync(p)
        if (st.isDirectory()) {
          if (name === 'node_modules' || name.startsWith('.')) continue
          walk(p)
        } else if (/\.(css|tsx?|jsx?)$/.test(name)) {
          // 排除项：历史审计文档（记录当时现状，不构成消费者）与本测试自身（含断言模式字符串）
          if (/docs[\\/]design/.test(p)) continue
          if (p === selfFile) continue
          if (/\.test\.tsx?$/.test(name)) continue
          const body = readFileSync(p, 'utf-8')
          if (/aurora-command-in|aurora-command-overlay-in/.test(body)) hits.push(p)
        }
      }
    }
    walk(resolve(root, 'src'))
    expect(hits, `仍被引用于：${hits.join(', ')}`).toHaveLength(0)
  })
})

describe('PLAN-03 · 可达性与静态视觉未被误删', () => {
  it('reduced-motion 块仍存在（防未来加回动画时漏处理）', () => {
    expect(cssNoComments).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })

  it('reduced-motion 块仍覆盖 overlay 与 panel', () => {
    const i = cssNoComments.indexOf('@media (prefers-reduced-motion')
    const block = cssNoComments.slice(i)
    expect(block).toMatch(/\.aurora-command-overlay/)
    expect(block).toMatch(/\.aurora-command\b/)
  })

  it('面板静态视觉保留：宽度上限 / 圆角 / 阴影 / 最大高度', () => {
    const rule = ruleOf('.aurora-command {')
    expect(rule).toMatch(/max-width:\s*560px/)
    expect(rule).toMatch(/border-radius:\s*var\(--mc-radius-lg\)/)
    expect(rule).toMatch(/box-shadow:\s*var\(--mc-shadow-popover\)/)
    expect(rule).toMatch(/max-height:\s*70vh/)
  })

  it('overlay 静态视觉保留：fixed 全屏遮罩 + 层级带', () => {
    const rule = ruleOf('.aurora-command-overlay')
    expect(rule).toMatch(/position:\s*fixed/)
    expect(rule).toMatch(/inset:\s*0/)
    expect(rule).toMatch(/z-index:\s*9000/)
    expect(rule).toMatch(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.45\)/)
  })

  it('面板布局保留（flex 纵向 + overflow hidden）', () => {
    const rule = ruleOf('.aurora-command {')
    expect(rule).toMatch(/display:\s*flex/)
    expect(rule).toMatch(/flex-direction:\s*column/)
    expect(rule).toMatch(/overflow:\s*hidden/)
  })
})
