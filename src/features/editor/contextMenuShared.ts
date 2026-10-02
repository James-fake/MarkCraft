import type { Editor } from '@tiptap/core'
import type { Translations } from '../../locales/zh'
import { getLastHighlightColor } from '@features/editor/extensions/highlightColorPref'
import { getLastUnderlineColor } from '@features/editor/extensions/underlineColorPref'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MenuItemDef {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  submenu?: MenuEntry[]
}

export interface SeparatorDef {
  type: 'separator'
}

export type MenuEntry = MenuItemDef | SeparatorDef

export function isSeparator(e: MenuEntry): e is SeparatorDef {
  return 'type' in e && e.type === 'separator'
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const MENU_WIDTH = 220
export const SUBMENU_WIDTH = 220
export const MENU_ITEM_HEIGHT = 30
export const MENU_PADDING = 4
export const SEPARATOR_HEIGHT = 9 // 4px margin top + 1px line + 4px margin bottom

/* ------------------------------------------------------------------ */
/*  Safe editor.can() wrapper                                          */
/* ------------------------------------------------------------------ */

export function safeCan(editor: Editor | null, command: string, args?: unknown): boolean {
  try {
    if (!editor?.can?.()) return false
    // 动态命令名索引：CanCommands 无字符串索引签名，按命令表鸭子形态断言
    const chain = editor.can() as unknown as Record<string, (args?: unknown) => boolean | undefined>
    return args !== undefined ? chain[command]?.(args) ?? false : chain[command]?.() ?? false
  } catch {
    return false
  }
}

export function safeIsActive(editor: Editor | null, type: string, attrs?: Record<string, unknown>): boolean {
  try {
    if (!editor?.isActive) return false
    return attrs !== undefined ? editor.isActive(type, attrs) : editor.isActive(type)
  } catch {
    return false
  }
}

/**
 * 剪切/复制：恢复编辑器焦点后走 document.execCommand —— ProseMirror 在
 * contenteditable 上内置 copy/cut 事件拦截，会正确序列化富文本选区。
 * （execCommand 虽已标记 deprecated，但它是唯一能同步触发 PM 拦截的途径，
 * 编辑器类产品的通行做法；Tiptap 命令表本身无 cut/copy/paste。）
 */
export const nativeClipboard = (editor: Editor, cmd: 'cut' | 'copy'): void => {
  editor.commands.focus(undefined, { scrollIntoView: false })
  document.execCommand(cmd)
}

/**
 * 粘贴：优先剪贴板 text/html（保留富文本，insertContent 会按 schema 解析），
 * 失败回退纯文本（对齐下方「粘贴为纯文本」既有模式）。
 */
export const pasteFromClipboard = async (editor: Editor): Promise<void> => {
  const insertText = async () => {
    const text = await navigator.clipboard.readText()
    if (text) editor.chain().focus().insertContent(text).run()
  }
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (item.types.includes('text/html')) {
        const html = await (await item.getType('text/html')).text()
        editor.chain().focus().insertContent(html).run()
        return
      }
    }
    await insertText()
  } catch {
    try { await insertText() } catch { /* 权限拒绝等，静默 */ }
  }
}

/* ------------------------------------------------------------------ */
/*  Submenu definitions（P5-1 自主组件的 menuEntries 构建拆出，逐字未动）      */
/* ------------------------------------------------------------------ */

