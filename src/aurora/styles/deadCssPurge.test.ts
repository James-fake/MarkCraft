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

/**
 * ── 批 2.5-C 死类**成员级**清剿 · kb-ui.css（2026-09-17，116 类 → 46 类）──────
 * 与 2.5-A 的区别（两者处置方式**不可互替**）：
 *   · 2.5-A 删的是**孤儿文件** —— 零 import（不可达闭包）→ 删整个文件；
 *   · 2.5-C 删的是**成员** —— `kb-ui.css` 仍在加载闭包内（← `panels/kb/KbPanel.tsx`），
 *     但其 66 个类零承载者 → 只能成员级摘除。
 *
 * 判死依据（沿用批 2 口径：词边界 token + className 上下文 + 库命名空间豁免）：
 *   · 56 类在全仓非测试 TS/TSX **零出现**；
 *   · 10 类（topbar / manage / nav / nav-item / content / stat / kbcard / tpl-card /
 *     note / row）一度「**仅测试引用**」。那是**测试制造的维护假象**，不是活 ——
 *     旧断言把它们当"密度载体/门控成员"来验，反而让死类名看起来被覆盖、躲过清剿。
 *     本轮**先升级两侧断言**（`kbDensity.test.ts` 改指真实载体、
 *     `pointerGating.test.ts` 把 B 组条目迁入 A 组）**再删**，故现在应零定义。
 *   · 保留 46 类全部有真实承载者：`.kb-shell`（由 `aurora/styles/panels/kb.css` 的
 *     复合选择器 `.aurora-kb.kb-shell` 接管令牌重映射）+ 搜索子系统
 *     `.kb-searchpanel-*` / `.kb-result-*` / `.kb-match*` / `.kb-modal*` / `.kb-empty*`。
 *
 * 连带处置（消费侧悬空引用，同批交付）：
 *   · `tokens.css` 指针门控块内的 `.kb-kbcard:hover` / `.kb-note:hover` 两条已移除；
 *   · 两个**孤儿 `@keyframes`**：`kbFadeUp`（引用者 .kb-stat/.kb-kbcard 全删）、
 *     `kbSpin`（.kb-spin 已删）。`kbShellIn` / `kbTabIn` / `kbPop` 仍有活引用，保留。
 *   · 三个**@media 空壳**：`max-width: 820px`（仅 .kb-grid-2）、
 *     `max-width: 860px`（整个 .kb-nav 族）、`max-width: 620px`（全为已删类）。
 *
 * ⚠️ **锚点必须处理「死类是活类的真前缀」（超串陷阱第三形态）**：
 *    本文件其它组惯用 `\.name(?![a-zA-Z0-9])` —— 尾部**允许** `-`/`_` 以便网住
 *    BEM 后代。但对 `kb-content` 而言，`.kb-content-inner` 是**活类**，
 *    该锚点会命中它 ⇒ 断言永远为真 = **假绿**。`kb-pop` / `.kb-pop-mask` 同理。
 *    故这两项改用「**精确排除已知活扩展**」：既保住 BEM 后代覆盖，又不误伤活类。
 *    （反例说明：`kb-search` 与活类 `kb-searchpanel-*` 之间接的是字母 `p`，
 *      两种锚点都能正确拒绝，无需特殊处理。）
 */
const EXCLUDE_LIVE_SUFFIX: Record<string, string[]> = {
  'kb-content': ['-inner'], // .kb-content-inner —— 内容容器（活）
  'kb-pop': ['-mask'],      // .kb-pop-mask —— 门户化遮罩（活）
}

/**
 * 转义为字面量并构造「排除已知活扩展」尾部；无豁免项时退回本文件惯用尾部。
 * ⚠️ 排除写的是**裸后缀** `(?!-inner)` 而非 `(?!-inner(?![a-zA-Z0-9_-]))`：
 *    后者只护住 `.kb-content-inner` 本体，护不住它的 BEM 变体
 *    （`.kb-content-inner__x` 会被判成 `.kb-content` → 假阳性报红）。
 *    护住 `-inner` 整个分支才能覆盖该活类的全部后代/修饰符形态。
 */
