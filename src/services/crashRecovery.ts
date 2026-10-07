import { safeJsonParse } from '@utils/safeJson'
import { isRecord } from '@utils/schemaGuards'

const BACKUP_KEY = 'markcraft_autosave_backup'

export interface CrashBackup {
  fileId: string
  fileName: string
  content: string
  timestamp: number
}

function isCrashBackup(x: unknown): x is CrashBackup {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return (
    typeof r.fileId === 'string' &&
    typeof r.fileName === 'string' &&
    typeof r.content === 'string' &&
    typeof r.timestamp === 'number'
  )
}

export function saveBackup(fileId: string, fileName: string, content: string): void {
  const backup: CrashBackup = { fileId, fileName, content, timestamp: Date.now() }
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  } catch {}
}

export function getBackup(): CrashBackup | null {
  const parsed = safeJsonParse<CrashBackup | null>(localStorage.getItem(BACKUP_KEY), null)
  return isCrashBackup(parsed) ? parsed : null
}

export function clearBackup(): void {
  localStorage.removeItem(BACKUP_KEY)
}
