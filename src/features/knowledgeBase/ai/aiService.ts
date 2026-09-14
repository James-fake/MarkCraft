/**
 * AI 服务（双引擎：本地 TF-IDF + 可选远程 API）
 *
 * 默认使用本地 TF-IDF 引擎，不依赖外部模型下载。
 * 用户可配置远程 API 启用高级功能。
 * 所有 AI 功能在本地引擎不可用时降级为关键词/统计方案。
 */
import type { AiSettings } from '@stores/kbTypes'

// ─── 接口定义 ───

export interface AiService {
  isReady(): boolean
  embed(text: string): Promise<number[]>
  summarize(text: string, maxLen?: number): Promise<string>
  chat(question: string, context: string): Promise<{ answer: string; sources: string[] }>
}

// ─── 中文分词工具 ───

/** 简单的中英文分词（不依赖外部库） */
export function tokenize(text: string): string[] {
  // 去除 markdown 标记
  const clean = text.replace(/[#*`~[\]()!>|-]/g, ' ').replace(/\n+/g, ' ')
  const tokens: string[] = []
  // 英文：按空格分词
  const englishWords = clean.match(/[a-zA-Z]{2,}/g) || []
  tokens.push(...englishWords.map(w => w.toLowerCase()))
  // 中文：2-gram 分词
  const chineseSegments = clean.match(/[\u4e00-\u9fa5]+/g) || []
  for (const segment of chineseSegments) {
    for (let i = 0; i < segment.length - 1; i++) {
      tokens.push(segment.substring(i, i + 2))
    }
    if (segment.length === 1) tokens.push(segment)
  }
  return tokens.filter(t => t.length > 0)
}

// ─── TF-IDF 引擎（默认本地引擎） ───

const EMBEDDING_DIM = 384

/** 将字符串 hash 到固定维度 */
function hashToDim(token: string, dim: number): number {
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % dim
}

class TfidfEngine implements AiService {
  private ready = true

  isReady(): boolean {
    return this.ready
  }

  /**
   * 生成本地伪向量：将词频 hash 到固定维度（EMBEDDING_DIM=384）的近似表示。
   * 注意：这不是语义向量，仅反映关键词/词频分布，用于本地统计相似度检索；
   * 无法捕捉真正的语义关系。远程引擎未配置或调用失败时会回退到此实现。
   * 因此 UI 层应明确标注为"本地统计检索"，而非"云端 AI 语义向量"。
   */
  async embed(text: string): Promise<number[]> {
    const tokens = tokenize(text)
    if (tokens.length === 0) {
      return new Array(EMBEDDING_DIM).fill(0)
    }
    // 词频统计
    const freq = new Map<string, number>()
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1)
    }
    // 映射到固定维度
    const vec = new Array(EMBEDDING_DIM).fill(0)
    for (const [token, count] of freq) {
      const idx = hashToDim(token, EMBEDDING_DIM)
      vec[idx] += count / tokens.length // TF 归一化
    }
    // L2 归一化
    let norm = 0
    for (const v of vec) norm += v * v
    norm = Math.sqrt(norm) || 1
    return vec.map(v => v / norm)
  }

  async summarize(text: string, maxLen = 200): Promise<string> {
    // 分句
    const sentences = text.split(/[。！？\n.!?]/).filter(s => s.trim().length > 5)
    if (sentences.length === 0) return text.substring(0, maxLen)
    if (sentences.length === 1) return sentences[0].trim().substring(0, maxLen)

    // 计算每个句子的词频得分
    const sentenceTokens = sentences.map(s => tokenize(s))
    const allTokens = sentenceTokens.flat()
    const globalFreq = new Map<string, number>()
    for (const t of allTokens) {
      globalFreq.set(t, (globalFreq.get(t) ?? 0) + 1)
    }

    // 句子评分 = 词频均值 * 位置权重（开头更重要）
    const scores = sentences.map((s, i) => {
      const tokens = sentenceTokens[i]
      let score = 0
      for (const t of tokens) {
        score += globalFreq.get(t) ?? 0
      }
      score /= tokens.length || 1
      const positionWeight = i < sentences.length / 3 ? 1.5 : 1
      return { sentence: s, score: score * positionWeight, index: i }
    })

    // 选取得分最高的句子，保持原文顺序
    const topN = Math.min(3, sentences.length)
    const topSentences = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence.trim())

    const summary = topSentences.join('。')
    return summary.length > maxLen ? summary.substring(0, maxLen) + '...' : summary
  }

  async chat(question: string, context: string): Promise<{ answer: string; sources: string[] }> {
    // 基于 TF-IDF 的简单问答：在 context 中找到最相关的段落
    const questionTokens = new Set(tokenize(question))
    const paragraphs = context.split(/\n\n+/).filter(p => p.trim().length > 10)

    if (paragraphs.length === 0) {
      return { answer: '未找到相关内容', sources: [] }
    }

    // 计算每个段落与问题的相似度
    const scores = paragraphs.map(p => {
      const pTokens = tokenize(p)
      let overlap = 0
      for (const t of pTokens) {
        if (questionTokens.has(t)) overlap++
      }
      return { paragraph: p, score: overlap / Math.sqrt(pTokens.length || 1) }
    })

    const best = scores.sort((a, b) => b.score - a.score)[0]
    if (best.score === 0) {
      return { answer: '未找到与问题相关的内容', sources: [] }
    }

    const summary = await this.summarize(best.paragraph, 300)
    return { answer: summary, sources: [best.paragraph.substring(0, 100) + '...'] }
  }
}

