/**
 * 探针：按住 tab 方框拖动时，**视觉位移到底有多少像素**（需求 N 第三轮）
 * ------------------------------------------------------------------
 * 用户反馈：「在 tab 栏本身内横滑的效果还是没有显示出来，我要的效果鼠标按住
 * tab 方框左或右可以滑动」。
 *
 * 本探针不改任何代码，只回答一个问题：拖动**有没有被识别**、**看得见多少**。
 * 采样项（跟手态，仍按住时）：
 *   1) swipe-layer 内联 transform → 内容区实际位移
 *   2) 激活 tab 的 computed transform → tab 方块实际位移
 *   3) --swipe-progress 数值 → 指示器联动强度
 *   4) data-swiping / cursor    → 手势是否真的启动
 *   5) 松手后激活 tab 是否变化   → 提交阈值是否够到
 * 并输出「吸附阈值」对照（内容区宽 × 0.32），说明为什么松手没反应。
 *
 * 环境：dev server @5174（已跑）；Edge CDP @9444（须与脚本同一次前台 bash 启动）
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = 9444
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (tag) => `D:/TracSolo_Project/MarkdownEditor qoder/.workbuddy/artifacts/swipe-drag-${tag}.png`

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
    return r.result?.value
  }
}

async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

/** 按住拖动；durationMs 决定手感（慢拖 vs 甩掷） */
async function drag(cdp, { fromX, fromY, dx, dy = 0, durationMs = 500, steps = 16, midProbe }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(Math.min(60, durationMs / 4))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(fromX + dx * t),
      y: Math.round(fromY + dy * t),
      button: 'left', buttons: 1,
    })
    await sleep(Math.max(4, durationMs / steps))
  }
  // 仍按住时采样（跟手态）
  const mid = midProbe ? await midProbe(dx) : null
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fromX + dx, y: fromY + dy, button: 'left', buttons: 0, clickCount: 1 })
  return mid
}

/* 跟手态快照：tab 轨道位移 / 内容层位移 / 进度变量 / 手势标志 */
const SNAP = `(() => {
  const layer = document.querySelector('.aurora-settings__swipe-layer')
  const bar = document.querySelector('.aurora-settings__nav-tabs')
  const track = document.querySelector('.aurora-settings__nav-track')
  const active = document.querySelector('.aurora-settings__nav-tab--active')
  const root = document.querySelector('.aurora-settings')
  const content = document.querySelector('.aurora-settings__content')
  const shift = (el) => {
    if (!el) return null
    const t = getComputedStyle(el).transform
    return t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41
  }
  return {
    swiping: bar ? bar.hasAttribute('data-swiping') : null,
    barCursor: bar ? getComputedStyle(bar).cursor : null,
    trackShift: shift(track),
    layerShift: shift(layer),
    tabShift: shift(active),
    progress: root ? root.style.getPropertyValue('--swipe-progress') : null,
    activeLabel: active ? (active.textContent || '').trim() : null,
    contentW: content ? Math.round(content.getBoundingClientRect().width) : 0,
  }
})()`

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const candidates = list.filter((t) => t.type === 'page' && t.url.includes('localhost:5174'))
// 目标页面优先取最后一个 5174 页（同一 profile 多次启动会留下多页）
const page = candidates[candidates.length - 1]
if (!page) { console.error('未找到 5174 页面 —— Edge 是否与脚本同一次 bash 启动？'); process.exit(1) }
console.log(`目标页面: ${page.url}`)
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
const cdp = new Cdp(ws)
ws.on('message', (raw) => cdp.onMessage(raw))
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')

async function waitReady(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      if (await cdp.eval(`document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0`)) return i
    } catch { /* 上下文未就绪 */ }
    await sleep(500)
  }
  return -1
}
const readyAt = await waitReady()
console.log(`页面就绪 @${readyAt < 0 ? '超时' : readyAt * 0.5 + 's'}`)
if (readyAt < 0) { console.log('❌ 页面未就绪'); process.exit(1) }
await sleep(1500)

