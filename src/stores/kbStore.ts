/**
 * 知识库持久化层
 * 基于 IndexedDB（复用项目已有的 Dexie db），支持多知识库
 * 存储模式参考 canvasStore：列表 + 单文档分离存储
 */
import { db } from '@core/storage/db'
import { findNode } from '../services/fileService'
import type { FileNode } from '../types/fileManager'
import {
  type KnowledgeBase,
  type KnowledgeBaseListItem,
  type KnowledgeBaseRule,
  type KnowledgeBaseBlogConfig,
  genKbId,
  genRuleId,
} from './kbTypes'
import { collectAllFiles } from '../features/fileManager/fileManagerUtils'

const KB_LIST_KEY = 'kb-list'
const KB_DOC_PREFIX = 'kb-doc-'

// ─── 内部工具 ───

async function idbGet(key: string): Promise<string | null> {
  const rec = await db.kv.get(key)
  return rec?.value ?? null
}

async function idbSet(key: string, value: string): Promise<void> {
  await db.kv.put({ key, value })
}

async function idbDelete(key: string): Promise<void> {
  await db.kv.delete(key)
}

/** 递归收集文件夹下所有 .md 文件 */
function collectMarkdownFiles(node: FileNode | null): FileNode[] {
  if (!node) return []
  const result: FileNode[] = []
  if (node.type === 'file' && node.name.endsWith('.md')) {
    result.push(node)
  }
  if (node.children) {
    for (const child of node.children) {
      result.push(...collectMarkdownFiles(child))
    }
  }
  return result
}


/** 获取节点的完整路径（从 root 开始） */
function getNodePath(root: FileNode, targetId: string): string {
  const path: string[] = []
  function dfs(node: FileNode): boolean {
    if (node.id === targetId) return true
    if (node.children) {
      for (const child of node.children) {
        path.push(child.name)
        if (dfs(child)) return true
        path.pop()
      }
    }
    return false
  }
  path.push(root.name)
  dfs(root)
  return path.join('/')
}

