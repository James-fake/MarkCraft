import { FileNode } from '../../types/fileManager'

// 生成今日日期字符串 YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 检查文件树中是否已存在今日笔记（递归搜索所有文件夹）
export function findDailyNote(rootFolder: FileNode, _folderId: string, dateStr: string): FileNode | null {
  const targetName = `${dateStr}.md`

  // 递归搜索整个文件树
  const searchRecursive = (node: FileNode): FileNode | null => {
    if (node.type === 'file' && node.name === targetName) return node
    if (node.children) {
      for (const child of node.children) {
        const found = searchRecursive(child)
        if (found) return found
      }
    }
    return null
  }

  return searchRecursive(rootFolder)
}

// 查找或创建"日记"文件夹
export function findOrCreateDailyFolder(
  rootFolder: FileNode,
  createFolder: (parentId: string, name: string) => string
): string {
  // 查找名为"日记"或"Daily Notes"的文件夹
  const DAILY_FOLDER_NAMES = ['日记', 'Daily Notes']

  const searchFolder = (node: FileNode): FileNode | null => {
    if (node.type === 'folder' && DAILY_FOLDER_NAMES.includes(node.name)) return node
    if (node.children) {
      for (const child of node.children) {
        const found = searchFolder(child)
        if (found) return found
      }
    }
    return null
  }

  const existing = searchFolder(rootFolder)
  if (existing) return existing.id

  // 如果不存在，在根目录下创建一个
  return createFolder(rootFolder.id, DAILY_FOLDER_NAMES[0])
}
