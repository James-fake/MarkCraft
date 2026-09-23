/**
 * CDP 真机探针 · 「点『笔记』Tab 没反应（停在概览），再点一次才切过去」（2026-09-22 第七轮报障）
 * ==========================================================================
 * 报障原话：「首次进入到 markcraft 使用文档知识库，首次点击笔记，会回到概览界面，
 *            再次点击笔记才会进入到正确对应的笔记界面」。
 *
 * 源码级假设（`aurora/hooks/useSwipeTabs.ts` → `endGesture`）：
 *   真实鼠标的一次点击常常**带着几像素漂移**（刚移动到目标就按下，手还在减速）。
 *   而 `DIRECTION_SLOP = 8`：
 *     · 漂移 > 8px ⇒ `resolveAxis` 判定为**横向手势** ⇒ axisLocked='horizontal'、
 *       activeRef=true、进入跟手位移；
 *     · 松手 ⇒ `decideSnap` 落点仍离起手 tab 最近 ⇒ `{passed:false, targetIndex:start}`（**不换 tab**）；
 *     · 但紧接着一行 `if (Math.abs(offset) > DIRECTION_SLOP) suppressClickRef.current = true`
 *       —— **不管有没有换 tab 都置位**；
 *     · 浏览器随后在按钮上补发的那次 click 被 `onClickCapture` 吃掉
 *       ⇒ `onClick={() => setTab('notes')}` **从未执行** ⇒ 视图停在「概览」。
 *     · 抑制标是一次性的（被那次 click 消费）⇒ **第二次点击正常切换** = 报障的「首次/再次」。
 *
 * 本探针要同时证明四件事（缺一件都不能定案）：
 *   §2 **A/B 同输入不同结果**：对同一面板、同一 tab，连做两次**完全相同的 12px 漂移点击**
 *      → 第 1 次不换（复现报障）、第 2 次换（证明「一次性抑制标」而非几何/接线问题）；
 *   §3 可重复：全新页面再来一次 → 仍然第 1 次不换（不是偶发）；
 *   §4 **对照**：干净点击（≤3px）第 1 次就换（证明 tab 本身没坏、handler 在）；
 *   §5 **证「事件确实到达但被吞」**：capture 层记录 click；若 trace 里有 click、而 tab 未换
 *      ⇒ 是 **onClickCapture 吞掉**（而非「没派发 click」）。
 *   §6 顺带排除另一假设：点第 N 行笔记 → 打开的确实是**第 N 篇**（不是永远第一篇「概览/欢迎」页）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**）：
 *   CDP_PORT=9444 node .workbuddy/artifacts/cdp-verify-swipe-tab-click.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
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

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log('   · ' + s)
const head = (s) => console.log('\n===== ' + s + ' =====')

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 导航期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}
const ready = (cdp, tries = 200) => waitFor(cdp,
  `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`,
  { tries, ms: 500, label: '应用外壳' })

/** capture 层记录 click（证「事件到了但被吞」） */
const CLICK_HOOK = `(() => {
  window.__clicks = []
  if (!window.__clickHooked) {
    window.__clickHooked = true
    document.addEventListener('click', (e) => {
      const t = e.target
      const raw = (t && t.className && t.className.toString ? t.className.toString() : '') || ''
      window.__clicks.push({ t: Math.round(performance.now()), tag: t && t.tagName, cls: raw.split(/\\s+/).slice(0,2).join('.'), text: ((t && t.textContent) || '').trim().slice(0, 12) })
    }, true)
  }
  return true
})()`

const ACTIVE_TAB = `(() => {
  const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
    .filter(x => x.getAttribute('aria-selected') === 'true')
    .map(x => (x.textContent || '').trim())
  return { active: t, notesList: document.querySelectorAll('.aurora-kb-notes').length,
           hash: location.hash, kb: document.querySelectorAll('.aurora-kb').length }
})()`

const TAB_RECT = (label) => `(() => {
  const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
    .find(x => (x.textContent || '').trim() === ${JSON.stringify(label)})
  if (!t) return null
  const b = t.getBoundingClientRect()
  return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
           cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }
})()`

