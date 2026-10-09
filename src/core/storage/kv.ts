import { getStorageBackend } from './backend'

/**
 * KV 读写 —— 替代原先直接使用 `db.kv`（IndexedDB/Dexie）的三处（fileService / kbStore / canvasStore）。
 * 存储介质见 `./backend`（桌面端 = `<userData>/storage/kv/*.json`；jsdom 单测 = 内存 Map）。
 */
export async function kvGet(key: string): Promise<string | null> {
  return (await getStorageBackend()).getText(key)
}

export async function kvSet(key: string, value: string): Promise<void> {
  await (await getStorageBackend()).setText(key, value)
}

export async function kvDelete(key: string): Promise<void> {
  await (await getStorageBackend()).remove(key)
}

/** 全部键（前缀过滤交给调用方） */
export async function kvKeys(): Promise<string[]> {
  return (await getStorageBackend()).keys()
}

/** 清空全部键（测试与「重置存储」用；对应原 `db.kv.clear()`） */
export async function kvClear(): Promise<void> {
  const backend = await getStorageBackend()
  for (const key of await backend.keys()) {
    await backend.remove(key)
  }
}
