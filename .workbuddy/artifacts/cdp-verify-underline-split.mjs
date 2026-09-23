/**
 * CDP 真机探针 · 下划线 split button：主按钮应用「上次颜色」+ 16 色调色板 + 跨会话记忆（2026-09-23）
 * ==========================================================================
 * 需求原话：「要求编辑功能格式工具栏中的下划线功能和这个高亮功能一样，
 *            支持切换16种颜色，并记住上一次使用的颜色」。
 *
 * 与高亮探针同构（Word / VS Code split button 范式）：
 *   · 主按钮（U 图标）  = 直接应用/切换「上次颜色」，**不开面板**
 *   · 右侧 12px 小箭头  = 展开「跟随正文 + 16 色」调色板
 *   · 只有「在调色板里显式挑色」才改写上次颜色；主按钮 / Ctrl+U / 右键菜单都只是「应用上次色」
 *
 * 本探针额外要证伪的两件事（下划线特有）：
 *   D. **「跟随正文」是否真的跟随**——所以不验「有没有属性」，而验 <u> 的 computed
 *      `text-decoration-color` 与父级 `color` 是否**实际相等**；挑红后必须变成 red 的色值。
 *   E. **保存往返不再丢下划线**——旧版 Turndown 不识 <u>，下划线「一保存就丢」。
 *      这里用 dev server 的 **动态 import 拿真实模块**，把「真机渲染出的 innerHTML」
 *      喂给 htmlToMarkdown，断言产出 `++…++`（单测里喂的是手写 HTML，覆盖不到 TipTap 生成的
 *      style/class 组合）。
 *
 * 阳性对照（HEAD，本特性提交前）：
 *   同一探针跑在 HEAD 上必须**翻红**在 §2/§3/§3b/§4/§5/§6/§8 —— 那时既没有箭头按钮、
 *   也没有 data-ul-last、没有「跟随正文」项、下划线不带色属性、且保存时会丢。
 *   注意：**扫描面的锚点选择器必须两版都存在**，否则「HEAD 报红」的理由会变成
 *   「选择器在旧版不存在」= 归因不诚实（本仓踩过一次）。
 *   这里用「工具栏里 textContent 恰为 'U' 且 text-decoration-line 含 underline 的 span」
 *   反查其最近 button —— 该 span **两版字面一致**（HEAD 与修复版都是这个 U）。
 *
 * 用法（必须与 Edge 同一次前台 bash；CDP_PORT 须与 Edge 启动端口一致）：
 *   修复版： CDP_PORT=9480 MC_BASE=http://127.0.0.1:5174 node .workbuddy/artifacts/cdp-verify-underline-split.mjs
 */
import { WebSocket } from 'ws'
import { appendFileSync, writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9480)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(new URL(BASE).port || 5174)
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/underline-split.png'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 进度 trace：**直接 appendFileSync 落盘**，不走 stdout。
 *
 * 🚨 动机（本轮实测）：探针被工具按 SIGTERM 杀掉时，node 的 stdout 还是**块缓冲**，
 * 整段输出随进程一起蒸发（日志文件恒停在最后一次 flush 的边界，`=== 6.` 之后永远是空白）
 * ⇒ 完全看不出「走到哪一步卡住」。直接写盘则每步都落地，被杀也留证。
 * 启用方式：`MC_TRACE=<路径>`；不设则不写（默认零开销）。
 */
const TRACE = process.env.MC_TRACE || ''
const trace = (s) => { if (TRACE) { try { appendFileSync(TRACE, `[${new Date().toISOString()}] ${s}\n`) } catch { /* ignore */ } } }
const t0 = Date.now()
const traceT = (s) => trace(`${s} (+${((Date.now() - t0) / 1000).toFixed(1)}s)`)
const EXPECT_COLORS = 16
/** 单条 CDP 请求的超时（毫秒）。见 `send()` 注释：防止页面忙时探针静默挂死。 */
const CDP_TIMEOUT_MS = 20000

/**
 * 「U」图标锚点：工具栏内 textContent 恰为 'U' 且带下划线装饰的 span。
 * **两版（HEAD / 修复版）字面一致** ⇒ 实现无关，可用作扫描面入口。
 */
const U_ANCHOR = `(() => {
  const cands = [...document.querySelectorAll('.wysiwyg-toolbar span')].filter((s) => {
    const t = (s.textContent || '').trim()
    if (t !== 'U') return false
    return getComputedStyle(s).textDecorationLine.includes('underline')
  })
  return cands.length ? cands[cands.length - 1] : null
})()`

/**
 * 从「U 图标」反查：主按钮 / split 包裹层 / 箭头按钮 / 上次色指示条。
 *
 * ⚠️ 箭头按钮的判定**刻意用纯几何**（与主按钮同容器、宽度 ≤20px 的窄控件），
 * **不许**用 `aria-label="选择下划线颜色"` 之类只在修复版存在的标记 —— 否则 HEAD 对照会
 * 「因为选择器在旧版不存在」而报红 = 假阳性归因（本仓已踩过一次）。
 * 用几何判定的好处：HEAD 的工具栏里每个按钮都 ≥28px，因此**天然找不到窄兄弟**，
 * 报红的原因是「split 箭头这种东西真的不存在」，归因诚实。
 */
const FIND_SPLIT = `(() => {
  const uEl = ${U_ANCHOR}
  if (!uEl) return { penFound: false }
  const mainBtn = uEl.closest('button')
  if (!mainBtn) return { penFound: true, mainBtnFound: false }
  const wrap = mainBtn.parentElement
  const mr = mainBtn.getBoundingClientRect()
  const sibs = wrap ? [...wrap.querySelectorAll('button')].filter((b) => b !== mainBtn) : []
  const narrow = sibs.filter((b) => {
    const r = b.getBoundingClientRect()
    return r.width > 0 && r.width <= 20 && r.height > 0
  })
  const arrowBtn = narrow[0] || null
  const indicator = mainBtn.querySelector('[data-ul-last]')
  const ar = arrowBtn ? arrowBtn.getBoundingClientRect() : null
  return {
    penFound: true,
    mainBtnFound: true,
    wrapClass: wrap ? (wrap.className || '(none)') : '(none)',
    wrapIsToolbar: !!(wrap && wrap.classList && wrap.classList.contains('wysiwyg-toolbar')),
    wrapChildCount: wrap ? wrap.children.length : -1,
    wrapButtons: sibs.length,
    narrowSiblingCount: narrow.length,
    arrowFound: !!arrowBtn,
    arrowR: ar ? { left: ar.left, top: ar.top, width: ar.width, height: ar.height } : null,
    lastColorAttr: indicator ? indicator.getAttribute('data-ul-last') : null,
    indicatorBg: indicator ? getComputedStyle(indicator).backgroundColor : null,
    mainBtnCenter: { x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.top + mr.height / 2) },
    mainBtnVisible: mr.width > 0 && mr.height > 0,
  }
})()`

/**
 * 找 portal 出去的调色板：挂在 body 下、`display:grid`、含若干带 title 的圆角色块。
 * 不依赖任何类名/data 属性 ⇒ HEAD 上同样能跑（只是找不到，count=0）。
 * ⚠️ 「跟随正文」那一行是矩形不是圆，因此**不会被计入色块数**，count 仍应恰为 16。
 */
