/**
 * 探针：四个面板「按住 tab 方框 → 整排跟手位移 → 松手切换」全量实测
 * ------------------------------------------------------------------
 * 需求 N 第三轮验证。对每条 tab 栏量三件事：
 *   1) 跟手态**轨道位移**（用户按住的那个方块自己动了多少 px）—— 这是第三轮的核心指标，
 *      第二轮同一动作为 0.7px（人眼=没动）；
 *   2) 松手后激活 tab 是否真的换了；
 *   3) 栏体是否真的裁剪（轨道位移不被吞、不溢出）。
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

async function drag(cdp, { fromX, fromY, dx, durationMs = 450, steps = 14, midProbe }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(60)
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(fromX + dx * (i / steps)),
      y: fromY,
      button: 'left', buttons: 1,
    })
    await sleep(Math.max(4, durationMs / steps))
  }
  const mid = midProbe ? await midProbe() : null
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fromX + dx, y: fromY, button: 'left', buttons: 0, clickCount: 1 })
  return mid
}

const PANELS = [
  { name: '设置页', sidebar: '设置', bar: '.aurora-settings__nav-tabs', track: '.aurora-settings__nav-track', btn: '.aurora-settings__nav-tab' },
  { name: '博客工作室', sidebar: '博客', bar: '.aurora-blog__subseg', track: '.aurora-blog__subseg-track', btn: '.aurora-blog__subseg-btn' },
  { name: '白板侧栏', sidebar: '白板', bar: '.aurora-csp__tabs', track: '.aurora-csp__tabs-track', btn: '.aurora-csp__tab' },
  { name: '知识库', sidebar: '知识库', bar: '.aurora-kb-subbar-tabs', track: '.aurora-kb-subbar-track', btn: '.aurora-kb-subbar-tab' },
]

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

/** 切到目标面板（JS 合成点击最可靠：真实鼠标首击会被「窗口激活」吞掉） */
async function goto(sidebarLabel) {
  for (let i = 0; i < 6; i++) {
    await cdp.eval(`(() => {
      const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => (e.textContent || '').includes(${JSON.stringify(sidebarLabel)}))
      if (hit) hit.click()
      return !!hit
    })()`)
    await sleep(700)
    const ok = await cdp.eval(`(() => {
      const el = [...document.querySelectorAll('.aurora-sidebar-item--active')].map(e => e.textContent || '').join('')
      return el
    })()`)
    if (String(ok).includes(sidebarLabel)) return true
  }
  return false
}

