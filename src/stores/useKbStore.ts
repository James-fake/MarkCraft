/**
 * 知识库 React Hook
 * 封装 kbStore，提供响应式状态和自动刷新
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useFileManager } from './FileStore'
import {
  getKbList,
  loadKb,
  saveKb,
  createKb,
  deleteKb,
  renameKb,
  addFileToKb,
  removeFileFromKb,
  addCanvasToKb,
  removeCanvasFromKb,
  addRule,
  removeRule,
  updateRule,
  updateBlogConfig,
  updateDescription,
  getKbFiles,
  // P7 新增
  updateLearningPath,
  updateTasks,
  updateWritingGoals,
  updateReviewSchedule,
  updateSavedQueries,
  updateBlindSpotCache,
  updateAiSummary,
  updateHealthScore,
  updateMocFileId,
  addExportRecord,
  createKbWithTemplate,
  applyKbTemplate,
} from './kbStore'
import type {
  KnowledgeBase,
  KnowledgeBaseListItem,
  KnowledgeBaseRule,
  KnowledgeBaseBlogConfig,
  BlindSpotReport,
  LearningPathItem,
  KbTask,
  WritingGoal,
  ReviewSchedule,
  SavedQuery,
  ExportRecord,
  KbTemplate,
} from './kbTypes'

export function useKbStore() {
  const { rootFolder, createFolder, deleteNode, renameNode } = useFileManager()
  const [kbList, setKbList] = useState<KnowledgeBaseListItem[]>([])
  const [activeKb, setActiveKb] = useState<KnowledgeBase | null>(null)
  const [loading, setLoading] = useState(false)
  // 版本号：每次操作后自增，触发消费者刷新
  const [version, setVersion] = useState(0)
  const rootFolderRef = useRef(rootFolder)
  rootFolderRef.current = rootFolder

  /** 刷新列表 */
  const refreshList = useCallback(async () => {
    try {
      const list = await getKbList()
      setKbList(list)
    } catch (err) {
      // IDB 不可用/损坏（隐私模式、配额、测试环境无 IndexedDB）：降级为「空清单」，
      // 不能永远停在未加载态——否则消费者（如图谱 scopeReady 门控）永久等待、图谱空白
      console.warn('[kbStore] 清单加载失败，降级为空清单', err)
      setKbList([])
    }
    setVersion(v => v + 1)
  }, [])

  /** 初始化加载列表 */
  useEffect(() => {
    void refreshList()
  }, [refreshList])

  /** 加载某个知识库到 activeKb */
  const loadActiveKb = useCallback(async (id: string | null) => {
    if (!id) {
      setActiveKb(null)
      return
    }
    setLoading(true)
    try {
      const kb = await loadKb(id)
      setActiveKb(kb)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 创建知识库 */
  const handleCreateKb = useCallback(async (name: string, description: string): Promise<KnowledgeBase | null> => {
    try {
      const kb = await createKb(name, description, createFolder)
      await refreshList()
      return kb
    } catch (err) {
      console.error('[KB] 创建知识库失败:', err)
      return null
    }
  }, [createFolder, refreshList])

  /** 删除知识库 */
  const handleDeleteKb = useCallback(async (id: string, deleteFolder: boolean): Promise<void> => {
    try {
      await deleteKb(id, deleteFolder, deleteNode)
      if (activeKb?.id === id) {
        setActiveKb(null)
      }
      await refreshList()
    } catch (err) {
      console.error('[KB] 删除知识库失败:', err)
    }
  }, [deleteNode, activeKb, refreshList])

  /** 重命名知识库 */
  const handleRenameKb = useCallback(async (id: string, newName: string): Promise<void> => {
    try {
      await renameKb(id, newName, renameNode)
      await refreshList()
      // 如果是当前激活的知识库，重新加载
      if (activeKb?.id === id) {
        await loadActiveKb(id)
      }
    } catch (err) {
      console.error('[KB] 重命名知识库失败:', err)
    }
  }, [renameNode, activeKb, refreshList, loadActiveKb])

  /** 更新描述 */
  const handleUpdateDescription = useCallback(async (id: string, description: string): Promise<void> => {
    try {
      await updateDescription(id, description)
      await refreshList()
      if (activeKb?.id === id) {
        await loadActiveKb(id)
      }
    } catch (err) {
      console.error('[KB] 更新描述失败:', err)
    }
  }, [activeKb, refreshList, loadActiveKb])

  /** 添加文件 */
  const handleAddFile = useCallback(async (kbId: string, fileId: string): Promise<void> => {
    try {
      await addFileToKb(kbId, fileId)
      await refreshList()
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 添加文件失败:', err)
    }
  }, [activeKb, refreshList, loadActiveKb])

  /** 移除文件 */
  const handleRemoveFile = useCallback(async (kbId: string, fileId: string): Promise<void> => {
    try {
      await removeFileFromKb(kbId, fileId)
      await refreshList()
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 移除文件失败:', err)
    }
  }, [activeKb, refreshList, loadActiveKb])

  /** 关联画布 */
  const handleAddCanvas = useCallback(async (kbId: string, canvasId: string): Promise<void> => {
    try {
      await addCanvasToKb(kbId, canvasId)
      await refreshList()
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 关联画布失败:', err)
    }
  }, [activeKb, refreshList, loadActiveKb])

  /** 取消关联画布 */
  const handleRemoveCanvas = useCallback(async (kbId: string, canvasId: string): Promise<void> => {
    try {
      await removeCanvasFromKb(kbId, canvasId)
      await refreshList()
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 取消关联画布失败:', err)
    }
  }, [activeKb, refreshList, loadActiveKb])

  /** 添加规则 */
  const handleAddRule = useCallback(async (kbId: string, type: KnowledgeBaseRule['type'], value: string): Promise<void> => {
    try {
      await addRule(kbId, type, value)
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 添加规则失败:', err)
    }
  }, [activeKb, loadActiveKb])

  /** 移除规则 */
  const handleRemoveRule = useCallback(async (kbId: string, ruleId: string): Promise<void> => {
    try {
      await removeRule(kbId, ruleId)
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 移除规则失败:', err)
    }
  }, [activeKb, loadActiveKb])

  /** 更新规则 */
  const handleUpdateRule = useCallback(async (kbId: string, ruleId: string, patch: Partial<KnowledgeBaseRule>): Promise<void> => {
    try {
      await updateRule(kbId, ruleId, patch)
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 更新规则失败:', err)
    }
  }, [activeKb, loadActiveKb])

  /** 更新博客配置 */
  const handleUpdateBlogConfig = useCallback(async (kbId: string, config: Partial<KnowledgeBaseBlogConfig>): Promise<void> => {
    try {
      await updateBlogConfig(kbId, config)
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 更新博客配置失败:', err)
    }
  }, [activeKb, loadActiveKb])

  /** 获取知识库包含的文件 ID 列表 */
  const getFiles = useCallback((kb: KnowledgeBase): string[] => {
    return getKbFiles(rootFolderRef.current, kb)
  }, [])

  /** 反向查询：哪些知识库包含该文件（folderId / fileIds / rules 任一命中） */
  const getKbsContainingFile = useCallback(async (fileId: string): Promise<string[]> => {
    const list = await getKbList()
    const root = rootFolderRef.current
    const hit: string[] = []
    for (const item of list) {
      const full = await loadKb(item.id)
      if (!full) continue
      if (getKbFiles(root, full).includes(fileId)) hit.push(item.id)
    }
    return hit
  }, [])

  /** 反向查询：哪些知识库关联了某画布（canvasIds 命中） */
  const getKbsContainingCanvas = useCallback(async (canvasId: string): Promise<string[]> => {
    const list = await getKbList()
    const hit: string[] = []
    for (const item of list) {
      const full = await loadKb(item.id)
      if (full && full.canvasIds?.includes(canvasId)) hit.push(item.id)
    }
    return hit
  }, [])

  /** 保存知识库（通用） */
  const handleSaveKb = useCallback(async (kb: KnowledgeBase): Promise<void> => {
    try {
      await saveKb(kb)
      await refreshList()
    } catch (err) {
      console.error('[KB] 保存知识库失败:', err)
    }
  }, [refreshList])

  // P7 扩展方法：通用的"更新字段 + 刷新"模式
  const withReload = useCallback(async (kbId: string, fn: (id: string) => Promise<void>): Promise<void> => {
    try {
      await fn(kbId)
      if (activeKb?.id === kbId) {
        await loadActiveKb(kbId)
      }
    } catch (err) {
      console.error('[KB] 操作失败:', err)
    }
  }, [activeKb, loadActiveKb])

  const handleUpdateLearningPath = useCallback((kbId: string, path: LearningPathItem[]) => withReload(kbId, id => updateLearningPath(id, path)), [withReload])
  const handleUpdateTasks = useCallback((kbId: string, tasks: KbTask[]) => withReload(kbId, id => updateTasks(id, tasks)), [withReload])
  const handleUpdateWritingGoals = useCallback((kbId: string, goals: WritingGoal[]) => withReload(kbId, id => updateWritingGoals(id, goals)), [withReload])
  const handleUpdateReviewSchedule = useCallback((kbId: string, schedule: ReviewSchedule) => withReload(kbId, id => updateReviewSchedule(id, schedule)), [withReload])
  const handleUpdateSavedQueries = useCallback((kbId: string, queries: SavedQuery[]) => withReload(kbId, id => updateSavedQueries(id, queries)), [withReload])
  const handleUpdateBlindSpotCache = useCallback((kbId: string, report: BlindSpotReport) => withReload(kbId, id => updateBlindSpotCache(id, report)), [withReload])
  const handleUpdateAiSummary = useCallback((kbId: string, summary: string) => withReload(kbId, id => updateAiSummary(id, summary)), [withReload])
  const handleUpdateHealthScore = useCallback((kbId: string, score: number) => withReload(kbId, id => updateHealthScore(id, score)), [withReload])
  const handleUpdateMocFileId = useCallback((kbId: string, fileId: string) => withReload(kbId, id => updateMocFileId(id, fileId)), [withReload])
  const handleAddExportRecord = useCallback((kbId: string, record: ExportRecord) => withReload(kbId, id => addExportRecord(id, record)), [withReload])

  /** 创建带模板的知识库 */
  const handleCreateKbWithTemplate = useCallback(async (name: string, description: string, template: KbTemplate): Promise<KnowledgeBase | null> => {
    try {
      const kb = await createKbWithTemplate(name, description, template.id, createFolder)
      await applyKbTemplate(kb.id, template, createFolder)
      await refreshList()
      return kb
    } catch (err) {
      console.error('[KB] 创建模板知识库失败:', err)
      return null
    }
  }, [createFolder, refreshList])

  return {
    kbList,
    activeKb,
    loading,
    version,
    rootFolder,
    refreshList,
    loadActiveKb,
    createKb: handleCreateKb,
    deleteKb: handleDeleteKb,
    renameKb: handleRenameKb,
    updateDescription: handleUpdateDescription,
    addFile: handleAddFile,
    removeFile: handleRemoveFile,
    addCanvas: handleAddCanvas,
    removeCanvas: handleRemoveCanvas,
    addRule: handleAddRule,
    removeRule: handleRemoveRule,
    updateRule: handleUpdateRule,
    updateBlogConfig: handleUpdateBlogConfig,
    getFiles,
    getKbsContainingFile,
    getKbsContainingCanvas,
    saveKb: handleSaveKb,
    // P7 新增
    updateLearningPath: handleUpdateLearningPath,
    updateTasks: handleUpdateTasks,
    updateWritingGoals: handleUpdateWritingGoals,
    updateReviewSchedule: handleUpdateReviewSchedule,
    updateSavedQueries: handleUpdateSavedQueries,
    updateBlindSpotCache: handleUpdateBlindSpotCache,
    updateAiSummary: handleUpdateAiSummary,
    updateHealthScore: handleUpdateHealthScore,
    updateMocFileId: handleUpdateMocFileId,
    addExportRecord: handleAddExportRecord,
    createKbWithTemplate: handleCreateKbWithTemplate,
  }
}

export type UseKbStore = ReturnType<typeof useKbStore>
