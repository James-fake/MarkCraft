/**
 * CDP 复现探针 · 「点第一篇 00 开始使用.md → 回到知识库详情页」的**切换后落点**归因
 * ==========================================================================
 * 前两条探针已排除的事（不必重复查）：
 *   · ① 行的接线：概览·最近活动 / 笔记 Tab 首行均 element.click() 可进编辑器，且不弹回；
 *   · ② 页面里没有第二处「00 开始使用」的可点元素（穷举：只有 KbFileRow 一处可点，
 *        专属图谱那处是无 onClick 的 SVG 文本 + 12 个 cursor:pointer 的哑 circle）。
 *
 * 于是唯一剩下的可能：**切换的那一下之外，还有第二下点击落在编辑器里**（用户双击 / 连点）。
 * 编辑器视图里能回知识库详情的元素**只有**「← 返回 XX」芯片
 * （EditorPanel handleReturnToSource → nav('kb', kbId)）。所以本探针只问三件事：
 *   A. 切到编辑器后，**原点击坐标上到底站着谁**（全层清单，不是只看最上层）；
 *   B. 对那个坐标**确定性地点第二下**（element.click()，不经窗口激活）→ 视图会不会回 kb；
 *   C. **真实鼠标双击**（连点两下）同样的行 → 视图会不会回 kb；
 *   D. 对照：第二行做同样动作 → 必须**不**回 kb（「只有第一篇」的判据）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**；profile 路径必须用 Windows 形态）：
 *   CDP_PORT=9455 node .workbuddy/artifacts/cdp-repro-kb-firstdoc-secondclick.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9455)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const DOC1 = process.env.DOC || '00 开始使用.md'
const DOC2 = process.env.DOC2 || '01 界面布局.md'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.pageErrors = []
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
        return
      }
      if (m.method === 'Runtime.exceptionThrown') this.pageErrors.push('exception: ' + (m.params?.exceptionDetails?.exception?.description || ''))
      if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') this.pageErrors.push('console: ' + m.params.entry.text)
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
}

const out = []
const info = (s) => { console.log('   · ' + s); out.push(s) }
const head = (s) => console.log('\n===== ' + s + ' =====')

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}
const ready = (cdp, tries = 200) => waitFor(cdp,
  `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`,
  { tries, ms: 500 })

const NAV_HOOK = `(() => {
  if (!window.__navHooked) {
    window.__navHooked = true
    const rec = (via) => { try { window.__navSeq.push({ h: location.hash, t: Date.now(), via }) } catch {} }
    window.addEventListener('hashchange', () => rec('hashchange'))
    window.addEventListener('popstate', () => rec('popstate'))
    const op = history.pushState.bind(history)
    history.pushState = function (...a) { op(...a); rec('pushState') }
    const or = history.replaceState.bind(history)
    history.replaceState = function (...a) { or(...a); rec('replaceState') }
  }
  window.__navSeq = [{ h: location.hash, t: Date.now(), via: 'init' }]
  return true
})()`

const SNAP = `({ hash: location.hash, editor: !!document.querySelector('.cm-content, .ProseMirror'), kb: document.querySelectorAll('.aurora-kb').length })`

const CLICK_KB_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
  if (e) e.click(); return !!e
})()`

async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 4; a++) {
    await cdp.eval(CLICK_KB_SIDEBAR)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1200); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) return true
  }
  return false
}

async function openNotesTab(cdp) {
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记'))
    if (t) t.click(); return !!t
  })()`)
  return waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400 })
}

const rowByDoc = (doc, scope) => `(() => {
  const rows = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .aurora-kb-recent__item')]
  return rows.find(r => (r.textContent || '').includes(${JSON.stringify(doc)})) || null
})()`

/** 坐标上的**全层**元素清单（不是只取最上层） */
const ALL_LAYERS = (x, y) => `(() => {
  const els = document.elementsFromPoint(${x}, ${y})
  const cls = (n) => ((n && n.className) || '').toString().slice(0, 70)
  return els.map((el) => {
    const r = el.getBoundingClientRect()
    return {
      tag: el.tagName, cls: cls(el),
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      isReturnChip: !!(el.closest && el.closest('.aurora-editor__return')),
      text: (el.textContent || '').trim().slice(0, 24),
    }
  })
})()`

const CHIP = `(() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }
  const chip = document.querySelector('.aurora-editor__return')
  return {
    chip: box(chip), bar: box(document.querySelector('.aurora-editor__returnbar')),
    text: chip ? (chip.textContent || '').trim() : null,
    toolbar: box(document.querySelector('.aurora-editor__layout') ? null : null),
    layout: box(document.querySelector('.aurora-editor__layout')),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
})()`

