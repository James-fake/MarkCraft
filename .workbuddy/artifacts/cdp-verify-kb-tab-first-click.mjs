/**
 * CDP 真机探针 · 知识库「首次点『笔记』Tab 停在概览，再点一次才切」修复验收
 * ==========================================================================
 * 报障原话：「首次进入到 markcraft 使用文档知识库，首次点击笔记，会回到概览界面，
 *            再次点击笔记才会进入到正确对应的笔记界面」。
 *
 * 根因（`aurora/hooks/useSwipeTabs.ts` → `endGesture`）：
 *   旧判据 `if (Math.abs(offset) > DIRECTION_SLOP) suppressClickRef.current = true`
 *   ——「有没有位移」就置「吃掉紧随 click」的抑制标，而**不看有没有换 tab**。
 *   真实鼠标点击常带几像素漂移（刚移动到位就按下，手还在减速），
 *   `DIRECTION_SLOP = 8` 又很低 ⇒「按下 → 漂移十几 px → 松开」被判成横滑手势、
 *   进入跟手位移，但落点仍离起手 tab 最近 ⇒ **没换 tab**；
 *   抑制标照样置位 ⇒ 浏览器补发的那次 click 被 `onClickCapture` 吃掉
 *   ⇒ `onClick={() => setTab('notes')}` **从未执行** ⇒ 停在「概览」。
 *   修复后判据 = `decision.passed && decision.targetIndex !== next.index`（**真的换了 tab**）。
 *
 * 断言设计（每条只证一件事，且区分「修复前后」）：
 *   §0 自检：扫描面非空 + **真实重载**（否则一切结论不可信）
 *   §1 起手落在「概览」（报障前状态）
 *   §2 漂移 12px 点击「笔记」→ **必须切过去**（缺陷 1 的修复点）      ← HEAD 上应❌
 *   §3 换全新页面再来一次 → 仍必须切（可重复，非偶发）                ← HEAD 上应❌
 *   §4 对照：干净点击（2px）→ 必须切（tab/handler 本身没坏）          ← 两侧都✅
 *   §5 **防修过头**：真横滑（约一个槽距）换 tab 后，滑块落点=笔记
 *      且**不被尾随 click 弹回**（证明「真换 tab 时抑制标仍必须置位」） ← 两侧都✅
 *   §6 点第 N 行笔记 → 打开的就是第 N 篇（排除「永远第一篇」）
 *   §7 **缺陷 2**：一次「抖动点击」（从未激活）之后，**不按键的悬停横移**
 *      不得激活手势 / 换 tab（旧实现会用陈旧 startX 凭空激活）        ← HEAD 上应❌
 *
 * ⚠️ 已删除「§2b 前向对称」：实测它**不具区分力**（两侧都绿）。原因是同一 document 内
 *    连做两次手势时，前一次「抖动点击」的陈旧起点会污染后一次（详见 §7）。
 *    通则：**每个手势样本各用一个全新页面**。
 *
 * 用法（**必须与 Edge 同一次前台 bash**）：
 *   CDP_PORT=9444 node .workbuddy/artifacts/cdp-verify-kb-tab-first-click.mjs
 * 版本对照：把 `src/aurora/hooks/useSwipeTabs.ts` 还原到 HEAD 跑同一条探针，
 *   §2/§3/§7 必须翻红、其余仍绿（`LABEL=HEAD …`）。
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const DX = Number(process.env.DX || 12)          // 漂移点击的横向漂移（px）
const LABEL = process.env.LABEL || 'RUN'         // 本次跑的是什么版本（HEAD/FIXED），只用于打印
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

const ACTIVE_TAB = `(() => {
  const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
    .filter(x => x.getAttribute('aria-selected') === 'true')
    .map(x => (x.textContent || '').trim())
  return { active: t, notesList: document.querySelectorAll('.aurora-kb-notes').length,
           hash: location.hash, kb: document.querySelectorAll('.aurora-kb').length }
})()`

/**
 * document **冒泡层** click 追踪 —— 判别「React 是否拦下了这次 click」。
 *
 * React 17+ 把合成事件监听挂在 root 容器上，其 `stopPropagation()` 会调用原生
 * `stopPropagation()` ⇒ 被拦下的 click **不会**继续冒泡到 document。
 * 因此：冒泡层**有**记录 = 没被拦（未被抑制）；**无**记录 = 被 React 在 root 处掐断（被抑制）。
 * （capture 层只能证「事件到了」，无法区分是否被吞 —— 那正是「假绿」的来源。）
 */
