/**
 * 知识库详情页顶部间距契约（2026-09-15）
 * ------------------------------------------------------------
 * 事故背景（用户截图报障）：知识库详细界面「左上角的文字太贴近上方」。
 * CDP 真机几何取证（Edge@9446，1245×626 @DPR2）定位到两处：
 *  1. **依赖 Tab 引导标题贴顶** —— 「依赖分析 · 选择文件查看出链 / 入链 / 删除影响」
 *     复用 `.aurora-kb-notes` 容器，而该容器顶内边距只有 2px。2px 是**为笔记 Tab
 *     设计的**（笔记 Tab 自带 `.aurora-kb-notes__head`，其 padding-top 12px 叠加后
 *     才是完整节奏）；依赖 Tab 没有 head，标题实际只距 subbar 下沿 4px。
 *  2. **subbar 左侧标题组呼吸不足** —— 46px 栏内知识库名距栏顶仅 13px、
 *     返回按钮（28px）上下各 9px，视觉上顶住上方 TitleBar。
 *
 * 修复要点：
 *  - 依赖标题改用独立 `.aurora-kb-notes__lead`，自带 12px 顶内边距
 *    （容器 2px + 自身 12px = 14px，与笔记 Tab 头部同节奏），并消除内联样式；
 *  - `.aurora-kb-subbar` 高度 ≥ 52px（46 → 52），知识库名距栏顶 13 → 16px；
 *  - subbar 左右内边距与组内间距升到 14px / 10px，与 4px 栅格倍数一致。
 *
 * 实测（修复后）：依赖 Tab 首行文字距 subbar 下沿 16px，与问答 16 / MOC 18 /
 * 笔记 20 同属一个节奏；subbar 高 52px，知识库名距栏顶 16px。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const panel = readFileSync(resolve(__dirname, 'KbPanel.tsx'), 'utf-8')
// 铁律：CSS「存在/不存在某声明」断言必须先剥离注释，
// 否则注释里的说明文字会自命中（本文件顶部就写了 12px / 46px 等字样）。
const cssRaw = readFileSync(resolve(__dirname, '../../styles/panels/kb.css'), 'utf-8')
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '')

const rule = (selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

describe('知识库详情页顶部间距契约（左上角文字不贴顶）', () => {
  it('依赖 Tab 引导标题使用独立 __lead 类（不再复用 card__title）', () => {
    expect(panel).toContain('aurora-kb-notes__lead')
    // 引导标题的文本必须挂在 __lead 上
    expect(panel).toMatch(/aurora-kb-notes__lead[^>]*>\s*[\s\S]{0,40}?依赖分析/u)
  })

  it('依赖标题不得再靠内联 marginBottom 撑间距（间距归 CSS 单源）', () => {
    // 旧形态：<div className="aurora-kb-card__title" style={{ marginBottom: 12 }}>
    expect(panel).not.toMatch(/aurora-kb-card__title"\s+style=\{\{\s*marginBottom/u)
  })

  it('__lead 自带顶部内边距 ≥ 12px（容器 2px + 自身 12px = 与笔记 Tab 头部同节奏）', () => {
    const block = rule('.aurora-kb-notes__lead')
    expect(block).not.toBe('')
    // 注意：三值 padding 的 bottom 常写作无单位 0，正则须允许 `0` 与 `0px` 两种写法
    const m = block.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)(?:px)?\s*;/)
    expect(m, '__lead 必须是三值 padding: top right bottom').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(12)
  })

  it('__lead 沿用 section header 视觉（font-base + weight 600 + text-primary）', () => {
    const block = rule('.aurora-kb-notes__lead')
    expect(block).toMatch(/font-size:\s*var\(--mc-font-base\)/)
    expect(block).toMatch(/font-weight:\s*600/)
    expect(block).toMatch(/color:\s*var\(--mc-text-primary\)/)
  })

  it('subbar 高度 ≥ 52px（知识库名不再顶住上方 TitleBar）', () => {
    const block = rule('.aurora-kb-subbar')
    expect(block).not.toBe('')
    const m = block.match(/height:\s*(\d+)px/)
    expect(m, 'subbar 必须是固定 px 高度').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(52)
  })

  it('subbar 左右内边距 ≥ 14px（与 4px 栅格倍数一致）', () => {
    const block = rule('.aurora-kb-subbar')
    const m = block.match(/padding:\s*0\s+(\d+)px/)
    expect(m, 'subbar 必须是 `padding: 0 Npx`').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(14)
  })

  it('subbar 左侧组与「库名 + 徽章」组内间距 ≥ 10px', () => {
    const left = rule('.aurora-kb-subbar__left')
    const title = rule('.aurora-kb-subbar__title')
    expect(left).not.toBe('')
    expect(title).not.toBe('')
    expect(Number(left.match(/gap:\s*(\d+)px/)![1])).toBeGreaterThanOrEqual(10)
    expect(Number(title.match(/gap:\s*(\d+)px/)![1])).toBeGreaterThanOrEqual(10)
  })

  it('笔记 Tab 头部契约不被本轮回退（head 顶部 padding 仍 ≥ 10px）', () => {
    const block = rule('.aurora-kb-notes__head')
    const m = block.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(10)
  })
})
