/**
 * H-8 回归锁（2026-11-08）：知识库读-改-写并发串行化。
 *
 * 旧实现只有 6 个导出函数包了 withKbLock，`updateTasks` / `updateDescription` /
 * `addExportRecord` 等仍是裸 `loadKb → 改字段 → saveKb`。同一 kbId 两个操作在 await 间
 * 交错时，后写者用自己读到的旧快照覆盖前者的字段（丢更新）；且加锁与未加锁函数共享
 * key 时并不互斥。本测试用可控门闩让并发双方的读都基于同一份旧快照，验证修复后
 * 两个字段都保留。
 *
 * 说明：现有 kbStore.getKbFiles.test.ts 是纯函数契约测试、直接用真实内存后端，无法制造
 * 「两个 load 都读到旧快照」的确定性交错；故另起本文件，单独 vi.mock 掉 @core/storage/kv。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 内存 KV + 读门闩：race 期间所有 kvGet 挂在同一道门上，确保并发双方都先读到旧快照。
const h = vi.hoisted(() => {
  const store = new Map<string, string>()
  let gate: Promise<void> = Promise.resolve()
  let releaseGate: () => void = () => {}
  return {
    store,
    arm() {
      gate = new Promise<void>((resolve) => { releaseGate = resolve })
    },
    release() {
      releaseGate()
    },
    resetGate() {
      gate = Promise.resolve()
    },
    async kvGet(key: string): Promise<string | null> {
      await gate
      return store.get(key) ?? null
    },
    async kvSet(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
    async kvDelete(key: string): Promise<void> {
      store.delete(key)
    },
    async kvKeys(): Promise<string[]> {
      return [...store.keys()]
    },
    async kvClear(): Promise<void> {
      store.clear()
    },
  }
})

vi.mock('@core/storage/kv', () => ({
  kvGet: h.kvGet,
  kvSet: h.kvSet,
  kvDelete: h.kvDelete,
  kvKeys: h.kvKeys,
  kvClear: h.kvClear,
}))

import { loadKb, saveKb, updateTasks, updateDescription, addFileToKb, addExportRecord } from './kbStore'
import type { KnowledgeBase, KbTask, ExportRecord } from './kbTypes'

const T = 1700000000000
const baseKb = (): KnowledgeBase => ({
  id: 'kb-1',
  name: '测试库',
  description: '',
  folderId: 'f-1',
  createdAt: T,
  updatedAt: T,
  canvasIds: [],
  fileIds: [],
  rules: [],
})
const task: KbTask = {
  id: 'task-1', title: '写测试', status: 'todo', priority: 'high', createdAt: T,
}
const record: ExportRecord = {
  id: 'exp-1', type: 'pdf', filename: 'out.pdf', fileCount: 1, exportedAt: T, sizeBytes: 1024,
}

describe('kbStore · 读-改-写并发串行化（H-8）', () => {
  beforeEach(() => {
    h.store.clear()
    h.resetGate()
  })

  it('两个并发更新不丢字段：updateTasks 与 updateDescription 各改各的，最终都保留', async () => {
    await saveKb(baseKb())

    h.arm()
    const p1 = updateTasks('kb-1', [task])
    const p2 = updateDescription('kb-1', '并发写入的描述')
    h.release()
    await Promise.all([p1, p2])

    const kb = await loadKb('kb-1')
    expect(kb?.tasks).toEqual([task])
    expect(kb?.description).toBe('并发写入的描述')
  })

  it('已加锁函数与新补齐函数共享 key 时互斥：addFileToKb 与 addExportRecord 都不丢', async () => {
    await saveKb(baseKb())

    h.arm()
    const p1 = addFileToKb('kb-1', 'file-9')
    const p2 = addExportRecord('kb-1', record)
    h.release()
    await Promise.all([p1, p2])

    const kb = await loadKb('kb-1')
    expect(kb?.fileIds).toContain('file-9')
    expect(kb?.exportHistory).toEqual([record])
  })
})
