import { FileManagerState, FileNode } from '../types/fileManager'
import { loadLargeData, saveLargeData } from '@core/storage/migrate'
import { db, NoteVersionRecord } from '@core/storage/db'
import { collectAllFiles } from '@core/files/fileTree'
import { safeJsonParse, safeJsonParseOrNull } from '@utils/safeJson'
import { isRecord } from '@utils/schemaGuards'

export interface BackupData {
  version: string
  type: 'markcraft-vault-backup'
  exportedAt: string
  data: {
    files?: FileManagerState
    settings?: string
    bookmarks?: string
    templates?: string
    recentFiles?: string
    graphSnapshots?: string
    noteVersions?: NoteVersionRecord[]
  }
}

/** 导入冲突信息 */
export interface ImportConflict {
  fileName: string
}

/** 导入结果 */
export interface ImportResult {
  success: boolean
  message: string
  conflicts?: ImportConflict[]
  importedCount?: number
  skippedCount?: number
  renamedCount?: number
}

const KEYS_TO_BACKUP = [
  'markcraft_settings',
  'markcraft-bookmarks',
  'markcraft-templates',
  'recent-files',
  'graph-snapshots',
]

const FILE_MANAGER_KEY = 'markcraft-file-manager'

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}


/** 检查文件树中是否已存在指定名称的文件 */
function hasFileName(root: FileNode, name: string): boolean {
  if (root.type === 'file' && root.name === name) return true
  if (root.children) {
    return root.children.some(child => hasFileName(child, name))
  }
  return false
}

/** 生成不冲突的唯一文件名（添加 -1, -2 后缀） */
function getUniqueName(root: FileNode, name: string): string {
  const dotIdx = name.lastIndexOf('.')
  const baseName = dotIdx > 0 ? name.slice(0, dotIdx) : name
  const ext = dotIdx > 0 ? name.slice(dotIdx) : ''
  let counter = 1
  let newName = name
  while (hasFileName(root, newName)) {
    newName = `${baseName}-${counter}${ext}`
    counter++
  }
  return newName
}

/** 将文件添加到根文件夹 */
function addFileToRoot(root: FileNode, file: FileNode): FileNode {
  return {
    ...root,
    children: [...(root.children || []), file],
    isExpanded: true,
  }
}

/** 从 IndexedDB 读取当前 FileManagerState */
async function getCurrentFiles(): Promise<FileManagerState | null> {
  const data = await loadLargeData(FILE_MANAGER_KEY)
  return data ? safeJsonParse(data, null) : null
}

/** 导出完整 vault 备份 */
export async function exportVault(files: FileManagerState): Promise<string> {
  const data: BackupData['data'] = { files }

  for (const key of KEYS_TO_BACKUP) {
    const value = localStorage.getItem(key)
    if (value) {
      switch (key) {
        case 'markcraft_settings': data.settings = value; break
        case 'markcraft-bookmarks': data.bookmarks = value; break
        case 'markcraft-templates': data.templates = value; break
        case 'recent-files': data.recentFiles = value; break
        case 'graph-snapshots': data.graphSnapshots = value; break
      }
    }
  }

  // 图谱快照可能在 IndexedDB
  if (!data.graphSnapshots) {
    const idbValue = await loadLargeData('graph-snapshots')
    if (idbValue) data.graphSnapshots = idbValue
  }

  // 包含笔记版本数据
  try {
    const allVersions = await db.versions.toArray()
    if (allVersions.length > 0) {
      data.noteVersions = allVersions
    }
  } catch (e) {
    console.error('[backup] export noteVersions failed:', e)
  }

  const backup: BackupData = {
    version: '1.0',
    type: 'markcraft-vault-backup',
    exportedAt: new Date().toISOString(),
    data,
  }

  return JSON.stringify(backup, null, 2)
}

