import { useEffect, useRef } from 'react'
import { useFileManager } from '../stores/FileStore'
import { useLinkIndex } from '../stores/LinkIndexStore'
import { useTagIndex } from '../stores/TagIndexStore'
import { findNode } from '../services/fileService'
import {
  isAutoMoc,
  parseMocFrontMatter,
  generateMocContent,
  hasAutoSection,
  updateAutoMoc,
} from '../features/fileManager/MocGenerator'
import { startAutoBackupScheduler } from '../services/backupService'
import { useAutoSave } from '../hooks/useAutoSave'
import { useNoteVersion } from '../stores/NoteVersionStore'
import { useBlockIndex } from '../stores/BlockIndexStore'
import { setBlockResolver, setBlockClickHandler } from '../services/blockReferenceBridge'
import type { FileNode } from '../types/fileManager'

/**
 * useAppLogic —— Phase 4.0 共享副作用 hook（策略 A）。
 *
 * 将 App.tsx 的关键副作用抽出为「单一来源」，供旧壳（LegacyApp）与
 * AuroraShell 共用，避免逻辑两份维护、行为漂移（文档 §2.4 / §8）。
 *
 * 当前承载（与 App.tsx 原内联 effect 行为逐一对应）：
 *  - S5  MOC 自动更新（防抖 2s，监听 link/tag 索引版本变化）
 *  - S7  定时自动备份调度器
 *  - S1  自动保存（useAutoSave —— 同时负责崩溃备份写入）
 *  - S2  笔记版本快照（auto / save 两类自动创建，createVersion 节流在 store 内）
 *  - S3  块级引用索引（内容变化时 updateFileBlocks）
 *  - S4  全局块解析器 / 点击处理（setBlockResolver / setBlockClickHandler）
 *  - S6  tab dirty 标记 + beforeunload 守卫
 *
 * 注：S9 崩溃恢复「对话框」因深度耦合壳层 localContent / openFile，
 *     保留在各壳自身 UI；崩溃备份「写入」已由 S1(useAutoSave) 覆盖。
 */
export interface UseAppLogicParams {
  /** 当前打开文件 id（可能为 null） */
  activeFileId: string | null
  /** 当前打开文件名（用于块索引 / 自动保存命名） */
  activeFileName?: string
  /** 编辑器当前本地内容（受控值） */
  localContent: string
  /** 当前激活 tab id（用于 dirty 标记） */
  activeTabId: string | null
  updateFileContent: (id: string, content: string) => void
  openFile: (id: string) => void
  markTabDirty: (tabId: string, dirty: boolean) => void
  isAnyTabDirty: () => boolean
}

export interface UseAppLogicResult {
  /** 自动保存调度器（供 useContentHandler / 手动保存命令复用） */
  scheduleSave: (content: string) => void
  /** 笔记版本创建（供手动保存命令复用，store 内已节流） */
  createVersion: (fileId: string, content: string, type: 'auto' | 'save' | 'manual') => void
}

