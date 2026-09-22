/**
 * CDP 穷举探针 · 「点第一篇 00 开始使用.md 会被弹回知识库详情页」根因定位（2026-09-22）
 * ==========================================================================
 * 为什么需要这一条（前序探针全绿却仍报障）：
 *   前一条探针（cdp-verify-kb-firstdoc-click.mjs）已证明「概览·最近活动首行 / 笔记 Tab 首行
 *   经 element.click() 与真实鼠标都能进编辑器且不弹回」。但用户仍报障 ⇒ 用户点的**不是**那两个元素。
 *
 * 本探针不做「猜手势」，只做**穷举**：
 *   在知识库详情页里，把**所有含「00 开始使用」文字的最内层元素**逐一列出来，并给出：
 *     · 几何（rect）、cursor、pointer-events
 *     · 是否真挂了 React onClick / onKeyDown（读 __reactProps$*）
 *     · 向上 8 层内**最近的可点祖先**是谁
 *   这么做的依据 = 坑 R（同款外观多容器，交互各自漂移）：只要页面里存在**第二处**渲染
 *   同一篇文档名、却「看着可点、实则无 onClick」的元素，用户点的就可能是它 ——
 *   于是「点击后停在/回到知识库详情页」成立，而按容器限定的旧探针**永远测不到**。
 *
 * 用法（**必须与 Edge 同一次前台 bash**）：
 *   node .workbuddy/artifacts/cdp-sweep-kb-firstdoc-text.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const NEEDLE = process.env.NEEDLE || '00 开始使用'

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
}

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

function ready(cdp, tries = 200) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

/** 最内层「含 NEEDLE 文字」的元素 + 它真实的交互能力 */
const SWEEP = (needle, scope) => `(() => {
  const root = document.querySelector(${JSON.stringify(scope)}) || document.body
  const hits = [...root.querySelectorAll('*')].filter(el => (el.textContent || '').includes(${JSON.stringify(needle)}))
  const inner = hits.filter(el => ![...el.children].some(c => (c.textContent || '').includes(${JSON.stringify(needle)})))
  const cls = (n) => ((n && n.className) || '').toString().slice(0, 80)
  const propsOf = (n) => {
    if (!n) return null
    const k = Object.keys(n).find(x => x.startsWith('__reactProps$'))
    return k ? n[k] : null
  }
  const clickableAncestor = (n) => {
    let cur = n, depth = 0
    while (cur && depth < 9) {
      const p = propsOf(cur)
      if (p && typeof p.onClick === 'function') return cur.tagName + '.' + cls(cur)
      cur = cur.parentElement; depth++
    }
    return null
  }
  return inner.map(el => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const p = propsOf(el)
    return {
      tag: el.tagName,
      cls: cls(el),
      text: (el.textContent || '').trim().slice(0, 26),
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      cursor: cs.cursor,
      pe: cs.pointerEvents,
      role: el.getAttribute('role'),
      tabIndex: el.getAttribute('tabindex'),
      ownOnClick: !!(p && typeof p.onClick === 'function'),
      ownOnKeyDown: !!(p && typeof p.onKeyDown === 'function'),
      clickableAncestor: clickableAncestor(el),
    }
  })
})()`

/** 页面里所有「看着可点（cursor:pointer）却没挂 onClick」的元素 —— 哑元素嫌疑人 */
const DUMB_POINTER = (scope) => `(() => {
  const root = document.querySelector(${JSON.stringify(scope)}) || document.body
  const propsOf = (n) => { const k = Object.keys(n).find(x => x.startsWith('__reactProps$')); return k ? n[k] : null }
  const out = []
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.cursor !== 'pointer') continue
    const p = propsOf(el)
    const hasClick = !!(p && typeof p.onClick === 'function')
    if (hasClick) continue
    // 祖先里有可点的就不算哑（子元素继承父行为是正常的）
    let cur = el.parentElement, depth = 0, anc = null
    while (cur && depth < 9) {
      const q = propsOf(cur)
      if (q && typeof q.onClick === 'function') { anc = cur.tagName + '.' + ((cur.className || '').toString().slice(0, 60)); break }
      cur = cur.parentElement; depth++
    }
    if (anc) continue
    const r = el.getBoundingClientRect()
    out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), txt: (el.textContent || '').trim().slice(0, 30), rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } })
  }
  return out
})()`

const CLICK_KB_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
  if (e) e.click()
  return !!e
})()`

async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let attempt = 1; attempt <= 4; attempt++) {
    await cdp.eval(CLICK_KB_SIDEBAR)
    const cards = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 })
    if (cards < 0) { await sleep(1200); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) return true
  }
  return false
}

async function openNotesTab(cdp) {
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
      .find(x => (x.textContent || '').includes('笔记'))
    if (t) t.click(); return !!t
  })()`)
  return waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400 })
}

