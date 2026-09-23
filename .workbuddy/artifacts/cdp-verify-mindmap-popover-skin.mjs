/**
 * CDP 真机探针 · 思维导图模板浮层「回归 aurora 浮层基底」（2026-09-24）
 * ==========================================================================
 * 报障原话：「现在编辑功能界面……思维导图列表的样式居然还是用的是最旧一版的 ui 设计样式」。
 *
 * 根因（非"颜色写错"，而是"整体逃出 aurora 作用域"）：
 *   该浮层经 createPortal 挂到 document.body = #aurora-root 的**兄弟**；
 *   而 tokens.css 把 base.css 旧蓝系变量重映射成 --mc-* 的那层**只写在 `#aurora-root{}` 里**
 *   ⇒ 浮层里的 var(--editor-bg/--editor-text/--editor-border/--code-bg) 一律回落
 *   src/styles/base.css 的旧 slate 值（#0f172a / #e2e8f0 / #334155 / #1e293b），
 *   --hover-bg 更是只定义在 .aurora-editor 内 ⇒ portal 里落回内联旧蓝 rgba(59,130,246,.1)。
 *   外加 Tailwind 遗留（borderRadius '0.5rem'、shadow-lg 字面量）与魔法 z-index 9999。
 *
 * 本探针要证明的（对照 aurora 权威值逐条量 computed 样式）：
 *   §1 扫描面非空：浮层确实被打开（**锚点 = 「思维导图模板」标题 + 其 position:fixed 祖先**，
 *      这两点 HEAD/修复版都存在 ⇒ 归因诚实，不会"因为选择器在旧版不存在"而红）
 *   §2 已回归同族基底 `.aurora-dropdown`（与 MoreDropdown / ListDropdown 等同一套）
 *   §3 材质/边框/圆角/阴影/层级 = 直接取自全局 --mc-*（与 CSSOM 里 token 字面值逐项比对）
 *   §4 🚨 反向对照：不再是旧 slate / 旧蓝（HEAD 上必然红）
 *   §5 模板行复用 `.aurora-dropdown__item`，hover 走 --mc-accent-soft（不再手写旧蓝 hover）
 *   §6 全程无新增应用异常
 *
 * 用法（必须与 Edge 同一次前台 bash；CDP_PORT 须与 Edge 启动端口一致）：
 *   修复版：CDP_PORT=9492 node .workbuddy/artifacts/cdp-verify-mindmap-popover-skin.mjs
 *   阳性对照：把 src/features/editor/toolbar/MindmapPopover.tsx 临时还原 HEAD 后跑同一条命令。
 */
import { WebSocket } from 'ws'
import { appendFileSync, writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9492)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(new URL(BASE).port || 5174)
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/mindmap-popover-skin.png'
const TRACE = process.env.MC_TRACE || ''
const CDP_TIMEOUT_MS = 20000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const trace = (s) => { if (TRACE) { try { appendFileSync(TRACE, `[${new Date().toISOString()}] ${s}\n`) } catch { /* ignore */ } } }
const t0 = Date.now()
const traceT = (s) => trace(`${s} (+${((Date.now() - t0) / 1000).toFixed(1)}s)`)

/**
 * aurora 权威值 —— 🚨 **必须读运行时 CSSOM，不能抄 tokens.css 的字面值**：
 * 本项目存在**第二层 `:root` 覆盖**（desktop-chrome.css 等，后者赢），实测运行时
 *   --mc-bg-elevated = #1A1C24（tokens.css 里写的是 #151821）
 *   --mc-border-subtle = #292E30（tokens.css 里写的是 #1A1D26）
 *   --mc-text-primary = #E6E8EF（tokens.css 里写的是 #E8ECF4）
 * 照字面值硬编码 ⇒ 断言会把「用对了 token」误判成红（首版实测踩到 3 条）。
 * 读运行时真值反而**更强**：它证明「computed 值 = 该 token 的当前生效值」，而不只是"等于某个色号"。
 */
