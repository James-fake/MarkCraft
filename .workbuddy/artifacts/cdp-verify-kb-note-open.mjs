/**
 * CDP 真机探针 · **点击知识库笔记 → 必须进编辑器**（2026-09-21 用户报障）
 * =====================================================================
 * 报障原话：「点击知识库中的笔记，没有跳转至编辑页面，而是直接回到知识库详细页面」。
 *
 * 根因（源码定论）：知识库详情页里有**两份外观同款**的文件行（同一类名
 * `.aurora-kb-recent__item`）：
 *   · 「笔记」Tab 那份接了 onClick → 可点，能进编辑器；
 *   · 进库**默认落地**的「概览 · 最近活动」那份是纯 div（无 onClick/role/tabIndex），
 *     且父容器不是 `.aurora-kb-notes`，连 cursor:pointer 都没有 → 点了毫无反应。
 * 用户看到的就是那份哑列表。
 *
 * 为什么必须单开一条探针（而不是复用 heal 探针）：
 *   上一轮 heal 探针第 4 节**先点了「笔记」Tab 再取行**（等 `.aurora-kb-notes__head-count`），
 *   它测的是**原本就好用的那份列表** → 全绿，于是把用户真实症状判成了"无法复现"。
 *   教训（**铁律 0：先算清楚起手区**）：同款类名出现在多个容器时，必须**逐容器分别测**，
 *   不能随便取 `querySelectorAll(...)[0]`。
 *
 * 本探针的两节 + 一个控制组：
 *   控制组：知识库**管理页**上不得存在 `.aurora-kb-card--recent` / `.aurora-kb-recent__item`
 *           → 证明这两个选择器**有区分能力**（不是恒真），后面的"行数 > 0"才算证据。
 *   A 节：概览「最近活动」行 —— 可交互（cursor:pointer + role=button）且**真实鼠标点击**后跳编辑器。
 *   B 节：笔记 Tab 行 —— 同上（对照：原本可用的路径不得被改坏）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill cdp-ui-interaction-verify 铁律 1）：
 *   node .workbuddy/artifacts/cdp-verify-kb-note-open.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const ONLY = process.env.ONLY || '' // 作用域开关：A / B

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

/** 就绪判据必须与应用同源（skill：别用 #root / .aurora-page，过早为真） */
function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

/** 真实鼠标点击（CSS px，与 devicePixelRatio 无关） */
async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

const centerOf = (sel, idx = 0) => `(() => {
  const el = document.querySelectorAll(${JSON.stringify(sel)})[${idx}]
  if (!el) return null
  el.scrollIntoView({ block: 'center' })
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return null
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
})()`

const ED = '.cm-content, .ProseMirror'
const SNAP = `({
  hash: location.hash,
  editor: !!document.querySelector(${JSON.stringify(ED)}),
  kbPanel: document.querySelectorAll('.aurora-kb').length,
  kbNotes: document.querySelectorAll('.aurora-kb-notes').length,
})`

/**
 * 种子：直接写 IndexedDB 造一个「有 3 篇笔记的知识库」（坑 E：全新 profile 无数据 ⇒ 管理页空态）。
 * 走与 heal 探针同一条成熟路径 —— 介质是 IndexedDB（库 `markcraft` → 表 `kv`），localStorage 只放标记。
 */
