/**
 * CDP 真机探针 · 双链图谱「知识库范围」（2026-09-23 用户报障）
 * ==========================================================================
 * 报障原话：
 *   「现在要求功能去到双链图谱的界面，界面只显示这个功能的相关的内容，例如：现在 markcraft
 *     使用文档知识库有图谱，点击查看完整图谱后去到双链图谱功能界面，但是会有文件列表中的
 *     文件在其中，现在要求只要有这个知识库文件节点。」
 *
 * 判据（用户拍板的三条）：
 *   ① 范围边界：从知识库进入后，图谱只画**该库文件节点**（库外文件一律不出现）；
 *   ② 其他入口（侧栏/菜单栏/命令面板）保持全局图谱；
 *   ③ 范围明示 + 出口：顶栏范围芯片 + 面包屑带库名 + 一键「查看全局图谱」。
 *
 * 两条「别自欺」的设计：
 *   A. **扫描面与对照面都必须非空**：树上既要有库外文件（内置使用文档 16 篇，由应用自己播种），
 *      又要有库内文件（本探针自种的「甲知识库」2 篇）。否则「只剩 2 个」可能是「本来就只有 2 个」。
 *   B. **身份级断言，不只数数**：核对留在图里的节点 id 正是 `pn-*`（库内），
 *      并核对全局面板里确实混着 `ud-*`（库外）—— 数量相等但换了节点也能被抓出来。
 *
 * 与 HEAD 的红绿对照（对照运行时用 MC_BASE 指向 HEAD worktree 实例）：
 *   §3 范围节点数、§4 范围芯片、§5 出口、§6 返回芯片 label —— 这四处应全部翻红。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1；CDP 端口须与启动端口一致）：
 *   CDP_PORT=9468 node .workbuddy/artifacts/cdp-verify-graph-kb-scope.mjs
 *   CDP_PORT=9471 MC_BASE=http://127.0.0.1:5175 node .workbuddy/artifacts/cdp-verify-graph-kb-scope.mjs   # HEAD 对照
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

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

/** 就绪判据必须与应用同源（别用 #root，过早为真） */
function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

// ────────────────────────── 真实鼠标事件 ──────────────────────────
// 图谱节点的单击是在 pointerup 上兑现的（拖拽用指针捕获会把 click 重定向到 <svg>），
// 合成 el.click() 不经指针链路 ⇒ 测不出真实行为。故关键交互一律走 CDP 真实鼠标事件。
async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

/** 取元素中心（视口坐标）；元素不存在或不可见返回 null */
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

