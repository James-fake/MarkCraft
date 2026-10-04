/**
 * 知识库问答模块
 * 基于段落级检索增强生成（RAG）：问题向量化 → 段落召回 → 拼接上下文 → 生成回答
 */
import type { FileNode } from '@src/types/fileManager'
import type { AiChatResult } from '@stores/kbTypes'
import { getAiService, cosineSimilarity } from './aiService'

/** 知识库问答返回的答案文案（可被调用方以目标语言覆盖） */
export interface KbChatMessages {
  /** 无可检索文件 / 问题为空 */
  noFiles: string
  /** 问题向量化失败 */
  embedFailed: string
  /** 文件内容为空 */
  emptyContent: string
  /** 生成回答失败 */
  genFailed: string
  /** 片段表头模板（{n}=序号，{src}=来源文件名） */
  snippetHeader: string
}

export const DEFAULT_KB_CHAT_MESSAGES: KbChatMessages = {
  noFiles: '暂无可检索的文件或问题为空',
  embedFailed: '问题向量化失败，请重试',
  emptyContent: '文件内容为空，无法回答',
  genFailed: '生成回答失败，请稍后重试',
  snippetHeader: '【片段{n} 来源：{src}】',
}

/** 递归收集所有文件节点（扁平化） */
function collectAllFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push(node)
    }
    if (node.children && node.children.length > 0) {
      result.push(...collectAllFiles(node.children))
    }
  }
  return result
}

/** 段落切分（按两个及以上换行），过滤过短段落 */
function splitParagraphs(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 10)
}

/** 段落条目：携带来源文件信息与向量 */
interface Paragraph {
  fileId: string
  fileName: string
  text: string
  vector: number[]
}

/**
 * 知识库问答
 * 1. 对问题做 embedding
 * 2. 将每个文件按段落切分（\n\n+），对每段做 embedding
 * 3. 计算问题向量与各段向量的余弦相似度，取 top-5
 * 4. 拼接为 context 字符串
 * 5. 调用 getAiService().chat(question, context) 生成回答
 * 6. 返回 AiChatResult（answer + sources，sources 包含 fileId 和 snippet）
 */
export async function askKb(
  question: string,
  files: FileNode[],
  messages: KbChatMessages = DEFAULT_KB_CHAT_MESSAGES,
): Promise<AiChatResult> {
  const allFiles = collectAllFiles(files)
  if (allFiles.length === 0 || !question.trim()) {
    return { answer: messages.noFiles, sources: [] }
  }

  const ai = getAiService()

  // 1. 对问题做 embedding（异步操作需 try...catch 容错）
  let questionVec: number[] = []
  try {
    questionVec = await ai.embed(question)
  } catch {
    return { answer: messages.embedFailed, sources: [] }
  }

  // 2. 切分段落并对每段做 embedding
  const paragraphs: Paragraph[] = []
  for (const file of allFiles) {
    const content = file.content ?? ''
    const chunks = splitParagraphs(content)
    for (const chunk of chunks) {
      try {
        const vec = await ai.embed(chunk)
        paragraphs.push({
          fileId: file.id,
          fileName: file.name,
          text: chunk,
          vector: vec,
        })
      } catch {
        // 跳过 embedding 失败的段落，继续处理其他段落
      }
    }
  }

  if (paragraphs.length === 0) {
    return { answer: messages.emptyContent, sources: [] }
  }

  // 3. 计算问题向量与各段向量的余弦相似度，取 top-5
  const scored = paragraphs.map(p => ({
    paragraph: p,
    score: cosineSimilarity(questionVec, p.vector),
  }))
  scored.sort((a, b) => b.score - a.score)
  const top5 = scored.slice(0, 5)

  // 4. 拼接为 context 字符串
  const context = top5
    .map((item, idx) => {
      const snippet = item.paragraph.text
      const header = messages.snippetHeader
        .replace('{n}', String(idx + 1))
        .replace('{src}', item.paragraph.fileName)
      return `${header}\n${snippet}`
    })
    .join('\n\n')

  // 5. 调用 chat 生成回答（异步操作需 try...catch 容错）
  let answer = ''
  try {
    const result = await ai.chat(question, context)
    answer = result.answer
  } catch {
    answer = messages.genFailed
  }

  // 6. 构造 sources（包含 fileId 和 snippet）
  const sources = top5.map(item => ({
    fileId: item.paragraph.fileId,
    snippet: item.paragraph.text.substring(0, 100),
  }))

  return { answer, sources }
}
