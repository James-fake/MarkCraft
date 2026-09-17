import { useMemo } from 'react'
import { useFileManager } from '../../stores/FileStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useTagIndex } from '../../stores/TagIndexStore'
import { useBookmark } from '../../stores/BookmarkStore'
import { FileNode } from '../../types/fileManager'
import { collectAllFiles } from '@core/files/fileTree'

/** 计算字符数（中文按字，英文按词） */
export function countWords(content: string): number {
  if (!content) return 0
  const clean = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`~>-]/g, '')
  const chinese = (clean.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (clean.match(/[a-zA-Z]+/g) || []).length
  return chinese + english
}

const DAY = 24 * 60 * 60 * 1000

/** 周一作为一周起始 */
export function startOfWeek(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return date
}

/** 将大数字格式化为 k 单位 */
export function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return String(n)
}

export const DASHBOARD_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export type HeatLevel = '' | 'l1' | 'l2' | 'l3' | 'l4'

/** 将一天的写作字数映射为热力图等级（阈值沿用原仪表盘热力图配色口径） */
export function getHeatmapLevel(words: number): HeatLevel {
  if (words === 0) return ''
  if (words < 100) return 'l1'
  if (words < 500) return 'l2'
  if (words < 1500) return 'l3'
  return 'l4'
}

export interface DashboardTrendPoint {
  label: string
  notes: number
  words: number
  links: number
}

export interface DashboardData {
  allFiles: FileNode[]
  stats: {
    totalNotes: number
    totalWords: number
    totalLinks: number
    brokenLinks: number
    linkDensity: number
    brokenRate: number
    isolatedFiles: number
    isolatedRate: number
    totalTags: number
  }
  linkHealth: {
    brokenList: { target: string; count: number; files: string[] }[]
    orphan: FileNode[]
  }
  healthScore: number
  band: 'healthy' | 'warn' | 'poor'
  cloudTags: { tag: string; count: number }[]
  topBookmarks: { id: string; fileId: string; fileName: string; type: string; headingText?: string; groupName?: string; createdAt: number }[]
  heatmapData: { date: Date; count: number; words: number }[]
  agingData: { fresh: number; attention: number; aging: number; zombie: number }
  trendData: DashboardTrendPoint[]
  growthStats: {
    coverageRate: number
    linkSeries: number[]
    linkPeak: number
    linkLatest: number
    streak: number
  }
  tagDistribution: { tags: { tag: string; count: number }[]; total: number }
}

/**
 * 仪表盘真实数据层（单一数据源）。
 * 现存唯一消费者 = Aurora GraphPanel（链接健康：健康分 + 断链/孤立计数）。
 * 注：原「fixed 浮层仪表盘」与「Aurora Bento 仪表盘」两个 UI 已退役删除，本 hook 不随之消亡。
 */
export function useDashboardData(trendMode: 'month' | 'week'): DashboardData {
  const { rootFolder } = useFileManager()
  const { fileIndex, resolveTarget } = useLinkIndex()
  const { tagIndex } = useTagIndex()
  const { bookmarks } = useBookmark()

  const allFiles = useMemo(() => collectAllFiles(rootFolder), [rootFolder])
  const allFilesById = useMemo(() => {
    const m = new Map<string, FileNode>()
    for (const f of allFiles) m.set(f.id, f)
    return m
  }, [allFiles])

  // KPI 计算
  const stats = useMemo(() => {
    const totalNotes = allFiles.length
    const totalWords = allFiles.reduce((sum, f) => sum + countWords(f.content || ''), 0)
    let totalLinks = 0
    let brokenLinks = 0
    for (const [, entry] of fileIndex) {
      totalLinks += entry.outgoingLinks.length
      for (const link of entry.outgoingLinks) {
        if (!resolveTarget(link.target)) brokenLinks++
      }
    }
    const linkDensity = totalNotes > 0 ? totalLinks / totalNotes : 0
    const brokenRate = totalLinks > 0 ? brokenLinks / totalLinks : 0

    let isolatedFiles = 0
    for (const [, entry] of fileIndex) {
      if (entry.outgoingLinks.length === 0 && entry.backlinks.length === 0) {
        isolatedFiles++
      }
    }
    const isolatedRate = totalNotes > 0 ? isolatedFiles / totalNotes : 0

    return {
      totalNotes,
      totalWords,
      totalLinks,
      brokenLinks,
      linkDensity,
      brokenRate,
      isolatedFiles,
      isolatedRate,
      totalTags: tagIndex.size,
    }
  }, [allFiles, fileIndex, resolveTarget, tagIndex])

  // 链接健康紧凑数据：断链（按出现次数聚合）+ 孤立文件
  const linkHealth = useMemo(() => {
    const brokenMap = new Map<string, { count: number; files: Set<string> }>()
    const orphan: FileNode[] = []
    for (const [fileId, entry] of fileIndex) {
      if (entry.outgoingLinks.length === 0 && entry.backlinks.length === 0) {
        const f = allFilesById.get(fileId)
        if (f) orphan.push(f)
      }
      for (const link of entry.outgoingLinks) {
        if (!resolveTarget(link.target)) {
          const cur = brokenMap.get(link.target) || { count: 0, files: new Set() }
          cur.count++
          cur.files.add(fileId)
          brokenMap.set(link.target, cur)
        }
      }
    }
    const brokenList = Array.from(brokenMap.entries())
      .map(([target, v]) => ({ target, count: v.count, files: Array.from(v.files) }))
      .sort((a, b) => b.count - a.count)
    return { brokenList, orphan }
  }, [fileIndex, resolveTarget, allFilesById])

  // 综合健康分：断链与孤立各占权重
  const healthScore = Math.max(0, Math.min(100, Math.round(100 * (1 - stats.brokenRate * 0.6 - stats.isolatedRate * 0.4))))
  const band: 'healthy' | 'warn' | 'poor' = healthScore >= 85 ? 'healthy' : healthScore >= 60 ? 'warn' : 'poor'

  // 标签云紧凑数据（Top 14）
  const cloudTags = useMemo(() => {
    return Array.from(tagIndex.entries())
      .map(([tag, files]) => ({ tag, count: files.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14)
  }, [tagIndex])

  // 书签紧凑数据（最新 8 条）
  const topBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  }, [bookmarks])

  // 写作热力图数据（365天）
  const heatmapData = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const days: { date: Date; count: number; words: number }[] = []
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      days.push({ date, count: 0, words: 0 })
    }
    for (const file of allFiles) {
      const updateTime = file.updatedAt || file.createdAt || 0
      if (updateTime === 0) continue
      const fileDate = new Date(updateTime)
      fileDate.setHours(0, 0, 0, 0)
      const dayIdx = days.findIndex(d => d.date.getTime() === fileDate.getTime())
      if (dayIdx >= 0) {
        days[dayIdx].count++
        days[dayIdx].words += countWords(file.content || '')
      }
    }
    return days
  }, [allFiles])

  // 老化笔记分析
  const agingData = useMemo(() => {
    const now = Date.now()
    const buckets = { fresh: 0, attention: 0, aging: 0, zombie: 0 }
    for (const file of allFiles) {
      const updated = file.updatedAt || file.createdAt || 0
      const daysSince = (now - updated) / DAY
      if (daysSince <= 7) buckets.fresh++
      else if (daysSince <= 30) buckets.attention++
      else if (daysSince <= 90) buckets.aging++
      else buckets.zombie++
    }
    return buckets
  }, [allFiles])

  // 趋势图数据（按周/月聚合，最近12个周期），含 notes / words / links
  const trendData = useMemo(() => {
    const now = new Date()
    const buckets: DashboardTrendPoint[] = []

    if (trendMode === 'month') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        buckets.push({ label: `${d.getMonth() + 1}月`, notes: 0, words: 0, links: 0 })
      }
      for (const file of allFiles) {
        const updated = file.updatedAt || file.createdAt || 0
        if (updated === 0) continue
        const fileDate = new Date(updated)
        const monthDiff = (now.getFullYear() - fileDate.getFullYear()) * 12 + (now.getMonth() - fileDate.getMonth())
        if (monthDiff >= 0 && monthDiff < 12) {
          const idx = 11 - monthDiff
          buckets[idx].notes++
          buckets[idx].words += countWords(file.content || '')
          const entry = fileIndex.get(file.id)
          if (entry) buckets[idx].links += entry.outgoingLinks.length
        }
      }
    } else {
      const weekStartNow = startOfWeek(now)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(weekStartNow)
        d.setDate(d.getDate() - i * 7)
        buckets.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, notes: 0, words: 0, links: 0 })
      }
      for (const file of allFiles) {
        const updated = file.updatedAt || file.createdAt || 0
        if (updated === 0) continue
        const fileWeekStart = startOfWeek(new Date(updated))
        const weekDiff = Math.round((weekStartNow.getTime() - fileWeekStart.getTime()) / (7 * DAY))
        if (weekDiff >= 0 && weekDiff < 12) {
          const idx = 11 - weekDiff
          buckets[idx].notes++
          buckets[idx].words += countWords(file.content || '')
          const entry = fileIndex.get(file.id)
          if (entry) buckets[idx].links += entry.outgoingLinks.length
        }
      }
    }
    return buckets
  }, [allFiles, fileIndex, trendMode])

  // 成长反馈指标：面向用户的正向指标（覆盖率 / 连接数趋势 / 连续记录）
  const growthStats = useMemo(() => {
    const totalNotes = stats.totalNotes
    const coverageRate = totalNotes > 0 ? (totalNotes - stats.isolatedFiles) / totalNotes : 0
    const linkSeries = trendData.map(t => t.links)
    const linkPeak = linkSeries.length ? Math.max(...linkSeries) : 0
    const linkLatest = linkSeries.length ? linkSeries[linkSeries.length - 1] : 0
    // 连续记录天数：从今天往前，连续有更新的天数（基于热力图 365 天）
    let streak = 0
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) streak++
      else break
    }
    return { coverageRate, linkSeries, linkPeak, linkLatest, streak }
  }, [stats, trendData, heatmapData])

  // 标签使用分布（饼图数据）
  const tagDistribution = useMemo(() => {
    const tags = Array.from(tagIndex.entries())
      .map(([tag, files]) => ({ tag, count: files.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    const total = tags.reduce((sum, t) => sum + t.count, 0)
    return { tags, total }
  }, [tagIndex])

  return {
    allFiles,
    stats,
    linkHealth,
    healthScore,
    band,
    cloudTags,
    topBookmarks,
    heatmapData,
    agingData,
    trendData,
    growthStats,
    tagDistribution,
  }
}
