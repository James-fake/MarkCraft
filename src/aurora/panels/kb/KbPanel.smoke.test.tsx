import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { clearKbTab } from './kbSession'

// 可变桩：canvasIds 随 add/remove 真实增删，用于验证「关联后界面立即更新」（非静态假桩）
const mocks = vi.hoisted(() => ({ canvasIds: ['c1', 'c2'] as string[] }))

// 真实数据桩：替换 stores/kbStore，使 jsdom 下可确定性验证
vi.mock('../../../stores/kbStore', () => ({
  getKbList: vi.fn(async () => [
    {
      id: 'kb-test', name: '测试知识库 X', description: 'd', folderId: 'f1',
      fileCount: 0, canvasCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    },
  ]),
  loadKb: vi.fn(async (id: string) => ({
    id, name: '测试知识库 X', description: 'd', folderId: 'f1',
    createdAt: Date.now(), updatedAt: Date.now(),
    canvasIds: [...mocks.canvasIds], fileIds: [], rules: [],
    aiSummary: '本库 AI 摘要（真实字段）。',
  })),
  getKbFiles: vi.fn(() => []),
  createKb: vi.fn(async () => ({
    id: 'kb-new', name: '新建', description: '', folderId: 'f',
    createdAt: Date.now(), updatedAt: Date.now(), canvasIds: [], fileIds: [], rules: [],
  })),
  renameKb: vi.fn(async () => {}),
  updateDescription: vi.fn(async () => {}),
  deleteKb: vi.fn(async () => {}),
  addCanvasToKb: vi.fn(async (_kbId: string, canvasId: string) => {
    if (!mocks.canvasIds.includes(canvasId)) mocks.canvasIds.push(canvasId)
  }),
  removeCanvasFromKb: vi.fn(async (_kbId: string, canvasId: string) => {
    const i = mocks.canvasIds.indexOf(canvasId)
    if (i >= 0) mocks.canvasIds.splice(i, 1)
  }),
}))

// 白板列表桩：c1 已关联（loadKb mock canvasIds 含 c1/c2）应被「关联已有」选择器过滤掉
vi.mock('@features/canvas-v2', async () => {
  const actual = await vi.importActual<typeof import('@features/canvas-v2')>('@features/canvas-v2')
  return {
    ...actual,
    getCanvasList: vi.fn(async () => [
      { id: 'c3', name: '已有白板 C3', createdAt: 1, updatedAt: 3, cardCount: 5 },
      { id: 'c1', name: '已关联白板 C1', createdAt: 1, updatedAt: 2, cardCount: 1 },
    ]),
    createCanvas: vi.fn(async (name: string) => ({
      id: 'c-new', name, createdAt: 1, updatedAt: 1, cardCount: 0,
    })),
  }
})

import { RealProviders } from '../../providers/RealProviders'
import { KbPanel } from './KbPanel'
import { getKbList, addCanvasToKb } from '../../../stores/kbStore'
import { FileDependencyPanel } from '@features/knowledgeBase/components/FileDependencyPanel'

function renderPanel() {
  return render(
    <RealProviders>
      <KbPanel />
    </RealProviders>,
  )
}

// kbSession 是**模块级**单例（跨挂载存活，这正是回归锁要验的行为）——
// 用例之间必须显式清空，否则前一个用例留下的 Tab 会让后一个用例的初始态不确定。
beforeEach(() => {
  clearKbTab()
  // 每个用例把关联关系复位到 c1/c2（用例间不得串台）
  mocks.canvasIds.length = 0
  mocks.canvasIds.push('c1', 'c2')
})

/**
 * 顶栏动作按钮（编辑 / 发布博客 / 删除）作用域。
 * RealProviders 会一并渲染外壳（菜单栏里也有个同名的「编辑」顶级菜单），
 * 全局 getByText('编辑') 会命中多个 → 一律限定在子栏动作区内查找。
 */
function subbarActions() {
  const el = document.querySelector('.aurora-kb-subbar-actions')
  if (!el) throw new Error('知识库子栏动作区未渲染')
  return within(el as HTMLElement)
}

