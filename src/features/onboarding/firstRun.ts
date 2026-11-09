/**
 * 首启播种的持久状态（localStorage 级）。
 *
 * 为什么允许丢：这些标记只决定「要不要再播种一次」，丢了顶多重看一遍，不承载任何
 * 用户数据，故不进 userData/storage 的磁盘 KV（那里放的是文件树等真相源）。
 *
 * 为什么不复用 WelcomePanel 的 `markcraft.firstLaunch`：那是「安装年龄」的起算时间戳，
 * 语义不同 —— 它永远存在，无法表达「播种跑过没有」。
 */
export const FIRST_RUN_SEED_KEY = 'markcraft.firstRunSeed.v1'

export interface SeedRecord {
  /** 已创建的欢迎笔记 id；空串表示「用户本来就有笔记，跳过播种」 */
  docId: string
  createdAt: number
}

/** 读播种记录；从未跑过 → null（注意：与「跑过但跳过了」不同，后者返回 docId:''） */
export function readSeedRecord(): SeedRecord | null {
  try {
    const raw = localStorage.getItem(FIRST_RUN_SEED_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SeedRecord> | null
    if (!parsed || typeof parsed.docId !== 'string') return null
    return {
      docId: parsed.docId,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : 0,
    }
  } catch {
    // 隐私模式 / 存储被禁用：按「没跑过」处理，最多重复一次播种（有同名兜底）
    return null
  }
}

export function writeSeedRecord(docId: string): void {
  try {
    const record: SeedRecord = { docId, createdAt: Date.now() }
    localStorage.setItem(FIRST_RUN_SEED_KEY, JSON.stringify(record))
  } catch {
    /* 写不进去不影响本次结果 */
  }
}