const FIND_PALETTE = `(() => {
  const swatches = [...document.querySelectorAll('body div[title]')]
    .filter((d) => {
      const cs = getComputedStyle(d)
      return cs.borderRadius === '50%' || cs.borderRadius.startsWith('50%')
    })
  if (!swatches.length) return { found: false, count: 0 }
  const panel = swatches[0].parentElement
  const pr = panel.getBoundingClientRect()
  const cs = getComputedStyle(panel)
  // 「屏幕上可命中」判据：色块中心做命中测试，命中自己且祖先链里没有 overflow 裁剪容器
  const hits = swatches.map((s) => {
    const r = s.getBoundingClientRect()
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2)
    const el = (cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight) ? document.elementFromPoint(cx, cy) : null
    return {
      title: s.getAttribute('title'),
      onScreen: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
      hitSelf: el === s,
      cx, cy,
    }
  })
  const toolbar = document.querySelector('.wysiwyg-toolbar')
  return {
    found: true,
    count: swatches.length,
    titles: swatches.map((s) => s.getAttribute('title')),
    panelParentIsBody: panel.parentElement === document.body,
    panelInToolbar: !!(toolbar && toolbar.contains(panel)),
    panelR: { left: pr.left, top: pr.top, width: pr.width, height: pr.height },
    panelGridColumns: cs.gridTemplateColumns,
    hits,
    hitOk: hits.filter((h) => h.hitSelf).length,
  }
})()`

/** 找「跟随正文」项（新特性，HEAD 上必然找不到） */
const FIND_AUTO_OPTION = `(() => {
  const byAttr = document.querySelector('body div[data-ul-auto]')
  const cands = [...document.querySelectorAll('body div')].filter((d) => {
    const t = (d.textContent || '').trim()
    return t.includes('跟随正文') && t.length <= 12
  })
  const el = byAttr || cands[0] || null
  if (!el) return { found: false, byAttr: !!byAttr, textMatch: cands.length }
  const r = el.getBoundingClientRect()
  return {
    found: true,
    byAttr: !!byAttr,
    textMatch: cands.length,
    text: (el.textContent || '').trim(),
    w: Math.round(r.width), h: Math.round(r.height),
    onScreen: r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight,
    center: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) },
  }
})()`

/**
 * 读编辑器正文里的 <u>（渲染侧真凭实据）。
 * ⚠️ 特意同时取 `textDecorationColor` 与**父级 color**：「跟随正文」的语义不是
 * 「属性等于某个值」，而是**实际渲染色跟随正文**——只有两者相等才算数。
 */
const READ_UNDERLINES = `(() => {
  const root = document.querySelector('.tiptap')
  if (!root) return { rootFound: false }
  const us = [...root.querySelectorAll('u')]
  return {
    rootFound: true,
    count: us.length,
    colors: us.map((u) => u.getAttribute('data-underline-color')),
    text: us.map((u) => (u.textContent || '').slice(0, 12)),
    decoLine: us.map((u) => getComputedStyle(u).textDecorationLine),
    decoColor: us.map((u) => getComputedStyle(u).textDecorationColor),
    parentColor: us.map((u) => (u.parentElement ? getComputedStyle(u.parentElement).color : null)),
    html: root.innerHTML.slice(0, 400),
  }
})()`

/** 取 TipTap 实例（.tiptap 由 ProseMirror 托管、无 fiber，需向上找祖先 fiber） */
const FIND_EDITOR = `(() => {
  const root = document.querySelector('.tiptap')
  if (!root) return null
  let dom = root; let fkey = null
  while (dom && !fkey) { fkey = Object.keys(dom).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')); if (fkey) break; dom = dom.parentElement }
  let fiber = fkey ? dom[fkey] : null
  const isEditor = (o) => o && o.state && o.commands && typeof o.chain === 'function' && o.view
  const search = (obj, depth) => { if (!obj || depth > 6 || typeof obj !== 'object') return null; if (isEditor(obj)) return obj; if (Array.isArray(obj)) { for (const v of obj) { const r = search(v, depth + 1); if (r) return r } } else { for (const v of Object.values(obj)) { const r = search(v, depth + 1); if (r) return r } } return null }
  while (fiber) { const r = search(fiber.memoizedProps, 0) || search(fiber.memoizedState, 0); if (r) return r; fiber = fiber.return }
  return null
})()`

/** 用 TipTap 实例设「状态选区」覆盖文档首个非空文本块 */
const SELECT_FIRST_PARA = `(() => {
  const ed = ${FIND_EDITOR}
  if (!ed) return { ok: false, why: 'no editor' }
  try {
    const doc = ed.state.doc
    let target = null
    doc.descendants((node, pos) => {
      if (target) return false
      if (node.isTextblock && node.textContent.trim().length > 0) {
        target = { pos, contentSize: node.content.size }
        return false
      }
      return true
    })
    if (!target) return { ok: false, why: 'no textblock' }
    const from = target.pos + 1
    const to = target.pos + 1 + target.contentSize
    ed.commands.setTextSelection({ from, to })
    const sel = ed.state.selection
    return { ok: true, from, to, size: sel.to - sel.from, selectedText: doc.textBetween(sel.from, sel.to).slice(0, 20) }
  } catch (e) {
    return { ok: false, why: 'throw:' + (e && e.message) }
  }
})()`

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
      // 🚨 超时兜底：页面 reload / renderer 忙时，`Runtime.evaluate` 的响应可能**永远不返回**
      // （CDP 请求排队）。没有超时 ⇒ 探针在此**静默挂死**（表现为整条命令被工具按 SIGTERM 杀，
      // 且因 stdout 块缓冲看不到走到哪 —— 本轮 §6 实测踩到）。加超时后异常会被 waitFor 的
      // try/catch 接住并重试，而不是挂死。
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          rej(new Error(`CDP timeout(${CDP_TIMEOUT_MS}ms): ${method}`))
        }
      }, CDP_TIMEOUT_MS)
      const settle = (fn) => (v) => { clearTimeout(timer); fn(v) }
      this.pending.set(id, { resolve: settle(res), reject: settle(rej) })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
  mark() { return this.pageErrors.length }
  since(mark) { return this.pageErrors.slice(mark).filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e)) }
}

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log(`   · ${s}`)

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '', maxTimeouts = 4 } = {}) {
  let timeouts = 0
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch (e) {
      // 🚨 renderer 僵死（如被 Edge 自带对话框抢前台/冻结）时**每条 eval 都会超时**。
      // 若只靠 `tries` 兜底，40 次 × 20s 会挂十几分钟且看不出原因 ⇒ 攒到阈值直接抛出，
      // 让 main 的 catch 打出一句可读的结论。
      if (/CDP timeout/.test(String((e && e.message) || e))) {
        timeouts++
        if (timeouts >= maxTimeouts) {
          throw new Error(`renderer 无响应（连续 ${timeouts} 次 CDP 超时）@ ${label || String(expr).slice(0, 50)}`)
        }
      }
      /* 其余为导航/上下文重建期的瞬时错误，重试即可 */
    }
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

/**
 * 导航且**不等待 `Page.navigate` 的响应**。
 * 🚨 本轮实测：在「应用已启动、且带 autosave 定时器」的页面上做整页 reload 时，
 * `Page.navigate` 的响应可能**永远不回来**（renderer 上下文轮换 / target 繁忙）⇒
 * 探针在此静默挂死，整条命令最后被 SIGTERM 杀掉，且因 stdout 块缓冲连「走到哪」都看不到。
 * 导航本身是生效的，所以改为「发出即不等待」，由调用方轮询就绪判据（`ready`）来确认到达。
 */
async function navigateNoWait(cdp, url, settle = 1400) {
  cdp.send('Page.navigate', { url }).catch(() => { /* 响应可能丢失，不影响导航本身 */ })
  await sleep(settle)
}
async function dismissOnboarding(cdp) {
  const had = await cdp.eval(`!!document.querySelector('.aurora-audience')`)
  if (had) {
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-audience')
      const b = el && [...el.querySelectorAll('button')].find((x) => /开始|跳过|继续/.test(x.textContent || ''))
      if (b) b.click(); else if (el) el.remove()
      return true
    })()`)
    await sleep(500)
  }
  return had
}
/**
 * 处置「发现未保存的内容」恢复对话框（`crashRecovery` 自动备份 → localStorage
 * `markcraft_autosave_backup`）。
 *
 * 🚨 这**不是崩溃遮罩**，而是应用**正常的防丢失**行为：编辑后未保存即被自动备份，
 * 下次加载时弹窗询问「恢复 / 放弃」。它的 backdrop 会吞掉所有指针 ⇒ 不处置则后续点击全失效。
 * 首轮实测：§6 预热 14 次全被 `.aurora-crash__backdrop` 命中、点击断言假红
 * （表现为"主按钮点了没反应"，极易误判成产品缺陷）。
 * 处置方式与首启引导同族：**点「放弃」**让 React state 与备份键一并清干净，而不是只 remove DOM。
 * 若按钮点完仍在（React 重渲染挂回），退一步清键 + remove。
 */
async function dismissCrashRecover(cdp) {
  const had = await cdp.eval(`!!document.querySelector('.aurora-crash')`)
  if (had) {
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-crash')
      if (!el) return false
      const b = [...el.querySelectorAll('button')].find((x) => /放弃|丢弃|忽略/.test(x.textContent || ''))
      if (b) b.click(); else el.remove()
      return true
    })()`)
    await sleep(400)
    if (await cdp.eval(`!!document.querySelector('.aurora-crash')`)) {
      await cdp.eval(`localStorage.removeItem('markcraft_autosave_backup')`)
      await cdp.eval(`(() => { const el = document.querySelector('.aurora-crash'); if (el) el.remove(); return true })()`)
      await sleep(200)
    }
  }
  return had
}

