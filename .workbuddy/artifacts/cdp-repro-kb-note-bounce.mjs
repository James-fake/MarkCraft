/**
 * CDP 复现探针 · 「首次进入使用文档知识库 → 点笔记 → 弹回概览，再点一次才进得去」
 * ==========================================================================
 * 第七轮报障原话：「首次进入到 markcraft 使用文档知识库，首次点击笔记，会回到概览界面，
 *                  再次点击笔记才会进入到正确对应的笔记界面」。
 *
 * 已排除项（勿重复查）
 *   · kbSession Tab 记忆（第六轮已修，48/47c3947）；
 *   · 侧栏点亮语义（第五轮 4ffd717）；
 *   · 行接线（KbFileRow 单源化 + MiniGraph onSelect，96d1497 / 9d8d0bd）；
 *   · 概览「最近活动」行偶发不跳（已证两条列表都接 openInEditor）。
 *
 * 本轮要分辨的机制（症状是「第一次点没进去、第二次才进去」——**必须是成对输入**才能解释）：
 *   H1 **点击穿透**：第 1 击把视图切到编辑器（简介页），第 2 击落在**同一坐标**上，
 *      而那里此时站着编辑器的「← 返回 XX」芯片 → handleReturnToSource → nav('kb', kbId)
 *      → 表情上就是「点了笔记，结果回到知识库（且是概览 Tab）」。
 *      ⚠️ 上一轮 sweep 曾测过几何（芯片 y=84–111 / 行 y=149+，不重叠）——**但那是在
 *      UsageDocBrief 简介页诞生之前、编辑器还是完整布局时测的**；简介页是另一套布局，
 *      芯片位置可能已经移进列表行的 y 带 → 必须重新量。
 *   H2 别的回退源（路由 effect / 瞬态回收 / hash 回写）→ 由 __navSeq 序列区分。
 *
 * 本探针输出四件事：
 *   §0 扫描面自检 + 列表行的几何
 *   §1 严格首次：**真实鼠标双击**首行（连点两下）→ 高频采样 hash/视图 + 导航序列 +
 *      **点击链路追踪**（第 2 击的 mousedown/mouseup/click 究竟打在谁身上）
 *   §2 对照：**真实鼠标单击**首行（另一篇）→ 必须稳在编辑器（证明单击链路清白）
 *   §3 简介页几何：行坐标上此时站着谁、返回芯片的 rect（H1 的几何判据）
 *
 * 用法（**必须与 Edge 同一次前台 bash**；profile 用 Windows 形态路径）：
 *   CDP_PORT=9444 node .workbuddy/artifacts/cdp-repro-kb-note-bounce.mjs
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

const info = (s) => console.log('   · ' + s)
const head = (s) => console.log('\n===== ' + s + ' =====')

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}
const ready = (cdp, tries = 200) => waitFor(cdp,
  `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`,
  { tries, ms: 500, label: '应用外壳' })

/** 导航事件序列（包裹 pushState/replaceState —— 本仓切视图走 pushState，不触发 hashchange） */
const NAV_HOOK = `(() => {
  if (!window.__navHooked) {
    window.__navHooked = true
    const rec = (via) => { try { window.__navSeq.push({ h: location.hash, t: Math.round(performance.now()), via }) } catch {} }
    window.addEventListener('hashchange', () => rec('hashchange'))
    window.addEventListener('popstate', () => rec('popstate'))
    const op = history.pushState.bind(history)
    history.pushState = function (...a) { op(...a); rec('pushState') }
    const or = history.replaceState.bind(history)
    history.replaceState = function (...a) { or(...a); rec('replaceState') }
  }
  window.__navSeq = [{ h: location.hash, t: Math.round(performance.now()), via: 'init' }]
  return true
})()`

/** 点击链路追踪：把每一次 mousedown/up 与 click 的目标记下来（判「谁收到了第 2 击」） */
const CLICK_HOOK = `(() => {
  window.__clickTrace = []
  if (!window.__clickTraceHooked) {
    window.__clickTraceHooked = true
    const desc = (el) => {
      if (!el || !el.tagName) return 'null'
      const raw = (el.className && el.className.toString ? el.className.toString() : '') || ''
      return el.tagName + (raw ? '.' + raw.split(/\\s+/).slice(0, 2).join('.') : '')
    }
    const rec = (type) => (e) => {
      const t = e.target
      window.__clickTrace.push({
        type, t: Math.round(performance.now()),
        el: desc(t).slice(0, 60),
        chip: !!(t && t.closest && t.closest('.aurora-editor__return')),
        row: !!(t && t.closest && t.closest('.aurora-kb-recent__item')),
      })
    }
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click', 'pointerup']) {
      document.addEventListener(type, rec(type), true)
    }
  }
  return true
})()`

