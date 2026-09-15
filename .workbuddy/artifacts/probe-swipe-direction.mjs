/**
 * 探针：滑块**方向**验证（2026-09-15 用户反馈「往右滑动 tab 却去到左侧」）
 * ---------------------------------------------------------------------------
 * 规则（修正后）：**位移方向 = 目标方向**
 *   向右拖 → 切到右边的 tab（index + 1）
 *   向左拖 → 切到左边的 tab（index - 1）
 *
 * 对每条 tab 栏做**双向**验证：
 *   ① 向右拖 slot → 激活 index 必须 +1（若已在末位则改向左）
 *   ② 再从新位置反向拖回 → 激活 index 必须回到起点
 * 同时断言滑块跟手符号与鼠标同号、滑块落点 = 新激活 tab 的 x、tab 文字零位移。
 *
 * 环境：dev @5174；Edge CDP @9445（须与脚本同一次前台 bash 启动）
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9445)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 选中态判定：兼容 `--active` / `is-active` 两种 BEM 写法与 aria-selected */
const ACTIVE_PRED = `(e => /--active|is-active/.test(e.className) || e.getAttribute('aria-selected') === 'true')`

/** 读取当前栏状态（拖动中 / 松手后通用；依赖 window.__probe* 已就位） */
const SNAP_EXPR = `(() => {
  const bar = document.querySelector(window.__probeBar)
  const thumb = document.querySelector(window.__probeThumb)
  if (!bar || !thumb) return null
  const tabs = [...bar.querySelectorAll(window.__probeTab)]
  const act = tabs.findIndex(${ACTIVE_PRED})
  const transform = getComputedStyle(thumb).transform
  return {
    activeIdx: act,
    thumbLeft: Math.round(thumb.getBoundingClientRect().x * 10) / 10,
    thumbTransformX: transform === 'none' ? null : Math.round(new DOMMatrixReadOnly(transform).m41 * 10) / 10,
    tabX: tabs.map(e => Math.round(e.getBoundingClientRect().x * 10) / 10),
  }
})()`

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)) } }, 20000)
    })
  }
  onMessage(raw) {
    const msg = JSON.parse(raw)
    if (msg.id && this.pending.has(msg.id)) {
      const { res, rej } = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    }
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
}

/** 按住 from 点向 dir 方向拖 dx，返回拖动中的快照 */
async function drag(cdp, { fromX, fromY, dx, durationMs = 420, steps = 14 }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(80)
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: Math.round(fromX + dx * (i / steps)), y: fromY, button: 'left', buttons: 1,
    })
    await sleep(Math.max(6, durationMs / steps))
  }
  const mid = await cdp.eval(SNAP_EXPR)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fromX + dx, y: fromY, button: 'left', buttons: 0, clickCount: 1 })
  return mid
}

/* ---------------- 连接 ---------------- */
const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const pages = list.filter((t) => t.type === 'page' && t.url.includes('localhost:5174'))
const page = pages[pages.length - 1]
if (!page) { console.error('未找到 5174 页面 —— Edge 是否与脚本同一次 bash 启动？'); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
const cdp = new Cdp(ws)
ws.on('message', (raw) => cdp.onMessage(raw))
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')

for (let i = 0; i < 40; i++) {
  try { if (await cdp.eval(`document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0`)) break } catch { /* 未就绪 */ }
  await sleep(500)
}
await sleep(1200)
// 首启引导浮层（fixed 全屏）会吞掉所有指针事件 → 假阴性
await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-audience')
  if (!el) return 'NO_OVERLAY'
  const b = [...el.querySelectorAll('button')].find(x => /开始使用|跳过|完成|知道了/.test(x.textContent || ''))
  if (b) { b.click(); return 'CLICKED' }
  el.remove(); return 'REMOVED'
})()`)
await cdp.send('Page.bringToFront')
await cdp.eval(`window.focus()`)
await sleep(600)
// 唤醒点击：合成鼠标的最早几次事件会被「窗口激活」吞掉
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400, button: 'none', clickCount: 0 })
await sleep(120)

async function goto(sidebarLabel) {
  for (let i = 0; i < 6; i++) {
    await cdp.eval(`(() => {
      const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => (e.textContent || '').includes(${JSON.stringify(sidebarLabel)}))
      if (hit) hit.click()
      return !!hit
    })()`)
    await sleep(700)
    const act = await cdp.eval(`[...document.querySelectorAll('.aurora-sidebar-item--active')].map(e => e.textContent || '').join('')`)
    if (String(act).includes(sidebarLabel)) return true
  }
  return false
}

async function openCanvasLeftOverlay() {
  const byEmptyBtn = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-canvas__empty-btn')].find(x => (x.textContent || '').includes('文件便签'))
    if (!b) return false
    b.click(); return true
  })()`)
  if (byEmptyBtn) { await sleep(900); return 'EMPTY_BTN' }
  const edge = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-canvas__edge--left')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
  if (!edge) return 'NO_EDGE'
  for (let i = 0; i < 3; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: edge.x, y: edge.y, button: 'none', clickCount: 0 })
    await sleep(500)
    if (await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)) break
  }
  await cdp.eval(`(() => { const p = document.querySelector('.aurora-canvas__pin'); if (p && !p.classList.contains('is-on')) p.click(); return !!p })()`)
  await sleep(500)
  return 'EDGE'
}

