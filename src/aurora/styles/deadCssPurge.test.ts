/**
 * 死 CSS 清剿守卫（2026-09-17）
 * ------------------------------------------------------------
 * 事故背景：仓库里长期存在**两套平行 tooltip 实现**，两套都没有消费者：
 *   · `components.css` 的 `.aurora-tooltip`（Aurora 自家遗留）
 *   · `ui.css` 的 `.mc-tooltip` + `components/ui/Tooltip.tsx`（共享层，零 import）
 * 唯一真实生效的悬停提示机制一直是**原生 `title={...}`**
 * （shell.css 侧栏书脊注释已明示：「hover tooltip 已由 SidebarItem 原生 title 提供」）。
 *
 * 这两套其实**早被设计审计点名为待退役**，只是从没落地：
 *   · AUDIT-FULL-CONSISTENCY-2026-09-06.md ㉘：「2000×2 为 tooltip 平行遗留 … 待退役」
 *   · AUDIT-REVIEW-consistency-2026-09-06.md：「`.mc-lazy`/`.mc-tooltip` 为死代码 …
 *     （LazyBoundary/Tooltip 无消费者，待确认后删）」
 * 同一批被判死的还有 `.mc-lazy-*` —— LazyBoundary 组件在 Phase 4-① 已删，**样式却漏删**。
 *
 * 本文件把这批清理**固化为止损线**，钉死三条：
 *  1. 已清剿的选择器/关键帧在全仓 CSS 中**零定义**（剥注释后断言，避免命中说明文字）；
 *  2. 全仓 TS/TSX（排除测试自身）**零消费者引用**；
 *  3. 死组件文件与其 barrel 导出**不得复活**，且**活组件导出不得被误伤**（反向护栏）。
 *
 * 判据依据：删除动作只能证明「删掉了」，只有守卫能证明「不会回来」。
 *
 * ⚠️ 本次取证顺带推翻了一个常见误判（已写入 MEMORY）：
 *    **「零 import」不等于「不进包」** —— 只要该模块挂在 barrel（`index.ts`）的导出上，
 *    任何 `from '.../components/ui'` 都会把整个桶图带进模块图（dev 不做 tree-shaking），
 *    未用导出照样下发。判定死代码必须看**依赖图可达性**，而不是单看 import 计数。
 *
 * ⚠️ 匹配一律走**带边界的正则**，不用裸子串：
 *    `mc-spin` 是 `--mc-spine-w`（书脊宽 token）的子串，裸 includes 会假阳性报红。
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

const srcRoot = resolve(__dirname, '../..')          // → src/
const stylesDir = __dirname                           // → src/aurora/styles
const uiDir = resolve(srcRoot, 'components/ui')

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const readFile = (p: string) => readFileSync(p, 'utf-8')

/** 递归收集 src/ 下指定后缀的文件（绝对路径） */
function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      walk(abs, exts, acc)
    } else if (exts.some((x) => e.name.endsWith(x))) {
      acc.push(abs)
    }
  }
  return acc
}

const isTestFile = (p: string) => /\.test\.tsx?$/.test(p)

const cssFiles = walk(srcRoot, ['.css'])
const codeFiles = walk(srcRoot, ['.ts', '.tsx']).filter((p) => !isTestFile(p))

/**
 * 已清剿清单 —— 每项带两套锚点：
 *   · `css`：CSS 里的定义形态（选择器要带前导点、关键帧要带 @keyframes 前缀）
 *   · `code`：TS/TSX 里的消费者形态（`className="mc-tooltip"` 是**无点**的裸名）
 * 二者不可混用 —— 用带点正则去查代码会漏掉真实消费者（已由负向验证抓到过）。
 */
interface Purged {
  name: string
  css: RegExp
  code: RegExp
}

