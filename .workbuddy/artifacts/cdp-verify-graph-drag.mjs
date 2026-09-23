/**
 * CDP 真机探针 · 双链图谱「节点拖拽」（2026-09-23 用户报障）
 * ==========================================================================
 * 报障原话：
 *   「优化图谱功能的节点推拽，现在抓住阶段进行快速滑动，松手后，会有个别单独一个的节点
 *     飞的很远，而且要求优化阶段拖拽的性能，不够丝滑」
 *
 * 两个缺陷 → 两条机器可量的判据（不靠"看着还行"）：
 *   ① 「飞出去」：用 MutationObserver 逐帧量**每个节点的单帧位移**。
 *      修好后任何节点单帧位移 ≤ 力模拟上限 MAX_STEP(16px) + 合成拖动步长；
 *      旧实现里被拖拽节点会累积速度、被撞节点会吃到上万倍冲量 ⇒ 单帧位移出现数百 px 的尖峰。
 *      另量一条**落点守恒**：被拖拽节点松手后的最终位置应≈「起点 + 拖动位移」（松手不继续飞）。
 *   ② 「不丝滑」：拖拽期 SVG 必须挂 `is-dragging`（这是拖拽期性能优化的开关：
 *      关闭脉冲动画 / 过渡 / 发光滤镜）。用真实鼠标拖动 20 步，量跟手精度 + 过程态类名。
 *
 * 与「旧行为」的红绿对照（把 GraphPanel.tsx 临时还原到旧斥力/旧拖拽积分即可，dev HMR 自动生效）：
 *   §3 单帧位移上限、§3 落点守恒 —— 这两条应翻红；§1/§2（挂载、is-dragging）应仍绿。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1；CDP 端口须与启动端口一致）：
 *   CDP_PORT=9451 node .workbuddy/artifacts/cdp-verify-graph-drag.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(process.env.MC_PORT || new URL(BASE).port || 5174)
/** 单帧位移上限：力模拟 MAX_STEP(16) + 合成拖动步长(~15) + 余量。旧实现会远超此值 */
const FRAME_CAP = Number(process.env.MC_FRAME_CAP || 60)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.pageErrors = []
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
        return
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params?.exceptionDetails
        this.pageErrors.push(`exception: ${d?.exception?.description || d?.text || 'unknown'}`)
      }
      if (m.method === 'Log.entryAdded') {
        const e = m.params?.entry
        if (e?.level === 'error') this.pageErrors.push(`console: ${e?.text}`)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
  mark() { return this.pageErrors.length }
  since(mark) { return this.pageErrors.slice(mark).filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e)) }
}

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log(`   · ${s}`)

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

/** 就绪判据必须与应用同源（别用 #root，过早为真） */
function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

const GRAPH_READY = `document.querySelectorAll('.aurora-graph__node').length > 0`
const DRAGGING = `document.querySelector('.aurora-graph__svg').classList.contains('is-dragging')`
const BARS = `.aurora-graph__topbar, .aurora-graph__statusbar, .aurora-graph__controls`

// ────────────────────────── 真实鼠标事件 ──────────────────────────
async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

/** 某个节点圆的屏幕中心（走 getBoundingClientRect ⇒ 自动含视口缩放/平移） */
const nodeCenterExpr = (id) => `(() => {
  const g = [...document.querySelectorAll('.aurora-graph__node')]
    .find((x) => x.getAttribute('data-node-id') === ${JSON.stringify(id)})
  if (!g) return null
  const dot = g.querySelector('.aurora-graph__dot')
  if (!dot) return null
  const b = dot.getBoundingClientRect()
  if (b.width <= 0 && b.height <= 0) return null
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
})()`

