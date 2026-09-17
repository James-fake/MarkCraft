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
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf-8')

const srcRoot = resolve(__dirname, '../..')

/** 递归收集 src/ 下全部 .css（与 deadCssPurge 守卫同源，避免各扫各的）。 */
function walkCss(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walkCss(abs, acc)
    } else if (e.name.endsWith('.css')) acc.push(abs)
  }
  return acc
}

/** 某选择器（无前导点的裸类名）在全仓 CSS 中是否仍有定义。剥注释：说明文字里的名字不算定义。 */
function definedAnywhere(sel: string): boolean {
  const re = new RegExp(`\\.${sel}(?![a-zA-Z0-9])`)
  return walkCss(srcRoot).some((f) =>
    re.test(readFileSync(f, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')),
  )
}

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
    '.aurora-cip__swatch:hover',
    '.scroll-btn:hover',
  ]
  // ⚠️ 2026-09-17 批 2.5-C：`.kb-kbcard:hover` / `.kb-note:hover` 两条已从本用例
  //    与 tokens.css 门控块**一并移除** —— 这两个类是旧版「整窗知识库外壳」的卡片，
  //    Aurora 已用 .aurora-kb-* 重建，非测试代码零承载者。门控块只约束真实界面，
  //    留着等于给死规则发维护假象（且会让下面的 A 组断言自相矛盾）。

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

  // 门槛只约束**真实界面**。但「退役」有两种落点，旧版把两者混在一个数组里断言，
  // 掩盖了真相 —— 2026-09-17 死 CSS 清剿后拆成两组：
  //   A) 已**整族删除** → 现在应当**全仓零定义**；
  //   B) 仅**视觉退役**、类仍存活于代码（属后续批次范畴）→ 只能断言"不被门槛收录"。
  // 批 1（aurora-*）与批 2.5-C（kb-*）分列，便于定位是哪一批兑现的。
  const deletedInPurge1 = ['aurora-sticky', 'aurora-kanban__card', 'aurora-mindmap__node'] // A
  // 批 2.5-C：kb-ui.css 旧「整窗知识库外壳」整族清剿（kb-ui.css 116 类 → 46 类）。
  // 这四个类同时是门控块里 .kb-kbcard:hover / .kb-note:hover 的来源；本批次把
  // 「CSS 里的死规则」与「门控块里的死选择器」一并收口，故由 B 组迁入 A 组。
  // 迁组动作本身是**升级**，不是放宽：B 组断言「有定义」（会随删除变红并提示迁移），
  // A 组断言「零定义」，强度更高。
  const deletedInPurge25C = ['kb-stat', 'kb-tpl-card', 'kb-kbcard', 'kb-note'] // A
  const deletedInPurge = [...deletedInPurge1, ...deletedInPurge25C]
  const retiredButAlive = ['aurora-card--hoverable'] // B

  it.each([...deletedInPurge, ...retiredButAlive])(
    '已退役选择器 %s 不收录（门槛只约束真实界面）',
    (sel) => {
      expect(gatingBlock()).not.toContain(sel)
    },
  )

  it.each(deletedInPurge)('A 组 %s 已被清剿 → 全仓 CSS 零定义', (sel) => {
    // 由旧版「不在门控块里」的弱断言**升级**而来，与 deadCssPurge.test.ts 的 PURGED
    // 清单互为正反面：那边钉"整族不得回流"，这边钉"本黑名单条目确已兑现"。
    // （剥注释是关键 —— tokens.css 的门控块说明里就写着这几个名字。）
    expect(definedAnywhere(sel)).toBe(false)
  })

  it.each(retiredButAlive)('B 组 %s 仍存活于代码 → 只是未归门槛管（诚实绊线）', (sel) => {
    // 反向绊线：B 组的前提是"它确实还有定义，只是暂不归门槛管"。
    // 一旦有人真删了它，本行会变红 → 提示把条目**迁到 A 组**，而不是让名单静默失真。
    expect(definedAnywhere(sel)).toBe(true)
  })
})
