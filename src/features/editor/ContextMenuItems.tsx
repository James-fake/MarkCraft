import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type {
  MenuItemDef,
} from './contextMenuShared'
import {
  MENU_ITEM_HEIGHT,
  MENU_PADDING,
  SUBMENU_WIDTH,
} from './contextMenuShared'

/**
 * 右键菜单的行级项与分隔线（P5-1 自 EditorContextMenu.tsx 拆出，JSX 逐字未动）。
 * MenuItem 的子菜单经 createPortal 挂 body，z-index 10030 = 层级带 §14
 * （ContextMenu 瞬态右键菜单；子菜单靠 DOM 顺序压在父菜单之上）。
 */

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

export function MenuItem({
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
            zIndex: 10030, // 层级带 §14：ContextMenu 瞬态右键菜单（子菜单靠 DOM 顺序压在父菜单之上）
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

export function Separator() {
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