const BUBBLE_HOOK = `(() => {
  window.__bubbled = []
  if (!window.__bubbleHooked) {
    window.__bubbleHooked = true
    document.addEventListener('click', (e) => {
      const t = e.target
      const raw = (t && t.className && t.className.toString ? t.className.toString() : '') || ''
      window.__bubbled.push({ text: ((t && t.textContent) || '').trim().slice(0, 10), cls: raw.split(/\\s+/)[0], prevented: e.defaultPrevented })
    }, false)
  }
  return true
})()`

const TAB_RECT = (label) => `(() => {
  const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
    .find(x => (x.textContent || '').trim() === ${JSON.stringify(label)})
  if (!t) return null
  const b = t.getBoundingClientRect()
  return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
           cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) }
})()`

/** 量 tab 中心与槽距（用于「真横滑」按一个槽距拖，保证落点仍落在按钮上） */
const PITCH = `(() => {
  const ts = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
  if (ts.length < 2) return null
  const cs = ts.map(t => { const b = t.getBoundingClientRect(); return b.left + b.width / 2 })
  return { centers: cs.map(v => Math.round(v)), pitch: Math.round(cs[1] - cs[0]), n: ts.length }
})()`

/**
 * 真实鼠标「按下 → 水平漂移 dx → 松开」（模拟带漂移的点击）。
 * 起手与落点都在同一个按钮上（dx ≤ 按钮半径）⇒ 浏览器把 click 派发到该按钮。
 */
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
  await sleep(460)
  return { swiping, thumbT }
}

/** 真实鼠标「按住 → 水平拖到 toX → 松开」（真横滑；落点仍在 tab 栏内） */
async function realDrag(cdp, fromX, y, toX, steps = 12) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y, buttons: 0 })
  await sleep(60)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  let swiping = null
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(fromX + ((toX - fromX) * i) / steps)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 })
    await sleep(16)
    if (i === steps) swiping = await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs[data-swiping]')`)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(520)
  return { swiping }
}

/**
 * 不按键的悬停平移（真实鼠标划过 tab 栏；buttons=0）。
 * 返回此刻 tab 栏是否处于跟手态（`.aurora-kb-subbar-tabs[data-swiping]`）。
 */
async function hoverMove(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await sleep(60)
  return cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs[data-swiping]')`)
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
  await sleep(320)
  return cdp.eval(ACTIVE_TAB)
}

