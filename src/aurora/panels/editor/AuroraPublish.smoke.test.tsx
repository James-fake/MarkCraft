// @vitest-environment jsdom
import { useState } from 'react'
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * 辅助 Tab（发布 / 归集）单元测试
 *
 * 覆盖 2026-09-13 需求的两条主线：
 *   1. 发布为博客 —— 把当前笔记交给博客面板（单篇发布）；
 *   2. 添加到知识库 —— 就地展开现有知识库列表让用户选择（勾选式多选：未归集→加入，已归集→移出），
 *      并可「新建知识库并关联」。
 * 数据层用 useKbStore 桩（不落 IndexedDB），只验证 Aurora 这一层的接线与交互契约。
 */
const kb = vi.hoisted(() => {
  const memberOf = { value: ['kb2'] as string[] }
  return {
    kbList: [
      { id: 'kb1', name: '设计笔记' },
      { id: 'kb2', name: '前端手册' },
    ],
    addFile: vi.fn(async () => {}),
    removeFile: vi.fn(async () => {}),
    createKb: vi.fn(async (name: string) => ({
      id: 'kb-new', name, description: '', folderId: 'f-new',
      createdAt: 0, updatedAt: 0, canvasIds: [], fileIds: [], rules: [], aiSummary: '',
    })),
    getKbsContainingFile: vi.fn(async () => memberOf.value),
    /** 重设「该笔记当前属于哪些知识库」 */
    setMembers: (ids: string[]) => { memberOf.value = ids },
    reset: () => {
      memberOf.value = ['kb2']
      kb.addFile.mockClear()
      kb.removeFile.mockClear()
      kb.createKb.mockClear()
      kb.getKbsContainingFile.mockClear()
    },
  }
})

vi.mock('../../../stores/useKbStore', () => ({
  useKbStore: () => ({
    kbList: kb.kbList,
    addFile: kb.addFile,
    removeFile: kb.removeFile,
    createKb: kb.createKb,
    getKbsContainingFile: kb.getKbsContainingFile,
  }),
}))

import { AuroraPublish } from './AuroraPublish'

/** 受控宿主：open 由父级持有（真实调用方 EditorPanel 即此形态） */
function Host({ fileId = 'f1', fileName = '我的笔记.md', onPublish }: {
  fileId?: string | null
  fileName?: string
  onPublish?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <AuroraPublish
      fileId={fileId}
      fileName={fileName}
      open={open}
      onOpenChange={setOpen}
      onPublish={onPublish}
    />
  )
}

const openList = () => act(() => { fireEvent.click(screen.getByRole('button', { name: /添加到知识库/ })) })
/** 归集关系是异步查询（useKbStore.getKbsContainingFile），断言前先等它落定 */
const settleMembers = () => waitFor(() => expect(kb.getKbsContainingFile).toHaveBeenCalled())

describe('辅助 Tab · AuroraPublish（发布为博客 / 添加到知识库）', () => {
  afterEach(() => {
    cleanup()
    kb.reset()
  })

  it('展示目标笔记上下文，并按归集现状给出提示与勾选', async () => {
    kb.setMembers(['kb2'])
    render(<Host />)
    expect(screen.getByText('我的笔记.md')).toBeTruthy()
    await settleMembers()

    openList()
    // 列表就地展开在动作行下方（同一容器内），不出现旧版独立浮层
    const list = document.querySelector('.aurora-aidpanel__kblist')
    expect(list).toBeTruthy()
    expect(screen.getByRole('option', { name: '设计笔记' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '前端手册' })).toBeTruthy()

    // 已归集的库（kb2）标记为选中；未归集的（kb1）不选中
    const rows = Array.from(list!.querySelectorAll('.aurora-aidpanel__kb'))
    expect(rows.filter((r) => r.className.includes('is-on')).map((r) => r.textContent)).toEqual(['前端手册'])
    expect(screen.getByRole('button', { name: /添加到知识库/ }).textContent).toContain('已加入 1')
  })

  it('选择未归集的知识库 → 真实加入并更新勾选；再点已归集项 → 移出', async () => {
    kb.setMembers([])
    render(<Host />)
    await settleMembers()
    openList()

    act(() => { fireEvent.click(screen.getByRole('option', { name: '设计笔记' })) })
    await waitFor(() => expect(kb.addFile).toHaveBeenCalledWith('kb1', 'f1'))
    await waitFor(() =>
      expect(document.querySelector('.aurora-aidpanel__kb.is-on')?.textContent).toContain('设计笔记'),
    )

    act(() => { fireEvent.click(screen.getByRole('option', { name: '设计笔记' })) })
    await waitFor(() => expect(kb.removeFile).toHaveBeenCalledWith('kb1', 'f1'))
    await waitFor(() => expect(document.querySelector('.aurora-aidpanel__kb.is-on')).toBeNull())
  })

  it('新建知识库并关联：以笔记名为默认库名，创建后自动归入', async () => {
    kb.setMembers([])
    render(<Host />)
    await settleMembers()
    openList()

    act(() => { fireEvent.click(screen.getByRole('button', { name: /新建知识库并关联/ })) })
    await waitFor(() => expect(kb.createKb).toHaveBeenCalledWith('我的笔记', ''))
    await waitFor(() => expect(kb.addFile).toHaveBeenCalledWith('kb-new', 'f1'))
  })

  it('发布为博客：回调携带目标笔记 id（博客面板据此进入单篇发布）', async () => {
    const onPublish = vi.fn()
    render(<Host onPublish={onPublish} />)
    await settleMembers()
    act(() => { fireEvent.click(screen.getByRole('button', { name: /发布为博客/ })) })
    expect(onPublish).toHaveBeenCalledWith('f1')
  })

  it('无目标笔记时两项动作均不可用（灰置，不产生副作用）', async () => {
    const onPublish = vi.fn()
    render(<Host fileId={null} fileName="" onPublish={onPublish} />)
    const publishRow = screen.getByRole('button', { name: /发布为博客/ }) as HTMLButtonElement
    const kbRow = screen.getByRole('button', { name: /添加到知识库/ }) as HTMLButtonElement
    expect(publishRow.disabled).toBe(true)
    expect(kbRow.disabled).toBe(true)
    act(() => { fireEvent.click(publishRow) })
    expect(onPublish).not.toHaveBeenCalled()
    expect(screen.getByText('未打开笔记')).toBeTruthy()
    // 无目标笔记时不查询归集关系（避免无意义 IO）
    expect(kb.getKbsContainingFile).not.toHaveBeenCalled()
  })
})