/** 真实鼠标事件流（分层：move → press → release），保证 React 委托链与 hover 态都走到 */
async function realMove(cdp, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons })
}
async function realClick(cdp, x, y, settle = 350) {
  await realMove(cdp, x, y, 0)
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(settle)
}

/**
 * 反复点同一个点，直到 `pred(读到的值)` 成立（或试满）。
 * 🚨 动机同 openPalette：**页面导航后最早一次合成鼠标事件会被吞**。
 * 重试只在「未生效」时发生 ⇒ 不会把一次成功的 toggle 又点回去（toggle 类断言必须写成
 * 「从无到有」这种单向可判定的谓词，不能写成「变了个样」，否则重试会自相矛盾）。
 */
async function clickUntil(cdp, pt, readExpr, pred, { tries = 3, settle = 420 } = {}) {
  let v = await cdp.eval(readExpr)
  if (pred(v)) return { ok: true, tries: 0, value: v }
  for (let i = 1; i <= tries; i++) {
    await realClick(cdp, pt.x, pt.y, settle)
    v = await cdp.eval(readExpr)
    if (pred(v)) return { ok: true, tries: i, value: v }
  }
  return { ok: false, tries, value: v }
}

/**
 * 预热：确定「合成输入已经活了」再继续。
 *
 * 🚨 真实机制（由 trace 定案，别再猜）：**页面导航后的头一两秒，CDP 合成鼠标事件会被整体丢弃**
 * —— 症状是点击后 `document.activeElement` 仍是 `BODY`、`.tiptap` 从未获得焦点。
 * 因此判据不能是「点过了」，必须是「**点完之后编辑器真的拿到了焦点**」，否则后续所有点击断言
 * 都会莫名其妙地间歇性失败（本探针在 §3 / §6 上各复现过一次）。
 * 这是**环境条件化**、不是产品断言，故如实打印成功所需的尝试次数。
 */
async function ensureInputAlive(cdp, label = '', { tries = 14, ms = 600 } = {}) {
  const first = await cdp.eval(`(() => {
    const el = document.querySelector('.tiptap p, .tiptap h1, .tiptap h2, .tiptap li')
    const tiptap = document.querySelector('.tiptap')
    return {
      readyState: document.readyState,
      hasFocus: document.hasFocus(),
      visibility: document.visibilityState,
      tiptapCount: document.querySelectorAll('.tiptap').length,
      textTargetFound: !!el,
      tiptapRect: tiptap ? (({ left, top, width, height }) => ({ l: Math.round(left), t: Math.round(top), w: Math.round(width), h: Math.round(height) }))(tiptap.getBoundingClientRect()) : null,
      onboarding: !!document.querySelector('.aurora-audience'),
    }
  })()`)
  if (label) info(`预热起点环境：${JSON.stringify(first)}`)
  for (let i = 1; i <= tries; i++) {
    // ⚠️ 预热点必须落在**真实文本块**上：`.tiptap` 容器的几何中心常常落在正文下方的空白里，
    // 点那里拿不到焦点（实测 10 次全失败）⇒ 该点不是「输入死了」的证据，只是选错了预热点。
    const target = await cdp.eval(`(() => {
      const el = document.querySelector('.tiptap p, .tiptap h1, .tiptap h2, .tiptap li, .tiptap')
      if (!el) return null
      const r = el.getBoundingClientRect()
      const x = Math.round(r.left + Math.min(r.width / 2, 60))
      const y = Math.round(r.top + r.height / 2)
      const at = document.elementFromPoint(x, y)
      return { x, y, tag: el.tagName, atTag: at ? at.tagName + '.' + (at.className || '').toString().slice(0, 40) : null }
    })()`)
    if (!target) { console.log(`   ⚠ 预热无目标（编辑器文本块不存在）${label ? ' · ' + label : ''}`); break }
    // 🚨 根因（由环境快照定案）：失败时 `document.visibilityState === 'hidden'`
    // —— Edge 窗口被判为不可见/被遮挡 ⇒ 渲染器节流 ⇒ 这期间派发的合成鼠标事件不可靠。
    // 修法：每次点击前若发现 hidden，就**重新 bringToFront** 把标签页激活，而不是干等。
    const vis = await cdp.eval('document.visibilityState')
    if (vis !== 'visible') { try { await cdp.send('Page.bringToFront') } catch { /* ignore */ } }
    await cdp.eval('window.focus()')
    await realClick(cdp, target.x, target.y, 260)
    const probe = await cdp.eval(`({
      focused: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.tiptap')),
      activeEl: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 30) : null,
      hasFocus: document.hasFocus(),
    })`)
    if (probe.focused) {
      info(`输入预热就绪 @(${target.x},${target.y}) 命中=${target.atTag} 尝试=${i}${label ? ' · ' + label : ''}`)
      return { alive: true, tries: i, target }
    }
    if (i === 1 || i === tries) info(`预热第 ${i} 次未就绪：activeEl=${probe.activeEl} document.hasFocus=${probe.hasFocus} 命中=${target.atTag}`)
    await sleep(ms)
  }
  console.log(`   ⚠ 输入预热未就绪（${tries} 次后编辑器仍未获得焦点）${label ? ' · ' + label : ''}`)
  return { alive: false, tries }
}

