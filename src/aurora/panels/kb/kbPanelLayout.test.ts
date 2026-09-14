/**
 * 知识库详情页「布局回收」契约测试
 * ------------------------------------------------------------
 * 事故背景（2026-09-13 用户截图报障）：kb-ui.css 的 .kb-shell 带着「整窗知识库外壳」的旧假设
 * （position:fixed; inset:0; z-index:200），而 Aurora 只把它当作 PageFrame 内容区里的一段。
 * KbPanel 先 import kb.css、后 import kb-ui.css，两个单类选择器同权重时后者必然胜出 →
 * 面板铺满视口、落在 .aurora-sidebar(z-index:50)/TitleBar 之下 →
 * 表现为子栏整条消失、左列卡片文字沿侧栏处被裁切。
 *
 * 修复：kb.css 用复合选择器（0/2/0）.aurora-kb.kb-shell 把它收回文档流，
 * 并用 contain:paint 建立包含块 —— 面板内的满屏坐标覆盖层（依赖抽屉 400px 右贴、
 * 跨库搜索 inset:0）因此以「面板」而非「视口」为参照。
 * contain 而非依赖 kbShellIn 动画的 transform 副作用，是因为 reduced-motion 下
 * kb-ui.css 会 `animation: none !important`，届时只有 contain 能兜住包含块。
 *
 * 本测试锁死这两条，防止「顺手删掉看起来多余的覆盖规则」造成二次回归。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const kbCss = readFileSync(resolve(__dirname, '../../styles/panels/kb.css'), 'utf-8')
const panelTsx = readFileSync(resolve(__dirname, 'KbPanel.tsx'), 'utf-8')

/** 汇总 .aurora-kb.kb-shell 的全部规则体（令牌重映射一条 + 布局回收一条） */
const compoundBlock = [...kbCss.matchAll(/\.aurora-kb\.kb-shell\s*\{([\s\S]*?)\}/g)].map((m) => m[1]).join('\n')

describe('知识库详情页布局回收（Aurora 内嵌 ≠ 整窗外壳）', () => {
  it('面板根节点仍同时挂 aurora-kb 与 kb-shell（复合选择器与主题令牌重映射的前提）', () => {
    expect(panelTsx).toContain('className="aurora-kb kb-shell"')
  })

  it('kb.css 用复合选择器覆盖 .kb-shell 的满屏定位（权重 0/2/0 才能赢过 kb-ui.css）', () => {
    expect(compoundBlock).not.toBe('')
    expect(compoundBlock).toMatch(/position:\s*relative/)
    expect(compoundBlock).toMatch(/inset:\s*auto/)
    expect(compoundBlock).toMatch(/z-index:\s*auto/)
  })

  it('面板建立包含块（contain:paint），使满屏 fixed 覆盖层以面板为参照（reduced-motion 下同样成立）', () => {
    expect(compoundBlock).toMatch(/contain:\s*paint/)
  })

  it('令牌重映射仍在同一条规则里（颜色随 Aurora 桌面主题，不能被布局修复挤掉）', () => {
    for (const token of ['--kb-text', '--kb-bg', '--kb-border', '--kb-accent', '--kb-radius-md']) {
      expect(compoundBlock).toContain(token)
    }
  })
})
