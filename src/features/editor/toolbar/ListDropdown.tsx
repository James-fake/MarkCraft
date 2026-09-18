import type { Translations } from '@src/types/translations'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import WysiwygToolbarButton from '@features/editor/toolbar/WysiwygToolbarButton'
import useDropdownPosition from '@features/editor/toolbar/useDropdownPosition'
import { usePresence, POPOVER_EXIT_MS } from '@components/ui/usePresence'

export default function ListDropdown({ editor, t }: { editor: Editor; t: Translations }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pos = useDropdownPosition(open, btnRef)
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-2）
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isInList = editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')

  const items = [
    {
      label: '无序列表',
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '有序列表',
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '任务列表',
      active: editor.isActive('taskList'),
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    { separator: true },
    {
      label: '增加缩进',
      disabled: !isInList,
      action: () => editor.chain().focus().sinkListItem('listItem').run(),
    },
    {
      label: '减少缩进',
      disabled: !isInList,
      action: () => editor.chain().focus().liftListItem('listItem').run(),
    },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <WysiwygToolbarButton
        onClick={() => setOpen(!open)}
        title={t.toolbar.list}
        active={isInList}
        buttonRef={btnRef}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
        </svg>
      </WysiwygToolbarButton>

      {mounted && createPortal(
        <div
          ref={menuRef}
          className="aurora-dropdown"
          data-exiting={exiting || undefined}
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 9999,
            minWidth: '140px',
          }}
        >
          {items.map((item, idx) => {
            if ('separator' in item) {
              return <div key={idx} className="aurora-dropdown__separator" />
            }
            return (
              <div
                key={idx}
                onClick={() => {
                  if (item.disabled) return
                  item.action()
                  setOpen(false)
                }}
                className={`aurora-dropdown__item${item.active ? ' aurora-dropdown__item--highlighted' : ''}${item.disabled ? ' aurora-dropdown__item--disabled' : ''}`}
              >
                {item.label}
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
