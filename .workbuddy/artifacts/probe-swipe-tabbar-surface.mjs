/**
 * 验证：tab 栏已成为滑动手势区（需求 N 返工终验）
 * ------------------------------------------------------------------
 * 核验三件事（几何/computed 而非印象）：
 *   1) tab 栏 computed touch-action = pan-y、user-select = none（CSS 真的生效，
 *      且不是被 dev server 模块缓存喂回旧 CSS）；
 *   2) tab 栏内拖动 → 激活 tab 切换（用户实际抱怨的那条路径）；
 *   3) 跟手期间 data-swiping 出现且 computed cursor = grabbing（拖动光标语言）。
 *
 * 环境：dev server @5174；Edge CDP @9444（须与脚本同一次前台 bash 启动）
 */
import { WebSocket } from 'ws'

const CDP_PORT = 9444
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)) } }, 15000)
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
    return r.result?.value
  }
}

/** 真实鼠标单击（用于唤醒窗口 / 导航） */
async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

/** 真实鼠标拖动（CDP 坐标 = CSS px） */
async function drag(cdp, { fromX, fromY, toX, toY, midProbe }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(fromX + (toX - fromX) * t),
      y: Math.round(fromY + (toY - fromY) * t),
      button: 'left', buttons: 1,
    })
    await sleep(12)
  }
  // 跟手态采样（此时应仍按住）
  const mid = midProbe ? await midProbe() : null
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', buttons: 0, clickCount: 1 })
  return mid
}

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
if (!page) { console.error('未找到 5174 页面'); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
const cdp = new Cdp(ws)
ws.on('message', (raw) => cdp.onMessage(raw))
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')

/** 等页面上下文稳定（CDP 端点就绪 ≠ 页面已加载，早期 evaluate 会挂起） */
async function waitReady(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const ok = await cdp.eval(`document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0`)
      if (ok) return i
    } catch { /* 上下文尚未就绪，重试 */ }
    await sleep(500)
  }
  return -1
}
const readyAt = await waitReady()
console.log(`页面就绪 @${readyAt < 0 ? '超时' : readyAt * 0.5 + 's'}`)
if (readyAt < 0) { console.log('❌ 页面未就绪，终止'); process.exit(1) }
await sleep(1500)

// 1) 若首启引导浮层在（position:fixed;inset:0，backdrop 吞掉所有指针事件），先移除。
//    刻意**不刷新页面**：reload 会让窗口失焦，随后的合成按键打不进 app。
const ob = await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-audience')
  if (!el) return 'NO_OVERLAY'
  const btn = [...el.querySelectorAll('button')].find(b => /开始使用|跳过|完成|知道了/.test(b.textContent || ''))
  if (btn) { btn.click(); return 'CLICKED:' + (btn.textContent || '').trim() }
  el.remove()
  return 'REMOVED'
})()`)
console.log('引导浮层处理:', ob)
await sleep(800)

// 2) 进设置页。优先**真实鼠标**点侧栏「设置」——顺便唤醒窗口；找不到侧栏项再退 Ctrl+,。
//    两种路径都轮询重试：首次合成输入常被「窗口激活」吞掉。
async function sidebarRect() {
  return cdp.eval(`(() => {
    const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => /设置/.test(e.textContent || ''))
    if (!hit) return null
    const r = hit.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
}
async function openSettings() {
  for (let i = 0; i < 10; i++) {
    if (await cdp.eval(`!!document.querySelector('.aurora-settings__nav-tabs')`)) return `✅ 第 ${i} 轮已打开`
    const r = await sidebarRect()
    if (r) {
      await realClick(cdp, r.x, r.y)
    } else {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, windowsVirtualKeyCode: 188, code: 'Comma', key: ',' })
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, windowsVirtualKeyCode: 188, code: 'Comma', key: ',' })
    }
    await sleep(600)
  }
  return '❌ 10 轮均未打开'
}
console.log('设置页打开:', await openSettings())
await sleep(1200)

const ready = await cdp.eval(`!!document.querySelector('.aurora-settings__nav-tabs')`)
if (!ready) {
  // 合成点击兜底（不依赖窗口焦点）
  const viaSidebar = await cdp.eval(`(() => {
    const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => /设置/.test(e.textContent || ''))
    if (!hit) return 'NO_ITEM'
    hit.click()
    return 'CLICKED'
  })()`)
  console.log('  侧栏合成点击兜底:', viaSidebar)
  await sleep(1800)
}
if (!(await cdp.eval(`!!document.querySelector('.aurora-settings__nav-tabs')`))) {
  console.log('❌ 未进入设置页，终止'); ws.close(); process.exit(1)
}