/** 选一个"有拖动空间"的 file 节点 */
const PICK = `(() => {
  const svg = document.querySelector('.aurora-graph__svg')
  const r = svg.getBoundingClientRect()
  const bars = [...document.querySelectorAll(${JSON.stringify(BARS)})].map((e) => e.getBoundingClientRect())
  const inBar = (x, y) => bars.some((b) => x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8)
  const cands = []
  for (const g of document.querySelectorAll('.aurora-graph__node')) {
    const dot = g.querySelector('circle')
    if (!dot) continue
    const b = dot.getBoundingClientRect()
    if (b.width <= 0 && b.height <= 0) continue
    const x = b.left + b.width / 2
    const y = b.top + b.height / 2
    const roomX = Math.min(x - r.left, r.right - x)
    const roomY = Math.min(y - r.top, r.bottom - y)
    if (inBar(x, y)) continue
    cands.push({ id: g.getAttribute('data-node-id'), x, y, room: Math.min(roomX, roomY) })
  }
  cands.sort((a, b) => b.room - a.room)
  const best = cands[0]
  if (!best) return null
  // 拖动向量：朝画布内侧、避开上下两条浮层条（顶栏 12px 起、底栏贴底）
  const dirX = best.x < (r.left + r.right) / 2 ? 1 : -1
  const dx = dirX * Math.min(300, Math.max(160, Math.floor(best.room * 0.9)))
  const dy = Math.min(140, Math.max(60, Math.floor((r.bottom - best.y) * 0.35)))
  return { ...best, view: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, dx, dy }
})()`

/** 逐帧位移计：MutationObserver 监听节点几何属性变化，量「同一节点相邻两次变更」的距离 */
const installMeter = `(() => {
  if (window.__dragMeter && window.__dragMeter.stop) { try { window.__dragMeter.stop() } catch (e) {} }
  const prev = new Map()
  const centerOf = (g) => {
    const d = g.querySelector('.aurora-graph__dot')
    if (!d) return null
    const tag = d.tagName
    if (tag === 'circle') return [ +d.getAttribute('cx'), +d.getAttribute('cy') ]
    if (tag === 'rect') return [ +d.getAttribute('x') + (+d.getAttribute('width')) / 2, +d.getAttribute('y') + (+d.getAttribute('height')) / 2 ]
    const pts = d.getAttribute('points')
    if (!pts) return null
    const p = pts.trim().split(/\\s+/)[0].split(',')
    return [ +p[0], +p[1] ]
  }
  const state = { max: 0, maxId: null, maxAt: 0, batches: 0, samples: 0 }
  const obs = new MutationObserver((recs) => {
    const touched = new Set()
    for (const rec of recs) {
      const t = rec.target
      const g = t && t.closest ? t.closest('.aurora-graph__node') : null
      if (g) touched.add(g)
    }
    if (touched.size) state.batches++
    for (const g of touched) {
      const c = centerOf(g)
      if (!c) continue
      const id = g.getAttribute('data-node-id')
      const p = prev.get(id)
      if (p) {
        const dd = Math.hypot(c[0] - p[0], c[1] - p[1])
        if (dd > state.max) { state.max = dd; state.maxId = id; state.maxAt = state.samples }
      }
      prev.set(id, c)
      state.samples++
    }
  })
  obs.observe(document.querySelector('.aurora-graph__svg'), {
    subtree: true, attributes: true, attributeFilter: ['cx', 'cy', 'x', 'y', 'points'],
  })
  window.__dragMeter = { state, stop: () => obs.disconnect() }
  return true
})()`

