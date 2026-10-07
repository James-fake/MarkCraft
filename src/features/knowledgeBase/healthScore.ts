/**
 * 知识库健康度评分
 *
 * 四个维度（各 25 分）：
 * 1. 链接密度：平均链接数 / 目标值（>2 为满分）
 * 2. 孤立率：1 - (孤立文件数 / 总文件数)
 * 3. 标签覆盖度：有标签的文件比例
 * 4. 更新活跃度：30 天内有更新的文件比例
 */
import type { FileNode } from '../../types/fileManager'

export interface HealthBreakdown {
  total: number
  linkScore: number
  orphanScore: number
  tagScore: number
  activeScore: number
  details: {
    avgLinks: number
    orphanCount: number
    orphanRate: number
    taggedCount: number
    tagCoverage: number
    activeCount: number
    activeRate: number
  }
}

export function calculateKbHealth(
  files: FileNode[],
  getBacklinks: (fileId: string) => string[],
  getOutgoingLinks: (fileId: string) => string[],
  getTagsForFile: (fileId: string) => string[]
): HealthBreakdown {
  if (files.length === 0) {
    return {
      total: 0,
      linkScore: 0,
      orphanScore: 0,
      tagScore: 0,
      activeScore: 0,
      details: {
        avgLinks: 0,
        orphanCount: 0,
        orphanRate: 0,
        taggedCount: 0,
        tagCoverage: 0,
        activeCount: 0,
        activeRate: 0,
      },
    }
  }

  // 1. 链接密度 + 孤立文件统计
  let totalLinks = 0
  let orphanCount = 0
  for (const f of files) {
    const backlinks = getBacklinks(f.id)
    const outgoing = getOutgoingLinks(f.id)
    const linkCount = backlinks.length + outgoing.length
    totalLinks += linkCount
    if (linkCount === 0) orphanCount++
  }
  const avgLinks = totalLinks / files.length
  const linkScore = Math.min(25, (avgLinks / 2) * 25)

  // 2. 孤立率
  const orphanRate = orphanCount / files.length
  const orphanScore = (1 - orphanRate) * 25

  // 3. 标签覆盖度
  let taggedCount = 0
  for (const f of files) {
    const tags = getTagsForFile(f.id)
    if (tags.length > 0) taggedCount++
  }
  const tagCoverage = taggedCount / files.length
  const tagScore = tagCoverage * 25

  // 4. 更新活跃度
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  let activeCount = 0
  for (const f of files) {
    if (f.updatedAt > thirtyDaysAgo) activeCount++
  }
  const activeRate = activeCount / files.length
  const activeScore = activeRate * 25

  return {
    total: Math.round(linkScore + orphanScore + tagScore + activeScore),
    linkScore: Math.round(linkScore),
    orphanScore: Math.round(orphanScore),
    tagScore: Math.round(tagScore),
    activeScore: Math.round(activeScore),
    details: {
      avgLinks: Math.round(avgLinks * 100) / 100,
      orphanCount,
      orphanRate: Math.round(orphanRate * 100) / 100,
      taggedCount,
      tagCoverage: Math.round(tagCoverage * 100) / 100,
      activeCount,
      activeRate: Math.round(activeRate * 100) / 100,
    },
  }
}

/** 获取健康度等级标签 */
export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '健康', color: '#22c55e' }
  if (score >= 60) return { label: '良好', color: '#f59e0b' }
  if (score >= 40) return { label: '待整理', color: '#ef4444' }
  return { label: '需关注', color: '#dc2626' }
}
