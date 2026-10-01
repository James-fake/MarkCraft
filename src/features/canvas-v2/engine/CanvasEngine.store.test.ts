/**
 * CanvasEngine.store.allRecords —— binding 半记录回归锁
 *
 * 背景：修复前 allRecords 的 binding rec 只有 { typeName, type, id }，缺
 * fromId/toId/props。消费方 AutoLayoutPanel 的 flow 布局按 fromId 分组、
 * 读 props.terminal 区分端、取 toId 作边端点 —— 有箭头时打开自动布局面板
 * 会在 edges useMemo 里抛 TypeError（props 为 undefined），无箭头时 edges
 * 恒空。本文件以消费方的真实读取模式作为回归锁。
 */
import { describe, it, expect } from 'vitest'
import { CanvasEngine } from './CanvasEngine'
import type { ExcalidrawAPILike } from './engineTypes'

function makeEngine(elements: unknown[]) {
  const engine = new CanvasEngine()
  const api = {
    getSceneElements: () => elements,
    updateScene: () => {},
    getAppState: () => ({ scrollX: 0, scrollY: 0, zoom: { value: 1 } }),
  } as unknown as ExcalidrawAPILike
  engine.attach(api, document.createElement('div'))
  return engine
}

const cardA = { id: 'card-A', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, customData: { cardType: 'note-card' } }
const cardB = { id: 'card-B', type: 'rectangle', x: 200, y: 0, width: 100, height: 50, customData: { cardType: 'note-card' } }
const arrowAB = {
  id: 'arrow-1', type: 'arrow', x: 100, y: 25, width: 100, height: 0,
  startBinding: { elementId: 'card-A', focus: 0, gap: 8 },
  endBinding: { elementId: 'card-B', focus: 0, gap: 8 },
  customData: { relationType: 'reference', boundArrow: true },
}

describe('CanvasEngine.store.allRecords —— binding 半记录补全', () => {
  it('有箭头绑定时：每端产出一条 binding rec（fromId=箭头 id / toId=卡片 id / terminal 区分端）', () => {
    const engine = makeEngine([cardA, cardB, arrowAB])
    const bindings = engine.store.allRecords().filter((r) => r.typeName === 'binding')
    expect(bindings).toHaveLength(2)

    // 复现 AutoLayoutPanel 的真实消费模式（修复前此处抛 TypeError）
    const byArrow = new Map<string, { start?: (typeof bindings)[number]; end?: (typeof bindings)[number] }>()
    for (const b of bindings) {
      const entry = byArrow.get(b.fromId as string) ?? {}
      if ((b.props as { terminal: string }).terminal === 'start') entry.start = b
      else entry.end = b
      byArrow.set(b.fromId as string, entry)
    }

    const entry = byArrow.get('arrow-1')
    expect(entry?.start?.toId).toBe('card-A')
    expect(entry?.end?.toId).toBe('card-B')
  })

  it('单端绑定：仅产出存在端点的 binding rec（不伪造缺失端）', () => {
    const engine = makeEngine([
      cardA,
      { id: 'arrow-2', type: 'arrow', x: 0, y: 0, width: 10, height: 0, startBinding: { elementId: 'card-A', focus: 0, gap: 8 } },
    ])
    const bindings = engine.store.allRecords().filter((r) => r.typeName === 'binding')
    expect(bindings).toHaveLength(1)
    expect(bindings[0].toId).toBe('card-A')
  })

  it('无绑定字段或空端点的箭头不产出 binding rec', () => {
    const engine = makeEngine([{ id: 'arrow-3', type: 'arrow', x: 0, y: 0, width: 10, height: 0 }])
    const bindings = engine.store.allRecords().filter((r) => r.typeName === 'binding')
    expect(bindings).toHaveLength(0)
  })

  it('shape rec 仍携带 typeName=shape 且透传卡片字段（既有行为不回归）', () => {
    const engine = makeEngine([])
    engine.createShape({ type: 'note-card', x: 0, y: 0, props: { w: 100, h: 50 } })
    const shapes = engine.store.allRecords().filter((r) => r.typeName === 'shape')
    expect(shapes).toHaveLength(1)
    expect(shapes[0]).toMatchObject({ type: 'note-card', x: 0, y: 0 })
  })
})
