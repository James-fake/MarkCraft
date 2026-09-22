import { useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Icon } from '../../icons'
import { fileTypeMeta } from '../../themes/categoricalColors'
import { useFileManager } from '@stores/FileStore'
import { useUsageDocsScope } from '@hooks/useUsageDocsScope'
import type { FileNode } from '@src/types/fileManager'

/**
 * 编辑器空态引导页专用文件列表——「全部文件」扁平列表（彻底放弃文件树思维）。
 *
 * 信息结构：按「所在文件夹」分组的扁平列表（类型图标 + 名称），零缩进、零展开、零树形，
 * 不再展示「最近打开」区块（用户要求只保留全部文件）。数据来自真实 useFileManager().rootFolder，
 * 打开走真实 openFile（空态自然退出）。
 */

const ROOT_LABEL = '根目录'

interface FileItem {
  node: FileNode
  folder: string // 文件所在「直接父文件夹」名称；根目录文件为空串
}

// 收集所有文件（不含文件夹），并记录其直接父文件夹名——扁平结构，不再保留树形层级
function collectFiles(nodes: FileNode[], parentName: string, acc: FileItem[]) {
  for (const n of nodes) {
    if (n.type === 'folder') collectFiles(n.children ?? [], n.name, acc)
    else acc.push({ node: n, folder: parentName })
  }
}

export function EmptyFileBrowser() {
  const { rootFolder, openFile } = useFileManager()
  // 内置「使用文档」不进编辑器的文件列表（判定单源，与 FileTree 同一份）
  const usageDocs = useUsageDocsScope()

  const allFiles = useMemo(() => {
    const acc: FileItem[] = []
    collectFiles(rootFolder.children ?? [], '', acc)
    // 视图层过滤：数据不动（文件仍在树里、仍属知识库），只是不在此列出
    return usageDocs.hiddenIds.size > 0
      ? acc.filter((f) => !usageDocs.hiddenIds.has(f.node.id))
      : acc
  }, [rootFolder, usageDocs])

  // 全量文件：按「所在文件夹」分组（扁平，非树）
  const groups = useMemo(() => {
    const m = new Map<string, FileNode[]>()
    for (const f of allFiles) {
      const key = f.folder || ROOT_LABEL
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(f.node)
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0] === ROOT_LABEL) return -1
      if (b[0] === ROOT_LABEL) return 1
      return a[0].localeCompare(b[0], 'zh')
    })
  }, [allFiles])

  const totalFiles = allFiles.length

  const onRowKey = (node: FileNode) => (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openFile(node.id)
    }
  }
  const openRow = (node: FileNode) => openFile(node.id)

  const renderFileRow = (node: FileNode) => {
    const meta = fileTypeMeta(node)
    const NodeIcon = Icon[meta.icon]
    return (
      <div
        key={node.id}
        className="aurora-emptyfiles__row"
        onClick={() => openRow(node)}
        role="button"
        tabIndex={0}
        onKeyDown={onRowKey(node)}
      >
        <span className="aurora-emptyfiles__row-icon" style={{ color: meta.color }}>
          <NodeIcon size={15} />
        </span>
        <span className="aurora-emptyfiles__row-name">{node.name}</span>
      </div>
    )
  }

  if (totalFiles === 0) {
    return (
      <div className="aurora-emptyfiles">
        <div className="aurora-emptyfiles__empty">还没有文件，点击上方「新建笔记」开始写作</div>
      </div>
    )
  }

  return (
    <div className="aurora-emptyfiles">
      <div className="aurora-emptyfiles__head">
        <span className="aurora-emptyfiles__title">全部文件</span>
        <span className="aurora-emptyfiles__count">{totalFiles}</span>
      </div>
      {groups.map(([folder, nodes]) => (
        <div key={folder} className="aurora-emptyfiles__group">
          <div className="aurora-emptyfiles__group-title">{folder}</div>
          <div className="aurora-emptyfiles__list">
            {nodes.map((node) => renderFileRow(node))}
          </div>
        </div>
      ))}
    </div>
  )
}
