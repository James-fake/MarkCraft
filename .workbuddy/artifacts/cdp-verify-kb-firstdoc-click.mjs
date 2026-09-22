/**
 * CDP 真机探针 · **点「00 开始使用.md」会回到知识库详情页**（2026-09-22 报障）
 * ==========================================================================
 * 报障原话：「只有第一篇 00 开始使用.md 点击后会回到知识库详细界面」。
 *
 * 与前一条探针（cdp-verify-kb-note-open.mjs）的分工：
 *   · 那条验的是「概览/笔记两条列表的行**是否接线**」→ 已修复；
 *   · 本条验的是「**某一份特定笔记**点击后是否被弹回」→ 症状只出现在第一篇，
 *     故必须**逐篇对照**（第一篇 / 第二篇 / 对照），并逐帧记录**导航事件序列**，
 *     以区分：
 *       ① 压根没跳（还停在 kb）；
 *       ② 跳了编辑器又**被弹回** kb（=> 序列里会看到 editor → kb 两跳）。
 *
 * 关键设计（为什么不是简单点一下看 hash）：
 *   · 在页面内装 `hashchange` / `popstate` 监听，把**每一次** hash 变化记进
 *     `window.__navSeq` —— 单点采样会漏掉「跳过去又被弹回」的中间态；
 *   · 逐帧（0→4000ms）采样 hash / 编辑器是否挂载 / 知识库面板是否还在；
 *   · 打印页面内 console 日志与页面错误，看是否留痕；
 *   · 按**文件名**定位行（不按下标，也不按 id）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**）：
 *   node .workbuddy/artifacts/cdp-verify-kb-firstdoc-click.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const TARGET_DOC = process.env.DOC || '00 开始使用.md'   // 报障篇
const CONTROL_DOC = process.env.DOC2 || '01 界面布局.md'  // 对照篇

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

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log(`   · ${s}`)

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

const ED = '.cm-content, .ProseMirror'

/**
 * 导航序列注入器（幂等）。
 * ⚠️ 本仓 `viewState.ts` 切视图走 **`history.pushState`** —— 它**不触发** `hashchange`/`popstate`。
 * 只监听那两个事件 ⇒ `__navSeq` 永远只剩初值，**「跳了又被弹回」100% 查不到**（本轮实测踩到）。
 * 必须直接包裹 pushState / replaceState。
 */
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
  window.__navSeq = []
  window.__navSeq.push({ h: location.hash, t: Date.now(), via: 'init' })
  return true
})()`

const SNAP = `({
  hash: location.hash,
  editor: !!document.querySelector(${JSON.stringify(ED)}),
  kbPanel: document.querySelectorAll('.aurora-kb').length,
  kbName: ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''),
})`

const CLICK_KB_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
  if (e) e.click()
  return !!e
})()`

/**
 * 进知识库详情页（管理页 → 点第一张卡片），并就绪等库名解析。
 * 带 3 次重试：热 profile 下应用挂载时机明显更晚，一次「点侧栏 → 等卡片」会整段空跑
 * （本轮实测：section 1 卡片超时、section B 同一条函数却成功 ⇒ 纯粹是就绪时序）。
 */
async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cdp.eval(CLICK_KB_SIDEBAR)
    const cards = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 })
    if (cards < 0) { info(`enterKbDetail 第 ${attempt} 次：管理页卡片未出现（应用可能尚未挂载）`); await sleep(1200); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    const named = await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 })
    if (named >= 0) { if (attempt > 1) info(`enterKbDetail 第 ${attempt} 次成功`); return named }
  }
  return -1
}