/** 真实点击某选择器（可加文本限定）；返回是否点到 */
async function clickEl(cdp, selector, textMatch = null, label = '') {
  const c = await centerOf(cdp, selector, textMatch)
  if (!c) {
    // 回落：合成 DOM click（对普通 HTML 按钮的 React onClick 有效）
    const fallback = await cdp.eval(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const el = ${textMatch ? `els.find((e) => (e.textContent || '').includes(${JSON.stringify(textMatch)}))` : 'els[0]'}
      if (!el) return false
      el.click(); return true
    })()`)
    if (label && fallback) info(`${label}（几何不可用 → 回落合成 click）`)
    return fallback
  }
  await realClick(cdp, c.x, c.y)
  return true
}

// ────────────────────────── 种子 ──────────────────────────
const NOTES_FOLDER = '我的笔记'
const NOTES_FOLDER_ID = 'f-notes'
const KB_ID = 'kb-probe-a'
const KB_NAME = '甲知识库'
/** 库内文件（应被范围图谱保留） */
const PLAIN_NOTES = ['甲笔记.md', '乙笔记.md']
const PLAIN_BODIES = ['这是甲笔记的正文，属于「甲知识库」。', '这是乙笔记的正文，属于「甲知识库」。']
/** 库外文件：不种，交给应用播种内置《MarkCraft 使用文档》（16 篇）—— 这才是真实用户场景 */

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
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        {
          id: NOTES_FOLDER_ID, name: NOTES_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: PLAIN_NOTES.map((n, i) => f('pn-' + i, n, `# ${n.replace(/\.md$/, '')}\n\n${PLAIN_BODIES[i]}\n`)),
        },
      ],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  const kb = {
    id: KB_ID, name: KB_NAME, description: '探针自种：库内 2 篇，用于与「内置 16 篇」形成对照',
    folderId: NOTES_FOLDER_ID, createdAt: T, updatedAt: T, canvasIds: [], fileIds: [], rules: [],
  }
  const kbListItem = {
    id: KB_ID, name: KB_NAME, description: kb.description, folderId: NOTES_FOLDER_ID,
    fileCount: PLAIN_NOTES.length, canvasCount: 0, createdAt: T, updatedAt: T,
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
    // 关掉会追加文件的启动迁移（保证只有内置文档补齐这一个写入者）
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    // 让内置《使用文档》知识库照常播种（库外文件的来源）；若上次跑残留标记则清掉
    try { localStorage.removeItem('markcraft-usage-docs-seeded') } catch {}
    return true
  })()`
}

/** 直读 IndexedDB 权威树 + kb 列表 */
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
  if (!raw) return { found: false, files: [], byFolder: {}, kbList: [] }
  const tree = typeof raw === 'string' ? JSON.parse(raw) : raw
  const files = [], byFolder = {}
  for (const c of tree.rootFolder.children || []) {
    const out = []
    const collect = (x) => { if (x.type === 'file') out.push({ id: x.id, name: x.name }); (x.children || []).forEach(collect) }
    collect(c)
    byFolder[c.name] = out
    for (const o of out) files.push({ id: o.id, name: o.name, parent: c.name })
  }
  return { found: true, files, byFolder, kbList: kbRaw ? JSON.parse(kbRaw) : [] }
})()`

// ────────────────────────── 图谱读取 ──────────────────────────
/** 可见的 file 节点 id（节点上有 data-node-id 锚点；只数 file，不含 tag） */
const GRAPH_FILE_IDS = `[...document.querySelectorAll('.aurora-graph__node[data-node-type="file"]')]
  .map((g) => g.getAttribute('data-node-id')).filter(Boolean).sort()`
const GRAPH_READY = `document.querySelectorAll('.aurora-graph__node').length > 0`
const SCOPE_CHIP = `document.querySelector('.aurora-graph__scope')`
const SCOPE_TEXT = `(() => { const el = document.querySelector('.aurora-graph__scope'); return el ? (el.textContent || '').trim() : '' })()`
const BREADCRUMB = `[...document.querySelectorAll('.aurora-titlebar__breadcrumb, .aurora-titlebar__breadcrumb-btn, .aurora-titlebar')]
  .map((e) => (e.textContent || '').trim()).join(' | ')`
const EXIT_BTN = `[...document.querySelectorAll('button')].filter((b) => (b.textContent || '').includes('查看全局图谱')).length`
const RETURN_CHIP = `(() => { const el = document.querySelector('.aurora-editor__return'); return el ? (el.textContent || '').trim() : '' })()`
const GRAPH_SIDEBAR_ITEM = `[...document.querySelectorAll('.aurora-sidebar-item')].some((e) => (e.textContent || '').includes('双链图谱'))`

