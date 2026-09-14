/**
 * 笔记 Tab 头部视觉契约（2026-09-14 优化）
 * ------------------------------------------------------------
 * 事故背景（用户截图报障）：知识库详情页「笔记 Tab」三个别扭——
 *  1.「库内笔记（N）」把标题与计数糊成一行灰字，无 section header 层级；
 *  2.「新建笔记」按钮贴顶（head top padding 仅 4px），与上方 Tab 栏粘连；
 *  3. 单条文件孤立悬浮在面板顶部，列表不贴边、不呼吸，看着像「一行字」而非「一组笔记」。
 *
 * 修复要点（同时锁死防回退）：
 *  - title 与 count 必须**两个独立元素**，count 必须带 aria-label（可访问性 + 测试可达）；
 *  - count 必须是 tabular-nums 单色徽章（**禁用 pill**，与桌面端非胶囊风格一致）；
 *  - head 顶部 padding 必须 ≥ 10px（按钮不贴顶）；
 *  - notes 容器必须有左右内边距（≥ 4px），避免文件行贴面板边缘；
 *  - 文件行 padding 必须 ≥ 6px（单条不悬空）；
 *  - title 字号必须 ≥ font-sm（与 section header 一致；旧 font-sm+tertiary=糊成一行）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const panel = readFileSync(resolve(__dirname, 'KbPanel.tsx'), 'utf-8')
const css = readFileSync(resolve(__dirname, '../../styles/panels/kb.css'), 'utf-8')

const rule = (selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

describe('笔记 Tab 头部视觉契约（title 与 count 拆开 / 不再贴顶）', () => {
  it('title 与 count 渲染为两个独立元素（不再糊成「库内笔记（N）」一行）', () => {
    expect(panel).toContain('aurora-kb-notes__head-title')
    expect(panel).toContain('aurora-kb-notes__head-count')
    // 旧形态「库内笔记（{files.length}）」必须不再出现
    expect(panel).not.toMatch(/库内笔记（\{files\.length\}）/u)
  })

  it('count 元素带 aria-label 可读数（不只是装饰数字）', () => {
    expect(panel).toMatch(/aurora-kb-notes__head-count[^>]*aria-label/)
  })

  it('count 是单色徽章 + tabular-nums（数字对齐），不得是 pill', () => {
    const block = rule('.aurora-kb-notes__head-count')
    expect(block).not.toBe('')
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/)
    // 用 --mc-radius-sm 而非 --mc-radius-pill，去胶囊化
    expect(block).toMatch(/border-radius:\s*var\(--mc-radius-sm\)/)
    expect(block).not.toMatch(/--mc-radius-pill/)
    expect(block).toMatch(/background:\s*var\(--mc-bg-elevated\)/)
    expect(block).toMatch(/border:\s*1px solid var\(--mc-border-subtle\)/)
  })

  it('title 是 section header 视觉：font-base + weight 600 + text-primary（旧 font-sm + tertiary 太小）', () => {
    const block = rule('.aurora-kb-notes__head-title')
    expect(block).toMatch(/font-size:\s*var\(--mc-font-base\)/)
    expect(block).toMatch(/font-weight:\s*600/)
    expect(block).toMatch(/color:\s*var\(--mc-text-primary\)/)
  })

  it('head 顶部 padding ≥ 10px（按钮不再贴 Tab 栏）', () => {
    const block = rule('.aurora-kb-notes__head')
    expect(block).not.toBe('')
    const m = block.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px/)
    expect(m, 'head 必须是三值 padding: top right bottom').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(10)
  })

  it('notes 容器左右内边距 ≥ 4px（列表不贴面板边，单条文件不再悬空）', () => {
    const block = rule('.aurora-kb-notes')
    expect(block).not.toBe('')
    // padding 形如 `padding: 2px 6px 8px;` 或 `padding: 0 6px 8px 6px;` 至少保证右值 ≥ 4
    const m3 = block.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px\s*;/)
    const m4 = block.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px\s+(\d+)px\s*;/)
    if (m4) {
      expect(Number(m4[2])).toBeGreaterThanOrEqual(4)
      expect(Number(m4[4])).toBeGreaterThanOrEqual(4)
    } else {
      expect(m3, 'notes 必须是多值 padding').not.toBeNull()
      expect(Number(m3![2])).toBeGreaterThanOrEqual(4)
    }
  })

  it('notes 内文件行 padding ≥ 6px（单条不再压扁）', () => {
    const block = rule('.aurora-kb-notes .aurora-kb-recent__item')
    expect(block).not.toBe('')
    const m = block.match(/padding:\s*(\d+)px\s+(\d+)px/)
    expect(m, '文件行必须是两值 padding').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(6)
    expect(Number(m![2])).toBeGreaterThanOrEqual(6)
  })

  it('新建笔记按钮 vertical padding ≥ 4px（按钮不被压扁）', () => {
    const block = rule('.aurora-kb-btn--sm')
    expect(block).not.toBe('')
    const m = block.match(/padding:\s*(\d+)px\s+(\d+)px/)
    expect(m, '按钮必须是两值 padding').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(4)
  })
})