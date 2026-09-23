import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getLastHighlightColor } from '@features/editor/extensions/highlightColorPref'
import { getLastUnderlineColor } from '@features/editor/extensions/underlineColorPref'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EditorContextMenuProps {
  visible: boolean
  x: number
  y: number
  editor: any // Tiptap Editor instance (null for source mode)
  mode: 'wysiwyg' | 'source'
  onClose: () => void
}

interface MenuItemDef {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  submenu?: MenuEntry[]
}

interface SeparatorDef {
  type: 'separator'
}

type MenuEntry = MenuItemDef | SeparatorDef

function isSeparator(e: MenuEntry): e is SeparatorDef {
  return 'type' in e && e.type === 'separator'
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MENU_WIDTH = 220
const SUBMENU_WIDTH = 220
const MENU_ITEM_HEIGHT = 30
const MENU_PADDING = 4
const SEPARATOR_HEIGHT = 9 // 4px margin top + 1px line + 4px margin bottom

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Safe editor.can() wrapper                                          */
/* ------------------------------------------------------------------ */

function safeCan(editor: any, command: string, args?: any): boolean {
  try {
    if (!editor?.can?.()) return false
    const chain = editor.can()
    return args !== undefined ? chain[command]?.(args) ?? false : chain[command]?.() ?? false
  } catch {
    return false
  }
}

function safeIsActive(editor: any, type: string, attrs?: any): boolean {
  try {
    if (!editor?.isActive) return false
    return attrs !== undefined ? editor.isActive(type, attrs) : editor.isActive(type)
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/*  MenuItem component                                                 */
/* ------------------------------------------------------------------ */

interface MenuItemProps {
  item: MenuItemDef
  onAction: () => void
  onHover: (el: HTMLDivElement | null) => void
  focused: boolean
  submenuOpen: boolean
  submenuRef: React.RefObject<HTMLDivElement>
  submenuPosition: { x: number; y: number } | null
  renderSubmenu: () => React.ReactNode
}

function MenuItem({
  item,
  onAction,
  onHover,
  focused,
  submenuOpen,
  submenuRef,
  submenuPosition,
  renderSubmenu,
}: MenuItemProps) {
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' })
    }
  }, [focused])

  const hoverBg = 'var(--mc-bg-pressed)'
  const focusBg = 'var(--mc-bg-pressed)'

  return (
    <>
      <div
        ref={ref}
        role="menuitem"
        aria-disabled={item.disabled}
        aria-haspopup={item.submenu ? 'true' : undefined}
        tabIndex={-1}
        onClick={() => {
          if (item.disabled) return
          if (item.submenu) return // submenu items open on hover
          onAction()
        }}
        onMouseEnter={(_e) => {
          if (item.disabled) return
          onHover(ref.current)
        }}
        onMouseLeave={() => {
          if (!item.submenu) onHover(null)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: MENU_ITEM_HEIGHT,
          padding: '0 12px',
          fontSize: 13,
          color: item.disabled
            ? 'var(--mc-text-primary)'
            : 'var(--mc-text-primary)',
          opacity: item.disabled ? 0.4 : 1,
          cursor: item.disabled ? 'default' : 'pointer',
          backgroundColor: focused
            ? focusBg
            : submenuOpen
              ? hoverBg
              : 'transparent',
          transition: 'background-color 0.08s',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          borderRadius: 'var(--mc-radius-sm, 4px)',
          margin: '0 4px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.checked && (
            <span style={{ fontSize: 12, width: 14, textAlign: 'center', color: 'var(--mc-accent)' }}>&#10003;</span>
          )}
          {!item.checked && item.submenu === undefined && (
            <span style={{ width: 14 }} />
          )}
          {item.label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.shortcut && (
            <span style={{ fontSize: 12, opacity: 0.5, fontFamily: 'inherit' }}>
              {item.shortcut}
            </span>
          )}
          {item.submenu && (
            <span style={{ fontSize: 14, opacity: 0.6 }}>&#8250;</span>
          )}
        </span>
      </div>
      {submenuOpen && item.submenu && submenuPosition && createPortal(
        <div
          ref={submenuRef}
          role="menu"
          className="material-popover"
          style={{
            position: 'fixed',
            left: submenuPosition.x,
            top: submenuPosition.y,
            zIndex: 10001,
            border: '1px solid var(--mc-border-medium)',
            borderRadius: 'var(--mc-radius-md, 8px)',
            boxShadow: 'var(--mc-shadow-popover)',
            padding: `${MENU_PADDING}px 0`,
            minWidth: SUBMENU_WIDTH,
            maxHeight: `calc(100vh - 20px)`,
            overflowY: 'auto',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {renderSubmenu()}
        </div>,
        document.body
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Separator component                                                */
/* ------------------------------------------------------------------ */

function Separator() {
  return (
      <div
        role="separator"
        style={{
          height: 1,
          backgroundColor: 'var(--mc-border-subtle)',
          margin: '4px 0',
        }}
      />
  )
}

/* ------------------------------------------------------------------ */
/*  Main EditorContextMenu component                                   */
/* ------------------------------------------------------------------ */

export default function EditorContextMenu({
  visible,
  x,
  y,
  editor,
  mode,
  onClose,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null!)
  const submenuRef = useRef<HTMLDivElement>(null!)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null)
  const [submenuPos, setSubmenuPos] = useState<{ x: number; y: number } | null>(null)

  /* ---- Close on click outside or Escape ---- */
  useEffect(() => {
    if (!visible) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        menuRef.current?.contains(target) ||
        submenuRef.current?.contains(target)
      ) {
        return
      }
      onClose()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSubmenuIndex !== null) {
          setActiveSubmenuIndex(null)
          setSubmenuPos(null)
        } else {
          onClose()
        }
        return
      }

      // Arrow key navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const indices = menuEntries
          .map((_, i) => i)
          .filter((i) => !isSeparator(menuEntries[i]))

        setFocusedIndex((prev) => {
          const currentPos = indices.indexOf(prev)
          let nextPos: number
          if (e.key === 'ArrowDown') {
            nextPos = currentPos < indices.length - 1 ? currentPos + 1 : 0
          } else {
            nextPos = currentPos > 0 ? currentPos - 1 : indices.length - 1
          }
          return indices[nextPos]
        })
      }

      if (e.key === 'ArrowRight') {
        const entry = menuEntries[focusedIndex]
        if (entry && !isSeparator(entry) && entry.submenu) {
          setActiveSubmenuIndex(focusedIndex)
        }
      }

      if (e.key === 'ArrowLeft') {
        if (activeSubmenuIndex !== null) {
          setActiveSubmenuIndex(null)
          setSubmenuPos(null)
        }
      }

      if (e.key === 'Enter') {
        const entry = menuEntries[focusedIndex]
        if (entry && !isSeparator(entry) && !entry.disabled) {
          if (entry.submenu) {
            setActiveSubmenuIndex(focusedIndex)
          } else if (entry.action) {
            entry.action()
            onClose()
          }
        }
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, activeSubmenuIndex, focusedIndex, onClose])

  /* ---- Reset state when visibility changes ---- */
  useEffect(() => {
    if (visible) {
      setFocusedIndex(-1)
      setActiveSubmenuIndex(null)
      setSubmenuPos(null)
    }
  }, [visible])

  /* ---- Build menu entries ---- */
  const menuEntries = useCallback((): MenuEntry[] => {
    const items: MenuEntry[] = []

    // Common items
    items.push({
      label: '剪切',
      shortcut: 'Ctrl+X',
      disabled: mode === 'source' ? true : !safeCan(editor, 'cut'),
      action: () => {
        if (mode === 'wysiwyg' && editor) {
          editor.chain().focus().cut().run()
        }
      },
    })
    items.push({
      label: '复制',
      shortcut: 'Ctrl+C',
      disabled: mode === 'source' ? true : !safeCan(editor, 'copy'),
      action: () => {
        if (mode === 'wysiwyg' && editor) {
          editor.chain().focus().copy().run()
        }
      },
    })
    items.push({
      label: '粘贴',
      shortcut: 'Ctrl+V',
      action: () => {
        if (mode === 'wysiwyg' && editor) {
          editor.chain().focus().paste().run()
        }
      },
    })
    items.push({
      label: '粘贴为纯文本',
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
      label: '全选',
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
        label: '格式',
        submenu: [
          {
            label: '粗体',
            shortcut: 'Ctrl+B',
            checked: safeIsActive(editor, 'bold'),
            action: () => editor.chain().focus().toggleBold().run(),
            disabled: !safeCan(editor, 'toggleBold'),
          },
          {
            label: '斜体',
            shortcut: 'Ctrl+I',
            checked: safeIsActive(editor, 'italic'),
            action: () => editor.chain().focus().toggleItalic().run(),
            disabled: !safeCan(editor, 'toggleItalic'),
          },
          {
            label: '删除线',
            shortcut: 'Ctrl+Shift+S',
            checked: safeIsActive(editor, 'strike'),
            action: () => editor.chain().focus().toggleStrike().run(),
            disabled: !safeCan(editor, 'toggleStrike'),
          },
          {
            label: '高亮',
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
            label: '下划线',
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
            label: '行内代码',
            shortcut: 'Ctrl+E',
            checked: safeIsActive(editor, 'code'),
            action: () => editor.chain().focus().toggleCode().run(),
            disabled: !safeCan(editor, 'toggleCode'),
          },
          {
            label: '下标',
            checked: safeIsActive(editor, 'subscript'),
            action: () => editor.chain().focus().toggleSubscript().run(),
            disabled: !safeCan(editor, 'toggleSubscript'),
          },
          {
            label: '上标',
            checked: safeIsActive(editor, 'superscript'),
            action: () => editor.chain().focus().toggleSuperscript().run(),
            disabled: !safeCan(editor, 'toggleSuperscript'),
          },
        ],
      })

      items.push({
        label: '段落',
        submenu: [
          {
            label: '标题 1',
            checked: safeIsActive(editor, 'heading', { level: 1 }),
            action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 1 }),
          },
          {
            label: '标题 2',
            checked: safeIsActive(editor, 'heading', { level: 2 }),
            action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 2 }),
          },
          {
            label: '标题 3',
            checked: safeIsActive(editor, 'heading', { level: 3 }),
            action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 3 }),
          },
          {
            label: '标题 4',
            checked: safeIsActive(editor, 'heading', { level: 4 }),
            action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 4 }),
          },
          {
            label: '标题 5',
            checked: safeIsActive(editor, 'heading', { level: 5 }),
            action: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 5 }),
          },
          {
            label: '标题 6',
            checked: safeIsActive(editor, 'heading', { level: 6 }),
            action: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
            disabled: !safeCan(editor, 'toggleHeading', { level: 6 }),
          },
          { type: 'separator' as const },
          {
            label: '有序列表',
            checked: safeIsActive(editor, 'orderedList'),
            action: () => editor.chain().focus().toggleOrderedList().run(),
            disabled: !safeCan(editor, 'toggleOrderedList'),
          },
          {
            label: '无序列表',
            checked: safeIsActive(editor, 'bulletList'),
            action: () => editor.chain().focus().toggleBulletList().run(),
            disabled: !safeCan(editor, 'toggleBulletList'),
          },
          {
            label: '任务列表',
            checked: safeIsActive(editor, 'taskList'),
            action: () => editor.chain().focus().toggleTaskList().run(),
            disabled: !safeCan(editor, 'toggleTaskList'),
          },
          { type: 'separator' as const },
          {
            label: '引用',
            checked: safeIsActive(editor, 'blockquote'),
            action: () => editor.chain().focus().toggleBlockquote().run(),
            disabled: !safeCan(editor, 'toggleBlockquote'),
          },
          { type: 'separator' as const },
          {
            label: '增加缩进',
            action: () => editor.chain().focus().sinkListItem('listItem').run(),
            disabled: !safeCan(editor, 'sinkListItem', 'listItem'),
          },
          {
            label: '减少缩进',
            action: () => editor.chain().focus().liftListItem('listItem').run(),
            disabled: !safeCan(editor, 'liftListItem', 'listItem'),
          },
        ],
      })
    }

    return items
  }, [
    editor,
    mode,
  ])()

  /* ---- Calculate position to avoid off-screen ---- */
  const getPosition = useCallback((): { left: number; top: number } => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Estimate menu height
    const itemCount = menuEntries.filter((e) => !isSeparator(e)).length
    const sepCount = menuEntries.filter((e) => isSeparator(e)).length
    const estimatedHeight = itemCount * MENU_ITEM_HEIGHT + sepCount * SEPARATOR_HEIGHT + MENU_PADDING * 2

    let left = x
    let top = y

    // Adjust horizontal
    if (left + MENU_WIDTH > vw - 8) {
      left = vw - MENU_WIDTH - 8
    }
    if (left < 8) left = 8

    // Adjust vertical
    if (top + estimatedHeight > vh - 8) {
      top = vh - estimatedHeight - 8
    }
    if (top < 8) top = 8

    return { left, top }
  }, [x, y, menuEntries])

  /* ---- Submenu hover handler ---- */
  const handleItemHover = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      const entry = menuEntries[index]
      if (!entry || isSeparator(entry)) return

      if (entry.submenu) {
        setActiveSubmenuIndex(index)
        if (el) {
          const rect = el.getBoundingClientRect()
          const vw = window.innerWidth
          const vh = window.innerHeight

          // Default: open to the right
          let sx = rect.right + 2
          let sy = rect.top - MENU_PADDING

          // If overflows right, open to the left
          if (sx + SUBMENU_WIDTH > vw - 8) {
            sx = rect.left - SUBMENU_WIDTH - 2
          }
          // If still overflows left
          if (sx < 8) sx = 8

          // Estimate submenu height
          const subItemCount = entry.submenu.filter((e) => !isSeparator(e)).length
          const subSepCount = entry.submenu.filter((e) => isSeparator(e)).length
          const subHeight = subItemCount * MENU_ITEM_HEIGHT + subSepCount * SEPARATOR_HEIGHT + MENU_PADDING * 2

          if (sy + subHeight > vh - 8) {
            sy = vh - subHeight - 8
          }
          if (sy < 8) sy = 8

          setSubmenuPos({ x: sx, y: sy })
        }
      } else {
        setActiveSubmenuIndex(null)
        setSubmenuPos(null)
      }
    },
    [menuEntries]
  )

  /* ---- Render submenu entries ---- */
  const renderSubmenuEntries = useCallback(
    (entries: MenuEntry[]) => {
      const hoverBg = 'var(--mc-bg-pressed)'
      return entries.map((entry, i) => {
        if (isSeparator(entry)) {
          return <Separator key={i} />
        }
        return (
          <div
            key={i}
            role="menuitem"
            aria-disabled={entry.disabled}
            onClick={() => {
              if (entry.disabled) return
              entry.action?.()
              onClose()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: MENU_ITEM_HEIGHT,
              padding: '0 12px',
              fontSize: 13,
              color: 'var(--mc-text-primary)',
              opacity: entry.disabled ? 0.4 : 1,
              cursor: entry.disabled ? 'default' : 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              borderRadius: 4,
              margin: '0 4px',
            }}
            onMouseEnter={(e) => {
              if (!entry.disabled) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = hoverBg
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {entry.checked && (
                <span style={{ fontSize: 12, width: 14, textAlign: 'center', color: 'var(--mc-accent)' }}>&#10003;</span>
              )}
              {!entry.checked && <span style={{ width: 14 }} />}
              {entry.label}
            </span>
            {entry.shortcut && (
              <span style={{ fontSize: 12, opacity: 0.5, fontFamily: 'inherit' }}>
                {entry.shortcut}
              </span>
            )}
          </div>
        )
      })
    },
    [onClose]
  )

  /* ---- Not visible: render nothing ---- */
  if (!visible) return null

  const position = getPosition()

  /* ---- Render ---- */
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="编辑器上下文菜单"
      className="material-popover"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 10000,
        border: '1px solid var(--mc-border-medium)',
        borderRadius: 'var(--mc-radius-md, 8px)',
        boxShadow: 'var(--mc-shadow-popover)',
        padding: `${MENU_PADDING}px 0`,
        minWidth: MENU_WIDTH,
        maxHeight: `calc(100vh - 20px)`,
        overflowY: 'auto',
        outline: 'none',
      }}
    >
      {menuEntries.map((entry, index) => {
        if (isSeparator(entry)) {
          return <Separator key={index} />
        }

        const hasSubmenu = !!entry.submenu
        const isSubmenuOpen = activeSubmenuIndex === index

        return (
          <MenuItem
            key={index}
            item={entry}
            onAction={() => {
              if (entry.action) {
                entry.action()
                onClose()
              }
            }}
            onHover={(el) => {
              if (el) {
                setFocusedIndex(index)
                handleItemHover(index, el)
              } else {
                if (!hasSubmenu) {
                  setFocusedIndex(-1)
                }
              }
            }}
            focused={focusedIndex === index}
            submenuOpen={isSubmenuOpen}
            submenuRef={submenuRef}
            submenuPosition={isSubmenuOpen ? submenuPos : null}
            renderSubmenu={() => {
              if (!entry.submenu) return null
              return <>{renderSubmenuEntries(entry.submenu)}</>
            }}
          />
        )
      })}
    </div>,
    document.body
  )
}