async function gotoViaSidebar(cdp, label, waitExpr, waitLabel) {
  const clicked = await clickEl(cdp, '.aurora-sidebar-item', label, `点侧栏「${label}」`)
  if (!clicked) return -1
  return waitFor(cdp, waitExpr, { tries: 60, ms: 400, label: waitLabel })
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
  ok('§0 种子写入成功（权威树 + 自种知识库 + localStorage 版本键）', seeded === true, `seeded=${seeded}`)

  // 真实重载（换 query 触发新 document —— 坑 P：同 URL 导航可能不重建 document）
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=graphscope-${Date.now()}#view=editor` })
  await sleep(800)
  const boot = await cdp.eval('window.__probeBoot || 0')
  ok('§0 确实发生了真实重载（__probeBoot 钩子存在 ⇒ 结论可信）', boot >= 1, `__probeBoot=${boot}`)
  const r1 = await ready(cdp)
  ok('§0 重载后应用外壳再次就绪', r1 >= 0, `waitIdx=${r1}`)

  // 等内置《使用文档》知识库播种完成（这就是「库外文件」的来源）
  const seededAt = await waitFor(
    cdp,
    `localStorage.getItem('markcraft-usage-docs-seeded') === '1'`,
    { tries: 60, ms: 500, label: '内置使用文档播种' },
  )
  ok('§0 内置《使用文档》已完成播种（对照面：库外文件由此而来）', seededAt >= 0, `waitIdx=${seededAt}`)
  await sleep(600)

  const tree = await cdp.eval(TREE_READ)
  const usageFolder = tree.byFolder?.['MarkCraft 使用文档'] ?? []
  const notesFolder = tree.byFolder?.[NOTES_FOLDER] ?? []
  const usageHit = usageFolder.filter((x) => builtinNames.has(x.name))
  const allMd = (tree.files || []).filter((x) => /\.md$/i.test(x.name))
  info(`§0 树：全部 .md ${allMd.length} 个；内置文件夹命中内置清单 ${usageHit.length} 篇；「${NOTES_FOLDER}」${notesFolder.length} 篇`)
  info(`§0 kb-list = ${JSON.stringify((tree.kbList || []).map((k) => `${k.name}(folder=${k.folderId})`))}`)

  ok('§0 扫描面非空：权威树里**确实**躺着内置使用文档（库外文件真正存在，否则「只剩 2 个」是空转）',
    usageHit.length >= 8, `found=${usageHit.length}`)
  ok('§0 对照面非空：权威树里也有自种的 2 篇库内笔记',
    PLAIN_NOTES.every((n) => notesFolder.some((x) => x.name === n)), `notes=${JSON.stringify(notesFolder.map((x) => x.name))}`)
  const kbEntry = (tree.kbList || []).find((k) => k.name === KB_NAME)
  ok('§0 自种知识库在列表中且 folderId 指向「我的笔记」',
    !!kbEntry && kbEntry.folderId === NOTES_FOLDER_ID, `kb=${JSON.stringify(kbEntry && { id: kbEntry.id, folderId: kbEntry.folderId })}`)

  // ────────────────────────── §1 全局图谱（对照） ──────────────────────────
  console.log('\n=== 1. 全局图谱（侧栏入口）：库外文件必须都在 ===')
  const g1 = await gotoViaSidebar(cdp, '双链图谱', GRAPH_READY, '图谱挂载')
  ok('§1 侧栏「双链图谱」进入并渲染节点（全局入口可用）', g1 >= 0, `waitIdx=${g1}`)
  await waitFor(cdp, GRAPH_READY, { tries: 40, ms: 400 })
  const allIds = await cdp.eval(GRAPH_FILE_IDS)
  info(`§1 全局图 file 节点 ${allIds.length} 个：${JSON.stringify(allIds.slice(0, 6))} …`)
  ok('§1 全局图文件节点数 === 树内全部 .md（全局入口不裁范围）', allIds.length === allMd.length,
    `graph=${allIds.length} tree=${allMd.length}`)
  ok('§1 全局图里确实混着库外文件（ud-* 内置文档）—— 这正是报障的形态',
    allIds.some((id) => /^ud-/.test(id) || !/^pn-/.test(id)), `sample=${JSON.stringify(allIds.slice(0, 4))}`)
  ok('§1 全局图不带范围芯片（其他入口保持全局，用户拍板）', !(await cdp.eval(SCOPE_CHIP)), `chip=${await cdp.eval(SCOPE_TEXT)}`)

  // ────────────────────────── §2 知识库 → 查看完整图谱 ──────────────────────────
  console.log('\n=== 2. 知识库「甲知识库」→ 概览 → 查看完整图谱 ===')
  const g2 = await gotoViaSidebar(cdp, '知识库', `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, '知识库列表')
  ok('§2 侧栏「知识库」进入列表（自种知识库可见）', g2 >= 0, `waitIdx=${g2}`)
  const kbCards = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-kbcard')].map((e) => (e.textContent || '').trim().slice(0, 30))`)
  info('§2 列表卡片 = ' + JSON.stringify(kbCards))
  const cardClick = await clickEl(cdp, '.aurora-kb-kbcard', KB_NAME, `点开「${KB_NAME}」`)
  const linkAt = cardClick
    ? await waitFor(cdp, `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`,
      { tries: 60, ms: 400, label: '知识库概览（查看完整图谱入口）' })
    : -1
  ok('§2 进入知识库详情，概览出现「查看完整图谱」入口', linkAt >= 0, `cardClick=${cardClick} waitIdx=${linkAt}`)
  const linkClick = await clickEl(cdp, '.aurora-kb-card__link', '查看完整图谱', '点「查看完整图谱」')
  const g3 = linkClick ? await waitFor(cdp, GRAPH_READY, { tries: 60, ms: 400, label: '范围图谱挂载' }) : -1
  ok('§2 点击后进入双链图谱', g3 >= 0, `clicked=${linkClick} waitIdx=${g3}`)
  await waitFor(cdp, SCOPE_CHIP, { tries: 30, ms: 300 })

  // ────────────────────────── §3 核心：范围裁剪 ──────────────────────────
  console.log('\n=== 3. 🚨 核心：范围图谱只画该知识库文件节点 ===')
  const scopedIds = await cdp.eval(GRAPH_FILE_IDS)
  const noteIds = notesFolder.map((x) => x.id).sort()
  info(`§3 范围图 file 节点 ${scopedIds.length} 个 = ${JSON.stringify(scopedIds)}（期望 === 库内 ${JSON.stringify(noteIds)}）`)
  ok('§3 🚨 范围图节点数 === 该知识库文件数（不再混入文件列表里的其他文件）',
    scopedIds.length === noteIds.length && scopedIds.length > 0,
    `scoped=${scopedIds.length} kb=${noteIds.length} all=${allIds.length}`)
  ok('§3 🚨 范围图里的节点**身份**正是库内两篇（数量相等但换了节点也会被抓出来）',
    JSON.stringify(scopedIds) === JSON.stringify(noteIds),
    `scoped=${JSON.stringify(scopedIds)} expect=${JSON.stringify(noteIds)}`)
  ok('§3 范围图节点数严格少于全局图（对照成立，裁剪真的发生了）',
    scopedIds.length < allIds.length, `scoped=${scopedIds.length} < all=${allIds.length}`)
  const leakedIds = scopedIds.filter((id) => !noteIds.includes(id))
  ok('§3 零泄漏：范围图里没有任何库外文件节点', leakedIds.length === 0, `leaked=${JSON.stringify(leakedIds)}`)

  // ────────────────────────── §4 范围明示 ──────────────────────────
  console.log('\n=== 4. 范围明示（芯片 + 面包屑 + 出口）===')
  const chipText = await cdp.eval(SCOPE_TEXT)
  ok('§4 顶栏出现范围芯片且写着库名', chipText.includes(KB_NAME), `chip="${chipText}"`)
  const crumb = await cdp.eval(BREADCRUMB)
  ok('§4 面包屑带上库名（范围明示第二处）', crumb.includes(KB_NAME), `crumb="${crumb}"`)
  const exitCount = await cdp.eval(EXIT_BTN)
  ok('§4 存在「查看全局图谱」出口按钮', exitCount > 0, `count=${exitCount}`)

  // ────────────────────────── §5 出口回到全局 ──────────────────────────
  console.log('\n=== 5. 出口：查看全局图谱 ===')
  const exitClick = await clickEl(cdp, 'button', '查看全局图谱', '点「查看全局图谱」')
  const backAt = exitClick
    ? await waitFor(cdp, `document.querySelectorAll('.aurora-graph__node[data-node-type="file"]').length === ${allIds.length}`,
      { tries: 40, ms: 400, label: '回到全局图' })
    : -1
  const afterExit = await cdp.eval(GRAPH_FILE_IDS)
  ok('§5 点出口后回到全局图（节点数恢复为全部 .md）',
    backAt >= 0 && afterExit.length === allIds.length, `after=${afterExit.length} all=${allIds.length}`)
  ok('§5 回到全局后范围芯片消失', !(await cdp.eval(SCOPE_CHIP)), `chip="${await cdp.eval(SCOPE_TEXT)}"`)

  // ────────────────────────── §6 往返闭环 ──────────────────────────
  console.log('\n=== 6. 往返闭环：范围内点开笔记 → 返回同一范围的图谱 ===')
  const g4 = await gotoViaSidebar(cdp, '知识库', `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`, '知识库概览')
  await waitFor(cdp, `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`, { tries: 20, ms: 300 })
  if (g4 < 0) {
    // 可能仍在列表页：点卡片再试
    await clickEl(cdp, '.aurora-kb-kbcard', KB_NAME, `点开「${KB_NAME}」`)
    await waitFor(cdp, `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`, { tries: 40, ms: 400 })
  }
  await clickEl(cdp, '.aurora-kb-card__link', '查看完整图谱', '点「查看完整图谱」')
  await waitFor(cdp, GRAPH_READY, { tries: 60, ms: 400, label: '范围图谱（闭环用）' })
  await waitFor(cdp, SCOPE_CHIP, { tries: 30, ms: 300 })
  const beforeClick = await cdp.eval(GRAPH_FILE_IDS)
  const nodeCenter = await centerOf(cdp, '.aurora-graph__node[data-node-type="file"]')
  let opened = false
  if (nodeCenter) {
    // 先点一次画布空白激活窗口（skill 坑：窗口激活会吞掉最早的一次鼠标事件）
    await realClick(cdp, nodeCenter.x + 220, nodeCenter.y + 160)
    await sleep(150)
    await realClick(cdp, nodeCenter.x, nodeCenter.y)
    opened = await waitFor(cdp, `document.querySelector('.aurora-editor__return') !== null`, { tries: 40, ms: 400, label: '编辑器返回芯片' }) >= 0
  }
  const chipRet = await cdp.eval(RETURN_CHIP)
  info(`§6 范围图 ${beforeClick.length} 个节点（点前）；返回芯片 = "${chipRet}"`)
  ok('§6 范围内点开笔记 → 编辑器出现返回芯片', opened, `opened=${opened}`)
  ok('§6 🚨 返回芯片带上库名（来源是「甲知识库 · 图谱」，而非笼统的「双链图谱」）',
    chipRet.includes(KB_NAME) && chipRet.includes('图谱'), `chip="${chipRet}"`)
  // 点返回 → 应回到**同一范围**的图谱
  const backClick = await clickEl(cdp, '.aurora-editor__return', null, '点返回芯片')
  const backIdx = backClick ? await waitFor(cdp, GRAPH_READY, { tries: 60, ms: 400, label: '返回图谱' }) : -1
  await waitFor(cdp, SCOPE_CHIP, { tries: 30, ms: 300 })
  const backIds = await cdp.eval(GRAPH_FILE_IDS)
  ok('§6 🚨 返回后仍是**范围图谱**（节点数回到库内 2 篇，而不是无声退回全局）',
    backIdx >= 0 && JSON.stringify(backIds) === JSON.stringify(noteIds),
    `back=${JSON.stringify(backIds)} kb=${JSON.stringify(noteIds)}`)

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
  // 关掉本次探针专用的浏览器实例（独立 profile + 独立端口，不影响用户自己的 Edge）
  try { cdp.send('Browser.close').catch(() => {}) } catch { /* 忽略 */ }
  await sleep(400)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
