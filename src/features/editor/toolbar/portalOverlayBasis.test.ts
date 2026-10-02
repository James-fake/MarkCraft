/**
 * 浮层基底同源契约（2026-09-24 建立 / 同日扩至全家族）
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
 *   模态族用 .aurora-modal-overlay（z 3000），命令浮层用 .aurora-command*（z 9000）。
 *
 * ── 2026-09-24 迁移台账（本表即防回归清单，新增浮层迁移完成后逐条入表）──────────
 *   · MindmapPopover            思维导图模板浮层（首个报障）
 *   · ListMenuPopover           列表/任务菜单（原 Tailwind 类 + z 9999）
 *   · EmojiPicker               Emoji 选择器（原内联旧色 + z 10000）
 *   · WysiwygToolbar ×2         下划线 / 高亮调色板（原 --editor-bg + z 9999）
 *   · WikiLinkAutocomplete      源码模式 [[ 输入补全（原 --text-* + z 9999）
 *   · WikiLinkHoverPreview      WYSIWYG wikilink 悬停预览卡
 *   · NoteHoverCard             ★跨作用域共享卡片：CM6 hoverTooltip 用 createRoot 挂 body
 *                                （--editor-bg 回落 #fff = 暗色主题下白卡），
 *                                同时被 NoteContextPanel / CanvasSidebarPanel 复用
 *   · QuickSwitcher             文件快速切换命令浮层（原 z 100000 + #1e1e2e）
 *   · ImagePreviewModal         图片灯箱（原全内联 rgba/#fff + z 9999）
 *   ── 2026-09-24 阶段二补入（旧审计只扫 createPortal，这两处都是盲区）──────────────
 *   · EditorLayout 滚动恢复提示   ★**自持 fixed 浮层但非 createPortal** ⇒ 不在 portal
 *                                搜索结果里；原为紫色渐变底 + #fff + 自绘白按钮 + z 99999
 *   · FrontMatterPanel           文档属性模态：原 z 200（给反了，落在锚定带 1000 之下）
 *                                + --editor-* 旧变量 + rgba(59,130,246,.2) 焦点环
 *                                 + handleFocus/Blur 直接写 currentTarget.style
 *
 * 本文件钉死（改坏任一条即报红）：
 *  1. 根元素必须带对应单源基底类（材质/边框/圆角/阴影/z-index 单一来源）；
 *  2. 根标签外观不得回写内联（backgroundColor/boxShadow/borderRadius/border/zIndex）；
 *  3. **浮层内引用的每个 CSS 变量都必须以 --mc- 开头** —— 这是本契约的核心：
 *     portal 浮层在 #aurora-root 外，任何 --editor-* / --hover-bg / --code-bg
 *     都会静默回落旧版值，所以它们不是「另一种写法」，而是「必然变旧」；
 *  4. 不得手写 hover 改色（currentTarget.style.background*）—— 交给基底类的 :hover；
 *  5. 旧版遗留字面量不得回流（Tailwind 0.5rem / shadow-lg、旧 slate、旧蓝 #3b82f6）；
 *  6. 层级魔数不得回流（9999 / 10000-10002 / 100000），取值只认 tokens.css §14 层级带表。
 *
 * 注：静态断言只证「已归位」；「真的以 aurora 配色渲染」由 CDP 真机取证。
 *     另：本仓铁律 —— 零命中不等于通过，故 read() 对缺失文件直接抛错（证明扫描面非空）。
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

/** src/ 根（本文件位于 src/features/editor/toolbar/） */
const SRC = resolve(__dirname, '../../..')

/** 必须剥离注释再断言：组件内含中文说明，正文里就写了 `--editor-*` / `zIndex 9999` 等字样，
 *  不剥离会**自命中**（本仓既有铁律，见 styles/subbarUnify.test.ts 同款处理）。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

const read = (relPath: string): string => {
  const abs = resolve(SRC, relPath)
  if (!existsSync(abs)) {
    throw new Error(`扫描面缺失：src/${relPath} —— 路径写错会让下方断言静默全绿`)
  }
  return stripComments(readFileSync(abs, 'utf-8'))
}

/** 取浮层根标签：从基底锚点所在的最近 '<' 到其后第一个 '>' */
function rootTagOf(src: string, anchor: string): string {
  const idx = src.indexOf(anchor)
  if (idx < 0) return ''
  return src.slice(src.lastIndexOf('<', idx), src.indexOf('>', idx) + 1)
}

/** 取局部片段（大文件里只迁移了局部浮层时使用）：[起始锚点, 结束锚点) */
function scopeOf(src: string, [start, end]: [string, string]): string {
  const s = src.indexOf(start)
  if (s < 0) throw new Error(`片区起始锚点未命中：${start}`)
  const e = src.indexOf(end, s + start.length)
  if (e < 0) throw new Error(`片区结束锚点未命中：${end}`)
  return src.slice(s, e)
}