/** 匹配规则 */
function matchRule(file: FileNode, fullPath: string, rule: KnowledgeBaseRule): boolean {
  if (!rule.enabled || !rule.value) return false
  switch (rule.type) {
    case 'tag': {
      // 从文件内容提取标签（简易匹配：#tag 出现在内容中）
      const tag = rule.value.replace(/^#/, '')
      return (file.content ?? '').includes(`#${tag}`)
    }
    case 'path': {
      const pattern = rule.value.replace(/^path:/, '')
      return fullPath.includes(pattern)
    }
    case 'name': {
      const pattern = rule.value.replace(/^name:/, '')
      return file.name.toLowerCase().includes(pattern.toLowerCase())
    }
    default:
      return false
  }
}

// ─── 列表管理 ───

/** 获取所有知识库列表（按 updatedAt 降序） */
export async function getKbList(): Promise<KnowledgeBaseListItem[]> {
  try {
    const raw = await idbGet(KB_LIST_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as KnowledgeBaseListItem[]
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/** 更新/插入列表条目 */
async function upsertListItem(item: KnowledgeBaseListItem): Promise<void> {
  const list = await getKbList()
  const idx = list.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    list[idx] = item
  } else {
    list.push(item)
  }
  await idbSet(KB_LIST_KEY, JSON.stringify(list))
}

/** 从列表中删除条目 */
async function removeListItem(id: string): Promise<void> {
  const list = await getKbList()
  const filtered = list.filter(i => i.id !== id)
  await idbSet(KB_LIST_KEY, JSON.stringify(filtered))
}

// ─── 文档 CRUD ───

/** 加载完整知识库文档 */
export async function loadKb(id: string): Promise<KnowledgeBase | null> {
  try {
    const raw = await idbGet(`${KB_DOC_PREFIX}${id}`)
    if (!raw) return null
    return JSON.parse(raw) as KnowledgeBase
  } catch {
    return null
  }
}

/** 保存知识库文档（同时更新列表） */
export async function saveKb(kb: KnowledgeBase): Promise<void> {
  kb.updatedAt = Date.now()
  await idbSet(`${KB_DOC_PREFIX}${kb.id}`, JSON.stringify(kb))
  // 同步更新列表项
  const listItem: KnowledgeBaseListItem = {
    id: kb.id,
    name: kb.name,
    description: kb.description,
    folderId: kb.folderId,
    fileCount: kb.fileIds.length,
    canvasCount: kb.canvasIds.length,
    createdAt: kb.createdAt,
    updatedAt: kb.updatedAt,
  }
  await upsertListItem(listItem)
}

/**
 * 创建知识库
 * 在文件树根下创建同名文件夹，并存储知识库文档
 * @param createFolder 文件树 createFolder 函数（来自 useFileManager）
 */
export async function createKb(
  name: string,
  description: string,
  createFolder: (parentId: string, name: string) => string,
): Promise<KnowledgeBase> {
  const folderId = createFolder('root', name)
  const now = Date.now()
  const kb: KnowledgeBase = {
    id: genKbId(),
    name,
    description,
    folderId,
    createdAt: now,
    updatedAt: now,
    canvasIds: [],
    fileIds: [],
    rules: [],
  }
  await saveKb(kb)
  return kb
}

/**
 * 删除知识库
 * @param deleteFolder 是否同时删除关联的文件夹
 * @param deleteNode 文件树 deleteNode 函数（来自 useFileManager）
 */
export async function deleteKb(
  id: string,
  deleteFolder: boolean,
  deleteNode?: (id: string) => void,
): Promise<void> {
  if (deleteFolder) {
    const kb = await loadKb(id)
    if (kb && deleteNode) {
      deleteNode(kb.folderId)
    }
  }
  await idbDelete(`${KB_DOC_PREFIX}${id}`)
  await removeListItem(id)
}

/** 重命名知识库（同步文件夹名） */
export async function renameKb(
  id: string,
  newName: string,
  renameNode?: (id: string, name: string) => void,
): Promise<void> {
  const kb = await loadKb(id)
  if (!kb) return
  kb.name = newName
  await saveKb(kb)
  if (renameNode) {
    renameNode(kb.folderId, newName)
  }
}

/** 手动添加文件到知识库 */
export async function addFileToKb(kbId: string, fileId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  if (!kb.fileIds.includes(fileId)) {
    kb.fileIds.push(fileId)
    await saveKb(kb)
  }
}

/** 从知识库移除文件 */
export async function removeFileFromKb(kbId: string, fileId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.fileIds = kb.fileIds.filter(id => id !== fileId)
  await saveKb(kb)
}

/** 关联画布到知识库 */
export async function addCanvasToKb(kbId: string, canvasId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  if (!kb.canvasIds.includes(canvasId)) {
    kb.canvasIds.push(canvasId)
    await saveKb(kb)
  }
}

/** 取消关联画布 */
export async function removeCanvasFromKb(kbId: string, canvasId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.canvasIds = kb.canvasIds.filter(id => id !== canvasId)
  await saveKb(kb)
}

/** 添加规则 */
export async function addRule(kbId: string, type: KnowledgeBaseRule['type'], value: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.rules.push({ id: genRuleId(), type, value, enabled: true })
  await saveKb(kb)
}

/** 移除规则 */
export async function removeRule(kbId: string, ruleId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.rules = kb.rules.filter(r => r.id !== ruleId)
  await saveKb(kb)
}

/** 更新规则 */
export async function updateRule(kbId: string, ruleId: string, patch: Partial<KnowledgeBaseRule>): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  const idx = kb.rules.findIndex(r => r.id === ruleId)
  if (idx >= 0) {
    kb.rules[idx] = { ...kb.rules[idx], ...patch }
    await saveKb(kb)
  }
}

/** 更新博客配置 */
export async function updateBlogConfig(kbId: string, config: Partial<KnowledgeBaseBlogConfig>): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.blogConfig = { ...kb.blogConfig, ...config } as KnowledgeBaseBlogConfig
  await saveKb(kb)
}

/** 更新描述 */
export async function updateDescription(kbId: string, description: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.description = description
  await saveKb(kb)
}

/**
 * 获取知识库包含的所有文件 ID 列表
 * 合并：folderId 下所有 .md 文件 + 手动添加的 fileIds + 规则匹配的文件
 * @param rootFolder 文件树根节点
 * @param maxFiles 最大文件数限制（默认 500）
 */
export function getKbFiles(rootFolder: FileNode, kb: KnowledgeBase, maxFiles = 500): string[] {
  const result = new Set<string>()

  // 1. 文件夹下的所有 .md 文件
  //    folderId 可能已失效（文件夹被删除/改名后重新挂载），此时按「无文件夹内容」处理，
  //    不能让 findNode 的 null 传进 collectMarkdownFiles（否则读取 node.type 直接抛错）。
  const folderNode = findNode(rootFolder, kb.folderId)
  const folderFiles = folderNode ? collectMarkdownFiles(folderNode) : []
  for (const f of folderFiles) {
    result.add(f.id)
    if (result.size >= maxFiles) return Array.from(result)
  }

  // 2. 手动添加的文件
  for (const fileId of kb.fileIds) {
    const node = findNode(rootFolder, fileId)
    if (node && node.type === 'file') {
      result.add(fileId)
      if (result.size >= maxFiles) return Array.from(result)
    }
  }

  // 3. 规则匹配的文件
  if (kb.rules.length > 0) {
    const enabledRules = kb.rules.filter(r => r.enabled)
    if (enabledRules.length > 0) {
      const allFiles = collectAllFiles(rootFolder)
      for (const file of allFiles) {
        const fullPath = getNodePath(rootFolder, file.id)
        for (const rule of enabledRules) {
          if (matchRule(file, fullPath, rule)) {
            result.add(file.id)
            break
          }
        }
        if (result.size >= maxFiles) break
      }
    }
  }

  return Array.from(result)
}

// ─── P7 扩展 CRUD ───

import type {
  BlindSpotReport,
  LearningPathItem,
  KbTask,
  WritingGoal,
  ReviewSchedule,
  SavedQuery,
  ExportRecord,
} from './kbTypes'

/** 更新学习路径 */
export async function updateLearningPath(kbId: string, path: LearningPathItem[]): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.learningPath = path
  await saveKb(kb)
}

