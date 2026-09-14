import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { db } from './storage/db'

export interface NoteVersion {
  versionId: string
  fileId: string
  content: string
  timestamp: number
  operation: 'save' | 'manual' | 'auto'
  wordCount: number
  locked?: boolean
}

interface NoteVersionContextType {
  versions: NoteVersion[]
  loading: boolean
  createVersion: (fileId: string, content: string, operation: 'save' | 'manual' | 'auto') => void
  loadVersions: (fileId: string) => Promise<void>
  restoreVersion: (versionId: string) => Promise<string | null>
  deleteVersion: (versionId: string) => Promise<void>
  toggleLock: (versionId: string) => Promise<void>
  clearOldVersions: (fileId: string) => Promise<void>
}

const MAX_VERSIONS_PER_FILE = 50
const AUTO_SAVE_INTERVAL = 10 // 每 10 次自动保存创建 1 个版本

const NoteVersionContext = createContext<NoteVersionContextType | undefined>(undefined)

export const NoteVersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [loading, setLoading] = useState(false)
  const autoSaveCounter = useRef<Map<string, number>>(new Map())

  const countWords = useCallback((content: string): number => {
    if (!content) return 0
    // 去掉 markdown 语法
    const clean = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#*_`~>-]/g, '')
    // 中文按字，英文按词
    const chinese = (clean.match(/[\u4e00-\u9fa5]/g) || []).length
    const english = (clean.match(/[a-zA-Z]+/g) || []).length
    return chinese + english
  }, [])

  const clearOldVersions = useCallback(async (fileId: string) => {
    try {
      const all = await db.table('versions')
        .where('fileId').equals(fileId)
        .toArray() as NoteVersion[]
      const toDelete = all.filter(v => !v.locked && (Date.now() - v.timestamp) > 30 * 24 * 60 * 60 * 1000)
      if (toDelete.length > 0) {
        await db.table('versions').bulkDelete(toDelete.map(v => v.versionId))
      }
    } catch (e) {
      console.error('[NoteVersion] clearOldVersions failed:', e)
    }
  }, [])

  const createVersion = useCallback(async (fileId: string, content: string, operation: 'save' | 'manual' | 'auto') => {
    // auto 类型按计数器节流，但字数变化>30% 时立即创建版本（不受计数限制）
    if (operation === 'auto') {
      const count = (autoSaveCounter.current.get(fileId) || 0) + 1
      autoSaveCounter.current.set(fileId, count)

      // 检查字数变化是否超过 30%（与上一版本对比）
      let shouldCreateImmediately = false
      try {
        const existing = await db.table('versions')
          .where('fileId').equals(fileId)
          .toArray() as NoteVersion[]
        existing.sort((a, b) => b.timestamp - a.timestamp)
        const lastWordCount = existing[0]?.wordCount ?? 0
        const currentWordCount = countWords(content)
        const diff = Math.abs(currentWordCount - lastWordCount)
        const ratio = lastWordCount > 0 ? diff / lastWordCount : (currentWordCount > 0 ? 1 : 0)
        shouldCreateImmediately = ratio > 0.3
      } catch {
        // 查询失败时不阻断正常流程
      }

      if (!shouldCreateImmediately && count < AUTO_SAVE_INTERVAL) return
      autoSaveCounter.current.set(fileId, 0)
    }

    const version: NoteVersion = {
      versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileId,
      content,
      timestamp: Date.now(),
      operation,
      wordCount: countWords(content),
    }

    try {
      await db.table('versions').add(version)
      // 清理旧版本（保留最近 MAX_VERSIONS_PER_FILE 个）
      const allVersions = await db.table('versions')
        .where('fileId').equals(fileId)
        .toArray() as NoteVersion[]
      allVersions.sort((a, b) => b.timestamp - a.timestamp)
      const toDelete = allVersions.slice(MAX_VERSIONS_PER_FILE).filter(v => !v.locked)
      if (toDelete.length > 0) {
        await db.table('versions').bulkDelete(toDelete.map(v => v.versionId))
      }
      // 自动清理 30 天前的旧版本（任务3）
      await clearOldVersions(fileId)
    } catch (e) {
      console.error('[NoteVersion] createVersion failed:', e)
    }
  }, [countWords, clearOldVersions])

  const loadVersions = useCallback(async (fileId: string) => {
    setLoading(true)
    try {
      const all = await db.table('versions')
        .where('fileId').equals(fileId)
        .toArray() as NoteVersion[]
      all.sort((a, b) => b.timestamp - a.timestamp)
      setVersions(all)
    } catch (e) {
      console.error('[NoteVersion] loadVersions failed:', e)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const restoreVersion = useCallback(async (versionId: string): Promise<string | null> => {
    try {
      const version = await db.table('versions').get(versionId) as NoteVersion | undefined
      return version?.content ?? null
    } catch {
      return null
    }
  }, [])

  const deleteVersion = useCallback(async (versionId: string) => {
    try {
      await db.table('versions').delete(versionId)
      setVersions(prev => prev.filter(v => v.versionId !== versionId))
    } catch (e) {
      console.error('[NoteVersion] deleteVersion failed:', e)
    }
  }, [])

  const toggleLock = useCallback(async (versionId: string) => {
    try {
      const version = await db.table('versions').get(versionId) as NoteVersion | undefined
      if (version) {
        await db.table('versions').update(versionId, { locked: !version.locked })
        setVersions(prev => prev.map(v => v.versionId === versionId ? { ...v, locked: !v.locked } : v))
      }
    } catch (e) {
      console.error('[NoteVersion] toggleLock failed:', e)
    }
  }, [])

  return (
    <NoteVersionContext.Provider value={{ versions, loading, createVersion, loadVersions, restoreVersion, deleteVersion, toggleLock, clearOldVersions }}>
      {children}
    </NoteVersionContext.Provider>
  )
}

export function useNoteVersion() {
  const ctx = useContext(NoteVersionContext)
  if (!ctx) throw new Error('useNoteVersion must be used within NoteVersionProvider')
  return ctx
}
