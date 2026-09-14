/**
 * 博客浮层停靠位移「布局属性 → 合成器属性」契约测试（MOTION-AUDIT 2026-09-14 §5 · PLAN-02 改动 A）
 * --------------------------------------------------------------------------
 * 事故背景：AUDIT.md §5 铁律「只动画 transform 与 opacity」。
 * `.aurora-blog__panelzone` 原用 `left`（布局属性）做停靠位移，并在 JS 侧
 * `style={{ left: panelLeft }}` 逐帧写入 —— 拖拽期间每帧触发
 * layout → paint → composite 全链路，且 `will-change: left` 提升了图层却毫无收益。
 *
 * 修复：位移载体换为 `transform: translateX(Npx)`，`left: 0` 退化为静态基准位。
 * 时长/曲线保持 `--mc-dur-base`(280ms) + `--mc-ease-spring` —— 观感与改前一致。
 *
 * 本测试锁死五件事：
 *  1) CSS 侧不再有 `transition: left` / `will-change: left`；
 *  2) CSS 侧 transition 落在 transform 上，且时长曲线 token 未被顺手改动；
 *  3) JSX 内联样式写 transform 而非 left（**这是最易漏的一半**：只改 CSS 不改 JS，
 *     位移会彻底失效——因为没有任何代码在写 left 了）；
 *  4) `left: 0` 基准位仍存在（translateX 的坐标系锚点，删掉会让右贴边算错）；
 *  5) JS 位移状态源是 React state，不是读 DOM 的 style.left（防未来被改回 DOM 读取）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'blog.css'), 'utf-8')
const tsx = readFileSync(resolve(__dirname, '../../panels/blog/BlogPanel.tsx'), 'utf-8')

/** 取出 `.aurora-blog__panelzone { ... }` 基类规则的完整声明块。 */
function panelzoneRule(): string {
  const i = css.indexOf('.aurora-blog__panelzone {')
  expect(i, '.aurora-blog__panelzone 基类规则缺失').toBeGreaterThanOrEqual(0)
  const open = css.indexOf('{', i)
  const close = css.indexOf('}', open)
  return css.slice(i, close + 1)
}

describe('PLAN-02 A · CSS 不再用布局属性做位移', () => {
  it('.aurora-blog__panelzone 规则中无 transition: left', () => {
    expect(panelzoneRule()).not.toMatch(/transition:\s*left\b/)
  })

  it('全文件无 will-change: left（该提示提升图层却对 left 动画无效）', () => {
    expect(css).not.toMatch(/will-change:\s*left/)
  })

  it('transition 落在 transform 上', () => {
    expect(panelzoneRule()).toMatch(/transition:\s*transform\b/)
  })

  it('will-change 改为 transform/opacity（与 components.css 既有写法一致）', () => {
    expect(panelzoneRule()).toMatch(/will-change:\s*transform\s*,\s*opacity/)
  })

  it('时长与曲线未被顺手改动（仍是 --mc-dur-base + --mc-ease-spring）', () => {
    expect(panelzoneRule()).toMatch(
      /transition:\s*transform\s+var\(--mc-dur-base\)\s+var\(--mc-ease-spring\)/
    )
  })

  it('emphasized 位移常量仍在：transition 只提 transform，不得夹带 left/top/height', () => {
    const decl = panelzoneRule().match(/transition:[^;]+;/)?.[0] ?? ''
    expect(decl).not.toMatch(/\bleft\b/)
    expect(decl).not.toMatch(/\btop\b|\bheight\b|\bwidth\b/)
  })
})

describe('PLAN-02 A · left: 0 基准位必须保留（translateX 坐标系锚点）', () => {
  it('基类仍声明 left: 0', () => {
    expect(panelzoneRule()).toMatch(/left:\s*0/)
  })
})

describe('PLAN-02 A · JS 写入点同步（只改 CSS 不改 JS = 位移彻底失效）', () => {
  it('JSX 内联样式不再写 left', () => {
    expect(tsx).not.toMatch(/style=\{\{\s*left:/)
  })

  it('JSX 内联样式写 translateX(${panelLeft}px)', () => {
    expect(tsx).toMatch(/style=\{\{\s*transform:\s*`translateX\(\$\{panelLeft\}px\)`\s*\}\}/)
  })

  it('位移状态源是 React state（panelLeft），非读 DOM 的 style.left', () => {
    // 若未来有人改成读 DOM，这里会失败——提示「left 变量失效会导致停靠逻辑静默错位」
    expect(tsx).toMatch(/const\s*\[\s*panelLeft\s*,\s*setPanelLeft\s*\]\s*=\s*useState/)
    expect(tsx).not.toMatch(/\.style\.left\b/)
    expect(tsx).not.toMatch(/getComputedStyle\([^)]*\)\.left\b/)
  })

  it('右贴边宽度基准用 offsetWidth 测量（不依赖被改造的 left 属性）', () => {
    expect(tsx).toMatch(/offsetWidth/)
  })
})

describe('PLAN-02 A · 拖拽抓取手感不受影响', () => {
  it('is-dragging 时关闭过渡（实时跟随指针）', () => {
    expect(css).toMatch(/\.aurora-blog__panelzone\.is-dragging\s*\{\s*transition:\s*none/)
  })

  it('拖拽期 setPointerCapture 仍在此组件（抓取语义未变）', () => {
    expect(tsx).toMatch(/setPointerCapture/)
  })
})
