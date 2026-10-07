/**
 * 阶段8 密度联动回归测试
 * 验证知识库模块已消费全局密度广播（<html data-density="comfortable">），
 * 在 .kb-shell 范围内放大栏高、内边距与间距，与侧边栏/白板/编辑器节奏一致。
 *
 * 全局密度广播由 Sidebar 写入 document.documentElement（见 Sidebar.tsx），
 * 知识库通过 kb-ui.css 中的 CSS 选择器联动（与白板 CANVAS_DENSITY_OVERRIDE 同构）。
 *
 * ⚠️ 2026-09-17 批 2.5-C 断言升级（死 CSS 清剿连带）：
 *   旧版断言把 6 个**旧版「整窗知识库外壳」类名**（.kb-topbar / .kb-nav /
 *   .kb-nav-item / .kb-content / .kb-manage / .kb-row）当成"密度载体"来验。
 *   但 Aurora 已用 aurora-kb-* 重建外壳，这 6 个类在全仓非测试代码中
 *   **零承载者**（`code:0`）。旧断言非但没保住密度联动，反而给 6 个死类名
 *   制造了「被测试覆盖」的假象，让它们躲过清剿 —— 故本轮改指**真实载体**，
 *   并在第三例反向钉死这些类名不得回流。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'kb-ui.css'), 'utf-8')

/**
 * 类名边界匹配。
 * ⚠️ 尾部**必须**同时拒绝 `-` 与 `_`：`.kb-content` 是**活类** `.kb-content-inner`
 *    的真前缀 —— 若照抄其它守卫的 `\.name(?![a-zA-Z0-9])`（允许 `-` 以便网住 BEM
 *    后代），`.kb-content` 会命中 `.kb-content-inner`，负向断言永远为真（假绿），
 *    什么也钉不住。此为「超串陷阱」第三形态：死类是活类的**真前缀**。
 */
const hasClass = (name: string) => new RegExp(`\\.${name}(?![a-zA-Z0-9_-])`).test(css)

/** 2.5-C 后仍真实承担密度联动的 6 条载体（全为 TSX 真实在用的类） */
const LIVE_DENSITY_CARRIERS = [
  '.kb-btn', '.kb-icon-btn', '.kb-searchpanel-top',
  '.kb-searchpanel-filter', '.kb-searchpanel-list', '.kb-result-head',
]

describe('知识库密度联动', () => {
  it('kb-ui.css 消费全局密度广播，在舒适模式放大 .kb-shell 间距', () => {
    expect(css).toContain('html[data-density="comfortable"] .kb-shell')
    // 每一条真实载体都必须有自己的舒适模式覆盖（写在 .kb-shell 作用域内）
    for (const sel of LIVE_DENSITY_CARRIERS) {
      expect(css).toContain(`html[data-density="comfortable"] .kb-shell ${sel}`)
    }
  })

  it('舒适模式放大值为合理间距（非紧凑默认值）', () => {
    // 搜索面板顶栏：紧凑 padding 12px 0 → 舒适 padding-bottom 18px / margin-bottom 18px
    expect(css).toContain('padding: 12px 0;')
    expect(css).toContain(
      'html[data-density="comfortable"] .kb-shell .kb-searchpanel-top { padding-bottom: 18px; margin-bottom: 18px; }',
    )
    // 侧栏筛选卡片：紧凑 padding 16px / margin-right 16px → 舒适 18px / 18px
    expect(css).toContain('padding: 16px; margin-right: 16px;')
    expect(css).toContain(
      'html[data-density="comfortable"] .kb-shell .kb-searchpanel-filter { padding: 18px; margin-right: 18px; }',
    )
  })

  it('旧整窗外壳类不得回流（断言不得再拿死类名充数）', () => {
    for (const retired of [
      'kb-topbar', 'kb-nav', 'kb-nav-item', 'kb-manage',
      'kb-content', 'kb-row', 'kb-stat', 'kb-note', 'kb-kbcard', 'kb-tpl-card',
    ]) {
      expect(hasClass(retired)).toBe(false)
    }
    // 锚点自检（负向验证的内建版）：活类 .kb-content-inner 必须仍被本判定视为「在」
    // —— 若有人把锚点尾部简化成 `(?![a-zA-Z0-9])`，这里会变红。
    expect(hasClass('kb-content-inner')).toBe(true)
  })
})
