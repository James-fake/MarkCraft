/**
 * 定期回顾报告生成模块
 * 根据周期统计知识库文件变化，生成 Markdown 回顾报告
 */
import { getAiService } from './ai/aiService'
import type { KnowledgeBase, ReviewSchedule } from '../../stores/kbTypes'
import type { FileNode } from '../../types/fileManager'

/** 计算内容的字数（中文按字，英文按词） */
function countWords(content: string): number {
  if (!content) return 0
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(Boolean)).length
  return cn + en
}

/** 周期对应的天数 */
function periodDays(period: 'weekly' | 'monthly'): number {
  return period === 'weekly' ? 7 : 30
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 生成回顾报告
 * @param kb 知识库
 * @param files 知识库包含的文件列表
 * @param period 周期：weekly（近 7 天）或 monthly（近 30 天）
 * @returns Markdown 格式的回顾报告
 */
export async function generateReview(
  kb: KnowledgeBase,
  files: FileNode[],
  period: 'weekly' | 'monthly'
): Promise<string> {
  const now = Date.now()
  const days = periodDays(period)
  const since = now - days * 24 * 60 * 60 * 1000

  // 筛选周期内有变动的文件（基于 updatedAt）
  const activeFiles = files.filter(f => f.updatedAt >= since)

  // 新增文件：createdAt 落在周期内
  const newFiles = activeFiles.filter(f => f.createdAt >= since)
  // 修改文件：updatedAt 在周期内，但创建时间早于周期
  const modifiedFiles = activeFiles.filter(f => f.createdAt < since)

  // 新增字数（仅统计新增文件内容；修改文件按当前内容估算增量较困难，这里统计其总字数作为参考）
  const newWords = newFiles.reduce((sum, f) => sum + countWords(f.content ?? ''), 0)
  const modifiedWords = modifiedFiles.reduce((sum, f) => sum + countWords(f.content ?? ''), 0)

  // 汇总所有变动文件内容用于 AI 摘要
  const corpus = activeFiles
    .map(f => `## ${f.name}\n${f.content ?? ''}`)
    .join('\n\n')
    .slice(0, 8000) // 限制长度，避免过长

  // 可选：调用 AI 生成自然语言回顾
  let aiSummary = ''
  try {
    if (corpus.trim().length > 0) {
      const ai = getAiService()
      if (ai.isReady()) {
        aiSummary = await ai.summarize(
          `知识库「${kb.name}」在最近 ${days} 天共有 ${activeFiles.length} 个文件变动。\n\n${corpus}`,
          300
        )
      }
    }
  } catch (err) {
    console.error('[KB] AI 摘要生成失败:', err)
    aiSummary = ''
  }

  // 组装 Markdown 报告
  const periodLabel = period === 'weekly' ? '周报' : '月报'
  const lines: string[] = []
  lines.push(`# ${kb.name} · ${periodLabel}`)
  lines.push('')
  lines.push(`> 统计区间：${formatDate(since)} ~ ${formatDate(now)}`)
  lines.push('')

  // 统计表格
  lines.push('## 统计概览')
  lines.push('')
  lines.push('| 指标 | 数值 |')
  lines.push('| --- | --- |')
  lines.push(`| 变动文件总数 | ${activeFiles.length} |`)
  lines.push(`| 新增文件数 | ${newFiles.length} |`)
  lines.push(`| 修改文件数 | ${modifiedFiles.length} |`)
  lines.push(`| 新增字数 | ${newWords.toLocaleString()} |`)
  lines.push(`| 修改文件字数（当前） | ${modifiedWords.toLocaleString()} |`)
  lines.push(`| 知识库总文件数 | ${files.length} |`)
  lines.push('')

  // 新增文件列表
  if (newFiles.length > 0) {
    lines.push('## 新增文件')
    lines.push('')
    for (const f of [...newFiles].sort((a, b) => b.createdAt - a.createdAt)) {
      lines.push(`- **${f.name}** — ${formatDate(f.createdAt)}（${countWords(f.content ?? '').toLocaleString()} 字）`)
    }
    lines.push('')
  }

  // 修改文件列表
  if (modifiedFiles.length > 0) {
    lines.push('## 修改文件')
    lines.push('')
    for (const f of [...modifiedFiles].sort((a, b) => b.updatedAt - a.updatedAt)) {
      lines.push(`- **${f.name}** — 最近更新 ${formatDate(f.updatedAt)}（当前 ${countWords(f.content ?? '').toLocaleString()} 字）`)
    }
    lines.push('')
  }

  // AI 摘要
  if (aiSummary) {
    lines.push('## AI 摘要')
    lines.push('')
    lines.push(aiSummary)
    lines.push('')
  } else if (activeFiles.length === 0) {
    lines.push('## 说明')
    lines.push('')
    lines.push(`本周期内（${formatDate(since)} ~ ${formatDate(now)}）知识库没有文件变动。`)
    lines.push('')
  }

  // 任务进度（如果有）
  if (kb.tasks && kb.tasks.length > 0) {
    const doneCount = kb.tasks.filter(t => t.status === 'done').length
    lines.push('## 任务进度')
    lines.push('')
    lines.push(`已完成 ${doneCount} / ${kb.tasks.length} 项任务。`)
    lines.push('')
  }

  // 学习路径进度（如果有）
  if (kb.learningPath && kb.learningPath.length > 0) {
    const completed = kb.learningPath.filter(p => p.status === 'completed').length
    lines.push('## 学习路径')
    lines.push('')
    lines.push(`已完成 ${completed} / ${kb.learningPath.length} 个学习节点。`)
    lines.push('')
  }

  lines.push('---')
  lines.push(`*生成时间：${new Date(now).toLocaleString('zh-CN')}*`)

  return lines.join('\n')
}

/**
 * 检查是否到了回顾时间
 * @param kb 知识库
 * @returns 是否应当进行回顾
 */
export function checkReviewDue(kb: KnowledgeBase): boolean {
  const schedule = kb.reviewSchedule
  if (!schedule || !schedule.enabled) return false
  if (!schedule.nextReviewAt) return false
  return Date.now() >= schedule.nextReviewAt
}

/**
 * 计算下次回顾时间戳
 * @param schedule 回顾配置
 * @returns 下次回顾的时间戳（毫秒）
 */
export function calculateNextReview(schedule: ReviewSchedule): number {
  const now = new Date()
  const days = periodDays(schedule.frequency)

  if (schedule.frequency === 'weekly' && schedule.dayOfWeek != null) {
    // 周回顾：定位到本周指定星期几的 09:00
    const target = new Date(now)
    const currentDay = now.getDay()
    let diff = schedule.dayOfWeek - currentDay
    if (diff < 0) diff += 7
    if (diff === 0 && now.getHours() >= 9) {
      // 今天已过回顾时间，推到下周
      diff = 7
    }
    target.setDate(now.getDate() + diff)
    target.setHours(9, 0, 0, 0)
    return target.getTime()
  }

  if (schedule.frequency === 'monthly' && schedule.dayOfMonth != null) {
    // 月回顾：定位到本月或下月指定日期的 09:00
    const target = new Date(now)
    let year = now.getFullYear()
    let month = now.getMonth()
    let day = Math.min(schedule.dayOfMonth, getMonthDays(year, month))
    // 若本月指定日期已过，推到下月
    const candidate = new Date(year, month, day, 9, 0, 0, 0)
    if (candidate.getTime() <= now.getTime()) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
      day = Math.min(schedule.dayOfMonth, getMonthDays(year, month))
    }
    target.setFullYear(year, month, day)
    target.setHours(9, 0, 0, 0)
    return target.getTime()
  }

  // 兜底：从当前时间往后推一个周期
  return now.getTime() + days * 24 * 60 * 60 * 1000
}

/** 获取某年某月的天数 */
function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
