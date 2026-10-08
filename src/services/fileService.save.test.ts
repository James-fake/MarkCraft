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

import { saveState, saveStateSync, flushPendingSave, loadStateAsync } from './fileService'
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
  // ⚠️ 必须 mockReset 而非 mockClear：mockClear 只清调用记录，**不清 `mockResolvedValueOnce` 队列** ——
  // 上一条用例若未消费完 once 队列，会污染下一条（本文件真实踩过）。
  mocks.saveLargeData.mockReset()
  mocks.saveLargeData.mockResolvedValue(undefined)
  mocks.loadLargeData.mockReset()
  mocks.loadLargeData.mockResolvedValue(null)
  // 清掉上一条用例残留的挂起变更；随后清空 localStorage（flush 会写安全副本，需一并清掉）
  flushPendingSave()
  localStorage.clear()
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

  it('🚨 卸载时同步写入 localStorage 安全副本（IDB 异步写入可能来不及提交）', () => {
    vi.useFakeTimers()
    saveState(stateWithName('SAFE'))
    window.dispatchEvent(new Event('pagehide'))

    // 真机复现过：仅「发起 IDB 写入」不够 —— reload 可能在它提交前拆掉页面。
    // 故卸载期必须同步落一份副本（localStorage 的 setItem 是同步的，保证落地）。
    const raw = localStorage.getItem('markcraft-file-manager-unload-safety')
    expect(raw, '卸载后应存在 localStorage 安全副本').toBeTruthy()
    expect(JSON.parse(raw!).rootFolder.children[0].name).toBe('SAFE')
    vi.useRealTimers()
  })

  it('🚨 启动时优先采用安全副本，并补写回 IDB 后清掉副本', async () => {
    localStorage.setItem('markcraft-file-manager-version', 'v5')
    localStorage.setItem(
      'markcraft-file-manager-unload-safety',
      JSON.stringify(stateWithName('FROM_SAFETY')),
    )
    // IDB 里是过期数据 —— 若优先读 IDB 就会丢数据
    mocks.loadLargeData.mockResolvedValueOnce(JSON.stringify(stateWithName('STALE_IDB')))

    const loaded = await loadStateAsync('zh')

    expect(loaded?.rootFolder.children[0].name).toBe('FROM_SAFETY')
    // 已补写回 IDB，且副本被清掉（下次启动不必再走这条路）
    expect(mocks.saveLargeData).toHaveBeenCalled()
    expect(localStorage.getItem('markcraft-file-manager-unload-safety')).toBeNull()
  })

  it('安全副本损坏时丢弃并回落到 IDB（不让坏副本挡住正常数据）', async () => {
    localStorage.setItem('markcraft-file-manager-version', 'v5')
    localStorage.setItem('markcraft-file-manager-unload-safety', '{ not valid json')
    mocks.loadLargeData.mockResolvedValueOnce(JSON.stringify(stateWithName('FROM_IDB')))

    const loaded = await loadStateAsync('zh')

    expect(loaded?.rootFolder.children[0].name).toBe('FROM_IDB')
    expect(localStorage.getItem('markcraft-file-manager-unload-safety')).toBeNull()
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