describe('KbPanel 接真实知识库数据（kbStore + LinkIndex + TagIndex）', () => {
  it('挂载无崩溃、库名来自真实文档、无 mock 残留', async () => {
    renderPanel()
    // 真实库名出现在子栏 / 面包屑（多处，故用 findAll）
    expect((await screen.findAllByText('测试知识库 X')).length).toBeGreaterThan(0)
    // 旧写死 mock 残留不应出现（MOCK_KBS 的 Aurora 设计系统 / 86 等）
    expect(screen.queryByText('Aurora 设计系统')).toBeNull()
    expect(screen.queryByText('86')).toBeNull()
  })

  it('状态栏与子栏健康度使用真实派生值（非空壳）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    // 库内无文件 → 双链 0 / 标签 0（真实统计，非写死 243/34）
    expect(screen.getByText(/双链 0 · 标签 0/)).toBeTruthy()
    // 健康度无真实评分 → 显示 "--"（非写死 "健康度 84"）
    expect(screen.getByText(/健康度 --/)).toBeTruthy()
  })

  it('AI 摘要渲染真实字段 aiSummary', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    expect(screen.getByText('本库 AI 摘要（真实字段）。')).toBeTruthy()
  })

  it('切到「搜索」Tab 渲染真实 KbSearchPanel（无占位桩）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('搜索'))
    expect(await screen.findByPlaceholderText('搜索库内文件内容...')).toBeTruthy()
    // 旧占位桩文案不应出现
    expect(screen.queryByText(/该模块结构已就位，内容待填充/)).toBeNull()
  })

  it('切到「问答」Tab 渲染真实 KbChatPanel 覆盖层', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('问答'))
    expect(await screen.findByText('知识库问答')).toBeTruthy()
  })

  it('切到「依赖」Tab 渲染真实 DependencyTab（空库显示真实空态，非占位桩）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('依赖'))
    // 真实 DependencyTab 空态文案（库内无文件时）
    expect(await screen.findByText(/无法分析依赖关系/)).toBeTruthy()
    // 旧占位桩文案不应出现
    expect(screen.queryByText(/该模块结构已就位，内容待填充/)).toBeNull()
  })

  it('切到「MOC」Tab 渲染真实 MocTab（generateKbMoc）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('MOC'))
    expect(await screen.findByText('知识库目录（MOC）')).toBeTruthy()
    expect(screen.getByText('生成 MOC')).toBeTruthy()
  })

  it('切到「导出」Tab 渲染真实 KbExportMenu 覆盖层', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('导出'))
    expect(await screen.findByText('导出知识库')).toBeTruthy()
  })

  it('直接挂载 FileDependencyPanel 不崩溃（依赖分析真实组件）', async () => {
    render(
      <RealProviders>
        <FileDependencyPanel fileId="missing-file" onClose={() => {}} />
      </RealProviders>,
    )
    expect(await screen.findByText('依赖分析')).toBeTruthy()
  })

  it('点「编辑」顶栏按钮打开真实编辑对话框（已接 renameKb/updateDescription，非 toast 桩）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(subbarActions().getByText('编辑'))
    expect(await screen.findByText('编辑知识库')).toBeTruthy()
    // 含名称输入，证明是真实表单而非提示弹窗
    expect(document.querySelector('.aurora-kb-input')).toBeTruthy()
  })

  it('点「删除」顶栏按钮打开真实删除确认对话框（已接 deleteKb，非 toast 桩）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(subbarActions().getByText('删除'))
    expect(await screen.findByText('删除知识库')).toBeTruthy()
  })

  it('点「发布博客」跳转到博客工作室（nav("blog")，不再下载 ZIP 桩）', async () => {
    const mockNav = vi.fn()
    render(
      <RealProviders>
        <KbPanel nav={mockNav} />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(subbarActions().getByText('发布博客'))
    expect(mockNav).toHaveBeenCalledWith('blog', expect.any(String))
  })

  it('回归：侧栏点「双链图谱」→ nav("graph", kbId)（第十七批稳定 id 后仍限定本库范围）', async () => {
    const mockNav = vi.fn()
    render(
      <RealProviders>
        <KbPanel nav={mockNav} />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    // 第十七批把侧栏导航改为传稳定 id（graph），而非旧中文 label（图谱）。
    // 此处从侧栏（PageFrame 自带）进入图谱，必须仍带本库 id —— 否则图谱退化为全局图。
    const sidebar = document.querySelector('.aurora-sidebar')
    expect(sidebar).toBeTruthy()
    fireEvent.click(within(sidebar as HTMLElement).getByTitle('双链图谱'))
    expect(mockNav).toHaveBeenCalledWith('graph', 'kb-test')
  })

  it('P0 闭环：笔记 Tab「新建笔记」在库文件夹下建文件并跳转编辑器（解决无处添加笔记）', async () => {
    const mockNav = vi.fn()
    render(
      <RealProviders>
        <KbPanel nav={mockNav} />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    // 切到笔记 Tab（空库 → 显示空态 + 新建笔记入口）
    fireEvent.click(screen.getByTitle('笔记'))
    expect(await screen.findByText('暂无笔记')).toBeTruthy()
    fireEvent.click(screen.getByText('新建笔记'))
    // 跳转编辑器（带 returnView 由 setEditorReturn 写入，编辑器据此显示返回芯片）
    expect(mockNav).toHaveBeenCalledWith('editor')
  })

  it('P1 闭环：概览展示「关联白板」区块（canvasIds 复活，可打开/新建并关联，打通 知识库↔白板）', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    // 库 mock 含 canvasIds: ['c1','c2'] → 区块列出关联白板并提供「新建并关联」入口
    expect(await screen.findByText(/关联白板（/)).toBeTruthy()
    expect(screen.getByText('新建并关联')).toBeTruthy()
    // 已关联白板提供「打开」入口（点击 → nav('canvas', id) 跳转白板）
    expect(screen.getAllByText('打开').length).toBeGreaterThan(0)
  })

  it('P1 补口：「关联已有」选择器只列未关联白板（已关联的过滤掉），点击写入 canvasIds', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    // 打开内联选择器
    fireEvent.click(screen.getByText('关联已有'))
    // ⚠️ 断言必须限定在 picker 容器内：主列表也会显示已关联项的名字（c1），
    // 全局 queryByText 会测到主列表 → 假失败。
    const picker = await waitFor(() => {
      const el = document.querySelector('.aurora-kb-canvas__picker')
      if (!el) throw new Error('「关联已有」选择器未渲染')
      return el as HTMLElement
    })
    // 候选只含未关联的 c3；已关联的 c1（canvasIds=['c1','c2']）被过滤
    expect(within(picker).getByText('已有白板 C3')).toBeTruthy()
    expect(within(picker).queryByText('已关联白板 C1')).toBeNull()
    // 点击候选 → 落到数据层 addCanvasToKb(kb-test, c3)
    fireEvent.click(within(picker).getByText('已有白板 C3'))
    await vi.waitFor(() => {
      expect(addCanvasToKb).toHaveBeenCalledWith('kb-test', 'c3')
    })
  })

  it('🚨 回归：点「新建并关联」后列表与计数**立即更新**，无需刷新页面重挂载', async () => {
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    // 初始 2 块
    expect(await screen.findByText(/关联白板（2）/)).toBeTruthy()
    fireEvent.click(screen.getByText('新建并关联'))
    // 计数 2 → 3，且新白板行出现在列表（名称来自 createCanvas 返回值，不闪「未命名白板」）
    await vi.waitFor(() => {
      expect(screen.getByText(/关联白板（3）/)).toBeTruthy()
    })
    expect(await screen.findByText('测试知识库 X 白板')).toBeTruthy()
    // 顶部 KPI「关联白板」值同步为 3
    const kpi = [...document.querySelectorAll('.aurora-kb-kpi')]
      .find(el => el.textContent?.includes('关联白板'))
    expect(kpi?.textContent).toContain('3')
  })

  it('P1 闭环：概览「查看完整图谱」跳转双链图谱，且**带上库 id 限定范围**（KB↔图谱串联）', async () => {
    const mockNav = vi.fn()
    render(
      <RealProviders>
        <KbPanel nav={mockNav} />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByText(/查看完整图谱/))
    // 2026-09-23 报障修复：此前是裸 nav('graph')，AuroraShell 无从得知来源库 ⇒ 图谱恒为全局图，
    // 文件管理器里与本库无关的笔记也混在里面。现必须带库 id（缺省取列表首项 = kb-test），
    // 由 GraphPanel#scopeGraphToKb 裁到本库文件节点。
    expect(mockNav).toHaveBeenCalledWith('graph', 'kb-test')
  })

  it('回归：列表为空时不渲染图谱入口（不存在「带着空 id 进图谱」的路径）', async () => {
    vi.mocked(getKbList).mockResolvedValueOnce([])
    renderPanel()
    expect(await screen.findByText('尚未选择知识库')).toBeTruthy()
    expect(screen.queryByText(/查看完整图谱/)).toBeNull()
  })

  // ── 回归锁：Tab 现场记忆（2026-09-22 第六轮报障）──
  // 报障原话：「点击笔记没能进入对应界面，而是直接回到了知识库详细界面的概览页面中」。
  // 真机链路 = 详情（笔记 Tab）→ 点笔记 → 简介页 → 「← 返回 XX」→ 落回**概览**。
  // 根因：KbPanel 按 view 切换整体卸载重挂，Tab 是组件内 useState → 复位 overview。
  it('🚨 回归：离开知识库再回来，停留在上次的 Tab（不再掉回「概览」）', async () => {
    const first = renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('笔记'))
    expect(screen.getByTitle('笔记').getAttribute('aria-selected')).toBe('true')

    // 模拟 AuroraShell 按 view 切换：KB → 编辑器（简介页）时 KbPanel 整体卸载
    first.unmount()

    // 「← 返回 XX」→ nav('kb', kbId) → 重新挂载
    renderPanel()
    await screen.findAllByText('测试知识库 X')
    expect(screen.getByTitle('笔记').getAttribute('aria-selected'), '返回后应恢复「笔记」Tab').toBe('true')
    expect(screen.getByTitle('概览').getAttribute('aria-selected'), '不应掉回「概览」').toBe('false')
  })

  // ★ 对照组：记忆是「按库各记一份」而非全局粘住 —— 换一个库时不得串台
  it('对照组 · 换库：另一个 kbId 无记忆 → 仍从「概览」开始（记忆不跨库串台）', async () => {
    const first = renderPanel()
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByTitle('笔记'))
    first.unmount()

    render(
      <RealProviders>
        <KbPanel kbId="kb-other" />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    expect(screen.getByTitle('概览').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTitle('笔记').getAttribute('aria-selected')).toBe('false')
  })
})
