import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import {
  getCanvasList,
  deleteCanvas,
  loadCanvas,
  getTrash,
  restoreCanvas,
  purgeFromTrash,
  clearTrash,
  renameCanvas,
  type CanvasListItem,
  type CanvasTrashItem,
} from '@features/canvas-v2'
import { downloadBlob } from '@features/canvas-v2/utils/canvasExport'

/**
 * Aurora 白板列表（.aurora-canvaslist，真实 canvasStore）—— 打开/新建/删除/导出 + 回收站
 */
export interface CanvasListMenuProps {
  open: boolean
  currentId: string
  onClose: () => void
  onOpen: (id: string) => void
  onCreate: (name: string) => void
  toast?: (msg: string) => void
}

type ListTab = 'list' | 'trash'

export function CanvasListMenu({ open, currentId, onClose, onOpen, onCreate, toast }: CanvasListMenuProps) {
  const [items, setItems] = useState<CanvasListItem[]>([])
  const [trashItems, setTrashItems] = useState<CanvasTrashItem[]>([])
  const [tab, setTab] = useState<ListTab>('list')
  // 新建白板：内联名称输入（替代原本「直接以默认名创建」）
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  // 重命名白板：行内编辑
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (!open) return
    let alive = true
    ;(async () => {
      try {
        const [list, trash] = await Promise.all([getCanvasList(), getTrash()])
        if (alive) {
          setItems(list)
          setTrashItems(trash)
        }
      } catch {
        /* 空列表 */
      }
    })()
    return () => {
      alive = false
    }
  }, [open])

  // 刷新列表 + 回收站
  const refresh = useCallback(async () => {
    try {
      const [list, trash] = await Promise.all([getCanvasList(), getTrash()])
      setItems(list)
      setTrashItems(trash)
    } catch {
      /* 保持现状 */
    }
  }, [])

  // 新建白板：打开内联输入框
  const startCreate = () => {
    setNewName('未命名白板')
    setCreating(true)
  }
  // 确认新建：把名称交给父级（父级负责 createCanvas + 打开）
  const confirmCreate = async () => {
    const name = newName.trim() || '未命名白板'
    setCreating(false)
    await onCreate(name)
  }
  // 重命名：进入行内编辑
  const startRename = (c: CanvasListItem) => {
    setRenameValue(c.name)
    setRenamingId(c.id)
  }
  // 提交重命名：空名视为取消
  const commitRename = async (id: string) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name) return
    await renameCanvas(id, name)
    await refresh()
  }

  if (!open) return null

  const handleDelete = async (id: string, name: string) => {
    await deleteCanvas(id)
    const [list, trash] = await Promise.all([getCanvasList(), getTrash()])
    setItems(list)
    setTrashItems(trash)
    toast?.(`已删除白板「${name}」，可在回收站恢复`)
  }

  const handleExportItem = async (id: string, name: string) => {
    const d = await loadCanvas(id)
    if (!d) {
      toast?.('白板数据读取失败')
      return
    }
    const blob = new Blob([JSON.stringify(d.data, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `${name || '白板'}.json`)
    toast?.(`已导出「${name || '白板'}」数据`)
  }

  const handleRestore = async (id: string) => {
    const d = await restoreCanvas(id)
    const [list, trash] = await Promise.all([getCanvasList(), getTrash()])
    setItems(list)
    setTrashItems(trash)
    toast?.(`已恢复「${d?.name ?? '白板'}」`)
    onOpen(id)
  }

  const handlePurge = async (id: string, name: string) => {
    await purgeFromTrash(id)
    setTrashItems(await getTrash())
    toast?.(`已彻底删除「${name}」`)
  }

  const handleClearTrash = async () => {
    await clearTrash()
    setTrashItems([])
    toast?.('回收站已清空')
  }

  const fmt = (ts: number) => {
    const d = Date.now() - ts
    const m = Math.floor(d / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    return `${Math.floor(h / 24)} 天前`
  }

  const el = (
    <div className="aurora-canvaslist__overlay" onClick={onClose}>
      <div className="aurora-cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="aurora-cmdk__search">
          <Icon.search size={15} />
          <span className="aurora-cmdk__search-input" style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 13, color: 'var(--mc-text-primary)' }}>
            白板管理
          </span>
          <button type="button" className="aurora-cmdk__esc" onClick={onClose}>关闭</button>
        </div>
        <div className="aurora-canvaslist" style={{ overflowY: 'auto', padding: 12 }}>
          <div className="aurora-canvaslist__tabs" role="tablist" aria-label="白板列表与回收站">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'list'}
              className={`aurora-canvaslist__tab ${tab === 'list' ? 'aurora-canvaslist__tab--on' : ''}`}
              onClick={() => setTab('list')}
            >
              白板列表（{items.length}）
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'trash'}
              className={`aurora-canvaslist__tab ${tab === 'trash' ? 'aurora-canvaslist__tab--on' : ''}`}
              onClick={() => setTab('trash')}
            >
              回收站（{trashItems.length}）
            </button>
          </div>

          {tab === 'list' && (
            <>
              {creating && (
                <div className="aurora-canvaslist__create">
                  <input
                    className="aurora-canvaslist__create-input"
                    autoFocus
                    value={newName}
                    placeholder="输入白板名称"
                    onChange={(e) => setNewName(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void confirmCreate()
                      else if (e.key === 'Escape') setCreating(false)
                    }}
                  />
                  <button type="button" className="aurora-canvaslist__create-ok" title="确认新建" aria-label="确认新建" onClick={() => void confirmCreate()}>
                    <Icon.check size={14} />
                  </button>
                  <button type="button" className="aurora-canvaslist__create-cancel" title="取消" aria-label="取消" onClick={() => setCreating(false)}>
                    <Icon.close size={14} />
                  </button>
                </div>
              )}
              {items.length === 0 && <div className="aurora-canvaslist__empty" style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--mc-text-tertiary)' }}>暂无白板，点击下方新建</div>}
              {items.map((c) => {
                const isRenaming = renamingId === c.id
                return (
                  <div
                    key={c.id}
                    className={`aurora-canvaslist__item ${c.id === currentId ? 'aurora-canvaslist__item--current' : ''}`}
                    onClick={() => {
                      if (!isRenaming) onOpen(c.id)
                    }}
                  >
                    <div className="aurora-canvaslist__cover" style={{ background: c.thumbnail ? `url(${c.thumbnail}) center/cover no-repeat` : 'var(--mc-bg-hover)' }} />
                    <div className="aurora-canvaslist__meta">
                      {isRenaming ? (
                        <input
                          className="aurora-canvaslist__rename-input"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRename(c.id)
                            else if (e.key === 'Escape') setRenamingId(null)
                          }}
                          onBlur={() => void commitRename(c.id)}
                        />
                      ) : (
                        <div className="aurora-canvaslist__name">
                          <span>{c.name}</span>
                          {c.id === currentId && <span className="aurora-canvaslist__current-tag">当前</span>}
                        </div>
                      )}
                      <div className="aurora-canvaslist__time">{fmt(c.updatedAt)} · {c.cardCount ?? 0} 卡片</div>
                    </div>
                    <div className="aurora-canvaslist__actions">
                      <button
                        type="button"
                        className="aurora-canvaslist__del"
                        title="重命名白板"
                        aria-label="重命名白板"
                        onClick={(e) => {
                          e.stopPropagation()
                          startRename(c)
                        }}
                      >
                        <Icon.edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="aurora-canvaslist__del"
                        title="导出白板数据（JSON）"
                        aria-label="导出白板数据"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleExportItem(c.id, c.name)
                        }}
                      >
                        <Icon.download size={14} />
                      </button>
                      <button
                        type="button"
                        className="aurora-canvaslist__del"
                        title="删除白板"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(c.id, c.name)
                        }}
                      >
                        <Icon.trash size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {!creating && (
                <button type="button" className="aurora-ctop__act aurora-ctop__act--primary" style={{ marginTop: 12, justifyContent: 'center', width: '100%' }} onClick={() => startCreate()}>
                  <Icon.plus size={14} /> 新建白板
                </button>
              )}
            </>
          )}

          {tab === 'trash' && (
            <>
              {trashItems.length === 0 ? (
                <div className="aurora-canvaslist__empty" style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--mc-text-tertiary)' }}>
                  回收站为空<br />删除的白板保留 30 天，可在此恢复
                </div>
              ) : (
                <>
                  <div className="aurora-canvaslist__trashhead">
                    <span>删除的白板保留 30 天</span>
                    <button type="button" className="aurora-canvaslist__clear" onClick={() => void handleClearTrash()}>
                      清空回收站
                    </button>
                  </div>
                  {trashItems.map((c) => (
                    <div key={c.id} className="aurora-canvaslist__item">
                      <div className="aurora-canvaslist__cover" style={{ background: c.thumbnail ? `url(${c.thumbnail}) center/cover no-repeat` : 'var(--mc-bg-hover)' }} />
                      <div className="aurora-canvaslist__meta">
                        <div className="aurora-canvaslist__name">
                          <span>{c.name}</span>
                        </div>
                        <div className="aurora-canvaslist__time">{fmt(c.deletedAt)} 删除 · {c.cardCount ?? 0} 卡片</div>
                      </div>
                      <div className="aurora-canvaslist__actions">
                        <button
                          type="button"
                          className="aurora-canvaslist__del"
                          title="恢复白板"
                          aria-label="恢复白板"
                          onClick={() => void handleRestore(c.id)}
                        >
                          <Icon.undo size={14} />
                        </button>
                        <button
                          type="button"
                          className="aurora-canvaslist__del aurora-canvaslist__del--danger"
                          title="彻底删除（不可恢复）"
                          aria-label="彻底删除"
                          onClick={() => void handlePurge(c.id, c.name)}
                        >
                          <Icon.trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(el, document.body)
}
