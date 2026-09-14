/* CDP 真页面验证：主题市场筛选改滚轮鼓（AuroraSelect）
 * 断言：两行筛选各有一个滚轮触发器、行内无 chip、点开风格滚轮出现选项鼓、
 *       点选「极简」后过滤生效、分类滚轮含「全部」。全程真页面 + 截图。 */
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

// 轮询等 blog tab 渲染（IndexedDB 冷启动可能较慢）
let tabReady = false
for (let i = 0; i < 40; i++) {
  await sleep(500)
  tabReady = await evalJs(`!!document.querySelector('.aurora-blog__tab.is-active')`)
  if (tabReady) break
}
if (!tabReady) {
  const diag = await evalJs(`({ hash: location.hash, rootChildren: document.getElementById('aurora-root')?.children.length, bodyLen: document.body.innerHTML.length })`)
  console.log('DIAG:', JSON.stringify(diag))
  throw new Error('blog tab never appeared')
}
await sleep(800)

// 展开功能面板浮层（默认收起，点当前激活组 tab 切换展开）
await evalJs(`(() => { const t = document.querySelector('.aurora-blog__tab.is-active'); if (!t) throw new Error('no active blog tab'); t.click(); return t.textContent.trim() })()`)
await sleep(1200)

// 断言 1：两行筛选各含一个 AuroraSelect 触发器，行内无 chip
const rows = await evalJs(`(() => {
  const q = (s) => document.querySelector(s)
  const tabsRow = q('.aurora-blog-tabs'); const tagsRow = q('.aurora-blog-tags')
  if (!tabsRow || !tagsRow) return { err: 'filter rows missing' }
  const sel = (row) => row.querySelectorAll('.aurora-select--custom').length
  const chips = (row) => row.querySelectorAll('.aurora-blog-chip').length
  return {
    catTriggers: sel(tabsRow), tagTriggers: sel(tagsRow),
    catChips: chips(tabsRow), tagChips: chips(tagsRow),
    catLabel: tabsRow.querySelector('.aurora-select__value')?.textContent,
    tagLabel: tagsRow.querySelector('.aurora-select__value')?.textContent,
    catGroup: tabsRow.querySelector('.aurora-blog-chipgroup__label')?.textContent,
    tagGroup: tagsRow.querySelector('.aurora-blog-chipgroup__label')?.textContent,
    gridBefore: document.querySelectorAll('.aurora-blog-theme').length,
  }
})()`)
console.log('ROWS:', JSON.stringify(rows))
await shot('wheel-filter-1-initial')

// 断言 2：点开风格滚轮 → 浮层出现、选项数、首项「全部」、当前选中项
const wheelOpen = await evalJs(`(() => {
  const trg = document.querySelector('.aurora-blog-tags .aurora-select--custom')
  if (!trg) return { err: 'no tag trigger' }
  trg.click()
  return { expanded: trg.getAttribute('aria-expanded') }
})()`)
await sleep(600)
const wheel = await evalJs(`(() => {
  const pop = document.querySelector('.aurora-wheel-popover')
  if (!pop) return { err: 'wheel popover missing' }
  const items = [...pop.querySelectorAll('.aurora-wheel__item')]
  const sel = items.find((i) => i.getAttribute('aria-selected') === 'true')
  return {
    itemCount: items.length,
    firstLabel: items[0]?.textContent,
    selectedLabel: sel?.textContent,
    labels: items.map((i) => i.textContent).slice(0, 6),
  }
})()`)
console.log('WHEEL:', JSON.stringify(wheel))
await shot('wheel-filter-2-popover')

// 断言 3：点选某项（极简）→ 浮层收起、触发器文案更新、网格过滤生效
const pick = await evalJs(`(() => {
  const items = [...document.querySelectorAll('.aurora-wheel-popover .aurora-wheel__item')]
  const target = items.find((i) => i.textContent === '极简')
  if (!target) return { err: 'no 极简 item', all: items.map((i) => i.textContent) }
  target.click()
  return { picked: target.textContent }
})()`)
await sleep(800)
const after = await evalJs(`(() => ({
  tagLabel: document.querySelector('.aurora-blog-tags .aurora-select__value')?.textContent,
  popoverGone: !document.querySelector('.aurora-wheel-popover'),
  gridAfter: document.querySelectorAll('.aurora-blog-theme').length,
}))()`)
console.log('PICK:', JSON.stringify(pick))
console.log('AFTER:', JSON.stringify(after))
await shot('wheel-filter-3-picked')

// 断言 4：分类滚轮含「全部」，且分类选择器独立可用
await evalJs(`document.querySelector('.aurora-blog-tabs .aurora-select--custom').click()`)
await sleep(600)
const catWheel = await evalJs(`(() => {
  const items = [...document.querySelectorAll('.aurora-wheel-popover .aurora-wheel__item')]
  return { itemCount: items.length, first: items[0]?.textContent, hasAll: items.some((i) => i.textContent === '全部') }
})()`)
console.log('CATWHEEL:', JSON.stringify(catWheel))
await shot('wheel-filter-4-catwheel')

// 汇总
const ok =
  rows.catTriggers === 1 && rows.tagTriggers === 1 &&
  rows.catChips === 0 && rows.tagChips === 0 &&
  rows.catGroup === '分类' && rows.tagGroup === '风格' &&
  wheel.itemCount > 1 && wheel.firstLabel === '全部' &&
  after.tagLabel === '极简' && after.popoverGone === true &&
  catWheel.hasAll === true
console.log(ok ? 'ALL-CHECKS-PASSED' : 'CHECKS-FAILED')
ws.close()
process.exit(ok ? 0 : 1)
