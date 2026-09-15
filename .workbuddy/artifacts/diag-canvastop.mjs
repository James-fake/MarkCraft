/**
 * 诊断：白板顶部 view 切换条为什么接不到 pointerdown
 *
 * 现象（probe-swipe-continuous）：其余 5 条栏全部通过，唯独 `.aurora-ctop__switcher`
 * 跟手位移为 0、松手也不切换 —— 但静止态滑块落位正确（Δ0.0），说明 DOM/几何都对，
 * 是**手势没起手**。这里逐条排查吞指针的常见元凶：
 *   ① elementFromPoint 命中的是不是 view 按钮（有没有更高层的遮挡）
 *   ② 祖先链上有没有 pointer-events: none / 横滚容器（hook 遇横滚祖先会让出）
 *   ③ 合成 pointerdown 后 data-swiping 是否出现（区分「事件没到」与「逻辑早退」）
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9445)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function listPages() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  return (await res.json()).filter((t) => t.type === 'page' && t.webSocketDebuggerUrl)
}

async function connect() {
  const pages = await listPages()
  const page = pages.find((p) => p.url.includes('localhost:5174')) ?? pages[0]
  if (!page) throw new Error('没有可用的页面 target')
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej) })
  let id = 0
  const pending = new Map()
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval 异常')
    return r.result?.value
  }
  return { send, evaluate, close: () => ws.close() }
}

const cdp = await connect()

// 来到白板视图
await cdp.evaluate(`(() => {
  const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => (e.textContent || '').includes('白板'))
  if (hit) hit.click()
  return !!hit
})()`)
await sleep(1500)

const info = await cdp.evaluate(`(() => {
  const sw = document.querySelector('.aurora-ctop__switcher')
  if (!sw) return { error: 'switcher 不存在' }
  const r = sw.getBoundingClientRect()
  const cx = Math.round(r.x + r.width / 2)
  const cy = Math.round(r.y + r.height / 2)
  const hit = document.elementFromPoint(cx, cy)

  // 祖先链：谁在拦指针 / 谁是滚动容器
  const chain = []
  for (let el = sw; el && el !== document.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el)
    chain.push({
      cls: String(el.className).slice(0, 46),
      z: cs.zIndex,
      pe: cs.pointerEvents,
      pos: cs.position,
      ovx: cs.overflowX,
      ofx: el.scrollWidth > el.clientWidth ? 'SCROLLABLE' : '',
    })
  }

  // 按钮自身
  const btn = sw.querySelector('.aurora-ctop__view')
  const br = btn.getBoundingClientRect()
  const btnCs = getComputedStyle(btn)
  const btnHit = document.elementFromPoint(Math.round(br.x + br.width / 2), Math.round(br.y + br.height / 2))

  return {
    swRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cx, cy },
    viewport: { w: innerWidth, h: innerHeight },
    centerHit: hit ? { cls: String(hit.className).slice(0, 60), tag: hit.tagName } : null,
    btnRect: { x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height) },
    btnHit: btnHit ? { cls: String(btnHit.className).slice(0, 60), tag: btnHit.tagName } : null,
    btnPointerEvents: btnCs.pointerEvents,
    btnDisabled: btn.disabled,
    tabCount: sw.querySelectorAll('[role="tab"]').length,
    chain,
  }
})()`)

console.log('=== 白板顶部 switcher 诊断 ===')
console.log(JSON.stringify(info, null, 2))

// 直接合成 pointerdown，看 data-swiping 是否出现（区分「事件没到」vs「逻辑早退」）
if (!info.error) {
  // 先从 active tab 的中心按下（与探针路径一致，而不是落在两个 tab 之间的缝上）
  const start = await cdp.evaluate(`(() => {
    const tabs = [...document.querySelectorAll('.aurora-ctop__switcher [role="tab"]')]
    const t = tabs.find(e => e.getAttribute('aria-selected') === 'true') || tabs[0]
    const r = t.getBoundingClientRect()
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), label: (t.textContent || '').trim() }
  })()`)
  console.log('\n=== 起点（active tab 中心）===')
  console.log(JSON.stringify(start))

  // 埋事件流探针：native capture / bubble 各记一笔，并读 React 是否真挂了 onPointerDown
  const wired = await cdp.evaluate(`(() => {
    const sw = document.querySelector('.aurora-ctop__switcher')
    window.__evtLog = []
    const key = Object.keys(sw).find(k => k.startsWith('__reactProps$'))
    const props = key ? sw[key] : null
    const log = (tag) => () => window.__evtLog.push(tag)
    document.addEventListener('pointerdown', log('doc-capture'), true)
    document.addEventListener('pointerdown', log('doc-bubble'))
    sw.addEventListener('pointerdown', log('sw-native'), true)
    return {
      hasReactPropsKey: !!key,
      reactOnPointerDown: typeof props?.onPointerDown,
      reactOnClickCapture: typeof props?.onClickCapture,
      reactKeys: props ? Object.keys(props).filter(k => k.startsWith('on')).join(',') : null,
    }
  })()`)
  console.log('\n=== React 绑定 ===')
  console.log(JSON.stringify(wired, null, 2))

  const { cx, cy } = start
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'none', clickCount: 0 })
  await sleep(80)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(120)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + 100, y: cy, button: 'left', buttons: 1 })
  await sleep(180)
  const during = await cdp.evaluate(`(() => {
    const sw = document.querySelector('.aurora-ctop__switcher')
    const th = document.querySelector('.aurora-ctop__switcher-thumb')
    return {
      evtLog: window.__evtLog,
      swiping: sw?.hasAttribute('data-swiping') ?? null,
      thumbTransition: th?.style.transition ?? null,
      thumbTransform: th?.style.transform ?? null,
      thumbLeft: th ? Math.round(th.getBoundingClientRect().x * 10) / 10 : null,
    }
  })()`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 100, y: cy, button: 'left', buttons: 0, clickCount: 1 })
  console.log('\n=== 合成 pointerdown + 右移 100px 后 ===')
  console.log(JSON.stringify(during, null, 2))
}

cdp.close()
console.log('\ndone')