/** A+B：点行 → 看切换后同坐标站着谁 → 确定性地点第二下 */
async function secondClick(cdp, doc, scope, label, dx = 40) {
  const hit = await cdp.eval(`(() => {
    const r = ${rowByDoc(doc, scope)}
    if (!r) return null
    const b = r.getBoundingClientRect()
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
             cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }
  })()`)
  if (!hit) { info(`${label}：没找到行`); return null }
  const px = hit.x + dx, py = hit.cy
  info(`${label}：行 rect=${JSON.stringify({ x: hit.x, y: hit.y, w: hit.w, h: hit.h })} → 取第二击坐标=(${px},${py})`)

  await cdp.eval(NAV_HOOK)
  await cdp.eval(`(() => { const r = ${rowByDoc(doc, scope)}; if (r) r.click(); return !!r })()`)
  await sleep(800)

  const geo = await cdp.eval(CHIP)
  const layers = await cdp.eval(ALL_LAYERS(px, py))
  const top = layers[0]
  info(`${label}：切换后 viewport=${JSON.stringify(geo?.viewport)} 芯片=${JSON.stringify(geo?.chip)}（文案 ${JSON.stringify(geo?.text)}）返回栏=${JSON.stringify(geo?.bar)}`)
  info(`${label}：编辑器 layout 顶部 y=${geo?.layout?.y}（芯片是否在其上方？）`)
  info(`${label}：同坐标(${px},${py})全层 = ` + JSON.stringify(layers.slice(0, 4)))
  info(`${label}：该坐标最上层 = ${top?.tag}.${top?.cls}（是返回芯片=${top?.isReturnChip}）`)

  // 确定性第二击
  const second = await cdp.eval(`(() => {
    const el = document.elementFromPoint(${px}, ${py})
    if (!el) return { ok: false }
    const isChip = !!(el.closest && el.closest('.aurora-editor__return'))
    el.click()
    return { ok: true, tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), isChip }
  })()`)
  await sleep(800)
  const after = await cdp.eval(SNAP)
  const navSeq = await cdp.eval('window.__navSeq || []')
  info(`${label}：第二击目标=${second?.tag}.${second?.cls}（芯片=${second?.isChip}）→ 稳态 hash=${after.hash} editor=${after.editor} kb=${after.kb}`)
  info(`${label}：导航序列 = ${JSON.stringify(navSeq.map((x) => x.h))}`)
  return { hit, px, py, geo, layers, second, after, navSeq }
}

/** C+D：真实鼠标双击（连点两下） */
async function realDoubleClick(cdp, doc, scope, label) {
  const hit = await cdp.eval(`(() => {
    const r = ${rowByDoc(doc, scope)}
    if (!r) return null
    const b = r.getBoundingClientRect()
    return { cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }
  })()`)
  if (!hit) { info(`${label}：没找到行`); return null }
  const { cx, cy } = hit
  await cdp.eval(NAV_HOOK)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, buttons: 0 })
  await sleep(90)
  // 第 1 下
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1, buttons: 1 })
  await sleep(45)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1, buttons: 0 })
  await sleep(90)
  // 第 2 下（双击节奏）
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 2, buttons: 1 })
  await sleep(45)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 2, buttons: 0 })
  await sleep(900)
  const after = await cdp.eval(SNAP)
  const navSeq = await cdp.eval('window.__navSeq || []')
  info(`${label}：真实鼠标双击(${cx},${cy}) → 稳态 hash=${after.hash} editor=${after.editor} kb=${after.kb}`)
  info(`${label}：导航序列 = ${JSON.stringify(navSeq.map((x) => x.h))}`)
  const landed = await cdp.eval(ALL_LAYERS(cx, cy))
  info(`${label}：双击后同坐标最上层 = ${landed[0]?.tag}.${landed[0]?.cls}`)
  return { cx, cy, after, navSeq }
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
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=second-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ s: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  head('0. 自检')
  info(`外壳就位=${rdy >= 0} sidebarItems=${surface.s} styleSheets=${surface.sheets} 真实重载=${await cdp.eval('Array.isArray(window.__logs)')}`)
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
  })()`, { tries: 60, ms: 500, label: '播种' })
  info(`知识库播种就位=${seeded >= 0}`)
  await sleep(1200); await ready(cdp)

  head('A+B. 笔记 Tab · 报障篇（第一行）')
  await enterKbDetail(cdp); await openNotesTab(cdp)
  const a = await secondClick(cdp, DOC1, '.aurora-kb-notes', 'A 报障篇')

  head('C+D. 笔记 Tab · 对照篇（第二行）')
  await enterKbDetail(cdp); await openNotesTab(cdp)
  const b = await secondClick(cdp, DOC2, '.aurora-kb-notes', 'C 对照篇')

  head('E. 真实鼠标双击（报障篇 第一行）')
  await enterKbDetail(cdp); await openNotesTab(cdp)
  const e = await realDoubleClick(cdp, DOC1, '.aurora-kb-notes', 'E 双击报障篇')

  head('F. 真实鼠标双击（对照篇 第二行）')
  await enterKbDetail(cdp); await openNotesTab(cdp)
  const f = await realDoubleClick(cdp, DOC2, '.aurora-kb-notes', 'F 双击对照篇')

  head('结论判定')
  const overlap = (rowBox, chipBox) => !!rowBox && !!chipBox && rowBox.y < chipBox.y + chipBox.h && chipBox.y < rowBox.y + rowBox.h
  info(`几何：报障篇行 y=[${a?.hit?.y},${(a?.hit?.y ?? 0) + (a?.hit?.h ?? 0)}] 芯片 y=[${a?.geo?.chip?.y},${(a?.geo?.chip?.y ?? 0) + (a?.geo?.chip?.h ?? 0)}] 重叠=${overlap(a?.hit, a?.geo?.chip)}`)
  info(`几何：对照篇行 y=[${b?.hit?.y},${(b?.hit?.y ?? 0) + (b?.hit?.h ?? 0)}]`)
  info(`A 第二击(报障篇) → ${a?.after?.hash} ｜ C 第二击(对照篇) → ${b?.after?.hash}`)
  info(`E 双击(报障篇) → ${e?.after?.hash} ｜ F 双击(对照篇) → ${f?.after?.hash}`)

  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  info(`页面错误 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  ws.close()
  process.exit(0)
}

main().catch((err) => { console.error('探针异常：', err?.message || err); process.exit(3) })
