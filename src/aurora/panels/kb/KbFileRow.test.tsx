import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * 回归锁 · 「知识库文件行可点」契约（2026-09-21 报障）
 * =====================================================
 * 症状：点知识库里的笔记没有跳转编辑器，而是停在知识库详情页。
 * 根因：`KbFileRow` 抽取前三处同款行标记各自手写 —— 「笔记」Tab 接了 onClick，
 *      而进库默认落地的「概览 · 最近活动」那份是纯 div（无 onClick / role / tabIndex），
 *      且因为父容器不是 `.aurora-kb-notes`，连 cursor:pointer 都没有 ⇒ 点了毫无反应。
 * 本文件锁两件事：
 *   A. 行组件本身：有 onSelect ⇒ 可交互（role/tabIndex/键盘/类名）；无 ⇒ 不伪造暗示；
 *   B. KbPanel 接线：概览「最近活动」与「笔记」Tab **两条**列表都必须真的跳到编辑器
 *      （B 是防止「组件对但没人传 onSelect」这类静默回归 —— 只测 A 会漏掉）。
 *
 * 打桩说明（仅本文件）：
 *   · `@stores/kbStore` 换成确定性桩（与 KbPanel.smoke.test.tsx 同源手法）；
 *   · `getKbFiles` 返回 3 个假 id，再由 `findNode` 把它们解析成假 FileNode。
 *     `findNode` 用 importActual 打补丁 —— **只对假 id 生效，其余一律回落真实实现**，
 *     这样 RealProviders 里真实文件树的渲染不受影响。
 */

const T = 1700000000000
const FAKE_IDS = ['kb-fake-1', 'kb-fake-2', 'kb-fake-3']
const FAKE_NODES: Record<string, { id: string; name: string; type: 'file'; content: string; createdAt: number; updatedAt: number }> = {
  'kb-fake-1': { id: 'kb-fake-1', name: '笔记甲.md', type: 'file', content: '# 甲', createdAt: T, updatedAt: T + 30 },
  'kb-fake-2': { id: 'kb-fake-2', name: '笔记乙.md', type: 'file', content: '# 乙', createdAt: T, updatedAt: T + 20 },
  'kb-fake-3': { id: 'kb-fake-3', name: '笔记丙.md', type: 'file', content: '# 丙', createdAt: T, updatedAt: T + 10 },
}

vi.mock('../../../stores/kbStore', () => ({
  getKbList: vi.fn(async () => [
    {
      id: 'kb-test', name: '测试知识库 X', description: 'd', folderId: 'f1',
      fileCount: 3, canvasCount: 0, createdAt: T, updatedAt: T,
    },
  ]),
  loadKb: vi.fn(async (id: string) => ({
    id, name: '测试知识库 X', description: 'd', folderId: 'f1',
    createdAt: T, updatedAt: T, canvasIds: [], fileIds: [], rules: [],
  })),
  getKbFiles: vi.fn(() => FAKE_IDS),
  createKb: vi.fn(async () => {}),
  renameKb: vi.fn(async () => {}),
  updateDescription: vi.fn(async () => {}),
  deleteKb: vi.fn(async () => {}),
}))

vi.mock('@core/files/fileTree', async (importActual) => {
  const actual = await importActual<typeof import('@core/files/fileTree')>()
  return {
    ...actual,
    findNode: (root: Parameters<typeof actual.findNode>[0], id: string) =>
      (FAKE_NODES[id] as never) ?? actual.findNode(root, id),
  }
})

import { RealProviders } from '../../providers/RealProviders'
import { KbPanel } from './KbPanel'
import { KbFileRow } from './KbFileRow'
import type { FileNode } from '@src/types/fileManager'

const file = (id: string, name: string): FileNode =>
  ({ id, name, type: 'file', content: '', createdAt: T, updatedAt: T })

describe('KbFileRow：可交互性由 onSelect 决定', () => {
  it('给了 onSelect ⇒ role=button + tabIndex=0 + .is-interactive，点击回传 id', () => {
    const onSelect = vi.fn()
    render(<KbFileRow file={file('a', 'A.md')} onSelect={onSelect} />)
    const row = screen.getByRole('button')
    expect(row.classList.contains('is-interactive')).toBe(true)
    expect(row.getAttribute('tabindex')).toBe('0')
    fireEvent.click(row)
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('键盘 Enter 与 Space 都能触发（桌面行内按钮惯例）', () => {
    const onSelect = vi.fn()
    render(<KbFileRow file={file('a', 'A.md')} onSelect={onSelect} />)
    const row = screen.getByRole('button')
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('没给 onSelect ⇒ 纯展示行：不挂 role / tabIndex / .is-interactive（不伪造可点暗示）', () => {
    const { container } = render(<KbFileRow file={file('a', 'A.md')} />)
    const row = container.querySelector('.aurora-kb-recent__item') as HTMLElement
    expect(row.classList.contains('is-interactive')).toBe(false)
    expect(row.hasAttribute('role')).toBe(false)
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(screen.queryByRole('button')).toBeNull()
    // 文件名仍然渲染（纯展示行不是空行）
    expect(row.textContent).toContain('A.md')
  })
})

describe('KbPanel：两条文件列表都必须真跳编辑器（防「组件对但没传 onSelect」）', () => {
  function renderPanel(nav: (id: string, param?: string) => void) {
    return render(
      <RealProviders>
        <KbPanel nav={nav} />
      </RealProviders>,
    )
  }

  const recentCard = () => {
    const el = document.querySelector('.aurora-kb-card--recent')
    if (!el) throw new Error('概览「最近活动」卡片未渲染（说明默认 Tab 不是概览，或数据桩失效）')
    return el as HTMLElement
  }

  it('概览 · 最近活动：行可点（role=button）且点击 → nav("editor")', async () => {
    const nav = vi.fn()
    renderPanel(nav)
    await screen.findAllByText('测试知识库 X')

    const rows = recentCard().querySelectorAll('.aurora-kb-recent__item')
    expect(rows.length, '最近活动应列出 3 篇桩笔记（打桩面非空 → 断言才有意义）').toBe(3)
    const first = rows[0] as HTMLElement
    expect(first.classList.contains('is-interactive'), '概览行必须是可交互行（本次报障点）').toBe(true)
    expect(first.getAttribute('role')).toBe('button')
    expect(first.textContent).toContain('笔记甲.md') // updatedAt 最大 → 排首位

    fireEvent.click(first)
    expect(nav).toHaveBeenCalledWith('editor')
  })

  it('笔记 Tab：行可点且点击 → nav("editor")（原本可用的路径不得回退）', async () => {
    const nav = vi.fn()
    renderPanel(nav)
    await screen.findAllByText('测试知识库 X')

    fireEvent.click(screen.getByTitle('笔记'))
    const notes = document.querySelector('.aurora-kb-notes') as HTMLElement
    const rows = notes.querySelectorAll('.aurora-kb-recent__item')
    expect(rows.length).toBe(3)
    expect((rows[0] as HTMLElement).classList.contains('is-interactive')).toBe(true)

    fireEvent.click(rows[0])
    expect(nav).toHaveBeenCalledWith('editor')
  })
})
