/**
 * Canvas v2 画布持久化层
 * 基于 IndexedDB（通过项目已有的 Dexie db），支持多画布
 *
 * 存储格式为 Excalidraw 混合文档 v2：{ version, viewport, elements, shapes }
 * （elements = Excalidraw 图元，shapes = HTML 浮层卡片）。
 * 历史 tldraw 快照（含 .store）在载入时由 canvasPersistence.loadCanvasInto 自动迁移。
 */
import { db } from '@core/storage/db'
import { safeJsonParse } from '@utils/safeJson'
import { type CanvasListItem, type CanvasTrashItem, type CanvasDocument, type CardTemplate, type CardTemplateV2, genId } from './types'

export { type CanvasListItem, type CanvasTrashItem, type CanvasDocument }
import { isRecord } from '@utils/schemaGuards'

// ─── schema 守卫（M-2 收口）───
function isCanvasListItem(x: unknown): x is CanvasListItem {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.updatedAt === 'number'
}

function isCanvasTrashItem(x: unknown): x is CanvasTrashItem {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.deletedAt === 'number'
}

function isCanvasDocument(x: unknown): x is CanvasDocument {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number' &&
    isRecord(r.data)
  )
}

function isCardTemplate(x: unknown): x is CardTemplate {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.name === 'string'
}

function isCardTemplateV2(x: unknown): x is CardTemplateV2 {
  if (!isRecord(x)) return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.name === 'string'
}

const CANVAS_LIST_KEY = 'canvas-v2-list'
const CANVAS_TRASH_KEY = 'canvas-v2-trash'
/** 回收站保留期：30 天（毫秒） */
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// ─── 内部工具 ───

/**
 * 统计画布内容数量。
 * 主格式为 Excalidraw 混合文档 v2（shapes = 卡片，elements = 图元）；
 * 同时兼容历史 tldraw 快照（TLEditorSnapshot / TLStoreSnapshot），
 * 以便回收站与列表在数据尚未迁移时仍能显示正确计数。
 */
function countShapes(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const obj = data as Record<string, unknown>

  // Excalidraw 混合文档 v2：卡片 + 图元
  if (Array.isArray(obj.shapes) || Array.isArray(obj.elements)) {
    const cards = Array.isArray(obj.shapes) ? obj.shapes.length : 0
    const elements = Array.isArray(obj.elements)
      ? (obj.elements as Array<Record<string, unknown>>).filter(el => el && !el.isDeleted).length
      : 0
    return cards + elements
  }

  // 历史 tldraw 快照
  // TLEditorSnapshot 结构：{ document: { schema, store }, session }
  // TLStoreSnapshot 结构：{ schema, store }
  let store: unknown
  if (obj.document && typeof obj.document === 'object') {
    store = (obj.document as Record<string, unknown>).store
  } else if ('store' in obj) {
    store = obj.store
  }
  if (!store || typeof store !== 'object') return 0
  const records = store as Record<string, unknown>
  return Object.values(records).filter(
    r => r != null && typeof r === 'object' && (r as Record<string, unknown>).typeName === 'shape'
  ).length
}

/** 创建空的 Excalidraw 混合文档（v2 格式） */
function createEmptySnapshot(): unknown {
  return {
    version: 2,
    viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
    elements: [],
    shapes: [],
  }
}

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

// ─── 画布列表管理 ───

/** 获取所有画布列表（按 updatedAt 降序） */
export async function getCanvasList(): Promise<CanvasListItem[]> {
  const raw = await idbGet(CANVAS_LIST_KEY)
  if (!raw) return []
  const list = safeJsonParse(raw, [] as CanvasListItem[]).filter(isCanvasListItem)
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** 更新/插入列表条目（保留已有 tags，除非显式传入新 tags） */
async function upsertListItem(item: CanvasListItem): Promise<void> {
  const list = await getCanvasList()
  const idx = list.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    const existing = list[idx]
    list[idx] = {
      ...item,
      tags: item.tags !== undefined ? item.tags : existing.tags,
    }
  } else {
    list.push(item)
  }
  await idbSet(CANVAS_LIST_KEY, JSON.stringify(list))
}

/** 从列表移除画布条目 */
async function removeListItem(id: string): Promise<void> {
  const list = await getCanvasList()
  const filtered = list.filter(i => i.id !== id)
  await idbSet(CANVAS_LIST_KEY, JSON.stringify(filtered))
}

/** 仅更新画布缩略图（不触发完整文档保存） */
export async function upsertCanvasThumbnail(id: string, thumbnail: string): Promise<void> {
  const list = await getCanvasList()
  const idx = list.findIndex(i => i.id === id)
  if (idx < 0) return
  list[idx].thumbnail = thumbnail
  await idbSet(CANVAS_LIST_KEY, JSON.stringify(list))
}