const results = []
for (const p of PANELS) {
  console.log(`\n================ ${p.name} ================`)
  const nav = await goto(p.sidebar)
  await sleep(900)
  const geo = await cdp.eval(`(() => {
    const bar = document.querySelector(${JSON.stringify(p.bar)})
    const track = document.querySelector(${JSON.stringify(p.track)})
    if (!bar || !track) return { missing: true, bar: !!bar, track: !!track, active: null }
    const bs = getComputedStyle(bar)
    const tabs = [...document.querySelectorAll(${JSON.stringify(p.btn)})].map(e => {
      const r = e.getBoundingClientRect()
      return { label: (e.textContent || '').trim().slice(0, 6), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), sel: e.getAttribute('aria-selected') === 'true' }
    })
    const activeIdx = tabs.findIndex(t => t.sel)
    return {
      missing: false,
      barW: Math.round(bar.getBoundingClientRect().width),
      trackW: Math.round(track.getBoundingClientRect().width),
      overflowX: bs.overflowX,
      mask: (bs.maskImage || bs.webkitMaskImage || 'none').slice(0, 30),
      count: tabs.length,
      activeIdx,
      tabs,
      // 槽距（相邻中心距均值）
      slot: tabs.length > 1 ? Math.round((tabs[tabs.length - 1].cx - tabs[0].cx) / (tabs.length - 1)) : 0,
    }
  })()`)

  if (geo.missing) {
    console.log(`  ❌ 未渲染 tab 栏 (bar=${geo.bar} track=${geo.track}) —— 该视图可能无数据，跳过`)
    results.push({ name: p.name, skipped: true, reason: !geo.bar ? 'tab 栏未渲染' : '轨道元素缺失' })
    continue
  }

  console.log(`  面板激活: ${nav ? '✅' : '⚠️ 侧栏未确认'} | tab 数 ${geo.count} | 栏宽 ${geo.barW} | 槽距 ${geo.slot}px → 松手阈值 ${(geo.slot / 2).toFixed(1)}px`)
  console.log(`  栏体 overflow-x=${geo.overflowX} | 渐隐遮罩=${geo.mask === 'none' ? '静止态 none ✅' : geo.mask}`)

  if (geo.count < 2) {
    console.log('  ⚠️ 组内仅 1 个 tab，无法验证切换（跳过）')
    results.push({ name: p.name, skipped: true, reason: '组内仅 1 tab' })
    continue
  }

  // 起手点 = 激活 tab 方块的中心（用户原话「鼠标按住 tab 方框」）
  const target = geo.tabs[geo.activeIdx >= 0 ? geo.activeIdx : 0]
  // 方向：优先「下一个」（左拖）；已在末位则右拖「上一个」
  const dir = geo.activeIdx >= geo.count - 1 ? 1 : -1
  const dx = dir * Math.max(60, Math.round(geo.slot * 0.8))

  const before = (geo.tabs.find(t => t.sel) || {}).label
  const SNAP = `(() => {
    const track = document.querySelector(${JSON.stringify(p.track)})
    const bar = document.querySelector(${JSON.stringify(p.bar)})
    const t = getComputedStyle(track).transform
    const act = document.querySelector(${JSON.stringify(p.btn)} + '[aria-selected="true"]')
    return {
      trackShift: t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41,
      swiping: bar ? bar.hasAttribute('data-swiping') : null,
      cursor: bar ? getComputedStyle(bar).cursor : null,
      mask: (() => { const m = getComputedStyle(bar).maskImage || getComputedStyle(bar).webkitMaskImage; return m === 'none' ? 'none' : 'on' })(),
      active: act ? (act.textContent || '').trim().slice(0, 6) : null,
    }
  })()`

  let mid = null
  for (let i = 1; i <= 3; i++) {
    mid = await drag(cdp, { fromX: target.cx, fromY: target.cy, dx, midProbe: () => cdp.eval(SNAP) })
    if (mid && mid.swiping) break
    await sleep(400)
  }
  await sleep(700)
  const after = (await cdp.eval(SNAP)).active

  const okMove = Math.abs(mid?.trackShift ?? 0) > 30
  const okSwitch = before !== after
  console.log(`  起手「${target.label}」拖 ${dx}px →`)
  console.log(`    手势识别     : ${mid?.swiping ? '✅' : '❌'} | cursor=${mid?.cursor} | 跟手态遮罩=${mid?.mask}`)
  console.log(`    **轨道位移** : ${(mid?.trackShift ?? 0).toFixed(1)}px  ${okMove ? '✅ 看得见' : '❌ 几乎没动'}`)
  console.log(`    松手切换     : ${before} → ${after}  ${okSwitch ? '✅' : '❌'}`)
  results.push({ name: p.name, slot: geo.slot, shift: mid?.trackShift, before, after, okMove, okSwitch, swiping: mid?.swiping })
}

console.log('\n================ 汇总 ================')
for (const r of results) {
  if (r.skipped) console.log(`  ${r.name.padEnd(6)} ⊘ 跳过（${r.reason}）`)
  else console.log(`  ${r.name.padEnd(6)} 轨道位移 ${String(Math.round(r.shift)).padStart(5)}px  ${r.okMove ? '✅' : '❌'} | 切换 ${r.before}→${r.after} ${r.okSwitch ? '✅' : '❌'}`)
}

ws.close()
console.log('\ndone')
