/**
 * CDP 真机探针 · **悬空 folderId 自愈**：修复用户此刻真实的坏状态
 * ============================================================
 * 与前两条探针的分工：
 *   · `cdp-verify-usagedocs-seed.mjs`    → 新用户冷启动（IndexedDB 空）
 *   · `cdp-verify-usagedocs-upgrade.mjs` → 老用户升级（旧树 + **无**知识库 → 播种新建）
 *   · 本探针                              → **已被竞态损坏的老用户**（旧树 + 同名知识库 + folderId 悬空 + 已标记播种）
 *
 * 为什么必须单独一条：
 *   前两条都从「没有知识库」出发；而真实用户报「进去没有内容」时，IndexedDB 里**已经有**
 *   那个知识库了，只是 `folderId` 指向一个随临时兜底树被丢弃的幽灵节点。若只做「无库→建库」，
 *   这条分支会在 `getKbList()` 命中同名库后**直接复用**，永远修不好 —— 用户仍然看到空库。
 *
 * 断言的是自愈后的正确终态：
 *   - 仍是**同一个**知识库（kb.id 不变，不删库重建）；
 *   - `folderId` 从幽灵 id 被改写成树上可解析的真实文件夹；
 *   - 文件夹内容 = 16 篇拆分页 + 旧《用户手册》迁移 = 17 篇；
 *   - 「我的笔记」里用户自己的笔记零丢失；
 *   - UI 进库「笔记」tab 计数 = 17（不是 0 / 空态）。
 *
 * 用法（必须与 Edge 同一次前台 bash）：
 *   node .workbuddy/artifacts/cdp-verify-usagedocs-heal.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const SEED_KEY = 'markcraft-usage-docs-seeded'
const TREE_KEY = 'markcraft-file-manager'
const DOCS_FOLDER = 'MarkCraft 使用文档'
const BROKEN_KB_ID = 'kb-broken-0001'
const GHOST_FOLDER = 'ghost-folder-id'
const EXPECT_NOTES_UPGRADED = 17

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.pageErrors = []
    this.logs = []
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
        // 全量收集：播种失败走的是 console.warn，只看 error 会漏掉
        this.logs.push(`${e?.level}: ${e?.text}`)
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

async function waitFor(cdp, expr, { tries = 60, ms = 500, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

const SUBBAR_NAME = `((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`

/** 读 IndexedDB 终态 + 悬空判定 */
const IDB_READ = `(async () => {
  const all = await new Promise((resolve) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { resolve(null); return }
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('kv')) { d.close(); resolve(null); return }
      let g
      try { g = d.transaction('kv', 'readonly').objectStore('kv').getAll() } catch { d.close(); resolve(null); return }
      g.onsuccess = () => { const r = g.result; d.close(); resolve(r || []) }
      g.onerror = () => { d.close(); resolve(null) }
    }
  })
  if (!all) return { found: false }
  const kv = {}
  for (const r of all) kv[r.key] = r.value
  let tree = null
  try { tree = kv[${JSON.stringify(TREE_KEY)}] ? JSON.parse(kv[${JSON.stringify(TREE_KEY)}]) : null } catch {}
  let kbList = []
  try { kbList = kv['kb-list'] ? JSON.parse(kv['kb-list']) : [] } catch {}
  const docsKv = {}
  for (const k of Object.keys(kv)) if (k.startsWith('kb-doc-')) { try { docsKv[k] = JSON.parse(kv[k]) } catch {} }
  if (!tree || !tree.rootFolder) return { found: false, kbList, kbDocs: Object.values(docsKv) }

  const byId = {}
  const walk = (n, parentId) => {
    byId[n.id] = { name: n.name, type: n.type, parentId: parentId ?? null }
    if (n.type !== 'file') (n.children || []).forEach(c => walk(c, n.id))
  }
  walk(tree.rootFolder, null)

  const kids = tree.rootFolder.children || []
  const docs = kids.find(c => c.type === 'folder' && c.name === ${JSON.stringify(DOCS_FOLDER)})
  const mine = kids.find(c => c.type === 'folder' && c.name === '我的笔记')
  const docsFileNames = docs ? (docs.children || []).filter(c => c.type === 'file').map(c => c.name) : []

  return {
    found: true,
    rootIds: kids.map(c => c.id + ':' + c.name),
    docsFolderId: docs ? docs.id : null,
    docsFileCount: docs ? docsFileNames.length : -1,
    docsFileNames,
    myNotesNames: mine ? (mine.children || []).map(c => c.name) : [],
    kbCount: kbList.length,
    kbList: kbList.map(k => ({ id: k.id, name: k.name, folderId: k.folderId })),
    kbDocs: Object.values(docsKv).map(k => ({
      id: k.id, name: k.name, folderId: k.folderId,
      resolvesTo: byId[k.folderId] ? byId[k.folderId].name : null,
    })),
  }
})()`