// ─── 画布文档 CRUD ───

/** 加载单个画布的完整数据 */
export async function loadCanvas(id: string): Promise<CanvasDocument | null> {
  const raw = await idbGet(`canvas-v2-doc-${id}`)
  if (!raw) return null
  const parsed = safeJsonParse<CanvasDocument | null>(raw, null)
  return isCanvasDocument(parsed) ? parsed : null
}

/** 保存画布文档（防抖由调用方控制） */
export async function saveCanvas(doc: CanvasDocument, thumbnail?: string): Promise<void> {
  try {
    doc.updatedAt = Date.now()
    await idbSet(`canvas-v2-doc-${doc.id}`, JSON.stringify(doc))
    await upsertListItem({
      id: doc.id,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      cardCount: countShapes(doc.data),
      thumbnail,
      tags: doc.tags,
    })
    // P5-D：派发画布更新事件，供嵌套画布监听刷新内嵌预览
    try {
      window.dispatchEvent(new CustomEvent(`canvas:updated:${doc.id}`, {
        detail: { id: doc.id, updatedAt: doc.updatedAt },
      }))
    } catch {
      // 某些环境（如 SSR）无 window，静默忽略
    }
  } catch (e) {
    console.error('Canvas v2 保存失败', e)
    throw e
  }
}