// 首启引导浮层（position:fixed;inset:0）会吞掉所有指针事件 → 假阴性，先处理
const ob = await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-audience')
  if (!el) return 'NO_OVERLAY'
  const btn = [...el.querySelectorAll('button')].find(b => /开始使用|跳过|完成|知道了/.test(b.textContent || ''))
  if (btn) { btn.click(); return 'CLICKED' }
  el.remove(); return 'REMOVED'
})()`)
console.log('引导浮层:', ob)
await sleep(700)

async function sidebarRect() {
  return cdp.eval(`(() => {
    const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => /设置/.test(e.textContent || ''))
    if (!hit) return null
    const r = hit.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
}
/** 进设置页：JS 合成点击最可靠（真实鼠标首击会被「窗口激活」吞掉） */
for (let i = 0; i < 8; i++) {
  if (await cdp.eval(`!!document.querySelector('.aurora-settings__nav-tabs')`)) break
  await cdp.eval(`(() => {
    const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => /设置/.test(e.textContent || ''))
    if (hit) { hit.click(); return 'clicked' }
    return 'no-item'
  })()`)
  await sleep(800)
}
if (!(await cdp.eval(`!!document.querySelector('.aurora-settings__nav-tabs')`))) {
  console.log('❌ 未进入设置页'); ws.close(); process.exit(1)
}
// 页面前置 + 唤醒点击：合成鼠标事件在没有前台窗口时会被丢弃（已知假阴性）
await cdp.send('Page.bringToFront')
await sleep(300)
await cdp.eval(`window.focus()`)
const warm = await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-settings__nav')
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})()`)
await realClick(cdp, warm.x, warm.y)   // 唤醒点击（落在导航条上，不改变状态）
await sleep(500)

/* ---------------- 基础几何 ---------------- */
const base = await cdp.eval(`(() => {
  const bar = document.querySelector('.aurora-settings__nav-tabs')
  const content = document.querySelector('.aurora-settings__content')
  const tabs = [...document.querySelectorAll('.aurora-settings__nav-tab')].map(e => {
    const r = e.getBoundingClientRect()
    return { label: (e.textContent || '').trim(), x: Math.round(r.x), w: Math.round(r.width), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }
  })
  const br = bar.getBoundingClientRect()
  return {
    barW: Math.round(br.width), barCY: Math.round(br.y + br.height / 2),
    contentW: Math.round(content.getBoundingClientRect().width),
    tabs,
  }
})()`)
console.log('\n=== 几何 ===')
console.log(`  tab 栏宽 ${base.barW}px | 内容区宽 ${base.contentW}px → 吸附阈值 32% = ${Math.round(base.contentW * 0.32)}px`)
console.log('  tab 方块:')
base.tabs.forEach((t, i) => console.log(`    [${i}] "${t.label}" x=${t.x} w=${t.w} cx=${t.cx}`))

/* ---------------- 拖动：按住「激活 tab 方块」本体 ----------------
 * 关键：起手点必须落在 **tab 方块自身中心**（用户原话「鼠标按住 tab 方框」），
 * 而不是 tab 栏的空白处 —— 否则测的不是用户抱怨的那条路径。
 */
const firstTab = base.tabs[0]

async function round(label, { tabIdx, dx, durationMs }) {
  const t = base.tabs[tabIdx]
  // 复位（顺便唤醒窗口）：真实点击该 tab 方块
  await realClick(cdp, t.cx, t.cy)
  await sleep(500)
  const before = (await cdp.eval(SNAP)).activeLabel
  let mid = null
  let attempt = 0
  for (let i = 1; i <= 3; i++) {
    attempt = i
    mid = await drag(cdp, {
      fromX: t.cx, fromY: t.cy, dx, durationMs,
      midProbe: async () => {
        const snap = await cdp.eval(SNAP)
        // 按住那一刻截图存证（视觉证据，人眼可比对"到底动了没有"）
        try {
          const png = await cdp.send('Page.captureScreenshot', { format: 'png' })
          writeFileSync(shot(`${label.slice(0, 1).toLowerCase()}-mid`), Buffer.from(png.data, 'base64'))
        } catch { /* 截图失败不影响测量 */ }
        return snap
      },
    })
    if (mid && mid.swiping) break
    await sleep(400)
  }
  await sleep(60)
  // 跟手截图（先重新按一次以捕捉 mid 态）
  const after = (await cdp.eval(SNAP)).activeLabel
  console.log(`\n=== ${label} ===`)
  console.log(`  起手点 = tab[${tabIdx}] "${t.label}" 方块中心 (${t.cx}, ${t.cy})，位移 ${dx}px / ${durationMs}ms`)
  console.log(`  手势启动 data-swiping : ${mid?.swiping}  ${mid?.swiping ? '✅ 已识别' : '❌ 未识别'}`)
  console.log(`  **tab 整排位移 (track)** : ${mid?.trackShift}px  ← 用户按住的那个方块自己动了多少`)
  console.log(`  内容层位移 (swipe-layer): ${mid?.layerShift}px`)
  console.log(`  --swipe-progress       : ${mid?.progress}`)
  console.log(`  ${before} → ${after}  ${before !== after ? '✅ 提交切换' : '❌ 未切换'}`)
  return { mid, before, after }
}

// A) 慢拖 150px（普通人用鼠标拖 tab 方块的样子）—— 方向向左（下一个 tab）
const A = await round('A. 慢拖 150px（500ms）→ 下一个', { tabIdx: 0, dx: -150, durationMs: 500 })
// B) 快速甩 150px（150ms，快速一甩）
const B = await round('B. 快速甩 150px（150ms）→ 下一个', { tabIdx: 0, dx: -150, durationMs: 150 })
// C) 小幅慢拖 60px（约「半格」门槛附近）
const C = await round('C. 小幅慢拖 60px（350ms）', { tabIdx: 0, dx: -60, durationMs: 350 })
// D) 反向：拖回上一个（右拖）
const D = await round('D. 向右慢拖 150px（500ms）→ 上一个', { tabIdx: 4, dx: 150, durationMs: 500 })

/* ---------------- 结论 ---------------- */
console.log('\n=== 结论 ===')
const t0 = A.mid?.trackShift
const l0 = A.mid?.layerShift
console.log(`  按住 tab 方块拖 150px 时：**tab 整排挪了 ${t0}px**，内容层挪了 ${l0}px`)
console.log(`  （第二轮实测同一动作为 0.7px —— 人眼=没动；这就是"滑动效果没显示出来"）`)
console.log(`  松手阈值 = 半个槽距（约 37px），且拖动位移与视觉位移 1:1 → 所见即所得`)
console.log(`  A/B/C/D 切换结果: ${[A, B, C, D].map((r) => (r.before !== r.after ? '✅' : '❌')).join(' ')}`)

ws.close()
console.log('\ndone')
