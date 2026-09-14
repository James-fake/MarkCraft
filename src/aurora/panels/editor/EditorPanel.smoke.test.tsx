// @vitest-environment jsdom
import React, { useEffect } from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { RealProviders } from '../../app/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { setEditorReturn, getEditorReturn } from '../../app/navReturn'

// 真实 EditorLayout / VersionHistoryPanel 依赖 CodeMirror / TipTap，jsdom 无法挂载；
// mock 它们以验证 Aurora 这一层（props 接线 / 模式状态机 / 空态 / mock 残留消除）。
vi.mock('../../../features/editor/EditorLayout', () => ({
  EditorLayout: (props: any) => (
    <div
      data-testid="real-editorlayout"
      data-active={props.activeFileId ?? 'null'}
      data-editor-mode={props.editorMode}
      data-source={String(props.showSource)}
      data-preview={String(props.showPreview)}
      data-show-mode-toolbar={String(props.showModeToolbar)}
      data-outline={String(props.effectiveShowOutline)}
    >
      REAL_EDITOR_LAYOUT
      <span data-testid="el-active">{props.activeFileId ?? 'null'}</span>
    </div>
  ),
}))

vi.mock('../../../features/editor/VersionHistoryPanel', () => ({
  VersionHistoryPanel: () => <div data-testid="version-history">VERSION_HISTORY</div>,
}))

import { EditorPanel } from './EditorPanel'

// 打开真实文件树中的首个文件，使 EditorLayout 真正挂载
function Harness({ nav }: { nav?: (id: string, param?: string) => void } = {}) {
  const { rootFolder, openFile } = useFileManager()
  useEffect(() => {
    const all: any[] = []
    const walk = (n: any) => {
      if (n.type === 'file') all.push(n)
      n.children?.forEach(walk)
    }
    walk(rootFolder)
    const first = all[0]
    if (first) act(() => openFile(first.id))
  }, [rootFolder, openFile])
  return <EditorPanel nav={nav} />
}