/** 创建新画布 */
export async function createCanvas(name?: string): Promise<CanvasDocument> {
  const doc: CanvasDocument = {
    id: genId('canvas'),
    name: name || `画布 ${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: createEmptySnapshot(),
  }
  await saveCanvas(doc)
  return doc
}

/** 删除画布（软删除，移入回收站） */
export async function deleteCanvas(id: string): Promise<void> {
  // 读取画布文档与列表条目
  const doc = await loadCanvas(id)
  const list = await getCanvasList()
  const item = list.find(i => i.id === id)
  if (!doc || !item) {
    // 数据缺失则直接硬删除
    await idbDelete(`canvas-v2-doc-${id}`)
    await removeListItem(id)
    return
  }
  // 移入回收站
  const trashItem: CanvasTrashItem = {
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    deletedAt: Date.now(),
    cardCount: countShapes(doc.data),
    thumbnail: item.thumbnail,
    tags: item.tags,
  }
  await addToTrash(trashItem)
  // 完整文档暂时保留在 idb，以便恢复
  await removeListItem(id)
}

/** 添加到回收站 */
async function addToTrash(item: CanvasTrashItem): Promise<void> {
  const trash = await getTrash()
  trash.push(item)
  await idbSet(CANVAS_TRASH_KEY, JSON.stringify(trash))
}

/** 获取回收站列表（自动清理超过 30 天的条目） */
export async function getTrash(): Promise<CanvasTrashItem[]> {
  try {
    const raw = await idbGet(CANVAS_TRASH_KEY)
    if (!raw) return []
    const list = safeJsonParse(raw, [] as CanvasTrashItem[]).filter(isCanvasTrashItem)
    const now = Date.now()
    const valid = list.filter(t => now - t.deletedAt < TRASH_RETENTION_MS)
    // 清理过期条目（含完整文档）
    const expired = list.filter(t => now - t.deletedAt >= TRASH_RETENTION_MS)
    for (const t of expired) {
      await idbDelete(`canvas-v2-doc-${t.id}`)
    }
    if (expired.length > 0) {
      await idbSet(CANVAS_TRASH_KEY, JSON.stringify(valid))
    }
    return valid.sort((a, b) => b.deletedAt - a.deletedAt)
  } catch {
    return []
  }
}

/** 从回收站恢复画布 */
export async function restoreCanvas(id: string): Promise<CanvasDocument | null> {
  const trash = await getTrash()
  const item = trash.find(t => t.id === id)
  if (!item) return null
  const doc = await loadCanvas(id)
  if (!doc) return null
  // 从回收站移除
  const newTrash = trash.filter(t => t.id !== id)
  await idbSet(CANVAS_TRASH_KEY, JSON.stringify(newTrash))
  // 重新加入画布列表
  await upsertListItem({
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: Date.now(),
    cardCount: countShapes(doc.data),
    thumbnail: item.thumbnail,
    tags: item.tags,
  })
  return doc
}

/** 彻底从回收站删除（不可恢复） */
export async function purgeFromTrash(id: string): Promise<void> {
  const trash = await getTrash()
  const newTrash = trash.filter(t => t.id !== id)
  await idbSet(CANVAS_TRASH_KEY, JSON.stringify(newTrash))
  await idbDelete(`canvas-v2-doc-${id}`)
}

/** 清空回收站 */
export async function clearTrash(): Promise<void> {
  const trash = await getTrash()
  for (const t of trash) {
    await idbDelete(`canvas-v2-doc-${t.id}`)
  }
  await idbSet(CANVAS_TRASH_KEY, JSON.stringify([]))
}

/** 复制画布（深拷贝 snapshot，生成新 ID） */
export async function duplicateCanvas(id: string, newName?: string): Promise<CanvasDocument | null> {
  const src = await loadCanvas(id)
  if (!src) return null
  const list = await getCanvasList()
  const srcItem = list.find(i => i.id === id)
  const newDoc: CanvasDocument = {
    id: genId('canvas'),
    name: newName || `${src.name} 副本`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: srcItem?.tags,
    data: structuredClone(src.data),
  }
  await saveCanvas(newDoc, srcItem?.thumbnail)
  return newDoc
}

/** 设置画布标签（同时更新列表条目与文档） */
export async function setCanvasTags(id: string, tags: string[]): Promise<void> {
  // 更新列表条目
  const list = await getCanvasList()
  const idx = list.findIndex(i => i.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], tags, updatedAt: Date.now() }
    await idbSet(CANVAS_LIST_KEY, JSON.stringify(list))
  }
  // 同步更新文档中的 tags（不改动文档的 updatedAt）
  const doc = await loadCanvas(id)
  if (doc) {
    doc.tags = tags
    await idbSet(`canvas-v2-doc-${id}`, JSON.stringify(doc))
  }
}

/** 重命名画布 */
export async function renameCanvas(id: string, name: string): Promise<void> {
  const doc = await loadCanvas(id)
  if (!doc) return
  doc.name = name
  await saveCanvas(doc)
}

/** 初始化：确保至少有一个画布 */
export async function ensureCanvas(): Promise<CanvasDocument> {
  const list = await getCanvasList()
  if (list.length === 0) {
    return await createCanvas('默认画布')
  }
  // 加载最近使用的画布
  const latest = list[0]
  const doc = await loadCanvas(latest.id)
  if (doc) return doc
  return await createCanvas('默认画布')
}

// ─── 卡片模板 CRUD（P1-6）───

const CANVAS_TEMPLATE_KEY = 'canvas-v2-templates'

/** 获取所有自定义卡片模板 */
export async function getCardTemplates(): Promise<CardTemplate[]> {
  const raw = await idbGet(CANVAS_TEMPLATE_KEY)
  if (!raw) return []
  return safeJsonParse(raw, [] as CardTemplate[]).filter(isCardTemplate)
}

/** 保存卡片模板（新增） */
export async function saveCardTemplate(tpl: Omit<CardTemplate, 'id' | 'isCustom'>): Promise<CardTemplate> {
  const list = await getCardTemplates()
  const newTpl: CardTemplate = { ...tpl, id: genId('tpl'), isCustom: true }
  list.push(newTpl)
  await idbSet(CANVAS_TEMPLATE_KEY, JSON.stringify(list))
  return newTpl
}

/** 删除卡片模板 */
export async function deleteCardTemplate(id: string): Promise<void> {
  const list = await getCardTemplates()
  const filtered = list.filter(t => t.id !== id)
  await idbSet(CANVAS_TEMPLATE_KEY, JSON.stringify(filtered))
}

/** 重命名卡片模板 */
export async function renameCardTemplate(id: string, name: string): Promise<void> {
  const list = await getCardTemplates()
  const idx = list.findIndex(t => t.id === id)
  if (idx >= 0) {
    list[idx].name = name
    await idbSet(CANVAS_TEMPLATE_KEY, JSON.stringify(list))
  }
}

// ─── P4：模板 v2 CRUD（支持多卡片+连线）───

/** P4：获取所有自定义卡片模板（v2 格式，向下兼容 v1） */
export async function getCardTemplatesV2(): Promise<CardTemplateV2[]> {
  const raw = await idbGet(CANVAS_TEMPLATE_KEY)
  if (!raw) return []
  return safeJsonParse(raw, [] as CardTemplateV2[]).filter(isCardTemplateV2)
}

/** P4：保存卡片模板 v2（新增，支持多卡片+连线） */
export async function saveCardTemplateV2(
  tpl: Omit<CardTemplateV2, 'id' | 'isCustom'>
): Promise<CardTemplateV2> {
  const list = await getCardTemplatesV2()
  const newTpl: CardTemplateV2 = { ...tpl, id: genId('tpl'), isCustom: true }
  list.push(newTpl)
  await idbSet(CANVAS_TEMPLATE_KEY, JSON.stringify(list))
  return newTpl
}

/** P4：更新卡片模板 v2（全量替换） */
export async function updateCardTemplateV2(id: string, patch: Partial<CardTemplateV2>): Promise<void> {
  const list = await getCardTemplatesV2()
  const idx = list.findIndex(t => t.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch }
    await idbSet(CANVAS_TEMPLATE_KEY, JSON.stringify(list))
  }
}
