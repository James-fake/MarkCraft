export interface DocumentStats {
  wordCountTextMode: number
  wordCountStandardMode: number
  charCount: number
  lineCount: number
  readingTimeMinutes: number
}

export function calculateStats(text: string): DocumentStats {
  const charCount = text.length

  const wordCountStandardMode = text.replace(/\n/g, '').length

  const wordCountTextMode = text.replace(/\s+/g, '').length

  const lines = text.split('\n')
  const lineCount = lines.length

  return {
    wordCountTextMode,
    wordCountStandardMode,
    charCount,
    lineCount,
    readingTimeMinutes: estimateReadingTime(text),
  }
}

/**
 * 估算阅读时间（分钟）
 * 中文按 500 字/分钟，英文按 200 词/分钟，混合内容取加权平均
 */
export function estimateReadingTime(text: string): number {
  if (!text.trim()) return 0

  // 分离中文字符和英文单词
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const englishWords = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && /[a-zA-Z]/.test(w)).length

  const chineseMinutes = chineseChars / 500
  const englishMinutes = englishWords / 200

  const totalMinutes = chineseMinutes + englishMinutes
  return Math.max(Math.ceil(totalMinutes), 1)
}

/**
 * 统计「字数」：中文按字符计、拉丁按词计（与中文写作习惯一致）。
 * 用于写作目标进度等场景（与纯字符数区分）。
 */
export function countWords(text: string): number {
  if (!text) return 0
  const cjk = (text.match(/[一-龥]/g) || []).length
  const latin = text.replace(/[一-龥]/g, ' ')
    .match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []
  return cjk + latin.length
}