async function report(cdp, label, scope) {
  console.log(`\n===== ${label} =====`)
  const hits = await cdp.eval(SWEEP(NEEDLE, scope))
  console.log(`含「${NEEDLE}」的最内层元素：${hits.length} 个`)
  hits.forEach((h, i) => {
    console.log(`  [${i}] ${h.tag}.${h.cls}`)
    console.log(`      文本="${h.text}" rect=${JSON.stringify(h.rect)} cursor=${h.cursor} pe=${h.pe} role=${h.role} tabIndex=${h.tabIndex}`)
    console.log(`      自身 onClick=${h.ownOnClick} onKeyDown=${h.ownOnKeyDown} 最近可点祖先=${h.clickableAncestor || '（无！哑元素）'}`)
  })
  const dumb = await cdp.eval(DUMB_POINTER(scope))
  console.log(`\n「cursor:pointer 但整条祖先链都无 onClick」的哑元素：${dumb.length} 个`)
  dumb.slice(0, 12).forEach((d, i) => {
    console.log(`  (${i}) ${d.tag}.${d.cls} rect=${JSON.stringify(d.rect)} 文本="${d.txt}"`)
  })
  return { hits, dumb }
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) {
    console.error('未找到 5174 页面 target；当前 targets:\n' + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      window.__logs = [];
      const orig = { info: console.info.bind(console), warn: console.warn.bind(console) };
      const fmt = (a) => a.map((x) => { if (typeof x === 'string') return x; try { return JSON.stringify(x) } catch { return String(x) } }).join(' ');
      ['info', 'warn'].forEach((k) => { console[k] = (...a) => { try { window.__logs.push(k + ': ' + fmt(a)) } catch {} ; orig[k](...a) } });
    })()`,
  })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  const NAV = `${BASE}/?_p=sweep-${Date.now()}#view=editor`
  console.log('导航 → ' + NAV)
  await cdp.send('Page.navigate', { url: NAV })
  await sleep(900)
  const rdy = await ready(cdp)
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  console.log(`\n[自检] 外壳就位=${rdy >= 0} 真实重载=${reloaded} sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  if (!(rdy >= 0 && surface.sidebarItems > 0)) { console.error('❌ 扫描面为空 → 结论不可信，退出'); process.exit(4) }

  // 首启引导（全屏 backdrop 会吞指针）先关掉
  if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-audience')
      const btn = el && [...el.querySelectorAll('button')].find(b => /开始|跳过|继续/.test(b.textContent || ''))
      if (btn) btn.click(); else if (el) el.remove()
      return true
    })()`)
    await sleep(400)
    console.log('[自检] 首启引导已关闭')
  } else {
    console.log('[自检] 首启引导不存在')
  }

  // 等播种（IndexedDB 权威介质）
  const seeded = await waitFor(cdp, `(async () => {
    const all = await new Promise((resolve) => {
      const req = indexedDB.open('markcraft')
      req.onsuccess = () => { const d = req.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll()
        g.onsuccess = () => { const r = g.result; d.close(); resolve(r || []) } }
      req.onerror = () => resolve([])
    })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let list = []; try { list = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return list.length > 0
  })()`, { tries: 60, ms: 500, label: '使用文档知识库播种' })
  console.log(`[自检] 知识库播种就位=${seeded >= 0}`)
  await sleep(1200)
  await ready(cdp)

  // ① 概览 Tab（默认）
  if (!(await enterKbDetail(cdp))) { console.error('❌ 进不了知识库详情页'); process.exit(5) }
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { tries: 40, ms: 400, label: '概览·最近活动行' })
  const name = await cdp.eval(`((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`)
  console.log(`\n库名 = ${JSON.stringify(name)}`)
  const rowsOverview = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item')].map(e => (e.textContent || '').trim().slice(0, 22))`)
  console.log('概览·最近活动行 = ' + JSON.stringify(rowsOverview))
  await report(cdp, '① 概览 Tab · 全页扫「' + NEEDLE + '」', '.aurora-kb')

  // ② 笔记 Tab
  await openNotesTab(cdp)
  const rowsNotes = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')].map(e => (e.textContent || '').trim().slice(0, 22))`)
  console.log('\n笔记 Tab 行数 = ' + rowsNotes.length + ' 前 5 = ' + JSON.stringify(rowsNotes.slice(0, 5)))
  await report(cdp, '② 笔记 Tab · 全页扫「' + NEEDLE + '」', '.aurora-kb')

  const errs = cdp.pageErrors.filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e))
  console.log('\n页面错误条数 = ' + errs.length + (errs.length ? '：' + JSON.stringify(errs.slice(0, 4)) : ''))
  ws.close()
  process.exit(0) // 诊断型：结论看输出
}

main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
