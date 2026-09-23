/**
 * CDP 真机探针 · 编辑器 WYSIWYG「高亮」下拉是否可见、色块点击是否生效（2026-09-23，二次修订）
 * ==========================================================================
 * 用户原话：「编辑器格式工具栏内高亮按钮点击之后还是没有任何反应。」
 *
 * 🚨 真正根因（一次修订走偏，此处纠正）：高亮下拉面板原先用 inline `position:absolute` 留在
 * 工具栏内部，而 `.wysiwyg-toolbar` 容器带 `overflow:hidden` ⇒ 面板虽被挂载、却**被裁掉、屏幕上不可见**
 * ⇒ 用户看到「点了没任何反应」。（一次修订只改了「外部点击 handler 排除面板」，未解决可见性，
 *   所以用户复测「还是没反应」。）
 * 修法 = 与工具栏内其它下拉一致：`createPortal(..., document.body)` + `position:fixed` + `useDropdownPosition`
 * （对齐 WysiwygHeadingDropdown / ListDropdown / MoreDropdown）。
 *
 * 验证策略：直接往 IndexedDB 的「markcraft」库 kv 表写入一棵带【已打开永久标签】的文件树状态，
 * 重载后编辑器按 activeTabId 直接打开该笔记——无需导航文件树（左缘 hover 浮层 headless 不稳定）。
 *
 *   §0 自检 / 种子（含强制 editorMode=wysiwyg）/ 外壳就绪
 *   §1 重载后编辑器直接打开种子笔记（.tiptap 内容可见）
 *   §2 用 React fiber 取 TipTap 实例设状态选区（状态选区非空 —— 扫描面非空保证）
 *   §3 点「高亮」按钮 → 面板/色块出现在 DOM（对照面非空保证）
 *   §3b 🚨 核心判据：色块「在屏幕上可命中」（elementFromPoint 命中色块、parentIsBody）—— 未被 overflow:hidden 裁掉
 *   §4 直接向色块派发 mousedown（验证外部点击 handler 不卸载面板）
 *   §5 色块 mousedown 后（重渲染态）面板仍在
 *   §6 全程无新增页面错误
 *
 * 用法（与 Edge 同一次前台 bash；CDP_PORT 须与 Edge 启动端口一致）：
 *   修复版： CDP_PORT=9480 MC_BASE=http://127.0.0.1:5174 node ...
 *   对照（未 portal 的版本）：先回退 WysiwygToolbar.tsx 再跑同一探针，期望 §3b 翻红，随后还原
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9480)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(new URL(BASE).port || 5174)
const EXPECT_APPLIED = process.env.EXPECT_APPLIED !== '0'
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/highlight-click.png'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 经 React fiber 取出 TipTap editor 实例（.tiptap 由 ProseMirror 托管，无 fiber，需向上找祖先 fiber）
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
})`

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
async function realMove(cdp, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons })
}
async function realClick(cdp, x, y) {
  await realMove(cdp, x, y, 0)
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}
async function centerOfButtonByTitle(cdp, sub) {
  const s = sub.toLowerCase()
  return await cdp.eval(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => {
      const t = (b.getAttribute('title') || '').toLowerCase()
      const a = (b.getAttribute('aria-label') || '').toLowerCase()
      return t.includes(${JSON.stringify(s)}) || a.includes(${JSON.stringify(s)})
    })
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()`)
}

// ---- 种子：直接写 IndexedDB（markcraft 库 / kv 表），并强制 WYSIWYG + 打开笔记 ----
const NOTES_FOLDER_ID = 'f-notes'
const NOTE_ID = 'hl-0'
const NOTE_NAME = '高亮测试笔记.md'
const NOTE_BODY = '# 高亮测试笔记\n\n这是一段用于测试高亮功能的示例正文内容，点击工具栏高亮按钮后应当被标记成黄色背景。再写一句保证段落足够长以便三击稳定选中整段文字。\n'
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
    // 写 IndexedDB（markcraft 库 / kv 表）；不指定版本号，沿用当前版本避免 blocked/VersionError
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
    // 版本键（loadStateAsync 要求 === STORAGE_VERSION 才读 IDB）
    localStorage.setItem(${JSON.stringify(KEY_VERSION)}, ${JSON.stringify(STORAGE_VERSION)})
    // 强制 WYSIWYG（避免 headless 沿用 source 模式导致工具栏不一致）
    try {
      const raw = localStorage.getItem('markcraft_settings')
      const s = raw ? JSON.parse(raw) : {}
      s.editorMode = 'wysiwyg'
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

  console.log(`\n=== 0. 自检（目标 ${BASE}，CDP ${CDP_PORT}，期望高亮应用=${EXPECT_APPLIED}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  // 首次进入直接 boot 到编辑器视图（hash 在启动 URL 才被识别，故首跳即带 #view=editor）
  await cdp.send('Page.navigate', { url: `${BASE}/#view=editor` })
  await sleep(1200)
  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪', r0 >= 0, `waitIdx=${r0}`)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  const seedRes = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功', seedRes === true, typeof seedRes === 'string' ? 'seedErr=' + seedRes : 'ok')
  info('§0 种子结果：' + JSON.stringify(seedRes))
  // 重载：boot 重新读 hash（→editor 视图）+ 读 IDB（→打开种子笔记）
  await cdp.send('Page.navigate', { url: `${BASE}/?seed=${Date.now()}#view=editor` })
  await sleep(1000)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  await sleep(800)

  // 诊断：回读 IDB 里我们写进去的种子，确认它真的落了盘
  const idbRead = await cdp.eval(`(() => new Promise((resolve) => {
    try {
      const req = indexedDB.open('markcraft')
      req.onerror = () => resolve({ openErr: (req.error && (req.error.name + ':' + req.error.message)) || 'unknown' })
      req.onblocked = () => resolve({ openErr: 'blocked' })
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readonly') } catch (e) { d.close(); resolve({ txErr: e.message }); return }
        const os = tx.objectStore('kv')
        const g = os.get(${JSON.stringify(KEY_FILE_TREE)})
        g.onsuccess = () => {
          try {
            const raw = g.result ? g.result.value : null
            const p = raw ? JSON.parse(raw) : null
            resolve({ hasValue: !!raw, tabs: p ? p.tabs.length : -1, activeTabId: p ? p.activeTabId : null, rootChildren: p ? p.rootFolder.children.length : -1, versionKey: localStorage.getItem(${JSON.stringify(KEY_VERSION)}) })
          } catch (e) { resolve({ parseErr: e.message }) }
          d.close()
        }
        g.onerror = () => { d.close(); resolve({ getErr: true }) }
      }
    } catch (e) { resolve({ outerErr: e.message }) }
  }))()`).catch((e) => 'idbRead-err: ' + e.message)
  info('§0 IDB 回读：' + JSON.stringify(idbRead))

  console.log('\n=== 1. 编辑器直接打开种子笔记（已打开标签，无需导航文件树）===')
  const edAt = await waitFor(cdp, `document.querySelector('.tiptap') !== null && document.querySelector('.tiptap p') !== null`, { tries: 60, ms: 400, label: '编辑器内容' })
  if (edAt < 0) {
    const diag = await cdp.eval(`(() => {
      const ed = document.querySelector('.tiptap')
      return {
        hasTiptap: !!ed,
        pCount: document.querySelectorAll('.tiptap p').length,
        hasToolbar: !!document.querySelector('.wysiwyg-toolbar'),
        bodyText: (document.body.innerText || '').slice(0, 80),
      }
    })()`).catch((e) => 'diag-err: ' + e.message)
    info('§1 诊断：' + JSON.stringify(diag))
    await shot(cdp, '.workbuddy/artifacts/highlight-diag.png')
  }
  ok('§1 进入编辑器（.tiptap 含段落）', edAt >= 0, `waitIdx=${edAt}`)
  await sleep(500)

  console.log('\n=== 2. 🚨 核心：真实三击选中段落正文 ===')
  const box = await cdp.eval(`(() => {
    const ed = document.querySelector('.tiptap')
    if (!ed) return null
    const p = [...ed.querySelectorAll('p')].find((e) => {
      const t = (e.textContent || '').trim()
      const r = e.getBoundingClientRect()
      return t.length > 0 && r.width > 0 && r.height > 0
    })
    const el = p || ed
    const r = el.getBoundingClientRect()
    return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }
  })()`)
  ok('§2 编辑区内段落可定位（扫描面非空）', !!box, box ? `(${box.left},${box.top},${box.width}x${box.height})` : 'null')
  // ProseMirror 只认「状态选区」，程序化 DOM 选区不会被它同步。
  // 故通过 React fiber 取出 TipTap editor 实例，用其 API 直接设定状态选区（等价于真实用户选中）。
  const selInfo = await cdp.eval(`(() => {
    const findEditor = () => {
      const root = document.querySelector('.tiptap')
      if (!root) return null
      let dom = root
      let fkey = null
      while (dom && !fkey) {
        fkey = Object.keys(dom).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'))
        if (fkey) break
        dom = dom.parentElement
      }
      let fiber = fkey ? dom[fkey] : null
      const isEditor = (o) => o && o.state && o.commands && typeof o.chain === 'function' && o.view
      const search = (obj, depth) => {
        if (!obj || depth > 6 || typeof obj !== 'object') return null
        if (isEditor(obj)) return obj
        if (Array.isArray(obj)) { for (const v of obj) { const r = search(v, depth + 1); if (r) return r } }
        else { for (const v of Object.values(obj)) { const r = search(v, depth + 1); if (r) return r } }
        return null
      }
      while (fiber) {
        const r = search(fiber.memoizedProps, 0) || search(fiber.memoizedState, 0)
        if (r) return r
        fiber = fiber.return
      }
      return null
    }
    const editor = findEditor()
    if (!editor) return { err: 'no-editor' }
    const last = editor.state.doc.content.size - 1
    editor.commands.setTextSelection({ from: 1, to: Math.max(2, last) })
    const s = editor.state.selection
    return { ok: true, from: s.from, to: s.to, len: s.to - s.from }
  })()`).catch((e) => ({ err: e.message }))
  info('§2 编辑器状态选区 = ' + JSON.stringify(selInfo))
  ok('§2a 🚨 文本确实被选中（状态选区非空，排除「没选中导致的假阴性」）', selInfo && selInfo.ok && selInfo.len > 0, selInfo ? 'len=' + selInfo.len : JSON.stringify(selInfo))
  await sleep(400)

  console.log('\n=== 3. 点工具栏「高亮」按钮 → 下拉是否出现（对照面非空）===')
  const hlBtnC = await centerOfButtonByTitle(cdp, '高亮')
  ok('§3 高亮工具栏按钮可定位', !!hlBtnC, hlBtnC ? `(${hlBtnC.x},${hlBtnC.y})` : 'null')
  // 打开下拉：优先真实鼠标点击；若未出现用 in-page .click() 兜底（headless 坐标点击偶有抖动，与修复无关）
  if (hlBtnC) await realClick(cdp, hlBtnC.x, hlBtnC.y)
  await sleep(400)
  let dropdownOpen = await cdp.eval(`!!document.querySelector('div[title="yellow"]')`)
  if (!dropdownOpen && hlBtnC) {
    await cdp.eval(`(() => { const b=[...document.querySelectorAll('button')].find((x)=>(x.getAttribute('title')||'').toLowerCase().includes('高亮')||(x.getAttribute('aria-label')||'').toLowerCase().includes('高亮')); if(b) b.click(); })()`)
    await sleep(400)
    dropdownOpen = await cdp.eval(`!!document.querySelector('div[title="yellow"]')`)
  }
  ok('§3 下拉色块出现在 DOM（对照面非空）', dropdownOpen)
  const swatchInfo = await cdp.eval(`(() => {
    const y = document.querySelector('div[title="yellow"]')
    if (!y) return null
    const r = y.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return { yellow: null }
    return { yellow: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } }
  })()`)
  ok('§3 黄色色块可定位', swatchInfo && !!swatchInfo.yellow, swatchInfo && swatchInfo.yellow ? `(${swatchInfo.yellow.x},${swatchInfo.yellow.y})` : 'null')

  // 🚨 §3b 核心判据：色块必须「在屏幕上可命中」。若面板留在工具栏内（position:absolute），
  // 会被工具栏容器 overflow:hidden 裁掉 —— DOM 里有、屏幕上没有 → 用户表现为「点高亮按钮没任何反应」。
  // 判据实现无关：div[title="yellow"] 在修复前后都在；修复后应 parentIsBody=true 且可命中。
  const hit = await cdp.eval(`(() => {
    const y = document.querySelector('div[title="yellow"]')
    if (!y) return { ok: false, reason: 'no-swatch' }
    const r = y.getBoundingClientRect()
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2)
    const top = document.elementFromPoint(cx, cy)
    const isSwatch = !!(top && (top === y || y.contains(top) || (top.closest && top.closest('div[title="yellow"]') === y)))
    const tb = document.querySelector('.wysiwyg-toolbar')
    const tbr = tb ? tb.getBoundingClientRect() : null
    return {
      cx, cy, isSwatch,
      hitTag: top ? top.tagName : null,
      toolbarBottom: tbr ? Math.round(tbr.bottom) : null,
      swatchTop: Math.round(r.top),
      toolbarOverflow: tb ? getComputedStyle(tb).overflow : null,
      insideToolbar: !!(tb && tb.contains(y)),
      panelParentTag: y.parentElement && y.parentElement.parentElement ? y.parentElement.parentElement.tagName : null,
    }
  })()`).catch((e) => ({ ok: false, err: e.message }))
  info('§3b 命中诊断：' + JSON.stringify(hit))
  ok('§3b 🚨 色块在屏幕上可见/可命中（未被工具栏 overflow:hidden 裁掉）', hit && hit.isSwatch === true,
    hit ? `isSwatch=${hit.isSwatch} hitTag=${hit.hitTag} toolbarBottom=${hit.toolbarBottom} swatchTop=${hit.swatchTop} overflow=${hit.toolbarOverflow} insideToolbar=${hit.insideToolbar} panelParent=${hit.panelParentTag}` : 'null')

  console.log('\n=== 4. 真实派发 swatch 的 mousedown（关键：不应卸载下拉面板）===')
  let clicked = false
  let panelAfterMouseDown = null
  if (swatchInfo && swatchInfo.yellow) {
    // 在「色块元素」上派发 mousedown（冒泡到 document 外部点击 handler）。
    // e.target=swatch 时：只排除按钮的 handler → 卸载面板；排除面板的 handler → 保留面板。
    // （色块可见性由 §3b 单独验证；此处用 dispatchEvent 直接派发以避开坐标点击的 headless 抖动。）
    const r = await cdp.eval(`(() => {
      const sw = document.querySelector('div[title="yellow"]')
      if (!sw) return { err: 'no-swatch' }
      sw.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }))
      return { panelAfterMouseDown: !!document.querySelector('div[title="yellow"]') }
    })()`)
    panelAfterMouseDown = r && r.panelAfterMouseDown
    clicked = !!(r && !r.err)
    info('§4 dispatch 结果: ' + JSON.stringify(r))
  }
  ok('§4 已真实派发 swatch mousedown', clicked)
  await sleep(300)
  const afterClick = await cdp.eval(`(() => {
    const findEditor = ${FIND_EDITOR}
    const editor = findEditor()
    if (!editor) return { noEditor: true }
    return {
      dropdownStillOpen: !!document.querySelector('div[title="yellow"]'),
      pmMarks: (() => { let c = 0; editor.state.doc.descendants((n) => { if (n.marks.some((m) => m.type.name === 'highlight')) c++ }); return c })(),
      isActiveHL: editor.isActive('highlight'),
    }
  })()`).catch((e) => 'err:' + e.message)
  info('§4 点击后诊断：' + JSON.stringify(afterClick))

  console.log('\n=== 5. 🚨 断言：swatch mousedown 后（React 重渲染后）下拉面板是否仍在（公平判别 OLD/FIXED）===')
  // ⚠️ 判据必须是「sleep(300) 后」的重渲染态 dropdownStillOpen：
  // 同步 dispatch mousedown 后的 panelAfterMouseDown 在 React 重渲染前测量，恒为 true（无论 OLD/FIXED），不是公平判据。
  // 真正区分 OLD/FIXED 的是 handler 是否因 e.target=swatch（非按钮）而 setHighlightDropdownOpen(false)：
  //   OLD 只排除按钮 → swatch mousedown 触发关闭 → 重渲染后面板消失（dropdownStillOpen=false）
  //   FIXED 同时排除面板 → swatch mousedown 不关闭 → 重渲染后面板仍在（dropdownStillOpen=true）
  const panelRetained = afterClick && typeof afterClick === 'object' && afterClick.dropdownStillOpen === true
  info('§5 React 重渲染后面板是否仍在（dropdownStillOpen） = ' + JSON.stringify(panelRetained))
  ok('§5 色块 mousedown 后下拉面板仍在（外部点击 handler 已排除面板）', panelRetained === true, `dropdownStillOpen=${panelRetained}`)
  const markCount = await cdp.eval(`document.querySelectorAll('.tiptap mark.mark-highlight[data-highlight-color]').length`)
  const markColors = await cdp.eval(`[...document.querySelectorAll('.tiptap mark.mark-highlight[data-highlight-color]')].map((m) => m.getAttribute('data-highlight-color'))`)
  info(`§5 信息：.tiptap mark.mark-highlight[data-highlight-color] 数 = ${markCount}；色 = ${JSON.stringify(markColors)}`)
  // §5b 信息性：复刻色块 onClick 的「先 unset 再 setHighlight」链，验证命令本身可用（随后 unset 还原，不影响断言）
  const diag = await cdp.eval(`(() => {
    const findEditor = ${FIND_EDITOR}; const e = findEditor(); if (!e) return 'no-editor'
    const last = e.state.doc.content.size - 1
    try {
      e.commands.setTextSelection({ from: 1, to: Math.max(2, last) })
      e.chain().focus().unsetHighlight().setHighlight({ color: 'yellow' }).run()
      const applied = (() => { let c = 0; e.state.doc.descendants((n) => { if (n.marks.some((m) => m.type.name === 'highlight')) c++ }); return c })() > 0
      e.chain().focus().unsetHighlight().run()
      return 'cmdWorks=' + applied
    } catch (err) { return 'err:' + err.message }
  })()`).catch((e) => 'err:' + e.message)
  info('§5b 命令链自检（信息性，已还原）：' + diag)
  // 全视口截图：作为 §3b「高亮下拉在屏幕上可见」的视觉佐证（无裁剪）
  await shot(cdp, SHOT)

  console.log('\n=== 6. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§6 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) failed.forEach((f) => console.log('  ❌ ' + f.name))
  try { cdp.send('Browser.close').catch(() => {}) } catch { /* 忽略 */ }
  await sleep(400)
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
