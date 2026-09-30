/**
 * canvasPersistence — 画布持久化接口
 *
 * 引擎收敛后底层只有 CanvasEngine（Excalidraw 混合架构）一种实现：
 * 序列化用 serialize()、载入用 loadDocument()，格式为
 * { version: 2, viewport, elements, shapes }。
 *
 * 入参类型仍写作 `Editor | CanvasEngine`，因为 CanvasEngine 对外伪装成
 * tldraw Editor（鸭子类型），调用方持有的引用多标注为 Editor。
 * 历史 tldraw 快照在载入时经 migrateTldrawToEngine 自动迁移，不做反向导出。
 */
import type { Editor, EngineDocument, EngineDocumentLike, ExElementLike, ShapeLike, PropsBag } from './engine/engineTypes'
import type { CanvasEngine } from './engine/CanvasEngine'

/** 鸭子类型判定：CanvasEngine 独有 attach / loadDocument 方法 */
export function isCanvasEngine(e: unknown): e is CanvasEngine {
  return (
    !!e &&
    typeof (e as { attach?: unknown }).attach === 'function' &&
    typeof (e as { loadDocument?: unknown }).loadDocument === 'function'
  )
}

/** 序列化当前画布为可持久化数据 */
export function serializeCanvas(editor: Editor | CanvasEngine): unknown {
  if (isCanvasEngine(editor)) return editor.serialize()
  // 理论不可达：引擎收敛后运行期实例恒为 CanvasEngine
  return null
}

/** 将持久化数据加载回编辑器（自动迁移历史 tldraw 快照） */
export function loadCanvasInto(editor: Editor | CanvasEngine, data: unknown): void {
  if (!data || !isCanvasEngine(editor)) return
  // 旧 tldraw 快照（含 .store）需先迁移为 Excalidraw 混合格式
  // data 为外部持久化数据（unknown），经迁移或直载入引擎前的边界断言
  const migrated: EngineDocumentLike = isTldrawSnapshot(data) ? migrateTldrawToEngine(data) : (data as EngineDocumentLike)
  editor.loadDocument(migrated)
}

// ─── 旧数据迁移：tldraw 快照 → Excalidraw 混合格式 ───

const MIGRATABLE_CARD_TYPES = new Set([
  'note-card', 'image-card', 'file-card', 'embed-card', 'group-card', 'canvas-ref', 'nested-canvas',
])

/** 判断数据是否为 tldraw 文档快照（而非 Excalidraw 混合格式） */
export function isTldrawSnapshot(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as { store?: unknown; elements?: unknown; shapes?: unknown }
  return !!d.store && typeof d.store === 'object' && !Array.isArray(d.elements) && !Array.isArray(d.shapes)
}

/**
 * 将 tldraw 文档快照（getSnapshot 的 document 部分）迁移为 Excalidraw 混合格式。
 * 仅迁移 note-card 等卡片及其连线关系（best-effort）；无法识别的内容忽略。
 */
export function migrateTldrawToEngine(tldrawDoc: unknown): EngineDocument {
  const doc = (tldrawDoc as { store?: Record<string, unknown> }) ?? {}
  const records = doc.store ?? {}
  const shapes: ShapeLike[] = []
  const arrowElements: ExElementLike[] = []
  const cardBounds = new Map<string, { x: number; y: number; w: number; h: number }>()

  for (const item of Object.values(records)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as {
      typeName?: string; type?: string; id?: string
      props?: Record<string, unknown>; x?: number; y?: number
      rotation?: number; isLocked?: boolean; meta?: Record<string, unknown>
    }
    if (rec.typeName !== 'shape' || !rec.type || !rec.id) continue
    const type: string = rec.type
    if (MIGRATABLE_CARD_TYPES.has(type)) {
      const props = rec.props ?? {}
      const w = Number(props.w) || 260
      const h = Number(props.h) || 200
      const x = Number(rec.x) || 0
      const y = Number(rec.y) || 0
      shapes.push({
        id: rec.id,
        type,
        x,
        y,
        rotation: Number(rec.rotation) || 0,
        isLocked: !!rec.isLocked,
        props: { ...props, w, h },
        meta: rec.meta ?? {},
      })
      cardBounds.set(rec.id, { x, y, w, h })
    }
  }

  // 箭头：从 arrow 的 binding 记录重建 Excalidraw 箭头元素
  const arrowBindings = (
    Object.values(records) as Array<{ typeName?: string; type?: string; fromId?: string; toId?: string; props?: PropsBag }>
  ).filter(
    (r) => r?.typeName === 'binding' && r.type === 'arrow' && typeof r.fromId === 'string' && typeof r.toId === 'string',
  ) as Array<{ fromId: string; toId: string; props?: PropsBag }>

  // 按箭头 id 聚合 start/end binding
  const byArrow = new Map<string, { start?: string; end?: string; rel?: string }>()
  for (const b of arrowBindings) {
    const entry = byArrow.get(b.fromId) ?? {}
    if (b.props?.terminal === 'start') entry.start = b.toId
    else if (b.props?.terminal === 'end') entry.end = b.toId
    byArrow.set(b.fromId, entry)
  }

  for (const [arrowId, { start, end }] of byArrow) {
    if (!start || !end) continue
    const a = cardBounds.get(start)
    const b = cardBounds.get(end)
    if (!a || !b) continue
    const sx = a.x + a.w / 2
    const sy = a.y + a.h / 2
    const ex = b.x + b.w / 2
    const ey = b.y + b.h / 2
    try {
      arrowElements.push({
        id: arrowId,
        type: 'arrow',
        x: sx,
        y: sy,
        width: Math.hypot(ex - sx, ey - sy),
        height: 0,
        angle: 0,
        strokeColor: '#94a3b8',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 2 ** 31),
        version: 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [
          { x: 0, y: 0 },
          { x: ex - sx, y: ey - sy },
        ],
        lastCommittedPoint: null,
        startBinding: { elementId: start, focus: 0, gap: 4 },
        endBinding: { elementId: end, focus: 0, gap: 4 },
        startArrowhead: null,
        endArrowhead: 'arrow',
        customData: { relationType: 'reference' },
        index: undefined,
      })
    } catch {
      /* 单条连线失败不影响整体迁移 */
    }
  }

  return {
    version: 2,
    viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
    elements: arrowElements,
    shapes,
  }
}