const KB_ID = 'kb-noteopen-0001'
const KB_FOLDER = 'kb-noteopen-folder'
function SEED_SQL() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        {
          id: KB_FOLDER, name: '知识库甲', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: [
            f('no-1', '笔记一.md', '# 一'),
            f('no-2', '笔记二.md', '# 二'),
            f('no-3', '笔记三.md', '# 三'),
          ],
        },
        { id: 'other-folder', name: '我的笔记', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true, children: [] },
      ],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  const kbDoc = {
    id: KB_ID, name: '知识库甲', description: '探针种子库',
    folderId: KB_FOLDER, createdAt: T, updatedAt: T,
    canvasIds: [], fileIds: [], rules: [],
  }
  const kbItem = {
    id: KB_ID, name: '知识库甲', description: '探针种子库',
    folderId: KB_FOLDER, fileCount: 3, canvasCount: 0, createdAt: T, updatedAt: T,
  }
  return `(async () => {
    const tree = ${JSON.stringify(tree)}
    const kbDoc = ${JSON.stringify(kbDoc)}
    const kbItem = ${JSON.stringify(kbItem)}
    await new Promise((res) => {
      let req
      try { req = indexedDB.open('markcraft') } catch { res(); return }
      req.onerror = () => res()
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch { d.close(); res(); return }
        const st = tx.objectStore('kv')
        // 先清掉旧知识库文档，否则多轮之间会残留多个库
        const g = st.getAllKeys()
        g.onsuccess = () => {
          ;(g.result || []).filter((k) => String(k).startsWith('kb-doc-')).forEach((k) => st.delete(k))
          st.put({ key: 'markcraft-file-manager', value: JSON.stringify(tree) })
          st.put({ key: 'kb-list', value: JSON.stringify([kbItem]) })
          st.put({ key: 'kb-doc-' + kbDoc.id, value: JSON.stringify(kbDoc) })
        }
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    // 标记「已播种」→ 内置使用文档链路直接跳过，保证 profile 只含探针种子
    localStorage.setItem('markcraft-usage-docs-seeded', '1')
    localStorage.setItem('markcraft-migrated-link-guide', '1')
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    localStorage.setItem('markcraft-link-guide-added', '1')
    return true
  })()`
}

