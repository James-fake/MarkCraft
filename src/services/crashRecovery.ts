import { safeJsonParse } from '@utils/safeJson'

const BACKUP_KEY = 'markcraft_autosave_backup'

export interface CrashBackup {
  fileId: string
  fileName: string
  content: string
  timestamp: number
}

export function saveBackup(fileId: string, fileName: string, content: string): void {
  const backup: CrashBackup = { fileId, fileName, content, timestamp: Date.now() }
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  } catch {}
}

export function getBackup(): CrashBackup | null {
  return safeJsonParse(localStorage.getItem(BACKUP_KEY), null)
}

export function clearBackup(): void {
  localStorage.removeItem(BACKUP_KEY)
}