describe('Aurora EditorPanel 换芯（D8）烟雾测试', () => {
  beforeAll(() => {
    // jsdom 无 IndexedDB，Dexie 会 warn；不影响 store 返回内存态
    ;(window as any).indexedDB = (window as any).indexedDB || {}
  })

  it('1) 挂载无崩溃；无 mock 残留（Aurora 设计系统 / 1,234 词）', () => {
    const { container } = render(
      <RealProviders>
        <EditorPanel />
      </RealProviders>,
    )
    expect(screen.queryByText('Aurora 设计系统')).toBeNull()
    expect(screen.queryByText('1,234 词')).toBeNull()
    // 空态：未打开文档 + 文件名输入框 + 新建笔记 + 内嵌轻量文件列表（EmptyFileBrowser）；浏览文件按钮已删除、成长概览已移除
    expect(container.querySelector('.aurora-editor__empty-title')?.textContent).toBe('未打开文档')
    expect(container.querySelector('.aurora-editor__filename-input')).toBeTruthy()
    expect(screen.queryByText('浏览文件')).toBeNull()
    expect(container.querySelector('.aurora-editor__empty-files')).toBeTruthy()
    expect(container.querySelector('.aurora-emptyfiles')).toBeTruthy()
    expect(container.querySelector('.aurora-editor__empty-dash')).toBeNull()
  })

  it('2) 打开文件后真实 EditorLayout 挂载，并收到正确 props（showModeToolbar=false）', () => {
    render(
      <RealProviders>
        <Harness />
      </RealProviders>,
    )
    const el = screen.getByTestId('real-editorlayout')
    expect(el).toBeTruthy()
    expect(el.getAttribute('data-show-mode-toolbar')).toBe('false')
    // 默认范式收敛（P1-1.2 E1）：默认 wysiwyg
    expect(el.getAttribute('data-editor-mode')).toBe('wysiwyg')
    // 源码可见、预览不可见；outline 由 Aurora 右栏接管故为 false（设计）
    expect(el.getAttribute('data-source')).toBe('true')
    expect(el.getAttribute('data-preview')).toBe('false')
    expect(el.getAttribute('data-outline')).toBe('false')
    // activeFileId 与 store 中首个文件一致
    const active = screen.getByTestId('el-active').textContent
    expect(active && active !== 'null').toBe(true)
  })

  it('3) 模式切换：默认 wysiwyg，点「源码」切源码、再点「所见即所得」切回', () => {
    render(
      <RealProviders>
        <Harness />
      </RealProviders>,
    )
    const el = screen.getByTestId('real-editorlayout')
    // 默认 wysiwyg（P1-1.2 E1）
    expect(el.getAttribute('data-editor-mode')).toBe('wysiwyg')
    // 切到纯源码（顶栏「源码」按钮：默认 wysiwyg 下点击切回纯源码）
    const sourceBtn = screen.getByRole('button', { name: /源码/i })
    act(() => fireEvent.click(sourceBtn))
    expect(el.getAttribute('data-editor-mode')).toBe('source')
    // 再切回所见即所得（顶栏「所见即所得」按钮）
    const wysiwygBtn = screen.getByRole('button', { name: /所见即所得/i })
    act(() => fireEvent.click(wysiwygBtn))
    expect(el.getAttribute('data-editor-mode')).toBe('wysiwyg')
  })

  it('4) 顶栏保留 Aurora 视图切换按钮组（新 chrome）：源码 / 预览 / 所见即所得', () => {
    render(
      <RealProviders>
        <Harness />
      </RealProviders>,
    )
    const sourceBtn = screen.getByRole('button', { name: /源码/i })
    expect(sourceBtn).toBeTruthy()
    const splitBtn = screen.getByRole('button', { name: /预览/i })
    expect(splitBtn).toBeTruthy()
    const wysiwygBtn = screen.getByRole('button', { name: /所见即所得/i })
    expect(wysiwygBtn).toBeTruthy()
    // 标题栏显示真实文档标题（非 mock "Aurora 设计系统"）
    expect(screen.queryByText('Aurora 设计系统')).toBeNull()
  })

  it('5) P0-1 状态栏"⌘K 命令面板"项点击真正唤起面板（调用 onOpenCommandPalette，而非仅 toast）', () => {
    const openMock = vi.fn()
    render(
      <RealProviders>
        <EditorPanel onOpenCommandPalette={openMock} />
      </RealProviders>,
    )
    const item = screen.getByText('⌘K 命令面板')
    expect(item.className).toContain('aurora-statusbar__item--clickable')
    act(() => fireEvent.click(item))
    expect(openMock).toHaveBeenCalledTimes(1)
  })

  it('6) 右栏检查器 Tab 可切换：脚注/块级反链/辅助 点击后能真正进入（回归：受控 activeTab 与内容渲染同源于 currentTab）', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(
        <RealProviders>
          <Harness />
        </RealProviders>,
      )
      // 鼠标靠右缘滑入检查器（需 activeFileId，Harness 已打开首个文件）
      // hover-intent：进入边缘需停留 ~220ms 才展开，故推进定时器使浮层真正渲染
      const hoverzone = container.querySelector('.aurora-editor__hoverzone--right') as HTMLElement
      expect(hoverzone).toBeTruthy()
      act(() => { fireEvent.mouseEnter(hoverzone) })
      act(() => { vi.advanceTimersByTime(260) })

      // 初始：大纲 Tab 激活
      const outlineTab = screen.getByRole('tab', { name: '大纲' })
      expect(outlineTab.getAttribute('aria-selected')).toBe('true')

      // 点击「脚注」Tab → 脚注面板真正渲染（.aurora-footnotes），Tab 高亮跟随
      const footnoteTab = screen.getByRole('tab', { name: '脚注' })
      act(() => fireEvent.click(footnoteTab))
      expect(footnoteTab.getAttribute('aria-selected')).toBe('true')
      expect(container.querySelector('.aurora-footnotes')).toBeTruthy()
      // 回归点：修复前内容区仍渲染大纲（脚注面板不会出现）
      expect(screen.queryByText('未打开文档')).toBeNull()

      // 点击「块级反链」Tab → 反链面板真正渲染（.aurora-backlinks）
      const backlinksTab = screen.getByRole('tab', { name: '块级反链' })
      act(() => fireEvent.click(backlinksTab))
      expect(backlinksTab.getAttribute('aria-selected')).toBe('true')
      expect(container.querySelector('.aurora-backlinks')).toBeTruthy()

      // 点击「辅助」Tab → 辅助面板（.aurora-aidpanel）真正渲染
      const aidTab = screen.getByRole('tab', { name: '辅助' })
      act(() => fireEvent.click(aidTab))
      expect(aidTab.getAttribute('aria-selected')).toBe('true')
      expect(container.querySelector('.aurora-aidpanel')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('7) 双链图谱来源：渲染「← 返回 双链图谱」芯片，点击回跳 graph 并清除来源', () => {
    // 图谱节点单击跳转时写入的来源上下文（GraphPanel.openNoteInEditor）
    setEditorReturn({ view: 'graph', label: '双链图谱' })
    const nav = vi.fn()
    const { container } = render(
      <RealProviders>
        <EditorPanel nav={nav} />
      </RealProviders>,
    )
    const chip = container.querySelector('.aurora-editor__return') as HTMLElement | null
    expect(chip).toBeTruthy()
    expect(chip!.textContent).toContain('返回 双链图谱')

    act(() => fireEvent.click(chip!))
    expect(nav).toHaveBeenCalledWith('graph')
    // 来源一次性：回跳后必须清空，避免下次进入编辑器仍挂着旧来源芯片
    expect(getEditorReturn()).toBeNull()
  })

  it('8) 辅助 Tab 换内容（2026-09-13）：旧三分区退役，改为「发布为博客 / 添加到知识库」且两者均可真实触发', () => {
    vi.useFakeTimers()
    try {
      const nav = vi.fn()
      const { container } = render(
        <RealProviders>
          <Harness nav={nav} />
        </RealProviders>,
      )
      const hoverzone = container.querySelector('.aurora-editor__hoverzone--right') as HTMLElement
      act(() => { fireEvent.mouseEnter(hoverzone) })
      act(() => { vi.advanceTimersByTime(260) })
      act(() => fireEvent.click(screen.getByRole('tab', { name: '辅助' })))

      // 1) 旧的写作辅助 / 成稿核查 / 粘贴为脚注三个分区整体退役（不是藏起来，是已不存在）
      expect(screen.queryByText('写作辅助')).toBeNull()
      expect(screen.queryByText('成稿核查')).toBeNull()
      expect(screen.queryByText('粘贴为脚注')).toBeNull()

      // 2) 两个新动作在场，且带目标笔记上下文
      const publishRow = screen.getByRole('button', { name: /发布为博客/ })
      const kbRow = screen.getByRole('button', { name: /添加到知识库/ })
      expect(container.querySelector('.aurora-aidpanel__file-name')?.textContent).toBeTruthy()

      // 3) 「添加到知识库」→ 就地展开列表（不再走独立浮层 / 遮罩）
      expect(kbRow.getAttribute('aria-expanded')).toBe('false')
      act(() => fireEvent.click(kbRow))
      expect(kbRow.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelector('.aurora-aidpanel__kblist')).toBeTruthy()
      expect(container.querySelector('.aurora-kb-menu')).toBeNull()

      // 4) 「发布为博客」→ 交给博客视图（BlogPanel 进入单篇发布，见 blog 侧测试）
      act(() => fireEvent.click(publishRow))
      expect(nav).toHaveBeenCalledWith('blog')
    } finally {
      vi.useRealTimers()
    }
  })
})