/** 点侧栏「知识库」（该分组可能默认折叠 → 用 element.click()，别用坐标点击） */
const CLICK_KB_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
  if (e) e.click()
  return !!e
})()`

/** 进入某知识库详情页：先到管理页，再点第一张卡片 */
async function enterKbDetail(cdp) {
  await cdp.eval(CLICK_KB_SIDEBAR)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '知识库卡片' })
  await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
  return waitFor(
    cdp,
    `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`,
    { tries: 40, ms: 400, label: '详情页库名' },
  )
}

/**
 * 点行的两种机制 + 兜底顺序（**重要**）：
 *   · 主判定用 `element.click()` —— 纯 DOM API，直接派发 click 事件，
 *     **不经过窗口激活**，因此不受 skill 铁律 2 的「激活吞掉最早鼠标事件」影响；
 *     本探针要验的是「React 链路是否通」（handler 有没有挂上、早退条件有没有挡住），
 *     用它是**正确**的工具，不是偷懒。
 *   · 真实鼠标 `Input.dispatchMouseEvent` 作为兜底/加分项：它在无焦点窗口下会被系统吞掉
 *     （实测同一段代码一轮通、一轮连续 3 轮不通）→ 只用于「真实输入也能打通」的补充证据，
 *     失败时**不得**判成产品 bug（须先跑事件流自检分层，见 0c 节）。
 */
async function clickRowAndTrail(cdp, rowSel, idx = 0, label = '') {
  const before = await cdp.eval('location.hash')
  const total = await cdp.eval(`document.querySelectorAll(${JSON.stringify(rowSel)}).length`)

  const RECT = `(() => {
    const el = document.querySelectorAll(${JSON.stringify(rowSel)})[${idx}]
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
    const hit = document.elementFromPoint(x, y)
    return {
      x, y, w: Math.round(r.width), h: Math.round(r.height),
      inViewport: y > 0 && y < innerHeight && x > 0 && x < innerWidth,
      inside: !!(hit && (hit === el || el.contains(hit) || hit.contains(el))),
      hitCls: hit ? String(hit.className).slice(0, 60) : null,
    }
  })()`

  await cdp.eval(`(() => { const el = document.querySelectorAll(${JSON.stringify(rowSel)})[${idx}]; if (el) el.scrollIntoView({ block: 'center' }); return !!el })()`)
  await sleep(300)
  const pt = await cdp.eval(RECT)

  const didNavigate = async () => (await cdp.eval('location.hash')) !== before

  // 第 1 步：element.click()（主判定 —— 验 React 链路）
  const synthOk = await cdp.eval(`(() => { const e = document.querySelectorAll(${JSON.stringify(rowSel)})[${idx}]; if (!e) return false; e.click(); return true })()`)
  await sleep(300)
  let viaSynth = await didNavigate()

  // 第 2 步：真实鼠标兜底 —— **仅在 element.click() 未生效时才跑**
  // （否则「hash 已变」会让兜底循环在 1 轮内"成功"，把 element.click 的功劳
  //   错误归给真实鼠标 —— 这是本探针早期版本的一处不诚实归因，已修正）
  let viaReal = null
  let rounds = 0
  if (!viaSynth) {
    viaReal = false
    for (let round = 1; round <= 3 && !viaReal; round++) {
      rounds = round
      await cdp.send('Page.bringToFront')
      await cdp.eval('window.focus()')
      const w = await cdp.eval(`(() => {
        const el = document.querySelector('.aurora-kb-subbar__title')
        if (!el) return null
        const r = el.getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return null
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
      })()`)
      if (w) { await realClick(cdp, w.x, w.y); await sleep(100) }
      if (pt && pt.inViewport) await realClick(cdp, pt.x, pt.y)
      await sleep(350)
      viaReal = await didNavigate()
      if (!viaReal && round < 3) info(`${label}：真实鼠标第 ${round} 轮未生效 → 重试`)
    }
  }

  const traj = []
  const t0 = Date.now()
  for (const ms of [0, 50, 200, 600, 1500, 2500]) {
    const elapsed = Date.now() - t0
    if (ms > elapsed) await sleep(ms - elapsed)
    traj.push({ t: ms, ...(await cdp.eval(SNAP)) })
  }
  if (label) {
    info(`${label}：before=${before} 行数=${total} element.click=${synthOk}→${viaSynth} ` +
      `真实鼠标兜底=${viaReal === null ? 'n/a（element.click 已生效）' : `${viaReal}（${rounds} 轮）`}`)
    info(`${label}：落点 = ${JSON.stringify(pt)}`)
  }
  return { before, total, traj, pt: !!pt, viaSynth, viaReal }
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  // 坑 I：host 可能是 127.0.0.1 或 localhost —— 两者都匹配
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
  // 坑 P 判据：注入钩子 → 导航后断言它存在 ⇒ 证明**真的发生了重载**
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__logs = [];' })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  // 第一跳：先把应用跑起来（外壳挂载）—— 启动期的播种/迁移会写库，
  // 必须等它跑完再写种子，否则种子会被覆盖（顺序反了会表现为「种子没生效」）
  console.log('\n=== 0. 启动应用（首跳）===')
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=noteopen-boot-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy0 = await ready(cdp)
  ok('应用外壳已挂载', rdy0 >= 0, `waitIdx=${rdy0}`)

  console.log('\n=== 0b. 写种子 → 强制真实重载（扫描面自检）===')
  await cdp.eval(SEED_SQL())
  // 坑 C：深链只认启动 URL；坑 P：同 URL 不重载 → 一律加唯一 query
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=noteopen-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  ok('应用外壳已挂载且样式表到位（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  ok('确实发生了真实重载（注入钩子生效，排除「同 URL 不重载」假阴性）', reloaded === true,
    `__logs=${JSON.stringify(reloaded)}`)

  // 关掉首启引导浮层（backdrop 会吞掉所有指针事件 → 假阴性第一嫌疑，skill 铁律 2）
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

  console.log('\n=== 1. 控制组：知识库管理页不得存在文件行（证明选择器有区分能力）===')
  await cdp.eval(CLICK_KB_SIDEBAR)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '知识库卡片' })
  const ctrl = await cdp.eval(`({
    cards: document.querySelectorAll('.aurora-kb-kbcard').length,
    recentCards: document.querySelectorAll('.aurora-kb-card--recent').length,
    rows: document.querySelectorAll('.aurora-kb-recent__item').length,
  })`)
  info('管理页 = ' + JSON.stringify(ctrl))
  ok('管理页有知识库卡片（打桩面/数据面非空）', ctrl.cards > 0, `cards=${ctrl.cards}`)
  ok('管理页上「最近活动」卡片与文件行均不存在（选择器非恒真）',
    ctrl.recentCards === 0 && ctrl.rows === 0, `recentCards=${ctrl.recentCards} rows=${ctrl.rows}`)

  console.log('\n=== 2. 进入知识库详情页 → 默认落在「概览」Tab ===')
  await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
  const nameAt = await waitFor(
    cdp,
    `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`,
    { tries: 40, ms: 400, label: '详情页库名' },
  )
  const kbName = await cdp.eval(`((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`)
  ok('详情页库名已解析（非占位「未选择知识库」）', nameAt >= 0, `subbar name="${kbName}"`)

  const overview = await cdp.eval(`({
    recentCard: document.querySelectorAll('.aurora-kb-card--recent').length,
    rows: document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length,
    notesTabMounted: document.querySelectorAll('.aurora-kb-notes').length,
  })`)
  info('概览页 = ' + JSON.stringify(overview))
  ok('落地即「概览」Tab 且「最近活动」卡片存在（这是用户实际看到的面）',
    overview.recentCard === 1, `recentCard=${overview.recentCard}`)
  ok('「最近活动」文件行数 > 0（报障行确实渲染出来了，断言才有对象）',
    overview.rows > 0, `rows=${overview.rows}`)

  // 铁律 8：先分层（① DOM 存在 ② 事件到达 ③ 逻辑早退），再定位。
  // 本节的判定是**条件式**的：合成鼠标没送达（无前台窗口时 Chromium 不派发）时
  // 只记 info 不判失败 —— 那是探针环境限制；但**一旦送达却没跳转**，就是真产品问题。
  console.log('\n=== 0c. 真实鼠标可达性 + 事件流分层（DOM / 事件到达 / handler 挂载）===')
  await cdp.eval(`(() => {
    const push = (t) => () => { try { window.__evt.push(t) } catch {} }
    document.addEventListener('pointerdown', push('doc-pointerdown-capture'), true)
    document.addEventListener('mousedown', push('doc-mousedown-capture'), true)
    document.addEventListener('click', push('doc-click-capture'), true)
    document.addEventListener('click', push('doc-click-bubble'))
    const el = document.querySelector('.aurora-kb-card--recent .aurora-kb-recent__item')
    if (el) {
      el.addEventListener('mousedown', push('row-mousedown-native'), true)
      el.addEventListener('click', push('row-click-native'), true)
      const keys = Object.keys(el).filter((k) => k.startsWith('__reactProps$'))
      window.__reactOnClick = keys.length ? typeof el[keys[0]].onClick : 'no-react-props-key'
    }
    return true
  })()`)
  const diagPt = await cdp.eval(centerOf('.aurora-kb-card--recent .aurora-kb-recent__item'))
  const reactOnClick = await cdp.eval('window.__reactOnClick')
  info('React onClick 类型 = ' + JSON.stringify(reactOnClick) + '（行上确实挂了 handler）')
  let delivered = false
  let navigated = false
  for (let i = 1; i <= 3 && !navigated; i++) {
    await cdp.send('Page.bringToFront')
    await cdp.eval('window.focus()')
    const w = await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-kb-subbar__title')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.width > 0 ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null
    })()`)
    if (w) { await realClick(cdp, w.x, w.y); await sleep(100) } // 惰性唤醒点击
    await cdp.eval('window.__evt = []')
    if (diagPt) await realClick(cdp, diagPt.x, diagPt.y)
    await sleep(450)
    const evt = await cdp.eval('window.__evt')
    const hash = await cdp.eval('location.hash')
    info(`真实鼠标第 ${i} 轮 @(${diagPt?.x},${diagPt?.y})：事件流=${JSON.stringify(evt)} hash=${hash}`)
    if (Array.isArray(evt) && evt.length > 0) delivered = true
    if (hash === '#view=editor') navigated = true
    if (delivered && !navigated) { info('→ 事件已送达但未跳转 = 真·产品问题'); break }
    if (!delivered) info('→ 事件未送达（无前台窗口时 Chromium 不派发合成输入）＝ 探针环境限制，不判产品失败')
  }
  ok('DOM 层：目标行存在且可命中（层 ①）', !!diagPt, `落点=(${diagPt?.x},${diagPt?.y})`)
  ok('React 层：行上确实挂了 onClick（层 ③ 前提成立，非「没接线」）', reactOnClick === 'function',
    `typeof onClick=${JSON.stringify(reactOnClick)}`)
  if (delivered) {
    ok('真实鼠标：事件送达后确实跳转编辑器', navigated, `delivered=${delivered} navigated=${navigated}`)
  } else {
    info('⚠ 本轮合成鼠标全程未送达 → 真实鼠标证据不可得；React 链路改由 A/B 节的 element.click() 验证')
  }

  // 0c 可能已把视图切到编辑器 → 回到知识库详情页，让 A 节与 0c 的结果无关（幂等）
  await enterKbDetail(cdp)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`,
    { tries: 30, ms: 400, label: '回到概览页' })

  if (!ONLY || ONLY === 'A') {
    console.log('\n=== A. 概览「最近活动」行：必须可交互，且真实鼠标点击 → 进编辑器 ===')
    const afford = await cdp.eval(`(() => {
      const el = document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item')[0]
      if (!el) return null
      const cs = getComputedStyle(el)
      return { cursor: cs.cursor, role: el.getAttribute('role'), tabIndex: el.getAttribute('tabindex'), cls: el.className }
    })()`)
    info('首行可交互性 = ' + JSON.stringify(afford))
    ok('概览行 cursor:pointer（修复前为 default —— 无任何可点暗示）', afford?.cursor === 'pointer', `cursor=${afford?.cursor}`)
    ok('概览行 role=button + tabIndex=0（键盘可达）',
      afford?.role === 'button' && afford?.tabIndex === '0', `role=${afford?.role} tabIndex=${afford?.tabIndex}`)

    const a = await clickRowAndTrail(cdp, '.aurora-kb-card--recent .aurora-kb-recent__item', 0, '概览行')
    info('轨迹 = ' + JSON.stringify(a.traj))
    const atEditor = a.traj.filter((s) => s.hash === '#view=editor')
    ok('点概览「最近活动」行 → hash 变为 #view=editor（报障点）', atEditor.length > 0,
      `editorFrames=${atEditor.length}/${a.traj.length}`)
    const last = a.traj[a.traj.length - 1]
    ok('2.5s 后仍停留编辑器（没被弹回知识库详情页）', last.hash === '#view=editor' && last.editor === true,
      `稳态 hash=${last.hash} editor=${last.editor}`)
    ok('知识库面板已卸载（真的换了视图，不只是 hash 变了）', last.kbPanel === 0, `kbPanel=${last.kbPanel}`)
  }

  if (!ONLY || ONLY === 'B') {
    console.log('\n=== B. 对照：笔记 Tab 行同样能进编辑器（原本可用的路径不得回退）===')
    await enterKbDetail(cdp)
    await cdp.eval(`(() => {
      const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
        .find(x => (x.textContent || '').includes('笔记'))
      if (t) t.click(); return !!t
    })()`)
    await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400, label: '笔记 tab' })
    const b = await clickRowAndTrail(cdp, '.aurora-kb-notes .aurora-kb-recent__item', 0, '笔记 Tab 行')
    info('轨迹 = ' + JSON.stringify(b.traj))
    const lastB = b.traj[b.traj.length - 1]
    ok('点笔记 Tab 行 → 进编辑器（对照通过）', lastB.hash === '#view=editor' && lastB.editor === true,
      `稳态 hash=${lastB.hash} editor=${lastB.editor} rows=${b.total}`)
  }

  console.log('\n=== 3. 页面错误 ===')
  const errs = cdp.pageErrors.filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e))
  ok('无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 5)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) {
    console.log('未通过：')
    failed.forEach((f) => console.log('  ❌ ' + f.name))
  }
  ws.close()
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
