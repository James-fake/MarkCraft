/**
 * P1-3 文章发布状态机
 *
 * 三态：draft（草稿）/ pending（待发布）/ published（已发布）。
 * - FrontMatter 的 `status` 字段优先；缺省时回退 `draft` 布尔；再缺省为 published。
 * - 定时发布：`publishDate` 晚于当前时刻时，即便 status=published 也视为「尚未发布」。
 * 全部为纯函数，不依赖 DOM 与网络。
 */

export type PostStatus = 'draft' | 'pending' | 'published'

const VALID_STATUSES: PostStatus[] = ['draft', 'pending', 'published']

/** 前置元数据的极简结构（兼容 FrontMatter 任意字段） */
export interface PostFrontMatter {
  status?: unknown
  draft?: unknown
  [key: string]: unknown
}

/**
 * 允许的状态迁移表（任意态均可显式切换到其它态，但列表用于 UI 提示「下一步可去哪」）。
 * 设计上不限制来回切换，保证用户可自由改稿/重发/撤回。
 */
export const STATUS_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['pending', 'published', 'draft'],
  pending: ['draft', 'published', 'pending'],
  published: ['draft', 'pending', 'published'],
}

/** 规范化任意输入为合法 PostStatus，非法值回退 published */
export function normalizeStatus(value: unknown): PostStatus {
  if (typeof value === 'string' && (VALID_STATUSES as string[]).includes(value)) {
    return value as PostStatus
  }
  return 'published'
}

/**
 * 从 FrontMatter 推导发布状态：
 * 1. `status` 字段合法 → 直接采用（权威，压过 draft）
 * 2. `draft: true` → draft
 * 3. 其他 → published（缺省即视为已发布）
 */
export function derivePostStatus(fm: PostFrontMatter): PostStatus {
  if (typeof fm.status === 'string' && (VALID_STATUSES as string[]).includes(fm.status)) {
    return fm.status as PostStatus
  }
  if (fm.draft === true) return 'draft'
  return 'published'
}

/** 是否允许从 from 切换到 to */
export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

/** 给定当前态，下一步可切换到的目标态（去重自身） */
export function nextStatuses(from: PostStatus): PostStatus[] {
  return STATUS_TRANSITIONS[from].filter(s => s !== from)
}

/**
 * 是否计入「已发布」：
 * - status 必须为 published
 * - 若存在 publishDate 且晚于 now，则视为定时未到，不计入
 */
export function isPublished(
  status: PostStatus,
  publishDate?: string,
  now: Date = new Date(),
): boolean {
  if (status !== 'published') return false
  if (publishDate) {
    const d = new Date(publishDate)
    if (!Number.isNaN(d.getTime()) && d.getTime() > now.getTime()) return false
  }
  return true
}

/** 状态展示文案（zh / en） */
export function statusLabel(status: PostStatus, lang: 'zh' | 'en' = 'zh'): string {
  const map: Record<'zh' | 'en', Record<PostStatus, string>> = {
    zh: { draft: '草稿', pending: '待发布', published: '已发布' },
    en: { draft: 'Draft', pending: 'Pending', published: 'Published' },
  }
  return map[lang][status]
}

/** 状态顺序权重（用于列表排序：已发布在前，待发布次之，草稿最后） */
export function statusRank(status: PostStatus): number {
  return status === 'published' ? 0 : status === 'pending' ? 1 : 2
}
