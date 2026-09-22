/**
 * CDP 全应用穷举 · 「00 开始使用」这个名字在**每个视图**里由谁渲染、能不能点（2026-09-22）
 * ==========================================================================
 * 已完成且不必重复的排查：
 *   · KbPanel 内部（概览·最近活动 / 笔记 Tab）行 → 已证接线，点击进编辑器且不弹回；
 *   · 切换后同坐标 = 编辑器正文（芯片在 y=84-111，行在 y=149+，不重叠）→ 第二击/双击都无害；
 *   · KB 详情页里含该名字的元素只有 2 处（可点的 KbFileRow + 哑的专属图谱标签）。
 * ⇒ 剩下的可能：用户点的名字**不在 KB 详情页**。故本探针把穷举扩到全应用。
 *
 * 对每个状态输出：该视图里所有含 NEEDLE 的最内层元素 + 交互能力（自身/最近可点祖先），
 * 并对「哑元素」逐个 element.click() 看视图是否变化（哑元素点了没反应 ⇒ 用户看到「点击无效」）。
 *
 * 用法（与 Edge 同一次前台 bash；profile 必须 Windows 形态路径）：
 *   CDP_PORT=9455 node .workbuddy/artifacts/cdp-sweep-appwide-firstdoc.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9455)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const NEEDLE = process.env.NEEDLE || '00 开始使用'
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
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
    return r.result.value
  }
}
const info = (s) => console.log('   · ' + s)
const head = (s) => console.log('\n===== ' + s + ' =====')

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) { try { if (await cdp.eval(expr)) return i } catch {} ; await sleep(ms) }
  if (label) console.log('   ⚠ 超时: ' + label)
  return -1
}
const ready = (cdp, tries = 200) => waitFor(cdp, `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`, { tries, ms: 500 })

const SWEEP = (needle) => `(() => {
  const hits = [...document.querySelectorAll('body *')].filter(el => (el.textContent || '').includes(${JSON.stringify(needle)}))
  const inner = hits.filter(el => ![...el.children].some(c => (c.textContent || '').includes(${JSON.stringify(needle)})))
  const cls = (n) => ((n && n.className) || '').toString().slice(0, 70)
  const propsOf = (n) => { if (!n) return null; const k = Object.keys(n).find(x => x.startsWith('__reactProps$')); return k ? n[k] : null }
  const anc = (n) => { let c = n, d = 0; while (c && d < 10) { const p = propsOf(c); if (p && typeof p.onClick === 'function') return c.tagName + '.' + cls(c); c = c.parentElement; d++ } return null }
  return inner.map((el, i) => {
    const r = el.getBoundingClientRect(); const p = propsOf(el)
    return { i, tag: el.tagName, cls: cls(el), text: (el.textContent || '').trim().slice(0, 24),
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      ownOnClick: !!(p && typeof p.onClick === 'function'), clickableAncestor: anc(el) }
  })
})()`

const SNAP = `({ hash: location.hash, editor: !!document.querySelector('.cm-content, .ProseMirror'), kbDetail: !!document.querySelector('.aurora-kb-subbar__name'), kbList: !!document.querySelector('.aurora-kb-manage'), graph: !!document.querySelector('.aurora-graph') })`

async function sweepState(cdp, label, prep) {
  head(label)
  if (prep) await prep()
  await sleep(500)
  const before = await cdp.eval(SNAP)
  info('状态 = ' + JSON.stringify(before))
  const items = await cdp.eval(SWEEP(NEEDLE))
  info(`含「${NEEDLE}」的最内层元素 = ${items.length}`)
  items.forEach((h) => info(`  [${h.i}] ${h.tag}.${h.cls} rect=${JSON.stringify(h.rect)} 自身onClick=${h.ownOnClick} 最近可点祖先=${h.clickableAncestor || '（无 → 哑）'}`))
  // 对哑元素逐一 click，看视图是否变化
  for (const h of items.filter((x) => !x.clickableAncestor)) {
    await cdp.eval(`(() => {
      const hits = [...document.querySelectorAll('body *')].filter(el => (el.textContent || '').includes(${JSON.stringify(NEEDLE)}))
      const inner = hits.filter(el => ![...el.children].some(c => (c.textContent || '').includes(${JSON.stringify(NEEDLE)})))
      const el = inner[${h.i}]
      if (el) el.click()
      return !!el
    })()`)
    await sleep(700)
    const after = await cdp.eval(SNAP)
    const changed = JSON.stringify(after) !== JSON.stringify(before)
    info(`  → 点击哑元素[${h.i}] 后 = ${JSON.stringify(after)} 视图变化=${changed}`)
  }
  return items
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

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=appwide-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ s: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length, reload: Array.isArray(window.__logs) })`)
  head('0. 自检')
  info(`外壳就位=${rdy >= 0} sidebarItems=${surface.s} styleSheets=${surface.sheets} 真实重载=${surface.reload}`)
  if (!(rdy >= 0 && surface.s > 0)) { console.error('❌ 扫描面为空，退出'); process.exit(4) }
  if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
    await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); const b = el && [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent || '')); if (b) b.click(); else if (el) el.remove(); return true })()`)
    await sleep(400)
    info('首启引导已关闭')
  }
  const seeded = await waitFor(cdp, `(async () => {
    const all = await new Promise((res) => { const q = indexedDB.open('markcraft'); q.onsuccess = () => { const d = q.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); res(r || []) } }; q.onerror = () => res([]) })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500, label: '播种' })
  info(`知识库播种就位=${seeded >= 0}`)
  await sleep(1200); await ready(cdp)

  // S1 编辑器（默认视图）
  await sweepState(cdp, 'S1 编辑器视图', async () => {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('编辑器')); if (e) e.click(); return !!e })()`)
    await sleep(900)
  })

  // S2 编辑器 + 左侧文件树滑出（hoverzone）—— 真实鼠标移到左缘
  await sweepState(cdp, 'S2 编辑器 + 左侧文件树（hover 滑出）', async () => {
    const hz = await cdp.eval(`(() => { const el = document.querySelector('.aurora-editor__hoverzone--left'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })()`)
    if (hz) {
      for (let i = 0; i < 6; i++) {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hz.x, y: hz.y, buttons: 0 })
        await sleep(250)
      }
      info(`已把鼠标停在左缘 hoverzone(${hz.x},${hz.y}) 以滑出文件树`)
    } else info('未找到左缘 hoverzone')
    await sleep(600)
    info('左侧文件树挂载 = ' + await cdp.eval(`!!document.querySelector('.aurora-editor__overlay--left')`))
  })

  // S3 知识库列表页
  await sweepState(cdp, 'S3 知识库列表页', async () => {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    await sleep(900)
  })

  // S4 知识库详情（概览）
  await sweepState(cdp, 'S4 知识库详情 · 概览 Tab', async () => { await enterKbDetail(cdp) })

  // S5 知识库详情 · 笔记 Tab
  await sweepState(cdp, 'S5 知识库详情 · 笔记 Tab', async () => {
    await cdp.eval(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
    await sleep(700)
  })

  // S6 图谱视图
  await sweepState(cdp, 'S6 图谱视图', async () => {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('图谱')); if (e) e.click(); return !!e })()`)
    await sleep(1200)
  })

  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  head('页面错误')
  info(`条数 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  ws.close(); process.exit(0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