function tailFor(name: string): string {
  const ex = EXCLUDE_LIVE_SUFFIX[name]
  if (!ex || !ex.length) return '(?![a-zA-Z0-9])'
  return `(?!${ex.join('|')})`
}

/** 2.5-C 已清剿的 66 个类名（裸名，不含前导点） */
const PURGED_25C_NAMES = [
  // — 文字工具类（保留 .kb-faint）—
  'kb-h1', 'kb-h2', 'kb-muted',
  // — 顶栏 / 品牌 —
  'kb-topbar', 'kb-spacer', 'kb-brand', 'kb-logo',
  // — 按钮 / 输入（保留 .kb-input）—
  'kb-btn-ghost-danger', 'kb-search', 'kb-textarea', 'kb-select', 'kb-label',
  // — 表面 / 布局 / 导航 —
  'kb-card', 'kb-body', 'kb-manage', 'kb-manage-inner',
  'kb-nav', 'kb-nav-item', 'kb-nav-label', 'kb-nav-group', 'kb-nav-foot',
  'kb-nav-toggle', 'kb-nav-ind',
  // — 内容 / 统计 / 标签 / 进度 —
  'kb-content', 'kb-search-wrap', 'kb-stats', 'kb-stat',
  'kb-stat-ico', 'kb-stat-val', 'kb-stat-lbl', 'kb-tag', 'kb-meter', 'kb-pill',
  // — 知识库卡片 / 模板卡片 / 笔记卡片 / 列表行 —
  'kb-kb-grid', 'kb-kbcard', 'kb-cover', 'kb-cover-ico', 'kb-cardbody',
  'kb-name', 'kb-desc', 'kb-meta', 'kb-tpl-card', 'kb-tpl-chip',
  'kb-note-grid', 'kb-note', 'kb-note-head', 'kb-note-sum', 'kb-note-tags', 'kb-note-foot',
  'kb-row', 'kb-row-ico', 'kb-row-main', 'kb-row-sub',
  // — 弹出层 / 选项 / 提示条 / 工具条 —
  'kb-pop', 'kb-pop-title', 'kb-opt', 'kb-opt-ico', 'kb-opt-title', 'kb-opt-desc',
  'kb-alert', 'kb-toolbar', 'kb-count',
  // — 网格 / 间距 / 加载 / 紧凑图标按钮 —
  'kb-grid-2', 'kb-stack', 'kb-spin', 'kb-btn-icon',
]

const PURGED_25C: Purged[] = PURGED_25C_NAMES.map((n) => ({
  name: `.${n}`,
  css: new RegExp(`\\.${n}${tailFor(n)}`),
  code: new RegExp(`(?<![\\w-])${n}${tailFor(n)}`),
}))

/** 全量清单：2.5-A 之前的批次 + 2.5-C */
const ALL_PURGED: Purged[] = [...PURGED, ...PURGED_25C]

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
  for (const { name, css } of ALL_PURGED) {
    it(`${name} 在全仓 CSS 中零定义`, () => {
      // 剥注释：各 CSS 顶部的中文说明里会写着这些名字，不能算「定义」
      expect(firstHit(cssFiles, css, true)).toBe(null)
    })
  }
})

