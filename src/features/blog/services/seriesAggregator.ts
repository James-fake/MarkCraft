/**
 * P1-3 系列聚合（纯函数）
 *
 * 从文章列表按 `series` 字段自动聚合出「系列 → 文章组」，
 * 组内按 seriesOrder / 日期排序，并生成 URL slug。
 * 仍允许调用方传入 seriesConfig 提供的描述 / 封面（按系列名匹配）。
 */
import type { BlogPost } from '../templates'
import { slugifyTitle } from './seoMeta'

export interface SeriesGroup {
  /** 系列原始名称（与文章 series 字段一致） */
  name: string
  /** URL slug（由名称派生） */
  slug: string
  description?: string
  coverImage?: string
  /** 组内已排序文章 */
  posts: BlogPost[]
}

export interface CollectSeriesOptions {
  /** 系列名 → 描述（来自 BlogConfig.seriesConfig） */
  descriptions?: Record<string, string | undefined>
  /** 系列名 → 封面（来自 BlogConfig.seriesConfig） */
  covers?: Record<string, string | undefined>
}

/** 由系列名派生 URL slug */
export function seriesSlug(name: string): string {
  return slugifyTitle(name)
}

function sortSeriesPosts(a: BlogPost, b: BlogPost): number {
  // seriesOrder 优先；缺省视为最大值（排到最后），保证两组混合时仍确定有序
  const oa = a.seriesOrder ?? Number.MAX_SAFE_INTEGER
  const ob = b.seriesOrder ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  // 同序（或无序）时按日期倒序
  if (!a.date && !b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return b.date.localeCompare(a.date)
}

/**
 * 聚合系列：仅收集带 `series` 字段的文章，按名称分组、组内排序，
 * 再按系列名做稳定排序（保证输出顺序确定、可测试）。
 * 不改变入参。
 */
export function collectSeries(
  posts: BlogPost[],
  options: CollectSeriesOptions = {},
): SeriesGroup[] {
  const map = new Map<string, BlogPost[]>()
  for (const post of posts) {
    if (!post.series) continue
    const list = map.get(post.series) || []
    list.push(post)
    map.set(post.series, list)
  }

  const groups: SeriesGroup[] = []
  for (const [name, list] of map) {
    groups.push({
      name,
      slug: seriesSlug(name),
      description: options.descriptions?.[name],
      coverImage: options.covers?.[name],
      posts: [...list].sort(sortSeriesPosts),
    })
  }

  groups.sort((a, b) => a.name.localeCompare(b.name))
  return groups
}

/**
 * 将 SeriesGroup[] 转换成模板层 generateSeriesHtml 所需的 SeriesConfig[]。
 * 仅保留模板依赖的字段（name / slug / description / coverImage）。
 */
export function groupsToSeriesConfig(groups: SeriesGroup[]) {
  return groups.map(g => ({
    name: g.name,
    slug: g.slug,
    description: g.description,
    coverImage: g.coverImage,
  }))
}
