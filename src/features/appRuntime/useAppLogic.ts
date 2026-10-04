import { useEffect, useRef } from 'react'
import { useAutoSave } from '@hooks/useAutoSave'
import { useNoteVersion } from '@stores/NoteVersionStore'
import { useBlockIndex } from '@stores/BlockIndexStore'
import { setBlockResolver, setBlockClickHandler } from '@services/blockReferenceBridge'

/**
 * useAppLogic —— **编辑器视图级**副作用（P0 解耦，2026-09-27）。
 *
 * 原为 `src/app/useAppLogic`（旧 Web 壳遗留），一次性承载 S1–S7 七组副作用，
 * 且只被 EditorPanel 挂载 ⇒ 应用级的 S5/S7/S6b 会随视图切换一起停摆。
 * 现已拆分为两层：
 *  - 应用级（S5 MOC 自动更新 / S7 备份调度 / S6b beforeunload）→ `useAppGlobalEffects`，挂在 AuroraShell 常驻；
 *  - 视图级（本 hook，S1/S2/S3/S4/S6a）→ 仍由 EditorPanel 挂载，语义上只对活跃编辑器有意义。
 *
 * 保留项：
 *  - S1  自动保存（useAutoSave —— 同时负责崩溃备份写入）
 *  - S2  笔记版本快照（auto / save 两类自动创建，createVersion 节流在 store 内）
 *  - S3  块级引用索引（内容变化时 updateFileBlocks）
 *  - S4  全局块解析器 / 点击处理（setBlockResolver / setBlockClickHandler）
 *  - S6a tab dirty 标记（写回 FileStore，供应用级 beforeunload 守卫读取）
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
}

export interface UseAppLogicResult {
  /** 自动保存调度器（供 useContentHandler / 手动保存命令复用） */
  scheduleSave: (content: string) => void
  /** 笔记版本创建（供手动保存命令复用，store 内已节流） */
  createVersion: (fileId: string, content: string, type: 'auto' | 'save' | 'manual') => void
}

export function useAppLogic(params: UseAppLogicParams): UseAppLogicResult {
  const {
    activeFileId,
    activeFileName,
    localContent,
    activeTabId,
    updateFileContent,
    openFile,
    markTabDirty,
  } = params

  // 索引订阅不再需要：LinkIndex/TagIndex 的重建由各自 Provider 的 effect 驱动
  // （LinkIndexStore.tsx L345），消费者只读取；MOC 更新已上提到 useAppGlobalEffects。

  // —— S1: 自动保存（useAutoSave 同时负责崩溃备份写入）——
  const { scheduleSave, isDirty } = useAutoSave(activeFileId ?? undefined, activeFileName, updateFileContent)

  // —— S2: 笔记版本快照 ——
  const { createVersion } = useNoteVersion()
  const lastSavedContentRef = useRef<string>('')
  // 卸载快照必须取「最新的真实内容」：lastSavedContentRef 仅在 !isDirty 时更新，
  // 直接用它建 'save' 版本会让快照滞后于真实内容（未保存即卸载时丢掉最后一段编辑）
  const latestContentRef = useRef<string>(localContent)
  latestContentRef.current = localContent
  useEffect(() => {
    if (activeFileId && !isDirty && localContent && localContent !== lastSavedContentRef.current) {
      createVersion(activeFileId, localContent, 'auto')
      lastSavedContentRef.current = localContent
    }
  }, [isDirty, activeFileId, localContent, createVersion])
  useEffect(() => {
    return () => {
      if (activeFileId && latestContentRef.current) {
        createVersion(activeFileId, latestContentRef.current, 'save')
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

  // —— S6a: tab dirty 标记（beforeunload 守卫已上提到 useAppGlobalEffects）——
  useEffect(() => {
    if (activeTabId) {
      markTabDirty(activeTabId, isDirty)
    }
  }, [isDirty, activeTabId, markTabDirty])

  return { scheduleSave, createVersion }
}