async function ensureKbOpen() {
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'ALREADY'
  if (await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) { c.click(); return true } return false })()`)) {
    await sleep(1400)
    if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'OPENED'
  }
  await cdp.eval(`(() => {
    const b = document.querySelector('.aurora-kb-manage__empty-btn') || document.querySelector('.aurora-kb-manage .aurora-kb-btn--primary')
    if (b) b.click(); return !!b
  })()`)
  await sleep(700)
  const filled = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-kb-modal input.aurora-kb-input')
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'CDP 方向验证库')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!filled) return 'NO_FORM'
  await sleep(400)
  // ⚠️ 必须限定在 .aurora-kb-modal 内：宽正则会先命中页面底层的「新建知识库」
  const submit = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-kb-modal .aurora-kb-btn--primary')].find(x => /创建知识库/.test(x.textContent || ''))
    if (!b) return 'NO_BTN'
    if (b.disabled) return 'DISABLED'
    b.click(); return 'CLICKED'
  })()`)
  if (submit !== 'CLICKED') return `SUBMIT_${submit}`
  for (let i = 0; i < 12; i++) {
    await sleep(400)
    if (!(await cdp.eval(`!!document.querySelector('.aurora-kb-modal')`))) break
  }
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'CREATED'
  await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) c.click(); return !!c })()`)
  await sleep(1400)
  return (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) ? 'CREATED_OPENED' : 'FAILED'
}

const PANELS = [
  { name: '设置页', sidebar: '设置', bar: '.aurora-settings__nav-tabs', thumb: '.aurora-settings__nav-thumb', tab: '.aurora-settings__nav-tab' },
  { name: '博客工作室', sidebar: '博客', bar: '.aurora-blog__subseg', thumb: '.aurora-blog__subseg-thumb', tab: '.aurora-blog__subseg-btn' },
  { name: '白板侧栏', sidebar: '白板', bar: '.aurora-csp__tabs', thumb: '.aurora-csp__tabs-thumb', tab: '.aurora-csp__tab' },
  { name: '知识库', sidebar: '知识库', bar: '.aurora-kb-subbar-tabs', thumb: '.aurora-kb-subbar-thumb', tab: '.aurora-kb-subbar-tab' },
]

const results = []

/** 在一条栏上按住当前激活 tab 向 dir（+1 右 / -1 左）拖一格，并给出判定 */
async function dragOne(p, dir, label) {
  const geo = await cdp.eval(`(() => {
    const bar = document.querySelector(${JSON.stringify(p.bar)})
    if (!bar) return null
    const tabs = [...bar.querySelectorAll(${JSON.stringify(p.tab)})]
    if (tabs.length < 2) return null
    const rects = tabs.map(e => { const r = e.getBoundingClientRect(); return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) } })
    return {
      rects,
      activeIdx: tabs.findIndex(${ACTIVE_PRED}),
      count: tabs.length,
      slot: Math.round((rects[rects.length - 1].cx - rects[0].cx) / (rects.length - 1)),
    }
  })()`)
  if (!geo || geo.activeIdx < 0) { console.log(`  ⊘ ${label}：量不到激活项`); return null }

  const expectIdx = geo.activeIdx + dir
  const from = geo.rects[geo.activeIdx]
  const dx = dir * Math.max(60, Math.round(geo.slot * 0.9))

  await cdp.eval(`window.__probeBar=${JSON.stringify(p.bar)}, window.__probeThumb=${JSON.stringify(p.thumb)}, window.__probeTab=${JSON.stringify(p.tab)}`)
  const before = await cdp.eval(SNAP_EXPR)
  const mid = await drag(cdp, { fromX: from.cx, fromY: from.cy, dx })
  await sleep(700)
  const after = await cdp.eval(SNAP_EXPR)

  const thumbMoved = mid && before ? Math.round((mid.thumbLeft - before.thumbLeft) * 10) / 10 : 0
  const signOk = Math.sign(thumbMoved) === dir
  const textMoved = before && mid ? before.tabX.some((x, i) => x !== mid.tabX[i]) : null
  const idxOk = after?.activeIdx === expectIdx
  const landedOk = after && after.activeIdx >= 0
    ? Math.abs(after.thumbLeft - after.tabX[after.activeIdx]) <= 1.5
    : false

  console.log(`  ${label}：拖 ${dx > 0 ? '+' : ''}${dx}px（起始 index ${geo.activeIdx} → 期望 ${expectIdx}）`)
  console.log(`    滑块跟手 : left ${before?.thumbLeft} → ${mid?.thumbLeft}（Δ ${thumbMoved}）${signOk ? '✅ 与鼠标同号' : '❌ 方向反了'}`)
  console.log(`    文字未动 : ${textMoved === false ? '✅ 所有 tab left 指纹未变' : '❌ 有 tab 被推走'}`)
  console.log(`    切换方向 : 实得 index ${after?.activeIdx} ${idxOk ? '✅ 正确' : `❌ 应到 ${expectIdx}`}`)
  console.log(`    滑块落位 : ${after?.thumbLeft} vs 激活 tab ${after?.tabX?.[after.activeIdx]} → Δ${after && after.activeIdx >= 0 ? Math.abs(after.thumbLeft - after.tabX[after.activeIdx]).toFixed(1) : '-'} ${landedOk ? '✅' : '❌'}`)

  return { name: `${p.name}·${label}`, dir, from: geo.activeIdx, expectIdx, gotIdx: after?.activeIdx, thumbMoved, signOk, textMoved, idxOk, landedOk }
}

for (const p of PANELS) {
  console.log(`\n================ ${p.name} ================`)
  const nav = await goto(p.sidebar)
  await sleep(700)
  if (p.name === '白板侧栏') { console.log(`  打开左栏: ${await openCanvasLeftOverlay()}`); await sleep(600) }
  if (p.name === '知识库') { console.log(`  进入详情: ${await ensureKbOpen()}`); await sleep(700) }

  const has = await cdp.eval(`!!document.querySelector(${JSON.stringify(p.bar)})`)
  if (!has) { console.log('  ⊘ 跳过：tab 栏未渲染'); results.push({ name: p.name, skipped: true }); continue }
  console.log(`  面板激活: ${nav ? '✅' : '⚠️'}`)

  await cdp.eval(`window.__probeBar=${JSON.stringify(p.bar)}, window.__probeThumb=${JSON.stringify(p.thumb)}, window.__probeTab=${JSON.stringify(p.tab)}`)
  const idx0 = await cdp.eval(SNAP_EXPR)
  if (!idx0 || idx0.activeIdx < 0) { console.log('  ⊘ 量不到激活项，跳过'); results.push({ name: p.name, skipped: true }); continue }

  // ① 首选向右（index + 1）；已在末位则改向左
  const dir1 = idx0.activeIdx >= idx0.tabX.length - 1 ? -1 : 1
  const r1 = await dragOne(p, dir1, dir1 > 0 ? '向右拖' : '向左拖')
  if (r1) results.push(r1)

  // ② 从新位置反向拖回 → 双向闭环
  const idx1 = await cdp.eval(SNAP_EXPR)
  if (idx1 && idx1.activeIdx >= 0) {
    const dir2 = -dir1
    if (idx1.activeIdx + dir2 >= 0 && idx1.activeIdx + dir2 < idx1.tabX.length) {
      const r2 = await dragOne(p, dir2, dir2 > 0 ? '向右拖' : '向左拖')
      if (r2) results.push(r2)
    } else {
      console.log(`  ⊘ 反向拖会越界（index ${idx1.activeIdx}），跳过`)
    }
  }
}

console.log('\n================ 汇总（方向） ================')
let pass = 0
for (const r of results) {
  if (r.skipped) { console.log(`  ${r.name.padEnd(16)} ⊘ 跳过`); continue }
  const ok = r.idxOk && r.landedOk && r.signOk && r.textMoved === false
  if (ok) pass++
  console.log(`  ${r.name.padEnd(16)} 起始${r.from} → 期望${r.expectIdx} 实得${String(r.gotIdx).padStart(2)} | 滑块Δ${String(r.thumbMoved).padStart(6)} 落位${r.landedOk ? '✅' : '❌'} 文字不动${r.textMoved === false ? '✅' : '❌'} → ${ok ? '✅ 通过' : '❌ 有问题'}`)
}
console.log(`\n  通过 ${pass} / ${results.filter((r) => !r.skipped).length}`)

ws.close()
console.log('\ndone')
