import { findDailyNote, findOrCreateDailyFolder } from './DailyNoteManager'
import { FileNode } from '../../types/fileManager'
import { resolveDailyJournalTemplate, type Template } from '@services/templates/templateData'
import { applyTemplate } from '@services/templates/templateApply'

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
export interface DailyNoteOptions {
  /** 指定日记模板（用户在设置里选的，或调用方解析的）；缺省回退内置 daily-journal */
  template?: Template
  /** `{{date}}` 的默认格式（设置项） */
  dateFormat?: string
}

export function openDailyNote(
  date: Date,
  rootFolder: FileNode,
  createFile: (parentId: string, name: string, content?: string) => string,
  createFolder: (parentId: string, name: string) => string,
  openFile: (fileId: string) => void,
  opts?: DailyNoteOptions,
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

  // Apply daily template if available, otherwise use default.
  // 注意：`date` 必须透传（否则 {{date}} 恒为今天 —— 打开既往/未来日记日期会错）。
  const dailyTemplate = opts?.template ?? resolveDailyJournalTemplate()
  const content = dailyTemplate
    ? applyTemplate(dailyTemplate, { date, dateFormat: opts?.dateFormat })
    : generateDailyNoteTemplate(date)

  // Create the daily note
  const newId = createFile(folderId, fileName, content)
  if (newId) {
    openFile(newId)
    return newId
  }
  return undefined
}
