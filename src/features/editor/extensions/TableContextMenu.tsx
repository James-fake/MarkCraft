import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useLanguage } from '../../../stores/LanguageStore'

interface TableContextMenuProps {
  editor: Editor
}

interface MenuPosition {
  x: number
  y: number
}

interface MenuItem {
  label: string
  action: () => void
  disabled: boolean
}

interface MenuSeparator {
  type: 'separator'
}

type MenuEntry = MenuItem | MenuSeparator

function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return 'type' in entry && entry.type === 'separator'
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({ editor }) => {
  const [menu, setMenu] = useState<MenuPosition | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (editor && editor.isActive('table')) {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }
    }
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [editor])

  useEffect(() => {
    if (!menu) return
    const handler = () => setMenu(null)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler()
    }
    document.addEventListener('click', handler)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menu])

  if (!menu) return null

  const menuItems: MenuEntry[] = [
    { label: t.table.insertColLeft, action: () => editor.chain().focus().addColumnBefore().run(), disabled: !editor.can().addColumnBefore() },
    { label: t.table.insertColRight, action: () => editor.chain().focus().addColumnAfter().run(), disabled: !editor.can().addColumnAfter() },
    { label: t.table.insertRowAbove, action: () => editor.chain().focus().addRowBefore().run(), disabled: !editor.can().addRowBefore() },
    { label: t.table.insertRowBelow, action: () => editor.chain().focus().addRowAfter().run(), disabled: !editor.can().addRowAfter() },
    { type: 'separator' },
    { label: t.table.deleteCol, action: () => editor.chain().focus().deleteColumn().run(), disabled: !editor.can().deleteColumn() },
    { label: t.table.deleteRow, action: () => editor.chain().focus().deleteRow().run(), disabled: !editor.can().deleteRow() },
    { label: t.table.deleteTable, action: () => editor.chain().focus().deleteTable().run(), disabled: !editor.can().deleteTable() },
    { type: 'separator' },
    { label: t.table.mergeCells, action: () => editor.chain().focus().mergeCells().run(), disabled: !editor.can().mergeCells() },
    { label: t.table.splitCell, action: () => editor.chain().focus().splitCell().run(), disabled: !editor.can().splitCell() },
  ]

  return (
    <div className="material-popover" style={{
      position: 'fixed',
      left: menu.x,
      top: menu.y,
      zIndex: 10001,
      border: '1px solid var(--mc-border-medium)',
      borderRadius: 'var(--mc-radius-md, 8px)',
      padding: '4px 0',
      boxShadow: 'var(--mc-shadow-popover)',
      minWidth: 180,
    }}>
      {menuItems.map((item, idx) =>
        isSeparator(item) ? (
          <div key={idx} style={{ height: 1, backgroundColor: 'var(--mc-border-subtle)', margin: '4px 0' }} />
        ) : (
          <button
            key={idx}
            disabled={item.disabled}
            onClick={() => { item.action(); setMenu(null) }}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.4 : 1,
              color: 'var(--mc-text-primary)',
              fontSize: 13,
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--mc-bg-pressed)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

export default TableContextMenu