export function useAppLogic(params?: UseAppLogicParams): UseAppLogicResult {
  // 参数可选：AuroraShell 壳层无编辑器 localContent 时仍可挂载本 hook，
  // 仅运行 S5/S7（不依赖内容）；传入内容参数（App.tsx / EditorPanel）时完整运行 S1–S7。
  // 内容耦合的 S1–S6 在 activeFileId 为 null 时自然 no-op，无需条件分支。
  const activeFileId = params?.activeFileId ?? null
  const activeFileName = params?.activeFileName
  const localContent = params?.localContent ?? ''
  const activeTabId = params?.activeTabId ?? null
  const updateFileContent = params?.updateFileContent ?? (() => {})
  const openFile = params?.openFile ?? (() => {})
  const markTabDirty = params?.markTabDirty ?? (() => {})
  const isAnyTabDirty = params?.isAnyTabDirty ?? (() => false)

  const { rootFolder } = useFileManager()
  const {
    indexVersion: linkIndexVersion,
    getBacklinks: linkGetBacklinks,
    getOutgoingLinks: linkGetOutgoingLinks,
    getFileHeadings: linkGetFileHeadings,
  } = useLinkIndex()
  const { indexVersion: tagIndexVersion, getFilesByTag: tagGetFilesByTag } = useTagIndex()

  // —— S5: MOC 自动更新（防抖 2s）——
  // 与 App.tsx L281-324 行为一致：遍历文件树，对标记为 autoUpdate 的 MOC
  // 文件，仅在已有 auto section 时就地更新 body，避免丢失用户手动编辑。
  const mocUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mocUpdateTimerRef.current) clearTimeout(mocUpdateTimerRef.current)
    mocUpdateTimerRef.current = setTimeout(() => {
      const walkUpdate = (node: FileNode) => {
        if (node.type === 'file' && node.content) {
          const content = node.content
          if (isAutoMoc(content)) {
            const fm = parseMocFrontMatter(content)
            if (fm && fm.autoUpdate && fm.target) {
              const newContent = generateMocContent({
                tagPath: fm.source === 'tag' ? fm.target : undefined,
                centerFileId: fm.source === 'backlink' ? fm.target : undefined,
                template: (fm.template as unknown as 'summary') || 'summary',
                getFileContent: (fid: string) => findNode(rootFolder, fid)?.content ?? null,
                getFileName: (fid: string) => findNode(rootFolder, fid)?.name ?? fid,
                getFilesByTag: tagGetFilesByTag,
                getBacklinks: linkGetBacklinks,
                getOutgoingLinks: linkGetOutgoingLinks,
                getFileHeadings: linkGetFileHeadings,
              })
              if (newContent) {
                const bodyMatch = newContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
                const newBody = bodyMatch ? bodyMatch[1] : newContent
                if (hasAutoSection(content)) {
                  const updated = updateAutoMoc(content, newBody)
                  if (updated !== content) updateFileContent(node.id, updated)
                }
              }
            }
          }
        }
        if (node.children) for (const c of node.children) walkUpdate(c)
      }
      walkUpdate(rootFolder)
      mocUpdateTimerRef.current = null
    }, 2000)
    return () => {
      if (mocUpdateTimerRef.current) clearTimeout(mocUpdateTimerRef.current)
    }
  }, [
    linkIndexVersion,
    tagIndexVersion,
    rootFolder,
    tagGetFilesByTag,
    linkGetBacklinks,
    linkGetOutgoingLinks,
    linkGetFileHeadings,
    updateFileContent,
  ])

  // —— S7: 定时自动备份调度器 ——
  useEffect(() => {
    const timer = startAutoBackupScheduler()
    return () => clearInterval(timer)
  }, [])

  // —— S1: 自动保存（useAutoSave 同时负责崩溃备份写入）——
  const { scheduleSave, isDirty } = useAutoSave(activeFileId ?? undefined, activeFileName, updateFileContent)

  // —— S2: 笔记版本快照 ——
  const { createVersion } = useNoteVersion()
  const lastSavedContentRef = useRef<string>('')
  useEffect(() => {
    if (activeFileId && !isDirty && localContent && localContent !== lastSavedContentRef.current) {
      createVersion(activeFileId, localContent, 'auto')
      lastSavedContentRef.current = localContent
    }
  }, [isDirty, activeFileId, localContent, createVersion])
  useEffect(() => {
    return () => {
      if (activeFileId && lastSavedContentRef.current) {
        createVersion(activeFileId, lastSavedContentRef.current, 'save')
      }
    }
  }, [activeFileId, createVersion])

  // —— S3: 块级引用索引 ——
  const { blockMap, updateFileBlocks } = useBlockIndex()
  useEffect(() => {
    if (activeFileId && activeFileName) {
      updateFileBlocks(activeFileId, localContent, activeFileName)
    }
  }, [activeFileId, activeFileName, localContent, updateFileBlocks])

  // —— S4: 全局块解析器 / 点击处理 ——
  useEffect(() => {
    setBlockResolver((blockId: string) => {
      const info = blockMap.get(blockId)
      if (!info) return null
      return {
        fileId: info.fileId,
        fileName: info.fileName,
        text: info.text,
        lineStart: info.lineStart,
        lineEnd: info.lineEnd,
      }
    })
    return () => {
      setBlockResolver(null)
    }
  }, [blockMap])
  useEffect(() => {
    setBlockClickHandler((blockId: string) => {
      const info = blockMap.get(blockId)
      if (info) {
        openFile(info.fileId)
      }
    })
    return () => {
      setBlockClickHandler(null)
    }
  }, [blockMap, openFile])

  // —— S6: tab dirty 标记 + beforeunload 守卫 ——
  useEffect(() => {
    if (activeTabId) {
      markTabDirty(activeTabId, isDirty)
    }
  }, [isDirty, activeTabId, markTabDirty])
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isAnyTabDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isAnyTabDirty])

  return { scheduleSave, createVersion }
}
