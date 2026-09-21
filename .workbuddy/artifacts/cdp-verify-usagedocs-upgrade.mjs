/**
 * CDP 真机探针 · **老用户升级路径**：内置「MarkCraft 使用文档」知识库播种
 * ============================================================
 * 为什么单独一条探针（上一轮漏掉的正是这条）：
 *   `cdp-verify-usagedocs-seed.mjs` 跑的是**冷 profile = 新用户**：IndexedDB 为空，
 *   `loadStateAsync` 返回 null，于是页面**始终**用同步默认树 → 播种成功 → 全绿。
 *
 *   但**已有数据的用户**（IndexedDB 里有旧树）走的是另一条时序：
 *     ① `FileStore` 同步初始化 = `loadState()`（localStorage 只有版本号）→ 造出一棵**全新默认树 T0**；
 *     ② 播种 effect 在 T0 上求值 → `createFolder('root', …)` 能建成（root id 两边都是 'root'），
 *        但 `createFile(<T0 里的 folderId>, …)` 用的是**幽灵 id** → `addChildNode` 在权威树里找不到 → **16 篇静默丢弃**；
 *     ③ 随后 `loadStateAsync` 用 IndexedDB 的**权威旧树**整体覆盖 state →
 *        知识库的 `folderId` 从此**悬空** ⇒ 进库 0 篇。
 *
 * 本探针把 profile 改造成「老用户」（写入旧树 + 清掉知识库 + 清掉播种标记）后重载，
 * 断言的是**修复后的正确终态**：
 *   - 知识库的 folderId 一定能在该树里**解析到**（不悬空）；
 *   - 「MarkCraft 使用文档」文件夹里必须有 **16 篇拆分页 + 旧三篇（迁移，不改名）** = 17 篇；
 *   - 「我的笔记」里用户自己的笔记**原样保留**（零丢失）；
 *   - UI 上「笔记」tab 计数 = 17。
 *
 * 用法（必须与 Edge 同一次前台 bash）：
 *   node .workbuddy/artifacts/cdp-verify-usagedocs-upgrade.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const SEED_KEY = 'markcraft-usage-docs-seeded'
const TREE_KEY = 'markcraft-file-manager'
const DOCS_FOLDER = 'MarkCraft 使用文档'
const EXPECT_PAGES = 16
const EXPECT_NOTES_UPGRADED = 17 // 16 拆分页 + 旧《用户手册》全文（迁移保留，不改名）

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
      if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') {
        this.pageErrors.push(`console: ${m.params.entry.text}`)
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

async function clickByText(cdp, sel, text) {
  return cdp.eval(`(() => {
    const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => (x.textContent || '').includes(${JSON.stringify(text)}))
    if (!e) return false
    e.click(); return true
  })()`)
}
async function clickSel(cdp, sel, nth = 0) {
  return cdp.eval(`(() => {
    const e = document.querySelectorAll(${JSON.stringify(sel)})[${nth}]
    if (!e) return false
    e.click(); return true
  })()`)
}

/** 读 IndexedDB（Dexie 库 markcraft → kv 表）里的真实持久化状态 */
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
  const rawTree = kv[${JSON.stringify(TREE_KEY)}]
  let tree = null
  try { tree = rawTree ? JSON.parse(rawTree) : null } catch {}
  let kbList = []
  try { kbList = kv['kb-list'] ? JSON.parse(kv['kb-list']) : [] } catch {}
  const docsKv = {}
  for (const k of Object.keys(kv)) if (k.startsWith('kb-doc-')) { try { docsKv[k] = JSON.parse(kv[k]) } catch {} }
  if (!tree || !tree.rootFolder) return { found: false, kbList, docsKv }

  const byId = {}
  const files = []
  const walk = (n, parentId) => {
    byId[n.id] = { name: n.name, type: n.type, parentId: parentId ?? null }
    if (n.type === 'file') files.push({ id: n.id, name: n.name, parentId: parentId ?? null })
    else (n.children || []).forEach(c => walk(c, n.id))
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
    kbList: kbList.map(k => ({ name: k.name, folderId: k.folderId })),
    docsKvKeys: Object.keys(docsKv),
    docsKv: Object.values(docsKv).map(k => ({ id: k.id, name: k.name, folderId: k.folderId })),
    // folderId 是否能在树里解析（悬空判定）
    resolveTargets: Object.values(docsKv).map(k => ({ id: k.id, name: k.name, folderId: k.folderId, resolvesTo: byId[k.folderId] ? byId[k.folderId].name : null })),
    totalFiles: files.length,
  }
})()`

/** 把当前 profile 改造成「已有旧数据的用户」 */
function LEGACY_SQL() {
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
  return `(async () => {
    const legacy = ${JSON.stringify(legacy)}
    await new Promise((res) => {
      let req
      try { req = indexedDB.open('markcraft') } catch { res(); return }
      req.onerror = () => res()
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch { d.close(); res(); return }
        const st = tx.objectStore('kv')
        st.put({ key: ${JSON.stringify(TREE_KEY)}, value: JSON.stringify(legacy) })
        st.delete('kb-list')
        // 清掉全部知识库文档（kb-doc-*）
        const g = st.getAllKeys()
        g.onsuccess = () => { (g.result || []).filter(k => String(k).startsWith('kb-doc-')).forEach(k => st.delete(k)) }
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    localStorage.removeItem(${JSON.stringify(SEED_KEY)})
    localStorage.setItem('markcraft-migrated-link-guide', '1')
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
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  console.log('\n=== 0. 就绪（新用户首启，先让 profile 有「新种子」基线）===')
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({
    sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length,
    sheets: document.styleSheets.length,
  })`)
  ready(cdp)
  await sleep(1500)
  const base = await cdp.eval(IDB_READ)
  ok('应用外壳已挂载（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  ok('新用户基线：树已落 IndexedDB', base.found === true, `found=${base.found}`)

  console.log('\n=== 1. 把 profile 改造成「已有旧数据的用户」→ 重载 ===')
  await cdp.eval(LEGACY_SQL())
  const legacy = await cdp.eval(IDB_READ)
  ok('已写入旧树（我的笔记 4 篇 / 无使用文档文件夹 / 无知识库）',
    legacy.found === true && legacy.myNotesNames.length === 4 && legacy.kbCount === 0 && legacy.docsFolderId === null,
    `myNotes=${JSON.stringify(legacy.myNotesNames)} kbCount=${legacy.kbCount} docsFolderId=${legacy.docsFolderId}`)

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=upgrade#view=editor` })
  await sleep(900)
  await ready(cdp)
  await sleep(300)
  // 等播种终态：要么播种标记出现，要么知识库落库
  await waitFor(cdp, `localStorage.getItem(${JSON.stringify(SEED_KEY)}) === '1'`, { tries: 60, ms: 500, label: '播种标记' })
  await sleep(1500) // 等 saveState 防抖 + 重挂

  console.log('\n=== 2. 老用户升级后的终态（持久化层）===')
  const after = await cdp.eval(IDB_READ)
  info('kbList = ' + JSON.stringify(after.kbList))
  info('resolve = ' + JSON.stringify(after.resolveTargets))
  info('docsFileCount = ' + after.docsFileCount + '  myNotes = ' + JSON.stringify(after.myNotesNames))

  ok('播种后存在知识库「MarkCraft 使用文档」', after.kbCount === 1 && after.kbList[0]?.name === DOCS_FOLDER,
    `kbList=${JSON.stringify(after.kbList)}`)
  const target = after.resolveTargets[0]
  ok('知识库 folderId 能在树里解析到（不悬空）—— 这正是「进去没有内容」的根因',
    !!target && target.resolvesTo === DOCS_FOLDER,
    `folderId 解析结果 = ${target ? JSON.stringify(target.resolvesTo) : 'no-kb-doc'}`)
  ok('使用文档文件夹里有 16 篇拆分页 + 旧《用户手册》迁移 = 17 篇',
    after.docsFileCount === EXPECT_NOTES_UPGRADED, `docsFileCount=${after.docsFileCount}`)
  ok('旧《Markdown 入门教程.md》已迁移进该文件夹且未改名',
    after.docsFileNames.includes('Markdown 入门教程.md'), `names=${JSON.stringify(after.docsFileNames.slice(0, 20))}`)
  ok('旧《知识链接体系指南.md》已迁移进该文件夹且未改名',
    after.docsFileNames.includes('知识链接体系指南.md'))
  ok('「我的笔记」只剩用户自己的笔记（零丢失、未被搬空）',
    after.myNotesNames.length === 1 && after.myNotesNames[0] === '我自己的笔记.md',
    `myNotes=${JSON.stringify(after.myNotesNames)}`)

  console.log('\n=== 3. 老用户升级后的终态（UI 层）===')
  await clickByText(cdp, '.aurora-sidebar-item', '知识库')
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '知识库卡片' })
  const cards = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-kbcard')].map(c => (c.querySelector('.aurora-kb-kbcard__name') || {}).textContent || '')`)
  ok('知识库列表出现该库', cards.length === 1 && cards[0] === DOCS_FOLDER, `cards=${JSON.stringify(cards)}`)

  await clickSel(cdp, '.aurora-kb-kbcard', 0)
  await waitFor(cdp, `${SUBBAR_NAME} === ${JSON.stringify(DOCS_FOLDER)}`, { tries: 30, ms: 400, label: 'subbar 库名' })
  await clickByText(cdp, '.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]', '笔记')
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

  console.log('\n=== 4. 页面错误 ===')
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
