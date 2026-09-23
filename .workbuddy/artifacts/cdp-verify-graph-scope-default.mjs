/**
 * CDP 真机探针 · 双链图谱「数据范围」（2026-09-23 用户需求，口径 B）
 * ==========================================================================
 * 用户原话：
 *   「现在要求进入双链图谱默认不显示知识库中文件节点，只显示文件列表中的文件节点；
 *     在双链图谱界面要求增加一个功能按钮等，可以选择知识库，图谱界面就可以显示这个知识库
 *     中的文件节点，也可以选择查看所有图谱，就是一样整个 markcraft 的文件都在图谱中显示」
 *
 * 经用户拍板的四条口径：
 *   ① 默认档 = **排除所有知识库**的文件（含内置《MarkCraft 使用文档》），只留散装笔记；
 *   ② 范围控件放在「图谱导航」浮层里，新分组名 = 「数据范围」（与「图谱模式」并列、不重名）；
 *   ③ 记住最后一次（localStorage `markcraft-graph-scope`）；
 *   ④ 三档：文件列表（默认）/ 全部文件 / 每个知识库一档。
 *
 * 本探针锁的是**端到端**那一段：真实点击 → 真实裁剪 → 真实持久化。
 * 判据层（谓词本身、脏值回落）由 `graphScope.test.ts` 纯函数用例锁；
 * 组件层（浮层里那个 AuroraSelect 的接线）由 `GraphPanel.scope.test.tsx` 锁。
 *
 * 四条硬断言（缺一条就可能自欺）：
 *   1. **扫描面非空**：默认档图上确实有节点（散装笔记在）—— 否则「零泄漏」是空转；
 *   2. **对照面非空**：知识库文件集合确实非空（含内置使用文档）—— 否则「排除了」无从谈起；
 *   3. **零泄漏**：默认档图里没有任何知识库文件节点（身份级，不只数数）；
 *   4. **反向**：切「全部文件」后这些节点必须回来；切某库后只剩该库文件。
 *
 * ⚠️ 别用 `graphIds.length === 树内 .md 数` 这类等式：节点来自 LinkIndex 的 fileIndex，
 *    与「树里有多少 .md」不保证逐一对应（多一处口径就等于多一个假红）。
 *    一律用**集合关系**（⊆ / ⊇ / 精确等于我自种的那个库）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**；CDP_PORT 必须与 Edge 启动端口一致）：
 *   CDP_PORT=9470 node .workbuddy/artifacts/cdp-verify-graph-scope-default.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(process.env.MC_PORT || new URL(BASE).port || 5174)

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
const eqSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const sorted = (a) => [...a].sort()

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

/** 就绪判据必须与应用同源（别用 #root，过早为真） */
function ready(cdp, tries = 200) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

// ────────────────────────── 真实鼠标事件 ──────────────────────────
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

/** 取元素中心（视口坐标）；不存在或不可见返回 null */
async function centerOf(cdp, selector, textMatch = null) {
  const expr = `(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const el = ${textMatch ? `els.find((e) => (e.textContent || '').includes(${JSON.stringify(textMatch)}))` : 'els[0]'}
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width, h: r.height }
  })()`
  return await cdp.eval(expr)
}

