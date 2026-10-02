/**
 * 检查器浮层「宽度回收」契约测试
 * ------------------------------------------------------------
 * 事故背景（2026-09-13 用户截图报障）：编辑界面右栏检查器「辅助」Tab 里，
 * 靠右对齐的文字（「仅此一篇」「未归集」）与展开箭头被切掉一截。
 *
 * 根因：浮层壳 .aurora-editor__overlay 固定 width:264px，而面板 .aurora-rightbar
 * 自带宽度（CSS 默认 280px，运行时由 RightSidebar 的行内 width 覆盖，可拖拽 220–400），
 * 外层 .aurora-editor__overlay-body 又是 overflow:hidden —— 壳层比面板窄多少，
 * 面板右侧就被整条裁掉多少：默认 280 时裁 17px（正好吃掉 12px 右内边距 + 提示文字尾巴），
 * 拖到 400 时裁到 137px。旧「辅助」Tab 的内容没有右对齐元素，所以这个缺口一直没暴露。
 *
 * 修复两条（本测试锁死，防「顺手删掉看起来多余的一行」造成二次回归）：
 *  1）右侧浮层改 width:fit-content，用复合选择器（0/2/0）压过基类的单类 264px；
 *     左侧文件树不自带宽度、仍按 264 设计宽铺满，故只收右侧。
 *  2）拖拽结束落盘的是「拖完的宽度」：mouseup 监听是拖拽开始时注册的闭包，
 *     直接读 state 会拿到旧值 → 改宽后刷新即回退。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

// 🧩 P5-4 拆分适配：editor.css 已拆为 editor/ 子模块（barrel 只剩 @import）——
//    契约断言的是「规则存在」而非「文件位置」，扫描面 = 7 个子模块按级联序拼接。
const EDITOR_CSS_PARTS = [
  'editorArea.css', 'inspector.css', 'publish.css',
  'states.css', 'lint.css', 'tabs.css', 'auroraOverride.css',
] as const
const css = EDITOR_CSS_PARTS
  .map((f) => readFileSync(resolve(__dirname, '../../styles/panels/editor', f), 'utf-8'))
  .join('\n')
const sidebar = readFileSync(resolve(__dirname, 'RightSidebar.tsx'), 'utf-8')
const body = readFileSync(resolve(__dirname, 'EditorPanel.tsx'), 'utf-8')

const rule = (selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

describe('检查器浮层宽度（壳层必须 ≥ 面板，右侧不得裁切）', () => {
  it('浮层内容区仍是 overflow:hidden（面板一旦超出就是硬裁切，不会出现横向滚动条提示）', () => {
    expect(rule('.aurora-editor__overlay-body')).toMatch(/overflow:\s*hidden/)
  })

  it('基类保留固定 264px：左侧文件树不自带宽度，按此设计宽铺满', () => {
    expect(rule('.aurora-editor__overlay')).toMatch(/width:\s*264px/)
  })

  it('右侧浮层的宽度改为随内容（fit-content），且用复合选择器压过基类的单类 264px', () => {
    const block = rule('.aurora-editor__overlay.aurora-editor__overlay--right')
    expect(block).not.toBe('')
    expect(block).toMatch(/width:\s*fit-content/)
  })

  it('面板自带宽度（CSS 默认 280px + 运行时行内 width），与壳层固定 264 不是同一口径', () => {
    expect(rule('.aurora-rightbar')).toMatch(/width:\s*280px/)
    expect(sidebar).toMatch(/const MIN_W = 220/)
    expect(sidebar).toMatch(/const MAX_W = 400/)
    expect(sidebar).toMatch(/const DEFAULT_W = 280/)
  })

  it('右栏由 EditorPanel 渲染进右侧浮层（改壳层宽度才能真正生效）', () => {
    expect(body).toContain('aurora-editor__overlay aurora-editor__overlay--right')
  })

  it('拖拽结束落盘最新宽度：onUp 读 ref，不得读拖拽开始时的闭包 state', () => {
    const up = sidebar.match(/const onUp = \(\) => \{[\s\S]*?\n {4}\}/)?.[0] ?? ''
    expect(up).not.toBe('')
    expect(up).toContain('widthRef.current')
    expect(up).not.toMatch(/String\(width\)/)
  })
})
