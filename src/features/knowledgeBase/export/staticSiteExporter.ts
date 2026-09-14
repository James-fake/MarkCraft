/**
 * 静态站点导出
 * 将知识库文件生成为可部署的静态 HTML 站点（ZIP 包）
 * 包含：每篇文章 HTML + index.html 首页 + 标签页 + style.css
 */
import JSZip from 'jszip'
import type { KnowledgeBase, KnowledgeBaseBlogConfig } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

/** 转义 HTML 特殊字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 处理行内 markdown（链接、粗体、斜体、行内代码） */
function inlineMd(text: string): string {
  let result = escapeHtml(text)
  // 链接 [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // 粗体 **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体 *text*
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  // 行内代码 `code`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  return result
}

/**
 * 简易 Markdown 转 HTML
 * 支持：标题、段落、有序/无序列表、代码块、链接、粗体、斜体、行内代码
 */
function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/)
  const html: string[] = []
  let i = 0
  let inCodeBlock = false
  let codeLang = ''
  let codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块围栏
    const codeFence = line.match(/^```\s*(\w*)\s*$/)
    if (codeFence) {
      if (!inCodeBlock) {
        closeList()
        inCodeBlock = true
        codeLang = codeFence[1] || ''
        codeLines = []
      } else {
        html.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        inCodeBlock = false
      }
      i++
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      i++
      continue
    }

    // 空行
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`)
      i++
      continue
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${inlineMd(line.replace(/^[-*+]\s+/, ''))}</li>`)
      i++
      continue
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${inlineMd(line.replace(/^\d+\.\s+/, ''))}</li>`)
      i++
      continue
    }

    // 段落
    closeList()
    html.push(`<p>${inlineMd(line)}</p>`)
    i++
  }

  closeList()
  // 未闭合的代码块兜底
  if (inCodeBlock) {
    html.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  return html.join('\n')
}