/** 导入 vault 备份（仅检测冲突，不执行导入） */
export async function importVault(jsonStr: string): Promise<ImportResult> {
  try {
    const backup = safeJsonParseOrNull<BackupData>(jsonStr)
    if (!backup || backup.type !== 'markcraft-vault-backup' || !isRecord(backup.data)) {
      return { success: false, message: '无效的备份文件格式' }
    }

    // 检测同名文件冲突
    const conflicts: ImportConflict[] = []
    if (backup.data.files?.rootFolder) {
      const currentFiles = await getCurrentFiles()
      if (currentFiles?.rootFolder) {
        const backupFileList = collectAllFiles(backup.data.files.rootFolder)
        const currentRoot = currentFiles.rootFolder
        for (const file of backupFileList) {
          if (hasFileName(currentRoot, file.name)) {
            conflicts.push({ fileName: file.name })
          }
        }
      }
    }

    return {
      success: true,
      message: conflicts.length > 0
        ? `检测到 ${conflicts.length} 个同名文件冲突`
        : '未检测到冲突，可以安全导入',
      conflicts,
    }
  } catch (e) {
    return { success: false, message: `检测失败: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** 按策略导入 vault 备份 */
export async function importVaultWithStrategy(
  jsonStr: string,
  strategy: 'overwrite' | 'skip' | 'rename'
): Promise<ImportResult> {
  try {
    const backup = safeJsonParseOrNull<BackupData>(jsonStr)
    if (!backup || backup.type !== 'markcraft-vault-backup' || !isRecord(backup.data)) {
      return { success: false, message: '无效的备份文件格式' }
    }

    // 导入前自动备份当前数据
    try {
      const currentFiles = await getCurrentFiles()
      if (currentFiles) {
        await createAutoBackup(currentFiles)
      }
    } catch (e) {
      console.error('[backup] pre-import auto backup failed:', e)
    }

    let importedCount = 0
    let skippedCount = 0
    let renamedCount = 0

    // 恢复文件数据
    if (backup.data.files) {
      if (strategy === 'overwrite') {
        // 直接覆盖：用备份的 FileManagerState 替换当前
        await saveLargeData(FILE_MANAGER_KEY, JSON.stringify(backup.data.files))
        importedCount = collectAllFiles(backup.data.files.rootFolder).length
      } else {
        // skip / rename：合并文件到当前树
        const currentFiles = await getCurrentFiles()
        let currentRoot: FileNode
        if (currentFiles?.rootFolder) {
          // 深拷贝避免 mutating 原对象
          currentRoot = JSON.parse(JSON.stringify(currentFiles.rootFolder)) as FileNode
        } else {
          currentRoot = {
            id: 'root',
            name: 'root',
            type: 'folder',
            children: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        }

        const backupFileList = collectAllFiles(backup.data.files.rootFolder)
        for (const file of backupFileList) {
          if (hasFileName(currentRoot, file.name)) {
            if (strategy === 'skip') {
              skippedCount++
              continue
            } else {
              // rename
              const newName = getUniqueName(currentRoot, file.name)
              currentRoot = addFileToRoot(currentRoot, {
                ...file,
                id: generateId(),
                name: newName,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
              renamedCount++
              importedCount++
            }
          } else {
            currentRoot = addFileToRoot(currentRoot, {
              ...file,
              id: generateId(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            importedCount++
          }
        }

        const mergedState: FileManagerState = {
          rootFolder: currentRoot,
          tabs: [],
          activeTabId: null,
          searchQuery: '',
          sidebarVisible: currentFiles?.sidebarVisible ?? true,
        }
        await saveLargeData(FILE_MANAGER_KEY, JSON.stringify(mergedState))
      }
    }

    // 恢复设置类数据
    if (backup.data.settings) localStorage.setItem('markcraft_settings', backup.data.settings)
    if (backup.data.bookmarks) localStorage.setItem('markcraft-bookmarks', backup.data.bookmarks)
    if (backup.data.templates) localStorage.setItem('markcraft-templates', backup.data.templates)
    if (backup.data.recentFiles) localStorage.setItem('recent-files', backup.data.recentFiles)

    // 恢复图谱快照
    if (backup.data.graphSnapshots) {
      try {
        await saveLargeData('graph-snapshots', backup.data.graphSnapshots)
      } catch {}
    }

    // 恢复笔记版本
    if (backup.data.noteVersions && backup.data.noteVersions.length > 0) {
      try {
        if (strategy === 'overwrite') {
          await db.versions.clear()
        }
        await db.versions.bulkPut(backup.data.noteVersions)
      } catch (e) {
        console.error('[backup] restore noteVersions failed:', e)
      }
    }

    const parts: string[] = []
    if (importedCount > 0) parts.push(`导入 ${importedCount} 个文件`)
    if (skippedCount > 0) parts.push(`跳过 ${skippedCount} 个冲突文件`)
    if (renamedCount > 0) parts.push(`重命名 ${renamedCount} 个冲突文件`)
    const summary = parts.length > 0 ? `（${parts.join('，')}）` : ''

    return {
      success: true,
      message: `备份导入成功${summary}，请刷新页面以加载恢复的数据`,
      importedCount,
      skippedCount,
      renamedCount,
    }
  } catch (e) {
    return { success: false, message: `导入失败: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** 创建自动备份到 IndexedDB backups 表 */
export async function createAutoBackup(files: FileManagerState): Promise<void> {
  try {
    const data = await exportVault(files)
    await db.backups.add({
      createdAt: Date.now(),
      type: 'auto',
      data,
    })
    // 保留最近 7 个
    const all = await db.backups.where('type').equals('auto').toArray()
    all.sort((a, b) => b.createdAt - a.createdAt)
    const toDelete = all.slice(7)
    if (toDelete.length > 0) {
      await db.backups.bulkDelete(toDelete.map(b => b.id!))
    }
  } catch (e) {
    console.error('[backup] createAutoBackup failed:', e)
  }
}

/** 获取所有备份列表 */
export async function listBackups(): Promise<{ id: number; createdAt: number; type: string }[]> {
  const all = await db.backups.toArray()
  return all.map(b => ({ id: b.id!, createdAt: b.createdAt, type: b.type })).sort((a, b) => b.createdAt - a.createdAt)
}

/** 恢复备份 */
export async function restoreBackup(backupId: number): Promise<ImportResult> {
  const backup = await db.backups.get(backupId)
  if (!backup) return { success: false, message: '备份不存在' }
  return importVaultWithStrategy(backup.data, 'overwrite')
}

/** 删除备份 */
export async function deleteBackup(backupId: number): Promise<void> {
  await db.backups.delete(backupId)
}

/** 启动定时自动备份调度器（每天检查一次，若今天未备份则自动创建） */
export function startAutoBackupScheduler(): ReturnType<typeof setInterval> {
  const checkAndBackup = async () => {
    try {
      const all = await db.backups.where('type').equals('auto').toArray()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.getTime()

      const hasTodayBackup = all.some(b => b.createdAt >= todayStart)
      if (!hasTodayBackup) {
        const files = await getCurrentFiles()
        if (files) {
          await createAutoBackup(files)
          console.log('[backup] auto backup created by scheduler')
        }
      }
    } catch (e) {
      console.error('[backup] auto backup scheduler failed:', e)
    }
  }

  // 启动时立即检查一次
  checkAndBackup()

  // 每 24 小时检查一次
  return setInterval(checkAndBackup, 24 * 60 * 60 * 1000)
}
