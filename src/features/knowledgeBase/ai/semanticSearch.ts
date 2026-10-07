/**
 * 语义检索模块（本地统计）
 * 基于本地词频 hash 向量的相似度检索（非云端 AI embedding），支持增量更新
 */
import { getAiService, cosineSimilarity } from './aiService'
import type { FileNode } from '@src/types/fileManager'

/**
 * 语义搜索引擎
 * 维护 fileId -> embedding 向量映射，支持 top-K 相似检索
 */
export class SemanticSearch {
  /** fileId -> embedding 向量 */
  private embeddings: Map<string, number[]> = new Map()
  /** fileId -> 文件内容快照（用于判断是否需要重新 embedding） */
  private contentHashes: Map<string, string> = new Map()

  /**
   * 构建所有文件的 embedding 索引
   * 已存在且内容未变的文件会跳过，避免重复计算
   */
  async buildIndex(files: FileNode[]): Promise<void> {
    const ai = getAiService()
    if (!ai.isReady()) return

    // 当前有效的 fileId 集合，用于清理过期索引
    const validIds = new Set(files.map(f => f.id))

    // 清理已不存在的文件索引
    for (const id of Array.from(this.embeddings.keys())) {
      if (!validIds.has(id)) {
        this.embeddings.delete(id)
        this.contentHashes.delete(id)
      }
    }

    // 对新增或内容变更的文件计算 embedding
    for (const file of files) {
      const content = file.content ?? ''
      const hash = this.hashContent(content)
      if (this.contentHashes.get(file.id) === hash && this.embeddings.has(file.id)) {
        continue
      }
      try {
        const vec = await ai.embed(this.fileToText(file))
        this.embeddings.set(file.id, vec)
        this.contentHashes.set(file.id, hash)
      } catch (err) {
        console.error(`[SemanticSearch] 构建索引失败: ${file.name}`, err)
      }
    }
  }

  /**
   * 语义搜索：返回与 query 最相似的 top-K 文件
   * @param query 查询文本
   * @param topK 返回数量，默认 10
   */
  async search(query: string, topK = 10): Promise<{ fileId: string; score: number }[]> {
    if (this.embeddings.size === 0 || !query.trim()) return []
    const ai = getAiService()
    if (!ai.isReady()) return []

    let queryVec: number[]
    try {
      queryVec = await ai.embed(query)
    } catch (err) {
      console.error('[SemanticSearch] 查询 embedding 失败', err)
      return []
    }

    const scored: { fileId: string; score: number }[] = []
    for (const [fileId, vec] of this.embeddings) {
      const score = cosineSimilarity(queryVec, vec)
      scored.push({ fileId, score })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, Math.max(1, topK))
  }

  /**
   * 增量更新单个文件的 embedding
   * @param fileId 文件 ID
   * @param content 文件内容（若为空字符串也会更新索引为空向量）
   */
  async updateFile(fileId: string, content: string): Promise<void> {
    const ai = getAiService()
    if (!ai.isReady()) return

    const hash = this.hashContent(content)
    // 内容未变化则跳过
    if (this.contentHashes.get(fileId) === hash && this.embeddings.has(fileId)) {
      return
    }

    try {
      const vec = await ai.embed(content)
      this.embeddings.set(fileId, vec)
      this.contentHashes.set(fileId, hash)
    } catch (err) {
      console.error(`[SemanticSearch] 更新文件失败: ${fileId}`, err)
    }
  }

  /** 移除某个文件的索引 */
  removeFile(fileId: string): void {
    this.embeddings.delete(fileId)
    this.contentHashes.delete(fileId)
  }

  /** 清空索引 */
  clear(): void {
    this.embeddings.clear()
    this.contentHashes.clear()
  }

  /** 获取已索引的文件数量 */
  get size(): number {
    return this.embeddings.size
  }

  /** 判断某个文件是否已索引 */
  has(fileId: string): boolean {
    return this.embeddings.has(fileId)
  }

  // ─── 内部工具 ───

  /**
   * 简易内容哈希（用于判断内容是否变化）
   * 采用字符串长度 + 首尾片段 + 字符和的方式，避免完整 hash 的开销
   */
  private hashContent(content: string): string {
    if (content.length === 0) return 'empty'
    const head = content.slice(0, 32)
    const tail = content.slice(-32)
    let sum = 0
    for (let i = 0; i < content.length; i++) {
      sum = (sum + content.charCodeAt(i)) | 0
    }
    return `${content.length}:${sum}:${head}:${tail}`
  }

  /** 将文件转换为待 embedding 的文本（名称 + 内容） */
  private fileToText(file: FileNode): string {
    const name = file.name.replace(/\.md$/i, '')
    const content = file.content ?? ''
    return `${name}\n${content}`
  }
}

/**
 * 全局单例（与 aiService 风格保持一致）
 * 多个面板共享同一份索引，避免重复计算
 */
let globalSearch: SemanticSearch | null = null

export function getSemanticSearch(): SemanticSearch {
  if (!globalSearch) {
    globalSearch = new SemanticSearch()
  }
  return globalSearch
}

export function setSemanticSearch(instance: SemanticSearch | null): void {
  globalSearch = instance
}
