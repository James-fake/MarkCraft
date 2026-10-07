// L1 core/files —— 最近文件记录（localStorage + 订阅通知，无 UI / 无状态）。
//
// Phase 2（2026-09-17）自 features/fileManager/recentFilesManager.ts **原样下沉**
// （仅改文件名，内容未作任何改写）：
// 被 stores/FileStore 与 features/editor/toolbar(2) / aurora(2) 共用的跨层能力。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.2。
export interface RecentFileEntry {
  fileId: string
  fileName: string
  lastOpened: number
  isPinned: boolean
}

const RECENT_FILES_KEY = 'markcraft_recent_files'
const MAX_RECENT_FILES = 20

// 发布/订阅机制：当最近文件列表变化时通知所有订阅者
const listeners = new Set<() => void>()

function notifyChange() {
  listeners.forEach(fn => fn())
}

export function subscribeRecentFiles(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function addRecentFile(fileId: string, fileName: string): void {
  const files = getRecentFiles()
  const existingIdx = files.findIndex(f => f.fileId === fileId)
  if (existingIdx !== -1) {
    files[existingIdx].lastOpened = Date.now()
    files[existingIdx].fileName = fileName
  } else {
    files.unshift({ fileId, fileName, lastOpened: Date.now(), isPinned: false })
  }
  // Keep pinned + most recent
  const pinned = files.filter(f => f.isPinned)
  const unpinned = files.filter(f => !f.isPinned).slice(0, MAX_RECENT_FILES - pinned.length)
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify([...pinned, ...unpinned]))
  } catch {}
  notifyChange()
}

export function getRecentFiles(): RecentFileEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function togglePinFile(fileId: string): void {
  const files = getRecentFiles()
  const entry = files.find(f => f.fileId === fileId)
  if (entry) {
    entry.isPinned = !entry.isPinned
    try {
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files))
    } catch {}
    notifyChange()
  }
}

export function removeRecentFile(fileId: string): void {
  const files = getRecentFiles().filter(f => f.fileId !== fileId)
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files))
  } catch {}
  notifyChange()
}
