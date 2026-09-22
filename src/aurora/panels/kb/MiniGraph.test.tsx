import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MiniGraph } from './MiniGraph'

/**
 * 回归锁 · 「概览 · 专属图谱」节点可点契约（2026-09-22 报障）
 * =====================================================
 * 症状：「只有第一篇 00 开始使用.md 点击后会回到知识库详细界面」
 *       （＝点它没有任何跳转，用户仍停在知识库详情页）。
 * 根因：全应用穷举（`.workbuddy/artifacts/cdp-sweep-kb-alltabs-firstdoc.mjs`，扫 7 个 Tab +
 *      编辑器 + 图谱）后，渲染「00 开始使用」的元素只有 6 处，5 处都是已接线的可点行，
 *      **只有专属图谱这一处**：节点圆点写着 `cursor: pointer` 却整张图无任何点击处理，
 *      且全图只给一个节点渲染名字（`currentId` = `miniNodes[0]`）—— 引用最多的首篇正是
 *      「00 开始使用」⇒ 用户唯一看得见、又"看着能点"的名字，点了毫无反应 ⇒ 「只有第一篇」。
 * 本文件锁三件事：
 *   A. 组件契约：有 onSelect ⇒ 可交互（role / tabIndex / .is-interactive / 键盘 / 回传 id）；
 *      无 onSelect ⇒ **不伪造可点暗示**（对照组，证明断言翻转得动）；
 *   B. 名字可发现：每个节点都有 `<title>`（此前只有 currentId 一个节点可读）；
 *   C. 接线与样式守卫：KbPanel 必须真的把 onSelect 传进来；kb.css 的 cursor 不得再挂死
 *      在节点本身上（防「又是恒定手型 + 没有 handler」这套假暗示回归）。
 *   ⚠️ 本图的**真实点击 → 进编辑器**由 CDP 探针端到端验证
 *      （`.workbuddy/artifacts/cdp-verify-kb-minigraph-click.mjs`）——
 *      jsdom 里 KB 桩数据不会产出 miniNodes（需真实 LinkIndex），硬凑会变成假路径。
 */

const NODES = [
  { id: 'f1', label: '01 界面布局' },
  { id: 'f2', label: '00 开始使用' },
  { id: 'f3', label: '02 编辑器模式' },
]
const EDGES: [string, string][] = [['f2', 'f1'], ['f2', 'f3']]

const groups = (container: HTMLElement) =>
  [...container.querySelectorAll('.aurora-kb-minigraph__g')] as SVGGElement[]

describe('MiniGraph：可交互性由 onSelect 决定', () => {
  it('给了 onSelect ⇒ role=button + tabIndex=0 + .is-interactive，点击回传该节点 id', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <MiniGraph nodes={NODES} edges={EDGES} currentId="f2" onSelect={onSelect} />,
    )
    const gs = groups(container)
    expect(gs.length, '打桩面非空：三个节点都渲染了').toBe(3)
    for (const g of gs) {
      expect(g.classList.contains('is-interactive')).toBe(true)
      expect(g.getAttribute('role')).toBe('button')
      expect(g.getAttribute('tabindex')).toBe('0')
    }
    fireEvent.click(gs[0])
    expect(onSelect).toHaveBeenCalledWith('f1')
    fireEvent.click(gs[1])
    expect(onSelect).toHaveBeenLastCalledWith('f2') // 高亮节点同样可点
  })

  it('键盘 Enter 与 Space 都能触发（桌面行内按钮惯例）', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <MiniGraph nodes={NODES} edges={EDGES} currentId="f2" onSelect={onSelect} />,
    )
    const g = groups(container)[1]
    fireEvent.keyDown(g, { key: 'Enter' })
    fireEvent.keyDown(g, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith('f2')
  })

  it('没给 onSelect ⇒ 纯展示图：不挂 role / tabIndex / .is-interactive（不伪造可点暗示）', () => {
    const { container } = render(<MiniGraph nodes={NODES} edges={EDGES} currentId="f2" />)
    const gs = groups(container)
    expect(gs.length).toBe(3)
    for (const g of gs) {
      expect(g.classList.contains('is-interactive')).toBe(false)
      expect(g.hasAttribute('role')).toBe(false)
      expect(g.hasAttribute('tabindex')).toBe(false)
    }
    expect(screen.queryAllByRole('button'), '纯展示图不得出现按钮角色').toHaveLength(0)
  })

  it('名字可发现：每个节点都有 <title>；当前节点额外渲染可见名字', () => {
    const { container } = render(
      <MiniGraph nodes={NODES} edges={EDGES} currentId="f2" onSelect={() => {}} />,
    )
    const titles = [...container.querySelectorAll('title')].map((t) => t.textContent)
    expect(titles).toEqual(['01 界面布局', '00 开始使用', '02 编辑器模式'])
    const labels = [...container.querySelectorAll('.aurora-kb-minigraph__label')].map((t) => t.textContent)
    expect(labels, '可见名字仍只给 currentId 一个（视觉不变）').toEqual(['00 开始使用'])
  })
})

describe('守卫：接线与样式（防「组件对但没人传 handler」/「恒定手型」回归）', () => {
  it('KbPanel.tsx 里 <MiniGraph ...> 必须带 onSelect={...}', () => {
    // ⚠️ 不用 `new URL(..., import.meta.url)` —— Vitest 下 import.meta.url 不是 file scheme
    //    （实测报 "The URL must be of scheme file"）；按本仓既有守卫（aliasSync.test.ts）用 __dirname。
    const src = readFileSync(resolve(__dirname, 'KbPanel.tsx'), 'utf8')
    const usage = src.match(/<MiniGraph[\s\S]*?\/>/)
    expect(usage, 'KbPanel 中应存在 <MiniGraph .../> 用法').not.toBeNull()
    expect(usage![0], 'MiniGraph 必须收到 onSelect —— 否则又是「看着可点、点了没反应」').toMatch(/onSelect=\{/)
  })

  it('kb.css 的 cursor 由 .is-interactive 决定，不再恒定挂在节点本身上', () => {
    const raw = readFileSync(resolve(__dirname, '../../styles/panels/kb.css'), 'utf8')
    // 剥注释后再断言：注释里含同款字面量会造成假阳性/假阴性
    const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css, '.aurora-kb-minigraph__node 不得再恒定 cursor:pointer').not.toMatch(
      /\.aurora-kb-minigraph__node\s*\{[^}]*cursor:\s*pointer/,
    )
    expect(css, '可交互节点的 cursor 必须由 .is-interactive 提供').toMatch(
      /\.aurora-kb-minigraph__g\.is-interactive\s*\{[^}]*cursor:\s*pointer/,
    )
  })
})
