/**
 * 二级栏同源契约（2026-09-17）
 * ------------------------------------------------------------
 * 事故背景：知识库详情页 subbar 46 → 52px 之后，博客子栏（46 / compact 42）
 * 与白板顶栏（46 / compact 42）没有跟着走 → 跨视图切换时二级栏跳高 10px。
 *
 * 根因不是「三个数字不一样」，而是**同一个设计量在 3 个文件里各写一份**：
 *   · height 散落在 kb.css / blog.css / canvas.css；
 *   · 栏高还被复制进**派生偏移**（blog 功能列表浮层的 top: 46px / compact 42px）——
 *     改栏高时最容易漏掉这一处，漏了就是浮层错位；
 *   · 且 blog / ctop 各带一份 [data-density='compact'] 42px 覆写，
 *     而默认运行时密度就是 compact（densityStore 启动即广播 compact），
 *     于是「知识库 52 / 其余 42」成了常态。
 *
 * 修法：栏高与左右内缩上收为 tokens.css §12 的单源 token
 * （--mc-subbar-h / --mc-subbar-pad-x），三栏与派生偏移全部引用；密度覆写删除。
 *
 * 本文件钉死四条（改坏任一条即报红）：
 *  1. token 在 tokens.css 中**只定义一次** —— 密度档不得再分叉；
 *  2. 三处二级栏 height 一律 `var(--mc-subbar-h)`，不得出现硬编码 px；
 *  3. 派生偏移（blog 浮层 top / 右侧操作区 right）引用同一 token；
 *  4. [data-density] 下不得再对这三栏改 height。
 *
 * 注：静态断言只能证明「同源」，运行时**等高**由 CDP 真机几何取证（量 getBoundingClientRect）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const stylesDir = __dirname
/** 铁律：CSS「存在/不存在某声明」断言必须先剥离注释，
 *  否则本文件与各 CSS 顶部的中文说明（含 46px / 42px 字样）会自命中。 */
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const read = (rel: string) => strip(readFileSync(resolve(stylesDir, rel), 'utf-8'))

const tokensCss = read('tokens.css')
const cssByFile: Record<string, string> = {
  'panels/kb.css': read('panels/kb.css'),
  'panels/blog.css': read('panels/blog.css'),
  'panels/canvas.css': read('panels/canvas.css'),
}

/** 三处二级栏：[人读名, 样式文件, 选择器] */
const BARS: Array<[string, string, string]> = [
  ['知识库子栏', 'panels/kb.css', '.aurora-kb-subbar'],
  ['博客子栏', 'panels/blog.css', '.aurora-blog__subbar'],
  ['白板顶栏', 'panels/canvas.css', '.aurora-ctop'],
]

/**
 * 取某选择器**全部**规则体。
 * 选择器必须锚定在规则首（`(?:^|\n)[ \t]*SEL`）——否则 `.aurora-ctop`
 * 会误命中 `.aurora-ctop__left / __name / __switcher` 等一系列 BEM 子元素。
 */
const bodies = (css: string, selector: string): string[] => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|\\n)[ \\t]*${esc}[ \\t]*(?:,[^{}]*)?\\{([^{}]*)\\}`, 'g')
  return [...css.matchAll(re)].map((m) => m[1])
}

/** 取某 token 在该文件中的定义次数（>1 = 被密度档等分叉了） */
const tokenDefs = (css: string, name: string) => (css.match(new RegExp(`${name}\\s*:`, 'g')) ?? []).length
const tokenPx = (css: string, name: string) => Number(css.match(new RegExp(`${name}\\s*:\\s*(\\d+)px`))?.[1])

/** 取某选择器在带前置条件的规则（如 [data-density='compact'] .x）里的全部规则体 */
const conditionedBodies = (css: string, selector: string): string[] => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\[data-density[^\\]]*\\][^{]*${esc}[^{]*\\{([^{}]*)\\}`, 'g')
  return [...css.matchAll(re)].map((m) => m[1])
}

describe('二级栏同源契约（跨视图不跳高）', () => {
  it('--mc-subbar-h 只定义一次（密度档不得分叉）且 ≥ 52px', () => {
    expect(tokenDefs(tokensCss, '--mc-subbar-h'), 'token 必须单源，不得被 [data-density] 覆写').toBe(1)
    expect(tokenPx(tokensCss, '--mc-subbar-h')).toBeGreaterThanOrEqual(52)
  })

  it('--mc-subbar-pad-x 只定义一次且 ≥ 14px', () => {
    expect(tokenDefs(tokensCss, '--mc-subbar-pad-x'), 'token 必须单源').toBe(1)
    expect(tokenPx(tokensCss, '--mc-subbar-pad-x')).toBeGreaterThanOrEqual(14)
  })

  it.each(BARS)('%s 栏高引用 --mc-subbar-h，且不出现硬编码 px', (_label, rel, selector) => {
    const list = bodies(cssByFile[rel], selector)
    expect(list.length, `${selector} 规则缺失`).toBeGreaterThan(0)
    expect(list.some((b) => /height:\s*var\(--mc-subbar-h\)/.test(b)), '栏高必须引用单源 token').toBe(true)
    expect(list.every((b) => !/height:\s*\d+px/.test(b)), '栏高不得回流硬编码 px').toBe(true)
  })

  it.each(BARS)('%s 左右内缩引用 --mc-subbar-pad-x', (_label, rel, selector) => {
    const list = bodies(cssByFile[rel], selector)
    expect(list.some((b) => /padding:\s*0\s+var\(--mc-subbar-pad-x\)/.test(b))).toBe(true)
  })

  it('派生偏移引用同一 token：blog 功能浮层 top / 子栏右侧操作区 right', () => {
    const panelzone = bodies(cssByFile['panels/blog.css'], '.aurora-blog__panelzone')
    expect(panelzone.length).toBeGreaterThan(0)
    expect(
      panelzone.some((b) => /top:\s*var\(--mc-subbar-h\)/.test(b)),
      '浮层 top 必须跟随栏高（否则改栏高即错位）',
    ).toBe(true)
    expect(panelzone.every((b) => !/\btop:\s*\d+px/.test(b)), '浮层 top 不得硬编码 px').toBe(true)

    const right = bodies(cssByFile['panels/blog.css'], '.aurora-blog__subbar-right')
    expect(right.some((b) => /right:\s*var\(--mc-subbar-pad-x\)/.test(b))).toBe(true)
  })

  it('栏高不得再随密度档分叉（旧 compact 42px 覆写不得回流）', () => {
    for (const [label, rel, selector] of BARS) {
      for (const body of conditionedBodies(cssByFile[rel], selector)) {
        expect(body, `${label} 不应再按 [data-density] 改栏高`).not.toMatch(/height:\s*\d+px/)
      }
    }
  })

  it('tokens.css §12 单源块内不得出现指向二级栏的魔法数', () => {
    // 防「绕过 token 直接在别处写 52px」：全仓三面板 CSS 里除 token 定义外，
    // 不应再有以这三栏为选择器的 52px 高度声明
    for (const [label, rel, selector] of BARS) {
      for (const body of bodies(cssByFile[rel], selector)) {
        expect(body, `${label} 不应出现 52px 字面量`).not.toMatch(/52px/)
      }
    }
  })
})
