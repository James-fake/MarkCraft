/**
 * 指针类型门控契约测试（MOTION-AUDIT 2026-09-14 §6 · PLAN-01）
 * ------------------------------------------------------------
 * 事故背景：全仓 312 处 :hover、0 处指针门控。触屏 / 粗糙指针设备上，
 * 点击会触发「假 hover」并在手指离开后残留：
 *  - 位移型（translateY 上浮）→ 卡片「粘」在抬起态；
 *  - 缩放型（scale）→ 色板/按钮「卡」在放大态。
 * 修复：tokens.css 增加 `@media (hover: none), (pointer: coarse)` 块，
 * 把「纯位移/缩放型」hover 归零；颜色/背景类 hover 无害保留。
 *
 * 本测试锁死三件事：
 *  1) 门控块存在，且用正确的媒体查询语义（hover:none / pointer:coarse）；
 *  2) 真实在用的位移型 hover 选择器被覆盖；
 *  3) **复合 transform 必须豁免**——switch 打开态拇指的 translateX(16px) 是状态位移，
 *     若被 `transform:none` 误伤会破坏开关定位（这是本方案最易踩的坑）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf-8')

/** 取出指针门控块全文（从 @media 到与之配对的收尾大括号）。 */
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

describe('指针门控 · 媒体查询语义', () => {
  it('门控块存在', () => {
    expect(gatingBlock()).not.toBe('')
  })

  it('用 hover:none + pointer:coarse 双信号（触屏/粗糙指针）', () => {
    const block = gatingBlock()
    expect(block).toMatch(/@media\s*\(hover:\s*none\)\s*,\s*\(pointer:\s*coarse\)/)
  })

  it('门控块整体大括号闭合（不吞并后续 reduced-motion 块）', () => {
    const block = gatingBlock()
    let depth = 0
    for (const ch of block) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
      expect(depth).toBeGreaterThanOrEqual(0)
    }
    expect(depth).toBe(0)
    // 门控块之后必须仍能读到 reduced-motion 块
    const after = tokens.slice(tokens.indexOf(block) + block.length)
    expect(after).toMatch(/prefers-reduced-motion/)
  })
})

describe('指针门控 · 真实在用的位移/缩放型 hover 被覆盖', () => {
  const cases = [
    '.aurora-blog-theme:hover',
    '.aurora-blog-color:hover',
    '.aurora-welcome__tile:hover',
    '.kb-kbcard:hover',
    '.kb-note:hover',
    '.aurora-cip__swatch:hover',
    '.scroll-btn:hover',
  ]

  it.each(cases)('%s 在门控块内被归零', (selector) => {
    expect(gatingBlock()).toContain(selector)
  })
})

describe('指针门控 · 复合 transform 豁免（防状态被误伤）', () => {
  it('switch 打开态拇指保留 translateX(16px) 位移（不写成 none）', () => {
    const block = gatingBlock()
    expect(block).toMatch(
      /\.aurora-switch--on:hover\s+\.aurora-switch__thumb\s*\{[^}]*transform:\s*translateX\(16px\)/
    )
  })

  it('开关拇指 OFF 态可归零，但仍保留 ON 态的位移规则在其后', () => {
    const block = gatingBlock()
    const off = block.search(/\.aurora-switch:hover\s+\.aurora-switch__thumb/)
    const on = block.search(/\.aurora-switch--on:hover\s+\.aurora-switch__thumb/)
    expect(off).toBeGreaterThanOrEqual(0)
    expect(on).toBeGreaterThan(off) // ON 规则必须在 OFF 之后，才能覆盖
  })

  it('katex tooltip 的 translateX(-50%) 居中不得出现在门控块（会破坏定位）', () => {
    expect(gatingBlock()).not.toMatch(/katex/)
  })
})

describe('指针门控 · 不收录死 CSS / 不用通配符', () => {
  it('不写 *:hover 通配归零（会误伤手势态与内联样式）', () => {
    expect(gatingBlock()).not.toMatch(/\*:hover/)
  })

  const dead = [
    'aurora-card--hoverable',
    'aurora-sticky',
    'aurora-kanban__card',
    'aurora-mindmap__node',
    'kb-stat',
    'kb-tpl-card',
  ]
  it.each(dead)('已退役选择器 %s 不收录（门槛只约束真实界面）', (sel) => {
    expect(gatingBlock()).not.toContain(sel)
  })
})