/**
 * 展开调色板（带重试）。
 * 🚨 本仓已知坑：**窗口激活 / 导航后早段的合成事件会被丢弃** ⇒ 箭头按钮的点击可能无效。
 * 这不是产品缺陷，故此处重试并在结果里如实报告尝试次数，而不是把它当成红。
 * 重试是安全的：只有「当前仍未展开」才会再点一次，不会把已展开的面板误关。
 */
async function openPalette(cdp, pt, { tries = 6 } = {}) {
  for (let i = 1; i <= tries; i++) {
    const now = await cdp.eval(FIND_PALETTE)
    if (now.found && now.count > 0) return { opened: true, tries: i - 1, panel: now }
    await realClick(cdp, pt.x, pt.y, 420)
    const after = await cdp.eval(FIND_PALETTE)
    if (after.found && after.count > 0) return { opened: true, tries: i, panel: after }
  }
  return { opened: false, tries, panel: await cdp.eval(FIND_PALETTE) }
}

// ---- 种子：直接写 IndexedDB（markcraft 库 / kv 表），并强制 WYSIWYG + 打开笔记 ----
const NOTES_FOLDER_ID = 'f-notes'
const NOTE_ID = 'ul-0'
const NOTE_NAME = '下划线测试笔记.md'
const NOTE_BODY = '# 下划线测试笔记\n\n这是一段用于测试下划线功能的示例正文内容，点击工具栏下划线按钮后应当被加上装饰线。再写一句保证段落足够长以便稳定选中整段文字。\n'
let KEY_FILE_TREE = 'markcraft-file-manager'
let STORAGE_VERSION = 'v5'
let KEY_VERSION = 'markcraft-file-manager-version'
async function loadStorageConsts() {
  try {
    const txt = await (await fetch(`${BASE}/src/core/files/fileTree.ts`)).text()
    const k = txt.match(/const STORAGE_KEY = '([^']+)'/)
    const v = txt.match(/const STORAGE_VERSION = '([^']+)'/)
    if (k) KEY_FILE_TREE = k[1]
    if (v) { STORAGE_VERSION = v[1]; KEY_VERSION = `${k ? k[1] : KEY_FILE_TREE}-version` }
  } catch { /* 用默认常量 */ }
  return { key: KEY_FILE_TREE, version: STORAGE_VERSION }
}
function SEED_EXPR() {
  const T = 1700000000000
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [{
        id: NOTES_FOLDER_ID, name: '我的笔记', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
        children: [{ id: NOTE_ID, name: NOTE_NAME, type: 'file', content: NOTE_BODY, createdAt: T, updatedAt: T }],
      }],
    },
    tabs: [{ id: 'tab-ul-0', fileId: NOTE_ID, name: NOTE_NAME, isActive: true }],
    activeTabId: 'tab-ul-0',
    searchQuery: '', sidebarVisible: false,
  }
  return `(async () => {
    const tree = ${JSON.stringify(tree)}
    const openRes = await new Promise((res) => {
      let req
      try { req = indexedDB.open('markcraft') } catch (e) { res({ openErr: 'throw:' + e.message }); return }
      req.onerror = () => res({ openErr: (req.error && (req.error.name + ':' + req.error.message)) || 'unknown' })
      req.onblocked = () => res({ openErr: 'blocked' })
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch (e) { d.close(); res({ txErr: e.message }); return }
        const os = tx.objectStore('kv')
        os.put({ key: ${JSON.stringify(KEY_FILE_TREE)}, value: JSON.stringify(tree) })
        tx.oncomplete = () => { d.close(); res({ ok: true }) }
        tx.onerror = () => { d.close(); res({ txErr: (tx.error && tx.error.message) || 'txfail' }) }
        tx.onabort = () => { d.close(); res({ txAbort: (tx.error && tx.error.message) || 'abort' }) }
      }
    })
    if (!openRes || !openRes.ok) return JSON.stringify(openRes)
    localStorage.setItem(${JSON.stringify(KEY_VERSION)}, ${JSON.stringify(STORAGE_VERSION)})
    // 清掉上一次会话遗留的自动备份 —— 否则加载时会弹「发现未保存的内容」对话框，
    // 它的 backdrop 会吞掉所有合成点击（探针已为此单列 dismissCrashRecover 兜底）。
    try { localStorage.removeItem('markcraft_autosave_backup') } catch {}
    try {
      const raw = localStorage.getItem('markcraft_settings')
      const s = raw ? JSON.parse(raw) : {}
      s.editorMode = 'wysiwyg'
      // 每次开跑前把「上次下划线色」清成默认 auto（跟随正文），保证 §1/§4 断言从干净初始态开始
      s.lastUnderlineColor = 'auto'
      localStorage.setItem('markcraft_settings', JSON.stringify(s))
    } catch {}
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    return true
  })()`
}
async function shot(cdp, path, clip) {
  try {
    const r = await cdp.send('Page.captureScreenshot', clip ? { format: 'png', clip: { ...clip, scale: 2 } } : { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
    return true
  } catch (e) { info(`截图失败：${e?.message || e}`); return false }
}
const readSettings = `(() => { try { return JSON.parse(localStorage.getItem('markcraft_settings') || '{}').lastUnderlineColor ?? null } catch { return 'PARSE_ERR' } })()`

/**
 * 真机往返：拿 dev server 上的**真实模块**转换**真机渲染出的 HTML**。
 * 这是 §8 的证据通道 —— 单测喂的是手写 HTML，覆盖不到 TipTap 生成的
 * `data-underline-color` + `class="mark-underline"` + 内联 style 的组合。
 *
 * 🚨 取值**必须与真实保存链路同口径**：产品保存走 `editor.getHTML()`（ProseMirror 序列化的
 * doc，**不含** Live Preview 的装饰节点）。若图省事取 DOM 的 `root.innerHTML`，会把
 * `lp-prefix`（视觉上的 `# ` 前缀）当成正文内容 ⇒ h1 往返出 `# #\n\n内容` 的**假象**，
 * 从而误判成「标题没往返对」（首轮实测踩到）。以 `editor.getHTML()` 为准，`innerHTML` 仅兜底。
 */
const ROUNDTRIP = `(async () => {
  try {
    const mod = await import('/src/features/editor/markdownConvert.ts')
    const root = document.querySelector('.tiptap')
    if (!root) return { ok: false, why: 'no root' }
    if (typeof mod.htmlToMarkdown !== 'function') return { ok: false, why: 'no export' }
    const ed = ${FIND_EDITOR}
    const useGetHtml = !!(ed && typeof ed.getHTML === 'function')
    const src = useGetHtml ? ed.getHTML() : root.innerHTML
    const md = mod.htmlToMarkdown(src)
    return {
      ok: true,
      source: useGetHtml ? 'editor.getHTML()（与保存链路同口径）' : 'root.innerHTML（兜底）',
      md,
      hasPlusSyntax: /\\+\\+[^+]+\\+\\+/.test(md),
      htmlHasU: /<u[\\s>]/.test(src),
      srcU: (src.match(/<u[^>]*>/g) || []).slice(0, 3),
    }
  } catch (e) { return { ok: false, why: String((e && e.message) || e) } }
})()`

/** 反向：手写 ++ 语法喂给同模块，看能否解析出带色属性（与上一条互补） */
const PARSE_PROBE = `(async () => {
  try {
    const mod = await import('/src/features/editor/markdownConvert.ts')
    const store = { getBase64Image: () => null }
    const red = mod.markdownToHtml('++重点|red++', store)
    const auto = mod.markdownToHtml('++重点++', store)
    return {
      ok: true,
      redHasAttr: red.includes('data-underline-color="red"'),
      autoNoAttr: auto.includes('<u>'),
      redHtml: red.slice(0, 160),
      autoHtml: auto.slice(0, 160),
    }
  } catch (e) { return { ok: false, why: String((e && e.message) || e) } }
})()`

/**
 * 新建一个**空白**目标（标签页），返回 target 描述。
 *
 * 走 `PUT /json/new`（新版本 Chromium 只接受 PUT）。为避免 `?url=` 查询串的形态差异，
 * 一律先建 `about:blank`，再由调用方经 CDP 导航到应用地址 —— 这样 URL 编码问题被彻底绕开。
 */
async function openColdTab() {
  const endpoint = `http://127.0.0.1:${CDP_PORT}/json/new?about:blank`
  let res = await fetch(endpoint, { method: 'PUT' })
  if (!res.ok) res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?url=about%3Ablank`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建冷启动标签页失败：HTTP ${res.status}（该 Chromium 可能不支持 /json/new）`)
  const target = await res.json()
  if (!target || !target.webSocketDebuggerUrl) throw new Error('冷启动标签页未返回 webSocketDebuggerUrl: ' + JSON.stringify(target).slice(0, 200))
  return { target }
}

/**
 * 把 `Cdp` 接到指定 target 上，并**先注入 `__bootAt` 再导航**。
 *
 * 注入顺序是关键：`Page.addScriptToEvaluateOnNewDocument` 只对**之后**创建的 document 生效，
 * 因此在 `about:blank` 阶段挂上、再导航 ⇒ 新 document 里的 `__bootAt` 必然存在，
 * 这条就是「本 document 确实是本次冷启动产生」的**正向证据**（不是靠标记"变化"去排除，是压根排除不了）。
 */
async function attachCdp(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const c = new Cdp(ws)
  await c.send('Runtime.enable')
  await c.send('Log.enable')
  await c.send('Page.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await c.send('Page.bringToFront')
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__bootAt = Date.now()` })
  return c
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
  const page = list.find((t) => t.type === 'page' && pageRe.test(t.url)) || list.find((t) => t.type === 'page')
  if (!page) {
    console.error(`未找到任何 page target；当前 targets:\n` + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  // 🚨 关掉 Edge 自带的 `edge://` 页面（典型是 `sync-confirmation-dialog`，新 profile 首启会弹）：
  // 它们会抢前台 / 冻结目标渲染器 —— 症状是 **CDP 能连上、但 `Runtime.enable` 直接超时**，
  // 页面 reload 后永远不就绪，探针挂死（本轮实测）。只关「非本应用」的 page target，不动应用页。
  try {
    for (const t of list) {
      if (t.type === 'page' && !pageRe.test(t.url)) {
        await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${t.id}`)
        console.log(`   · 已关闭无关 target：${t.url.slice(0, 60)}`)
      }
    }
  } catch { /* 关不掉不影响主流程 */ }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  // 🚨 坑 P：`Page.navigate` 到**与启动 URL 完全相同**的地址时，Chromium 可能**不产生新 document**
  // ⇒ 应用压根没重启，写进去的持久态永远不会被读取（「功能失败」的假象）。
  // 每个新 document 都注入一枚重载标记，调用方据此断言「本次导航确实生效」。
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__bootAt = Date.now()`,
  })
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检 / 种子（目标 ${BASE}，CDP ${CDP_PORT}，期望色数 ${EXPECT_COLORS}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  await navigateNoWait(cdp, `${BASE}/#view=editor`, 1200)
  ok('§0 应用外壳就绪', (await ready(cdp)) >= 0)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  info(`§0 未保存内容对话框：${(await dismissCrashRecover(cdp)) ? '出现过（已放弃）' : '未出现'}`)
  const seedRes = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功', seedRes === true, typeof seedRes === 'string' ? 'seedErr=' + seedRes : 'ok')
  await navigateNoWait(cdp, `${BASE}/?seed=${Date.now()}#view=editor`, 1000)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  info(`§0 重载后未保存内容对话框：${(await dismissCrashRecover(cdp)) ? '出现过（已放弃）' : '未出现'}`)
  await sleep(800)

  const editorReady = await waitFor(cdp, `!!document.querySelector('.tiptap')`, { tries: 30, ms: 400, label: '.tiptap' })
  ok('§1 编辑器已打开种子笔记', editorReady >= 0)
  // 扫描面证明 ①：**实现无关**的 U 图标锚点能取到（两版都有）
  const toolbarReady = await waitFor(cdp, `!!(${U_ANCHOR})`, { tries: 20, ms: 300, label: 'U 图标锚点' })
  ok('§1 格式工具栏已渲染下划线按钮（扫描面非空）', toolbarReady >= 0)
  // 扫描面证明 ②：能拿到 TipTap 实例（否则后面「选区→应用」全都会无据可依）
  const edProbe = await cdp.eval(`(() => { const ed = ${FIND_EDITOR}; return { isFn: typeof ed === 'function', hasState: !!(ed && ed.state), hasDoc: !!(ed && ed.state && ed.state.doc), docSize: ed && ed.state && ed.state.doc ? ed.state.doc.content.size : -1 } })()`)
  info('TipTap 实例：' + JSON.stringify(edProbe))
  ok('§1 可取得 TipTap 实例（ed.state.doc 可读）', edProbe.hasState === true && edProbe.hasDoc === true && edProbe.docSize > 0, JSON.stringify(edProbe))

  // ---------- §2 split button 结构 ----------
  console.log('\n=== 2. split button 结构（主按钮 + 右侧小箭头 + 上次色指示条）===')
  const s2 = await cdp.eval(FIND_SPLIT)
  info('结构：' + JSON.stringify(s2))
  ok('§2 主按钮可见', s2.mainBtnFound && s2.mainBtnVisible)
  ok('§2 存在与主按钮同容器相邻的窄控件（split 的右半箭头，≤20px）', s2.arrowFound === true, `wrapClass=${s2.wrapClass} wrapChildCount=${s2.wrapChildCount} wrapButtons=${s2.wrapButtons} narrowSiblingCount=${s2.narrowSiblingCount}`)
  ok('§2 主按钮带「上次颜色」指示条，初始 = auto（跟随正文）', s2.lastColorAttr === 'auto', `data-ul-last=${s2.lastColorAttr} bg=${s2.indicatorBg}`)
  ok('§2 localStorage 初始 = auto', (await cdp.eval(readSettings)) === 'auto')

  // ---------- §3 箭头 → 「跟随正文 + 16 色」调色板，且屏幕上可命中 ----------
  console.log('\n=== 3. 箭头展开调色板：16 色 + 可见（未被 overflow:hidden 裁掉）===')
  const arrow = s2.arrowR ? { x: Math.round(s2.arrowR.left + s2.arrowR.width / 2), y: Math.round(s2.arrowR.top + s2.arrowR.height / 2) } : null
  if (!arrow) {
    ok('§3 箭头可定位', false, '箭头按钮不存在 → 后续面板用例必然失败（HEAD 预期如此）')
  } else {
    await ensureInputAlive(cdp, '§3 展开前')
  }
  const opened = arrow ? await openPalette(cdp, arrow) : { opened: false, tries: 0, panel: { found: false, count: 0 } }
  const p1 = opened.panel
  info(`面板展开：opened=${opened.opened} 重试次数=${opened.tries}`)
  info('面板：' + JSON.stringify({ count: p1.count, titles: p1.titles, parentIsBody: p1.panelParentIsBody, inToolbar: p1.panelInToolbar, grid: p1.panelGridColumns, hitOk: p1.hitOk }))
  ok('§3 调色板已展开', p1.found === true && p1.count > 0, `点击尝试=${opened.tries} 次（首次为预热后正式点击）`)
  ok(`§3 调色板共 ${EXPECT_COLORS} 色`, p1.count === EXPECT_COLORS, `count=${p1.count} titles=${(p1.titles || []).join(',')}`)
  ok('§3 调色板经 portal 挂在 body（不在工具栏内）', p1.panelParentIsBody === true && p1.panelInToolbar === false)
  ok('§3 面板几何有效（宽高 > 0 且在视口内）', !!p1.panelR && p1.panelR.width > 0 && p1.panelR.height > 0 && p1.panelR.top >= 0)
  ok(`§3 🚨 每个色块都「屏幕上可命中」（elementFromPoint 命中自己）`, p1.hitOk === p1.count && p1.count > 0, `hitOk=${p1.hitOk}/${p1.count}`)
  const offscreen = (p1.hits || []).filter((h) => !h.onScreen).map((h) => h.title)
  ok('§3 无色块落在视口外', offscreen.length === 0, offscreen.length ? 'offscreen=' + offscreen.join(',') : '')
  // 截图 = **独立于 elementFromPoint 的第二条证据通道**：按面板自身几何裁切，
  // 全页截图里 16 个 20px 色块太小、容易被误判成「没出现」。
  if (p1.panelR && p1.panelR.width > 0) {
    await shot(cdp, SHOT.replace(/\.png$/, '-palette.png'), {
      x: Math.max(0, p1.panelR.left - 90),
      y: Math.max(0, p1.panelR.top - 90),
      width: Math.ceil(p1.panelR.width + 180),
      height: Math.ceil(p1.panelR.height + 160),
    })
  } else {
    await shot(cdp, SHOT.replace(/\.png$/, '-palette.png'))
  }

  // ---------- §3b 「跟随正文」项存在（下划线特有；HEAD 上必然找不到） ----------
  console.log('\n=== 3b. 调色板含「跟随正文」项（默认色，可回到跟随正文）===')
  const autoOpt = await cdp.eval(FIND_AUTO_OPTION)
  info('跟随正文项：' + JSON.stringify(autoOpt))
  ok('§3b 🚨 调色板存在「跟随正文」项', autoOpt.found === true, JSON.stringify(autoOpt))
  ok('§3b 「跟随正文」项在屏幕可见区内', autoOpt.found === true && autoOpt.onScreen === true, `w=${autoOpt.w} h=${autoOpt.h}`)

  // ---------- §4 主按钮：不开面板、直接应用「上次色」 ----------
  console.log('\n=== 4. 主按钮行为（应直接应用上次色 auto，且不依赖面板）===')
  // 先关掉面板。这里刻意**不用真实鼠标点击空白处**——左上角空白在 Aurora 里紧邻侧栏条目，
  // 误点会切视图、污染后续断言。外部点击收起行为已由上一条探针覆盖，此处只求确定性。
  await cdp.eval(`document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }))`)
  await sleep(250)
  const pClosed = await cdp.eval(FIND_PALETTE)
  ok('§4 点面板外空白后调色板收起', pClosed.found === false || pClosed.count === 0 || !pClosed.panelR || pClosed.panelR.height === 0)
  const sel = await cdp.eval(SELECT_FIRST_PARA)
  info('选区：' + JSON.stringify(sel))
  ok('§4 已设状态选区（选中面非空）', sel.ok === true && sel.size > 0)
  const before4 = await cdp.eval(READ_UNDERLINES)
  info(`§4 应用前 <u> 数 = ${before4.count}`)
  const c4 = await clickUntil(cdp, s2.mainBtnCenter, READ_UNDERLINES, (v) => v.count > before4.count)
  info(`§4 主按钮点击：ok=${c4.ok} 尝试=${c4.tries} value=${JSON.stringify({ count: c4.value.count, colors: c4.value.colors })}`)
  const after4 = c4.value
  const pAfter4 = await cdp.eval(FIND_PALETTE)
  info('应用后：' + JSON.stringify({ uCount: after4.count, colors: after4.colors, decoLine: after4.decoLine, decoColor: after4.decoColor, parentColor: after4.parentColor, html: (after4.html || '').slice(0, 260) }))
  ok('§4 🚨 主按钮点击后编辑器真出现 <u>（不是只调了函数）', after4.count > before4.count, `before=${before4.count} after=${after4.count} 点击尝试=${c4.tries}`)
  ok('§4 下划线被渲染出装饰线（text-decoration-line 含 underline）', (after4.decoLine || []).every((d) => d.includes('underline')), `decoLine=${JSON.stringify(after4.decoLine)}`)
  ok('§4 主按钮用「上次色」= auto：<u> 无颜色属性或显式为 auto', (after4.colors || []).every((c) => c === null || c === 'auto'), `colors=${JSON.stringify(after4.colors)}`)
  ok('§4 主按钮不展开调色板（split 语义）', pAfter4.found === false || pAfter4.count === 0 || (pAfter4.panelR && pAfter4.panelR.height === 0), `paletteCount=${pAfter4.count}`)
  // 🚨 「跟随正文」的**行为证据**：装饰线颜色必须等于正文色（而不是某个写死的色值）
  const followOk = (after4.decoColor || []).length > 0 && after4.decoColor.every((c, i) => c === (after4.parentColor || [])[i])
  ok('§4 🚨 auto 是「真的跟随正文」：text-decoration-color === 父级 color', followOk, `decoColor=${JSON.stringify(after4.decoColor)} parentColor=${JSON.stringify(after4.parentColor)}`)

  // ---------- §5 调色板挑红 → 记住；此后主按钮直接用红 ----------
  console.log('\n=== 5. 调色板挑「红」→ 落盘 + 主按钮改用红 ===')
  // HEAD 对照下 arrow 为 null ⇒ 不能直接点，如实记为未通过而不是让探针崩掉
  const reopened = arrow ? await openPalette(cdp, arrow) : { opened: false, tries: 0, panel: { found: false, count: 0 } }
  const p2 = reopened.panel
  info(`§5 面板重开：opened=${reopened.opened} 重试次数=${reopened.tries}${arrow ? '' : '（无箭头控件 ⇒ 无法展开，HEAD 预期如此）'}`)
  const red = (p2.hits || []).find((h) => h.title === 'red')
  ok('§5 调色板里能找到 red 色块且可命中', !!red && red.hitSelf === true, red ? `@(${red.cx},${red.cy}) hitSelf=${red.hitSelf}` : 'red 不存在')
  if (red) {
    const c5 = await clickUntil(cdp, { x: red.cx, y: red.cy }, READ_UNDERLINES, (v) => (v.colors || []).includes('red'))
    info(`§5 点 red 色块：ok=${c5.ok} 尝试=${c5.tries}`)
  } else {
    // 兜底：直接对色块派发 click（仅当真实命中不可用时；会显式标注降级）
    info('⚠ 降级：改用合成 click 事件选色（真实命中失败）')
    await cdp.eval(`(() => {
      const s = [...document.querySelectorAll('body div[title]')].find((d) => d.getAttribute('title') === 'red')
      if (!s) return false
      s.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return true
    })()`)
    await sleep(450)
  }
  const pAfter5 = await cdp.eval(FIND_PALETTE)
  ok('§5 选色后调色板自动收起', pAfter5.found === false || pAfter5.count === 0 || (pAfter5.panelR && pAfter5.panelR.height === 0), `paletteCount=${pAfter5.count}`)
  const after5 = await cdp.eval(READ_UNDERLINES)
  ok('§5 <u> 已成为红色（data-underline-color=red）', after5.colors.includes('red'), `colors=${JSON.stringify(after5.colors)}`)
  // 挑色后装饰线必须真的变红（#ef4444 = rgb(239, 68, 68)），不再跟随正文
  ok('§5 🚨 装饰线实际变红（text-decoration-color 不再是正文色）', (after5.decoColor || []).some((c) => c === 'rgb(239, 68, 68)'), `decoColor=${JSON.stringify(after5.decoColor)} parentColor=${JSON.stringify(after5.parentColor)}`)
  const s5 = await cdp.eval(FIND_SPLIT)
  ok('§5 🚨 指示条已记住 red（data-ul-last 即时更新，无需重载）', s5.lastColorAttr === 'red', `data-ul-last=${s5.lastColorAttr} bg=${s5.indicatorBg}`)
  const ls5 = await cdp.eval(readSettings)
  ok('§5 localStorage.lastUnderlineColor = red（落盘）', ls5 === 'red', `ls=${ls5}`)

  // ---------- §6 全新标签页冷启动 → 记忆跨会话生效 ----------
  console.log('\n=== 6. 全新标签页冷启动：记忆必须从磁盘回来 ===')
  traceT('S6 begin')
  // §4/§5 的真实编辑会触发 autosave 备份 ⇒ 冷启动后应用弹「发现未保存的内容」对话框。
  // 先清掉备份（等价于"用户没有未保存内容"的干净场景），避免对话框把链路拖进不确定时序
  // （实测：不清时 §6 会因 backdrop 吞点击而假红）。dismissCrashRecover 仍作为兜底保留。
  await cdp.eval(`localStorage.removeItem('markcraft_autosave_backup')`)
  traceT('S6 backup cleared')
  info(`§6 冷启动前 localStorage.lastUnderlineColor = ${await cdp.eval(readSettings)}`)
  // 🚨 **为什么不用整页 reload**（旧版做法，已废弃，勿回退）：
  // 本环境实测，对「已被深度使用过」的页面做 reload（`Page.navigate` 与 `location.reload()` 都试过、
  // 加 `--disable-sync` 也一样）后，renderer 会进入**僵死态且永不恢复**：
  // CDP 能连上、但每条 `Runtime.evaluate` 都超时（waitFor 连续 4 次超时后抛出），页面永远不就绪。
  // 改用**新建目标**取得全新 document：既绕开僵死，又是比 reload **更强**的冷启动证据 ——
  // 新目标的 document 必然全新，根本不存在「坑 P」（同 URL 导航不产生新 document）那一类风险。
  // localStorage 同源共享，新目标读到的正是 §5 落盘的那一份，故语义仍是「记忆从磁盘回来」。
  const cold = await openColdTab()
  traceT('S6 cold target created: ' + cold.target.id)
  const c2 = await attachCdp(cold.target)
  await navigateNoWait(c2, `${BASE}/#view=editor`, 1500)
  traceT('S6 cold tab navigated')
  const r6 = await ready(c2)
  traceT('S6 ready=' + r6)
  ok('§6 冷启动标签页外壳就绪', r6 >= 0)
  // 正向证据：`__bootAt` 是在 `about:blank` 阶段注入的，只有**之后新建的 document**才会有它。
  const boot6 = await c2.eval(`window.__bootAt`)
  ok('§6 冷启动确实产生了全新 document（__bootAt 由本次注入）', typeof boot6 === 'number', `__bootAt=${boot6}`)
  info(`§6 冷启动后引导浮层：${(await dismissOnboarding(c2)) ? '出现过（已关闭）' : '未出现'}`)
  const crash6 = await dismissCrashRecover(c2)
  info(`§6 冷启动后未保存内容对话框：${crash6 ? '出现过（已放弃）' : '未出现'}`)
  ok('§6 遮罩已清除（工具栏可点，无残留 backdrop）', (await c2.eval(`!document.querySelector('.aurora-crash')`)) === true, `曾出现=${crash6}`)
  await sleep(600)
  await waitFor(c2, `!!document.querySelector('.tiptap')`, { tries: 30, ms: 400, label: '.tiptap(cold)' })
  const s6 = await c2.eval(FIND_SPLIT)
  traceT('S6 split read, lastColorAttr=' + (s6 && s6.lastColorAttr))
  ok('§6 🚨 冷启动后指示条仍为 red（记住上次颜色，跨会话生效）', s6.lastColorAttr === 'red', `data-ul-last=${s6.lastColorAttr}`)
  ok('§6 冷启动后 localStorage 仍为 red', (await c2.eval(readSettings)) === 'red')
  // 恢复选区后点主按钮 → 应直接应用 red（不再需要开面板）
  // 顺序要点：**预热点击会移动光标**，必须在设选区**之前**做，否则刚设的选区会被点掉。
  await ensureInputAlive(c2, '§6 主按钮前')
  const sel6 = await c2.eval(SELECT_FIRST_PARA)
  ok('§6 冷启动后可重设选区', sel6.ok === true && sel6.size > 0, JSON.stringify(sel6))
  // 先清掉下划线（切换语义：已在 red 上点主按钮会取消下划线）
  await c2.eval(`(() => { const ed = ${FIND_EDITOR}; if (ed && ed.commands && ed.commands.unsetUnderline) ed.commands.unsetUnderline(); return true })()`)
  await sleep(250)
  const before6 = await c2.eval(READ_UNDERLINES)
  // 🚨 双路 trace：把「click 有没有到按钮」与「命令本身能不能执行」**分开取证**
  // （本仓教训——「点击无反应」别靠读代码推理）。
  await c2.eval(`(() => {
    window.__ulClicks = { onBtn: 0, onSvgChild: 0 }
    if (window.__ulClickHook) document.removeEventListener('click', window.__ulClickHook, true)
    window.__ulClickHook = (e) => {
      const uEl = ${U_ANCHOR}
      const btn = uEl && uEl.closest('button')
      if (!btn) return
      if (e.target === btn) window.__ulClicks.onBtn++
      else if (btn.contains(e.target)) window.__ulClicks.onSvgChild++
    }
    document.addEventListener('click', window.__ulClickHook, true)
    return true
  })()`)
  const diag6 = await c2.eval(`(() => {
    const uEl = ${U_ANCHOR}
    const btn = uEl && uEl.closest('button')
    const hit = document.elementFromPoint(${s6.mainBtnCenter.x}, ${s6.mainBtnCenter.y})
    const ed = ${FIND_EDITOR}
    const sel = ed && ed.state ? ed.state.selection : null
    const root = document.querySelector('.tiptap')
    return {
      tiptapCount: document.querySelectorAll('.tiptap').length,
      hitIsBtn: hit === btn,
      hitDesc: hit ? (hit.tagName + '.' + (hit.className || '').toString().slice(0, 40)) : null,
      hitTitle: hit ? hit.getAttribute('title') : null,
      btnRect: btn ? (({ left, top, width, height }) => ({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) }))(btn.getBoundingClientRect()) : null,
      btnPointerEvents: btn ? getComputedStyle(btn).pointerEvents : null,
      activeEl: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 30) : null,
      sel: sel ? { from: sel.from, to: sel.to, empty: sel.empty } : null,
      edHasSetMark: !!(ed && ed.commands && ed.commands.setMark),
      edIsFocused: ed ? ed.isFocused : null,
      edIsActiveUnderline: ed ? ed.isActive('underline') : null,
      underlineCount: root ? root.querySelectorAll('u').length : -1,
    }
  })()`)
  info('§6 点击前 trace：' + JSON.stringify(diag6))
  const c6 = await clickUntil(c2, s6.mainBtnCenter, READ_UNDERLINES, (v) => v.count > before6.count, { tries: 5 })
  info(`§6 主按钮点击：ok=${c6.ok} 尝试=${c6.tries}`)
  const after6 = c6.value
  if (!c6.ok) {
    const clicks = await c2.eval('JSON.stringify(window.__ulClicks || {})')
    // 直调命令：若这里能出 <u>，则「编辑器/命令」没问题，锅在 click 投递链路
    const direct = await c2.eval(`(() => {
      const ed = ${FIND_EDITOR}
      if (!ed) return { why: 'no editor' }
      const selBefore = ed.state.selection
      ed.commands.setTextSelection({ from: selBefore.from, to: selBefore.to })
      const okCmd = ed.chain().focus().unsetUnderline().setMark('underline', { color: 'red' }).run()
      const root = document.querySelector('.tiptap')
      return {
        runReturned: okCmd,
        usAfterDirect: root ? root.querySelectorAll('u').length : -1,
        colorsAfterDirect: root ? [...root.querySelectorAll('u')].map((u) => u.getAttribute('data-underline-color')) : [],
        isActive: ed.isActive('underline'),
        isFocused: ed.isFocused,
      }
    })()`)
    info(`§6 按钮 click 计数：${clicks}`)
    info('§6 直调命令 trace：' + JSON.stringify(direct))
  }
  ok('§6 🚨 冷启动后主按钮直接用 red（不是 auto）——「下次再点击下划线就是红色了」', after6.count > before6.count && (after6.colors || []).includes('red'), `before=${before6.count} after=${after6.count} colors=${JSON.stringify(after6.colors)} 点击尝试=${c6.tries}`)
  await shot(c2, SHOT)
  // 收尾：冷启动标签页用完即关（保持浏览器只剩应用页，避免污染后续 §8/§9 的前台与错误采集）
  try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${cold.target.id}`); c2.ws.close() } catch { /* 关不掉不影响结论 */ }
  traceT('S6 cold tab closed')

  // ---------- §8 保存往返：真机渲染的 HTML → 真实模块 → ++ 语法（修「一存就丢」） ----------
  console.log('\n=== 8. 保存往返：真机 HTML 经真实模块转出 ++ 语法 ===')
  traceT('S8 begin')
  const rt = await cdp.eval(ROUNDTRIP)
  traceT('S8 roundtrip done, ok=' + (rt && rt.ok))
  info('往返结果：' + JSON.stringify(rt))
  ok('§8 真机 HTML 里确实有 <u>（前置面非空）', rt.ok === true && rt.htmlHasU === true, `htmlHasU=${rt.htmlHasU}`)
  ok('§8 🚨 真机 HTML 转出的 Markdown 含 ++…++（下划线不再一存就丢）', rt.ok === true && rt.hasPlusSyntax === true, rt.ok ? `md=${JSON.stringify((rt.md || '').slice(0, 160))}` : `why=${rt.why}`)
  const pp = await cdp.eval(PARSE_PROBE)
  info('解析探针：' + JSON.stringify(pp))
  ok('§8 ++文本|red++ 解析出 data-underline-color="red"', pp.ok === true && pp.redHasAttr === true, pp.ok ? `html=${JSON.stringify(pp.redHtml)}` : `why=${pp.why}`)
  ok('§8 ++文本++ 解析出无属性 <u>（auto 归一化）', pp.ok === true && pp.autoNoAttr === true, pp.ok ? `html=${JSON.stringify(pp.autoHtml)}` : `why=${pp.why}`)

  // ---------- §9 无新增页面错误 ----------
  console.log('\n=== 9. 页面错误 ===')
  traceT('S9 begin')
  // 分两类，**不许用一条正则糊掉**：
  //   · 应用异常 = JS 异常 + 非资源类 console error（这才是回归信号）
  //   · 资源加载噪声 = dev-server 在 HMR / 反复导航下的 net::ERR_CONNECTION_CLOSED 之类
  //     （与本次改动无关，但仍如实打印条数与前两条，避免「静默忽略」）
  const allErrs = cdp.since(m0)
  const NOISE = /ResizeObserver loop|Permissions-Policy|Failed to load resource|net::ERR_(CONNECTION_CLOSED|ABORTED|EMPTY_RESPONSE)/
  const appErrs = allErrs.filter((e) => !NOISE.test(e))
  const noises = allErrs.filter((e) => NOISE.test(e))
  info(`资源加载/环境噪声 ${noises.length} 条${noises.length ? '：' + noises.slice(0, 2).join(' | ') : ''}`)
  ok('§9 全程无新增应用异常（JS 异常 / 非资源类 console error）', appErrs.length === 0, appErrs.slice(0, 3).join(' | '))

  const passed = results.filter((r) => r.cond).length
  traceT('DONE passed=' + passed + '/' + results.length)
  console.log(`\n=== 结果：${passed}/${results.length} ===`)
  if (passed !== results.length) {
    console.log('失败项：')
    results.filter((r) => !r.cond).forEach((r) => console.log(`  ❌ ${r.name}`))
  }
  ws.close()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针异常：', e); process.exit(3) })
