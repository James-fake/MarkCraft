/**
 * 外部内容导入
 * 支持 Obsidian Vault、Notion 导出、网页剪藏
 *
 * P2-4：从 features/knowledgeBase/import 下沉至 services/import。
 * 本模块为纯导入逻辑（仅依赖 @services/clipMaterial 与 jszip），无 React / 存储依赖，
 * 使 features/migrate 等低频功能可直接复用，不再反向依赖 features/knowledgeBase。
 */
import JSZip from 'jszip'
import { buildMaterialNote, type ClipSource } from '@services/clipMaterial'
import { platform } from '@platform'

/** 导入相关用户可见文案（可被调用方以目标语言覆盖） */
export interface ImportMessages {
  /** Obsidian Vault 中无 .md 文件 */
  obsidianNoMd: string
  /** Obsidian Vault 导入失败（{error} = 原始错误） */
  obsidianFailed: string
  /** Notion 导出中无 .md/.html 文件 */
  notionNoFile: string
  /** Notion 导出导入失败 */
  notionFailed: string
  /** 网页请求失败（{status} = HTTP 状态码） */
  requestFailed: string
  /** 网页剪藏默认标题（无 title 时回落） */
  webClipTitle: string
  /** 网页剪藏被 CORS 阻止（{error} = 原始错误） */
  webClipCorsFailed: string
  /** 网页剪藏其他失败（{error} = 原始错误） */
  webClipFailed: string
  /** 链接被安全策略拒绝（非 http/https 或指向内网/回环地址） */
  urlBlocked: string
}

export const DEFAULT_IMPORT_MESSAGES: ImportMessages = {
  obsidianNoMd: '未在 ZIP 中找到任何 .md 文件，可能不是有效的 Obsidian Vault 导出',
  obsidianFailed: '导入 Obsidian Vault 失败：{error}',
  notionNoFile: '未在 ZIP 中找到 .md 或 .html 文件，可能不是有效的 Notion 导出',
  notionFailed: '导入 Notion 导出失败：{error}',
  requestFailed: '请求失败，HTTP 状态码：{status}',
  webClipTitle: '网页剪藏',
  webClipCorsFailed:
    '网页剪藏失败：可能被浏览器的 CORS 策略阻止，无法直接抓取该网址。建议使用浏览器扩展或代理服务转发请求。原始错误：{error}',
  webClipFailed: '网页剪藏失败：{error}',
  urlBlocked: '仅支持 http/https 且非内网地址的链接',
}

/**
 * 抓取前的 URL 安全校验：仅放行 http(s) 且非内网/回环/链路本地地址。
 * 否则用户可控 URL 可被指向 `file:`、`http://127.0.0.1`、云元数据地址等（SSRF / 本地探测）。
 */
function assertFetchableUrl(raw: string, messages: ImportMessages): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(messages.urlBlocked)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(messages.urlBlocked)
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const isPrivate =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    host === '0.0.0.0' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  if (isPrivate) {
    throw new Error(messages.urlBlocked)
  }
  return url
}

/** 从内容中提取标签（#tag 形式，支持中文） */
function extractTags(content: string): string[] {
  const tags = new Set<string>()
  const matches = content.match(/(?:^|\s)#([\w\u4e00-\u9fa5-]+)/g)
  if (matches) {
    for (const m of matches) {
      tags.add(m.trim().slice(1))
    }
  }
  return Array.from(tags)
}

/** 简易 HTML 转 Markdown（用于 Notion 导出与网页剪藏） */
function htmlToMarkdown(html: string): string {
  let md = html
  // 移除脚本与样式
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '')
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '')
  // 标题
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')
  // 粗体 / 斜体
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
  // 链接
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  // 列表项
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
  // 换行与段落
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<\/p>/gi, '\n\n')
  md = md.replace(/<p[^>]*>/gi, '')
  // 去除其余标签
  md = md.replace(/<[^>]+>/g, '')
  // 解码常见 HTML 实体
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, "'")
  md = md.replace(/&nbsp;/g, ' ')
  // 清理多余空行
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  return md + '\n'
}

/**
 * 导入 Obsidian Vault（ZIP）
 * 保留 frontmatter 和 [[]] 双链结构（不做转换）
 * @param zipBlob Obsidian 导出的 ZIP 文件
 * @returns 文件列表与标签集合
 */