/** 切到「笔记」Tab */
async function openNotesTab(cdp) {
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
      .find(x => (x.textContent || '').includes('笔记'))
    if (t) t.click(); return !!t
  })()`)
  return waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400, label: '笔记 tab' })
}

/** 按文件名定位行（不按下标） */
const rowByDoc = (docName, scope = '') => `(() => {
  const rows = [...document.querySelectorAll(${JSON.stringify(scope)} ? ${JSON.stringify(scope)} + ' .aurora-kb-recent__item' : '.aurora-kb-recent__item')]
  return rows.find(r => (r.textContent || '').includes(${JSON.stringify(docName)})) || null
})()`

/**
 * 命中测试：**首行中心点**上到底站着谁。
 * 为什么必须有：上一轮那条绿灯探针的主判定用 `element.click()`，它**不经命中测试** ——
 * 元素被任何东西盖住（sticky 头 / backdrop / 伪元素 / 溢出的浮层）它照样能"点到"，
 * 于是「真实鼠标点不到」这类问题会**假绿**。这里是唯一能验出"被盖住"的手段。
 */
async function hitInfo(cdp, docName, scope) {
  return cdp.eval(`(() => {
    const r = ${rowByDoc(docName, scope)}
    if (!r) return { found: false }
    const rect = r.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const top = document.elementFromPoint(cx, cy)
    const cs = getComputedStyle(r)
    const cls = (el) => (el && el.className && el.className.toString ? el.className.toString().slice(0, 90) : '')
    return {
      found: true,
      cls: cls(r),
      role: r.getAttribute('role'),
      interactive: r.classList.contains('is-interactive'),
      rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
      center: { x: Math.round(cx), y: Math.round(cy) },
      cursor: cs.cursor,
      pe: cs.pointerEvents,
      topTag: top ? top.tagName : null,
      topCls: cls(top),
      topInsideRow: top ? r.contains(top) : null,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    }
  })()`)
}

/**
 * 点某篇 → 记录**导航事件序列** + 逐帧轨迹。
 * 用 element.click()（纯 DOM，不经窗口激活）—— 本探针验的是"点了之后会不会被弹回"，
 * 不是"合成鼠标能否送达"，故用最可靠的那条（真实鼠标送达性已由另一条探针单独验过）。
 */
async function clickDocAndTrace(cdp, docName, scope, label) {
  const before = await cdp.eval('location.hash')
  const hit = await hitInfo(cdp, docName, scope)
  info(`${label}：命中测试 = ${JSON.stringify(hit)}`)
  const found = await cdp.eval(`(() => {
    const r = ${rowByDoc(docName, scope)}
    return r ? (r.textContent || '').trim().slice(0, 40) : null
  })()`)
  info(`${label}：找到行 = ${JSON.stringify(found)}（目标「${docName}」），before hash=${before}`)

  // 重置导航事件序列（挂钩 pushState/replaceState —— 见 NAV_HOOK 注释）
  await cdp.eval(NAV_HOOK)

  const clicked = await cdp.eval(`(() => { const r = ${rowByDoc(docName, scope)}; if (!r) return false; r.click(); return true })()`)

  const traj = []
  const t0 = Date.now()
  for (const ms of [0, 30, 100, 300, 600, 1200, 2500, 4000]) {
    const elapsed = Date.now() - t0
    if (ms > elapsed) await sleep(ms - elapsed)
    traj.push({ t: ms, ...(await cdp.eval(SNAP)) })
  }
  const navSeq = await cdp.eval('window.__navSeq || []')
  return { before, found, clicked, traj, navSeq, hit }
}

/**
 * **真实鼠标**点某行中心（走完整命中测试链：命中者不是该行时，事件被投给了别人）。
 * 与用户的真实动作等价 —— 这是 `element.click()` 覆盖不到的那一层。
 */
async function mouseClickDocAndTrace(cdp, docName, scope, label) {
  const before = await cdp.eval('location.hash')
  const hit = await hitInfo(cdp, docName, scope)
  if (!hit.found) return { before, hit, traj: [], navSeq: [] }
  const { x, y } = hit.center

  await cdp.eval(NAV_HOOK)

  // 窗口激活会吞掉最早的一次鼠标事件（CDP 铁律 2）→ 先空移两次热身，再按
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await sleep(80)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 1, y: y + 1, buttons: 0 })
  await sleep(80)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await sleep(80)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 })
  await sleep(60)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 })

  const traj = []
  const t0 = Date.now()
  for (const ms of [0, 60, 200, 600, 1500, 3000]) {
    const elapsed = Date.now() - t0
    if (ms > elapsed) await sleep(ms - elapsed)
    traj.push({ t: ms, ...(await cdp.eval(SNAP)) })
  }
  const navSeq = await cdp.eval('window.__navSeq || []')
  const hover = await cdp.eval(`(() => {
    const r = ${rowByDoc(docName, scope)}
    if (!r) return null
    return r.matches(':hover')
  })()`)
  info(`${label}：真实鼠标 hover 命中该行 = ${hover}`)
  return { before, hit, traj, navSeq }
}

const CHIP_INFO = `(() => {
  const chip = document.querySelector('.aurora-editor__return')
  const bar = document.querySelector('.aurora-editor__returnbar')
  const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }
  return { chip: rectOf(chip), bar: rectOf(bar), text: chip ? (chip.textContent || '').trim() : null }
})()`

/** 读「某坐标上站着谁」—— 判「第 2 击会打到哪」的唯一手段 */
const landingAt = (x, y) => `(() => {
  const el = document.elementFromPoint(${x}, ${y})
  if (!el) return null
  const cls = (n) => (n && n.className && n.className.toString ? n.className.toString().slice(0, 70) : '')
  const path = []
  let n = el
  for (let i = 0; i < 5 && n; i++) { path.push(n.tagName + (cls(n) ? '.' + cls(n) : '')); n = n.parentElement }
  return { tag: el.tagName, cls: cls(el), path, isReturnChip: !!(el.closest && el.closest('.aurora-editor__return')) }
})()`

/**
 * 「第 2 击落点」确定性验证（**不用合成鼠标**，避免坑 T 的时送时不送）。
 *
 * 机制假设：`.aurora-editor__returnbar`（「← 返回 XX」芯片）是常规流里插在
 * `.aurora-editor__layout` **上方**的块 ⇒ 它占据编辑器内容区**顶部**，
 * 与「笔记」列表**首行**处于同一水平带。于是：
 *   第 1 击把视图切到编辑器 → 第 2 击落在同一坐标 → 压中芯片 →
 *   handleReturnToSource() → nav('kb', kbId) → 立刻回到知识库详情页。
 * 第 2 行在更下方 → 压不到芯片 → 「只有第一篇」由此成立。
 *
 * 做法：第 1 击用 DOM click（必达）；然后**读同一坐标的 elementFromPoint**，
 * 直接对那个元素 click（必达）—— 等价于用户的第二次点击，但不依赖鼠标送达。
 */
async function secondClickProbe(cdp, docName, scope, label, dx = 60) {
  const hit = await hitInfo(cdp, docName, scope)
  if (!hit.found) return { hit, clickPoint: null, landing: null, chip: null, second: null, traj: [], navSeq: [] }
  const x = Math.round(hit.rect.x + dx)
  const y = hit.center.y

  await cdp.eval(NAV_HOOK)
  // —— 第 1 击：DOM click（不经窗口激活，保证送达）——
  await cdp.eval(`(() => { const r = ${rowByDoc(docName, scope)}; if (r) r.click(); return !!r })()`)
  await sleep(700)

  const landing = await cdp.eval(landingAt(x, y))
  const chip = await cdp.eval(CHIP_INFO)
  info(`${label}：行 rect=${JSON.stringify(hit.rect)} 点击点=(${x},${y})`)
  info(`${label}：切换后同坐标命中者 = ${landing?.tag}.${landing?.cls}（压中返回芯片=${landing?.isReturnChip}）`)
  info(`${label}：芯片 rect=${JSON.stringify(chip?.chip)} 文案=${JSON.stringify(chip?.text)}`)

  // —— 第 2 击：对同一坐标的元素 click（复刻用户第二次点击）——
  const second = await cdp.eval(`(() => {
    const el = document.elementFromPoint(${x}, ${y})
    if (!el) return { ok: false }
    const isChip = !!(el.closest && el.closest('.aurora-editor__return'))
    el.click()
    return { ok: true, tag: el.tagName, cls: (el.className || '').toString().slice(0, 70), isChip }
  })()`)
  info(`${label}：第 2 击目标 = ${second?.tag}.${second?.cls}（是芯片=${second?.isChip}）`)

  const traj = []
  const t0 = Date.now()
  for (const ms of [0, 60, 200, 600, 1500, 3000]) {
    const elapsed = Date.now() - t0
    if (ms > elapsed) await sleep(ms - elapsed)
    traj.push({ t: ms, ...(await cdp.eval(SNAP)) })
  }
  const navSeq = await cdp.eval('window.__navSeq || []')
  return { hit, clickPoint: { x, y }, landing, chip, second, traj, navSeq }
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
      const fmt = (a) => a.map((x) => {
        if (typeof x === 'string') return x;
        try { return JSON.stringify(x); } catch { return String(x); }
      }).join(' ');
      ['info', 'warn'].forEach((k) => {
        console[k] = (...a) => { try { window.__logs.push(k + ': ' + fmt(a)); } catch {} ; orig[k](...a); };
      });
    })()`,
  })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  // 冷启动：全新 profile 不设播种标记 → 让「使用文档」真实播种（报障对象正是这批内置文档）
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=firstdoc-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')

  console.log('\n=== 0. 就绪 + 播种（扫描面自检）===')
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  ok('应用外壳已挂载且样式表到位（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  ok('确实发生了真实重载（注入钩子生效）', reloaded === true)

  const hadAudience = await cdp.eval(`!!document.querySelector('.aurora-audience')`)
  if (hadAudience) {
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-audience')
      const btn = el && [...el.querySelectorAll('button')].find(b => /开始|跳过|继续/.test(b.textContent || ''))
      if (btn) btn.click(); else if (el) el.remove()
      return true
    })()`)
    await sleep(400)
  }
  info('首启引导浮层 = ' + (hadAudience ? '存在，已关闭' : '不存在'))

  // 等播种落库：kb-list 有 1 条，且文档文件夹里有 16+ 篇
  const seeded = await waitFor(
    cdp,
    `(async () => {
      const all = await new Promise((resolve) => {
        const req = indexedDB.open('markcraft')
        req.onsuccess = () => {
          const d = req.result
          const g = d.transaction('kv','readonly').objectStore('kv').getAll()
          g.onsuccess = () => { const r = g.result; d.close(); resolve(r || []) }
        }
        req.onerror = () => resolve([])
      })
      const kv = {}
      for (const r of all) kv[r.key] = r.value
      let list = []
      try { list = JSON.parse(kv['kb-list'] || '[]') } catch {}
      return list.length > 0
    })()`,
    { tries: 60, ms: 500, label: '使用文档知识库播种' },
  )
  await sleep(1500)
  ok('「使用文档」知识库已播种（数据面非空）', seeded >= 0)

  // ⚠️ 冷 / 热 profile 的挂载时机不同（热 profile 实测更晚）：取样前必须**再确认一次外壳就位**，
  //    否则后面 A 段会在「应用还没挂载」的空文档上跑，产出「零命中」型无效结果（本轮实测踩到）。
  const rdy2 = await ready(cdp)
  const surface2 = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  ok('（补测）此刻应用外壳确已挂载 —— 后续断言才可信',
    rdy2 >= 0 && surface2.sidebarItems > 0,
    `sidebarItems=${surface2.sidebarItems} styleSheets=${surface2.sheets} rdy2=${rdy2}`)

  console.log('\n=== 1. 进详情页 → 列出库内笔记（确认报障篇在列）===')
  await enterKbDetail(cdp)
  // 概览是默认 tab；派生数据（最近活动）要等渲染，读之前必须等行出现
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { tries: 40, ms: 400, label: '概览·最近活动行' })
  const kbName = await cdp.eval(`((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`)
  info('库名 = ' + JSON.stringify(kbName))

  // —— A：概览「最近活动」第一行 ——
  console.log('\n=== A. 概览「最近活动」里的「' + TARGET_DOC + '」===')
  const recentRows = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item')].map(e => (e.textContent || '').trim().slice(0, 24))`)
  info('最近活动行 = ' + JSON.stringify(recentRows))
  const recentFirst = recentRows[0] || ''
  ok('「最近活动」首行确实是报障篇（起手区判定，别测错对象）',
    recentFirst.includes(TARGET_DOC.replace(/\.md$/, '')),
    `首行="${recentFirst}" 期望含「${TARGET_DOC}」`)

  if (recentFirst.includes(TARGET_DOC.replace(/\.md$/, ''))) {
    const a = await clickDocAndTrace(cdp, TARGET_DOC, '.aurora-kb-card--recent', 'A 概览首行')
    info('A 导航事件序列 = ' + JSON.stringify(a.navSeq))
    info('A 轨迹 = ' + JSON.stringify(a.traj))
    const last = a.traj[a.traj.length - 1]
    ok('A：点「' + TARGET_DOC + '」落在编辑器且 4s 稳态（报障点）',
      last.hash === '#view=editor' && last.editor === true,
      `稳态 hash=${last.hash} editor=${last.editor} kbPanel=${last.kbPanel} kbName="${last.kbName}"`)
    // 「跳了又被弹回」会表现为序列里出现 editor 之后又出现 kb
    const seq = a.navSeq.map((x) => x.h)
    const bounced = seq.some((h, i) => h === '#view=kb' && seq.slice(0, i).includes('#view=editor'))
    ok('A：没有被弹回知识库（导航序列中 editor 之后未再出现 kb）', !bounced, `序列=${JSON.stringify(seq)}`)
    // 命中测试：真实鼠标能不能落到这一行上（element.click() 验不到这层）
    ok('A：首行中心点的命中者**在行内**（未被上层元素盖住 / 未被指针穿透）',
      a.hit?.topInsideRow === true,
      `命中者=${a.hit?.topTag}.${a.hit?.topCls} | 行 cls="${a.hit?.cls}" interactive=${a.hit?.interactive} cursor=${a.hit?.cursor} pe=${a.hit?.pe} | rect=${JSON.stringify(a.hit?.rect)} vp=${JSON.stringify(a.hit?.viewport)}`)
    ok('A：首行确实被标成可交互行（.is-interactive + role=button）',
      a.hit?.interactive === true && a.hit?.role === 'button',
      `interactive=${a.hit?.interactive} role=${a.hit?.role}`)
  }

  // —— A2：**真实鼠标**点同一行（与用户实际动作等价）——
  console.log('\n=== A2. 真实鼠标点概览首行「' + TARGET_DOC + '」===')
  await enterKbDetail(cdp)
  // 让鼠标先落到别处再进面板，避免上一次 click 残留的 hover 影响
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, buttons: 0 })
  await sleep(120)
  const a2 = await mouseClickDocAndTrace(cdp, TARGET_DOC, '.aurora-kb-card--recent', 'A2 真实鼠标')
  info('A2 导航事件序列 = ' + JSON.stringify(a2.navSeq.map((x) => x.h)))
  info('A2 轨迹 = ' + JSON.stringify(a2.traj))
  const lastA2 = a2.traj[a2.traj.length - 1]
  ok('A2：真实鼠标点首行后落在编辑器（＝用户报障的判定点）',
    !!lastA2 && lastA2.hash === '#view=editor' && lastA2.editor === true,
    lastA2 ? `稳态 hash=${lastA2.hash} editor=${lastA2.editor} kbPanel=${lastA2.kbPanel}` : 'no traj')

  // —— B：笔记 Tab 里的两篇（报障篇 vs 对照篇）——
  console.log('\n=== B. 笔记 Tab：报障篇 vs 对照篇 逐篇对照 ===')
  await enterKbDetail(cdp)
  await openNotesTab(cdp)
  const notesRows = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')].map(e => (e.textContent || '').trim().slice(0, 24))`)
  info('前 5 行 = ' + JSON.stringify(notesRows.slice(0, 5)))
  ok('笔记 Tab 行数 ≥ 2（可做对照）', notesRows.length >= 2, `rows=${notesRows.length}`)

  const b1 = await clickDocAndTrace(cdp, TARGET_DOC, '.aurora-kb-notes', 'B1 报障篇')
  info('B1 导航事件序列 = ' + JSON.stringify(b1.navSeq.map((x) => x.h)))
  info('B1 轨迹 = ' + JSON.stringify(b1.traj))

  await enterKbDetail(cdp)
  await openNotesTab(cdp)
  const b2 = await clickDocAndTrace(cdp, CONTROL_DOC, '.aurora-kb-notes', 'B2 对照篇')
  info('B2 导航事件序列 = ' + JSON.stringify(b2.navSeq.map((x) => x.h)))
  info('B2 轨迹 = ' + JSON.stringify(b2.traj))

  const lastB1 = b1.traj[b1.traj.length - 1]
  const lastB2 = b2.traj[b2.traj.length - 1]
  ok('B：报障篇与对照篇终态**一致**（报障时两者会有差异）',
    lastB1.hash === lastB2.hash && lastB1.editor === lastB2.editor,
    `${TARGET_DOC}: hash=${lastB1.hash} editor=${lastB1.editor} | ${CONTROL_DOC}: hash=${lastB2.hash} editor=${lastB2.editor}`)
  ok('B：两篇的**命中测试**结果一致（报障篇=列表第 1 行／对照篇=第 2 行）',
    b1.hit?.topInsideRow === b2.hit?.topInsideRow,
    `${TARGET_DOC}: topInsideRow=${b1.hit?.topInsideRow} top=${b1.hit?.topTag}.${b1.hit?.topCls} | ${CONTROL_DOC}: topInsideRow=${b2.hit?.topInsideRow} top=${b2.hit?.topTag}.${b2.hit?.topCls}`)

  // —— C：第 2 击落点（用户「连点两下」/ 双击）——
  // 单击链路已证清白（A/B 段），但**「单击」正是探针的系统性盲点**：
  // 打开文件常是连点两下 —— 第 1 击切到编辑器后，第 2 击落在同一坐标，
  // 若那里是「← 返回来源」芯片（`.aurora-editor__returnbar` 常规流插在内容区上方），
  // 就会立刻 nav('kb', kbId) 弹回知识库详情页 = 报障症状。
  // 「只有第一篇」的候选解释：只有列表**首行**的 y 与芯片同带。
  console.log('\n=== C. 第 2 击落在编辑器的哪里？（返回芯片是否压在首行坐标上）===')
  await enterKbDetail(cdp)
  await openNotesTab(cdp)
  const c1 = await secondClickProbe(cdp, TARGET_DOC, '.aurora-kb-notes', 'C1 笔记首行（报障篇）')
  info('C1 导航序列 = ' + JSON.stringify(c1.navSeq.map((x) => x.h)))
  info('C1 轨迹 = ' + JSON.stringify(c1.traj))

  await enterKbDetail(cdp)
  await openNotesTab(cdp)
  const c2 = await secondClickProbe(cdp, CONTROL_DOC, '.aurora-kb-notes', 'C2 笔记第二行（对照）')
  info('C2 导航序列 = ' + JSON.stringify(c2.navSeq.map((x) => x.h)))
  info('C2 轨迹 = ' + JSON.stringify(c2.traj))

  const lastC1 = c1.traj[c1.traj.length - 1]
  const lastC2 = c2.traj[c2.traj.length - 1]

  // 几何判据：芯片的 y 带是否与各行的 y 带重叠 —— 这是「只有第一篇」的核心证据
  const yOverlap = (row, chipBox) =>
    !!row && !!chipBox && row.y < chipBox.y + chipBox.h && chipBox.y < row.y + row.h
  info('几何对照：首行 y 带=[' + c1.hit?.rect?.y + ',' + (c1.hit?.rect?.y + c1.hit?.rect?.h) + '] ' +
    '第2行 y 带=[' + c2.hit?.rect?.y + ',' + (c2.hit?.rect?.y + c2.hit?.rect?.h) + '] ' +
    '芯片 y 带=[' + c1.chip?.chip?.y + ',' + (c1.chip?.chip?.y + c1.chip?.chip?.h) + ']')
  ok('C（几何判据）：首行坐标带与返回芯片**垂直重叠**',
    yOverlap(c1.hit?.rect, c1.chip?.chip),
    `首行=${JSON.stringify(c1.hit?.rect)} 芯片=${JSON.stringify(c1.chip?.chip)}`)
  ok('C（几何对照）：第 2 行坐标带与返回芯片**不重叠**（这才解释"只有第一篇"）',
    !yOverlap(c2.hit?.rect, c1.chip?.chip),
    `第2行=${JSON.stringify(c2.hit?.rect)} 芯片=${JSON.stringify(c1.chip?.chip)}`)

  ok('C（报障复现）：第 2 击打在首行同一坐标 → 视图被弹回知识库详情页',
    lastC1?.hash === '#view=kb' && (lastC1?.kbPanel ?? 0) > 0,
    `第1行稳态 hash=${lastC1?.hash} kbPanel=${lastC1?.kbPanel} editor=${lastC1?.editor} ｜ 第2击目标=${c1.second?.tag}.${c1.second?.cls} 是芯片=${c1.second?.isChip}`)
  ok('C（关键对照）：第 2 行同一动作**不**被弹回（仍在编辑器）',
    lastC2?.hash === '#view=editor',
    `第2行稳态 hash=${lastC2?.hash} editor=${lastC2?.editor} ｜ 第2击目标=${c2.second?.tag}.${c2.second?.cls} 是芯片=${c2.second?.isChip}`)
  ok('C：返回芯片确实存在（由 openInEditor 写入 editorReturn 单例）',
    !!c1.chip?.chip,
    `chip=${JSON.stringify(c1.chip?.chip)} 文案=${JSON.stringify(c1.chip?.text)}`)

  const pageLogs = await cdp.eval('(Array.isArray(window.__logs) ? window.__logs : [])')
  const relLogs = pageLogs.filter((l) => /kb|nav|doc|seed|播种|hydrat/i.test(l))
  info('页面内相关日志条数 = ' + relLogs.length + (relLogs.length ? '：' + JSON.stringify(relLogs.slice(-12)) : ''))

  console.log('\n=== 2. 页面错误 ===')
  const errs = cdp.pageErrors.filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e))
  info('错误条数 = ' + errs.length + (errs.length ? '：' + JSON.stringify(errs.slice(0, 5)) : ''))

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) { console.log('未通过：'); failed.forEach((f) => console.log('  ❌ ' + f.name)) }
  ws.close()
  process.exit(0) // 本条是**诊断型**探针：结论看输出，不以断言数决定退出码
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
