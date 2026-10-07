import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useLanguage } from '@stores/LanguageStore'

interface DiaryFormatToolbarProps {
  /** TiptapEditor 实例（由 DiaryPanel 在编辑器就绪后上抛）；null 时按钮禁用 */
  editor: Editor | null
}

const ICON_SVG = {
  bold: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  strike: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.3 19c-1.4 1.2-3.3 2-5.3 2-3.9 0-7-2.7-7-6 0-1.2.4-2.3 1-3.2" />
      <path d="M7.7 5c1.4-1.2 3.3-2 5.3-2 3.9 0 7 2.7 7 6 0 1.2-.4 2.3-1 3.2" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  heading: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12" />
      <path d="M6 4v16" />
      <path d="M18 4v16" />
      <path d="M15 4h5" />
      <path d="M15 20h5" />
    </svg>
  ),
  bulletList: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  orderedList: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  blockquote: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  ),
  codeBlock: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  inlineCode: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10" />
      <path d="M9.5 9l2.5 2.5-2.5 2.5" />
      <path d="M14.5 9l-2.5 2.5 2.5 2.5" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
}

/** 日记轻量格式工具栏（方案 B）：
 * - 仅提供写作高频 Markdown 命令
 * - TiptapEditor 的内置 WYSIWYG 工具栏 / 状态栏已由 DiaryPanel 通过
 *   showToolbar={false} / showStatusBar={false} 关闭，本栏为日记唯一格式栏
 * - 采用内联 SVG 图标 + 分组分隔，保持日记面板的专注/轻量定位
 */
export function DiaryFormatToolbar({ editor }: DiaryFormatToolbarProps) {
  const { t } = useLanguage()
  // 订阅 editor 事务以刷新激活态高亮
  const [, force] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => force((n) => n + 1)
    editor.on('transaction', update)
    editor.on('selectionUpdate', update)
    return () => {
      editor.off('transaction', update)
      editor.off('selectionUpdate', update)
    }
  }, [editor])

  const exec = (fn: () => void) => {
    if (!editor) return
    fn()
  }

  // 标题循环：paragraph → H1 → H2 → H3 → paragraph
  const cycleHeading = () => {
    if (!editor) return
    if (editor.isActive('heading', { level: 1 })) {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    } else if (editor.isActive('heading', { level: 2 })) {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    } else if (editor.isActive('heading', { level: 3 })) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    }
  }

  const level = editor?.isActive('heading', { level: 1 })
    ? 1
    : editor?.isActive('heading', { level: 2 })
      ? 2
      : editor?.isActive('heading', { level: 3 })
        ? 3
        : 0

  type ToolbarItem = {
    key: string
    title: string
    active: () => boolean
    onClick: () => void
    icon: React.ReactNode
    badge?: string
  }

  const groups: ToolbarItem[][] = [
    [
      { key: 'bold', title: t.toolbar.bold, active: () => !!editor?.isActive('bold'), onClick: () => exec(() => editor!.chain().focus().toggleBold().run()), icon: ICON_SVG.bold },
      { key: 'italic', title: t.toolbar.italic, active: () => !!editor?.isActive('italic'), onClick: () => exec(() => editor!.chain().focus().toggleItalic().run()), icon: ICON_SVG.italic },
      { key: 'strike', title: t.diaryFormat.strike, active: () => !!editor?.isActive('strike'), onClick: () => exec(() => editor!.chain().focus().toggleStrike().run()), icon: ICON_SVG.strike },
    ],
    [
      { key: 'heading', title: level ? t.diaryFormat.headingWithLevel.replace('{level}', String(level)) : t.diaryFormat.headingCycle, active: () => level > 0, onClick: cycleHeading, icon: ICON_SVG.heading, badge: level ? `H${level}` : undefined },
    ],
    [
      { key: 'bulletList', title: t.diaryFormat.bulletList, active: () => !!editor?.isActive('bulletList'), onClick: () => exec(() => editor!.chain().focus().toggleBulletList().run()), icon: ICON_SVG.bulletList },
      { key: 'orderedList', title: t.diaryFormat.orderedList, active: () => !!editor?.isActive('orderedList'), onClick: () => exec(() => editor!.chain().focus().toggleOrderedList().run()), icon: ICON_SVG.orderedList },
    ],
    [
      { key: 'blockquote', title: t.toolbar.blockquote, active: () => !!editor?.isActive('blockquote'), onClick: () => exec(() => editor!.chain().focus().toggleBlockquote().run()), icon: ICON_SVG.blockquote },
      { key: 'codeBlock', title: t.diaryFormat.codeBlock, active: () => !!editor?.isActive('codeBlock'), onClick: () => exec(() => editor!.chain().focus().toggleCodeBlock().run()), icon: ICON_SVG.codeBlock },
      { key: 'inlineCode', title: t.diaryFormat.inlineCode, active: () => !!editor?.isActive('code'), onClick: () => exec(() => editor!.chain().focus().toggleCode().run()), icon: ICON_SVG.inlineCode },
      { key: 'link', title: t.toolbar.link, active: () => !!editor?.isActive('link'), onClick: () => {
        if (!editor) return
        const prev = (editor.getAttributes('link').href as string | undefined) ?? 'https://'
        const url = window.prompt(t.diaryFormat.linkPrompt, prev)
        if (url === null) return
        if (url.trim() === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
      }, icon: ICON_SVG.link },
    ],
  ]

  return (
    <div className="dv-format-bar" role="toolbar" aria-label={t.diaryFormat.barAria}>
      {groups.map((group, gi) => (
        <div key={gi} className="dv-format-bar__group">
          {group.map((it) => (
            <button
              key={it.key}
              type="button"
              className={'dv-format-bar__btn' + (it.active() ? ' is-active' : '')}
              title={it.title}
              aria-label={it.title}
              aria-pressed={it.active()}
              disabled={!editor}
              onMouseDown={(e) => e.preventDefault()}
              onClick={it.onClick}
            >
              <span className="dv-format-bar__icon">{it.icon}</span>
              {it.badge && <span className="dv-format-bar__badge">{it.badge}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