export async function importObsidianVault(
  zipBlob: Blob,
  messages: ImportMessages = DEFAULT_IMPORT_MESSAGES,
): Promise<{
  files: { name: string; content: string; path: string }[]
  tags: string[]
}> {
  try {
    const zip = await JSZip.loadAsync(zipBlob)
    const files: { name: string; content: string; path: string }[] = []
    const tagSet = new Set<string>()

    const entries = Object.values(zip.files).filter(e => !e.dir && e.name.endsWith('.md'))
    for (const entry of entries) {
      const content = await entry.async('string')
      const path = entry.name
      const name = entry.name.split(/[\\/]/).pop() || entry.name
      files.push({ name, content, path })
      for (const t of extractTags(content)) {
        tagSet.add(t)
      }
    }

    if (files.length === 0) {
      throw new Error(messages.obsidianNoMd)
    }

    return { files, tags: Array.from(tagSet) }
  } catch (err) {
    console.error('[KB] 导入 Obsidian Vault 失败:', err)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(messages.obsidianFailed.replace('{error}', msg))
  }
}

/**
 * 导入 Notion 导出（ZIP）
 * 解析 .md 或 .html 文件，统一转换为 markdown 格式
 * @param zipBlob Notion 导出的 ZIP 文件
 * @returns 文件列表
 */
export async function importNotionExport(
  zipBlob: Blob,
  messages: ImportMessages = DEFAULT_IMPORT_MESSAGES,
): Promise<{
  files: { name: string; content: string; path: string }[]
}> {
  try {
    const zip = await JSZip.loadAsync(zipBlob)
    const files: { name: string; content: string; path: string }[] = []

    const entries = Object.values(zip.files).filter(
      e => !e.dir && (e.name.endsWith('.md') || e.name.endsWith('.html')),
    )
    for (const entry of entries) {
      const raw = await entry.async('string')
      let content: string
      let name: string
      if (entry.name.endsWith('.html')) {
        // HTML 文件转换为 markdown
        content = htmlToMarkdown(raw)
        const base = entry.name.split(/[\\/]/).pop() || entry.name
        name = base.replace(/\.html$/i, '.md')
      } else {
        // .md 文件直接保留
        content = raw
        name = entry.name.split(/[\\/]/).pop() || entry.name
      }
      files.push({ name, content, path: entry.name })
    }

    if (files.length === 0) {
      throw new Error(messages.notionNoFile)
    }

    return { files }
  } catch (err) {
    console.error('[KB] 导入 Notion 导出失败:', err)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(messages.notionFailed.replace('{error}', msg))
  }
}

/**
 * 网页剪藏（P0-2：落地为可块引用的素材笔记）
 * 抓取 URL 内容，提取正文并转换为 markdown 格式；写入来源 frontmatter，
 * 并为每个可引用段落自动追加 `^blockId` 标记，供写作时 `((` 检索引用。
 * 注意：fetch 可能因浏览器 CORS 策略失败
 * @param url 目标网页地址
 * @returns 文件名（从 title 提取）、markdown 内容与来源元数据
 */
export async function importWebClipper(
  url: string,
  messages: ImportMessages = DEFAULT_IMPORT_MESSAGES,
): Promise<{ name: string; content: string; source: ClipSource }> {
  // 先校验（在 try 之外抛出，urlBlocked 直接冒泡，不被下方 catch 二次包裹）
  const safeUrl = assertFetchableUrl(url, messages)
  try {
    // P6：桌面端经主进程抓取（无 CORS）；浏览器端直连（credentials: 'omit' 仅浏览器有意义）
    const res = await platform.net.fetch(
      safeUrl.toString(),
      platform.kind === 'browser' ? { credentials: 'omit' } : undefined,
    )
    if (!res.ok) {
      throw new Error(messages.requestFailed.replace('{status}', String(res.status)))
    }
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    // 移除与正文无关的元素
    doc.querySelectorAll('script,style,nav,header,footer,aside,iframe,noscript,svg').forEach(
      el => el.remove(),
    )

    const title = (doc.querySelector('title')?.textContent || '').trim() || messages.webClipTitle
    const article = doc.querySelector('article') || doc.querySelector('main') || doc.body
    const bodyHtml = article ? article.innerHTML : ''
    const mdBody = htmlToMarkdown(bodyHtml)

    const source: ClipSource = {
      url,
      title,
      clippedAt: new Date().toISOString().slice(0, 10),
      author:
        (doc.querySelector('meta[name="author"]')?.getAttribute('content') || '').trim() ||
        undefined,
      siteName:
        (doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '').trim() ||
        undefined,
    }
    const content = buildMaterialNote(source, mdBody)
    // 文件名：清理 Windows 非法字符并限制长度
    const safeName = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
    return { name: `${safeName}.md`, content, source }
  } catch (err) {
    console.error('[KB] 网页剪藏失败:', err)
    const msg = err instanceof Error ? err.message : String(err)
    // CORS 失败通常表现为 TypeError（被浏览器拦截）
    if (err instanceof TypeError) {
      throw new Error(messages.webClipCorsFailed.replace('{error}', msg))
    }
    throw new Error(messages.webClipFailed.replace('{error}', msg))
  }
}