interface OverlaySpec {
  /** 人读名 */
  label: string
  /** 相对 src/ 的路径 */
  file: string
  /** 必须出现的单源基底类（className="<base>" 形式或子串） */
  base: string
  /** 行级项类（可选）：迁移后应复用统一行，而非手写行样式 */
  item?: string
  /** 仅扫描该片区（可选）：用于「大文件里只迁移了局部浮层」的场景 */
  scope?: [string, string]
}

const OVERLAYS: OverlaySpec[] = [
  { label: '思维导图模板浮层', file: 'features/editor/toolbar/MindmapPopover.tsx', base: 'aurora-dropdown', item: 'aurora-dropdown__item' },
  { label: '列表菜单浮层', file: 'features/editor/toolbar/ListMenuPopover.tsx', base: 'aurora-dropdown', item: 'aurora-dropdown__item' },
  { label: 'Emoji 选择浮层', file: 'features/editor/toolbar/EmojiPicker.tsx', base: 'aurora-dropdown', item: 'aurora-dropdown__item' },
  {
    // P4-3 拆分：下划线调色板迁至 WysiwygColorButtons.tsx（scope 锚点随实现走）
    label: 'Wysiwyg 下划线调色板',
    file: 'features/editor/toolbar/WysiwygColorButtons.tsx',
    base: 'aurora-dropdown',
    scope: ['<div ref={underlineMenuRef} className="aurora-dropdown"', '\n        )}'],
  },
  {
    // P4-3 拆分：高亮调色板迁至 WysiwygColorButtons.tsx（scope 锚点随实现走）
    label: 'Wysiwyg 高亮调色板',
    file: 'features/editor/toolbar/WysiwygColorButtons.tsx',
    base: 'aurora-dropdown',
    scope: ['<div ref={highlightMenuRef} className="aurora-dropdown"', '\n        )}'],
  },
  { label: 'WikiLink 输入补全浮层', file: 'features/editor/extensions/WikiLinkAutocomplete.tsx', base: 'aurora-dropdown', item: 'aurora-dropdown__item' },
  { label: 'WikiLink 悬停预览卡', file: 'features/editor/extensions/WikiLinkHoverPreview.tsx', base: 'aurora-dropdown' },
  { label: '笔记悬停预览卡（跨作用域共享）', file: 'features/editor/components/NoteHoverCard.tsx', base: 'aurora-dropdown' },
  { label: '快速切换命令浮层', file: 'features/editor/components/QuickSwitcher.tsx', base: 'aurora-command-overlay', item: 'aurora-command__item' },
  { label: '图片灯箱', file: 'features/editor/ImagePreviewModal.tsx', base: 'aurora-modal-overlay aurora-modal-overlay--dim' },
  {
    label: '文档属性（Front Matter）模态',
    file: 'features/editor/FrontMatterPanel.tsx',
    base: 'aurora-modal-overlay',
  },
  {
    label: '编辑器滚动恢复提示（自持 fixed 浮层 · 非 portal）',
    file: 'features/editor/EditorLayout.tsx',
    base: 'aurora-toast-container',
    scope: ['{showScrollRestoreHint &&', '\n    )}'],
  },
]