async function main() {
  console.log(`\n########## 版本 = ${LABEL} · 漂移 ${DX}px ##########`)
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

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=fixtab-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  head('0. 自检（扫描面非空 + 真实重载）')
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')
  info(`外壳就位=${rdy >= 0} sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets} 真实重载=${reloaded}`)
  if (!(rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8)) { console.error('❌ 扫描面为空 → 结论不可信'); process.exit(4) }
  if (!reloaded) { console.error('❌ 未发生真实重载 → 结论不可信'); process.exit(5) }

  // ── §1 起手态 ──
  head('1. 全新页面进入知识库详情（kbSession 已重置 → 落地应为「概览」）')
  const s1 = await freshKb(cdp, 's1')
  info(`落点 = ${JSON.stringify(s1)}`)
  ok('§1 起手落在「概览」Tab（报障前的状态）', s1.active.includes('概览') && s1.notesList === 0, `active=${JSON.stringify(s1.active)}`)

  // ── §2 漂移点击「笔记」 ──
  head(`2. 漂移 ${DX}px 点击「笔记」→ **必须切过去**（修复点）`)
  const tabNotes = await cdp.eval(TAB_RECT('笔记'))
  info(`「笔记」Tab rect=${JSON.stringify(tabNotes)}`)
  await cdp.eval(BUBBLE_HOOK)
  const g2 = await driftClick(cdp, tabNotes.cx, tabNotes.cy, DX)
  const a2 = await cdp.eval(ACTIVE_TAB)
  info(`漂移点击后：手势启动(data-swiping)=${g2.swiping} 滑块位移 transform=${JSON.stringify(g2.thumbT)}`)
  info(`冒泡层 click 记录（[] = 被 React 拦下 / 非空 = 放行）=${JSON.stringify(await cdp.eval('window.__bubbled'))}`)
  info(`active=${JSON.stringify(a2.active)} notesList=${a2.notesList}`)
  ok('§2 漂移点击「笔记」一次即切换（修复的目标行为）',
    a2.active.includes('笔记') || a2.notesList > 0, `active=${JSON.stringify(a2.active)} notesList=${a2.notesList}`)
  ok('§2 过程证据：这次点击**确实**触发了跟手手势（否则测不到那个缺陷）',
    g2.swiping === true, `swiping=${g2.swiping}`)

  // ── §2b 已删除（2026-09-22 复核）—— 它**不具区分力**，留着只会误导读者 ──
  // 它的「绿」并非来自本次修复，而是**另一个缺陷**造成的：一次「抖动点击」（从未激活）会在
  // gestureRef 里留下陈旧起点，之后一次不按键的悬停横移就能用那个起点激活手势（实测 dx=71、
  // offset=83 ⇒ 切到了错误的 tab）。该缺陷已单独修复，并由 §7 断言。
  // 通则（已写入 skill）：**同一 document 内连做两次手势的样本极易被前后污染**，
  // 本探针每个手势样本各用一个全新页面。


  // ── §3 可重复 ──
  head('3. 可重复性 · 再开一个全新页面，同样做一次漂移点击')
  const s3 = await freshKb(cdp, 's3')
  const tab3 = await cdp.eval(TAB_RECT('笔记'))
  const g3 = await driftClick(cdp, tab3.cx, tab3.cy, DX)
  const a3 = await cdp.eval(ACTIVE_TAB)
  info(`起手 active=${JSON.stringify(s3.active)}；漂移点击后 active=${JSON.stringify(a3.active)} noteList=${a3.notesList}（swiping=${g3.swiping}）`)
  ok('§3 换一个全新页面，漂移点击**仍然**一次即切（可重复，非偶发）',
    a3.active.includes('笔记') || a3.notesList > 0, `active=${JSON.stringify(a3.active)}`)

  // ── §4 对照：干净点击 ──
  head('4. 对照 · 干净点击（漂移 2px）第 1 次就应切换')
  const s4 = await freshKb(cdp, 's4')
  const tab4 = await cdp.eval(TAB_RECT('笔记'))
  const g4 = await driftClick(cdp, tab4.cx, tab4.cy, 2)
  const a4 = await cdp.eval(ACTIVE_TAB)
  info(`起手 active=${JSON.stringify(s4.active)}；干净点击后 active=${JSON.stringify(a4.active)} noteList=${a4.notesList}（swiping=${g4.swiping}）`)
  ok('§4 干净点击一次即切到「笔记」（tab 与 handler 本身没坏）',
    a4.active.includes('笔记') || a4.notesList > 0, `active=${JSON.stringify(a4.active)} notesList=${a4.notesList}`)

  // ── §5 防修过头：真横滑仍必须生效、且不被尾随 click 弹回 ──
  head('5. 防修过头 · 真横滑（约一个槽距）换 tab 后不得被尾随 click 弹回')
  const s5 = await freshKb(cdp, 's5')
  const pitch = await cdp.eval(PITCH)
  info(`槽距信息 = ${JSON.stringify(pitch)}`)
  const overviewRect = await cdp.eval(TAB_RECT('概览'))
  const dragTo = Math.round(overviewRect.cx + (pitch?.pitch ?? 84))
  // ⚠️合成鼠标的首轮常被「窗口激活」吞掉（实测 4 轮里 1 轮 pointerdown 没送达 ⇒ 手势未启动）。
  // 故内建重试：**只在「手势没启动」时重试**；一旦启动了（swiping=true）就按结果断言，
  // 绝不把「没送达」记成产品失败，也不让重试掩盖真实失败。
  let g5 = null, a5 = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cdp.send('Page.bringToFront')
    await cdp.eval('window.focus()')
    const cur = await cdp.eval(ACTIVE_TAB)
    if (!cur.active.includes('概览')) {
      const tn = await cdp.eval(TAB_RECT('概览'))
      await driftClick(cdp, tn.cx, tn.cy, 2) // 干净点击复位（两侧版本都生效）
    }
    g5 = await realDrag(cdp, overviewRect.cx, overviewRect.cy, dragTo)
    a5 = await cdp.eval(ACTIVE_TAB)
    info(`§5 第 ${attempt} 轮：swiping=${g5.swiping} → active=${JSON.stringify(a5.active)}`)
    if (g5.swiping === true) break
  }
  const landing = Math.round(overviewRect.cx + (pitch?.pitch ?? 84))
  const c1 = pitch?.centers?.[1]
  info(`起手 active=${JSON.stringify(s5.active)}；真横滑 ${Math.round(pitch?.pitch ?? 84)}px（落点 x=${landing}≈第2格中心 ${c1}）`)
  info(`松手后 active=${JSON.stringify(a5.active)} noteList=${a5.notesList}（swiping=${g5.swiping}）`)
  ok('§5 合成拖动确实启动了手势（否则本节不具区分力）', g5.swiping === true, `swiping=${g5.swiping}`)
  ok('§5 真横滑的位移足够（落点离第 2 格中心更近）', !!c1 && Math.abs(landing - c1) < Math.abs(landing - (pitch?.centers?.[0] ?? 0)),
    `landing=${landing} c0=${pitch?.centers?.[0]} c1=${c1}`)
  ok('§5【防修过头】真横滑换 tab 生效（尾随 click 未把它弹回起手 tab）',
    a5.active.includes('笔记'), `active=${JSON.stringify(a5.active)}`)

  // ── §6 点第 N 行打开第 N 篇 ──
  head('§6 点第 N 行笔记 → 打开的确实是第 N 篇（而非永远第一篇）')
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
    await sleep(1300)
    const brief = await cdp.eval(`(() => { const el = document.querySelector('.aurora-brief'); return el ? { label: el.getAttribute('aria-label'), head: (el.textContent||'').trim().slice(0, 30) } : null })()`)
    info(`点第 ${targetIdx + 1} 行后简介页 = ${JSON.stringify(brief)}`)
    ok('§6 打开的确实是**被点的那一篇**（不是永远第一篇）',
      !!brief && !!brief.label && targetName.startsWith(brief.label.replace(/\.md$/, '')),
      `点击「${targetName}」→ 打开「${brief?.label}」`)
  }

  // ── §7 防误触：非激活按压之后的悬停不得激活手势（第二个缺陷） ──
  head('7. 防误触 · 一次「抖动点击」之后，**不按键的悬停横移**不得激活手势 / 换 tab')
  const s7 = await freshKb(cdp, 's7')
  const ov7 = await cdp.eval(TAB_RECT('概览'))
  // ① 抖动点击：按下 → 2px → 松手（从未激活）。落在当前已选中的「概览」上，无副作用
  const g7 = await driftClick(cdp, ov7.cx, ov7.cy, 2)
  const a7a = await cdp.eval(ACTIVE_TAB)
  info(`抖动点击后 active=${JSON.stringify(a7a.active)}（swiping=${g7.swiping}）`)
  ok('§7 前置：抖动点击本身不激活手势', g7.swiping === false, `swiping=${g7.swiping}`)
  ok('§7 前置：抖动点击后仍停在「概览」', a7a.active.includes('概览'), `active=${JSON.stringify(a7a.active)}`)
  // ② 不按键横移两个槽距（模拟把鼠标从「概览」划向右侧）
  const pitch7 = await cdp.eval(PITCH)
  const to7 = Math.round(ov7.cx + (pitch7?.pitch ?? 71) * 2)
  const sw7 = await hoverMove(cdp, to7, ov7.cy)
  const thumb7 = await cdp.eval(`(() => { const el = document.querySelector('.aurora-kb-subbar-thumb'); return el ? getComputedStyle(el).transform : null })()`)
  await sleep(420)
  const a7 = await cdp.eval(ACTIVE_TAB)
  info(`悬停横移到 x=${to7}（约 2 个槽距）：data-swiping=${sw7} 滑块 transform=${JSON.stringify(thumb7)}`)
  info(`悬停之后 active=${JSON.stringify(a7.active)}（起手=${JSON.stringify(s7.active)}）`)
  ok('§7【缺陷2】悬停横移没有触发跟手（data-swiping 应为 false）', sw7 === false, `swiping=${sw7}`)
  ok('§7【缺陷2】悬停横移没有改变 Tab', a7.active.includes('概览'), `active=${JSON.stringify(a7.active)}`)

  head('结论')
  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  info(`页面错误 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== [${LABEL}] 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) { console.log('未通过：'); failed.forEach((f) => console.log('  ❌ ' + f.name)) }
  ws.close()
  process.exit(0)
}

main().catch((err) => { console.error('探针异常：', err?.message || err); process.exit(3) })
