import { findDailyNote, findOrCreateDailyFolder } from './DailyNoteManager'
import { FileNode } from '../../types/fileManager'
import { getAllTemplates, applyTemplate } from '../templates/templateManager'

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Generate daily note template content
 */
function generateDailyNoteTemplate(date: Date): string {
  const dateStr = formatDate(date)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = weekDays[date.getDay()]
  return `# ${dateStr} 星期${weekDay}

## 日记


## 任务
- [ ]

## 笔记

`
}

/**
 * Find or create a daily note for the given date.
 * Returns the fileId.
 */
export function openDailyNote(
  date: Date,
  rootFolder: FileNode,
  createFile: (parentId: string, name: string, content?: string) => any,
  createFolder: (parentId: string, name: string) => string,
  openFile: (fileId: string) => void,
): string | undefined {
  const dateStr = formatDate(date)
  const fileName = `${dateStr}.md`

  // Check if the daily note already exists
  const existing = findDailyNote(rootFolder, 'root', dateStr)
  if (existing) {
    openFile(existing.id)
    return existing.id
  }

  // Find or create the journal folder
  const folderId = findOrCreateDailyFolder(rootFolder, createFolder)

  // Apply daily template if available, otherwise use default
  const templates = getAllTemplates()
  const dailyTemplate = templates.find(t => t.id === 'daily-journal')
  const content = dailyTemplate ? applyTemplate(dailyTemplate) : generateDailyNoteTemplate(date)

  // Create the daily note
  const newId = createFile(folderId, fileName, content)
  if (newId) {
    openFile(newId)
    return newId
  }
  return undefined
}
