import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useLanguage } from '../../stores/LanguageStore'
import {
  collectTableRows,
  collectTableRowJSONs,
  tableHasHeader,
  sortRowOrder,
} from './tableSort'

interface TableBubbleMenuProps {
  editor: Editor
}

export default function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!editor.isActive('table')) {
      setVisible(false)
      return
    }

    // 获取当前光标所在表格节点的 DOM 元素（而非文档里第一个 table）。
    // 多表格并存时，原 querySelector('table') 恒取首个，导致菜单定位/排序错位。
    const { $anchor } = editor.state.selection
    const dom = editor.view.domAtPos($anchor.pos)
    const startNode =
      dom.node.nodeType === Node.TEXT_NODE ? dom.node.parentElement : (dom.node as HTMLElement | null)
    const tableEl = startNode?.closest('table') as HTMLElement | null

    if (!tableEl) {
      setVisible(false)
      return
    }

    const editorWrapper = tableEl.closest('.tiptap-editor-wrapper') as HTMLElement | null
    if (!editorWrapper) {
      setVisible(false)
      return
    }

    const wrapperRect = editorWrapper.getBoundingClientRect()
    const tableRect = tableEl.getBoundingClientRect()

    // 将浮动菜单定位在表格上方居中
    const top = tableRect.top - wrapperRect.top - 40
    const left = tableRect.left - wrapperRect.left + tableRect.width / 2

    setPosition({ top: Math.max(0, top), left })
    setVisible(true)
  }, [editor])

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(updatePosition)
    }

    editor.on('selectionUpdate', handler)
    editor.on('transaction', handler)

    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', handler)
    }
  }, [editor, updatePosition])

  // 初始检测
  useEffect(() => {
    updatePosition()
  }, [updatePosition])

  /**
   * 按当前所在列排序表格（E4：P3 表格编辑深度）
   * 提取全表文本 → 算出新行序（表头行不动）→ 按原行 JSON（保留 attrs/格式）重组 →
   * 单次 replaceWith 替换整个 table 节点（保留 table attrs，selection 由 PM 自动映射）
   */
  const sortTable = useCallback(
    (dir: 'asc' | 'desc') => {
      const { state } = editor
      const { $anchor } = state.selection
      const cell = $anchor.parent
      if (cell.type.name !== 'tableCell' && cell.type.name !== 'tableHeader') return
      const table = $anchor.node(-2)
      if (!table || table.type.name !== 'table') return
      const colIndex = $anchor.index($anchor.depth - 1)

      const rows = collectTableRows(table)
      if (!rows.length) return
      const hasHeader = tableHasHeader(table)
      const order = sortRowOrder(rows, colIndex, dir, hasHeader)

      // 保留每行原 JSON（cell attrs/内部格式不丢），按新行序重组，table attrs 一并保留
      const rowJSONs = collectTableRowJSONs(table)
      const newTableJSON = {
        ...(table.toJSON() as Record<string, unknown>),
        content: order.map((i) => rowJSONs[i]),
      }
      const newTable = state.schema.nodeFromJSON(newTableJSON)

      // 定位表格起点，单次替换整个节点（行数不变，不会断裂/增行）
      let tableStart = 0
      for (let d = $anchor.depth; d > 0; d--) {
        if ($anchor.node(d).type.name === 'table') {
          tableStart = $anchor.start(d) - 1
          break
        }
      }
      const tableNode = state.doc.nodeAt(tableStart)
      if (!tableNode) return
      editor.view.dispatch(state.tr.replaceWith(tableStart, tableStart + tableNode.nodeSize, newTable))
    },
    [editor],
  )

  if (!visible || !editor.isActive('table')) return null

  const canMerge = editor.can().mergeCells()
  const canSplit = editor.can().splitCell()

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        padding: '3px 6px',
        backgroundColor: 'var(--editor-bg)',
        border: '1px solid var(--editor-border)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* 添加行 */}
      <MenuBtn
        title={t.table.addRow}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
        </svg>
        <span style={{ fontSize: '10px', marginLeft: '1px' }}>↓</span>
      </MenuBtn>

      {/* 删除行 */}
      <MenuBtn
        title={t.table.deleteRow}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        </svg>
      </MenuBtn>

      <Separator />

      {/* 添加列 */}
      <MenuBtn
        title={t.table.addCol}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
        </svg>
        <span style={{ fontSize: '10px', marginLeft: '1px' }}>→</span>
      </MenuBtn>

      {/* 删除列 */}
      <MenuBtn
        title={t.table.deleteCol}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        </svg>
      </MenuBtn>

      <Separator />

      {/* 合并单元格 */}
      <MenuBtn
        title={t.table.mergeCells || '合并单元格'}
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!canMerge}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 12h16" />
        </svg>
      </MenuBtn>

      {/* 拆分单元格 */}
      <MenuBtn
        title={t.table.splitCell || '拆分单元格'}
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!canSplit}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 12h16M12 4v16" />
        </svg>
      </MenuBtn>

      <Separator />

      {/* 切换表头行 */}
      <MenuBtn
        title={t.table.header}
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        <span style={{ fontSize: '11px', fontWeight: 700 }}>H</span>
      </MenuBtn>

      <Separator />

      {/* 排序当前列（E4） */}
      <MenuBtn title="按此列升序排序" onClick={() => sortTable('asc')}>
        <span style={{ fontSize: '11px', fontWeight: 900 }}>▲</span>
      </MenuBtn>
      <MenuBtn title="按此列降序排序" onClick={() => sortTable('desc')}>
        <span style={{ fontSize: '11px', fontWeight: 900 }}>▼</span>
      </MenuBtn>

      <Separator />

      {/* 删除表格 */}
      <MenuBtn
        title={t.table.deleteTable || '删除表格'}
        onClick={() => editor.chain().focus().deleteTable().run()}
        danger
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </MenuBtn>
    </div>
  )
}

function Separator() {
  return <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--editor-border)', margin: '0 2px', flexShrink: 0 }} />
}

function MenuBtn({
  onClick,
  title,
  children,
  disabled = false,
  danger = false,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
        height: '26px',
        minWidth: '26px',
        padding: '0 4px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        color: danger ? '#ef4444' : 'var(--editor-text)',
        opacity: disabled ? 0.3 : 0.7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.backgroundColor = danger ? 'rgba(239,68,68,0.1)' : 'var(--mc-accent-soft)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = disabled ? '0.3' : '0.7'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
