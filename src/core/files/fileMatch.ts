/**
 * 笔记名的**匹配与排序**（补全列表共用）。
 *
 * 放在 `@core/files` 的原因：两种编辑模式各有一套补全实现，此前匹配规则各写一份
 * （都是 `name.toLowerCase().includes(query)` 且**返回遍历顺序**）：
 *   - 所见即所得：`useLinkIndexQueries.searchFiles`
 *   - 源码模式：`cm6/autocompleteExtension` 里的 `getFileNamesFromStorage().filter(...)`
 * 行为随时会漂移。这里统一为单一来源，两边都转成 `FileMatchCandidate` 后调用。
 *
 * 排序规则（2026-10-11 优化）：
 *   精确 > 前缀 > 子串；同分再按「最近打开 > 被引用多 > 同目录 > 命中更靠前/名字更短」。
 *   原实现没有排序，输入完整文件名时它不一定排第一 —— 补全就得上下翻找。
 */

import { hasKnownInitials, initialsOf } from './pinyinInitials'

/** 匹配强度：数字越小越优先（预留了拼音两档，见下方注释） */
export const MATCH = {
  EXACT: 0,
  PREFIX: 1,
  /** 拼音首字母命中，如 `gz` → 「工作总结」（由 `pinyinInitials` 提供） */
  PINYIN_INITIALS: 2,
  /** 拼音全拼命中，如 `gongzuo` → 「工作总结」 */
  PINYIN_FULL: 3,
  SUBSTRING: 4,
} as const

export type MatchStrength = (typeof MATCH)[keyof typeof MATCH]

/** 补全候选的最小信息 —— 两侧各自的数据都能转成它 */
export interface FileMatchCandidate {
  id: string
  /** 文件名（可带 .md，内部统一去掉后缀再比较） */
  name: string
  /** 所在目录（用于「同目录优先」与列表展示） */
  dir?: string
  /** 被引用次数：越热门越可能是你要找的那篇 */
  backlinkCount?: number
  /** 最近修改时间（毫秒），用于列表展示 */
  updatedAt?: number
}

/** 排序信号（不参与匹配，只影响同分时的先后） */
export interface FileMatchSignals {
  /** 最近打开的文件 id，越靠前越优先 */
  recentFileIds?: string[]
  /** 当前编辑文件所在目录（同目录的笔记优先） */
  currentDir?: string
}

/**
 * 去掉 `.md` 后缀。
 *
 * ⚠️ 单一来源：原实现在 `@stores/linkIndexShared`，此处下沉（core 被 stores 与 features
 *    两侧依赖），旧路径保留 re-export，既有导入不变。
 */
export function stripMdExtension(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/**
 * 名字与查询的匹配强度；不匹配返回 -1。
 *
 * 强度顺序：精确 > 前缀 > **拼音首字母** > 子串。
 * 拼音放在子串**之前**：`gz` 命中「工作总结」比某个名字里恰好含 "gz" 的笔记更可能是目标。
 */
function matchStrength(query: string, name: string): number {
  if (!query) return MATCH.SUBSTRING
  if (name === query) return MATCH.EXACT
  if (name.startsWith(query)) return MATCH.PREFIX

  // 拼音首字母（如 `gz` → 「工作总结」）。
  // 仅当查询是**纯 ASCII 且至少 2 个字符**时才启用：
  // 单字母会命中大量不相干的笔记（「阿」「白」…都算首字母 a/b），噪声过大。
  if (query.length >= 2 && /^[a-z0-9]+$/.test(query) && hasKnownInitials(name)) {
    const initials = initialsOf(name)
    if (initials === query || initials.startsWith(query)) return MATCH.PINYIN_INITIALS
  }

  if (name.includes(query)) return MATCH.SUBSTRING
  return -1
}

/**
 * 按相关度过滤 + 排序。
 *
 * @param query 用户输入（可含 .md，会被去掉）
 * @param candidates 候选笔记
 * @param signals 排序信号（最近打开 / 当前目录）
 * @returns 排序后的候选（不含被过滤掉的）；**空查询原样返回**（补全刚弹出时应按「最近」展示，由调用方决定）
 */
export function rankFileMatches<T extends FileMatchCandidate>(
  query: string,
  candidates: T[],
  signals: FileMatchSignals = {},
): T[] {
  const q = stripMdExtension(query.trim()).toLowerCase()
  if (!q) return [...candidates]

  const recentIndex = new Map<string, number>()
  for (const [i, id] of (signals.recentFileIds ?? []).entries()) {
    if (!recentIndex.has(id)) recentIndex.set(id, i)
  }

  const scored: Array<{ item: T; strength: number; name: string }> = []
  for (const item of candidates) {
    const name = stripMdExtension(item.name).toLowerCase()
    const strength = matchStrength(q, name)
    if (strength < 0) continue
    scored.push({ item, strength, name })
  }

  const NO_RECENT = Number.MAX_SAFE_INTEGER
  scored.sort((a, b) => {
    // ① 匹配强度
    if (a.strength !== b.strength) return a.strength - b.strength
    // ② 最近打开
    const ra = recentIndex.get(a.item.id) ?? NO_RECENT
    const rb = recentIndex.get(b.item.id) ?? NO_RECENT
    if (ra !== rb) return ra - rb
    // ③ 被引用得多（枢纽笔记更可能是目标）
    const ba = a.item.backlinkCount ?? 0
    const bb = b.item.backlinkCount ?? 0
    if (ba !== bb) return bb - ba
    // ④ 同目录优先
    if (signals.currentDir) {
      const sa = a.item.dir === signals.currentDir ? 0 : 1
      const sb = b.item.dir === signals.currentDir ? 0 : 1
      if (sa !== sb) return sa - sb
    }
    // ⑤ 命中更靠前、名字更短
    const ia = a.name.indexOf(q)
    const ib = b.name.indexOf(q)
    if (ia !== ib) return ia - ib
    return a.name.length - b.name.length
  })

  return scored.map((s) => s.item)
}
