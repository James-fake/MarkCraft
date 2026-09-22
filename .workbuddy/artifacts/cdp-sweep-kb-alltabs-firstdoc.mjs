/**
 * CDP 全 Tab 穷举 · 「00 开始使用」在知识库**每个 Tab** 里由谁渲染、能不能点（2026-09-22）
 * ==========================================================================
 * 已证：概览·最近活动 / 笔记 Tab 的行**已接线**（点击进编辑器、不弹回）。
 * 未枚举：搜索 / 问答 / 依赖 / MOC / 导出 五个 Tab —— 名字可能以**非交互行**出现。
 * 本探针把 7 个 Tab 全扫一遍，并对「哑元素」逐个 click 看视图是否变化。
 *
 * 用法：CDP_PORT=9455 node .workbuddy/artifacts/cdp-sweep-kb-alltabs-firstdoc.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9455)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const NEEDLE = process.env.NEEDLE || '00 开始使用'
const TABS = ['概览', '笔记', '搜索', '问答', '依赖', 'MOC', '导出']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.pageErrors = []
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); return }
      if (m.method === 'Runtime.exceptionThrown') this.pageErrors.push('exception: ' + (m.params?.exceptionDetails?.exception?.description || ''))
      if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') this.pageErrors.push('console: ' + m.params.entry.text)
    })
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 240))
    return r.result.value
  }
}
const info = (s) => console.log('   · ' + s)

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) { try { if (await cdp.eval(expr)) return i } catch {} ; await sleep(ms) }
  if (label) console.log('   ⚠ 超时: ' + label)
  return -1
}
const ready = (cdp) => waitFor(cdp, `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`, { tries: 200, ms: 500 })

/** 逐个元素判断：自身有没有 onClick + 向上 10 层最近的可点祖先（返回"哑/可点"） */
const SCAN = (needle) => `(() => {
  const hits = [...document.querySelectorAll('body *')].filter(el => (el.textContent || '').includes(${JSON.stringify(needle)}))
  const inner = hits.filter(el => ![...el.children].some(c => (c.textContent || '').includes(${JSON.stringify(needle)})))
  const cls = (n) => ((n && n.className) || '').toString().slice(0, 64)
  const propsOf = (n) => { if (!n) return null; const k = Object.keys(n).find(x => x.startsWith('__reactProps$')); return k ? n[k] : null }
  const anc = (n) => { let c = n, d = 0; while (c && d < 10) { const p = propsOf(c); if (p && typeof p.onClick === 'function') return c.tagName + '.' + cls(c); c = c.parentElement; d++ } return null }
  return inner.map((el, i) => {
    const r = el.getBoundingClientRect(); const p = propsOf(el)
    return { i, tag: el.tagName, cls: cls(el), text: (el.textContent || '').trim().slice(0, 22),
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      ownOnClick: !!(p && typeof p.onClick === 'function'), ancestor: anc(el),
      pointer: getComputedStyle(el).cursor }
  })
})()`

const SNAP = `({ hash: location.hash, editor: !!document.querySelector('.cm-content, .ProseMirror'), kbDetail: !!document.querySelector('.aurora-kb-subbar__name'), kbList: !!document.querySelector('.aurora-kb-manage') })`

async function clickTab(cdp, label) {
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').trim().includes(${JSON.stringify(label)}))
    if (t) t.click(); return !!t
  })()`)
  await sleep(900)
}

async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 4; a++) {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1000); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) return true
  }
  return false
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 target'); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__logs = [] })()` })
  await cdp.send('Page.bringToFront'); await cdp.eval('window.focus()')
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=alltabs-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ s: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length, reload: Array.isArray(window.__logs) })`)
  console.log(`[自检] 外壳就位=${rdy >= 0} sidebarItems=${surface.s} styleSheets=${surface.sheets} 真实重载=${surface.reload}`)
  if (!(rdy >= 0 && surface.s > 0)) { console.error('❌ 扫描面为空，退出'); process.exit(4) }
  if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
    await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); const b = el && [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent || '')); if (b) b.click(); else if (el) el.remove(); return true })()`)
    await sleep(400)
  }
  const seeded = await waitFor(cdp, `(async () => {
    const all = await new Promise((res) => { const q = indexedDB.open('markcraft'); q.onsuccess = () => { const d = q.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); res(r || []) } }; q.onerror = () => res([]) })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500 })
  console.log(`[自检] 播种就位=${seeded >= 0}`)
  await sleep(1200); await ready(cdp)

  if (!(await enterKbDetail(cdp))) { console.error('❌ 进不了详情页'); process.exit(5) }

  for (const tab of TABS) {
    console.log(`\n===== Tab「${tab}」=====`)
    await clickTab(cdp, tab)
    const before = await cdp.eval(SNAP)
    const items = await cdp.eval(SCAN(NEEDLE))
    console.log(`   状态=${JSON.stringify(before)}  含「${NEEDLE}」最内层元素=${items.length}`)
    items.forEach((h) => console.log(`   [${h.i}] ${h.tag}.${h.cls} rect=${JSON.stringify(h.rect)} cursor=${h.pointer} 自身onClick=${h.ownOnClick} 最近可点祖先=${h.ancestor || '（无 → 哑）'}`))
    for (const h of items.filter((x) => !x.ancestor)) {
      await cdp.eval(`(() => {
        const hits = [...document.querySelectorAll('body *')].filter(el => (el.textContent || '').includes(${JSON.stringify(NEEDLE)}))
        const inner = hits.filter(el => ![...el.children].some(c => (c.textContent || '').includes(${JSON.stringify(NEEDLE)})))
        const el = inner[${h.i}]
        // ⚠️ SVGElement 没有 .click()（只有 HTMLElement 有）→ 点 SVG 哑元素会抛 TypeError
        if (el && typeof el.click === 'function') { el.click(); return true }
        return false
      })()`)
      await sleep(800)
      const after = await cdp.eval(SNAP)
      console.log(`   → 点哑元素[${h.i}] 后 = ${JSON.stringify(after)}  视图变化=${JSON.stringify(after) !== JSON.stringify(before)}`)
    }
  }

  // 欢迎页（首启落地页）
  console.log('\n===== 欢迎页 =====')
  await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('欢迎')); if (e) e.click(); return !!e })()`)
  await sleep(900)
  const wItems = await cdp.eval(SCAN(NEEDLE))
  console.log(`   状态=${JSON.stringify(await cdp.eval(SNAP))}  含「${NEEDLE}」最内层元素=${wItems.length}`)
  wItems.forEach((h) => console.log(`   [${h.i}] ${h.tag}.${h.cls} rect=${JSON.stringify(h.rect)} cursor=${h.pointer} 自身onClick=${h.ownOnClick} 最近可点祖先=${h.ancestor || '（无 → 哑）'}`))

  // 图谱视图
  console.log('\n===== 图谱视图 =====')
  await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('图谱')); if (e) e.click(); return !!e })()`)
  await sleep(1500)
  const gItems = await cdp.eval(SCAN(NEEDLE))
  console.log(`   状态=${JSON.stringify(await cdp.eval(SNAP))}  含「${NEEDLE}」最内层元素=${gItems.length}`)
  gItems.slice(0, 8).forEach((h) => console.log(`   [${h.i}] ${h.tag}.${h.cls} rect=${JSON.stringify(h.rect)} cursor=${h.pointer} 最近可点祖先=${h.ancestor || '（无 → 哑）'}`))

  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  console.log(`\n页面错误 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  ws.close(); process.exit(0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