// ─── 远程 API 引擎 ───

class RemoteEngine implements AiService {
  private settings: AiSettings

  constructor(settings: AiSettings) {
    this.settings = settings
  }

  isReady(): boolean {
    return !!(this.settings.remoteBaseUrl && this.settings.remoteApiKey)
  }

  async embed(text: string): Promise<number[]> {
    if (!this.isReady()) return new TfidfEngine().embed(text)
    try {
      const response = await fetch(`${this.settings.remoteBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.remoteApiKey}`,
        },
        body: JSON.stringify({
          model: this.settings.remoteModel || 'text-embedding-3-small',
          input: text,
        }),
      })
      const data = await response.json()
      return data.data?.[0]?.embedding ?? new Array(EMBEDDING_DIM).fill(0)
    } catch {
      return new TfidfEngine().embed(text)
    }
  }

  async summarize(text: string, maxLen = 200): Promise<string> {
    if (!this.isReady()) return new TfidfEngine().summarize(text, maxLen)
    try {
      const response = await fetch(`${this.settings.remoteBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.remoteApiKey}`,
        },
        body: JSON.stringify({
          model: this.settings.remoteModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `请用不超过${maxLen}字总结以下内容的要点。` },
            { role: 'user', content: text },
          ],
          max_tokens: maxLen,
        }),
      })
      const data = await response.json()
      return data.choices?.[0]?.message?.content ?? new TfidfEngine().summarize(text, maxLen)
    } catch {
      return new TfidfEngine().summarize(text, maxLen)
    }
  }

  async chat(question: string, context: string): Promise<{ answer: string; sources: string[] }> {
    if (!this.isReady()) return new TfidfEngine().chat(question, context)
    try {
      const response = await fetch(`${this.settings.remoteBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.remoteApiKey}`,
        },
        body: JSON.stringify({
          model: this.settings.remoteModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '根据以下上下文回答问题。如果上下文中没有相关信息，请说明。' },
            { role: 'user', content: `上下文：\n${context}\n\n问题：${question}` },
          ],
        }),
      })
      const data = await response.json()
      const answer = data.choices?.[0]?.message?.content ?? '未获取到回答'
      return { answer, sources: [context.substring(0, 100)] }
    } catch {
      return new TfidfEngine().chat(question, context)
    }
  }
}

// ─── 工厂函数与全局单例 ───

let globalService: AiService | null = null

export function createAiService(settings?: AiSettings): AiService {
  if (settings?.mode === 'remote' && settings.remoteApiKey) {
    return new RemoteEngine(settings)
  }
  return new TfidfEngine()
}

export function getAiService(): AiService {
  if (!globalService) {
    globalService = createAiService()
  }
  return globalService
}

export function setAiService(service: AiService): void {
  globalService = service
}

// ─── 工具函数 ───

/** 计算两个向量的余弦相似度 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