const READ_METER = `(() => {
  const m = window.__dragMeter
  return m ? { max: +m.state.max.toFixed(2), maxId: m.state.maxId, batches: m.state.batches, samples: m.state.samples } : null
})()`

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
  const page = list.find((t) => t.type === 'page' && pageRe.test(t.url))
  if (!page) {
    console.error(`未找到 ${MC_PORT} 页面 target；当前 targets:\n` + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__probeBoot = (window.__probeBoot || 0) + 1;' })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检（目标 ${BASE}，CDP ${CDP_PORT}）===`)
  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪（侧栏项 > 0 且样式表 > 8）', r0 >= 0, `waitIdx=${r0}`)

  // 关掉首启引导浮层（skill 铁律 2：backdrop 会吞掉所有指针事件）
  const guide = await cdp.eval(`(() => {
    const g = document.querySelector('.aurora-audience')
    if (g) { g.remove(); return 'removed' }
    return 'none'
  })()`)
  info(`§0 首启引导浮层：${guide}`)

  const gReady = await waitFor(cdp, GRAPH_READY, { tries: 120, ms: 500, label: '图谱挂载' })
  ok('§0 图谱已挂载且渲染出节点（扫描面非空）', gReady >= 0, `waitIdx=${gReady}`)
  const nodeStats = await cdp.eval(`(() => {
    const all = document.querySelectorAll('.aurora-graph__node').length
    const files = document.querySelectorAll('.aurora-graph__node[data-node-type="file"]').length
    const edges = document.querySelectorAll('.aurora-graph__edge').length
    return { all, files, edges, isDragging: document.querySelector('.aurora-graph__svg').classList.contains('is-dragging') }
  })()`)
  info(`§0 节点共 ${nodeStats.all}（file ${nodeStats.files}）、连线 ${nodeStats.edges}）
     启动即未处于拖拽态：isDragging=${nodeStats.isDragging}`)
  ok('§0 扫描面达到合理量级（≥6 个节点，足够产生碰撞/挤压）', nodeStats.all >= 6, `nodes=${nodeStats.all}`)
  ok('§0 未拖动前 SVG 不带 is-dragging（该类的出现必须由拖拽引起）', nodeStats.isDragging === false)

  const pick = await cdp.eval(PICK)
  ok('§0 选中一个可拖动的 file 节点（有拖动空间、不在浮层条上）', !!pick,
    pick ? `id=${pick.id} at=(${Math.round(pick.x)},${Math.round(pick.y)}) → 拖 (${pick.dx},${pick.dy})` : '无候选')
  if (!pick) { process.exit(4) }

  const startX = Math.round(pick.x)
  const startY = Math.round(pick.y)
  const endX = Math.round(pick.x + pick.dx)
  const endY = Math.round(pick.y + pick.dy)
  const orig = await cdp.eval(nodeCenterExpr(pick.id))

  // ────────────────────────── §1 真实拖动（含唤醒 + 3 轮重试） ──────────────────────────
  console.log('\n=== 1. 真实鼠标拖动（快速滑动 20 步）===')
  let attempt = 0
  let midDrag = null
  let dragStarted = false
  for (let i = 1; i <= 3 && !dragStarted; i++) {
    attempt = i
    // 唤醒点击（窗口激活会吞掉最早的合成鼠标事件）—— 落在画布空白处，无副作用
    await realClick(cdp, Math.round(pick.view.left) + 40, Math.round(pick.view.top) + 40)
    await sleep(200)
    await cdp.eval(installMeter) // 每轮重置计量器
    await sleep(60)

    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: startX, y: startY, buttons: 0 })
    await sleep(40)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y: startY, button: 'left', buttons: 1, clickCount: 1 })
    await sleep(40)

    const steps = 20
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(startX + (endX - startX) * t),
        y: Math.round(startY + (endY - startY) * t),
        button: 'left',
        buttons: 1,
      })
      await sleep(12)
    }
    // 跟手期采样（仍按住）：过程态类名 + 节点是否跟着指针
    const holding = await cdp.eval(`(() => ({
      dragging: document.querySelector('.aurora-graph__svg').classList.contains('is-dragging'),
      cur: (() => {
        const g = [...document.querySelectorAll('.aurora-graph__node')].find((x) => x.getAttribute('data-node-id') === ${JSON.stringify(pick.id)})
        if (!g) return null
        const b = g.querySelector('.aurora-graph__dot').getBoundingClientRect()
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
      })(),
    }))()`)
    midDrag = holding
    if (holding.dragging) dragStarted = true
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: endX, y: endY, button: 'left', buttons: 0, clickCount: 1 })
    if (!dragStarted) { info(`§1 第 ${i} 轮未进入拖拽态（合成输入未送达，skill 铁律 2）→ 重试`); await sleep(300) }
  }

  ok('§1 真实拖动能进入拖拽态（attempt=' + attempt + '）', dragStarted,
    midDrag ? `isDragging=${midDrag.dragging}` : 'no sample')
  if (!dragStarted) { process.exit(5) }

  // 跟手精度：按住时被拖拽节点应基本停在指针下（起点即抓点中心 ⇒ 偏移≈0）
  const followDist = midDrag.cur ? Math.hypot(midDrag.cur.x - endX, midDrag.cur.y - endY) : NaN
  ok('§1 拖拽跟手：按住时被拖拽节点落在指针附近（≤ 30px）',
    Number.isFinite(followDist) && followDist <= 30, `dist=${Number.isFinite(followDist) ? followDist.toFixed(1) : 'n/a'}px`)

  // ────────────────────────── §2 松手后：落点守恒（不继续飞） ──────────────────────────
  console.log('\n=== 2. 松手后（关键）：落点守恒 + 逐帧位移有界 ===')
  await sleep(1600) // 让力模拟自然衰减
  const settled = await cdp.eval(nodeCenterExpr(pick.id))
  const isDraggingAfter = await cdp.eval(DRAGGING)
  ok('§2 松手后 SVG 摘下 is-dragging（性能开关随之恢复）', isDraggingAfter === false)

  const expectX = orig.x + (endX - startX)
  const expectY = orig.y + (endY - startY)
  const drift = settled ? Math.hypot(settled.x - expectX, settled.y - expectY) : NaN
  info(`§2 起点=(${Math.round(orig.x)},${Math.round(orig.y)}) 落点期望=(${Math.round(expectX)},${Math.round(expectY)}) 实际=(${settled ? Math.round(settled.x) : 'n/a'},${settled ? Math.round(settled.y) : 'n/a'})`)
  ok('§2 🚨 落点守恒：松手后节点停在落点附近（≤ 90px），没有被残留速度带走「飞出去」',
    Number.isFinite(drift) && drift <= 90, `drift=${Number.isFinite(drift) ? drift.toFixed(1) : 'n/a'}px`)

  const meter = await cdp.eval(READ_METER)
  info(`§2 逐帧位移计：max=${meter ? meter.max : 'n/a'}px（节点 ${meter ? meter.maxId : '-'}），采样 ${meter ? meter.samples : '-'} 次 / ${meter ? meter.batches : '-'} 批`)
  ok('§2 逐帧位移计确实有采样（扫描面非空，「有界」不是空转）',
    !!meter && meter.samples > 20 && meter.batches > 5, meter ? `samples=${meter.samples} batches=${meter.batches}` : 'no meter')
  ok(`§2 🚨 全程无任何节点单帧位移超过 ${FRAME_CAP}px（旧实现此处会冒出数百 px 的尖峰 = 报障的「飞出去」）`,
    !!meter && meter.max <= FRAME_CAP, meter ? `max=${meter.max}px @${meter.maxId}` : 'no meter')

  // 附加：没有任何节点被甩到画布之外（"飞走"的另一种表现）
  const outside = await cdp.eval(`(() => {
    const r = document.querySelector('.aurora-graph__svg').getBoundingClientRect()
    const far = []
    for (const g of document.querySelectorAll('.aurora-graph__node')) {
      const b = g.querySelector('.aurora-graph__dot').getBoundingClientRect()
      const cx = b.left + b.width / 2
      const cy = b.top + b.height / 2
      const d = Math.max(r.left - cx, cx - r.right, r.top - cy, cy - r.bottom)
      if (d > 120) far.push({ id: g.getAttribute('data-node-id'), out: Math.round(d) })
    }
    return far
  })()`)
  ok('§2 没有节点被甩到画布外超过 120px', outside.length === 0, `far=${JSON.stringify(outside.slice(0, 4))}`)

  // ────────────────────────── §3 页面错误 ──────────────────────────
  console.log('\n=== 3. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§3 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) {
    console.log('未通过：')
    failed.forEach((f) => console.log('  ❌ ' + f.name))
  }
  try { cdp.send('Browser.close').catch(() => {}) } catch { /* 忽略 */ }
  await sleep(400)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
