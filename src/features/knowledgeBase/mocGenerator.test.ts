/**
 * 阶段8 数据层图标统一回归测试
 * 验证 generateKbMoc 生成的 MOC Markdown 不含彩色 emoji（标题已去 emoji）。
 */
import { describe, it, expect, vi } from 'vitest'
import type { KnowledgeBase } from '../../stores/kbTypes'
import type { FileNode } from '../../types/fileManager'

vi.mock('./ai/aiService', () => ({
  getAiService: () => ({
    summarize: vi.fn().mockResolvedValue('这是一段由本地摘要生成的普通文本内容。'),
  }),
}))

import { generateKbMoc } from './mocGenerator'

const EMOJIS = ['🌐', '📂', '✕', '📚', '📄', '⏳', '📦', '📖', '📝', '🎯', '🔬', '🎨', '📅', '📎', '⚠️', '✅', '📊', '🏷️']

describe('mocGenerator 图标统一', () => {
  it('生成的 MOC 不含彩色 emoji', async () => {
    const kb = { id: 'k1', name: '测试知识库', description: '一个用于回归测试的知识库' } as unknown as KnowledgeBase
    const files = [
      { id: 'f1', name: '笔记一.md', content: '# 标题一\n#tag1 这是正文', type: 'file' },
      { id: 'f2', name: '笔记二.md', content: '# 标题二\n#tag2 更多内容', type: 'file' },
    ] as unknown as FileNode[]

    const md = await generateKbMoc(kb, files)

    for (const e of EMOJIS) {
      expect(md).not.toContain(e)
    }
    // 关键区块标题已为纯中文（无 emoji 前缀）
    expect(md).toContain('## 概览')
    expect(md).toContain('## 按标签分组')
    expect(md).toContain('## 文件列表')
  })
})
