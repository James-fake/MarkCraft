/**
 * 浮层基底同源契约（2026-09-24）
 * ------------------------------------------------------------
 * 报障：编辑界面里「思维导图模板」列表浮层仍是**最旧一版 UI**。
 *
 * 根因不是「这个浮层的颜色写错了」，而是**它整体逃出了 aurora 作用域**：
 *   1. 该浮层经 createPortal 挂到 document.body —— 是 #aurora-root 的**兄弟**
 *      而非子树；而 tokens.css 里把 base.css 旧蓝系变量重映射为 --mc-* 的那一层
 *      （--editor-bg / --editor-text / --editor-border / --code-bg …）**只写在
 *      `#aurora-root{…}` 选择器内**，作用域外一律不生效。
 *   2. 于是浮层里的 var(--editor-bg) 等全部回落到 src/styles/base.css 的**旧 slate
 *      值**（#0f172a / #e2e8f0 / #334155 / #1e293b）；--hover-bg 更只在
 *      .aurora-editor 内定义，portal 里直接落回内联旧蓝 rgba(59,130,246,0.1)。
 *   3. 同时它自带 Tailwind 遗留写法（borderRadius '0.5rem'、shadow-lg 的 boxShadow
 *      字面量）与魔法 z-index 9999，从未迁移到 aurora 浮层体系。
 *   ⇒ 一个 portal 浮层 = 旧 slate 底 + 旧蓝交互 + Tailwind 圆角阴影。
 *
 * 真机证据（CDP 量 getComputedStyle）：修复前浮层实测
 *   background rgb(15,23,42)=#0f172a / border rgb(51,65,85)=#334155 /
 *   color rgb(226,232,240)=#e2e8f0 —— 全部是 base.css 旧值；
 *   而 #aurora-root 内的权威值是 #101218 / #1A1D26 / #E8ECF4。
 *
 * 修法：让浮层**回归与工具栏其余下拉同一基底** `.aurora-dropdown`
 *   （components.css：--mc-bg-elevated + --mc-border-medium + --mc-radius-md
 *    + --mc-shadow-popover + z-index 1000 带），组件内只保留定位与尺寸；
 *   内部一律直接引用全局 --mc-* token（--mc-* 定义在 :root，portal 拿得到）。
 *   同族参照：ListDropdown / WysiwygHeadingDropdown / MoreDropdown /
 *   SourceHeadingDropdown 全都是 className="aurora-dropdown"。
 *
 * 本文件钉死（改坏任一条即报红）：
 *  1. 根元素必须带 aurora-dropdown 基底类（材质/边框/圆角/阴影/z-index 单源）；
 *  2. 面板外观不得回写内联（backgroundColor/boxShadow/border/borderRadius/zIndex）；
 *  3. 模板行复用 .aurora-dropdown__item，不得手写 onMouseEnter 改色；
 *  4. **浮层内引用的每个 CSS 变量都必须以 --mc- 开头** —— 这是本契约的核心：
 *     portal 浮层在 #aurora-root 外，任何 --editor-* / --hover-bg / --code-bg
 *     都会静默回落旧版值，所以它们不是「另一种写法」，而是「必然变旧」。
 *  5. 旧版遗留字面量不得回流（Tailwind 0.5rem / shadow-lg、旧蓝 #3b82f6）。
 *
 * 注：静态断言只证「已归位」；「真的以 aurora 配色渲染」由 CDP 真机取证。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const toolbarDir = __dirname

/** 必须剥离注释再断言：本组件内含中文说明，正文里就写了 `--editor-*` 等字样，
 *  不剥离会**自命中**（本仓既有铁律，见 styles/subbarUnify.test.ts 同款处理）。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

/** 待守护的 portal 浮层表：[人读名, 文件名]。新增迁移完成的浮层时逐条加入。 */
const OVERLAYS: Array<[string, string]> = [
  ['思维导图模板浮层', 'MindmapPopover.tsx'],
  // 待迁移（本轮未动，逐一确认后再入表）：EmojiPicker / ImageModal / LinkModal /
  // TableGridSelector / ListMenuPopover / WysiwygToolbar 的高亮·下划线调色板。
]

const read = (file: string) => stripComments(readFileSync(resolve(toolbarDir, file), 'utf-8'))

describe('浮层基底同源契约（portal 浮层不得逃出 aurora 作用域）', () => {
  it.each(OVERLAYS)('%s：根元素复用 .aurora-dropdown 基底类', (_label, file) => {
    const src = read(file)
    const root = src.match(/<div\s+ref=\{popoverRef\}[\s\S]{0,600}?>/)![0]
    expect(root, '根元素缺 aurora-dropdown 基底类 ⇒ 材质/圆角/阴影/z-index 无从继承').toContain(
      'className="aurora-dropdown"',
    )
  })

  it.each(OVERLAYS)('%s：面板外观不得回写内联（否则覆盖单源基底）', (_label, file) => {
    const src = read(file)
    const root = src.match(/<div\s+ref=\{popoverRef\}[\s\S]{0,600}?>/)![0]
    expect(root).not.toMatch(/backgroundColor|boxShadow|borderRadius|\bborder:|zIndex/)
  })

  it.each(OVERLAYS)('%s：模板行复用 .aurora-dropdown__item（hover 由基底类负责）', (_label, file) => {
    const src = read(file)
    expect(src).toContain('className="aurora-dropdown__item"')
    expect(src, '手写 onMouseEnter 改色 = 旧版 hover hack（曾回落旧蓝）').not.toMatch(/onMouseEnter/)
  })

  it.each(OVERLAYS)('%s：引用的 CSS 变量必须全部是全局 --mc-*', (_label, file) => {
    const src = read(file)
    const vars = [...src.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
    expect(vars.length, '扫描面为 0 ⇒ 断言无意义（先证明确实引用了 token）').toBeGreaterThan(0)
    const offending = [...new Set(vars)].filter((v) => !v.startsWith('--mc-'))
    expect(
      offending,
      '这些变量只在 #aurora-root/.aurora-editor 内被重映射，portal 到 body 后必然回落旧版值',
    ).toEqual([])
  })

  it.each(OVERLAYS)('%s：旧版遗留字面量不得回流', (_label, file) => {
    const src = read(file)
    expect(src, 'Tailwind 遗留圆角').not.toMatch(/0\.5rem/)
    expect(src, 'Tailwind shadow-lg 硬编码').not.toMatch(/shadow-lg/)
    expect(src, '旧蓝回退色').not.toMatch(/#3b82f6/)
    expect(src, '旧蓝半透明').not.toMatch(/rgba\(\s*59\s*,\s*130\s*,\s*246/)
  })
})
