import { FileNode } from '../../types/fileManager'
import { addChildNode } from '../../services/fileService'

/**
 * P2-8 PWA 深化 · 快速记一笔
 *
 * 纯函数层：构建一条"速记"笔记并返回插入到文件树后的新根，便于测试与复用。
 * 真实落盘由调用方（App / FileManager）负责，本模块不直接触碰 IndexedDB。
 */

export const INBOX_FOLDER_NAME = '收件箱'
export const QUICK_CAPTURE_PREFIX = '快速记一笔'

function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 由内容推导笔记名：优先用首行摘要，否则用时间戳 */
export function deriveQuickNoteName(content: string, now: Date = new Date()): string {
  const firstLine =
    (content || '')
      .split('\n')
      .map(s => s.trim())
      .find(l => l.length > 0) ?? ''
  const clean = firstLine.replace(/^#+\s*/, '').replace(/[\\/:*?"<>|]/g, '').trim()
  if (clean) {
    const truncated = clean.length > 24 ? clean.slice(0, 24) + '…' : clean
    return `${QUICK_CAPTURE_PREFIX} · ${truncated}`
  }
  return `${QUICK_CAPTURE_PREFIX} · ${formatDateTime(now)}`
}

/** 构建一条速记笔记节点 */
export function buildQuickNote(content: string, opts?: { now?: number; id?: string }): FileNode {
  const now = opts?.now ?? Date.now()
  const d = new Date(now)
  return {
    id: opts?.id ?? `quick-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: deriveQuickNoteName(content, d),
    type: 'file',
    content,
    createdAt: now,
    updatedAt: now,
  }
}

/** 在文件树中查找收件箱文件夹（递归，大小写精确匹配） */
export function findInboxId(root: FileNode): string | null {
  let found: string | null = null
  const walk = (n: FileNode) => {
    if (found) return
    if (n.type === 'folder' && n.name === INBOX_FOLDER_NAME) {
      found = n.id
      return
    }
    n.children?.forEach(walk)
  }
  walk(root)
  return found
}

/** 把速记笔记插入到收件箱（或根）下，返回新根与父节点 id */
export function insertQuickNote(
  root: FileNode,
  note: FileNode,
  inboxId?: string | null
): { root: FileNode; parentId: string } {
  const parentId = inboxId ?? root.id
  return { root: addChildNode(root, parentId, note), parentId }
}