/** 构建右键菜单全部条目：公共剪贴板/全选项 + WYSIWYG 专属「格式」「段落」两个子菜单 */
export function buildMenuEntries(editor: Editor | null, mode: 'wysiwyg' | 'source', L: Translations['ctxMenu']): MenuEntry[] {
  const items: MenuEntry[] = []

  // Common items
  items.push({
    label: L.cut,
    shortcut: 'Ctrl+X',
    disabled: mode === 'source', // execCommand 无 can 查询，WYSIWYG 下恒可用
    action: () => {
      if (mode === 'wysiwyg' && editor) {
        nativeClipboard(editor, 'cut')
      }
    },
  })
  items.push({
    label: L.copy,
    shortcut: 'Ctrl+C',
    disabled: mode === 'source',
    action: () => {
      if (mode === 'wysiwyg' && editor) {
        nativeClipboard(editor, 'copy')
      }
    },
  })
  items.push({
    label: L.paste,
    shortcut: 'Ctrl+V',
    disabled: mode === 'source',
    action: () => {
      if (mode === 'wysiwyg' && editor) {
        void pasteFromClipboard(editor)
      }
    },
  })
  items.push({
    label: L.pastePlain,
    shortcut: 'Ctrl+Shift+V',
    action: () => {
      if (mode === 'wysiwyg' && editor) {
        // Tiptap doesn't have a built-in paste as plain text,
        // but we can use the clipboard API
        navigator.clipboard.readText().then((text) => {
          if (text) {
            editor.chain().focus().insertContent(text).run()
          }
        }).catch(() => {})
      }
    },
  })

  items.push({ type: 'separator' })

  items.push({
    label: L.selectAll,
    shortcut: 'Ctrl+A',
    action: () => {
      if (mode === 'wysiwyg' && editor) {
        editor.chain().focus().selectAll().run()
      }
    },
  })

  // WYSIWYG-only items
  if (mode === 'wysiwyg' && editor) {
    items.push({ type: 'separator' })

    items.push({
      label: L.format,
      submenu: [
        {
          label: L.bold,
          shortcut: 'Ctrl+B',
          checked: safeIsActive(editor, 'bold'),
          action: () => editor.chain().focus().toggleBold().run(),
          disabled: !safeCan(editor, 'toggleBold'),
        },
        {
          label: L.italic,
          shortcut: 'Ctrl+I',
          checked: safeIsActive(editor, 'italic'),
          action: () => editor.chain().focus().toggleItalic().run(),
          disabled: !safeCan(editor, 'toggleItalic'),
        },
        {
          label: L.strike,
          shortcut: 'Ctrl+Shift+S',
          checked: safeIsActive(editor, 'strike'),
          action: () => editor.chain().focus().toggleStrike().run(),
          disabled: !safeCan(editor, 'toggleStrike'),
        },
        {
          label: L.highlight,
          checked: safeIsActive(editor, 'highlight'),
          // 与工具栏主按钮同语义：应用/切换「上次颜色」
          action: () => {
            const color = getLastHighlightColor()
            const current = editor.getAttributes('highlight').color
            if (current === color) editor.chain().focus().unsetHighlight().run()
            else editor.chain().focus().unsetHighlight().setHighlight({ color }).run()
          },
          disabled: !safeCan(editor, 'toggleHighlight'),
        },
        {
          label: L.underline,
          checked: safeIsActive(editor, 'underline'),
          // 与工具栏主按钮同语义：应用/切换「上次颜色」（默认「跟随正文」）
          action: () => {
            const color = getLastUnderlineColor()
            const current = editor.getAttributes('underline').color
            if (current === color) editor.chain().focus().unsetUnderline().run()
            else editor.chain().focus().unsetUnderline().setMark('underline', { color }).run()
          },
          disabled: !safeCan(editor, 'toggleUnderline'),
        },
        {
          label: L.inlineCode,
          shortcut: 'Ctrl+E',
          checked: safeIsActive(editor, 'code'),
          action: () => editor.chain().focus().toggleCode().run(),
          disabled: !safeCan(editor, 'toggleCode'),
        },
        {
          label: L.subscript,
          checked: safeIsActive(editor, 'subscript'),
          action: () => editor.chain().focus().toggleSubscript().run(),
          disabled: !safeCan(editor, 'toggleSubscript'),
        },
        {
          label: L.superscript,
          checked: safeIsActive(editor, 'superscript'),
          action: () => editor.chain().focus().toggleSuperscript().run(),
          disabled: !safeCan(editor, 'toggleSuperscript'),
        },
      ],
    })

    items.push({
      label: L.paragraph,
      submenu: [
        {
          label: L.heading1,
          checked: safeIsActive(editor, 'heading', { level: 1 }),
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 1 }),
        },
        {
          label: L.heading2,
          checked: safeIsActive(editor, 'heading', { level: 2 }),
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 2 }),
        },
        {
          label: L.heading3,
          checked: safeIsActive(editor, 'heading', { level: 3 }),
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 3 }),
        },
        {
          label: L.heading4,
          checked: safeIsActive(editor, 'heading', { level: 4 }),
          action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 4 }),
        },
        {
          label: L.heading5,
          checked: safeIsActive(editor, 'heading', { level: 5 }),
          action: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 5 }),
        },
        {
          label: L.heading6,
          checked: safeIsActive(editor, 'heading', { level: 6 }),
          action: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
          disabled: !safeCan(editor, 'toggleHeading', { level: 6 }),
        },
        { type: 'separator' as const },
        {
          label: L.orderedList,
          checked: safeIsActive(editor, 'orderedList'),
          action: () => editor.chain().focus().toggleOrderedList().run(),
          disabled: !safeCan(editor, 'toggleOrderedList'),
        },
        {
          label: L.bulletList,
          checked: safeIsActive(editor, 'bulletList'),
          action: () => editor.chain().focus().toggleBulletList().run(),
          disabled: !safeCan(editor, 'toggleBulletList'),
        },
        {
          label: L.taskList,
          checked: safeIsActive(editor, 'taskList'),
          action: () => editor.chain().focus().toggleTaskList().run(),
          disabled: !safeCan(editor, 'toggleTaskList'),
        },
        { type: 'separator' as const },
        {
          label: L.blockquote,
          checked: safeIsActive(editor, 'blockquote'),
          action: () => editor.chain().focus().toggleBlockquote().run(),
          disabled: !safeCan(editor, 'toggleBlockquote'),
        },
        { type: 'separator' as const },
        {
          label: L.indentMore,
          action: () => editor.chain().focus().sinkListItem('listItem').run(),
          disabled: !safeCan(editor, 'sinkListItem', 'listItem'),
        },
        {
          label: L.indentLess,
          action: () => editor.chain().focus().liftListItem('listItem').run(),
          disabled: !safeCan(editor, 'liftListItem', 'listItem'),
        },
      ],
    })
  }

  return items
}