const READ_TOKENS = `(() => {
  const cs = getComputedStyle(document.documentElement)
  const names = ['--mc-bg-elevated', '--mc-bg-content', '--mc-border-medium', '--mc-border-subtle',
                 '--mc-text-primary', '--mc-accent-soft', '--mc-radius-md', '--mc-radius-sm']
  const o = {}
  names.forEach((n) => { o[n] = cs.getPropertyValue(n).trim() })
  return o
})()`
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, '')
/** 旧版（base.css 的 slate/蓝）—— 反向对照用（这些是 HEAD 实测值，不随 token 层变化） */
const OLD = { bg: 'rgb(15, 23, 42)', border: 'rgb(51, 65, 85)', text: 'rgb(226, 232, 240)', code: 'rgb(30, 41, 59)' }
const OLD_HOVER = 'rgba(59, 130, 246, 0.1)'
const hexToRgb = (hex) => {
  const m = String(hex).replace('#', '').trim()
  if (/^[0-9a-fA-F]{6}$/.test(m)) {
    const n = parseInt(m, 16)
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
  }
  return String(hex) // 已是 rgb()/rgba() 形态（如 --mc-accent-soft）
}

/**
 * 扫描面锚点（**两版都存在**，实现无关）：
 *   浮层标题 span（zh「思维导图模板」）→ 向上找第一个 `position: fixed` 的祖先 = 浮层根。
 * ⚠️ 刻意**不**用 `className="aurora-dropdown"` / `[role=menu]` 当入口 —— 前者只在修复版存在，
 *   会产出"红得不对"的假阳性证据（本仓踩过：坑 U）。
 */
const FIND_POPOVER = `(() => {
  const title = [...document.querySelectorAll('body span')]
    .find((s) => (s.textContent || '').trim() === '思维导图模板')
  if (!title) return { found: false, why: '标题文本未出现（浮层未打开）' }
  let el = title
  while (el && el !== document.body) {
    if (getComputedStyle(el).position === 'fixed') break
    el = el.parentElement
  }
  if (!el || el === document.body) return { found: false, why: '标题无 position:fixed 祖先' }
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const header = title.closest('div')
  const rows = [...el.querySelectorAll('button, .aurora-dropdown__item')]
    .filter((b) => (b.textContent || '').trim().length > 0)
  return {
    found: true,
    cls: String(el.className || '(none)'),
    parentIsBody: el.parentElement === document.body,
    role: el.getAttribute('role'),
    position: cs.position,
    zIndex: cs.zIndex,
    bg: cs.backgroundColor,
    borderColor: cs.borderTopColor,
    borderWidth: cs.borderTopWidth,
    color: cs.color,
    radius: cs.borderTopLeftRadius,
    shadow: cs.boxShadow,
    fontFamily: cs.fontFamily.slice(0, 30),
    rect: { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    headerBorderBottom: header ? getComputedStyle(header).borderBottomColor : null,
    rowTotal: el.querySelectorAll('button').length,
    rowWithBasisClass: el.querySelectorAll('.aurora-dropdown__item').length,
    inlineStyle: String(el.getAttribute('style') || ''),
    mcVarOnRoot: {
      bgElevated: getComputedStyle(document.documentElement).getPropertyValue('--mc-bg-elevated').trim(),
      borderMedium: getComputedStyle(document.documentElement).getPropertyValue('--mc-border-medium').trim(),
    },
  }
})()`