/** 更新任务列表 */
export async function updateTasks(kbId: string, tasks: KbTask[]): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.tasks = tasks
  await saveKb(kb)
}

/** 更新写作目标 */
export async function updateWritingGoals(kbId: string, goals: WritingGoal[]): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.writingGoals = goals
  await saveKb(kb)
}

/** 更新回顾配置 */
export async function updateReviewSchedule(kbId: string, schedule: ReviewSchedule): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.reviewSchedule = schedule
  await saveKb(kb)
}

/** 更新保存的查询 */
export async function updateSavedQueries(kbId: string, queries: SavedQuery[]): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.savedQueries = queries
  await saveKb(kb)
}

/** 更新盲区报告缓存 */
export async function updateBlindSpotCache(kbId: string, report: BlindSpotReport): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.blindSpotCache = report
  await saveKb(kb)
}

/** 更新 AI 摘要 */
export async function updateAiSummary(kbId: string, summary: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.aiSummary = summary
  await saveKb(kb)
}

/** 更新健康度评分 */
export async function updateHealthScore(kbId: string, score: number): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.healthScore = score
  kb.healthCheckedAt = Date.now()
  await saveKb(kb)
}

/** 更新 MOC 文件 ID */
export async function updateMocFileId(kbId: string, fileId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.mocFileId = fileId
  await saveKb(kb)
}

/** 添加导出记录 */
export async function addExportRecord(kbId: string, record: ExportRecord): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  if (!kb.exportHistory) kb.exportHistory = []
  kb.exportHistory.unshift(record)
  if (kb.exportHistory.length > 20) kb.exportHistory = kb.exportHistory.slice(0, 20)
  await saveKb(kb)
}

/** 更新模板 ID */
export async function updateTemplateId(kbId: string, templateId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  kb.templateId = templateId
  await saveKb(kb)
}

/** 创建带模板的知识库 */
export async function createKbWithTemplate(
  name: string,
  description: string,
  templateId: string,
  createFolder: (parentId: string, name: string) => string,
): Promise<KnowledgeBase> {
  const folderId = createFolder('root', name)
  const now = Date.now()
  const kb: KnowledgeBase = {
    id: genKbId(),
    name,
    description,
    folderId,
    createdAt: now,
    updatedAt: now,
    canvasIds: [],
    fileIds: [],
    rules: [],
    templateId,
  }
  await saveKb(kb)
  return kb
}

/** 从模板创建预设文件夹结构和规则 */
export async function applyKbTemplate(
  kbId: string,
  template: import('./kbTypes').KbTemplate,
  createFolder: (parentId: string, name: string) => string,
): Promise<void> {
  const kb = await loadKb(kbId)
  if (!kb) return
  // 创建预设文件夹
  for (const folder of template.folderStructure) {
    createFolder(kb.folderId, folder.name)
  }
  // 添加预设规则
  for (const rule of template.presetRules) {
    kb.rules.push({
      id: genRuleId(),
      type: rule.type,
      value: rule.value,
      enabled: true,
    })
  }
  await saveKb(kb)
}
