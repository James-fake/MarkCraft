/**
 * 「功能 tab 栏」交互契约测试（需求 N · 第四轮定案）
 * --------------------------------------------------------------------------
 * 用户原话：「滑动只有功能 tab 栏中的功能 tab 进行滑动 …… 摁住这个功能 tab
 *   就有一个方块的感觉，然后可以进行一个滑动 …… 内容区域不要 …… 工具 tab 栏
 *   也是不需要进行滚动的」
 *
 * 定案形态 = **Apple 分段控件（Segmented Control）**：
 *   · 一条**常驻滑块**盖在选中项上；
 *   · 按住任一 tab 拖动 → **只有滑块**跟手滑，**tab 文字一个像素都不动**；
 *   · 松手滑块滑到最近的 tab（拖过一半就切）；
 *   · **内容区零位移**；
 *   · 栏**不滚动**。
 *
 * 本文件锁死 CSS 与 JSX **两侧**（缺一侧就是死代码）：
 *   A) CSS 侧：tab 栏自我声明为 x 轴手势区（`touch-action: pan-y`）+ 横滑不选中
 *      文案（`user-select: none`）+ 跟手期 `cursor: grabbing`。
 *
 *      为什么 `touch-action` 是硬需求：手势绑在 tab 栏上，栏就是起手区。若其
 *      `touch-action` 仍是默认 `auto`，触摸/触控板的横向位移会被浏览器判为
 *      **页面横滚或回退手势**并抢走 → 手势半途 `pointercancel`。而 hook 里的
 *      `e.preventDefault()` 在 React 17+ 是**无效**的（wheel 以 passive 注册），
 *      所以只能靠 CSS 声明轴向。
 *
 *   B) JSX 侧：CSS 规则必须有真实承载者。项目已有先例：只改 CSS 不改 JS
 *      会让位移彻底失效（PLAN-02 blogDockTransform）。
 *
 * 静止态**不设** `cursor: grab`：tab 是按钮，静止态显示 grab 会与「可点击」语义打架；
 * 只在跟手瞬间给 `grabbing`。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const cssDir = resolve(__dirname, 'panels')
const panelDir = resolve(__dirname, '../panels')

const cssOf = (f: string) => readFileSync(resolve(cssDir, f), 'utf-8')
const tsxOf = (f: string) => readFileSync(resolve(panelDir, f), 'utf-8')

/** 剥掉注释（断言「无某声明」前必须做，否则注释里的说明文字会自命中） */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 取出「选择器紧跟 `{`」的那条基类规则体（`[data-swiping]` / 后代选择器都不会命中） */
function baseRule(css: string, selector: string): string {
  return css.match(new RegExp(`${esc(selector)}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

/** 取出「选择器[data-swiping] { ... }」这条规则体 */
function swipingRule(css: string, selector: string): string {
  return css.match(new RegExp(`${esc(selector)}\\[data-swiping\\]\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

/** 取出「A[data-swiping] B { ... }」这条后代规则体（用 indexOf 定位，容忍空白差异） */
function swipingChildRule(css: string, bar: string, child: string): string {
  const at = css.indexOf(`${bar}[data-swiping] ${child}`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

interface Surface {
  name: string
  css: string
  /** tab 栏（手势区 + 裁剪方） */
  bar: string
  /** 轨道（滑块的定位坐标系） */
  track: string
  /** 滑块（选中态的视觉承载者） */
  thumb: string
  /** 单个 tab */
  tab: string
  /** 选中态 tab（底色必须已迁走） */
  tabActive: string
  /** 滑块形态：block = 圆角块（分段控件）/ underline = 下划线 */
  form: 'block' | 'underline'
  tsx: string
}

const SURFACES: Surface[] = [
  {
    name: '设置页',
    css: 'settings.css',
    bar: '.aurora-settings__nav-tabs',
    track: '.aurora-settings__nav-track',
    thumb: '.aurora-settings__nav-thumb',
    tab: '.aurora-settings__nav-tab',
    tabActive: '.aurora-settings__nav-tab--active',
    form: 'block',
    tsx: 'settings/SettingsPanel.tsx',
  },
  {
    name: '知识库',
    css: 'kb.css',
    bar: '.aurora-kb-subbar-tabs',
    track: '.aurora-kb-subbar-track',
    thumb: '.aurora-kb-subbar-thumb',
    tab: '.aurora-kb-subbar-tab',
    tabActive: '.aurora-kb-subbar-tab.is-active',
    form: 'block',
    tsx: 'kb/KbPanel.tsx',
  },
  {
    name: '博客工作室',
    css: 'blog.css',
    bar: '.aurora-blog__subseg',
    track: '.aurora-blog__subseg-track',
    thumb: '.aurora-blog__subseg-thumb',
    tab: '.aurora-blog__subseg-btn',
    tabActive: '.aurora-blog__subseg-btn.is-active',
    form: 'block',
    tsx: 'blog/BlogPanel.tsx',
  },
  {
    name: '白板',
    css: 'canvas.css',
    bar: '.aurora-csp__tabs',
    track: '.aurora-csp__tabs-track',
    thumb: '.aurora-csp__tabs-thumb',
    tab: '.aurora-csp__tab',
    tabActive: '.aurora-csp__tab--active',
    // 白板沿用「下划线选中」的全站基准（编辑器 rightbar 同源），滑块做成下划线形态
    form: 'underline',
    tsx: 'canvas/CanvasSidebarPanel.tsx',
  },
]

/* ================================================================== *
 * A) tab 栏即手势区
 * ================================================================== */

describe('A. tab 栏即手势区 · CSS 侧', () => {
  for (const s of SURFACES) {
    it(`${s.name}：${s.bar} 声明 touch-action: pan-y（横滑不被浏览器抢走）`, () => {
      expect(baseRule(cssOf(s.css), s.bar), `${s.css} 缺 ${s.bar} 基类规则`).toMatch(/touch-action:\s*pan-y/)
    })

    it(`${s.name}：${s.bar} 声明 user-select: none（横滑不选中 tab 文案）`, () => {
      expect(baseRule(cssOf(s.css), s.bar)).toMatch(/user-select:\s*none/)
    })

    it(`${s.name}：${s.bar}[data-swiping] 给 cursor: grabbing`, () => {
      expect(swipingRule(cssOf(s.css), s.bar), `${s.css} 缺 ${s.bar}[data-swiping] 规则`)
        .toMatch(/cursor:\s*grabbing/)
    })

    it(`${s.name}：静止态不得设 cursor: grab（避免与 tab 的点击语义打架）`, () => {
      expect(baseRule(cssOf(s.css), s.bar)).not.toMatch(/cursor:\s*grab\b(?!bing)/)
    })
  }
})

describe('A. tab 栏即手势区 · JSX 侧（CSS 规则必须有承载者）', () => {
  for (const s of SURFACES) {
    it(`${s.name}：tab 栏元素同时挂 data-swiping 与手势展开 {...xxx.bind}`, () => {
      const src = tsxOf(s.tsx)
      const literal = `className="${s.bar.slice(1)}"`
      const at = src.indexOf(literal)
      expect(at, `${s.tsx} 未找到 tab 栏锚点 ${literal}`).toBeGreaterThanOrEqual(0)

      // 取该元素的起始标签片段（到闭合 '>' 为止），断言两件事落在**同一个元素**上
      const tagEnd = src.indexOf('>', at)
      const tag = src.slice(at, tagEnd === -1 ? at + 500 : tagEnd + 1)

      expect(tag, `${s.tsx} 的 tab 栏未挂 data-swiping（CSS 的 [data-swiping] 规则将永不生效）`)
        .toMatch(/data-swiping=\{/)
      expect(tag, `${s.tsx} 的 tab 栏未展开手势绑定（横滑起手不会触发任何逻辑）`)
        .toMatch(/\{\.\.\.[\w.]*[Bb]ind\}/)
    })
  }
})

/* ================================================================== *
 * B) 内容区零位移（第四轮：内容区不再参与滑动）
 * ================================================================== */

describe('B. 内容区不参与滑动 · CSS 侧（不得再带位移过渡 / 边缘压暗 / is-swiping）', () => {
  const CONTENT: Array<[string, string, string]> = [
    ['设置页', 'settings.css', '.aurora-settings__content'],
    ['知识库', 'kb.css', '.aurora-kb-content__body'],
    ['博客工作室', 'blog.css', '.aurora-blog__panelzone-body'],
    ['白板', 'canvas.css', '.aurora-csp__body'],
  ]

  for (const [name, css, selector] of CONTENT) {
    it(`${name}：${selector} 不带 transform 过渡 / will-change（内容区不再跟手）`, () => {
      const body = baseRule(stripComments(cssOf(css)), selector)
      expect(body, `${css} 缺 ${selector} 基类规则`).not.toBe('')
      expect(body, `${css} 的 ${selector} 仍带位移过渡`).not.toMatch(/transition:[\s\S]*transform/)
      expect(body, `${css} 的 ${selector} 仍带 will-change: transform`).not.toMatch(/will-change:\s*transform/)
    })

    it(`${name}：${css} 已无 is-swiping 残留规则（跟手态只属于 tab 栏）`, () => {
      const cssText = stripComments(cssOf(css))
      expect(cssText, `${css} 仍有 is-swiping 规则`).not.toMatch(/is-swiping/)
    })

    it(`${name}：${css} 已无 --swipe-progress 残留（边缘压暗已整体删除）`, () => {
      expect(stripComments(cssOf(css)), `${css} 仍消费 --swipe-progress`).not.toMatch(/swipe-progress/)
    })
  }
})

describe('B. 内容区不参与滑动 · JSX 侧', () => {
  const PANELS: Array<[string, string]> = [
    ['设置页', 'settings/SettingsPanel.tsx'],
    ['知识库', 'kb/KbPanel.tsx'],
    ['博客工作室', 'blog/BlogPanel.tsx'],
    ['白板', 'canvas/CanvasSidebarPanel.tsx'],
  ]

  for (const [name, tsx] of PANELS) {
    it(`${name}：${tsx} 不再出现 is-swiping / 内容区手势绑定`, () => {
      const src = tsxOf(tsx)
      expect(src, `${tsx} 仍有 is-swiping`).not.toMatch(/is-swiping/)
      // 手势展开只能出现一次（tab 栏那一处）——内容区那处已删
      const binds = src.match(/\{\.\.\.[\w.]*[Bb]ind\}/g) ?? []
      expect(binds.length, `${tsx} 手势绑定出现 ${binds.length} 次（应只有 tab 栏 1 次）`).toBe(1)
    })
  }
})

/* ================================================================== *
 * C) 分段控件滑块：轨道 / 滑块 / 选中态迁移
 * ================================================================== */

describe('C. 分段控件滑块 · CSS 侧', () => {
  for (const s of SURFACES) {
    it(`${s.name}：轨道 position: relative（滑块 left:0 的原点靠它对齐）`, () => {
      expect(baseRule(cssOf(s.css), s.track), `${s.css} 的 ${s.track} 缺 position: relative`)
        .toMatch(/position:\s*relative/)
    })

    it(`${s.name}：轨道自身不再位移（第三轮的整排跟手必须已废弃）`, () => {
      const body = baseRule(cssOf(s.css), s.track)
      expect(body, `${s.css} 的 ${s.track} 仍在位移`).not.toMatch(/transition:[\s\S]*transform/)
      expect(body).not.toMatch(/will-change:\s*transform/)
    })

    it(`${s.name}：滑块绝对定位 + transform/width 过渡（落位要靠它滑过去）`, () => {
      const body = baseRule(cssOf(s.css), s.thumb)
      expect(body, `${s.css} 缺 ${s.thumb} 基类规则`).not.toBe('')
      expect(body).toMatch(/position:\s*absolute/)
      expect(body, `${s.css} 的滑块缺位移/宽度过渡`).toMatch(/transition:[\s\S]*transform[\s\S]*width/)
    })

    it(`${s.name}：滑块不吃指针事件（否则会挡住 tab 的点击/起手）`, () => {
      expect(baseRule(cssOf(s.css), s.thumb)).toMatch(/pointer-events:\s*none/)
    })

    it(`${s.name}：跟手期间滑块过渡归零（否则位移逐帧滞后于指针）`, () => {
      expect(swipingChildRule(cssOf(s.css), s.bar, s.thumb), `${s.css} 缺「${s.bar}[data-swiping] ${s.thumb}」`)
        .toMatch(/transition:\s*none/)
    })

    it(`${s.name}：滑块形态正确（${s.form === 'block' ? '圆角块' : '下划线'}）`, () => {
      const body = baseRule(cssOf(s.css), s.thumb)
      if (s.form === 'block') {
        expect(body, '分段控件滑块必须有底色与圆角').toMatch(/background:/)
        expect(body).toMatch(/border-radius:/)
      } else {
        expect(body, '下划线滑块必须是贴底细线').toMatch(/height:\s*2px/)
        expect(body).toMatch(/bottom:\s*0/)
        expect(body).toMatch(/background:\s*var\(--mc-accent\)/)
      }
    })

    it(`${s.name}：选中态底色/下划线已从 tab 迁到滑块（否则与滑块叠成两层）`, () => {
      const active = baseRule(cssOf(s.css), s.tabActive)
      expect(active, `${s.css} 缺 ${s.tabActive} 规则`).not.toBe('')
      if (s.form === 'block') {
        expect(active, `${s.tabActive} 仍自带底色（应交给滑块）`).not.toMatch(/background:/)
        expect(active, `${s.tabActive} 仍自带阴影（应交给滑块）`).not.toMatch(/box-shadow:/)
      } else {
        expect(active, `${s.tabActive} 仍自带下划线色（应交给滑块）`).not.toMatch(/border-bottom-color/)
      }
    })
  }

  it('block 形态：tab 必须抬到滑块之上（滑块绝对定位会盖住非定位兄弟的文字）', () => {
    for (const s of SURFACES.filter((x) => x.form === 'block')) {
      const body = baseRule(cssOf(s.css), s.tab)
      expect(body, `${s.css} 的 ${s.tab} 缺 z-index: 1（文字会被滑块盖住）`).toMatch(/z-index:\s*1/)
      expect(body, `${s.css} 的 ${s.tab} 缺 position（z-index 需定位元素）`).toMatch(/position:\s*relative/)
    }
  })

  it('block 形态：hover 只给未选中项（否则 hover 底色会盖住滑块）', () => {
    const CASES: Array<[string, string, string]> = [
      ['settings.css', '.aurora-settings__nav-tab', ':not(.aurora-settings__nav-tab--active)'],
      ['kb.css', '.aurora-kb-subbar-tab', ':not(.is-active)'],
      ['blog.css', '.aurora-blog__subseg-btn', ':not(.is-active)'],
    ]
    for (const [css, tab, guard] of CASES) {
      const text = stripComments(cssOf(css))
      expect(text, `${css} 的 ${tab} 仍有无条件 hover 底色（会盖住滑块）`)
        .toContain(`${tab}${guard}:hover`)
    }
  })
})

describe('C. 分段控件滑块 · JSX 侧（滑块必须有真实承载者）', () => {
  for (const s of SURFACES) {
    it(`${s.name}：滑块元素存在、挂在轨道内、且带 ref`, () => {
      const src = tsxOf(s.tsx)
      const thumbLiteral = `className="${s.thumb.slice(1)}"`
      const trackLiteral = `className="${s.track.slice(1)}"`

      const thumbAt = src.indexOf(thumbLiteral)
      const trackAt = src.indexOf(trackLiteral)
      expect(thumbAt, `${s.tsx} 未找到滑块锚点 ${thumbLiteral}`).toBeGreaterThanOrEqual(0)
      expect(trackAt, `${s.tsx} 未找到轨道锚点 ${trackLiteral}`).toBeGreaterThanOrEqual(0)
      // 滑块必须在轨道**之后**出现（是 track 的子节点）
      expect(trackAt, `${s.tsx} 的滑块出现在轨道之前（不在轨道内）`).toBeLessThan(thumbAt)

      const tagEnd = src.indexOf('>', thumbAt)
      const tag = src.slice(thumbAt, tagEnd === -1 ? thumbAt + 300 : tagEnd + 1)
      expect(tag, `${s.tsx} 的滑块未挂 ref`).toMatch(/ref=\{\w*\.?\w*[Tt]humbRef\}/)
      // 滑块不得带 role="tab"，否则会被量成 tab（槽距/宽度全错）
      expect(tag, `${s.tsx} 的滑块带了 role（会被当成 tab 量进去）`).not.toMatch(/role=/)
    })

    it(`${s.name}：轨道挂了 ref`, () => {
      const src = tsxOf(s.tsx)
      const at = src.indexOf(`className="${s.track.slice(1)}"`)
      const tagEnd = src.indexOf('>', at)
      const tag = src.slice(at, tagEnd === -1 ? at + 300 : tagEnd + 1)
      expect(tag, `${s.tsx} 的轨道未挂 ref（滑块定位没有坐标系）`).toMatch(/ref=\{\w*\.?\w*[Tt]rackRef\}/)
    })
  }
})

/* ================================================================== *
 * D) 栏不滚动
 * ================================================================== */

describe('D. 栏不滚动（横滑只切换，不浏览看不到的内容）', () => {
  for (const s of SURFACES) {
    it(`${s.name}：${s.bar} 有 overflow: hidden（越界阻尼要裁在栏内）`, () => {
      expect(baseRule(cssOf(s.css), s.bar)).toMatch(/overflow:\s*hidden/)
    })

    it(`${s.name}：tab 栏与轨道都不可横滚（只断言这两条规则，别处滚动容器不受影响）`, () => {
      const css = stripComments(cssOf(s.css))
      for (const sel of [s.bar, s.track]) {
        const body = baseRule(css, sel)
        expect(body, `${s.css} 缺 ${sel}`).not.toBe('')
        expect(body, `${s.css} 的 ${sel} 仍是横向滚动容器`).not.toMatch(/overflow-x:\s*(auto|scroll)/)
      }
      // 隐藏滚动条的写法只有一个用途：「可滚但看不见」——栏不滚就不该有它
      expect(baseRule(css, s.bar), `${s.css} 的 ${s.bar} 仍隐藏滚动条`).not.toMatch(/scrollbar/)
    })
  }
})