/** 真实鼠标「按下 → 水平漂移 dx → 松开」（模拟带漂移的点击；dx ≤ 按钮半径内） */
async function driftClick(cdp, cx, cy, dx) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, buttons: 0 })
  await sleep(70)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  const steps = 3
  let swiping = null
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(cx + (dx * i) / steps)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: cy, button: 'left', buttons: 1 })
    await sleep(25)
    if (i === steps) swiping = await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs[data-swiping]')`)
  }
  const thumbT = await cdp.eval(`(() => { const el = document.querySelector('.aurora-kb-subbar-thumb'); return el ? getComputedStyle(el).transform : null })()`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(cx + dx), y: cy, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(420)
  return { swiping, thumbT }
}

/** 进入知识库详情页（每次先整页重载 → kbSession 单例清空 → 落地必是「概览」Tab） */
async function freshKb(cdp, tag) {
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=${tag}-${Date.now()}#view=editor` })
  await sleep(800)
  await ready(cdp)
  await waitFor(cdp, `(async () => {
    const all = await new Promise((res) => { const q = indexedDB.open('markcraft'); q.onsuccess = () => { const d = q.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); res(r || []) } }; q.onerror = () => res([]) })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500 })
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 4; a++) {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1200); continue }
    await cdp.eval(`(() => { const cs = [...document.querySelectorAll('.aurora-kb-kbcard')]; const c = cs.find(x => (x.textContent||'').includes('使用文档')) || cs[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) break
  }
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]').length >= 5`, { tries: 30, ms: 400, label: 'tab 栏' })
  await sleep(300)
  return cdp.eval(ACTIVE_TAB)
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

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=swipe-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  head('0. 自检（扫描面非空 + 真实重载）')
  info(`外壳就位=${rdy >= 0} sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets} 真实重载=${await cdp.eval('Array.isArray(window.__logs)')}`)
  if (!(rdy >= 0 && surface.sidebarItems > 0)) { console.error('❌ 扫描面为空'); process.exit(4) }

  const DX = Number(process.env.DX || 12)

  // ── §1 起手态 ──
  head('1. 全新页面进入知识库详情（kbSession 已重置 → 落地应为「概览」）')
  const s1 = await freshKb(cdp, 's1')
  info(`落点 = ${JSON.stringify(s1)}`)
  ok('§1 起手落在「概览」Tab（报障前的状态）', s1.active.includes('概览') && s1.notesList === 0, `active=${JSON.stringify(s1.active)}`)
  const tab = await cdp.eval(TAB_RECT('笔记'))
  info(`「笔记」Tab rect=${JSON.stringify(tab)}`)

  // ── §2 A/B：同输入、连做两次漂移点击 ──
  head(`2. A/B 同输入对照 · 真实鼠标「漂移 ${DX}px 点击」× 2（同一面板）`)
  await cdp.eval(CLICK_HOOK)
  const g1 = await driftClick(cdp, tab.cx, tab.cy, DX)
  const a1 = await cdp.eval(ACTIVE_TAB)
  const c1 = await cdp.eval('window.__clicks')
  info(`A 第 1 次漂移点击：手势启动(data-swiping)=${g1.swiping} 滑块 transform=${JSON.stringify(g1.thumbT)}`)
  info(`A 第 1 次后 active=${JSON.stringify(a1.active)} notesList=${a1.notesList}`)
  info(`A 第 1 次 capture 层收到的 click = ${JSON.stringify(c1)}`)
  ok(`§2A【复现】第 1 次漂移点击**没能**切到「笔记」（停在概览）`, !a1.active.includes('笔记') && a1.notesList === 0,
    `active=${JSON.stringify(a1.active)}`)
  ok('§2A 事件确实派发到了 tab 上（capture 层有 click 记录 ⇒ 不是"没派发"，而是被吞）',
    c1.some((x) => x.cls.includes('aurora-kb-subbar-tab')), JSON.stringify(c1.slice(-2)))

  const g2 = await driftClick(cdp, tab.cx, tab.cy, DX)
  const a2 = await cdp.eval(ACTIVE_TAB)
  info(`B 第 2 次漂移点击（**与第 1 次完全相同的输入**）：手势启动=${g2.swiping}`)
  info(`B 第 2 次后 active=${JSON.stringify(a2.active)} notesList=${a2.notesList}`)
  ok(`§2B【一次性抑制标】第 2 次**同样输入**却切到了「笔记」`, a2.active.includes('笔记') || a2.notesList > 0,
    `active=${JSON.stringify(a2.active)} notesList=${a2.notesList}`)

  // ── §3 可重复 ──
  head('3. 可重复性 · 再开一个全新页面，同样做一次漂移点击')
  const s3 = await freshKb(cdp, 's3')
  const tab3 = await cdp.eval(TAB_RECT('笔记'))
  await cdp.eval(CLICK_HOOK)
  const g3 = await driftClick(cdp, tab3.cx, tab3.cy, DX)
  const a3 = await cdp.eval(ACTIVE_TAB)
  info(`起手 active=${JSON.stringify(s3.active)}；漂移点击后 active=${JSON.stringify(a3.active)} noteList=${a3.notesList}（swiping=${g3.swiping}）`)
  ok('§3 换一个全新页面，第 1 次漂移点击**仍然**不切换（可重复，非偶发）',
    !a3.active.includes('笔记') && a3.notesList === 0, `active=${JSON.stringify(a3.active)}`)

  // ── §4 对照：干净点击 ──
  head('4. 对照 · 干净点击（漂移 2px）第 1 次就应切换')
  const s4 = await freshKb(cdp, 's4')
  const tab4 = await cdp.eval(TAB_RECT('笔记'))
  const g4 = await driftClick(cdp, tab4.cx, tab4.cy, 2)
  const a4 = await cdp.eval(ACTIVE_TAB)
  info(`起手 active=${JSON.stringify(s4.active)}；干净点击后 active=${JSON.stringify(a4.active)} noteList=${a4.notesList}（swiping=${g4.swiping}）`)
  ok('§4 干净点击一次即切到「笔记」（tab 与 handler 本身没坏）',
    a4.active.includes('笔记') || a4.notesList > 0, `active=${JSON.stringify(a4.active)} notesList=${a4.notesList}`)

  // ── §5 顺带排除「点第 N 行打开了第 1 篇」 ──
  head('§5 排除另一假设：点第 N 行是否打开第 N 篇（而非永远第一篇「概览/欢迎」页）')
  // 走干净点击确保在笔记 Tab（§4 已切好）
  const rows = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__title')].map(e => (e.textContent || '').trim())`)
  info(`笔记 Tab 行名（前 6）= ${JSON.stringify((rows || []).slice(0, 6))}`)
  const targetIdx = Math.min(3, (rows || []).length - 1)
  const targetName = rows?.[targetIdx]
  info(`将点击第 ${targetIdx + 1} 行 = 「${targetName}」`)
  if (targetName) {
    const box = await cdp.eval(`(() => {
      const rs = [...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')]
      const r = rs[${targetIdx}]; if (!r) return null
      const b = r.getBoundingClientRect()
      return { cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }
    })()`)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.cx, y: box.cy, buttons: 0 })
    await sleep(60)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.cx, y: box.cy, button: 'left', buttons: 1, clickCount: 1 })
    await sleep(45)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.cx, y: box.cy, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(1200)
    const brief = await cdp.eval(`(() => { const el = document.querySelector('.aurora-brief'); return el ? { label: el.getAttribute('aria-label'), head: (el.textContent||'').trim().slice(0, 30) } : null })()`)
    info(`点第 ${targetIdx + 1} 行后简介页 = ${JSON.stringify(brief)}`)
    ok('§5 打开的确实是**被点的那一篇**（不是永远第一篇）',
      !!brief && !!brief.label && targetName.startsWith(brief.label.replace(/\.md$/, '')),
      `点击「${targetName}」→ 打开「${brief?.label}」`)
  }

  head('结论')
  info(`§2A 复现（第1次不切）= ${results.find(r => r.name.startsWith('§2A【复现】'))?.cond}`)
  info(`§2B 一次性（第2次切） = ${results.find(r => r.name.startsWith('§2B'))?.cond}`)
  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  info(`页面错误 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) { console.log('未通过：'); failed.forEach((f) => console.log('  ❌ ' + f.name)) }
  ws.close()
  process.exit(0)
}

main().catch((err) => { console.error('探针异常：', err?.message || err); process.exit(3) })
