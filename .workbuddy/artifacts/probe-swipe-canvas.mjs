/**
 * CDP 探针：白板侧栏 tab 行滑动切 Tab（axis=x）
 * 关键：验证主绘图区（Excalidraw）不受影响。
 * 用法: node .workbuddy/artifacts/probe-swipe-canvas.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
}

async function swipe(cdp, { fromX, fromY, toX, toY, steps = 14, stepDelay = 16 }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: Math.round(fromX + (toX - fromX) * t), y: Math.round(fromY + (toY - fromY) * t), button: 'left', buttons: 1,
    })
    await sleep(stepDelay)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1, buttons: 0 })
}

const ok = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? '  — ' + e : ''}`); return c }

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  await cdp.eval(`location.hash = '#view=canvas'`)
  await sleep(2500)

  // 空态会锁住侧栏（locked = isCanvasEmpty && !guideSkipped）→ 先跳过引导解锁
  const emptySkip = await cdp.eval(`(() => {
    const b = document.querySelector('.aurora-canvas__empty-skip')
    if (b) { b.click(); return true }
    const p = document.querySelector('.aurora-canvas__empty-btn--primary')
    if (p) { p.click(); return true }
    return false
  })()`)
  if (emptySkip) { console.log('已解除空态锁定'); await sleep(1200) }

  // 侧栏浮层默认收起，靠「左边缘热区 hover」触发（见 CanvasPanel openLeftIntent）
  let hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)
  if (!hasTabs) {
    const zone = await cdp.eval(`(() => {
      const z = document.querySelector('.aurora-canvas__hoverzone--left')
      if (!z) return null
      const r = z.getBoundingClientRect()
      return { x: r.x + r.width/2, y: r.y + r.height/2 }
    })()`)
    if (zone) {
      // 真实鼠标移动进入热区
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(zone.x), y: Math.round(zone.y) })
      await sleep(200)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(zone.x) + 2, y: Math.round(zone.y) })
    }
    for (let i = 0; i < 40; i++) {
      hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)
      if (hasTabs) break
      await sleep(250)
    }
  }
  // 若打开了，点「钉住」避免鼠标移开就收起
  if (hasTabs) {
    await cdp.eval(`(() => { const p=document.querySelector('.aurora-canvas__pin'); if (p) p.click(); return !!p })()`)
    await sleep(300)
    hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)
  }
  if (!hasTabs) {
    console.error('侧栏 tab 行未出现。当前 URL:', await cdp.eval('location.href'))
    const dbg = await cdp.eval(`[...document.querySelectorAll('[class*=aurora-csp],[class*=aurora-canvas]')].slice(0,20).map(e=>e.className).join('\\n')`)
    console.error(dbg)
    process.exit(1)
  }
  console.log('侧栏 tab 行已就绪')

  const g = await cdp.eval(`(() => { const r = document.querySelector('.aurora-csp__tabs').getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height, cx:r.x+r.width/2, cy:r.y+r.height/2 } })()`)
  console.log('tab 行几何:', JSON.stringify(g))

  const activeTab = () => cdp.eval(`(() => { const b=document.querySelector('.aurora-csp__tab--active'); return b ? b.querySelector('span')?.textContent : null })()`)

  const res = []
  // 归位到大纲
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-csp__tab')].find(x=>x.querySelector('span')?.textContent==='大纲'); b&&b.click() })()`)
  await sleep(300)

  // 记录绘图区画布状态（验证不被平移）
  const canvasBefore = await cdp.eval(`(() => {
    const v = document.querySelector('.aurora-canvas__viewport')
    const c = document.querySelector('.excalidraw canvas, canvas')
    return { viewportTransform: v ? getComputedStyle(v).transform : null, canvasExists: !!c }
  })()`)

  const b1 = await activeTab()
  await swipe(cdp, { fromX: g.x + g.w * 0.75, fromY: g.cy, toX: g.x + g.w * 0.25, toY: g.cy })
  await sleep(450)
  const a1 = await activeTab()
  res.push(ok('#1 tab 行横滑 → 切换', b1 !== a1, `${b1} → ${a1}`))

  const b2 = await activeTab()
  await swipe(cdp, { fromX: g.x + g.w * 0.6, fromY: g.cy, toX: g.x + g.w * 0.45, toY: g.cy, steps: 30, stepDelay: 40 })
  await sleep(450)
  const a2 = await activeTab()
  res.push(ok('#2 小位移慢速 → 回弹', b2 === a2, `${b2} → ${a2}`))

  const b3 = await activeTab()
  await swipe(cdp, { fromX: g.x + g.w * 0.6, fromY: g.cy, toX: g.x + g.w * 0.4, toY: g.cy, steps: 3, stepDelay: 4 })
  await sleep(450)
  const a3 = await activeTab()
  res.push(ok('#3 小位移快速甩 → 切换', b3 !== a3, `${b3} → ${a3}`))

  // #4 纵向小拖 → 手势须被方向判定放弃（tab 不变）
  // ⚠️ 起点必须落在**某个 tab 的中心**，不能取 tab 行中心：
  //    6 等分时行中心恰在 #2/#3 交界，mouseup 触发的 click 会误切 tab → 假失败。
  const tabRect = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-csp__tab')].find(x=>x.querySelector('span')?.textContent==='标签')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })()`)
  const b4 = await activeTab()
  await swipe(cdp, { fromX: Math.round(tabRect.x), fromY: Math.round(tabRect.y - 10), toX: Math.round(tabRect.x), toY: Math.round(tabRect.y + 10), steps: 10 })
  await sleep(450)
  const a4 = await activeTab()
  // 同时断言内容区未被横向位移（transform 保持 none / 无位移），双重证明手势确实被放弃
  const t4 = await cdp.eval(`(() => { const b=document.querySelector('.aurora-csp__body'); return b ? b.style.transform || 'none' : 'missing' })()`)
  res.push(ok('#4 纵向小拖 → tab 不变（横向手势未抢占）', b4 === a4 && (t4 === 'none' || t4 === ''), `${b4} → ${a4}  body.transform=${t4}`))

  // 关键：主绘图区不受影响
  const canvasAfter = await cdp.eval(`(() => {
    const v = document.querySelector('.aurora-canvas__viewport')
    return { viewportTransform: v ? getComputedStyle(v).transform : null }
  })()`)
  res.push(ok('#5 主绘图区 transform 未变（Excalidraw 不受影响）',
    canvasBefore.viewportTransform === canvasAfter.viewportTransform,
    `before=${canvasBefore.viewportTransform} after=${canvasAfter.viewportTransform}`))

  // 点击 tab 仍可用
  const b6 = await activeTab()
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-csp__tab')].find(x=>x.querySelector('span')?.textContent==='标签'); b&&b.click() })()`)
  await sleep(250)
  res.push(ok('#6 点击 tab → 立即切换', (await activeTab()) === '标签', `${b6} → ${await activeTab()}`))

  console.log('\n──────── 汇总 ────────')
  const p = res.filter(Boolean).length
  console.log(`${p}/${res.length} 通过`)
  ws.close()
  process.exit(p === res.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