describe('死 CSS 清剿：已删选择器不得残留消费者', () => {
  for (const { name, code } of ALL_PURGED) {
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
    expect(new Set(ALL_PURGED.map((p) => p.name)).size).toBe(ALL_PURGED.length)
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

/**
 * ── 2.5-A 孤儿 CSS 文件清剿（2026-09-17）──────────────────────────────
 * 项目**没有 `src/main.tsx`**：`index.html` 的 module script 直指 `src/aurora/aurora-main.tsx`。
 * 以该入口做 import 闭包（全仓 28 个 CSS）后，26 个可达、**2 个孤儿**：
 *   · `src/index.css` —— 纯 `@import` 聚合器；它聚合的 9 个文件在 `aurora-main.tsx:15-23`
 *     各有**独立的真实 import** ⇒ 聚合器是**冗余而非必需**（删它不改变任何加载路径）。
 *   · `src/features/canvas-v2/components/canvas.css` —— 0 import；19 个 `.cv-*` 类零 DOM 消费者
 *     （引擎 tldraw→Excalidraw 迁移后，子视图改走「内联 style + `var(--cv-*)`」；
 *     `engine/*.tsx` 的 className 只剩 `excalidraw-canvas-host` / `note-card-md`）；
 *     `.tl-*` 令牌覆盖随 tldraw 退役一并失效。
 *
 * ⚠️ **重名陷阱**：仓内**另有一个** `aurora/styles/panels/canvas.css`（批 1 清剿对象，**仍存活**）。
 *    用 basename 匹配会张冠李戴 —— 本组一律用**完整相对路径**，并留反向护栏钉住那个活文件。
 * ⚠️ **锚点只做 CSS 侧（有意）**：`.cv-*` / `.tl-*` 不做 code 侧断言，因为 `canvasTheme.ts`
 *    的注释里仍会出现这些类名（历史说明），且 `.tl-container` 还留在其注入字符串中待后续决策
 *    —— 加了会误红。等那条断链决策落地后，再把 code 锚点补齐。
 */
const ORPHANS = ['index.css', 'features/canvas-v2/components/canvas.css']

describe('孤儿 CSS 文件清剿（2.5-A）：不得复活', () => {
  it.each(ORPHANS)('src/%s 已删除', (rel) => {
    expect(existsSync(resolve(srcRoot, rel))).toBe(false)
  })

  it('反向护栏：index.css 聚合的 9 个样式仍有各自的真实加载点', () => {
    const entry = readFile(resolve(srcRoot, 'aurora/aurora-main.tsx'))
    for (const f of [
      'base', 'desktop-chrome', 'components', 'markdown',
      'syntax', 'mermaid', 'tiptap', 'scrollbar', 'fonts',
    ]) {
      expect(entry).toContain(`styles/${f}.css`)
    }
  })

  it('反向护栏：同名活文件 aurora/styles/panels/canvas.css 不得被连带删除', () => {
    expect(existsSync(resolve(srcRoot, 'aurora/styles/panels/canvas.css'))).toBe(true)
  })

  it('.cv-* 孤儿画布类在全仓 CSS 中零定义（前缀锚；`var(--cv-…)` 是变量，不会被命中）', () => {
    expect(firstHit(cssFiles, /\.cv-/, true)).toBe(null)
    // 锚点自检 —— 这两条是负向验证的内建版，防「锚点写瞎 → 永远假绿」
    expect(/\.cv-/.test('  --cv-bg: #ffffff;')).toBe(false) // 变量（无点号）不命中
    expect(/\.cv-/.test('.cv-pill-btn {')).toBe(true)        // 类定义命中
  })

  it('tldraw 令牌覆盖规则不得回流（.tl-container / .tl-toolbar / .tl-watermark）', () => {
    for (const re of [/\.tl-container/, /\.tl-toolbar/, /\.tl-watermark/]) {
      expect(firstHit(cssFiles, re, true)).toBe(null)
    }
  })
})

/**
 * ── 2.5-C 配套守卫（成员级清剿的「不误伤」侧）────────────────────────────
 * 上面两组 `ALL_PURGED` 只证明"删掉了、没回来"。下面这组证明**删对了**：
 * 该活的还在、令牌源没断、孤儿关键帧清了、消费侧悬空引用收了、锚点真能咬人。
 */
const KB_CSS = resolve(srcRoot, 'features/knowledgeBase/kb-ui.css')
const TOKENS_CSS = resolve(stylesDir, 'tokens.css')

/** kb-ui.css 剥注释后的全文（定义判定只看规则，不看说明文字） */
const kbCss = strip(readFile(KB_CSS))
/** tokens.css 剥注释后的全文（门控块切片用） */
const TOKENS_CSS_TEXT = strip(readFile(TOKENS_CSS))

describe('2.5-C 反向护栏：保留类不得被连带删除', () => {
  // 46 类中承担「令牌源 / 搜索子系统骨架」的关键代表 —— 删错一个，面板即肉眼可见地崩
  const mustStay = [
    'kb-shell',            // --kb-* 令牌源 + Aurora 外壳（复合选择器 .aurora-kb.kb-shell 依赖它）
    'kb-content-inner',    // ← kb-content 被删后唯一的同前缀活类（锚点自检的靶子）
    'kb-searchpanel', 'kb-searchpanel-top', 'kb-searchpanel-filter', 'kb-searchpanel-list',
    'kb-searchpanel-mode', 'kb-searchpanel-actions-tray',
    'kb-result', 'kb-result-head', 'kb-result-badge', 'kb-result-toggle',
    'kb-match', 'kb-match-ln', 'kb-match-text', 'kb-hl',
    'kb-modal', 'kb-modal-mask', 'kb-pop-mask', 'kb-empty', 'kb-empty-ico', 'kb-empty-sub',
    'kb-input', 'kb-btn', 'kb-btn-primary', 'kb-btn-active', 'kb-icon-btn',
    'kb-panel', 'kb-section-title', 'kb-faint', 'kb-chatpanel-input',
  ]

  it.each(mustStay)('%s 仍有 CSS 定义（活类未被误删）', (cls) => {
    expect(new RegExp(`\\.${cls}(?![a-zA-Z0-9_-])`).test(kbCss)).toBe(true)
  })

  it('kb-shell 仍是 --kb-* 令牌源（面板与覆盖层的配色全靠它）', () => {
    // 少一个都会让 kb.css 的 --mc-* 重映射失去落点。
    // ⚠️ 必须断言**声明**（带冒号），不能只断言名字 ——
    //    `toContain('--kb-text')` 会被 `--kb-text-main:` 满足，令牌真被删掉也照样绿
    //    （由负向验证抓出：掏空 5 个令牌后守卫仍绿）。
    for (const tok of ['--kb-text', '--kb-border', '--kb-primary', '--kb-glass-strong', '--kb-radius-md']) {
      expect(kbCss).toContain(`${tok}:`)
    }
    // 锚点自检：带冒号的断言不会被同类前缀令牌满足
    expect('  --kb-text-main: var(--cv-text-main);'.includes('--kb-text:')).toBe(false)
  })

  it('Aurora 侧的 .aurora-kb.kb-shell 复合选择器仍在（令牌重映射 + 布局回收的落点）', () => {
    // 这两个复合块是 Aurora 把 kb-ui.css 的「整窗外壳假设」收回文档流的关键；
    // 一旦有人"顺手清理"掉，面板会重新铺满视口并被侧栏/顶栏裁切。
    const auroraKb = strip(readFile(resolve(stylesDir, 'panels/kb.css')))
    expect(auroraKb).toContain('.aurora-kb.kb-shell')
    expect(auroraKb).toContain('contain: paint')
  })
})

describe('2.5-C 连带处置：孤儿关键帧与消费侧悬空引用', () => {
  it.each(['kbFadeUp', 'kbSpin'])('孤儿 @keyframes %s 在全仓 CSS 中零定义', (kf) => {
    expect(firstHit(cssFiles, new RegExp(`@keyframes\\s+${kf}\\b`), true)).toBe(null)
  })

  it.each(['kbShellIn', 'kbTabIn', 'kbPop'])('仍有活引用的 @keyframes %s 保留', (kf) => {
    expect(new RegExp(`@keyframes\\s+${kf}\\b`).test(kbCss)).toBe(true)
  })

  it('tokens.css 指针门控块不得再收 kb-* 选择器（门槛只约束真实界面）', () => {
    // 2026-09-17 前此处残留 `.kb-kbcard:hover, .kb-note:hover` 两条死选择器。
    // ⚠️ 正则必须容忍伪类后缀 —— 写成 `\bkb-[\w-]*\s*(?=[,{])` 会漏掉
    //    `.kb-kbcard:hover,`（`[\w-]*` 停在 `:hover` 前，`\s*` 又要求紧跟 `,`/`{`），
    //    于是守卫恒绿。由负向验证抓出（注入后仍绿）。改为允许 `:pseudo` 再接分隔符。
    const gate = TOKENS_CSS_TEXT.slice(TOKENS_CSS_TEXT.indexOf('@media (hover: none), (pointer: coarse)'))
    const body = gate.slice(0, gate.indexOf('\n}\n'))
    expect(body).not.toMatch(/\.kb-[\w-]*(?::[\w-]+)*\s*[,{]/)
    // 锚点自检（负向验证的内建版）
    expect(/\.kb-[\w-]*(?::[\w-]+)*\s*[,{]/.test('.kb-kbcard:hover,')).toBe(true)  // 须命中
    expect(/\.kb-[\w-]*(?::[\w-]+)*\s*[,{]/.test('.kb-note:hover {')).toBe(true)   // 须命中
    expect(/\.kb-[\w-]*(?::[\w-]+)*\s*[,{]/.test('.aurora-blog-theme:hover,')).toBe(false) // 他名不误伤
    // 门控块确实被切出来了（防止 indexOf 落空 → 空串 → 永远通过）
    expect(body).toContain('.aurora-blog-theme:hover')
    expect(body).toContain('.scroll-btn:hover')
  })
})

describe('2.5-C 锚点自检：死类是活类的真前缀不得假绿', () => {
  const anchor = (n: string) => ALL_PURGED.find((p) => p.name === `.${n}`)!.css

  it('.kb-content 锚点命中自身，但不吃活类 .kb-content-inner（含其 BEM 变体）', () => {
    const re = anchor('kb-content')
    expect(re.test('.kb-content {')).toBe(true)
    expect(re.test('.kb-content-inner {')).toBe(false)      // ← 写成 `(?![a-zA-Z0-9])` 这里会红
    expect(re.test('.kb-content-inner__x {')).toBe(false)   // 活类的 BEM 变体同样不得误伤
    expect(re.test('.kb-content__body {')).toBe(true)       // 死类自己的 BEM 后代仍要被网住
  })

  it('.kb-pop 锚点命中自身，但不吃活类 .kb-pop-mask', () => {
    const re = anchor('kb-pop')
    expect(re.test('.kb-pop {')).toBe(true)
    expect(re.test('.kb-pop-mask {')).toBe(false)
    expect(re.test('.kb-pop-title {')).toBe(true) // 同族死类仍被网住
  })

  it('.kb-search 锚点不吃活类 .kb-searchpanel-*（字母接续，两种锚点都可拒）', () => {
    const re = anchor('kb-search')
    expect(re.test('.kb-search {')).toBe(true)
    expect(re.test('.kb-searchpanel-top {')).toBe(false)
  })

  it('前缀族语义：连字符接续被允许（网住同族），字母接续被拒绝（不误伤他名）', () => {
    const re = anchor('kb-stat')
    expect(re.test('.kb-stat {')).toBe(true)
    // 连字符接续 → 本文件惯用尾部 `(?![a-zA-Z0-9])` **有意允许**：`.kb-stat-ico` 是同族兄弟，
    // 同批一起删，网住它是对的（也是 `.kb-content` 必须做活扩排除的根本原因）。
    expect(re.test('.kb-stat-ico {')).toBe(true)
    // 字母接续 → 拒绝：`.kb-stats` 是另一个类，靠它自己的条目去管
    expect(re.test('.kb-stats {')).toBe(false)
    expect(anchor('kb-stats').test('.kb-stats {')).toBe(true)
    expect(anchor('kb-stat-ico').test('.kb-stat-ico {')).toBe(true)
  })

  it('清单规模锚定（防"清单被删空 → 守卫假绿"）', () => {
    expect(PURGED_25C_NAMES.length).toBe(66)
    expect(PURGED_25C.length).toBe(66)
    expect(ALL_PURGED.length).toBe(PURGED.length + 66)
  })
})
