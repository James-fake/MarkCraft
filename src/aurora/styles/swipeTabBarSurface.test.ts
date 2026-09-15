/**
 * 「tab 栏即滑动手势区」契约测试（2026-09-15 需求 N 返工）
 * --------------------------------------------------------------------------
 * 事故背景（用户追问：「为什么我要求的功能 tab 切换栏内可以左右滑动的效果没有实现？」）：
 *
 *   需求原话是「**顶栏的功能切换 tab，支持左右滑动**」—— 字面含义是**在 tab 栏本身上横滑**。
 *   首轮实现把需求重构为「内容区左右滑动切 Tab」，手势只绑在**内容区**，
 *   于是用户抓着 tab 栏横滑时**毫无反应**；CDP 实测：设置页 tab 栏内拖动 ❌ / 内容区拖动 ✅。
 *
 *   返工：`useSwipeTabs` 增加 `makeBind()` 工厂，让同一套手势逻辑**同时**挂到
 *   「tab 栏 + 内容区」两处（共享 `gestureRef`/`offsetRef`/`suppressClickRef`）。
 *
 * 本测试锁死「tab 栏」这一侧的两件事，**两侧缺一不可**：
 *
 *   A) CSS 侧：tab 栏必须自我声明为 **x 轴手势区**（`touch-action: pan-y`）
 *      + 横滑不选中 tab 文案（`user-select: none`）
 *      + 跟手期间 `cursor: grabbing`（拖动中的光标语言）。
 *
 *      为什么 `touch-action` 是硬需求而不是锦上添花：手势绑上 tab 栏后，
 *      tab 栏也成了起手区。若其 `touch-action` 仍是默认 `auto`，触摸/触控板
 *      的横向位移会被浏览器判定为**页面横滚或回退手势**并抢走 → 手势半途
 *      `pointercancel`。且 `onWheel` 里那句 `e.preventDefault()` 是**无效**的
 *      （React 17+ 在根容器以 passive 监听注册 wheel），所以只能靠 CSS 声明的轴向。
 *      首轮只有 `.aurora-csp__tabs` 有这条声明，其余三条栏（settings / kb / blog）
 *      全缺 —— 本次补齐。
 *
 *   B) JSX 侧：tab 栏元素必须真的挂上 `data-swiping` 与手势展开（`{...bind}`）。
 *      单测 CSS 会漏掉「改 CSS 不改 JS」这一半（项目已有先例：PLAN-02 的
 *      blogDockTransform 只改 CSS 会让位移彻底失效）。CSS 规则没有承载者 = 死代码。
 *
 * 静止态**不设** `cursor: grab`：tab 是按钮，静止态显示 grab 会与「可点击」语义打架；
 * 只在跟手瞬间给 `grabbing`（与 `.is-swiping` 内容区的处理一致）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const cssDir = resolve(__dirname, 'panels')
const panelDir = resolve(__dirname, '../panels')

const cssOf = (f: string) => readFileSync(resolve(cssDir, f), 'utf-8')
const tsxOf = (f: string) => readFileSync(resolve(panelDir, f), 'utf-8')

/**
 * 取出「选择器紧跟 `{`」的那条基类规则体。
 * 刻意不匹配 `选择器[data-swiping] {` / `选择器 .child {` —— 后者在 `{` 前
 * 还有内容，故 `\s*\{` 不会命中，正好只拿到基类。
 */