/** 从文件内容提取标签 */
function extractFileTags(content: string): string[] {
  const tags: string[] = []
  const matches = content.match(/(?:^|\s)#([\w\u4e00-\u9fa5-]+)/g)
  if (matches) {
    for (const m of matches) {
      tags.push(m.trim().slice(1))
    }
  }
  return tags
}

/** 将文件名转为 URL 友好的 slug */
function slugify(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .replace(/[/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[<>:"|?*]/g, '')
}

/** 根据博客配置生成 CSS 样式 */
function generateCss(config?: KnowledgeBaseBlogConfig): string {
  const scheme = config?.colorScheme ?? 'blue'
  const theme = config?.theme ?? 'light'
  const palette: Record<string, { primary: string; accent: string }> = {
    blue: { primary: '#3b82f6', accent: '#1e40af' },
    green: { primary: '#10b981', accent: '#065f46' },
    purple: { primary: '#8b5cf6', accent: '#6b21a8' },
    orange: { primary: '#f59e0b', accent: '#92400e' },
    red: { primary: '#ef4444', accent: '#991b1b' },
  }
  const colors = palette[scheme] ?? palette.blue
  const isDark = theme === 'dark'
  const bg = isDark ? '#1e293b' : '#ffffff'
  const cardBg = isDark ? '#334155' : '#f8fafc'
  const textMain = isDark ? '#f1f5f9' : '#1e293b'
  const textSecondary = isDark ? '#cbd5e1' : '#64748b'
  const borderColor = isDark ? '#475569' : '#e2e8f0'
  const font =
    config?.font === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : config?.font === 'mono'
        ? 'ui-monospace, "Cascadia Code", "Courier New", monospace'
        : 'system-ui, -apple-system, sans-serif'

  return `* { box-sizing: border-box; }
body {
  margin: 0; padding: 0;
  background: ${bg}; color: ${textMain};
  font-family: ${font};
  line-height: 1.7;
  font-size: 16px;
}
.container { max-width: 720px; margin: 0 auto; padding: 32px 20px; }
h1, h2, h3, h4, h5, h6 { color: ${colors.primary}; margin-top: 1.5em; }
h1 { font-size: 1.8em; border-bottom: 1px solid ${borderColor}; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; }
a { color: ${colors.primary}; text-decoration: none; }
a:hover { text-decoration: underline; }
code { background: ${cardBg}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre { background: ${cardBg}; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
ul, ol { padding-left: 1.5em; }
blockquote { border-left: 4px solid ${colors.primary}; margin: 1em 0; padding: 0.5em 1em; color: ${textSecondary}; background: ${cardBg}; }
.tag { display: inline-block; background: ${colors.primary}; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 0.85em; margin: 2px; }
.tag-cloud { margin: 16px 0; }
.post-list { list-style: none; padding: 0; }
.post-list li { padding: 12px 0; border-bottom: 1px solid ${borderColor}; }
.post-list a { font-size: 1.1em; font-weight: 600; }
.meta { color: ${textSecondary}; font-size: 0.9em; margin-top: 4px; }
.back-link { display: inline-block; margin-bottom: 16px; font-size: 0.9em; }
`
}

/** 生成完整的 HTML 页面（样式通过 style.css 外部引用） */
function wrapPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`
}

/**
 * 导出静态站点（ZIP）
 * @param kb 知识库
 * @param files 文件列表
 * @param blogConfig 博客配置（可选，用于控制配色与字体）
 * @returns ZIP 格式的 Blob
 */
export async function exportStaticSite(
  kb: KnowledgeBase,
  files: FileNode[],
  blogConfig?: KnowledgeBaseBlogConfig,
): Promise<Blob> {
  try {
    const zip = new JSZip()
    const css = generateCss(blogConfig)

    // 按文件名排序
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))

    // 收集每个文件的标签与 slug
    const fileMeta = sorted.map(f => ({
      file: f,
      tags: extractFileTags(f.content ?? ''),
      slug: slugify(f.name),
      title: f.name.replace(/\.md$/i, ''),
    }))

    // 1. 为每个文件生成 HTML 文章页
    for (const fm of fileMeta) {
      const bodyHtml = markdownToHtml(fm.file.content ?? '')
      const tagLinks = fm.tags
        .map(t => `<a class="tag" href="tag-${slugify(t)}.html">${escapeHtml(t)}</a>`)
        .join('')
      const articleHtml = wrapPage(
        fm.title,
        `<a class="back-link" href="index.html">← 返回首页</a>
<h1>${escapeHtml(fm.title)}</h1>
${bodyHtml}
${tagLinks ? `<div class="meta">标签：${tagLinks}</div>` : ''}`,
      )
      zip.file(`${fm.slug}.html`, articleHtml)
    }

    // 2. 按标签分组
    const tagMap = new Map<string, { title: string; slug: string }[]>()
    for (const fm of fileMeta) {
      for (const t of fm.tags) {
        if (!tagMap.has(t)) tagMap.set(t, [])
        tagMap.get(t)!.push({ title: fm.title, slug: fm.slug })
      }
    }

    // 3. 生成标签页（没有标签则跳过）
    for (const [tag, articles] of tagMap) {
      const tagSlug = `tag-${slugify(tag)}`
      const list = articles
        .map(a => `<li><a href="${a.slug}.html">${escapeHtml(a.title)}</a></li>`)
        .join('')
      const tagHtml = wrapPage(
        `标签：${tag}`,
        `<a class="back-link" href="index.html">← 返回首页</a>
<h1>标签：${escapeHtml(tag)}</h1>
<ul class="post-list">${list}</ul>`,
      )
      zip.file(`${tagSlug}.html`, tagHtml)
    }

    // 4. 生成 index.html 首页
    const postList = fileMeta
      .map(fm => {
        const tagLinks = fm.tags
          .map(t => `<a class="tag" href="tag-${slugify(t)}.html">${escapeHtml(t)}</a>`)
          .join('')
        return `<li><a href="${fm.slug}.html">${escapeHtml(fm.title)}</a>${tagLinks ? `<div class="meta">${tagLinks}</div>` : ''}</li>`
      })
      .join('')
    const tagCloud = Array.from(tagMap.keys())
      .map(t => `<a class="tag" href="tag-${slugify(t)}.html">${escapeHtml(t)}</a>`)
      .join('')
    const indexHtml = wrapPage(
      kb.name,
      `<h1>${escapeHtml(kb.name)}</h1>
<p class="meta">${escapeHtml(kb.description)}</p>
${tagCloud ? `<div class="tag-cloud">${tagCloud}</div>` : ''}
<ul class="post-list">${postList}</ul>`,
    )
    zip.file('index.html', indexHtml)

    // 5. 生成 style.css
    zip.file('style.css', css)

    // 6. 打包为 ZIP
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    return blob
  } catch (err) {
    console.error('[KB] 导出静态站点失败:', err)
    throw new Error(`导出静态站点失败：${err instanceof Error ? err.message : String(err)}`)
  }
}
