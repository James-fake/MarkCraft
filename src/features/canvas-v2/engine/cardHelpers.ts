/**
 * cardHelpers — 与 NoteCardShape 完全一致的渲染辅助（保证视觉/功能不变）。
 * 复用项目的 marked 配置、数学渲染、DOMPurify、主题色板。
 */
import { marked } from '@services/markedConfig'
import { renderMathInHtml } from '@utils/mathRenderer'
import { sanitizeHtml } from '@services/sanitizeHtml'
import { CARD_COLORS_V2, formatRelativeTime } from '../theme/canvasTheme'

export function getColorDef(hex: string) {
  return CARD_COLORS_V2.find((c) => c.from.toLowerCase() === (hex || '').toLowerCase())
    ?? CARD_COLORS_V2[0]
}

export function parseTags(tags?: string): string[] {
  if (!tags) return []
  return tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean).slice(0, 4)
}

/**
 * 卡片正文渲染（markdown → html）。
 * lang: 门控「渲染中…」占位文案；默认中文（保持既有调用点不变），'en' 时英文。
 * 与 useMarkdownRenderer（主渲染器）已用英文 Rendering… 对齐。
 */
export function renderNoteCardContent(text: string, lang: 'zh' | 'en' = 'zh'): string {
  try {
    const raw = marked.parse(text, { async: false }) as string
    const withMath = renderMathInHtml(raw)
    const mermaidText = lang === 'en' ? 'Rendering…' : '渲染中...'
    const withMermaid = withMath.replace(
      /<pre><code class="hljs language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_m: string, code: string) => {
        const decoded = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
        return `<div class="mermaid-diagram mermaid-loading" data-mermaid="${encodeURIComponent(decoded)}" style="min-height:24px;padding:4px;font-size:10px;opacity:0.5">📊 ${mermaidText}</div>`
      },
    )
    return sanitizeHtml(withMermaid)
  } catch {
    // 安全：异常路径也必须净化——绝不可返回未净化的原文，
    // 调用方（OverlayCards）会直接 dangerouslySetInnerHTML 注入本返回值。
    return sanitizeHtml(text)
  }
}

// formatRelativeTime 现支持第二参 lang（'zh' | 'en'）；此处透传，调用方按语言传入。
export { formatRelativeTime }

/* ============================================================
 * C8 卡片 ↔ 笔记标题同步（P4 地基层）
 * 工程决策：项目笔记无 frontmatter 体系（frontmatter 仅博客发布用），
 * 笔记「标题」的真实存储位置 = 文件名（去 .md）。因此
 * 「卡片标题改 = 笔记标题改」落为：syncEnabled 且已关联 fileId 时，
 * 卡片编辑结束（Escape / 失焦）把首行标题同步为笔记文件名。
 * ============================================================ */

/** 从卡片文本取标题：首行去 Markdown 标题符号/装饰，截断 40 字 */
export function getCardTitle(text: string): string {
  const first = (text || '').split('\n')[0] ?? ''
  return first
    .replace(/^#+\s*/, '')
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/[`*_~]/g, '')
    .trim()
    .slice(0, 40)
}

/**
 * 标题 → 合法文件名（去非法字符；空则回退「未命名笔记」）。
 *
 * ⚠️ 「未命名笔记」是**文件名兜底**，会真实落盘为 `.md` 文件名，**刻意不做语言化** ——
 * 见 syncCardTitleToNote。UI 展示层的「空笔记」占位另见 OverlayCards 的 t.canvasCard.emptyNote。
 */
export function safeNoteName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || '未命名笔记'
}

/**
 * 标题是否有效（非空且非「空笔记」占位）。
 *
 * ⚠️ '空笔记' 是**哨兵值**：与 OverlayCards 卡片标题渲染的 `text || '空笔记'` 占位同源，
 * 用于判定「用户是否真的写过标题」——属跨模块契约，不随界面语言变化（否则判定失效）。
 */
export function isValidTitle(title: string): boolean {
  return !!title && title !== '空笔记'
}

export interface SyncCardTitleOptions {
  /** 引擎（用于读最新 shape 文本） */
  engine: { getShape(id: string): { props?: { text?: string } } | undefined }
  shapeId: string
  /** 关联文件 id（无则不同步） */
  fileId?: string
  /** 同步开关（关则不同步） */
  syncEnabled?: boolean
  /** 同步前记录的旧标题（用于判断是否变化） */
  startTitle: string
  /** 重命名文件（真实 FileStore API） */
  renameNode: (id: string, newName: string) => void
}

/**
 * 卡片标题 → 笔记文件名同步。
 * 返回是否执行了重命名（供调用方更新 startTitle）。
 */
export function syncCardTitleToNote(opts: SyncCardTitleOptions): boolean {
  const { fileId, syncEnabled, startTitle, renameNode, engine, shapeId } = opts
  if (!syncEnabled || !fileId) return false
  const shape = engine.getShape(shapeId)
  const text = shape?.props?.text ?? ''
  const newTitle = getCardTitle(text)
  if (!isValidTitle(newTitle)) return false
  if (newTitle === startTitle) return false

  renameNode(fileId, `${safeNoteName(newTitle)}.md`)
  return true
}