/** 合成 DOM click（对普通 HTML 元素的 React onClick 有效；SVG 无 .click()，本文件不涉及） */
async function domClick(cdp, selector, textMatch = null) {
  return await cdp.eval(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const el = ${textMatch ? `els.find((e) => (e.textContent || '').includes(${JSON.stringify(textMatch)}))` : 'els[0]'}
    if (!el) return false
    el.click(); return true
  })()`)
}

/** 真实点击某选择器（可加文本限定）；几何不可用时回落合成 click */
async function clickEl(cdp, selector, textMatch = null, label = '') {
  const c = await centerOf(cdp, selector, textMatch)
  if (!c) {
    const fb = await domClick(cdp, selector, textMatch)
    if (label && fb) info(`${label}（几何不可用 → 回落合成 click）`)
    return fb
  }
  await realClick(cdp, c.x, c.y)
  return true
}

// ────────────────────────── 种子 ──────────────────────────
const NOTES_FOLDER = '我的笔记'
const NOTES_FOLDER_ID = 'f-notes'
const LOOSE_FOLDER = '散装笔记'
const LOOSE_FOLDER_ID = 'f-loose'
const KB_ID = 'kb-probe-a'
const KB_NAME = '甲知识库'
/** 库内文件（folderId 归入「甲知识库」）→ 默认档必须排除 */
const KB_NOTES = ['甲笔记.md', '乙笔记.md']
/** 散装文件（不属于任何知识库）→ 默认档必须保留（这就是「文件列表里的文件」） */
const LOOSE_NOTES = ['随手记.md', '灵感.md']
// 正文带上互链，确保它们进 LinkIndex（节点来自 fileIndex，无链接也应在，但不赌）
const KB_BODIES = [
  '# 甲笔记\n\n[[乙笔记]] 的正文，属于「甲知识库」。\n',
  '# 乙笔记\n\n[[甲笔记]] 的正文，属于「甲知识库」。\n',
]
const LOOSE_BODIES = [
  '# 随手记\n\n[[灵感]] 的正文，未归入任何知识库。\n',
  '# 灵感\n\n[[随手记]] 的正文，未归入任何知识库。\n',
]

let KEY_FILE_TREE = 'markcraft-file-manager'
let KEY_VERSION = 'markcraft-file-manager-version'
let STORAGE_VERSION = 'v5'

/** 从 dev server 现取存储常量（避免与源码漂移：版本号一改，种子注入就会被静默忽略） */
async function loadStorageConsts() {
  const txt = await (await fetch(`${BASE}/src/core/files/fileTree.ts`)).text()
  const k = txt.match(/const STORAGE_KEY = '([^']+)'/)
  const v = txt.match(/const STORAGE_VERSION = '([^']+)'/)
  if (k) KEY_FILE_TREE = k[1]
  if (v) { STORAGE_VERSION = v[1]; KEY_VERSION = `${k ? k[1] : KEY_FILE_TREE}-version` }
  return { key: KEY_FILE_TREE, version: STORAGE_VERSION }
}

/** 从 dev server 现取权威内置文件名清单（zh + en + 历史旧名），不硬编码 */
async function loadBuiltinNames() {
  const dir = 'src/core/data/defaultDocs/usageDocs'
  const names = new Set()
  for (const f of ['zh.ts', 'en.ts', 'legacyNames.ts']) {
    const res = await fetch(`${BASE}/${dir}/${f}`)
    if (!res.ok) continue
    const txt = await res.text()
    for (const m of txt.matchAll(/fileName:\s*"([^"]+)"/g)) names.add(m[1])
    for (const m of txt.matchAll(/"([^"]+\.md)"/g)) names.add(m[1])
  }
  return names
}

function SEED_EXPR() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const folder = (id, name, children) => ({ id, name, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true, children })
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        folder(NOTES_FOLDER_ID, NOTES_FOLDER, KB_NOTES.map((n, i) => f('pn-' + i, n, KB_BODIES[i]))),
        folder(LOOSE_FOLDER_ID, LOOSE_FOLDER, LOOSE_NOTES.map((n, i) => f('lo-' + i, n, LOOSE_BODIES[i]))),
      ],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  const kb = {
    id: KB_ID, name: KB_NAME, description: '探针自种：库内 2 篇；另有 2 篇散装笔记与内置使用文档作对照',
    folderId: NOTES_FOLDER_ID, createdAt: T, updatedAt: T, canvasIds: [], fileIds: [], rules: [],
  }
  const kbListItem = {
    id: KB_ID, name: KB_NAME, description: kb.description, folderId: NOTES_FOLDER_ID,
    fileCount: KB_NOTES.length, canvasCount: 0, createdAt: T, updatedAt: T,
  }
  return `(async () => {
    const tree = ${JSON.stringify(tree)}
    const kb = ${JSON.stringify(kb)}
    const kbListItem = ${JSON.stringify(kbListItem)}
    await new Promise((res) => {
      let req
      try { req = indexedDB.open('markcraft') } catch { res(); return }
      req.onerror = () => res()
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch { d.close(); res(); return }
        const os = tx.objectStore('kv')
        os.put({ key: ${JSON.stringify(KEY_FILE_TREE)}, value: JSON.stringify(tree) })
        os.put({ key: 'kb-list', value: JSON.stringify([kbListItem]) })
        os.put({ key: 'kb-doc-' + kb.id, value: JSON.stringify(kb) })
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    // 🚨 坑 AJ：IDB 之外**必须**同时写 localStorage 的版本键，否则 loadStateAsync 的版本闸门直接 return null，
    //         注入的树根本不被读（随后被同步 T0 整体覆盖）→ 断言全假绿或全假红。
    localStorage.setItem(${JSON.stringify(KEY_VERSION)}, ${JSON.stringify(STORAGE_VERSION)})
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    try { localStorage.removeItem('markcraft-usage-docs-seeded') } catch {}
    // 🚨 「记住最后一次」是本次需求的一部分：**必须清掉**，否则上一轮残留的范围会顶掉默认档，
    //     §1 就测不到「默认」了（这正是本探针最容易自欺的一处）。
    try { localStorage.removeItem('markcraft-graph-scope') } catch {}
    return true
  })()`
}

/** 直读 IndexedDB 权威树 + kb 列表；文件夹按 id 建索引（用于把 kb.folderId 还原成文件集合） */
const TREE_READ = `(async () => {
  const readKv = (key) => new Promise((res) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { res(null); return }
    req.onerror = () => res(null)
    req.onsuccess = () => {
      const d = req.result
      let tx
      try { tx = d.transaction('kv', 'readonly') } catch { d.close(); res(null); return }
      const g = tx.objectStore('kv').get(key)
      g.onsuccess = () => { const r = g.result; d.close(); res(r ? r.value : null) }
      g.onerror = () => { d.close(); res(null) }
    }
  })
  const raw = await readKv(${JSON.stringify(KEY_FILE_TREE)})
  const kbRaw = await readKv('kb-list')
  if (!raw) return { found: false, files: [], folders: [], kbList: [] }
  const tree = typeof raw === 'string' ? JSON.parse(raw) : raw
  const files = [], folders = []
  const walk = (node) => {
    if (node.type === 'file') { files.push({ id: node.id, name: node.name }); return }
    const kids = []
    const collect = (x) => { if (x.type === 'file') kids.push(x.id); (x.children || []).forEach(collect) }
    collect(node)
    folders.push({ id: node.id, name: node.name, fileIds: kids })
    ;(node.children || []).forEach(walk)
  }
  ;(tree.rootFolder.children || []).forEach(walk)
  return { found: true, files, folders, kbList: kbRaw ? JSON.parse(kbRaw) : [] }
})()`

// ────────────────────────── 图谱读取 ──────────────────────────
const GRAPH_FILE_IDS = `[...document.querySelectorAll('.aurora-graph__node[data-node-type="file"]')]
  .map((g) => g.getAttribute('data-node-id')).filter(Boolean).sort()`
const GRAPH_READY = `document.querySelectorAll('.aurora-graph__node').length > 0`
const SCOPE_CHIP = `document.querySelector('.aurora-graph__scope') !== null`
const SCOPE_TEXT = `(() => { const el = document.querySelector('.aurora-graph__scope'); return el ? (el.textContent || '').trim() : '' })()`
const OVERLAY = `document.querySelector('.aurora-graph__overlay') !== null`
const POPOVER = `document.querySelector('.aurora-wheel-popover') !== null`

async function gotoViaSidebar(cdp, label, waitExpr, waitLabel) {
  const clicked = await clickEl(cdp, '.aurora-sidebar-item', label, `点侧栏「${label}」`)
  if (!clicked) return -1
  return waitFor(cdp, waitExpr, { tries: 60, ms: 400, label: waitLabel })
}

/**
 * 展开并**钉住**左缘导航浮层。
 * 🚨 两坑一起防：
 *  ① 浮层是 hover 召唤的（hover-intent 220ms），且**合成鼠标首轮常丢**（坑 AC/AR）→ 3 轮重试；
 *  ② 若不钉住，鼠标一离开 7px 感应条浮层就收（180ms 延迟），后续「点下拉、点选项」全在浮层外，
 *     浮层会在操作途中消失。**钉住**之后整段操作不受指针位置影响。
 */
async function openAndPinNav(cdp) {
  for (let i = 1; i <= 3; i++) {
    await cdp.send('Page.bringToFront')
    await cdp.eval('window.focus()')
    const z = await centerOf(cdp, '.aurora-graph__hoverzone')
    if (!z) { await sleep(400); continue }
    // 先挪到画布中央（制造真实的位置迁移），再进感应条
    await realMove(cdp, z.x + 300, z.y + 200, 0)
    await sleep(60)
    await realMove(cdp, z.x, z.y, 0)
    const shown = await waitFor(cdp, OVERLAY, { tries: 14, ms: 120 })
    if (shown < 0) { info(`第 ${i} 轮 hover 未召唤出浮层（合成输入未送达）`); continue }
    const pin = await centerOf(cdp, '.aurora-graph__pin')
    if (pin) { await realClick(cdp, pin.x, pin.y); await sleep(250) }
    if (await cdp.eval(`document.querySelector('.aurora-graph__pin.is-on') !== null`)) return i
  }
  return -1
}

/**
 * 在「数据范围」下拉里选中一档。
 * AuroraSelect 的选项浮层 createPortal 到 document.body（**不在浮层内**），
 * 且选项是曲面滚轮（有 rotateX/scale + 视口裁剪）⇒ 落点必须做**命中测试**，
 * 命中不了才回落对该选项元素（onClick 就挂在它身上）派发合成 click。
 */
async function pickScope(cdp, value) {
  const t = await centerOf(cdp, '.aurora-graph__scopesel')
  if (!t) return false
  await realClick(cdp, t.x, t.y)
  await sleep(200)
  if (await waitFor(cdp, POPOVER, { tries: 20, ms: 150 }) < 0) {
    // 几何点击没打开（合成输入未送达）→ 用合成 click 再试一次
    await domClick(cdp, '.aurora-graph__scopesel')
    if (await waitFor(cdp, POPOVER, { tries: 20, ms: 150 }) < 0) return false
  }
  // 先让滚轮把目标项滚到中央（确保它在视口内、不被裁剪）
  const scrolled = await cdp.eval(`(() => {
    const it = document.querySelector('.aurora-wheel__item[data-value=${JSON.stringify(value)}]')
    if (!it) return false
    const cont = it.parentElement
    if (cont) cont.scrollTop = Number(it.dataset.idx || 0) * 34
    return true
  })()`)
  if (!scrolled) { info(`下拉里找不到选项 ${value}`); return false }
  await sleep(160)
  const pt = await centerOf(cdp, `.aurora-wheel__item[data-value="${value}"]`)
  if (pt) {
    const hit = await cdp.eval(`(() => {
      const el = document.elementFromPoint(${pt.x}, ${pt.y})
      const it = el && el.closest ? el.closest('.aurora-wheel__item') : null
      return it ? it.getAttribute('data-value') : null
    })()`)
    if (hit === value) { await realClick(cdp, pt.x, pt.y); await sleep(250); return 'mouse' }
    info(`选项 ${value} 落点命中测试未通过（hit=${hit}）→ 回落合成 click`)
  }
  const done = await domClick(cdp, `.aurora-wheel__item[data-value="${value}"]`)
  await sleep(250)
  return done ? 'dom' : false
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
  const page = list.find((t) => t.type === 'page' && pageRe.test(t.url))
  if (!page) {
    console.error(`未找到 ${MC_PORT} 页面 target；当前 targets:\n` + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__probeBoot = (window.__probeBoot || 0) + 1;' })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检（目标 ${BASE}，CDP ${CDP_PORT}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量（种子注入不会因版本漂移被静默忽略）',
    !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  const builtinNames = await loadBuiltinNames()
  ok('§0 已从 dev server 现取权威内置文件名清单（不硬编码）', builtinNames.size > 0,
    `${builtinNames.size} 个：${[...builtinNames].slice(0, 3).join(' / ')} …`)

  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪（侧栏项 > 0 且样式表 > 8）', r0 >= 0, `waitIdx=${r0}`)

  const seeded = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功（权威树 + 自种知识库 + localStorage 版本键 + 清掉上次范围）', seeded === true, `seeded=${seeded}`)

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=graphscope-${Date.now()}#view=editor` })
  await sleep(800)
  const boot = await cdp.eval('window.__probeBoot || 0')
  ok('§0 确实发生了真实重载（__probeBoot 钩子存在 ⇒ 结论可信）', boot >= 1, `__probeBoot=${boot}`)
  const r1 = await ready(cdp)
  ok('§0 重载后应用外壳再次就绪', r1 >= 0, `waitIdx=${r1}`)

  const seededAt = await waitFor(cdp, `localStorage.getItem('markcraft-usage-docs-seeded') === '1'`,
    { tries: 60, ms: 500, label: '内置使用文档播种' })
  ok('§0 内置《使用文档》已完成播种（库外/库内两类数据都齐了）', seededAt >= 0, `waitIdx=${seededAt}`)
  await sleep(800)

  // ────────────────────────── 期望值：从权威树现场算出 ──────────────────────────
  const tree = await cdp.eval(TREE_READ)
  const foldersById = new Map((tree.folders || []).map((f) => [f.id, f]))
  const allMd = (tree.files || []).filter((x) => /\.md$/i.test(x.name))
  const kbList = tree.kbList || []
  // 知识库文件集合 = 各库 (folderId 下全部文件 ∪ 显式 fileIds)；本仓内置库也正是按 folderId 挂的
  const kbFileIds = new Set()
  for (const k of kbList) {
    for (const id of (foldersById.get(k.folderId)?.fileIds ?? [])) kbFileIds.add(id)
    for (const id of (k.fileIds ?? [])) kbFileIds.add(id)
  }
  const looseIds = sorted(allMd.filter((x) => !kbFileIds.has(x.id)).map((x) => x.id))
  const myKbIds = sorted((foldersById.get(NOTES_FOLDER_ID)?.fileIds ?? []))
  const usageHit = (tree.files || []).filter((x) => builtinNames.has(x.name))
  info(`§0 树：全部 .md ${allMd.length} 个（内置清单命中 ${usageHit.length} 篇）`)
  info(`§0 kb-list = ${JSON.stringify(kbList.map((k) => `${k.name}(folder=${k.folderId})`))}`)
  info(`§0 知识库文件集合 ${kbFileIds.size} 个；散装（不属于任何库）${looseIds.length} 个 = ${JSON.stringify(looseIds)}`)
  info(`§0 自种「${KB_NAME}」文件 = ${JSON.stringify(myKbIds)}`)

  ok('§0 扫描面非空：树上确有「散装笔记」（否则默认档的"零泄漏"是空转）',
    looseIds.length >= 2, `loose=${looseIds.length}`)
  ok('§0 对照面非空：树上确有「知识库文件」（含内置使用文档；否则"排除了"无从谈起）',
    kbFileIds.size >= 2 && usageHit.length >= 8,
    `kbFiles=${kbFileIds.size} usageHit=${usageHit.length}`)
  ok('§0 自种知识库在列表中且 folderId 指向「我的笔记」',
    kbList.some((k) => k.name === KB_NAME && k.folderId === NOTES_FOLDER_ID),
    `kb=${JSON.stringify(kbList.find((k) => k.name === KB_NAME)?.folderId)}`)

  // ────────────────────────── §1 默认档（核心：只显示文件列表 · 排除所有知识库） ──────────────────────────
  console.log('\n=== 1. 🚨 核心：进入双链图谱默认只画「文件列表」的笔记（不含任何知识库）===')
  await cdp.eval('localStorage.removeItem("markcraft-graph-scope")') // 重申默认档（防前面几行的写入）
  const g1 = await gotoViaSidebar(cdp, '双链图谱', GRAPH_READY, '图谱挂载')
  ok('§1 侧栏进入双链图谱并渲染节点', g1 >= 0, `waitIdx=${g1}`)
  await sleep(700)
  const defIds = await cdp.eval(GRAPH_FILE_IDS)
  const leaked = defIds.filter((id) => kbFileIds.has(id))
  const missingLoose = looseIds.filter((id) => !defIds.includes(id))
  info(`§1 默认档 file 节点 ${defIds.length} 个 = ${JSON.stringify(defIds)}`)
  ok('§1 🚨 默认档零泄漏：图里没有任何知识库文件节点（身份级，不只数数）',
    leaked.length === 0, `leaked=${JSON.stringify(leaked)}`)
  ok('§1 反向：散装笔记一篇不少地都在图里（不是"图被打空"造成的零泄漏）',
    missingLoose.length === 0, `missing=${JSON.stringify(missingLoose)}`)
  ok('§1 默认档不标范围芯片（它就是默认，标注反而啰嗦）', !(await cdp.eval(SCOPE_CHIP)),
    `chip="${await cdp.eval(SCOPE_TEXT)}"`)
  ok('§1 默认档确实"裁掉了东西"（节点数 < 全量 .md 数，证明过滤真的发生）',
    defIds.length < allMd.length, `default=${defIds.length} < allMd=${allMd.length}`)

  // ────────────────────────── §2 控件存在性与位置 ──────────────────────────
  console.log('\n=== 2. 新增控件「数据范围」在「图谱导航」浮层里 ===')
  const pinned = await openAndPinNav(cdp)
  ok('§2 左缘 hover 可召唤并钉住「图谱导航」浮层', pinned >= 0, `第 ${pinned} 轮成功`)
  const groupTitle = await cdp.eval(`[...document.querySelectorAll('.aurora-graph__group-title')]
    .map((e) => (e.textContent || '').trim())`)
  info(`§2 浮层分组 = ${JSON.stringify(groupTitle)}`)
  ok('§2 浮层里出现「数据范围」分组（与「图谱模式」并列，属新增功能按钮）',
    groupTitle.includes('数据范围'), `groups=${JSON.stringify(groupTitle)}`)
  const triggerLabel = await cdp.eval(`(() => { const el = document.querySelector('.aurora-graph__scopesel'); return el ? el.getAttribute('aria-label') : null })()`)
  ok('§2 选择器触发器存在且带 aria-label = 数据范围（可访问名正确）',
    triggerLabel === '数据范围', `aria-label=${JSON.stringify(triggerLabel)}`)
  const triggerText = await cdp.eval(`(() => { const el = document.querySelector('.aurora-graph__scopesel'); return el ? (el.textContent || '').trim() : '' })()`)
  ok('§2 触发器当前显示默认档的名字（「文件列表（不含知识库）」）',
    triggerText.includes('文件列表'), `text="${triggerText}"`)

  // ────────────────────────── §3 切「全部文件」 ──────────────────────────
  console.log('\n=== 3. 切「全部文件」：整个 MarkCraft 的文件都回到图里 ===')
  const pickedAll = await pickScope(cdp, 'all')
  ok('§3 能在下拉里选中「全部文件」', !!pickedAll, `via=${pickedAll}`)
  await sleep(900)
  const allScopeIds = await cdp.eval(GRAPH_FILE_IDS)
  const kbMissing = [...kbFileIds].filter((id) => !allScopeIds.includes(id))
  const looseMissing = looseIds.filter((id) => !allScopeIds.includes(id))
  info(`§3 全部文件档 file 节点 ${allScopeIds.length} 个（默认档 ${defIds.length} 个）`)
  ok('§3 🚨 知识库文件全部回到图里（默认档被排除的那些，现在都在）',
    kbMissing.length === 0, `missing=${JSON.stringify(kbMissing.slice(0, 6))}${kbMissing.length > 6 ? ` …共${kbMissing.length}` : ''}`)
  ok('§3 散装笔记仍在（切档不是"换一批"）', looseMissing.length === 0, `missing=${JSON.stringify(looseMissing)}`)
  ok('§3 节点数确实变多了（对照成立）', allScopeIds.length > defIds.length,
    `all=${allScopeIds.length} > default=${defIds.length}`)
  ok('§3 非默认档出现范围芯片且写着「全部文件」',
    (await cdp.eval(SCOPE_CHIP)) && (await cdp.eval(SCOPE_TEXT)).includes('全部文件'),
    `chip="${await cdp.eval(SCOPE_TEXT)}"`)
  ok('§3 选择被持久化到 localStorage（用户拍板：记住最后一次）',
    (await cdp.eval(`localStorage.getItem('markcraft-graph-scope')`)) === 'all',
    `stored=${await cdp.eval(`localStorage.getItem('markcraft-graph-scope')`)}`)

  // ────────────────────────── §4 切某知识库 ──────────────────────────
  console.log(`\n=== 4. 切「知识库 · ${KB_NAME}」：只剩该库文件节点 ===`)
  const pinned2 = await openAndPinNav(cdp)
  ok('§4 浮层仍可再次召唤（前一次操作未把入口卡死）', pinned2 >= 0, `第 ${pinned2} 轮成功`)
  const pickedKb = await pickScope(cdp, `kb:${KB_ID}`)
  ok(`§4 能在下拉里选中「知识库 · ${KB_NAME}」`, !!pickedKb, `via=${pickedKb}`)
  await sleep(900)
  const kbScopeIds = await cdp.eval(GRAPH_FILE_IDS)
  info(`§4 范围图 file 节点 ${kbScopeIds.length} 个 = ${JSON.stringify(kbScopeIds)}（期望 = 库内 ${JSON.stringify(myKbIds)}）`)
  ok(`§4 🚨 范围图节点**精确等于**该库文件（身份级等式，不是"数量对得上"）`,
    eqSet(kbScopeIds, myKbIds), `got=${JSON.stringify(kbScopeIds)} want=${JSON.stringify(myKbIds)}`)
  ok('§4 范围图节点数严格少于「全部文件」档（对照成立，收窄真的发生）',
    kbScopeIds.length < allScopeIds.length, `kb=${kbScopeIds.length} < all=${allScopeIds.length}`)
  ok('§4 范围芯片写着库名（范围明示）', (await cdp.eval(SCOPE_TEXT)).includes(KB_NAME),
    `chip="${await cdp.eval(SCOPE_TEXT)}"`)

  // ────────────────────────── §5 持久化：重载后仍在该范围 ──────────────────────────
  console.log('\n=== 5. 重载后范围被记住（localStorage）===')
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=graphscope-reload-${Date.now()}#view=editor` })
  await sleep(800)
  const r2 = await ready(cdp)
  const g5 = await gotoViaSidebar(cdp, '双链图谱', GRAPH_READY, '重载后图谱挂载')
  await sleep(900)
  const afterReload = await cdp.eval(GRAPH_FILE_IDS)
  info(`§5 重载后 file 节点 ${afterReload.length} 个 = ${JSON.stringify(afterReload)}`)
  ok('§5 重载后应用就绪且图谱可进入', r2 >= 0 && g5 >= 0, `ready=${r2} graph=${g5}`)
  ok('§5 🚨 重载后仍是上次选的「该知识库」范围（记住最后一次真的生效）',
    eqSet(afterReload, myKbIds), `got=${JSON.stringify(afterReload)} want=${JSON.stringify(myKbIds)}`)

  // ────────────────────────── §6 出口：点芯片回默认档 ──────────────────────────
  console.log('\n=== 6. 范围芯片上的出口：一键回默认档 ===')
  const exitClicked = await clickEl(cdp, '.aurora-graph__scope-exit', null, '点范围芯片出口')
  await sleep(900)
  const afterExit = await cdp.eval(GRAPH_FILE_IDS)
  ok('§6 点出口后回默认档：知识库文件再次被排除（且散装笔记都在）',
    exitClicked && afterExit.every((id) => !kbFileIds.has(id)) && looseIds.every((id) => afterExit.includes(id)),
    `after=${afterExit.length} leaked=${JSON.stringify(afterExit.filter((id) => kbFileIds.has(id)))}`)
  ok('§6 回默认档后范围芯片消失', !(await cdp.eval(SCOPE_CHIP)), `chip="${await cdp.eval(SCOPE_TEXT)}"`)
  ok('§6 出口把持久化也改回默认档（不是只改了这一次的内存）',
    (await cdp.eval(`localStorage.getItem('markcraft-graph-scope')`)) === 'files',
    `stored=${await cdp.eval(`localStorage.getItem('markcraft-graph-scope')`)}`)

  // ────────────────────────── §7 页面错误 ──────────────────────────
  console.log('\n=== 7. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§7 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) {
    console.log('未通过：')
    failed.forEach((f) => console.log('  ❌ ' + f.name))
  }
  try { cdp.send('Browser.close').catch(() => {}) } catch { /* 忽略 */ }
  await sleep(400)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