/**
 * 造出「已被竞态损坏的老用户」：
 * 旧树（我的笔记 4 篇）+ 同名知识库（folderId = 幽灵 id）+ 已标记播种。
 * 这正是用户报「进库没有内容」时的 profile 现场。
 */
function BROKEN_SQL() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const legacy = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [{
        id: 'legacy-notes', name: '我的笔记', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
        children: [
          f('lf-manual', '用户手册.md', '# 用户手册全文（旧种子遗留）'),
          f('lf-tutorial', 'Markdown 入门教程.md', '# 教程'),
          f('lf-guide', '知识链接体系指南.md', '# 指南'),
          f('lf-own', '我自己的笔记.md', '# 用户自己的内容'),
        ],
      }],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  const kbDoc = {
    id: BROKEN_KB_ID, name: DOCS_FOLDER, description: '内置文档',
    folderId: GHOST_FOLDER,          // ← 幽灵：该 id 根本不在树上
    createdAt: T, updatedAt: T,
    canvasIds: [], fileIds: [], rules: [],
  }
  const kbItem = {
    id: BROKEN_KB_ID, name: DOCS_FOLDER, description: '内置文档',
    folderId: GHOST_FOLDER, fileCount: 0, canvasCount: 0,
    createdAt: T, updatedAt: T,
  }
  return `(async () => {
    const legacy = ${JSON.stringify(legacy)}
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
        // 先清掉**全部**旧知识库文档，再写入本次损坏态：
        // 否则前一条探针（如 upgrade）留下的 kb-doc-* 会残留在库里，
        // 让「kbDocs」读出多个库 → 断言取哪个下标都不可靠。
        const g = st.getAllKeys()
        g.onsuccess = () => {
          ;(g.result || [])
            .filter((k) => String(k).startsWith('kb-doc-'))
            .forEach((k) => st.delete(k))
          st.put({ key: ${JSON.stringify(TREE_KEY)}, value: JSON.stringify(legacy) })
          st.put({ key: 'kb-list', value: JSON.stringify([kbItem]) })
          st.put({ key: 'kb-doc-' + kbDoc.id, value: JSON.stringify(kbDoc) })
        }
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    // 关键：**已标记播种** —— 老代码会因「已播种」而放弃，自愈分支必须越过这一层
    localStorage.setItem(${JSON.stringify(SEED_KEY)}, '1')
    localStorage.setItem('markcraft-migrated-link-guide', '1')
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    localStorage.setItem('markcraft-link-guide-added', '1')
    return true
  })()`
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
  // CDP 的 Log 域收不到「本次 attach 之前」的日志（首屏加载早于探针连接），
  // 而播种/水合日志恰好打在启动期 → 改为在每个新 document 创建前注入 console 钩子，
  // 存进 window.__logs，之后直接读页面内数组（跨导航可靠）。
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

  console.log('\n=== 0. 就绪 ===')
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({
    sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length,
    sheets: document.styleSheets.length,
  })`)
  ok('应用外壳已挂载（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)

  console.log('\n=== 1. 造出「已损坏」的 profile（同名库 + 悬空 folderId + 已标记播种）→ 重载 ===')
  await cdp.eval(BROKEN_SQL())
  const before = await cdp.eval(IDB_READ)
  info('损坏态 kbList = ' + JSON.stringify(before.kbList))
  info('损坏态 resolve = ' + JSON.stringify(before.kbDocs))
  const beforeDoc = before.kbDocs.find((k) => k.id === BROKEN_KB_ID)
  ok('已写入损坏态：知识库在用幽灵 folderId，且播种标记已置位',
    before.kbCount === 1 && before.kbList[0]?.folderId === GHOST_FOLDER
      && beforeDoc?.resolvesTo === null && before.docsFolderId === null,
    `kbCount=${before.kbCount} folderId=${before.kbList[0]?.folderId} resolvesTo=${JSON.stringify(beforeDoc?.resolvesTo)} ` +
    `（若 resolvesTo 非 null 说明损坏态没造成功，后面的断言就没意义）`)

  // ⚠️ 导航 URL 必须与浏览器**启动 URL 不同**（加唯一 query），否则 Chromium 不产生新
  //    document → 应用不会重启 → 写入的损坏态永远不会被读取（症状：探针"自愈失败"，
  //    实为页面没重载）。同时 `window.__logs` 是「确实发生了重载」的硬证据。
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=heal-${Date.now()}#view=editor` })
  await sleep(900)
  await ready(cdp)
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')
  ok('损坏态写入后页面确实重载（注入钩子生效，排除「同 URL 不重载」型假阴性）', reloaded === true,
    `__logs=${JSON.stringify(reloaded)}`)
  // 自愈是异步的（getKbList → materialize → rebindKbFolder），须轮询持久化终态
  const healed = await waitFor(
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
      try {
        const list = JSON.parse(kv['kb-list'] || '[]')
        if (!list.length) return false
        return list[0].folderId !== ${JSON.stringify(GHOST_FOLDER)}
      } catch { return false }
    })()`,
    { tries: 60, ms: 500, label: 'folderId 被自愈改写' },
  )
  await sleep(1800) // 等 saveState 防抖 + 重挂

  console.log('\n=== 2. 自愈后的终态（持久化层）===')
  const after = await cdp.eval(IDB_READ)
  info('kbList = ' + JSON.stringify(after.kbList))
  info('kbDocs = ' + JSON.stringify(after.kbDocs))
  info('rootIds = ' + JSON.stringify(after.rootIds))
  info('docsFileCount = ' + after.docsFileCount + '  myNotes = ' + JSON.stringify(after.myNotesNames))
  const kbLogs = cdp.logs.filter((l) => /kbSeed|FileStore|hydrated|播种/i.test(l))
  info('播种/水合日志 = ' + (kbLogs.length ? JSON.stringify(kbLogs.slice(0, 10)) : '（无 —— 说明链路没被触发）'))
  info('本轮 console 总条数 = ' + cdp.logs.length)
  if (cdp.logs.length) info('全部日志（前 8 条） = ' + JSON.stringify(cdp.logs.slice(0, 8)))

  // 页面内注入式收集（跨导航可靠，见 main() 里的 addScriptToEvaluateOnNewDocument）
  const pageLogs = await cdp.eval('(Array.isArray(window.__logs) ? window.__logs : [])')
  info('页面内 __logs 条数 = ' + pageLogs.length)
  info('页面内关键日志 = ' + JSON.stringify(pageLogs.filter((l) => /kbSeed|FileStore|hydrated|播种/i.test(l)).slice(0, 12)))
  if (pageLogs.length) info('页面内首 10 条 = ' + JSON.stringify(pageLogs.slice(0, 10)))
  ok('folderId 已被改写（不再是幽灵 id）', healed >= 0 && after.kbList[0]?.folderId !== GHOST_FOLDER,
    `folderId=${after.kbList[0]?.folderId}`)
  // 断言一律按 id 定位 —— 数组顺序不是契约，按 [0] 取会在多库场景下静默测错对象
  const healedDoc = after.kbDocs.find((k) => k.id === BROKEN_KB_ID)
  ok('仍是同一个知识库：kb.id 未变（不是删库重建）',
    after.kbCount === 1 && !!healedDoc,
    `kbIds=${JSON.stringify(after.kbDocs.map((k) => k.id))}`)
  ok('folderId 能在树里解析到「' + DOCS_FOLDER + '」（悬空已消除）',
    healedDoc?.resolvesTo === DOCS_FOLDER && healedDoc?.folderId === after.docsFolderId,
    `resolvesTo=${JSON.stringify(healedDoc?.resolvesTo)} folders=[doc=${healedDoc?.folderId} real=${after.docsFolderId}]`)
  ok('使用文档文件夹 = 16 篇拆分页 + 旧《用户手册》迁移 = 17 篇',
    after.docsFileCount === EXPECT_NOTES_UPGRADED, `docsFileCount=${after.docsFileCount}`)
  ok('旧《Markdown 入门教程.md》已迁移且未改名（[[双链]] 不失效）',
    after.docsFileNames.includes('Markdown 入门教程.md'))
  ok('旧《知识链接体系指南.md》已迁移且未改名',
    after.docsFileNames.includes('知识链接体系指南.md'))
  ok('「我的笔记」只剩用户自己的笔记（零丢失）',
    after.myNotesNames.length === 1 && after.myNotesNames[0] === '我自己的笔记.md',
    `myNotes=${JSON.stringify(after.myNotesNames)}`)

  console.log('\n=== 3. 自愈后的终态（UI 层：进库看得到内容）===')
  await cdp.eval(`(() => {
    const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
    if (e) e.click()
    return !!e
  })()`)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '知识库卡片' })
  await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
  await waitFor(cdp, `${SUBBAR_NAME} === ${JSON.stringify(DOCS_FOLDER)}`, { tries: 30, ms: 400, label: 'subbar 库名' })
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
      .find(x => (x.textContent || '').includes('笔记'))
    if (t) t.click(); return !!t
  })()`)
  await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400, label: '笔记 tab' })

  const notesCount = await cdp.eval(`(document.querySelector('.aurora-kb-notes__head-count') || {}).textContent || ''`)
  const rows = await cdp.eval(`document.querySelectorAll('.aurora-kb-recent__item').length`)
  const rowsText = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-recent__item')].slice(0, 20).map(e => (e.textContent || '').trim().slice(0, 20))`)
  ok('进库后「笔记」tab 计数 = 17（不是 0/空态）', notesCount === String(EXPECT_NOTES_UPGRADED),
    `head-count="${notesCount}" rows=${rows}`)
  ok('笔记行渲染面非空且 ≥ 17', rows >= EXPECT_NOTES_UPGRADED, `rows=${rows}`)
  info('前 20 行：' + JSON.stringify(rowsText))
  ok('空态未出现（真内容而非「暂无笔记」）',
    !(await cdp.eval(`!!document.querySelector('.aurora-kb-placeholder__title')`)))

  // ⚠ 本节测的是**「笔记」Tab** 那份文件行（上面刚点过 tab）。
  // 它**不能**代表「点击知识库笔记没进编辑器」这个报障：真正的哑行在
  // 进库默认落地的「概览 · 最近活动」里（父容器不是 .aurora-kb-notes，且当时无 onClick）。
  // 本条曾因标题写成「用户报障」而把该症状误判成"无法复现"——
  // 报障点的专项验证已独立到 `cdp-verify-kb-note-open.mjs`（含控制组 + 真实鼠标事件流分层）。
  console.log('\n=== 4. 点「笔记」Tab 文件行 → 必须跳转编辑器（回归对照）===')
  const ED = `.cm-content, .ProseMirror`
  const beforeHash = await cdp.eval('location.hash')
  const rowCount = await cdp.eval(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length`)
  // 逐点采样：区分「压根没跳」与「跳了又被弹回」
  let traj = []
  const t0 = Date.now()
  const clicked = await cdp.eval(`(() => {
    const e = document.querySelector('.aurora-kb-notes .aurora-kb-recent__item')
    if (!e) return false
    e.click(); return true
  })()`)
  for (const ms of [0, 50, 200, 600, 1500, 3000]) {
    const elapsed = Date.now() - t0
    if (ms > elapsed) await sleep(ms - elapsed)
    const snap = await cdp.eval(`({
      hash: location.hash,
      editor: !!document.querySelector(${JSON.stringify(ED)}),
      kbNotes: document.querySelectorAll('.aurora-kb-notes').length,
    })`)
    traj.push({ t: ms, ...snap })
  }
  info('before hash = ' + beforeHash + '，笔记行 = ' + rowCount)
  info('轨迹 = ' + JSON.stringify(traj))
  const atEditor = traj.filter((s) => s.hash === '#view=editor')
  ok('点击笔记行确实触发了跳转（hash 曾变为 #view=editor）', clicked === true && atEditor.length > 0,
    `clicked=${clicked} editorFrames=${atEditor.length}/${traj.length}`)
  const last = traj[traj.length - 1]
  ok('3s 后仍停留在编辑器（没有被弹回知识库）', last.hash === '#view=editor' && last.editor === true,
    `稳态 hash=${last.hash} editor=${last.editor} kbNotes=${last.kbNotes}`)
  ok('知识库面板已卸载（不与编辑器同屏）', last.kbNotes === 0, `kbNotes=${last.kbNotes}`)

  console.log('\n=== 5. 页面错误 ===')
  const errs = cdp.pageErrors.filter((e) => !/favicon|net::ERR_/.test(e))
  ok('无未预期页面错误', errs.length === 0, errs.length ? `\n      ${errs.slice(0, 5).join('\n      ')}` : '')

  const passed = results.filter((r) => r.cond).length
  console.log(`\n──────── 结果：${passed}/${results.length} 通过 ────────`)
  const failed = results.filter((r) => !r.cond)
  if (failed.length) console.log('失败项：\n' + failed.map((f) => '  ✗ ' + f.name).join('\n'))
  ws.close()
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error('探针异常：', e); process.exit(3) })
