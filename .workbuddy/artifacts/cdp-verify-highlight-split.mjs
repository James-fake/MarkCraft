/**
 * CDP 真机探针 · 高亮 split button：主按钮应用「上次颜色」+ 16 色调色板 + 跨会话记忆（2026-09-23）
 * ==========================================================================
 * 用户原话：「这个高亮的按钮可以记住用户上一次高亮的颜色，例如默认：黄色、用户选择了红色，
 *            那么下次再点击高亮就是红色了；再优化这个高亮颜色选择列表，增加多颜色。」
 *
 * 设计（Word / VS Code split button 范式）：
 *   · 主按钮（高亮笔图标）  = 直接应用/切换「上次颜色」，**不开面板**
 *   · 右侧 12px 小箭头      = 展开 16 色调色板
 *   · 只有「在调色板里显式挑色」才改写上次颜色；主按钮 / Ctrl+Shift+H / 右键菜单都只是「应用上次色」
 *
 * 本探针要证伪的三件事：
 *   A. 主按钮点了「没反应」（历史报障）——所以必须验**编辑器 DOM 真的出现 <mark>**，不是只验函数被调用
 *   B. 面板「在 DOM 里但屏幕上不可见」（上轮 portal 裁切同类坑）——所以必须验 elementFromPoint 可命中
 *   C. 「记住了但只记在内存」——所以必须**整页 reload** 后回读指示条，证明确实落盘
 *
 * 阳性对照（HEAD，本特性提交前）：
 *   同一探针跑在 HEAD 上必须**翻红**在 §2/§3/§5/§6 —— 因为那时既没有箭头按钮、也没有 data-hl-last、
 *   调色板只有 5 色且没有外侧包裹层。注意：**扫描面的锚点选择器必须两版都存在**
 *   （这里用高亮笔图标的 `svg path[d^="M15.232 5.232"]` 反查其最近 button —— 该 path 两版完全一致），
 *   否则「HEAD 报红」的理由会变成「选择器在旧版不存在」= 归因不诚实（本仓踩过一次）。
 *
 * 用法（必须与 Edge 同一次前台 bash；CDP_PORT 须与 Edge 启动端口一致）：
 *   修复版： CDP_PORT=9480 MC_BASE=http://127.0.0.1:5174 node .workbuddy/artifacts/cdp-verify-highlight-split.mjs
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9480)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(new URL(BASE).port || 5174)
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/highlight-split.png'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const EXPECT_COLORS = 16

/** 高亮笔图标 path 前缀：**两版（HEAD / 修复版）字面一致**，用作实现无关的锚点 */
const PEN_D = 'M15.232 5.232'

/**
 * 从「高亮笔图标」反查：主按钮 / split 包裹层 / 箭头按钮。
 *
 * ⚠️ 箭头按钮的判定**刻意用纯几何**（与主按钮同容器、宽度 ≤20px 的窄控件），
 * **不许**用 `aria-label="选择高亮颜色"` 之类只在修复版存在的标记 —— 否则 HEAD 对照会
 * 「因为选择器在旧版不存在」而报红 = 假阳性归因（本仓已踩过一次）。
 * 用几何判定的好处：HEAD 的工具栏里每个按钮都 ≥28px，因此**天然找不到窄兄弟**，
 * 报红的原因是「split 箭头这种东西真的不存在」，归因诚实。
 */
const FIND_SPLIT = `(() => {
  const pen = [...document.querySelectorAll('svg path')]
    .find((p) => (p.getAttribute('d') || '').startsWith(${JSON.stringify(PEN_D)}))
  if (!pen) return { penFound: false }
  const mainBtn = pen.closest('button')
  if (!mainBtn) return { penFound: true, mainBtnFound: false }
  const wrap = mainBtn.parentElement
  const mr = mainBtn.getBoundingClientRect()
  const sibs = wrap ? [...wrap.querySelectorAll('button')].filter((b) => b !== mainBtn) : []
  const narrow = sibs.filter((b) => {
    const r = b.getBoundingClientRect()
    return r.width > 0 && r.width <= 20 && r.height > 0
  })
  const arrowBtn = narrow[0] || null
  const indicator = mainBtn.querySelector('[data-hl-last]')
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
    lastColorAttr: indicator ? indicator.getAttribute('data-hl-last') : null,
    indicatorBg: indicator ? getComputedStyle(indicator).backgroundColor : null,
    mainBtnCenter: { x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.top + mr.height / 2) },
    mainBtnVisible: mr.width > 0 && mr.height > 0,
  }
})()`

