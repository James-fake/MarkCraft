/**
 * 忽略的自动链接持久化（P1-8）
 *
 * 按画布隔离存储，记录用户"忽略"的自动连线，
 * 下次同步时不再生成。
 */
import { kvGet, kvSet } from '@core/storage/kv'
import type { IgnoredLink } from '../types'

// 存储介质已从 IndexedDB 换成磁盘 KV（见 @core/storage/backend）

function keyFor(canvasId: string): string {
  return `canvas-v2-ignored-links-${canvasId}`
}

/** 获取指定画布的忽略列表 */
export async function getIgnoredLinks(canvasId: string): Promise<IgnoredLink[]> {
  try {
    const raw = await kvGet(keyFor(canvasId))
    if (!raw) return []
    return JSON.parse(raw) as IgnoredLink[]
  } catch {
    return []
  }
}

/** 添加一条忽略记录 */
export async function addIgnoredLink(canvasId: string, link: IgnoredLink): Promise<void> {
  const list = await getIgnoredLinks(canvasId)
  // 去重
  if (list.some(l => l.fromFileId === link.fromFileId && l.toFileId === link.toFileId)) return
  list.push(link)
  await kvSet(keyFor(canvasId), JSON.stringify(list))
}

/** 移除一条忽略记录 */
export async function removeIgnoredLink(canvasId: string, from: string, to: string): Promise<void> {
  const list = await getIgnoredLinks(canvasId)
  const filtered = list.filter(l => !(l.fromFileId === from && l.toFileId === to))
  await kvSet(keyFor(canvasId), JSON.stringify(filtered))
}

/** 清空指定画布的忽略列表 */
export async function clearIgnoredLinks(canvasId: string): Promise<void> {
  await kvSet(keyFor(canvasId), JSON.stringify([]))
}
