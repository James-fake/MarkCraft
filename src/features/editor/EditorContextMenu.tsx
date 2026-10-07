import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
// —— P5-1 拆分：类型/常量/构建器下沉 contextMenuShared，行级项组件拆 ContextMenuItems ——
import { buildMenuEntries, isSeparator } from './contextMenuShared'
import type { MenuEntry } from './contextMenuShared'
import { useLanguage } from '../../stores/LanguageStore'
import {
  MENU_WIDTH,
  SUBMENU_WIDTH,
  MENU_ITEM_HEIGHT,
  MENU_PADDING,
  SEPARATOR_HEIGHT,
} from './contextMenuShared'
import { MenuItem, Separator } from './ContextMenuItems'

export interface EditorContextMenuProps {
  visible: boolean
  x: number
  y: number
  editor: Editor | null // Tiptap Editor instance (null for source mode)
  mode: 'wysiwyg' | 'source'
  onClose: () => void
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
  const { t } = useLanguage()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null)
  const [submenuPos, setSubmenuPos] = useState<{ x: number; y: number } | null>(null)

  /* ---- Reset state when visibility changes ---- */
  useEffect(() => {
    if (visible) {
      setFocusedIndex(-1)
      setActiveSubmenuIndex(null)
      setSubmenuPos(null)
    }
  }, [visible])

  /* ---- Build menu entries ---- */
  // P5-1：条目构建（含「格式」「段落」子菜单定义）迁至 contextMenuShared#buildMenuEntries。
  // 原实现为 useCallback 立即调用（deps [editor, mode]），useMemo 语义等价。
  const menuEntries = useMemo(
    (): MenuEntry[] => buildMenuEntries(editor, mode, t.ctxMenu),
    [editor, mode, t.ctxMenu],
  )

  /* ---- Close on click outside or Escape ---- */
  // 注意：本 effect 依赖 menuEntries（上方立即调用产出的数组），故必须声明在其之后
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
  }, [visible, activeSubmenuIndex, focusedIndex, onClose, menuEntries])

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
        zIndex: 10030, // 层级带 §14：ContextMenu 瞬态右键菜单
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