/**
 * 找 portal 出去的调色板：挂在 body 下、`display:grid`、含若干带 title 的色块。
 * 不依赖任何类名/data 属性 ⇒ HEAD 上同样能跑（只是找不到，count=0）。
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

/** 读编辑器正文里的 <mark>（渲染侧真凭实据） */
const READ_MARKS = `(() => {
  const root = document.querySelector('.tiptap')
  if (!root) return { rootFound: false }
  const marks = [...root.querySelectorAll('mark')]
  return {
    rootFound: true,
    count: marks.length,
    colors: marks.map((m) => m.getAttribute('data-highlight-color')),
    text: marks.map((m) => (m.textContent || '').slice(0, 12)),
    bg: marks.map((m) => getComputedStyle(m).backgroundColor),
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
      this.pending.set(id, { resolve: res, reject: rej })
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
async function ensureInputAlive(cdp, label = '', { tries = 10, ms = 500 } = {}) {
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
    if (!target) break
    await realClick(cdp, target.x, target.y, 260)
    const focused = await cdp.eval(`!!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.tiptap'))`)
    if (focused) {
      info(`输入预热就绪 @(${target.x},${target.y}) 命中=${target.atTag} 尝试=${i}${label ? ' · ' + label : ''}`)
      return { alive: true, tries: i, target }
    }
    await cdp.eval('window.focus()')
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
const NOTE_ID = 'hl-0'
const NOTE_NAME = '高亮测试笔记.md'
const NOTE_BODY = '# 高亮测试笔记\n\n这是一段用于测试高亮功能的示例正文内容，点击工具栏高亮按钮后应当被标记成背景色。再写一句保证段落足够长以便稳定选中整段文字。\n'
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
    tabs: [{ id: 'tab-hl-0', fileId: NOTE_ID, name: NOTE_NAME, isActive: true }],
    activeTabId: 'tab-hl-0',
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
    try {
      const raw = localStorage.getItem('markcraft_settings')
      const s = raw ? JSON.parse(raw) : {}
      s.editorMode = 'wysiwyg'
      // 每次开跑前把「上次颜色」清成默认黄，保证 §1 断言从干净初始态开始
      s.lastHighlightColor = 'yellow'
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
const readSettings = `(() => { try { return JSON.parse(localStorage.getItem('markcraft_settings') || '{}').lastHighlightColor ?? null } catch { return 'PARSE_ERR' } })()`

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
  const page = list.find((t) => t.type === 'page' && pageRe.test(t.url)) || list.find((t) => t.type === 'page')
  if (!page) {
    console.error(`未找到任何 page target；当前 targets:\n` + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检 / 种子（目标 ${BASE}，CDP ${CDP_PORT}，期望色数 ${EXPECT_COLORS}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  await cdp.send('Page.navigate', { url: `${BASE}/#view=editor` })
  await sleep(1200)
  ok('§0 应用外壳就绪', (await ready(cdp)) >= 0)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  const seedRes = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功', seedRes === true, typeof seedRes === 'string' ? 'seedErr=' + seedRes : 'ok')
  await cdp.send('Page.navigate', { url: `${BASE}/?seed=${Date.now()}#view=editor` })
  await sleep(1000)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  await sleep(800)

  const editorReady = await waitFor(cdp, `!!document.querySelector('.tiptap')`, { tries: 30, ms: 400, label: '.tiptap' })
  ok('§1 编辑器已打开种子笔记', editorReady >= 0)
  const toolbarReady = await waitFor(cdp, `[...document.querySelectorAll('svg path')].some((p) => (p.getAttribute('d')||'').startsWith(${JSON.stringify(PEN_D)}))`, { tries: 20, ms: 300, label: '高亮笔图标' })
  ok('§1 格式工具栏已渲染高亮按钮（扫描面非空）', toolbarReady >= 0)
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
  ok('§2 主按钮带「上次颜色」指示条，初始 = yellow', s2.lastColorAttr === 'yellow', `data-hl-last=${s2.lastColorAttr} bg=${s2.indicatorBg}`)
  ok('§2 localStorage 初始 = yellow', (await cdp.eval(readSettings)) === 'yellow')

  // ---------- §3 箭头 → 16 色调色板，且屏幕上可命中 ----------
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
  await shot(cdp, SHOT.replace(/\.png$/, '-palette.png'))

  // ---------- §4 主按钮：不开面板、直接应用「上次色」 ----------
  console.log('\n=== 4. 主按钮行为（应直接应用上次色，且不依赖面板）===')
  // 先关掉面板。这里刻意**不用真实鼠标点击空白处**——左上角空白在 Aurora 里紧邻侧栏条目，
  // 误点会切视图、污染后续断言。外部点击收起行为已由上一条探针覆盖，此处只求确定性。
  await cdp.eval(`document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }))`)
  await sleep(250)
  const pClosed = await cdp.eval(FIND_PALETTE)
  ok('§4 点面板外空白后调色板收起', pClosed.found === false || pClosed.count === 0 || !pClosed.panelR || pClosed.panelR.height === 0)
  const sel = await cdp.eval(SELECT_FIRST_PARA)
  info('选区：' + JSON.stringify(sel))
  ok('§4 已设状态选区（选中面非空）', sel.ok === true && sel.size > 0)
  const before4 = await cdp.eval(READ_MARKS)
  info(`§4 应用前 mark 数 = ${before4.count}`)
  const c4 = await clickUntil(cdp, s2.mainBtnCenter, READ_MARKS, (v) => v.count > before4.count)
  info(`§4 主按钮点击：ok=${c4.ok} 尝试=${c4.tries} value=${JSON.stringify({ count: c4.value.count, colors: c4.value.colors })}`)
  const after4 = c4.value
  const pAfter4 = await cdp.eval(FIND_PALETTE)
  info('应用后：' + JSON.stringify({ markCount: after4.count, colors: after4.colors, bg: after4.bg, html: (after4.html || '').slice(0, 240) }))
  ok('§4 🚨 主按钮点击后编辑器真出现 <mark>（历史报障「没反应」的正面证据）', after4.count > before4.count, `before=${before4.count} after=${after4.count} 点击尝试=${c4.tries}`)
  ok('§4 主按钮用「上次色」= yellow：mark 无 color 属性或显式 yellow', after4.colors.length === 0 || after4.colors.every((c) => c === null || c === 'yellow'), `colors=${JSON.stringify(after4.colors)}`)
  ok('§4 主按钮不展开调色板（split 语义）', pAfter4.found === false || pAfter4.count === 0 || (pAfter4.panelR && pAfter4.panelR.height === 0), `paletteCount=${pAfter4.count}`)

  // ---------- §5 调色板挑红色 → 记住；此后主按钮直接用红 ----------
  console.log('\n=== 5. 调色板挑「红」→ 落盘 + 主按钮改用红 ===')
  // HEAD 对照下 arrow 为 null ⇒ 不能直接点，如实记为未通过而不是让探针崩掉
  const reopened = arrow ? await openPalette(cdp, arrow) : { opened: false, tries: 0, panel: { found: false, count: 0 } }
  const p2 = reopened.panel
  info(`§5 面板重开：opened=${reopened.opened} 重试次数=${reopened.tries}${arrow ? '' : '（无箭头控件 ⇒ 无法展开，HEAD 预期如此）'}`)
  const red = (p2.hits || []).find((h) => h.title === 'red')
  ok('§5 调色板里能找到 red 色块且可命中', !!red && red.hitSelf === true, red ? `@(${red.cx},${red.cy}) hitSelf=${red.hitSelf}` : 'red 不存在')
  if (red) {
    const c5 = await clickUntil(cdp, { x: red.cx, y: red.cy }, READ_MARKS, (v) => (v.colors || []).includes('red'))
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
  const after5 = await cdp.eval(READ_MARKS)
  ok('§5 mark 已成为红色（data-highlight-color=red）', after5.colors.includes('red'), `colors=${JSON.stringify(after5.colors)}`)
  const s5 = await cdp.eval(FIND_SPLIT)
  ok('§5 🚨 指示条已记住 red（data-hl-last 即时更新，无需重载）', s5.lastColorAttr === 'red', `data-hl-last=${s5.lastColorAttr} bg=${s5.indicatorBg}`)
  const ls5 = await cdp.eval(readSettings)
  ok('§5 localStorage.lastHighlightColor = red（落盘）', ls5 === 'red', `ls=${ls5}`)

  // ---------- §6 整页 reload → 记忆跨会话生效 ----------
  console.log('\n=== 6. 整页 reload：记忆必须从磁盘回来 ===')
  await cdp.send('Page.navigate', { url: `${BASE}/?reload=${Date.now()}#view=editor` })
  await sleep(1200)
  ok('§6 reload 后外壳就绪', (await ready(cdp)) >= 0)
  info(`§6 reload 后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  await sleep(600)
  await waitFor(cdp, `!!document.querySelector('.tiptap')`, { tries: 30, ms: 400, label: '.tiptap(reload)' })
  const s6 = await cdp.eval(FIND_SPLIT)
  ok('§6 🚨 reload 后指示条仍为 red（记住上次颜色，跨会话生效）', s6.lastColorAttr === 'red', `data-hl-last=${s6.lastColorAttr}`)
  ok('§6 reload 后 localStorage 仍为 red', (await cdp.eval(readSettings)) === 'red')
  // 恢复选区后点主按钮 → 应直接应用 red（不再需要开面板）
  // 顺序要点：**预热点击会移动光标**，必须在设选区**之前**做，否则刚设的选区会被点掉。
  await ensureInputAlive(cdp, '§6 主按钮前')
  const sel6 = await cdp.eval(SELECT_FIRST_PARA)
  ok('§6 reload 后可重设选区', sel6.ok === true && sel6.size > 0, JSON.stringify(sel6))
  // 先清掉 mark（切换语义：已在 red 上点主按钮会取消高亮）
  await cdp.eval(`(() => { const ed = ${FIND_EDITOR}; if (ed && ed.commands && ed.commands.unsetHighlight) ed.commands.unsetHighlight(); return true })()`)
  await sleep(250)
  const before6 = await cdp.eval(READ_MARKS)
  // 🚨 双路 trace：把「click 有没有到按钮」与「命令本身能不能执行」**分开取证**
  // （本仓教训——「点击无反应」别靠读代码推理）。
  await cdp.eval(`(() => {
    window.__hlClicks = { onBtn: 0, onSvgChild: 0 }
    if (window.__hlClickHook) document.removeEventListener('click', window.__hlClickHook, true)
    window.__hlClickHook = (e) => {
      const pen = [...document.querySelectorAll('svg path')].find((p) => (p.getAttribute('d') || '').startsWith(${JSON.stringify(PEN_D)}))
      const btn = pen && pen.closest('button')
      if (!btn) return
      if (e.target === btn) window.__hlClicks.onBtn++
      else if (btn.contains(e.target)) window.__hlClicks.onSvgChild++
    }
    document.addEventListener('click', window.__hlClickHook, true)
    return true
  })()`)
  const diag6 = await cdp.eval(`(() => {
    const pen = [...document.querySelectorAll('svg path')].find((p) => (p.getAttribute('d') || '').startsWith(${JSON.stringify(PEN_D)}))
    const btn = pen && pen.closest('button')
    const hit = document.elementFromPoint(${s6.mainBtnCenter.x}, ${s6.mainBtnCenter.y})
    const ed = ${FIND_EDITOR}
    const sel = ed && ed.state ? ed.state.selection : null
    return {
      tiptapCount: document.querySelectorAll('.tiptap').length,
      hitIsBtn: hit === btn,
      hitDesc: hit ? (hit.tagName + '.' + (hit.className || '').toString().slice(0, 40)) : null,
      hitTitle: hit ? hit.getAttribute('title') : null,
      btnRect: btn ? (({ left, top, width, height }) => ({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) }))(btn.getBoundingClientRect()) : null,
      btnPointerEvents: btn ? getComputedStyle(btn).pointerEvents : null,
      activeEl: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 30) : null,
      sel: sel ? { from: sel.from, to: sel.to, empty: sel.empty } : null,
      edHasHighlightCmd: !!(ed && ed.commands && ed.commands.setHighlight),
      edIsFocused: ed ? ed.isFocused : null,
      edIsActiveHighlight: ed ? ed.isActive('highlight') : null,
      markerCount: (() => { const r = document.querySelector('.tiptap'); return r ? r.querySelectorAll('mark').length : -1 })(),
    }
  })()`)
  info('§6 点击前 trace：' + JSON.stringify(diag6))
  const c6 = await clickUntil(cdp, s6.mainBtnCenter, READ_MARKS, (v) => v.count > before6.count, { tries: 5 })
  info(`§6 主按钮点击：ok=${c6.ok} 尝试=${c6.tries}`)
  const after6 = c6.value
  if (!c6.ok) {
    const clicks = await cdp.eval('JSON.stringify(window.__hlClicks || {})')
    // 直调命令：若这里能出 mark，则「编辑器/命令」没问题，锅在 click 投递链路
    const direct = await cdp.eval(`(() => {
      const ed = ${FIND_EDITOR}
      if (!ed) return { why: 'no editor' }
      const selBefore = ed.state.selection
      ed.commands.setTextSelection({ from: selBefore.from, to: selBefore.to })
      const okCmd = ed.chain().focus().unsetHighlight().setHighlight({ color: 'red' }).run()
      const root = document.querySelector('.tiptap')
      return {
        runReturned: okCmd,
        marksAfterDirect: root ? root.querySelectorAll('mark').length : -1,
        colorsAfterDirect: root ? [...root.querySelectorAll('mark')].map((m) => m.getAttribute('data-highlight-color')) : [],
        isActive: ed.isActive('highlight'),
        isFocused: ed.isFocused,
      }
    })()`)
    info(`§6 按钮 click 计数：${clicks}`)
    info('§6 直调命令 trace：' + JSON.stringify(direct))
  }
  ok('§6 🚨 主按钮直接用 red（不是 yellow）——「下次再点击高亮就是红色了」', after6.count > before6.count && (after6.colors || []).includes('red'), `before=${before6.count} after=${after6.count} colors=${JSON.stringify(after6.colors)} 点击尝试=${c6.tries}`)
  await shot(cdp, SHOT)

  // ---------- §7 无新增页面错误 ----------
  console.log('\n=== 7. 页面错误 ===')
  // 分两类，**不许用一条正则糊掉**：
  //   · 应用异常 = JS 异常 + 非资源类 console error（这才是回归信号）
  //   · 资源加载噪声 = dev-server 在 HMR / 反复导航下的 net::ERR_CONNECTION_CLOSED 之类
  //     （与本次改动无关，但仍如实打印条数与前两条，避免「静默忽略」）
  const allErrs = cdp.since(m0)
  const NOISE = /ResizeObserver loop|Permissions-Policy|Failed to load resource|net::ERR_(CONNECTION_CLOSED|ABORTED|EMPTY_RESPONSE)/
  const appErrs = allErrs.filter((e) => !NOISE.test(e))
  const noises = allErrs.filter((e) => NOISE.test(e))
  info(`资源加载/环境噪声 ${noises.length} 条${noises.length ? '：' + noises.slice(0, 2).join(' | ') : ''}`)
  ok('§7 全程无新增应用异常（JS 异常 / 非资源类 console error）', appErrs.length === 0, appErrs.slice(0, 3).join(' | '))

  const passed = results.filter((r) => r.cond).length
  console.log(`\n=== 结果：${passed}/${results.length} ===`)
  if (passed !== results.length) {
    console.log('失败项：')
    results.filter((r) => !r.cond).forEach((r) => console.log(`  ❌ ${r.name}`))
  }
  ws.close()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针异常：', e); process.exit(3) })