const PURGED: Purged[] = [
  // tooltip 平行遗留（Aurora 遗留 + 共享层，两套皆零消费者）
  // 边界规则：**前置**须是类名起点，**后置**允许 `_`/`-`（BEM 后代与修饰符）但拒绝字母数字。
  //   · 尾部不能只写 `\b`：`_` 也是词字符，`aurora-tooltip\b` 会漏掉 `aurora-tooltip__arrow`；
  //   · 尾部也不能完全不管：那样 `.aurora-tooltips` 会被当成 `.aurora-tooltip` 误报。
  { name: '.aurora-tooltip*', css: /\.aurora-tooltip(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-tooltip(?![a-zA-Z0-9])/ },
  { name: '@keyframes aurora-tooltip-in', css: /@keyframes\s+aurora-tooltip-in\b/, code: /(?<![\w-])aurora-tooltip-in\b/ },
  { name: '.mc-tooltip*', css: /\.mc-tooltip(?![a-zA-Z0-9])/, code: /(?<![\w-])mc-tooltip(?![a-zA-Z0-9])/ },
  { name: '@keyframes mc-tooltip-in', css: /@keyframes\s+mc-tooltip-in\b/, code: /(?<![\w-])mc-tooltip-in\b/ },
  // 懒加载骨架（LazyBoundary 组件已于 Phase 4-① 删除，样式漏删）
  { name: '.mc-lazy-*', css: /\.mc-lazy-/, code: /(?<![\w-])mc-lazy-/ },
  { name: '@keyframes mc-spin', css: /@keyframes\s+mc-spin\b/, code: /(?<![\w-])mc-spin\b/ },
  { name: '@keyframes mc-fade-in', css: /@keyframes\s+mc-fade-in\b/, code: /(?<![\w-])mc-fade-in\b/ },

  // ── 批 1 死 CSS 清剿（2026-09-17，4 文件 → 净 −868 行）─────────────────
  // 覆盖：canvas.css（白板结构化视图 8 族）/ editor.css（旧编辑器 DOM 2 族）/
  //       blog.css（博客旧功能区 4 族）/ components.css（共享 <select> 组内的 blog 成员）。
  // 判死依据：族内**全部**类名在非测试 TS/TSX 中零引用（token 边界匹配，非裸子串）。
  // 集合差取证（HEAD 类名 764 → 668，真增 0）：96 个类名被删，**100% 落在下列族内**，
  //   无任何族外误删；同时 15 族在「全 src 所有 .css（28 个，含 12 个扫描盲区文件）」零定义。
  //
  // ⚠️ 两处锚点形态特殊，改清单时勿照抄：
  //   ① `aurora-blog-platform` 家族**同时**含 `…-platform` 与 `…-platforms` 两个类 →
  //      尾部写成 `platforms?`，否则漏掉复数形态（复活时会静默漏检）。
  //   ② `aurora-token-` 是**前缀族**（类名形如 `aurora-token-bold`）→ 尾部**不能**挂
  //      `(?![a-zA-Z0-9])`，那会把族内所有成员一起拒掉（守卫假绿）；只用 `\.aurora-token-`。
  //   ③ `.aurora-pen` 尾部拒绝字母数字 → 命中 `.aurora-pen-path`，但不误吃 `.aurora-pending`。
  { name: '.aurora-kanban*', css: /\.aurora-kanban(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-kanban(?![a-zA-Z0-9])/ },
  { name: '.aurora-timeline*', css: /\.aurora-timeline(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-timeline(?![a-zA-Z0-9])/ },
  { name: '.aurora-sticky*', css: /\.aurora-sticky(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-sticky(?![a-zA-Z0-9])/ },
  { name: '.aurora-mindmap*', css: /\.aurora-mindmap(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-mindmap(?![a-zA-Z0-9])/ },
  { name: '.aurora-shape*', css: /\.aurora-shape(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-shape(?![a-zA-Z0-9])/ },
  { name: '.aurora-connection*', css: /\.aurora-connection(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-connection(?![a-zA-Z0-9])/ },
  { name: '.aurora-freewrap*', css: /\.aurora-freewrap(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-freewrap(?![a-zA-Z0-9])/ },
  { name: '.aurora-pen*', css: /\.aurora-pen(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-pen(?![a-zA-Z0-9])/ },
  { name: '.aurora-token-*', css: /\.aurora-token-/, code: /(?<![\w-])aurora-token-/ },
  { name: '.aurora-goto-dialog*', css: /\.aurora-goto-dialog(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-goto-dialog(?![a-zA-Z0-9])/ },
  { name: '.aurora-blog-code*', css: /\.aurora-blog-code(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-blog-code(?![a-zA-Z0-9])/ },
  { name: '.aurora-blog-deploy*', css: /\.aurora-blog-deploy(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-blog-deploy(?![a-zA-Z0-9])/ },
  { name: '.aurora-blog-platform(s)*', css: /\.aurora-blog-platforms?(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-blog-platforms?(?![a-zA-Z0-9])/ },
  { name: '.aurora-blog-tree*', css: /\.aurora-blog-tree(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-blog-tree(?![a-zA-Z0-9])/ },
  { name: '.aurora-blog-select*', css: /\.aurora-blog-select(?![a-zA-Z0-9])/, code: /(?<![\w-])aurora-blog-select(?![a-zA-Z0-9])/ },
  // 连带删除的族专属关键帧（无类名，块解析抓不到，须单独钉）。
  // ⚠️ 只钉**真删**的那一个：`@keyframes aurora-blog-shimmer` / `aurora-blog-spin` 一度被
  //    `git diff -U0` 的行统计报成"已删"，实为**大段删除导致的 diff 重排假象**——两者仍在
  //    blog.css，且分别被 `.aurora-blog-generate.is-loading::after` 与 `.spin` 引用（两者都活）。
  //    故此处**不得**收录，否则守卫会自己变红。教训：判定"删没删"要用**集合差**，不能用 diff 行。
  { name: '@keyframes aurora-timeline-pulse', css: /@keyframes\s+aurora-timeline-pulse\b/, code: /(?<![\w-])aurora-timeline-pulse\b/ },
]

/** 在若干文件中找首个命中（用于给出可定位的报错文件名） */
function firstHit(files: string[], re: RegExp, stripComments: boolean): string | null {
  for (const f of files) {
    const raw = readFile(f)
    const text = stripComments ? strip(raw) : raw
    if (re.test(text)) return f.slice(srcRoot.length + 1).replace(/\\/g, '/')
  }
  return null
}

describe('死 CSS 清剿：已删选择器不得回流', () => {
  for (const { name, css } of PURGED) {
    it(`${name} 在全仓 CSS 中零定义`, () => {
      // 剥注释：各 CSS 顶部的中文说明里会写着这些名字，不能算「定义」
      expect(firstHit(cssFiles, css, true)).toBe(null)
    })
  }
})

describe('死 CSS 清剿：已删选择器不得残留消费者', () => {
  for (const { name, code } of PURGED) {
    it(`${name} 在全仓 TS/TSX 中零引用`, () => {
      expect(firstHit(codeFiles, code, false)).toBe(null)
    })
  }
})

describe('死组件与 barrel 导出', () => {
  it('Tooltip.tsx 已删除', () => {
    expect(existsSync(resolve(uiDir, 'Tooltip.tsx'))).toBe(false)
  })

  it('barrel 不再导出 Tooltip / TooltipProps / TooltipPlacement', () => {
    expect(readFile(resolve(uiDir, 'index.ts'))).not.toContain('Tooltip')
  })

  // 反向护栏：清理不能误伤活组件。这几个是实测有消费者的
  // （多数走直接路径导入，如 `@components/ui/Switch`，不经过 barrel 名）。
  it.each(['Button', 'Modal', 'Switch', 'ConfirmProvider', 'Icon'])(
    'barrel 仍导出活组件 %s',
    (name) => {
      expect(readFile(resolve(uiDir, 'index.ts'))).toContain(name)
    },
  )

  it('ui.css 仍有真实加载点（Input.tsx 的顶层 import；经 barrel 间接挂进依赖图）', () => {
    // ⚠️ 反直觉但已由真机取证（CDP 读 style[data-vite-dev-id]）：
    //    Input.tsx **零直接 import**，却仍被浏览器拉取 —— 因为 index.ts 桶里有
    //    `export { Input } from './Input'`，任何 `from '.../components/ui'`（Button/Modal/Icon 的
    //    消费方）都会把整个桶图带进模块图，dev 不做 tree-shaking。
    //    所以「零 import」≠「不进包」——**有 barrel 时，未用导出照样随包下发**。
    //    这条断言是绊线：一旦 Input.tsx 消失，ui.css 才真正失去加载点，
    //    `.aurora-emptystate*` / `.aurora-field*` 届时才该进清剿清单。
    expect(readFile(resolve(uiDir, 'Input.tsx'))).toContain("import './ui.css'")
  })
})

describe('清单自身健康度', () => {
  it('清单无重复项', () => {
    expect(new Set(PURGED.map((p) => p.name)).size).toBe(PURGED.length)
  })

  it('扫描确实覆盖到了样式与源码（防路径写错导致空扫描假绿）', () => {
    expect(cssFiles.length).toBeGreaterThan(10)
    expect(codeFiles.length).toBeGreaterThan(100)
    // 锚点：tokens.css 必须被扫进来
    expect(cssFiles.some((p) => p.endsWith('tokens.css'))).toBe(true)
    // 剥注释确实生效：注释里的名字不应被当作命中
    expect(strip('/* .aurora-tooltip */').includes('.aurora-tooltip')).toBe(false)
  })

  it('正则边界有效（防裸子串误报：mc-spin 不得命中 --mc-spine-w）', () => {
    const spin = PURGED.find((p) => p.name.includes('mc-spin'))!.css
    expect(spin.test('@keyframes mc-spin {')).toBe(true)
    expect(spin.test('--mc-spine-w: 56px;')).toBe(false)
  })

  it('代码锚点是无点裸名且网住同族 BEM 变体', () => {
    const tip = PURGED.find((p) => p.name === '.mc-tooltip*')!.code
    expect(tip.test('className="mc-tooltip"')).toBe(true)      // 真实消费者形态（无前导点）
    expect(tip.test('className="mc-tooltip-in"')).toBe(true)   // 同族变体也要抓到
    expect(tip.test('className="mc-tooltips"')).toBe(false)    // 尾部拒绝字母 → 不误伤他名
    expect(tip.test('className="ui-tooltip"')).toBe(false)     // 前置边界生效，不误伤他名
  })

  it('CSS 锚点网住 BEM 后代（aurora-tooltip__arrow / --top 均须命中）', () => {
    const tip = PURGED.find((p) => p.name === '.aurora-tooltip*')!.css
    expect(tip.test('.aurora-tooltip__arrow {')).toBe(true)
    expect(tip.test('.aurora-tooltip--top .aurora-tooltip__arrow {')).toBe(true)
    expect(tip.test('.aurora-tooltips {')).toBe(false)
  })

  it('styles 目录锚点正确（本文件所在目录即 aurora/styles）', () => {
    expect(existsSync(resolve(stylesDir, 'tokens.css'))).toBe(true)
    expect(existsSync(resolve(stylesDir, 'components.css'))).toBe(true)
  })

  it('批 1 族锚点边界有效（三处特殊形态，防"顺手简化"把守卫改瞎）', () => {
    // ① `.aurora-pen` 尾部拒绝字母数字 → 命中 BEM 后代，却不误吃 `aurora-pending`
    const pen = PURGED.find((p) => p.name === '.aurora-pen*')!.css
    expect(pen.test('.aurora-pen-path {')).toBe(true)
    expect(pen.test('.aurora-pen {')).toBe(true)
    expect(pen.test('.aurora-pending {')).toBe(false) // ← 若把锚点简化成裸 `.aurora-pen`，这里会红

    // ② 复数形态必须网住（`…-platforms` 与 `…-platform` 同族同删）
    const plat = PURGED.find((p) => p.name === '.aurora-blog-platform(s)*')!.css
    expect(plat.test('.aurora-blog-platform {')).toBe(true)
    expect(plat.test('.aurora-blog-platforms {')).toBe(true)
    expect(plat.test('.aurora-blog-platformx {')).toBe(false)

    // ③ 前缀族尾部**不得**挂边界：挂了会连族内成员一起拒掉（守卫静默假绿）
    const tok = PURGED.find((p) => p.name === '.aurora-token-*')!.css
    expect(tok.test('.aurora-token-heading-1 {')).toBe(true)
    expect(tok.test('.aurora-token {')).toBe(false) // 前缀锚需要那个连字符
  })
})
