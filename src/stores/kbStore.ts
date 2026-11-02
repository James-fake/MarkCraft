/**
 * 知识库持久化层
 * 基于 IndexedDB（复用项目已有的 Dexie db），支持多知识库
 * 存储模式参考 canvasStore：列表 + 单文档分离存储
 */
import { kvGet, kvSet, kvDelete } from '@core/storage/kv'
import { safeJsonParse } from '@utils/safeJson'
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
import { collectAllFiles } from '@core/files/fileTree'
import { isRecord } from '@utils/schemaGuards'

// ─── schema 守卫（M-2 收口：结构化记录损坏时回退默认而非静默装错）───
function isKnowledgeBaseListItem(x: unknown): x is KnowledgeBaseListItem {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.updatedAt === 'number'
  )
}

function isKnowledgeBase(x: unknown): x is KnowledgeBase {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    Array.isArray(r.fileIds) &&
    Array.isArray(r.canvasIds)
  )
}

const KB_LIST_KEY = 'kb-list'
const KB_DOC_PREFIX = 'kb-doc-'

// ─── 内部工具 ───

// 存储介质已从 IndexedDB 换成磁盘文件（见 @core/storage/backend）

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


// 注：原 getNodePath(root, targetId) 单次 O(n) DFS 已移除——收集规则匹配文件时
// 对每个文件调用它会使整体退化成 O(n²)，现改为一次性遍历建 id → 路径映射（见 resolveFiles）。

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
  const raw = await kvGet(KB_LIST_KEY)
  if (!raw) return []
  const list = safeJsonParse(raw, [] as KnowledgeBaseListItem[]).filter(isKnowledgeBaseListItem)
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

// ─── 列表变化订阅 ───

/** 知识库列表订阅者 */
export type KbListListener = (list: KnowledgeBaseListItem[]) => void
const kbListListeners = new Set<KbListListener>()

/**
 * 订阅知识库列表变化，返回取消订阅函数。
 *
 * 背景（E2E 报告 M-1）：面板若只在挂载时 `getKbList()` 取一次，而内置「使用文档」的播种是
 * **异步**完成、完成时间在面板挂载之后，列表就会永久停在空态 —— 直接深链 `#view=kb` 首启即复现
 * （播种日志已打印「播种完成」，UI 仍显示 0 个）。故提供订阅：写入列表时主动推送，
 * 订阅瞬间再补推一次当前值（覆盖「订阅动作发生在首次写入之后」的情况）。
 */
export function subscribeKbList(listener: KbListListener): () => void {
  kbListListeners.add(listener)
  void getKbList()
    .then((list) => listener(list))
    .catch(() => listener([]))
  return () => {
    kbListListeners.delete(listener)
  }
}

function notifyKbListChanged(list: KnowledgeBaseListItem[]): void {
  for (const listener of kbListListeners) {
    try {
      listener(list)
    } catch {
      /* 单个订阅者异常不应影响其它订阅者 */
    }
  }
}

/** 列表的唯一写入口：落盘 + 广播 */
async function writeKbList(list: KnowledgeBaseListItem[]): Promise<void> {
  await kvSet(KB_LIST_KEY, JSON.stringify(list))
  notifyKbListChanged(list)
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
  await writeKbList(list)
}

/** 从列表中删除条目 */
async function removeListItem(id: string): Promise<void> {
  const list = await getKbList()
  await writeKbList(list.filter(i => i.id !== id))
}

// ─── 文档 CRUD ───

/** 加载完整知识库文档 */
export async function loadKb(id: string): Promise<KnowledgeBase | null> {
  const raw = await kvGet(`${KB_DOC_PREFIX}${id}`)
  if (!raw) return null
  const parsed = safeJsonParse<KnowledgeBase | null>(raw, null)
  return isKnowledgeBase(parsed) ? parsed : null
}

/** 保存知识库文档（同时更新列表） */
export async function saveKb(kb: KnowledgeBase): Promise<void> {
  kb.updatedAt = Date.now()
  await kvSet(`${KB_DOC_PREFIX}${kb.id}`, JSON.stringify(kb))
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
 * 在**已存在的**文件树文件夹上创建知识库（不新建文件夹）
 *
 * 用于内置文档播种（见 stores/kbSeed.ts）：文件夹与笔记由种子/迁移先行创建，
 * 此处只把 KB 文档挂到该文件夹上 —— createKb 会自己再建一个同名文件夹，不适用。
 */
export async function createKbInFolder(
  name: string,
  description: string,
  folderId: string,
): Promise<KnowledgeBase> {
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
 * 修正知识库关联的文件夹（保持 kb.id / 其它配置不变）
 *
 * 用于播种自愈：历史竞态可能让 `folderId` 指向一个已被丢弃的节点（悬空），
 * 此时知识库文档本身完好（规则/任务/导出记录都在），只是找不到自己的笔记文件夹。
 * 重新挂载而不是删库重建，才能保住用户在该库上积累的一切。
 */
export async function rebindKbFolder(kbId: string, folderId: string): Promise<void> {
  const kb = await loadKb(kbId)
  if (kb) {
    kb.folderId = folderId
    await saveKb(kb)
    return
  }
  // ⚠️ 文档缺失（旧版本 / 半截写入）时**不能静默 return** —— 否则「自愈」只重建了文件夹、
  //    却没把 folderId 落盘，知识库照旧指向幽灵 → 依旧 0 篇（自愈看着成功、用户却看不到笔记）。
  //    此处按列表项重建一份最小文档，把 folderId 真正写进去。
  const item = (await getKbList()).find((i) => i.id === kbId)
  if (!item) return
  const rebuilt: KnowledgeBase = {
    id: kbId,
    name: item.name,
    description: item.description ?? '',
    folderId,
    createdAt: item.createdAt,
    updatedAt: Date.now(),
    canvasIds: [],
    fileIds: [],
    rules: [],
  }
  await saveKb(rebuilt)
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
  await kvDelete(`${KB_DOC_PREFIX}${id}`)
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
      // 一次性遍历建 id → 路径映射；原实现对每个文件各跑一次 getNodePath（单次 O(n) DFS），
      // 整体退化为 O(n²)。路径语义与 getNodePath 一致（含根名，'/' 分隔）。
      const pathById = new Map<string, string>()
      const buildPaths = (node: FileNode, prefix: string) => {
        const p = prefix ? `${prefix}/${node.name}` : node.name
        pathById.set(node.id, p)
        for (const child of node.children ?? []) buildPaths(child, p)
      }
      buildPaths(rootFolder, '')

      for (const file of allFiles) {
        const fullPath = pathById.get(file.id) ?? ''
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