// 3) computed 样式核验
const styles = await cdp.eval(`(() => {
  const bar = document.querySelector('.aurora-settings__nav-tabs')
  const cs = getComputedStyle(bar)
  const content = document.querySelector('.aurora-settings__content')
  const ccs = content ? getComputedStyle(content) : null
  const r = bar.getBoundingClientRect()
  return {
    barTouchAction: cs.touchAction,
    barUserSelect: cs.userSelect,
    barCursor: cs.cursor,
    contentTouchAction: ccs ? ccs.touchAction : null,
    contentW: content ? Math.round(content.getBoundingClientRect().width) : 0,
    geo: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cy: Math.round(r.y + r.height / 2) },
  }
})()`)
console.log('\n=== 设置页 tab 栏 computed（CSS 是否真的落到 DOM，而非被模块缓存喂回旧值）===')
console.log(`  touch-action       : ${styles.barTouchAction.padEnd(6)} ${styles.barTouchAction === 'pan-y' ? '✅' : '❌'}`)
console.log(`  user-select        : ${styles.barUserSelect.padEnd(6)} ${styles.barUserSelect === 'none' ? '✅' : '❌'}`)
console.log(`  静止态 cursor      : ${styles.barCursor.padEnd(6)} ${styles.barCursor === 'auto' ? '✅ 未设 grab（与点击语义不打架）' : '⚠️ 非 auto'}`)
console.log(`  内容区 touch-action: ${styles.contentTouchAction.padEnd(6)} ${styles.contentTouchAction === 'pan-y' ? '✅ 未回退' : '❌'}`)
const g = styles.geo
const need = Math.round(styles.contentW * 0.32)
console.log(`  几何: x=${g.x} w=${g.w} cy=${g.cy} | 吸附基准(内容区宽)=${styles.contentW} → 需拖动 > ${need}px`)

// 4) tab 栏内拖动。窗口无焦时最早几次合成鼠标事件会被「窗口激活」吞掉，
//    故每轮先真实点击首个 tab 复位（充当唤醒点击），再横拖，最多重试 4 轮。
const firstTabRect = `(() => {
  const el = document.querySelector('.aurora-settings__nav-tab')
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})()`

let before = null
let after = null
let mid = null
let attempt = 0
let changed = false
for (let i = 1; i <= 4 && !changed; i++) {
  attempt = i
  // 复位到首个 tab（同时是唤醒点击）
  const f = await cdp.eval(firstTabRect)
  await realClick(cdp, f.x, f.y)
  await sleep(450)

  before = await cdp.eval(`(document.querySelector('.aurora-settings__nav-tab--active')||{}).textContent || null`)
  mid = await drag(cdp, {
    fromX: Math.round(g.x + g.w * 0.95),
    fromY: g.cy,
    toX: Math.round(g.x + g.w * 0.05),
    toY: g.cy,
    midProbe: async () => cdp.eval(`(() => {
      const bar = document.querySelector('.aurora-settings__nav-tabs')
      return { swiping: bar.hasAttribute('data-swiping'), cursor: getComputedStyle(bar).cursor }
    })()`),
  })
  await sleep(750)
  after = await cdp.eval(`(document.querySelector('.aurora-settings__nav-tab--active')||{}).textContent || null`)
  changed = before !== after
  if (!changed) await sleep(300)
}

console.log('\n=== 设置页 tab 栏内拖动（用户实际抱怨的那条路径）===')
console.log(`  尝试轮次            : 第 ${attempt} 轮${changed ? '（生效）' : '（4 轮均未生效）'}`)
console.log(`  跟手态 data-swiping : ${mid ? mid.swiping : 'n/a'}  ${mid && mid.swiping ? '✅' : '❌'}`)
console.log(`  跟手态 cursor       : ${mid ? mid.cursor : 'n/a'}  ${mid && mid.cursor === 'grabbing' ? '✅' : '❌'}`)
console.log(`  ${before} → ${after}  ${changed ? '✅ 切换生效（tab 栏内起手可滑动）' : '❌ 无反应'}`)

ws.close()
console.log('\ndone')
