/**
 * Aurora · 编辑器多文件标签栏
 *
 * - 数据：复用真实 `useFileManager` tab API（tabs / switchTab / closeTab / closeAllTabs /
 *   closeOtherTabs / closeTabsToRight / reorderTabs）——D4 单一数据源，零平行 mock。
 * - 切换：点击标签 switchTab → activeTabId 变 → getActiveFileId() 变 → EditorPanel
 *   activeFileId 变 → EditorLayout 重挂载，编辑器内容随标签切换。
 * - 交互（对齐真实 TabBar 能力 + VS Code 桌面习惯）：
 *   · 点击切换；× 关闭；中键关闭；拖拽排序；右键菜单（关闭 / 关闭其他 / 关闭右侧 / 全部关闭）
 *   · 激活标签顶部 accent 细条；未保存 dirty 圆点
 * - 视觉：Aurora 桌面语言（--mc-* token / 发丝分隔 / 非卡片化 / 顶部 accent 条）
 */

import { useState, useCallback, useEffect } from 'react'
import { useFileManager } from '@stores/FileStore'
import type { Tab } from '@src/types/fileManager'
import { Icon } from '../../icons'

interface AuroraTabsProps {
  /** 关闭全部后回调（EditorPanel 可借此收起文件树/重置状态） */
  onAllClosed?: () => void
  /** 右键菜单「发布为博客」：传入目标文件 fileId，接回真实发布闭环 */
  onPublishFile?: (fileId: string) => void
  /** 右键菜单「加入知识库」：传入目标文件 fileId，接回真实 KB 串联 */
  onAddToKbFile?: (fileId: string) => void
}

export function AuroraTabs({ onAllClosed, onPublishFile, onAddToKbFile }: AuroraTabsProps) {
  const { tabs, switchTab, closeTab, closeAllTabs, closeOtherTabs, closeTabsToRight, reorderTabs } = useFileManager()

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tab: Tab } | null>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null)

  // —— 右键菜单（点击外部 / Esc 关闭）——
  useEffect(() => {
    if (!contextMenu) return
    const onDocClick = () => setContextMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  // —— 拖拽排序（HTML5 DnD，对齐真实 TabBar）——
  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])
  const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedTabId && tabId !== draggedTabId) setDropTargetTabId(tabId)
  }, [draggedTabId])
  const handleDrop = useCallback(
    (e: React.DragEvent, tabId: string) => {
      e.preventDefault()
      if (draggedTabId && draggedTabId !== tabId) reorderTabs(draggedTabId, tabId)
      setDraggedTabId(null)
      setDropTargetTabId(null)
    },
    [draggedTabId, reorderTabs],
  )
  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null)
    setDropTargetTabId(null)
  }, [])

  // —— 右键菜单动作（Esc / 点击外部关闭由 AuroraShell 级全局处理，此处仅本地）——
  const runMenuAction = useCallback(
    (action: 'close' | 'closeOthers' | 'closeRight' | 'closeAll') => {
      if (!contextMenu) return
      const tabId = contextMenu.tab.id
      setContextMenu(null)
      if (action === 'close') closeTab(tabId)
      else if (action === 'closeOthers') closeOtherTabs(tabId)
      else if (action === 'closeRight') closeTabsToRight(tabId)
      else if (action === 'closeAll') {
        closeAllTabs()
        onAllClosed?.()
      }
    },
    [contextMenu, closeTab, closeOtherTabs, closeTabsToRight, closeAllTabs, onAllClosed],
  )

  // 文件级右键动作（发布/知识库，目标为右键点击的标签对应文件）
  const runFileAction = useCallback(
    (action: 'publish' | 'addToKb') => {
      if (!contextMenu) return
      const fileId = contextMenu.tab.fileId
      setContextMenu(null)
      if (action === 'publish') onPublishFile?.(fileId)
      else onAddToKbFile?.(fileId)
    },
    [contextMenu, onPublishFile, onAddToKbFile],
  )

  // 关闭单个标签
  const handleCloseTab = useCallback(
    (tab: Tab) => {
      closeTab(tab.id)
      if (tabs.length <= 1) onAllClosed?.()
    },
    [closeTab, tabs.length, onAllClosed],
  )

  if (tabs.length === 0) return null

  return (
    <div className="aurora-tabs">
      <div className="aurora-tabs__strip">
        {tabs.map((tab) => {
          const isActive = tab.isActive
          const isDragged = draggedTabId === tab.id
          const isDropTarget = dropTargetTabId === tab.id
          return (
            <div
              key={tab.id}
              className={`aurora-tab ${isActive ? 'is-active' : ''} ${isDragged ? 'is-dragged' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => switchTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  handleCloseTab(tab)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, tab })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  switchTab(tab.id)
                }
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              title={tab.name}
            >
              {isActive && <span className="aurora-tab__indicator" />}
              <span className="aurora-tab__icon"><Icon.fileText size={13} /></span>
              {tab.isDirty && <span className="aurora-tab__dirty" title="未保存" />}
              <span className="aurora-tab__name">{tab.name.replace(/\.md$/, '')}</span>
              <button
                type="button"
                className="aurora-tab__close"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTab(tab)
                }}
                onAuxClick={(e) => e.stopPropagation()}
                aria-label="关闭标签"
                title="关闭标签"
              >
                <Icon.close size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* 右键菜单（Aurora 玻璃浮层） */}
      {contextMenu && (
        <div
          className="aurora-tabs__menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => runMenuAction('close')}>关闭标签</button>
          <button type="button" onClick={() => runMenuAction('closeOthers')}>关闭其他标签</button>
          <button type="button" onClick={() => runMenuAction('closeRight')}>关闭右侧标签</button>
          <span className="aurora-tabs__menu-sep" />
          <button type="button" onClick={() => runMenuAction('closeAll')}>全部关闭</button>
          {(onPublishFile || onAddToKbFile) && (
            <>
              <span className="aurora-tabs__menu-sep" />
              {onPublishFile && (
                <button type="button" onClick={() => runFileAction('publish')}>
                  <span className="ico"><Icon.send size={13} /></span>发布为博客
                </button>
              )}
              {onAddToKbFile && (
                <button type="button" onClick={() => runFileAction('addToKb')}>
                  <span className="ico"><Icon.book size={13} /></span>加入知识库
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}