/**
 * engineNodeTest — CanvasEngine 适配器无头功能测试（Node 端，使用内存版 Excalidraw API 桩）
 *
 * 验证：创建/几何同步/选中同步/移动写回/撤销重做/序列化往返/旧数据迁移。
 * 不依赖真实浏览器或 Excalidraw 渲染。
 */
import { CanvasEngine } from './CanvasEngine'
import { isTldrawSnapshot, migrateTldrawToEngine } from '../canvasPersistence'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✓ ' + msg)
  } else {
    failures++
    console.log('  ✗ FAIL: ' + msg)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── 内存版 Excalidraw API 桩 ──
function makeFakeApi() {
  const elements: any[] = []
  const appState: any = { scrollX: 0, scrollY: 0, zoom: 1, selectedElementIds: {}, activeTool: { type: 'selection' } }
  return {
    api: {
      updateScene: (scene: any) => {
        // 真实 Excalidraw 的 updateScene 会「整体替换」场景（与 merge 不同）
        if (scene.elements) {
          elements.length = 0
          for (const e of scene.elements) {
            if (!e.isDeleted) elements.push(e)
          }
        }
        if (scene.appState) Object.assign(appState, scene.appState)
      },
      updateElement: (el: any) => {
        const i = elements.findIndex((e) => e.id === el.id)
        if (i >= 0) elements[i] = { ...elements[i], ...el }
        else elements.push(el)
      },
      getSceneElements: () => elements,
      getAppState: () => appState,
      setActiveTool: (t: any) => {
        appState.activeTool = t
      },
      scrollToContent: () => {},
    },
    elements,
    appState,
  }
}

async function run() {
  console.log('\n[1] 创建卡片 + 代理矩形同步')
  const fake = makeFakeApi()
  const engine = new CanvasEngine()
  const container: any = {
    clientWidth: 1000,
    clientHeight: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
  }
  engine.attach(fake.api, container)

  const id = engine.createShape({
    type: 'note-card',
    x: 100,
    y: 100,
    props: { w: 260, h: 200, text: '# Hi', color: '#3b82f6' },
  })
  assert(!!id, 'createShape 返回 id')
  assert(engine.getCurrentPageShapes().some((s) => s.id === id), 'shape 存在于引擎')
  assert(fake.elements.some((e) => e.id === id && e.customData?.cardType === 'note-card'), '代理矩形已写入场景')
  assert(fake.elements.find((e) => e.id === id)?.width === 260, '代理矩形尺寸 = 260')

  console.log('\n[2] 几何同步（Excalidraw 拖拽 → 引擎）')
  const el = fake.elements.find((e) => e.id === id)
  el.x = 320
  el.y = 360
  el.width = 260
  el.height = 200
  fake.appState.selectedElementIds = { [id]: true }
  fake.appState.activeTool = { type: 'selection' }
  engine.syncFromScene()
  const synced = engine.getShape(id)
  assert(synced?.x === 320 && synced?.y === 360, '引擎坐标已同步 (320,360)')
  assert(engine.getSelectedShapeIds().includes(id), '选中已同步')
  await sleep(450) // 等待历史快照落盘（模拟用户停顿）

  console.log('\n[3] updateShape 写回 Excalidraw')
  engine.updateShape({ id, x: 400, y: 400 })
  const back = fake.elements.find((e) => e.id === id)
  assert(back.x === 400 && back.y === 400, '场景矩形坐标已写回 (400,400)')
  await sleep(450) // 等待历史快照落盘

  console.log('\n[4] 撤销 / 重做')
  engine.undo()
  assert(engine.getShape(id)?.x === 320, '撤销恢复到 320')
  engine.redo()
  assert(engine.getShape(id)?.x === 400, '重做恢复到 400')

  console.log('\n[5] 删除')
  engine.deleteShapes([id])
  assert(!engine.getCurrentPageShapes().some((s) => s.id === id), '删除后引擎无该 shape')
  assert(!fake.elements.some((e) => e.id === id), '删除后场景无代理矩形')

  console.log('\n[6] 序列化往返')
  const id2 = engine.createShape({ type: 'note-card', x: 50, y: 50, props: { w: 260, h: 200, text: 'A', color: '#22c55e' } })
  const snap = engine.serialize() as any
  assert(snap.version === 2, 'serialize version=2')
  assert(snap.shapes.length === 1 && snap.shapes[0].id === id2, 'serialize 包含 card shape')
  engine.loadDocument(snap)
  assert(engine.getCurrentPageShapes().some((s) => s.id === id2), 'loadDocument 往返后 shape 仍在')

  console.log('\n[7] 旧 tldraw 快照迁移')
  const tldrawDoc = {
    store: {
      'shape:card1': {
        id: 'shape:card1',
        typeName: 'shape',
        type: 'note-card',
        x: 80,
        y: 80,
        rotation: 0,
        isLocked: false,
        props: { w: 260, h: 200, text: 'Old note', color: '#3b82f6', tags: 'a,b', pinned: true },
        meta: {},
      },
      'shape:card2': {
        id: 'shape:card2',
        typeName: 'shape',
        type: 'note-card',
        x: 400,
        y: 80,
        rotation: 0,
        isLocked: false,
        props: { w: 260, h: 200, text: 'Other', color: '#22c55e' },
        meta: {},
      },
      'shape:arrow1': {
        id: 'shape:arrow1',
        typeName: 'shape',
        type: 'arrow',
        x: 200,
        y: 100,
        rotation: 0,
        isLocked: false,
        props: { start: { x: 200, y: 100 }, end: { x: 500, y: 100 }, richText: 'rel' },
        meta: {},
      },
      'binding:start': {
        id: 'binding:start',
        typeName: 'binding',
        type: 'arrow',
        fromId: 'shape:arrow1',
        toId: 'shape:card1',
        props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 } },
      },
      'binding:end': {
        id: 'binding:end',
        typeName: 'binding',
        type: 'arrow',
        fromId: 'shape:arrow1',
        toId: 'shape:card2',
        props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 } },
      },
    },
    schema: {},
  }
  assert(isTldrawSnapshot(tldrawDoc), 'isTldrawSnapshot 正确识别 tldraw 快照')
  assert(!isTldrawSnapshot(snap), 'isTldrawSnapshot 对 Excalidraw 格式返回 false')
  const migrated = migrateTldrawToEngine(tldrawDoc)
  assert(migrated.shapes.length === 2, '迁移得到 2 个卡片')
  assert(migrated.elements.length === 1 && migrated.elements[0].type === 'arrow', '迁移得到 1 个箭头元素')
  assert(migrated.elements[0].startBinding?.elementId === 'shape:card1', '箭头起点绑定 card1')
  assert(migrated.elements[0].endBinding?.elementId === 'shape:card2', '箭头终点绑定 card2')

  console.log('\n[8] 迁移数据加载进引擎')
  engine.loadDocument(migrated)
  const cards = engine.getCurrentPageShapes().filter((s) => s.type === 'note-card')
  assert(cards.length === 2, '引擎含 2 个卡片')
  const arrows = engine.getCurrentPageShapes().filter((s) => s.type === 'arrow')
  assert(arrows.length === 1, '引擎合成 1 个箭头 shape')
  assert(arrows[0].props?.start === 'shape:card1' && arrows[0].props?.end === 'shape:card2', '箭头连接关系正确')

  console.log('\n[9] 相机 / 工具')
  engine.setCamera({ x: -50, y: -60, z: 1.5 })
  assert(Math.abs(engine.getCamera().z - 1.5) < 1e-9, '相机 zoom 已设置')
  engine.setCurrentTool('arrow')
  assert(engine.getCurrentToolId() === 'arrow', '当前工具 = arrow')

  console.log('\n[10] 工具名映射（tldraw ↔ Excalidraw）')
  // 正向：tldraw 名 → Excalidraw 原生名（setActiveTool）。
  // 注意：setCurrentTool 为规避 Maximum call stack，已将 setActiveTool 延迟到 queueMicrotask，
  // 故此处需 await 一个微任务/宏任务再断言 activeTool。
  const flush = () => sleep(0)
  engine.setCurrentTool('select'); await flush()
  assert(engine.getCurrentToolId() === 'select', '引擎存 tldraw 名 select')
  assert(fake.appState.activeTool.type === 'selection', 'Excalidraw 激活 selection')
  engine.setCurrentTool('draw'); await flush()
  assert(engine.getCurrentToolId() === 'draw', '引擎存 draw')
  assert(fake.appState.activeTool.type === 'freedraw', 'Excalidraw 激活 freedraw')
  engine.setCurrentTool('text'); await flush()
  assert(fake.appState.activeTool.type === 'text', 'Excalidraw 激活 text')
  // geo：由 setStyleForNextShapes 记录的子形状决定 rectangle / ellipse
  engine.setStyleForNextShapes(null, 'rectangle')
  engine.setCurrentTool('geo'); await flush()
  assert(engine.getCurrentToolId() === 'geo', '引擎存 geo')
  assert(fake.appState.activeTool.type === 'rectangle', 'geo(rectangle) → Excalidraw rectangle')
  engine.setStyleForNextShapes(null, 'ellipse')
  engine.setCurrentTool('geo'); await flush()
  assert(fake.appState.activeTool.type === 'ellipse', 'geo(ellipse) → Excalidraw ellipse')
  // note：无原生工具，退回选择态（存 select）
  engine.setCurrentTool('note'); await flush()
  assert(engine.getCurrentToolId() === 'select', 'note 退回 select')
  // 反向：Excalidraw 原生名 → tldraw 名（syncFromScene）
  fake.appState.activeTool = { type: 'freedraw' }
  engine.syncFromScene()
  assert(engine.getCurrentToolId() === 'draw', 'syncFromScene: freedraw → draw')
  fake.appState.activeTool = { type: 'rectangle' }
  engine.syncFromScene()
  assert(engine.getCurrentToolId() === 'geo', 'syncFromScene: rectangle → geo')
  fake.appState.activeTool = { type: 'selection' }
  engine.syncFromScene()
  assert(engine.getCurrentToolId() === 'select', 'syncFromScene: selection → select')

  console.log('\n[11] 箭头连线绑定 + 移动跟随')
  const aId = engine.createShape({ type: 'note-card', x: 100, y: 100, props: { w: 260, h: 200, text: 'A' } })
  const bId = engine.createShape({ type: 'note-card', x: 640, y: 420, props: { w: 260, h: 200, text: 'B' } })
  await sleep(50)
  const arrowId = engine.createBoundArrow(aId, bId)
  assert(!!arrowId, 'createBoundArrow 返回 id')
  const arrowEl = fake.elements.find((e) => e.id === arrowId)
  assert(!!arrowEl && arrowEl.type === 'arrow', '场景中存在 arrow 元素')
  assert(arrowEl.startBinding?.elementId === aId && arrowEl.endBinding?.elementId === bId, '箭头绑定到两张卡片')
  const aCard = fake.elements.find((e) => e.id === aId)
  const bCard = fake.elements.find((e) => e.id === bId)
  assert(aCard.boundElements?.some((x: any) => x.id === arrowId), '卡片A boundElements 含箭头')
  assert(bCard.boundElements?.some((x: any) => x.id === arrowId), '卡片B boundElements 含箭头')
  // 起点端点应吸附到卡片A边缘外（而非插入卡片内部）
  const sx = arrowEl.x + arrowEl.points[0][0]
  const sy = arrowEl.y + arrowEl.points[0][1]
  assert(
    sx >= aCard.x - 12 && sx <= aCard.x + aCard.width + 12 &&
    sy >= aCard.y - 12 && sy <= aCard.y + aCard.height + 12,
    '起点端点吸附卡片A边缘',
  )
  // 同一方向重复连线应被去重
  const dup = engine.createBoundArrow(aId, bId)
  assert(dup === null, '重复同方向连线被拒绝')
  // 移动卡片A，箭头起点应跟随
  const startBefore = { x: sx, y: sy }
  engine.updateShape({ id: aId, x: aCard.x + 200, y: aCard.y - 100 })
  const movedArrow = fake.elements.find((e) => e.id === arrowId)
  const nsx = movedArrow.x + movedArrow.points[0][0]
  const nsy = movedArrow.y + movedArrow.points[0][1]
  assert(Math.abs(nsx - startBefore.x) > 30 || Math.abs(nsy - startBefore.y) > 30, '移动卡片A后箭头起点跟随移动')
  const newA = fake.elements.find((e) => e.id === aId)
  assert(
    nsx >= newA.x - 12 && nsx <= newA.x + newA.width + 12 &&
    nsy >= newA.y - 12 && nsy <= newA.y + newA.height + 12,
    '移动后起点仍吸附卡片A新边缘（持续绑定）',
  )
  // 同时终点也应仍吸附卡片B边缘
  const nex = movedArrow.x + movedArrow.points[1][0]
  const ney = movedArrow.y + movedArrow.points[1][1]
  assert(
    nex >= bCard.x - 12 && nex <= bCard.x + bCard.width + 12 &&
    ney >= bCard.y - 12 && ney <= bCard.y + bCard.height + 12,
    '移动后终点仍吸附卡片B边缘',
  )
  // 删除卡片B，箭头应被连带删除
  engine.deleteShapes([bId])
  assert(!fake.elements.some((e) => e.id === arrowId && !e.isDeleted), '删除卡片B后箭头被连带删除')

  console.log('\n[12] 撤销/重做 UI 状态传播 + 基线快照（修复「点击无效果」）')
  {
    const f2 = makeFakeApi()
    const eng2 = new CanvasEngine()
    eng2.attach(f2.api, container)
    // 加载含 1 张卡片的文档
    eng2.loadDocument({
      version: 2,
      viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
      elements: [{ id: 'base1', type: 'rectangle', x: 10, y: 10, width: 100, height: 80, isDeleted: false, customData: { cardType: 'note-card' } }],
      shapes: [{ id: 'base1', type: 'note-card', x: 10, y: 10, props: { w: 100, h: 80, text: 'base' } }],
    })
    assert(eng2.getCanUndo() === false, '加载文档后基线快照存在，canUndo=false（不能撤销到自身）')
    assert(eng2.getCanRedo() === false, '加载文档后 canRedo=false')

    // 注册监听，验证 scheduleHistory 后 emit 触发（UI 据此刷新按钮可用态）
    let emitted = 0
    eng2.store.listen(() => { emitted++ }, { scope: 'session' })

    // 新增一张卡片
    const newId = eng2.createShape({ type: 'note-card', x: 200, y: 200, props: { w: 100, h: 80, text: 'new' } })
    await sleep(450) // 等历史快照落盘（含 emit）
    assert(eng2.getCanUndo() === true, '新增卡片后 canUndo 变为 true（修复：快照后 emit 使 UI 状态刷新）')
    assert(emitted > 0, 'scheduleHistory 触发了 emit（store.listen 收到通知）')
    assert(f2.elements.length === 2, '场景含 2 张卡片（基线 + 新增）')

    // 撤销 → 回到基线（仅基线卡片）
    eng2.undo()
    assert(eng2.getCanUndo() === false, '撤销后回到基线，canUndo=false')
    assert(f2.elements.length === 1 && f2.elements[0].id === 'base1', '撤销后场景仅剩基线卡片')
    assert(eng2.getCanRedo() === true, '撤销后可重做')

    // 重做 → 恢复新增卡片
    eng2.redo()
    assert(eng2.getCanUndo() === true, '重做后 canUndo=true')
    assert(f2.elements.length === 2, '重做后场景恢复 2 张卡片')
    assert(f2.elements.some((e) => e.id === newId), '重做后新增卡片回归')
  }

  // ── [13] 回归：逐步撤销（每次只撤销最近一步，而非一次性清空） ──
  console.log('\n[13] 逐步撤销（原生图形多步绘制）')
  {
    const f3 = makeFakeApi()
    const eng3 = new CanvasEngine()
    eng3.attach(f3.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    eng3.loadDocument({ version: 2, viewport: { scrollX: 0, scrollY: 0, zoom: 1 }, elements: [], shapes: [] })
    // 模拟用户选择「画笔」工具（Excalidraw 会保持该工具用于后续每次绘制）
    eng3.setCurrentTool('draw')
    await sleep(5)

    // 模拟连续绘制 3 条 free-draw 笔画，每次绘制之间留 >450ms（超过历史防抖窗口）
    const drawStroke = async (id: string) => {
      // pointerdown：Excalidraw 将元素加入场景
      f3.elements.push({ id, type: 'freedraw', x: 0, y: 0, width: 10, height: 10, isDeleted: false, points: [[0, 0], [5, 5]], version: 1, versionNonce: 1, customData: {} })
      eng3.syncFromScene()
      // pointermove：更新几何
      const el = f3.elements.find((e) => e.id === id)!
      el.width = 30; el.height = 30; el.version = 2
      eng3.syncFromScene()
      // pointerup：绘制结束（Excalidraw 释放 draggingElement）
      await sleep(450)
    }
    await drawStroke('s1')
    await drawStroke('s2')
    await drawStroke('s3')

    console.log('    history depth (undoStack length):', (eng3 as any).undoStack.length)
    assert((eng3 as any).undoStack.length >= 4, '每个笔画都生成了独立的历史条目（基线 + 3 步）')
    assert(eng3.getCanUndo() === true, '存在可撤销步骤')
    assert(f3.elements.length === 3, '当前场景含 3 条笔画')

    // 逐步撤销：每一次只应移除最近一条
    eng3.undo()
    assert(f3.elements.length === 2, '第 1 次撤销后剩 2 条（仅移除最近一步）')
    eng3.undo()
    assert(f3.elements.length === 1, '第 2 次撤销后剩 1 条')
    eng3.undo()
    assert(f3.elements.length === 0, '第 3 次撤销后清空（回到基线）')
    eng3.undo()
    assert(f3.elements.length === 0, '基线之上再撤销无副作用（不动）')
  }

  // ── [14] 回归：快速连续绘制（<400ms）也必须逐步撤销 ──
  // 此前防抖会把快速连续的多笔合并成一条历史 → 一次撤销清空全部。
  // 修复后依赖 draggingElement 手势边界，每笔独立成一条历史。
  console.log('\n[14] 快速连续绘制 → 逐步撤销')
  {
    const f4 = makeFakeApi()
    const eng4 = new CanvasEngine()
    eng4.attach(f4.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    eng4.loadDocument({ version: 2, viewport: { scrollX: 0, scrollY: 0, zoom: 1 }, elements: [], shapes: [] })
    eng4.setCurrentTool('draw')
    await sleep(5)

    // 快速画 3 笔，每笔间隔仅 60ms（远小于 400ms 防抖窗口）
    const drawRapid = async (id: string) => {
      // pointerdown：Excalidraw 把正在绘制的图元挂到 draggingElement
      f4.appState.draggingElement = { id, type: 'freedraw' }
      f4.elements.push({ id, type: 'freedraw', x: 0, y: 0, width: 10, height: 10, isDeleted: false, points: [[0, 0]], version: 1, versionNonce: 1, customData: {} })
      eng4.syncFromScene()
      const el = f4.elements.find((e) => e.id === id)!
      el.version = 2
      eng4.syncFromScene()
      await sleep(60)
      // pointerup：释放 draggingElement → 手势结束，引擎应收敛为「一条」历史
      f4.appState.draggingElement = null
      eng4.syncFromScene()
      await sleep(60)
    }
    await drawRapid('r1')
    await drawRapid('r2')
    await drawRapid('r3')

    console.log('    rapid history depth:', (eng4 as any).undoStack.length)
    assert((eng4 as any).undoStack.length >= 4, '快速 3 笔仍各自独立成历史条目（基线 + 3）')
    assert(f4.elements.length === 3, '当前含 3 笔')

    // 重做栈应为空（新绘制后清空）
    eng4.undo()
    assert(f4.elements.length === 2, '快速绘制后第 1 次撤销仅移除最近一笔')
    eng4.undo()
    assert(f4.elements.length === 1, '第 2 次撤销剩 1 笔')
    eng4.undo()
    assert(f4.elements.length === 0, '第 3 次撤销回到基线')
    // 重做验证
    eng4.redo()
    assert(f4.elements.length === 1, '重做恢复最近一笔')
    eng4.redo()
    assert(f4.elements.length === 2, '重做恢复第二笔')
    eng4.redo()
    assert(f4.elements.length === 3, '重做恢复全部')
  }

  // ── [15] 回归：画笔（free-draw）首笔即可撤销/重做（DOM 指针手势驱动） ──
  // 关键根因（Excalidraw 0.17.6 实测）：进行中的 freedraw 图元挂在 appState.draggingElement，
  // 但 onChange→微任务的时序仍可能错过 draggingElement 清零的瞬间，导致首笔漏提交历史，
  // canUndo 恒为 false（要再画一笔/加卡片才有第二条历史才可撤销）。
  // 修复：改由容器 capture 阶段的 pointerdown/pointerup 调用 begin/endPointerGesture，
  // 以真实指针边界作为「一次操作」的权威边界，收笔后经 setTimeout(0) 提交「一条」历史，
  // 完全不依赖 Excalidraw 内部字段。本测试刻意「不清 draggingElement」来模拟最坏时序，
  // 证明即便 Excalidraw 内部字段未及时清零，DOM 手势仍能可靠提交历史。
  const drawFreedraw = async (f: any, eng: any, id: string) => {
    // 选中画笔工具（Excalidraw 会保持该工具连续绘制）
    eng.setCurrentTool('draw')
    await sleep(5)
    // pointerdown（容器 capture 阶段）：通知引擎手势开始
    eng.beginPointerGesture()
    // Excalidraw 将进行中的图元挂到 draggingElement（0.17.x），并加入场景
    f.appState.draggingElement = { id, type: 'freedraw' }
    f.elements.push({ id, type: 'freedraw', x: 0, y: 0, width: 2, height: 2, isDeleted: false, points: [[0, 0]], version: 1, versionNonce: 1, customData: {} })
    eng.syncFromScene()
    // pointermove：增点、变大
    const el = f.elements.find((e: any) => e.id === id)!
    el.points.push([10, 8]); el.width = 12; el.height = 8; el.version = 2
    eng.syncFromScene()
    // pointerup（容器 capture 阶段）：手势结束 → 引擎延迟提交一条历史
    // 注意：此处刻意「不清 draggingElement」，模拟 Excalidraw 内部字段清零时序不可靠的最坏情况
    eng.endPointerGesture()
    // Excalidraw 稍后清零内部字段（是否再触发 onChange 均可）
    f.appState.draggingElement = null
    await sleep(5) // 等 endPointerGesture 的 setTimeout(0) 提交落盘
  }

  console.log('\n[15a] 画笔首笔——未走 loadDocument（仅 attach，依赖基线自动播种）')
  {
    const fa = makeFakeApi()
    const enga = new CanvasEngine()
    enga.attach(fa.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    assert((enga as any).undoStack.length === 1, 'attach 未走 loadDocument 时也自动播种基线（栈深=1）')
    assert(enga.getCanUndo() === false, '基线之上尚无操作，canUndo=false')
    await drawFreedraw(fa, enga, 'free1')
    assert(fa.elements.length === 1, '场景含 1 条画笔笔迹')
    assert((enga as any).undoStack.length === 2, '首笔画笔收笔即生成独立历史条目（基线 + 1 笔）')
    assert(enga.getCanUndo() === true, '首笔画笔后即可撤销（修复：不再需要再画/加卡片）')
    // 撤销 → 笔迹消失
    enga.undo()
    assert(fa.elements.length === 0, '撤销后画笔笔迹被移除')
    assert(enga.getCanUndo() === false, '撤销回基线后 canUndo=false')
    // 重做 → 笔迹恢复
    enga.redo()
    assert(fa.elements.length === 1, '重做后画笔笔迹恢复')
    assert(enga.getCanRedo() === false, '重做后无更多可重做')
  }

  console.log('\n[15b] 画笔首笔——已 loadDocument（含基线文档）')
  {
    const fb = makeFakeApi()
    const engb = new CanvasEngine()
    engb.attach(fb.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    engb.loadDocument({ version: 2, viewport: { scrollX: 0, scrollY: 0, zoom: 1 }, elements: [], shapes: [] })
    assert(engb.getCanUndo() === false, 'loadDocument 后 canUndo=false')
    await drawFreedraw(fb, engb, 'free1')
    assert((engb as any).undoStack.length === 2, '首笔画笔收笔即生成独立历史条目（基线 + 1 笔）')
    assert(engb.getCanUndo() === true, '首笔画笔后即可撤销（loadDocument 场景同样修复）')
    // 再画第二笔 → 应独立成第三条历史
    await drawFreedraw(fb, engb, 'free2')
    assert((engb as any).undoStack.length === 3, '第二笔独立成历史（基线 + 2 笔）')
    engb.undo()
    assert(fb.elements.length === 1, '撤销仅移除最近一笔（free2）')
    engb.undo()
    assert(fb.elements.length === 0, '再撤销回到基线（free1 也被移除）')
  }

  console.log('\n[15c] 画笔首笔——完全不清 Excalidraw 内部字段（DOM 手势唯一可靠信号）')
  {
    // 最严苛复现：从头到尾 draggingElement/multiElement 均为 null（模拟某些版本/时序下
    // Excalidraw 内部字段根本不可见），仅靠 DOM begin/endPointerGesture 也必须能提交历史。
    const fc = makeFakeApi()
    const engc = new CanvasEngine()
    engc.attach(fc.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    engc.setCurrentTool('draw')
    await sleep(5)
    engc.beginPointerGesture()
    fc.elements.push({ id: 'c1', type: 'freedraw', x: 0, y: 0, width: 5, height: 5, isDeleted: false, points: [[0, 0], [5, 5]], version: 1, versionNonce: 1, customData: {} })
    engc.syncFromScene() // 无任何 appState 手势字段
    engc.endPointerGesture()
    await sleep(5)
    assert((engc as any).undoStack.length === 2, '无内部字段时，仅 DOM 手势也生成了历史条目')
    assert(engc.getCanUndo() === true, '无内部字段时首笔仍可撤销')
    engc.undo()
    assert(fc.elements.length === 0, '撤销后笔迹移除')
  }

  console.log('\n[15d] 画笔收笔必须触发 document scope 监听（canUndo 传到 React 工具栏的唯一通道）')
  {
    // 本次 bug 的真正根因：commitAfterState 原来只 emit(session)，而 CanvasView 里
    // setCanUndo/setCanRedo 只挂在 document scope 监听器（updateState）上，session 监听
    // 器不更新 canUndo。纯画笔绘制期间 syncFromScene 的 dirty 恒为 false（无 document
    // emit），于是 engine 内部 canUndoAtom 虽为 true，但 React 的 canUndo 仍是 false →
    // 撤销按钮 disabled、点击无效（红色 not-allowed 光标）。修复：commitAfterState 同时
    // emit(document)。此测试模拟 CanvasView 的两类监听器，断言收笔后 document 监听被触发
    // 且此刻 getCanUndo()===true（即 React 端能读到可撤销）。
    const fd = makeFakeApi()
    const engd = new CanvasEngine()
    engd.attach(fd.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)
    // 用对象持有观测值，避免 TS 对带初始值 let 的控制流字面量窄化
    const obs = { docFired: 0, canUndoAtDoc: false }
    // 复刻 CanvasView：document 监听器负责刷新 canUndo；session 监听器不碰 canUndo
    engd.store.listen(() => { obs.docFired++; obs.canUndoAtDoc = engd.getCanUndo() }, { scope: 'document' })
    engd.store.listen(() => { /* 仅同步 zoom/选中/工具，不更新 canUndo（模拟真实 CanvasView） */ }, { scope: 'session' })
    const docBefore = obs.docFired
    await drawFreedraw(fd, engd, 'freeD')
    assert(engd.getCanUndo() === true, '收笔后引擎 canUndo=true')
    assert(obs.docFired > docBefore, '收笔后 document scope 监听被触发（React 的 canUndo 得以刷新）')
    assert(obs.canUndoAtDoc === true, 'document 监听触发时读到的 canUndo 已为 true（按钮会被刷亮、可点击）')
  }

  console.log('\n[16] 标签元素（label-card）：创建/编辑/复制/删除/撤销/箭头绑定')
  {
    const fl = makeFakeApi()
    const engl = new CanvasEngine()
    engl.attach(fl.api, { clientWidth: 1000, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } as any)

    // 创建：默认尺寸 120×36，代理矩形同步到 Excalidraw 且 cardType 正确
    const lid = engl.createShape({ type: 'label-card', x: 100, y: 100, props: { text: '重点', bg: '#FDE68A', fontSize: 14, borderOn: true } })
    const proxy = fl.elements.find((e: any) => e.id === lid)
    assert(!!proxy, '标签创建后代理矩形已同步到 Excalidraw 场景')
    assert(proxy.customData?.cardType === 'label-card', '代理矩形 customData.cardType=label-card')
    assert(proxy.width === 120 && proxy.height === 36, '标签默认尺寸 120×36')

    // 文本/样式变更：同步引擎状态与代理矩形（含宽度自适应场景）
    engl.updateShape({ id: lid, props: { text: '非常重要的标注', w: 180, fontSize: 18, bg: '#93C5FD' } })
    const s1 = engl.getShape(lid)!
    assert(s1.props.text === '非常重要的标注' && s1.props.fontSize === 18, '文本与字号变更已写入引擎状态')
    const proxy2 = fl.elements.find((e: any) => e.id === lid)
    assert(proxy2.width === 180, '代理矩形宽度随标签自适应更新')
    assert(proxy2.customData?.bg === '#93C5FD', '背景色变更同步到代理矩形 customData')

    // 拖拽（位置写回）：代理矩形跟随
    engl.updateShape({ id: lid, x: 300, y: 240 })
    const proxy3 = fl.elements.find((e: any) => e.id === lid)
    assert(proxy3.x === 300 && proxy3.y === 240, '标签拖拽后代理矩形位置跟随')

    // 复制：副本偏移 +24/+24，样式继承
    const [copyId] = engl.duplicateShapes([lid])
    const copy = engl.getShape(copyId)!
    assert(copy.type === 'label-card' && copy.x === 324 && copy.y === 264, '复制标签偏移 24px')
    assert(copy.props.text === '非常重要的标注' && copy.props.bg === '#93C5FD', '复制标签继承文本与样式')

    // 箭头可绑定标签（与卡片同管线）
    const arrowId = engl.createBoundArrow(lid, copyId)
    assert(!!arrowId, '箭头可绑定两个标签（标签走卡片管线）')

    // 删除：代理矩形标记删除 + 绑定箭头级联删除
    engl.deleteShapes([copyId])
    const copyEl = fl.elements.find((e: any) => e.id === copyId)
    assert(!copyEl || copyEl.isDeleted === true, '删除标签后代理矩形被标记删除')
    const arrowEl = fl.elements.find((e: any) => e.id === arrowId)
    assert(!arrowEl || arrowEl.isDeleted === true, '删除标签后绑定箭头级联删除')

    // 撤销/重做：标签操作进入统一历史栈
    await sleep(450)
    assert(engl.getCanUndo() === true, '标签操作可撤销（进入统一历史栈）')
  }

  console.log('\n========================================')
  if (failures === 0) console.log('ALL ENGINE TESTS PASSED ✓')
  else console.log(`${failures} TEST(S) FAILED ✗`)
  console.log('========================================')
  process.exit(failures === 0 ? 0 : 1)
}

run().catch((e) => {
  console.error('TEST CRASHED:', e)
  process.exit(2)
})