/** 旧版遗留字面量（出现即说明有片段没跟着迁移） */
const LEGACY_LITERALS: Array<[string, RegExp]> = [
  ['Tailwind 遗留圆角 0.5rem', /0\.5rem/],
  ['Tailwind shadow-lg 硬编码', /shadow-lg/],
  ['旧蓝强调色 #3b82f6', /#3b82f6/],
  ['旧蓝半透明 rgba(59,130,246…)', /rgba\(\s*59\s*,\s*130\s*,\s*246/],
  ['旧 slate 浮层底 #1e1e2e', /#1e1e2e/],
  ['旧 slate 底 #0f172a', /#0f172a/],
  ['旧 slate 文本 #e2e8f0', /#e2e8f0/],
  ['旧 slate 边框 #334155', /#334155/],
]

/** 越带魔数：层级带表以外的取值（见 tokens.css §14） */
const BAND_BAN = /zIndex:\s*(9999|10000|10001|10002|100000)\b/

describe('浮层基底同源契约（portal 浮层不得逃出 aurora 作用域）', () => {
  it.each(OVERLAYS)('$label：根元素复用单源基底类', ({ file, base, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    expect(
      region.includes(`className="${base}"`),
      `缺少 className="${base}" ⇒ 材质/圆角/阴影/z-index 无从继承（逐字写死 = 下一轮又变旧）`,
    ).toBe(true)
  })

  it.each(OVERLAYS)('$label：根标签外观不得回写内联', ({ file, base, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    const tag = rootTagOf(region, `className="${base}"`)
    expect(tag.length, '未能切出根标签 ⇒ 上面那条「基底类」断言可能被放宽成了纯子串匹配').toBeGreaterThan(0)
    expect(tag).not.toMatch(/backgroundColor|boxShadow|borderRadius|\bborder\s*:|zIndex/)
  })

  it.each(OVERLAYS)('$label：引用的 CSS 变量必须全部是全局 --mc-*', ({ file, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    const vars = [...region.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
    const offending = [...new Set(vars)].filter((v) => !v.startsWith('--mc-'))
    expect(
      offending,
      '这些变量只在 #aurora-root/.aurora-editor 内被重映射，portal 到 body 后必然回落旧版值',
    ).toEqual([])
  })

  it.each(OVERLAYS)('$label：不得手写 hover 改色（交给基底类 :hover）', ({ file, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    expect(region).not.toMatch(/currentTarget\.style\./)
  })

  it.each(OVERLAYS)('$label：旧版遗留字面量不得回流', ({ file, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    for (const [name, re] of LEGACY_LITERALS) {
      expect(region, name).not.toMatch(re)
    }
  })

  it.each(OVERLAYS)('$label：行级项复用统一行类（若该浮层有行）', ({ file, item, scope }) => {
    if (!item) return
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    expect(region, `未复用 ${item} ⇒ 行样式各写各的，hover/选中态必然漂移`).toContain(item)
  })

  it.each(OVERLAYS)('$label：层级魔数不得回流', ({ file, scope }) => {
    const src = read(file)
    const region = scope ? scopeOf(src, scope) : src
    expect(region, '取值只认 tokens.css §14 层级带表，禁写 9999/10000 档').not.toMatch(BAND_BAN)
  })
})

describe('浮层层级带契约（tokens.css §14）', () => {
  /** 浮层消费方 → 允许内联出现的 z-index 取值（空数组 = 完全交给基底类） */
  const BAND_CONSUMERS: Array<[string, string, number[]]> = [
    ['列表下拉', 'features/editor/toolbar/ListDropdown.tsx', []],
    ['Wysiwyg 标题下拉', 'features/editor/toolbar/WysiwygHeadingDropdown.tsx', []],
    ['更多菜单', 'features/editor/toolbar/groups/MoreDropdown.tsx', []],
    ['源码标题下拉', 'features/editor/toolbar/groups/SourceHeadingDropdown.tsx', []],
    ['编辑器右键菜单', 'features/editor/EditorContextMenu.tsx', [10030]],
  ]

  it.each(BAND_CONSUMERS)('%s：内联 z-index 取值只允许出现在带内', (_label, file, allowed) => {
    const src = read(file)
    const values = [...src.matchAll(/zIndex:\s*(\d+)/g)].map((m) => Number(m[1]))
    if (allowed.length === 0) {
      expect(values, '该浮层已完全交给 .aurora-dropdown 的 z-index:1000，不应再自持层级').toEqual([])
    } else {
      expect(values.length, '扫描面为 0 ⇒ 断言无意义（先证明确实有层级声明）').toBeGreaterThan(0)
      expect([...new Set(values)].sort()).toEqual([...allowed].sort())
    }
  })
})

/**
 * 层级带契约 · **CSS 侧**（2026-09-24 阶段二补：原守卫的盲区）
 * ------------------------------------------------------------
 * 根因：上方两条契约只匹配 TSX 里的内联 `zIndex:`，**CSS 里的 `z-index:` 完全没扫**
 *   ⇒ `EditorLayout` 的 `zIndex:99999` 与 `versionHistory.css` 的 1090/1091/1095
 *     都因此长期漏检（前者已随 toast 迁移修掉，后者属「补登记专用带」）。
 * 判据：CSS 文件里的 `z-index` 取值必须**逐值可回溯到 tokens.css §14 表**；
 *   `z-index:1` 这类容器内局部档（sticky 表头）不属于全局带，单独白名单放行。
 */
describe('层级带契约 · CSS 侧', () => {
  /** [人读名, 相对 src/ 的路径, 允许的取值全集] */
  const CSS_BANDS: Array<[string, string, number[]]> = [
    // 1090 backdrop / 1091 drawer / 1095 确认 mask（三档专用带）+ 1（抽屉内 sticky 分组标题，局部档）
    ['版本历史抽屉组', 'features/editor/versionHistory.css', [1090, 1091, 1095, 1]],
  ]

  it.each(CSS_BANDS)('%s：CSS 内 z-index 只允许出现在层级带内（含局部 1 档）', (_label, file, allowed) => {
    const src = read(file)
    const values = [...src.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(values.length, '扫描面为 0 ⇒ 这条断言等于没写').toBeGreaterThan(0)
    expect([...new Set(values)].sort((a, b) => a - b)).toEqual([...allowed].sort((a, b) => a - b))
  })

  it('版本历史抽屉组的取值必须已登记进层级带表（值 ↔ 表 双锚点）', () => {
    // ⚠️ 必须读**未剥注释**的原文：层级带表本身就在 tokens.css 的块注释里，
    //    用 read()（会剥注释）查表会永远查不到 ⇒ 假红/假绿（本轮踩过）。
    const raw = readFileSync(resolve(SRC, 'aurora/styles/tokens.css'), 'utf-8')
    for (const v of [1090, 1091, 1095]) {
      expect(raw, `tokens.css §14 层级带表未登记 ${v} ⇒ 「只认表」的纪律无从执行`).toContain(String(v))
    }
  })
})
