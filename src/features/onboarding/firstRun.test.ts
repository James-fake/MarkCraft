import { describe, it, expect, beforeEach } from 'vitest'
import { FIRST_RUN_SEED_KEY, readSeedRecord, writeSeedRecord } from './firstRun'

beforeEach(() => {
  localStorage.clear()
})

describe('首启状态 · 播种记录', () => {
  it('从未跑过 → null（区别于「跑过但跳过」）', () => {
    expect(readSeedRecord()).toBeNull()
  })

  it('写入后读回 docId', () => {
    writeSeedRecord('doc-1')
    expect(readSeedRecord()?.docId).toBe('doc-1')
    expect(readSeedRecord()?.createdAt).toBeGreaterThan(0)
  })

  it('空串 docId 表示「老用户，跳过播种」，仍是已判过的记录', () => {
    writeSeedRecord('')
    const rec = readSeedRecord()
    expect(rec).not.toBeNull()
    expect(rec?.docId).toBe('')
  })

  it('损坏的 JSON 按未跑过处理，不抛错', () => {
    localStorage.setItem(FIRST_RUN_SEED_KEY, '{oops')
    expect(readSeedRecord()).toBeNull()
  })

  it('结构不对（缺 docId）也按未跑过处理', () => {
    localStorage.setItem(FIRST_RUN_SEED_KEY, JSON.stringify({ createdAt: 1 }))
    expect(readSeedRecord()).toBeNull()
  })
})
