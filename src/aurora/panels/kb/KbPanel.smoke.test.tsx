import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

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
    canvasIds: ['c1', 'c2'], fileIds: [], rules: [],
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
}))

import { RealProviders } from '../../providers/RealProviders'
import { KbPanel } from './KbPanel'
import { FileDependencyPanel } from '@features/knowledgeBase/components/FileDependencyPanel'

function renderPanel() {
  return render(
    <RealProviders>
      <KbPanel />
    </RealProviders>,
  )
}

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

  it('P1 闭环：概览「查看完整图谱」跳转双链图谱（KB↔图谱串联）', async () => {
    const mockNav = vi.fn()
    render(
      <RealProviders>
        <KbPanel nav={mockNav} />
      </RealProviders>,
    )
    await screen.findAllByText('测试知识库 X')
    fireEvent.click(screen.getByText(/查看完整图谱/))
    expect(mockNav).toHaveBeenCalledWith('graph')
  })
})