/** 读首行模板项的 computed 背景（用于 hover 断言）+ 行中心坐标 */
const READ_FIRST_ROW = `(() => {
  const title = [...document.querySelectorAll('body span')].find((s) => (s.textContent || '').trim() === '思维导图模板')
  if (!title) return { found: false }
  let el = title
  while (el && el !== document.body) { if (getComputedStyle(el).position === 'fixed') break; el = el.parentElement }
  if (!el || el === document.body) return { found: false }
  const row = el.querySelector('.aurora-dropdown__item')
  if (!row) return { found: false, why: 'no .aurora-dropdown__item' }
  const r = row.getBoundingClientRect()
  return {
    found: true,
    cls: String(row.className || ''),
    bg: getComputedStyle(row).backgroundColor,
    color: getComputedStyle(row).color,
    radius: getComputedStyle(row).borderTopLeftRadius,
    cx: Math.round(r.left + r.width / 2),
    cy: Math.round(r.top + r.height / 2),
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
      const timer = setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rej(new Error(`CDP timeout(${CDP_TIMEOUT_MS}ms): ${method}`)) }
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
      if (/CDP timeout/.test(String((e && e.message) || e))) {
        timeouts++
        if (timeouts >= maxTimeouts) throw new Error(`renderer 无响应（连续 ${timeouts} 次 CDP 超时）@ ${label || String(expr).slice(0, 50)}`)
      }
    }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}
const ready = (cdp, tries = 200) => waitFor(
  cdp,
  `document.readyState === 'complete'
   && document.querySelectorAll('.aurora-sidebar-item').length > 0
   && document.styleSheets.length > 8`,
  { tries, ms: 500 },
)
async function navigateNoWait(cdp, url, settle = 1400) {
  cdp.send('Page.navigate', { url }).catch(() => { /* 响应可能丢失，导航本身生效 */ })
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
  }
  return had
}
async function realMove(cdp, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons })
}

/**
 * 「更多」按钮定位。
 * 🚨 必须**按可见性 + 所属工具栏**限定：源码模式工具栏（MarkdownToolbar）与 WYSIWYG 工具栏
 * 都渲染了一个 `title="更多"` 的按钮，其中一个处于隐藏（rect 高 0）状态。
 * 首版探针直接 `querySelectorAll('button').find(...)` 取到的是**文档序里第一个**（可能是隐藏那个）
 * ⇒ 点它毫无反应、菜单不开，症状酷似「产品坏了」（本仓坑 AO 的同族）。
 */
const MORE_BTN = `(() => {
  const cands = [...document.querySelectorAll('button')].filter((b) => b.getAttribute('title') === '更多')
  const vis = cands.filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
  const target = vis.find((b) => b.closest('.wysiwyg-toolbar')) || vis[0] || null
  if (!target) return { found: false, candsTotal: cands.length, visTotal: vis.length }
  const r = target.getBoundingClientRect()
  return {
    found: true,
    inWysiwygToolbar: !!target.closest('.wysiwyg-toolbar'),
    candsTotal: cands.length,
    visTotal: vis.length,
    rect: { w: Math.round(r.width), h: Math.round(r.height) },
  }
})()`
const CLICK_MORE = `(() => {
  const cands = [...document.querySelectorAll('button')].filter((b) => b.getAttribute('title') === '更多')
  const vis = cands.filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
  const t = vis.find((b) => b.closest('.wysiwyg-toolbar')) || vis[0]
  if (!t) return false
  t.click(); return true
})()`

/**
 * 打开思维导图浮层：**真实 UI 两步** —— 「更多」按钮 → 菜单里的「思维导图」项。
 * 用 `el.click()`（纯 DOM API，不经窗口激活；合成鼠标首击常被吞，见本仓铁律 2）。
 */
async function openMindmapPopover(cdp, { tries = 4 } = {}) {
  for (let i = 1; i <= tries; i++) {
    const already = await cdp.eval(FIND_POPOVER)
    if (already.found) return { opened: true, tries: i - 1, mode: 'already' }

    // 第一步：点「更多」（可见 + 属于 WYSIWYG 工具栏的那个）
    const clickedMore = await cdp.eval(CLICK_MORE)
    if (!clickedMore) return { opened: false, why: 'no visible 更多 button', probe: await cdp.eval(FIND_POPOVER) }
    // 等菜单真的展开（不过早取菜单项：portal 挂载 + 动画需要一点时间）
    const menuReady = await waitFor(cdp, `document.querySelectorAll('.aurora-dropdown__item').length > 0`, { tries: 12, ms: 250 })
    const labels = await cdp.eval(`[...document.querySelectorAll('.aurora-dropdown__item')].map((d) => (d.textContent || '').trim()).slice(0, 24)`)
    // 第二步：点菜单里的「思维导图」
    const clicked = await cdp.eval(`(() => {
      const items = [...document.querySelectorAll('.aurora-dropdown__item')]
      const it = items.find((d) => (d.textContent || '').trim() === '思维导图')
      if (!it) return { ok: false }
      it.click(); return { ok: true }
    })()`)
    await sleep(650)
    const after = await cdp.eval(FIND_POPOVER)
    if (after.found) return { opened: true, tries: i, mode: 'menu', menuReady, labels }
    if (i === tries) return { opened: false, tries: i, menuReady, labels, lastClick: clicked, probe: after }
    // 重试前把可能残留在开态的菜单收掉（toggle 语义：下一次点击会变成"关闭"）
    if (menuReady >= 0) { await cdp.eval(CLICK_MORE); await sleep(300) }
  }
  return { opened: false, tries }
}

async function shot(cdp, path, clip) {
  try {
    const r = await cdp.send('Page.captureScreenshot', clip ? { format: 'png', clip: { ...clip, scale: 2 } } : { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
    return true
  } catch (e) { info(`截图失败：${e?.message || e}`); return false }
}

// ---- 种子：直写 IndexedDB（与下划线探针同口径）----
const NOTES_FOLDER_ID = 'f-mm'
const NOTE_ID = 'mm-0'
const NOTE_NAME = '思维导图浮层测试笔记.md'
const NOTE_BODY = '# 思维导图浮层测试笔记\n\n用于打开格式工具栏「更多」菜单里的思维导图模板浮层，验证其皮肤是否已回归 aurora 浮层基底。\n'
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
    tabs: [{ id: 'tab-mm-0', fileId: NOTE_ID, name: NOTE_NAME, isActive: true }],
    activeTabId: 'tab-mm-0',
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
    try { localStorage.removeItem('markcraft_autosave_backup') } catch {}
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

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
  const page = list.find((t) => t.type === 'page' && pageRe.test(t.url)) || list.find((t) => t.type === 'page')
  if (!page) {
    console.error('未找到任何 page target；当前 targets:\n' + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
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
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__bootAt = Date.now()` })
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检 / 种子（${BASE}，CDP ${CDP_PORT}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  await navigateNoWait(cdp, `${BASE}/#view=editor`, 1200)
  ok('§0 应用外壳就绪', (await ready(cdp)) >= 0)
  info(`§0 首启引导：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  info(`§0 未保存内容对话框：${(await dismissCrashRecover(cdp)) ? '出现过（已放弃）' : '未出现'}`)
  const seedRes = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功', seedRes === true, typeof seedRes === 'string' ? 'seedErr=' + seedRes : 'ok')
  await navigateNoWait(cdp, `${BASE}/?seed=${Date.now()}#view=editor`, 1000)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  info(`§0 重载后未保存对话框：${(await dismissCrashRecover(cdp)) ? '出现过（已放弃）' : '未出现'}`)
  await sleep(700)

  // ---------- §1 打开浮层（真实 UI 两步） ----------
  console.log('\n=== 1. 经真实 UI 打开思维导图模板浮层 ===')
  const toolbarReady = await waitFor(cdp, `!!document.querySelector('.wysiwyg-toolbar')`, { tries: 30, ms: 400, label: '.wysiwyg-toolbar' })
  ok('§1 格式工具栏（WYSIWYG）已渲染（扫描面前提）', toolbarReady >= 0)
  const moreBtn = await cdp.eval(MORE_BTN)
  ok('§1 「更多」按钮存在、可见、且属于 WYSIWYG 工具栏（入口非空）',
    moreBtn.found === true && moreBtn.rect.h > 0 && moreBtn.inWysiwygToolbar === true, JSON.stringify(moreBtn))
  const opened = await openMindmapPopover(cdp)
  info(`打开结果：opened=${opened.opened} 尝试=${opened.tries} 方式=${opened.mode || '(未打开)'}${opened.lastClick ? ' lastClick=' + JSON.stringify(opened.lastClick) : ''}`)
  const p = opened.probe || (await cdp.eval(FIND_POPOVER))
  // 失败路径不许崩：字段归一化，让断言自然变红而不是抛 TypeError（首版就在这里崩过）
  p.cls = p.cls || ''
  p.inlineStyle = p.inlineStyle || ''
  p.shadow = p.shadow || ''
  p.mcVarOnRoot = p.mcVarOnRoot || {}
  info('浮层快照：' + JSON.stringify(p))
  ok('§1 🚨 浮层已打开（扫描面非空：标题「思维导图模板」+ position:fixed 祖先）', p.found === true, p.found ? '' : `why=${p.why}`)
  ok('§1 模板项数量 ≥ 5（列表真的渲染出来了）', p.rowTotal >= 5, `rowTotal=${p.rowTotal}`)
  ok('§1 浮层经 portal 挂在 body（脱离 #aurora-root 作用域 = 本条根因的前提）', p.parentIsBody === true)

  // ---------- §2 已回归同族基底 ----------
  console.log('\n=== 2. 已回归同族基底 .aurora-dropdown（与 MoreDropdown / ListDropdown 同一套）===')
  ok('§2 🚨 根元素带 `aurora-dropdown` 基底类（材质/圆角/阴影/层级单源）', /\baurora-dropdown\b/.test(p.cls), `class="${p.cls}"`)
  ok('§2 层级落在锚定浮层带 1000（不再是魔法 9999）', p.zIndex === '1000', `zIndex=${p.zIndex}`)
  ok('§2 面板外观无内联回写（backgroundColor/boxShadow/border/borderRadius 均不在 inline style 里）',
    !/background-color|box-shadow|border-radius|\bborder:/i.test(p.inlineStyle), `inline="${p.inlineStyle.slice(0, 160)}"`)

  // ---------- §3 材质/边框/圆角/阴影 = 直接取自全局 --mc-* ----------
  console.log('\n=== 3. 材质/边框/圆角/阴影/文字 = aurora 全局 token（与运行时 CSSOM 真值逐项比对）===')
  const tok = await cdp.eval(READ_TOKENS)
  info('运行时 token 真值：' + JSON.stringify(tok))
  ok('§3 扫描面前提：运行时能从 CSSOM 读到 --mc-* 真值', !!tok['--mc-bg-elevated'] && !!tok['--mc-accent-soft'], JSON.stringify(tok))
  ok('§3 背景 = --mc-bg-elevated（浮层面板层）',
    norm(p.bg) === norm(hexToRgb(tok['--mc-bg-elevated'])), `bg=${p.bg} token=${tok['--mc-bg-elevated']}→${hexToRgb(tok['--mc-bg-elevated'])}`)
  ok('§3 边框 = --mc-border-medium',
    norm(p.borderColor) === norm(hexToRgb(tok['--mc-border-medium'])), `border=${p.borderColor} token=${tok['--mc-border-medium']}`)
  ok('§3 圆角 = --mc-radius-md',
    norm(p.radius) === norm(tok['--mc-radius-md']), `radius=${p.radius} token=${tok['--mc-radius-md']}`)
  ok('§3 阴影 = --mc-shadow-popover（三层结构，含 0.4 首层）', /rgba\(0, 0, 0, 0\.4\)/.test(p.shadow), `shadow=${p.shadow.slice(0, 120)}`)
  ok('§3 标题栏分隔线 = --mc-border-subtle（发丝线，非旧 slate #334155）',
    norm(p.headerBorderBottom) === norm(hexToRgb(tok['--mc-border-subtle'])), `headerBorderBottom=${p.headerBorderBottom} token=${tok['--mc-border-subtle']}`)

  // ---------- §4 🚨 反向对照：不再是旧版 ----------
  console.log('\n=== 4. 🚨 反向对照：不再是 base.css 旧 slate / 旧蓝（HEAD 上必然红）===')
  ok('§4 背景 ≠ 旧 #0f172a（base.css --editor-bg）', p.bg !== OLD.bg, `bg=${p.bg} 旧值=${OLD.bg}`)
  ok('§4 边框 ≠ 旧 #334155（base.css --editor-border）', p.borderColor !== OLD.border, `border=${p.borderColor} 旧值=${OLD.border}`)
  ok('§4 文字 ≠ 旧 #e2e8f0（base.css --editor-text）', p.color !== OLD.text, `color=${p.color} 旧值=${OLD.text}`)

  // ---------- §5 模板行复用基底条目 + hover 走 --mc-accent-soft ----------
  console.log('\n=== 5. 模板行复用 .aurora-dropdown__item（hover 由基底类负责，不再手写旧蓝）===')
  ok('§5 🚨 每一条模板行都带 `aurora-dropdown__item`', p.rowWithBasisClass >= 5, `rowWithBasisClass=${p.rowWithBasisClass} rowTotal=${p.rowTotal}`)
  const row0 = await cdp.eval(READ_FIRST_ROW)
  info('首行：' + JSON.stringify(row0))
  ok('§5 首行可取（断言前提）', row0.found === true, row0.why || '')
  if (row0.found) {
    ok('§5 首行文字色 = --mc-text-primary',
      norm(row0.color) === norm(hexToRgb(tok['--mc-text-primary'])), `color=${row0.color} token=${tok['--mc-text-primary']}`)
    ok('§5 首行圆角 = --mc-radius-sm（条目级，比面板 md 小一档）',
      norm(row0.radius) === norm(tok['--mc-radius-sm']), `radius=${row0.radius} token=${tok['--mc-radius-sm']}`)
    ok('§5 首行静止态背景透明（选中反馈交给 hover 规则）', row0.bg === 'rgba(0, 0, 0, 0)', `bg=${row0.bg}`)
    // hover：真实鼠标移到行中心，断言背景落到 --mc-accent-soft
    const wantHover = norm(tok['--mc-accent-soft'])
    let hoverBg = null
    for (let i = 1; i <= 3; i++) {
      await cdp.send('Page.bringToFront').catch(() => {})
      await cdp.eval('window.focus()')
      await realMove(cdp, row0.cx, row0.cy, 0)
      await sleep(320)
      hoverBg = await cdp.eval(`(() => {
        const row = document.querySelector('.aurora-dropdown__item')
        return row ? getComputedStyle(row).backgroundColor : null
      })()`)
      if (norm(hoverBg) === wantHover) break
    }
    info(`hover 后背景=${hoverBg}（期望 --mc-accent-soft = ${tok['--mc-accent-soft']}）`)
    ok('§5 🚨 hover 背景 = --mc-accent-soft（不是旧蓝 rgba(59,130,246,.1)）', norm(hoverBg) === wantHover, `hoverBg=${hoverBg}`)
    ok('§5 hover 背景 ≠ 旧版内联旧蓝', norm(hoverBg) !== norm(OLD_HOVER), `hoverBg=${hoverBg} 旧值=${OLD_HOVER}`)
  }
  // 截图：按浮层自身几何裁切（全页图里浮层占比小，易被误判）
  if (p.rect && p.rect.w > 0) {
    await shot(cdp, SHOT, {
      x: Math.max(0, p.rect.left - 40),
      y: Math.max(0, p.rect.top - 40),
      width: Math.ceil(p.rect.w + 80),
      height: Math.ceil(p.rect.h + 80),
    })
  } else {
    await shot(cdp, SHOT)
  }

  // ---------- §6 页面错误 ----------
  console.log('\n=== 6. 页面错误 ===')
  const allErrs = cdp.since(m0)
  const NOISE = /ResizeObserver loop|Permissions-Policy|Failed to load resource|net::ERR_(CONNECTION_CLOSED|ABORTED|EMPTY_RESPONSE)/
  const appErrs = allErrs.filter((e) => !NOISE.test(e))
  info(`资源/环境噪声 ${allErrs.length - appErrs.length} 条`)
  ok('§6 全程无新增应用异常', appErrs.length === 0, appErrs.slice(0, 3).join(' | '))

  const passed = results.filter((r) => r.cond).length
  traceT(`DONE passed=${passed}/${results.length}`)
  console.log(`\n=== 结果：${passed}/${results.length} ===`)
  if (passed !== results.length) {
    console.log('失败项：')
    results.filter((r) => !r.cond).forEach((r) => console.log(`  ❌ ${r.name}`))
  }
  ws.close()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针异常：', e); process.exit(3) })
