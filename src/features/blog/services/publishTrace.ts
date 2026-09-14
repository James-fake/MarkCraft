/**
 * P1-3 发布后本地留痕
 *
 * 每次成功生成站点后，把「已发布文章」写入本地（localStorage），
 * 形成发布时间线，供 UI 展示「发布留痕」。仅本地、不上云。
 * 在测试 / 无 localStorage 环境下优雅降级为内存空实现，不影响主流程。
 */
import type { PostStatus } from './postStatus'

export interface PublishTraceEntry {
  /** 文章 slug（唯一键） */
  slug: string
  title: string
  status: PostStatus
  /** 发布时刻（ISO 8601）；缺省用 now 补齐 */
  publishedAt: string
  /** 所属系列（可选） */
  series?: string
}

const STORAGE_KEY = 'markcraft.blog.publishTrace'

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** 读取发布留痕，按时间倒序；异常或缺失返回空数组 */
export function getPublishLog(): PublishTraceEntry[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (e): e is PublishTraceEntry =>
        e && typeof e.slug === 'string' && typeof e.title === 'string',
    )
  } catch {
    return []
  }
}

/**
 * 写入一批发布留痕：按 slug 合并（已存在则更新 publishedAt/状态），
 * 最终按时间倒序持久化。返回合并后的完整日志。
 */
export function recordPublish(
  entries: PublishTraceEntry[],
  now: Date = new Date(),
): PublishTraceEntry[] {
  const merged = new Map<string, PublishTraceEntry>()
  for (const e of getPublishLog()) merged.set(e.slug, e)

  for (const e of entries) {
    if (!e || typeof e.slug !== 'string') continue
    merged.set(e.slug, {
      ...e,
      publishedAt: e.publishedAt || now.toISOString(),
    })
  }

  const result = [...merged.values()].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )

  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(result))
    } catch {
      // 写入失败（如隐私模式）忽略，不影响发布主流程
    }
  }
  return result
}

/** 清空发布留痕 */
export function clearPublishTrace(): void {
  const storage = getStorage()
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      // 忽略
    }
  }
}