const SNAP = `(() => {
  const active = [...document.querySelectorAll('.aurora-kb-subbar-tabs [role="tab"]')]
    .filter(x => x.getAttribute('aria-selected') === 'true')
    .map(x => (x.textContent || '').trim())
  const brief = document.querySelector('.aurora-brief')
  const chip = document.querySelector('button.aurora-editor__return')
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } }
  return {
    hash: location.hash,
    brief: !!brief,
    editorPanel: document.querySelectorAll('.aurora-editor').length,
    kbPanel: document.querySelectorAll('.aurora-kb').length,
    kbActiveTab: active,
    briefTitle: brief ? ((brief.textContent || '').trim().slice(0, 26)) : null,
    chipRect: r(chip),
    chipText: chip ? (chip.textContent || '').trim() : null,
  }
})()`

/** 进入知识库详情页（侧栏 → 首张卡片），并就绪等库名 */
async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 4; a++) {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1200); continue }
    await cdp.eval(`(() => { const cs = [...document.querySelectorAll('.aurora-kb-kbcard')]; const c = cs.find(x => (x.textContent||'').includes('使用文档')) || cs[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) return true
  }
  return false
}

/** 概览 Tab 首行（最近活动）的 rect + 池内行数 */
const ROW_RECT = `(() => {
  const rows = [...document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item')]
  const r = rows[0]
  if (!r) return null
  const b = r.getBoundingClientRect()
  return {
    n: rows.length,
    name: (r.textContent || '').trim().slice(0, 20),
    rect: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) },
    cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
})()`

/** 真实鼠标双击（两下，clickCount 1→2，同坐标） */
async function realClicks(cdp, x, y, clicks = 2) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await sleep(70)
  for (let i = 1; i <= clicks; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: i })
    await sleep(45)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: i })
    if (i < clicks) await sleep(85)   // 双击节奏
  }
}

/** 高频采样：捕捉「跳过去又被弹回」的中间态 */
async function sampleFor(cdp, ms, step = 60) {
  const seq = []
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const s = await cdp.eval(`({ h: location.hash, brief: document.querySelectorAll('.aurora-brief').length, kb: document.querySelectorAll('.aurora-kb').length })`)
    seq.push(`${s.h.replace('#view=', '')}|b${s.brief}|k${s.kb}`)
    await sleep(step)
  }
  // 压缩连续重复
  const out = []
  for (const s of seq) if (out[out.length - 1] !== s) out.push(s)
  return out
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 target；targets:\n' + list.map((t) => t.url).join('\n')); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__logs = [] })()` })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  const reloadUrl = `${BASE}/?_p=bounce-${Date.now()}#view=editor`
  await cdp.send('Page.navigate', { url: reloadUrl })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  head('0. 自检（扫描面非空 + 真实重载）')
  info(`外壳就位=${rdy >= 0} sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  info(`真实重载=${await cdp.eval('Array.isArray(window.__logs)')}（false ⇒ 结论不可信）`)
  if (!(rdy >= 0 && surface.sidebarItems > 0)) { console.error('❌ 扫描面为空，退出'); process.exit(4) }

  // 首启播种就位（冷 profile 需要；热 profile 已是既成事实）
  const seeded = await waitFor(cdp, `(async () => {
    const all = await new Promise((res) => { const q = indexedDB.open('markcraft'); q.onsuccess = () => { const d = q.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); res(r || []) } }; q.onerror = () => res([]) })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500, label: '播种' })
  info(`知识库播种就位=${seeded >= 0}`)
  await sleep(600)

  // ══ §1 严格首次：双击首行 ══
  head('1. 严格首次（全新页面，未点过任何笔记）· 真实鼠标【双击】概览「最近活动」首行')
  await enterKbDetail(cdp)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { tries: 40, ms: 400, label: '最近活动行' })
  const row = await cdp.eval(ROW_RECT)
  info(`首行 = 「${row?.name}」 rect=${JSON.stringify(row?.rect)} 行数=${row?.n} viewport=${JSON.stringify(row?.viewport)}`)
  info(`起手态: ${JSON.stringify(await cdp.eval(SNAP))}`)

  await cdp.eval(NAV_HOOK); await cdp.eval(CLICK_HOOK)
  await realClicks(cdp, row.cx, row.cy, 2)
  const traj1 = await sampleFor(cdp, 1400)
  const nav1 = await cdp.eval('window.__navSeq')
  const trace1 = await cdp.eval('window.__clickTrace')
  const after1 = await cdp.eval(SNAP)
  info(`§1 高频轨迹(压缩) = ${JSON.stringify(traj1)}`)
  info(`§1 导航序列 = ${JSON.stringify(nav1.map(x => x.h.replace('#view=', '') + '@' + x.via))}`)
  info(`§1 点击链路 = ${JSON.stringify(trace1.map(x => `${x.type}:${x.el}${x.chip ? '[芯片]' : ''}${x.row ? '[列表行]' : ''}`))}`)
  info(`§1 稳态 = ${JSON.stringify(after1)}`)

  // ══ §3 简介页几何：行坐标上站着谁 ══
  const geo = await cdp.eval(`(() => {
    const chip = document.querySelector('button.aurora-editor__return')
    const bar = document.querySelector('.aurora-editor__returnbar')
    const br = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } }
    const top = document.elementFromPoint(${row.cx}, ${row.cy})
    const desc = (el) => !el ? 'null' : el.tagName + '.' + String(el.className || '').split(/\\s+/).slice(0,2).join('.')
    return { chip: br(chip), bar: br(bar), chipText: chip ? (chip.textContent||'').trim() : null,
             atRowPoint: desc(top), atRowIsChip: !!(top && top.closest && top.closest('.aurora-editor__return')) }
  })()`)
  head('3. 简介页几何（H1 判据：行坐标上是否站着返回芯片）')
  info(`返回栏 rect = ${JSON.stringify(geo.bar)}`)
  info(`返回芯片 rect = ${JSON.stringify(geo.chip)} 文案=${JSON.stringify(geo.chipText)}`)
  info(`行坐标(${row.cx},${row.cy}) 上站着 = ${geo.atRowPoint}（是芯片=${geo.atRowIsChip}）`)
  const overlap = geo.chip && row.rect && row.rect.y < geo.chip.y + geo.chip.h && geo.chip.y < row.rect.y + row.rect.h
  info(`几何判据：行 y 带=[${row.rect?.y},${(row.rect?.y ?? 0) + (row.rect?.h ?? 0)}] 芯片 y 带=[${geo.chip?.y},${(geo.chip?.y ?? 0) + (geo.chip?.h ?? 0)}] 重叠=${overlap}`)

  // ══ §2 对照：真实鼠标【单击】首行（另一篇） ══
  head('2. 对照 · 真实鼠标【单击】同一列表首行 → 必须稳在编辑器')
  await enterKbDetail(cdp)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { tries: 40, ms: 400, label: '最近活动行' })
  const row2 = await cdp.eval(ROW_RECT)
  info(`起手：首行 = 「${row2?.name}」（注意：走完 §1 后顺序可能变化）`)
  await cdp.eval(NAV_HOOK); await cdp.eval(CLICK_HOOK)
  await realClicks(cdp, row2.cx, row2.cy, 1)
  const traj2 = await sampleFor(cdp, 1000)
  const nav2 = await cdp.eval('window.__navSeq')
  const trace2 = await cdp.eval('window.__clickTrace')
  info(`§2 高频轨迹 = ${JSON.stringify(traj2)}`)
  info(`§2 导航序列 = ${JSON.stringify(nav2.map(x => x.h.replace('#view=', '') + '@' + x.via))}`)
  info(`§2 点击链路 = ${JSON.stringify(trace2.map(x => `${x.type}:${x.el}`))}`)
  info(`§2 稳态 = ${JSON.stringify(await cdp.eval(SNAP))}`)

  head('结论判定')
  const bounced1 = nav1.map(x => x.h).some((h, i, a) => h === '#view=kb' && a.slice(0, i).includes('#view=editor'))
  info(`§1 双击：出现 editor→kb 弹回 = ${bounced1}；终态 hash=${after1.hash} brief=${after1.brief} kbTab=${JSON.stringify(after1.kbActiveTab)}`)
  const chipHit = trace1.some(x => x.chip && (x.type === 'click' || x.type === 'mousedown'))
  info(`§1 第 2 击是否打到返回芯片 = ${chipHit}`)
  const errs = cdp.pageErrors.filter(x => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  info(`页面错误 = ${errs.length} ${errs.length ? JSON.stringify(errs.slice(0, 3)) : ''}`)
  ws.close()
  process.exit(0)
}

main().catch((err) => { console.error('探针异常：', err?.message || err); process.exit(3) })
