/**
 * 知识库 MOC（Map of Content）自动生成
 *
 * 为知识库生成目录索引文件，自动汇总所有文件的标题、标签、摘要。
 * 复用项目已有的 isAutoMoc/parseMocFrontMatter 机制实现自动更新。
 */
import type { KnowledgeBase } from '../../stores/kbTypes'
import type { FileNode } from '../../types/fileManager'
import { getAiService } from './ai/aiService'

/**
 * 为知识库生成 MOC Markdown 内容
 */
export async function generateKbMoc(kb: KnowledgeBase, files: FileNode[]): Promise<string> {
  const ai = getAiService()
  const now = new Date().toLocaleDateString('zh-CN')

  // 按标签分组
  const tagGroups = new Map<string, FileNode[]>()
  for (const f of files) {
    const tags = extractTags(f.content ?? '')
    for (const tag of tags) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, [])
      tagGroups.get(tag)!.push(f)
    }
  }

  // 为每个文件生成摘要（限制数量避免性能问题）
  const fileSummaries = await Promise.all(
    files.slice(0, 50).map(async f => ({
      file: f,
      summary: await ai.summarize(f.content ?? '', 100),
      tags: extractTags(f.content ?? ''),
    }))
  )

  // 生成 Markdown
  let md = `---\n`
  md += `type: kb-moc\n`
  md += `kbId: ${kb.id}\n`
  md += `kbName: ${kb.name}\n`
  md += `autoUpdate: true\n`
  md += `generatedAt: ${now}\n`
  md += `---\n\n`
  md += `# ${kb.name} - 知识库目录\n\n`
  md += `> 自动生成于 ${now}，共 ${files.length} 篇笔记\n\n`

  // 概览
  md += `## 概览\n\n`
  md += `- 文件总数：${files.length}\n`
  md += `- 标签数量：${tagGroups.size}\n`
  if (kb.description) {
    md += `- 描述：${kb.description}\n`
  }
  md += `\n`

  // 按标签分组
  if (tagGroups.size > 0) {
    md += `## 按标签分组\n\n`
    const sortedTags = Array.from(tagGroups.entries()).sort((a, b) => b[1].length - a[1].length)
    for (const [tag, groupFiles] of sortedTags) {
      md += `### #${tag}\n\n`
      for (const f of groupFiles) {
        md += `- [[${f.name.replace(/\.md$/, '')}]]\n`
      }
      md += `\n`
    }
  }

  // 文件列表（含摘要）
  md += `## 文件列表\n\n`
  for (const { file, summary, tags } of fileSummaries) {
    const name = file.name.replace(/\.md$/, '')
    md += `### [[${name}]]\n`
    if (tags.length > 0) {
      md += `标签：${tags.map(t => `#${t}`).join(' ')}\n\n`
    }
    md += `${summary}\n\n`
  }

  return md
}

/** 从 markdown 内容中提取标签 */
function extractTags(content: string): string[] {
  const tags = new Set<string>()
  // 匹配 #tag 格式（行首或空格后的 #tag）
  const matches = content.match(/(?:^|\s)#([a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_]*)/g)
  if (matches) {
    for (const m of matches) {
      tags.add(m.trim().substring(1))
    }
  }
  // 匹配 frontmatter 中的 tags
  const fmMatch = content.match(/^---\n[\s\S]*?tags:\s*\[(.*?)\]/)
  if (fmMatch) {
    const fmTags = fmMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
    for (const t of fmTags) {
      if (t) tags.add(t)
    }
  }
  return Array.from(tags)
}
