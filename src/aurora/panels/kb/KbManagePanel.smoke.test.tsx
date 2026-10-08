import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// 真实数据桩：替换 stores/kbStore，使 jsdom 下可确定性验证。
// ⚠️ 必须同时提供 subscribeKbList —— 面板已从「挂载时取一次」改为**订阅**（E2E 报告 M-1）。
vi.mock('../../../stores/kbStore', () => {
  const listeners = new Set<(l: unknown[]) => void>()
  const getKbList = vi.fn(async () => [
    { id: 'kb-a', name: '真实库A', description: '', folderId: 'f', fileCount: 3, canvasCount: 1, createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'kb-b', name: '真实库B', description: '', folderId: 'f', fileCount: 5, canvasCount: 2, createdAt: Date.now(), updatedAt: Date.now() },
  ])
  return {
    getKbList,
    createKb: vi.fn(async (name: string) => ({
      id: 'kb-new', name, description: '', folderId: 'f',
      createdAt: Date.now(), updatedAt: Date.now(), canvasIds: [], fileIds: [], rules: [],
    })),
    subscribeKbList: vi.fn((listener: (l: unknown[]) => void) => {
      listeners.add(listener)
      // 与真实实现一致：订阅瞬间补推一次当前值
      void getKbList().then(listener).catch(() => listener([]))
      return () => {
        listeners.delete(listener)
      }
    }),
    /** 测试专用：模拟「订阅之后」列表才被写入（即 M-1 的播种晚于挂载场景） */
    __pushKbList: (list: unknown[]) => {
      for (const l of [...listeners]) l(list)
    },
  }
})

import { RealProviders } from '../../providers/RealProviders'
import { KbManagePanel } from './KbManagePanel'

function renderPanel() {
  return render(
    <RealProviders>
      <KbManagePanel />
    </RealProviders>,
  )
}

describe('KbManagePanel 接真实知识库列表（getKbList / createKb）', () => {
  it('挂载无崩溃、列表来自真实 getKbList、无 mock 残留', async () => {
    renderPanel()
    expect(await screen.findByText('真实库A')).toBeTruthy()
    expect(screen.getByText('真实库B')).toBeTruthy()
    // 计数来自真实列表长度（2）→ 状态栏「知识库 2」
    expect(screen.getByText('知识库 2')).toBeTruthy()
    // 旧 MOCK_KBS 残留不应出现
    expect(screen.queryByText('Aurora 设计系统')).toBeNull()
  })

  it('🚨 M-1 回归：挂载后列表才被写入（播种晚于挂载）也能自动刷新，不停留空态', async () => {
    const kbStore = (await import('@stores/kbStore')) as unknown as {
      getKbList: ReturnType<typeof vi.fn>
      __pushKbList: (list: unknown[]) => void
    }
    // 挂载时列表为空 —— 复现「直接深链 #view=kb，播种尚未完成」
    vi.mocked(kbStore.getKbList).mockResolvedValueOnce([])
    renderPanel()
    expect(await screen.findByText('还没有知识库')).toBeTruthy()

    // 播种随后完成 → store 广播新列表（真实实现里由 upsertListItem → notifyKbListChanged 触发）
    kbStore.__pushKbList([
      { id: 'kb-seeded', name: 'MarkCraft 使用文档', description: '', folderId: 'f', fileCount: 16, canvasCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
    ])

    // 面板应自动跟上，而不是永久停在空态（修复前正是停在这里）
    expect(await screen.findByText('MarkCraft 使用文档')).toBeTruthy()
    expect(screen.queryByText('还没有知识库')).toBeNull()
  })

  it('主创建动作进头部操作区：副标题/图标与「导入」按钮删除，头部保留主创建按钮，卡片末尾磁贴移除', async () => {
    const { container } = renderPanel()
    await screen.findByText('真实库A')
    // 副标题文字与图标（.aurora-kb-manage__icon）已删
    expect(screen.queryByText('管理你的第二大脑 · 点击卡片进入对应知识库')).toBeNull()
    expect(container.querySelector('.aurora-kb-manage__icon')).toBeNull()
    // 头部操作区保留主创建按钮（.aurora-kb-manage__actions 内的 primary）
    expect(container.querySelector('.aurora-kb-manage__actions .aurora-kb-btn--primary')).toBeTruthy()
    // 「导入」按钮不再出现在头部
    expect(screen.queryByText('导入')).toBeNull()
    // 卡片末尾「新建知识库」磁贴已移除（主操作不再漂移）
    expect(container.querySelector('.aurora-kb-kbcard--new')).toBeNull()
  })

  it('统一弹窗：点击磁贴弹出，默认新建表单，可切到导入选项', async () => {
    const { container } = renderPanel()
    await screen.findByText('真实库A')
    // 打开统一弹窗（默认新建知识库表单）— 经头部主创建按钮
    fireEvent.click(container.querySelector('.aurora-kb-manage__actions .aurora-kb-btn--primary')!)
    expect(await screen.findByPlaceholderText('例如：机器学习笔记')).toBeTruthy()
    // 切到「导入」：展示原导入界面三种来源
    fireEvent.click(screen.getByRole('tab', { name: /导入/ }))
    expect(screen.getByText('从外部导入')).toBeTruthy()
    expect(screen.getByText('Obsidian Vault')).toBeTruthy()
    expect(screen.getByText('Notion 导出')).toBeTruthy()
    expect(screen.getByText('网页剪藏')).toBeTruthy()
  })

  it('新建知识库走统一弹窗并调用真实 createKb', async () => {
    const { createKb } = await import('@stores/kbStore')
    const { container } = renderPanel()
    await screen.findByText('真实库A')
    // 打开统一弹窗 → 默认新建表单 → 填写并创建（经头部主创建按钮）
    fireEvent.click(container.querySelector('.aurora-kb-manage__actions .aurora-kb-btn--primary')!)
    const input = await screen.findByPlaceholderText('例如：机器学习笔记')
    fireEvent.change(input, { target: { value: '机器学习笔记' } })
    fireEvent.click(screen.getByText('创建知识库'))
    await waitFor(() => expect(createKb).toHaveBeenCalled())
    expect(vi.mocked(createKb).mock.calls[0][0]).toBe('机器学习笔记')
  })

  it('空态引导：右上角主创建按钮隐藏，空态居中引导 + 其下按钮可见且可打开弹窗', async () => {
    const { getKbList } = await import('@stores/kbStore')
    // 让本次挂载读取到的列表为空
    vi.mocked(getKbList).mockResolvedValueOnce([])
    const { container } = renderPanel()
    // 空态引导文案出现
    expect(await screen.findByText('还没有知识库')).toBeTruthy()
    expect(screen.getByText('点击下方按钮，创建你的第一个知识库')).toBeTruthy()
    // 右上角主创建按钮在空态下不应渲染
    expect(container.querySelector('.aurora-kb-manage__actions .aurora-kb-btn--primary')).toBeNull()
    // 空态自身引导按钮存在（位于空态容器内）
    const emptyBtn = container.querySelector('.aurora-kb-manage__empty .aurora-kb-manage__empty-btn')
    expect(emptyBtn).toBeTruthy()
    // 点击空态按钮 → 打开统一弹窗（默认新建表单）
    fireEvent.click(emptyBtn!)
    expect(await screen.findByPlaceholderText('例如：机器学习笔记')).toBeTruthy()
  })
})
