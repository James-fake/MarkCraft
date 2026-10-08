import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `saveState` 的防抖 + 卸载补写（E2E 报告 L-1）。
 *
 * 原实现的 `saveState` 是 300ms **防抖**：用户在防抖窗口内刷新 / 关闭标签，
 * 定时器根本不会触发 —— 这次变更**连写都没开始**（真机复现：新建笔记后立即 reload，文件消失）。
 * 修复：新增 `flushPendingSave`，并在 pagehide / beforeunload / 切后台三条路径上调用。
 */

const mocks = vi.hoisted(() => ({
  saveLargeData: vi.fn(async () => {}),
  loadLargeData: vi.fn(async () => null),
  migrateToIndexedDB: vi.fn(async () => {}),
}))

vi.mock('@core/storage/migrate', () => ({
  saveLargeData: mocks.saveLargeData,
  loadLargeData: mocks.loadLargeData,
  migrateToIndexedDB: mocks.migrateToIndexedDB,
}))

import { saveState, saveStateSync, flushPendingSave } from './fileService'
import type { FileManagerState } from '../types/fileManager'

/** 造一个最小可辨识的状态（用文件名区分不同快照） */
function stateWithName(name: string): FileManagerState {
  return {
    rootFolder: {
      id: 'root',
      name: 'root',
      type: 'folder',
      children: [{ id: 'f1', name, type: 'file', content: 'x', createdAt: 0, updatedAt: 0 }],
      createdAt: 0,
      updatedAt: 0,
    },
    tabs: [],
    activeTabId: null,
    searchQuery: '',
    sidebarVisible: true,
  } as FileManagerState
}

const writtenName = (callIndex = 0) =>
  JSON.parse(mocks.saveLargeData.mock.calls[callIndex][1] as string).rootFolder.children[0].name

beforeEach(() => {
  vi.useRealTimers()
  mocks.saveLargeData.mockClear()
  // 清掉上一条用例可能残留的挂起变更，保证用例间独立
  flushPendingSave()
  mocks.saveLargeData.mockClear()
})

describe('saveState 防抖与卸载补写（L-1）', () => {
  it('防抖窗口内不会落盘 —— 这正是「秒刷新丢数据」的根因', () => {
    vi.useFakeTimers()
    saveState(stateWithName('A'))
    vi.advanceTimersByTime(100)
    expect(mocks.saveLargeData).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('flushPendingSave 立即落盘挂起的变更', () => {
    vi.useFakeTimers()
    saveState(stateWithName('B'))
    expect(mocks.saveLargeData).not.toHaveBeenCalled()

    flushPendingSave()

    expect(mocks.saveLargeData).toHaveBeenCalledTimes(1)
    expect(writtenName()).toBe('B')
    vi.useRealTimers()
  })

  it('🚨 pagehide（页面卸载）会自动补写挂起的变更', () => {
    vi.useFakeTimers()
    saveState(stateWithName('C'))
    expect(mocks.saveLargeData).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('pagehide'))

    expect(mocks.saveLargeData).toHaveBeenCalledTimes(1)
    expect(writtenName()).toBe('C')
    vi.useRealTimers()
  })

  it('beforeunload 同样补写（浏览器关闭 / 刷新路径）', () => {
    vi.useFakeTimers()
    saveState(stateWithName('D'))
    window.dispatchEvent(new Event('beforeunload'))
    expect(mocks.saveLargeData).toHaveBeenCalledTimes(1)
    expect(writtenName()).toBe('D')
    vi.useRealTimers()
  })

  it('无挂起变更时 flush 为零写入（幂等，不产生多余 IO）', () => {
    flushPendingSave()
    expect(mocks.saveLargeData).not.toHaveBeenCalled()
  })

  it('saveStateSync 作废挂起的旧快照，避免旧数据覆盖新数据', () => {
    vi.useFakeTimers()
    saveState(stateWithName('OLD'))
    saveStateSync(stateWithName('NEW'))
    // 推进超过防抖窗口：被作废的旧快照不得再写一次
    vi.advanceTimersByTime(500)

    expect(mocks.saveLargeData).toHaveBeenCalledTimes(1)
    expect(writtenName()).toBe('NEW')
    vi.useRealTimers()
  })
})