function baseRule(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

/** 取出「选择器[data-swiping] { ... }」这条规则体（不含后代选择器形态）。 */
function swipingRule(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\[data-swiping\\]\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

interface Surface {
  /** 面板名（断言失败时便于定位） */
  name: string
  /** CSS 文件名 */
  css: string
  /** tab 栏选择器 */
  selector: string
  /** 面板 TSX 文件名 */
  tsx: string
  /** TSX 里 tab 栏 className 的字面量（用于锚定 JSX 绑定位置） */
  classLiteral: string
}

/** 四面板的「tab 栏」手势区（内容区另有各自声明，见最后一个 describe） */
const SURFACES: Surface[] = [
  {
    name: '设置页',
    css: 'settings.css',
    selector: '.aurora-settings__nav-tabs',
    tsx: 'settings/SettingsPanel.tsx',
    classLiteral: 'className="aurora-settings__nav-tabs"',
  },
  {
    name: '知识库',
    css: 'kb.css',
    selector: '.aurora-kb-subbar-tabs',
    tsx: 'kb/KbPanel.tsx',
    // 必须用带引号的完整字面量锚定：裸类名会先命中注释里提到的同名类
    // （第三轮就在 trackRef 的注释里提到过 .aurora-kb-subbar-tabs，导致锚点落进注释）
    classLiteral: 'className="aurora-kb-subbar-tabs"',
  },
  {
    name: '博客工作室',
    css: 'blog.css',
    selector: '.aurora-blog__subseg',
    tsx: 'blog/BlogPanel.tsx',
    classLiteral: 'className="aurora-blog__subseg"',
  },
  {
    name: '白板',
    css: 'canvas.css',
    selector: '.aurora-csp__tabs',
    tsx: 'canvas/CanvasSidebarPanel.tsx',
    classLiteral: 'className="aurora-csp__tabs"',
  },
]

describe('tab 栏即滑动手势区 · CSS 侧（四条栏必须自我声明轴向与状态光标）', () => {
  for (const s of SURFACES) {
    it(`${s.name}：${s.selector} 声明 touch-action: pan-y（横滑不被浏览器抢走）`, () => {
      const body = baseRule(cssOf(s.css), s.selector)
      expect(body, `${s.css} 缺 ${s.selector} 基类规则`).not.toBe('')
      expect(body).toMatch(/touch-action:\s*pan-y/)
    })

    it(`${s.name}：${s.selector} 声明 user-select: none（横滑不选中 tab 文案）`, () => {
      const body = baseRule(cssOf(s.css), s.selector)
      expect(body).toMatch(/user-select:\s*none/)
    })

    it(`${s.name}：${s.selector}[data-swiping] 给 cursor: grabbing（拖动中的光标语言）`, () => {
      const body = swipingRule(cssOf(s.css), s.selector)
      expect(body, `${s.css} 缺 ${s.selector}[data-swiping] 规则`).not.toBe('')
      expect(body).toMatch(/cursor:\s*grabbing/)
    })

    it(`${s.name}：静止态不得设 cursor: grab（避免与 tab 的点击语义打架）`, () => {
      const body = baseRule(cssOf(s.css), s.selector)
      expect(body, `${s.css} ${s.selector} 静止态不应出现 grab 光标`).not.toMatch(/cursor:\s*grab\b(?!bing)/)
    })
  }
})

describe('tab 栏即滑动手势区 · JSX 侧（CSS 规则必须有真实承载者，防「改 CSS 不改 JS」）', () => {
  for (const s of SURFACES) {
    it(`${s.name}：tab 栏元素同时挂 data-swiping 与手势展开 {...bind}`, () => {
      const src = tsxOf(s.tsx)
      const at = src.indexOf(s.classLiteral)
      expect(at, `${s.tsx} 未找到 tab 栏锚点 ${s.classLiteral}`).toBeGreaterThanOrEqual(0)

      // 取该元素的起始标签片段（到闭合 '>' 为止），断言两件事落在**同一个元素**上
      const tagEnd = src.indexOf('>', at)
      const tag = src.slice(at, tagEnd === -1 ? at + 400 : tagEnd + 1)

      expect(tag, `${s.tsx} 的 tab 栏未挂 data-swiping（CSS 的 [data-swiping] 规则将永不生效）`)
        .toMatch(/data-swiping=\{/)
      expect(tag, `${s.tsx} 的 tab 栏未展开手势绑定（横滑起手不会触发 any 逻辑）`)
        .toMatch(/\{\.\.\.\w*[Bb]ind\}/)
    })
  }
})

describe('内容区手势声明未被本次改动回退', () => {
  const CONTENT: Array<[string, string, string]> = [
    ['设置页', 'settings.css', '.aurora-settings__content'],
    ['知识库', 'kb.css', '.aurora-kb-content'],
    ['博客工作室', 'blog.css', '.aurora-blog__panelzone-body'],
    ['白板', 'canvas.css', '.aurora-csp__body'],
  ]

  for (const [name, css, selector] of CONTENT) {
    it(`${name}：${selector} 仍是 x 轴手势区（pan-y）`, () => {
      const body = baseRule(cssOf(css), selector)
      expect(body, `${css} 缺 ${selector} 基类规则`).not.toBe('')
      expect(body).toMatch(/touch-action:\s*pan-y/)
    })
  }
})

/* ------------------------------------------------------------------ *
 * 第三轮：整排 tab 跟手（用户原话「按住 tab 方框左或右可以滑动」）
 * ------------------------------------------------------------------ *
 * 事故背景：第二轮把手势挂上了 tab 栏（能识别），但视觉上等于没动 ——
 * CDP 实测按住方块拖 150px，方块只挪 0.7px（progress 被内容区宽 1358px 稀释后 ×6px），
 * 且松手阈值是内容区宽 × 32% = 435px，鼠标慢拖永远够不到。
 *
 * 修法：药丸底色留在外层，**内层加一条轨道**承载整排跟手位移（1:1，限幅一个槽距）；
 * 松手阈值改「半个槽距」；进度按槽距归一化。
 *
 * 这里锁死「CSS 侧有轨道规则」+「JSX 侧有真实承载者」两半 ——
 * 只加 CSS 无元素 = 死代码；只加元素无 CSS = 位移没有过渡、跟手期间还会滞后。
 */
interface StripCase {
  name: string
  css: string
  /** tab 栏（裁剪方 + 渐隐遮罩 + cursor） */
  bar: string
  /** 轨道（位移承载者） */
  track: string
  /** 渐隐半径（与 CSS 字面量同源） */
  fade: string
  tsx: string
  /** JSX 里轨道元素的 className 字面量 */
  trackLiteral: string
}

const STRIPS: StripCase[] = [
  { name: '设置页', css: 'settings.css', bar: '.aurora-settings__nav-tabs', track: '.aurora-settings__nav-track', fade: '14px', tsx: 'settings/SettingsPanel.tsx', trackLiteral: 'className="aurora-settings__nav-track"' },
  { name: '知识库', css: 'kb.css', bar: '.aurora-kb-subbar-tabs', track: '.aurora-kb-subbar-track', fade: '14px', tsx: 'kb/KbPanel.tsx', trackLiteral: 'className="aurora-kb-subbar-track"' },
  { name: '博客工作室', css: 'blog.css', bar: '.aurora-blog__subseg', track: '.aurora-blog__subseg-track', fade: '12px', tsx: 'blog/BlogPanel.tsx', trackLiteral: 'className="aurora-blog__subseg-track"' },
  { name: '白板', css: 'canvas.css', bar: '.aurora-csp__tabs', track: '.aurora-csp__tabs-track', fade: '12px', tsx: 'canvas/CanvasSidebarPanel.tsx', trackLiteral: 'className="aurora-csp__tabs-track"' },
]

/** 取出「选择器 { ... }」的规则体（用于轨道基类） */
function ruleBody(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

describe('整排 tab 跟手 · CSS 侧', () => {
  for (const s of STRIPS) {
    it(`${s.name}：轨道有归位过渡（transform transition，松手吸附靠它）`, () => {
      const body = baseRule(cssOf(s.css), s.track)
      expect(body, `${s.css} 缺 ${s.track} 基类规则`).not.toBe('')
      expect(body).toMatch(/transition:\s*transform/)
    })

    it(`${s.name}：跟手期间轨道过渡归零（否则位移逐帧滞后于指针）`, () => {
      const css = cssOf(s.css)
      const at = css.indexOf(`${s.bar}[data-swiping] ${s.track}`)
      expect(at, `${s.css} 缺「${s.bar}[data-swiping] ${s.track}」规则`).toBeGreaterThanOrEqual(0)
      const body = css.slice(at, css.indexOf('}', at))
      expect(body).toMatch(/transition:\s*none/)
    })

    it(`${s.name}：跟手期间两端渐隐（整排外滑时方块不再被硬切在边界上）`, () => {
      const body = swipingRule(cssOf(s.css), s.bar)
      expect(body, `${s.css} 的 ${s.bar}[data-swiping] 缺渐隐遮罩`).toMatch(/mask-image/)
      expect(body).toContain(s.fade)
    })

    it(`${s.name}：旧的「激活方块只挪 6px」联动已移除（否则与新轨道位移叠加）`, () => {
      const css = cssOf(s.css).replace(/\/\*[\s\S]*?\*\//g, '')
      expect(css, `${s.css} 仍有 var(--swipe-progress) * 6px 的旧联动`).not.toMatch(/swipe-progress\)\s*\*\s*6px/)
    })
  }
})

describe('整排 tab 跟手 · JSX 侧（轨道必须有真实承载者，否则 CSS 全是死代码）', () => {
  for (const s of STRIPS) {
    it(`${s.name}：轨道元素存在并挂 ref（位移写不进 DOM 就等于没做）`, () => {
      const src = tsxOf(s.tsx)
      const at = src.indexOf(s.trackLiteral)
      expect(at, `${s.tsx} 未找到轨道锚点 ${s.trackLiteral}`).toBeGreaterThanOrEqual(0)
      const tagEnd = src.indexOf('>', at)
      const tag = src.slice(at, tagEnd === -1 ? at + 200 : tagEnd + 1)
      expect(tag, `${s.tsx} 的轨道未挂 ref`).toMatch(/ref=\{\w*[Tt]rackRef\}/)

      // 轨道必须嵌在 tab 栏**内部**（药丸底色留在外层，位移才不带走底色）
      const barAt = src.indexOf(`className="${s.bar.slice(1)}"`)
      expect(barAt, `${s.tsx} 未找到 tab 栏锚点 className="${s.bar.slice(1)}"`).toBeGreaterThanOrEqual(0)
      expect(barAt, `${s.tsx} 的轨道出现在 tab 栏之前（应在栏内）`).toBeLessThan(at)
    })
  }
})
