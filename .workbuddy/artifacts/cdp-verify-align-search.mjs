/* CDP 真页面验证：筛选行宽对齐 + 搜索框滚动显现
 * 断言：初始搜索框隐藏；两个滚轮触发器右缘与卡片网格右缘对齐（≤2px）；
 *       列表下滑（scrollTop 增大）后搜索框出现；回到顶部再隐藏。 */
import { writeFileSync } from 'fs'

const DEBUG_PORT = 9333
const PAGE_URL = 'http://localhost:5174/#view=blog'
const SHOT_DIR = 'D:/TracSolo_Project/MarkdownEditor qoder/.workbuddy/artifacts'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTargetWs() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(500)
  }
  throw new Error('CDP endpoint not reachable')
}

let msgId = 0
const pending = new Map()
function send(ws, method, params = {}) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

const ws = new WebSocket(await getTargetWs())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}

async function evalJs(expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

async function shot(name) {
  const r = await send(ws, 'Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${SHOT_DIR}/${name}.png`, Buffer.from(r.data, 'base64'))
}

await send(ws, 'Page.enable')
await send(ws, 'Page.navigate', { url: PAGE_URL })

let tabReady = false
for (let i = 0; i < 40; i++) {
  await sleep(500)
  tabReady = await evalJs(`!!document.querySelector('.aurora-blog__tab.is-active')`)
  if (tabReady) break
}
if (!tabReady) throw new Error('blog tab never appeared')
await sleep(800)

// 展开功能面板浮层
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`)
await sleep(1000)

// 断言 1：进入面板默认显示搜索框
const initial = await evalJs(`({
  searchShown: !!document.querySelector('.aurora-blog-search'),
  scrollTop: document.querySelector('.aurora-blog-panel__scroll')?.scrollTop ?? -1,
})`)
console.log('INITIAL:', JSON.stringify(initial))
await shot('wheel-align-1-initial')

// 断言 2：两个触发器右缘与网格右缘对齐
const align = await evalJs(`(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect()
  const trig = r('.aurora-blog-tabs .aurora-select--custom')
  const trig2 = r('.aurora-blog-tags .aurora-select--custom')
  const grid = r('.aurora-blog-theme-grid')
  if (!trig || !trig2 || !grid) return { err: 'missing element' }
  return {
    catDiff: Math.abs(trig.right - grid.right),
    tagDiff: Math.abs(trig2.right - grid.right),
    catW: Math.round(trig.width), tagW: Math.round(trig2.width), gridW: Math.round(grid.width),
  }
})()`)
console.log('ALIGN:', JSON.stringify(align))

// 断言 3：列表向下滑动（scrollTop 增大）→ 搜索框收起
const scrolled = await evalJs(`(() => {
  const el = document.querySelector('.aurora-blog-panel__scroll')
  el.scrollTop = 140
  el.dispatchEvent(new Event('scroll'))
  return { scrollTop: el.scrollTop, scrollH: el.scrollHeight, clientH: el.clientHeight }
})()`)
await sleep(500)
const hidden = await evalJs(`({ searchGone: !document.querySelector('.aurora-blog-search') })`)
console.log('SCROLL-DOWN:', JSON.stringify({ ...scrolled, ...hidden }))

// 断言 4：列表向上滑动（回滚，scrollTop 减小）→ 搜索框现身且吸顶
await evalJs(`(() => {
  const el = document.querySelector('.aurora-blog-panel__scroll')
  el.scrollTop = 100
  el.dispatchEvent(new Event('scroll'))
})()`)
await sleep(500)
const shown = await evalJs(`(() => {
  const s = document.querySelector('.aurora-blog-search')
  const r = s?.getBoundingClientRect()
  const vp = document.querySelector('.aurora-blog-panel__scroll').getBoundingClientRect()
  return {
    searchShown: !!s,
    placeholder: s?.querySelector('input')?.placeholder,
    stickyTop: r ? Math.round(r.top - vp.top) : -999,
    inView: r ? r.top >= vp.top - 1 && r.bottom > vp.top : false,
  }
})()`)
console.log('SCROLL-UP:', JSON.stringify(shown))
await shot('wheel-align-2-search-shown')

// 断言 5：回到顶部 → 搜索框仍在（顶部常显）
await evalJs(`(() => {
  const el = document.querySelector('.aurora-blog-panel__scroll')
  el.scrollTop = 0
  el.dispatchEvent(new Event('scroll'))
})()`)
await sleep(500)
const backTop = await evalJs(`({ searchShownAtTop: !!document.querySelector('.aurora-blog-search') })`)
console.log('BACK-TOP:', JSON.stringify(backTop))

const ok =
  initial.searchShown === true && initial.scrollTop === 0 &&
  align.catDiff <= 2 && align.tagDiff <= 2 &&
  hidden.searchGone === true &&
  shown.searchShown === true && shown.placeholder === '搜索主题…' &&
  shown.stickyTop <= 2 && shown.inView === true &&
  backTop.searchShownAtTop === true
console.log(ok ? 'ALL-CHECKS-PASSED' : 'CHECKS-FAILED')
ws.close()
process.exit(ok ? 0 : 1)
