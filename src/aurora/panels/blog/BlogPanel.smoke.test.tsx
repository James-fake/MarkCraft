import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// 知识库来源 stub：保留 kbStore 其余导出，仅覆盖 loadKb，使 BlogPanel 在传入 kbId 时可确定性加载「库名 + folderId」
vi.mock('../../../stores/kbStore', async () => {
  const actual = await vi.importActual<typeof import('@stores/kbStore')>('../../../stores/kbStore')
  return {
    ...actual,
    loadKb: vi.fn(async (id: string) => ({
      id, name: '测试知识库 X', description: '', folderId: 'f-kb-empty',
      createdAt: Date.now(), updatedAt: Date.now(), canvasIds: [], fileIds: [], rules: [], aiSummary: '',
    })),
  }
})

// jsdom 无 ResizeObserver，BlogPanel 的 useLayoutEffect 用其做功能列表贴边对齐，需 stub
beforeAll(() => {
  // @ts-expect-error 注入测试桩
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import { RealProviders } from '../../app/RealProviders'
import { BlogPanel } from './BlogPanel'
import { FEATURED_THEMES } from '@features/blog/hooks/useBlogGenerator'

function renderPanel() {
  return render(
    <RealProviders>
      <BlogPanel />
    </RealProviders>,
  )
}

describe('BlogPanel 接真实数据（FileStore 文档 + 真实主题市场）', () => {
  afterEach(cleanup)

  it('挂载无崩溃、外壳渲染、且旧写死 MOCK_DOCS 残留已清除', async () => {
    renderPanel()
    // 面包屑 / 侧栏激活项「博客工作室」
    expect((await screen.findAllByText('博客工作室')).length).toBeGreaterThan(0)
    // 旧写死 mock 文档标题不应出现（已替换为真实 .md 文件列表）
    expect(screen.queryByText('Aurora 设计系统实践')).toBeNull()
    expect(screen.queryByText('博客工作室使用指南')).toBeNull()
    expect(screen.queryByText('双链笔记的心得')).toBeNull()
    // 友链 / 系列起始为空（对齐真实 friendLinks/seriesConfig 默认空）：旧 mock 友链名不应出现
    expect(screen.queryByText('设计日记')).toBeNull()
    expect(screen.queryByText('Aurora 系列')).toBeNull()
    // 状态栏「X 篇待发布」来自真实文档计数（无论 0 或 N 都匹配）
    expect(screen.getByText(/篇待发布/)).toBeTruthy()
  })

  it('配色 / 主题市场渲染真实单一数据源 + 只露精品 12（P1-1.3 B1）', async () => {
    const { container } = renderPanel()
    // 功能面板首次默认收起：先点「样式」tab 展开（主题市场在样式面板内）
    fireEvent.click(container.querySelectorAll('.aurora-blog__tab')[0])
    // '杂志' = 真实 THEME_INFO_LIST 中 magazine 主题的 nameZh
    expect((await screen.findAllByText('杂志')).length).toBeGreaterThan(0)
    // '便当盒' = 真实 THEME_INFO_LIST 的 bento 主题（旧 20 项 mock 市场无此主题），
    // 出现即证明已接真实目录而非旧平行 mock
    expect((await screen.findAllByText('便当盒')).length).toBeGreaterThan(0)
    // B1：精品清单恰 12 个；非精品（poetry 诗歌）不在主题市场渲染
    expect(FEATURED_THEMES).toHaveLength(12)
    const marketNames = Array.from(container.querySelectorAll('.aurora-blog-theme__name b')).map(
      (el) => el.textContent,
    )
    expect(marketNames).toHaveLength(12)
    expect(marketNames).not.toContain('诗歌')
    expect(marketNames).toContain('终端')
    expect(marketNames).toContain('水墨')
  })

  it('P0 修复：主题市场切换主题 → 预览 iframe 实时渲染对应主题模板（真实 generateSingleFileBlog）', async () => {
    const { container } = renderPanel()
    // 功能面板首次默认收起：先点「样式」tab 展开主题市场
    fireEvent.click(container.querySelectorAll('.aurora-blog__tab')[0])
    const iframe = container.querySelector('iframe[title="博客预览"]') as HTMLIFrameElement
    expect(iframe).toBeTruthy()

    // 初始默认主题 magazine（经典模板）→ srcDoc 非空且含站点标题（默认 FileStore 含 .md 文档）
    const before = iframe.getAttribute('srcdoc') || ''
    expect(before.length).toBeGreaterThan(0)
    expect(before).toContain('My Blog')

    // 点击「终端」主题卡（真实 THEME_INFO_LIST 中 terminal，nameZh='终端'；须精确匹配名称避免命中 hacker 等含「终端」描述的卡）
    const terminalCard = Array.from(container.querySelectorAll('.aurora-blog-theme'))
      .find((el) => el.querySelector('.aurora-blog-theme__name b')?.textContent === '终端')
    expect(terminalCard, '主题市场应渲染「终端」主题卡').toBeTruthy()
    fireEvent.click(terminalCard!)

    const after = iframe.getAttribute('srcdoc') || ''
    // 切换后预览必须变化，且渲染出 terminal 新主题模板的专属特征（hero-cursor / 终端命令文案）
    expect(after).not.toBe(before)
    expect(after).toContain('hero-cursor')
    expect(after).toContain('ls home')
  })

  it('B3 发布闭环：无标记 = 全部文档；无效 id 不锁定；有效 id = 单篇（清单只显示该篇，可退回全部）', async () => {
    const { setBlogEntryFileId } = await import('./BlogPanel')
    // 功能面板浮层默认收起：P1-5 分组后 [1] = 「数据」组 → 落到组内首个子面板「内容」，展开文档列表
    const openContent = (container: HTMLElement) => {
      fireEvent.click(container.querySelectorAll('.aurora-blog__tab')[1])
    }
    // 同一棵 Provider 树内改 key 重挂 BlogPanel：保证文件 id 不变，只让面板重新消费入口标记
    const renderPhase = (key: string) => (
      <RealProviders>
        <BlogPanel key={key} />
      </RealProviders>
    )

    // 1) 无标记：全部文档默认 included
    const { container, rerender } = render(renderPhase('a'))
    openContent(container)
    const docs = container.querySelectorAll('.aurora-blog-doc')
    expect(docs.length).toBeGreaterThan(1)
    expect(Array.from(docs).filter((d) => d.className.includes('is-on')).length).toBe(docs.length)
    const targetId = docs[0].getAttribute('data-file-id')
    expect(targetId).toBeTruthy()

    // 2) 无效 id：不锁定、不崩溃，仍是全量清单
    setBlogEntryFileId('__b3_invalid_id__')
    rerender(renderPhase('b'))
    openContent(container)
    const docs2 = container.querySelectorAll('.aurora-blog-doc')
    expect(docs2.length).toBe(docs.length)
    expect(Array.from(docs2).filter((d) => d.className.includes('is-on')).length).toBe(docs2.length)

    // 3) 有效 id：进入「单篇发布」——清单只剩这一篇（不再是把其余取消勾选），并给出退出口
    setBlogEntryFileId(targetId)
    rerender(renderPhase('c'))
    openContent(container)
    const thirdDocs = container.querySelectorAll('.aurora-blog-doc')
    expect(thirdDocs.length).toBe(1)
    expect(thirdDocs[0].getAttribute('data-file-id')).toBe(targetId)
    expect(await screen.findByText(/单篇发布：/)).toBeTruthy()
    // 一键退回全部笔记
    fireEvent.click(screen.getByRole('button', { name: '查看全部笔记' }))
    expect(container.querySelectorAll('.aurora-blog-doc').length).toBe(docs.length)
    // 标记消费后不应残留：后续渲染回到全量清单
    rerender(renderPhase('d'))
    openContent(container)
    expect(container.querySelectorAll('.aurora-blog-doc').length).toBe(docs.length)
  }, 20000) // 四段重挂 × RealProviders（Dexie/IndexedDB 初始化），全量并发下会越过默认 5s 线（2026-09-14 实测超时 flake）

  it('知识库来源：带入 kbId 显示来源条；空库显示「暂未添加文件」引导而非全部笔记', async () => {
    const { container } = render(
      <RealProviders>
        <BlogPanel kbId="kb-test" />
      </RealProviders>,
    )
    // 来源提示条（真实 DOM）：证明跳转带入了知识库上下文
    expect(await screen.findByText(/发布来源：测试知识库 X/)).toBeTruthy()
    // 切到「内容」面板（P1-5 分组后 [1] = 数据组 → 内容子面板），文档列表区应显示空库引导（真实 DOM，非 iframe 内 srcdoc）
    fireEvent.click(container.querySelectorAll('.aurora-blog__tab')[1])
    expect(await screen.findByText(/暂未添加文件/)).toBeTruthy()
    // 文档列表应为空（未混入全部笔记）
    expect(container.querySelectorAll('.aurora-blog-doc').length).toBe(0)
  })
})
