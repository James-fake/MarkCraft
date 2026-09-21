/**
 * CDP 真机探针 · 内置「MarkCraft 使用文档」知识库播种验收
 * ============================================================
 * 需求（2026-09-21）：首次进入 MarkCraft，知识库界面默认已存在「MarkCraft 使用文档」知识库，
 * 库内笔记 = MarkCraft 各功能的使用说明（16 篇 / 语言）。
 *
 * 为什么必须真机跑（jsdom 覆盖不到的三层）：
 *   ① 首启播种依赖真实的 **空 IndexedDB + 空 localStorage**（jsdom 里 store 全是桩）；
 *   ② 播种结果要写进真实文件树持久化（**IndexedDB `kv` 表的 `markcraft-file-manager`**）；
 *   ③ 设置 →「使用文档」走的是 **真实 nav('kb', kbId) 路由跳转**
 *      （memory 已知坑：param 漏登记 = 参数静默丢失，只有真路由才验得出）。
 *
 * 断言设计要点（防假绿）：
 *   · 先证「扫描面非空」：侧栏项 > 0 且 styleSheets > 8，否则整轮结论不可信；
 *   · 每条「某 UI 出现」的断言，先跑一次它**不该出现**的场景作对照
 *     （进知识库前 `.aurora-kb-kbcard` 必须为 0；进「设置」时 `.aurora-kb-notes` 必须为 0）；
 *   · 额外在页面内读「播种标记 + IndexedDB 文件树结构」，与 UI 断言互为独立证据源。
 *
 * 两个已探明的口径（写对断言的前提）：
 *   · **hash 只携带视图名**（`#view=kb`），实体 id 存在 viewState 内存里 → 不能用 hash 断言 kbId 传递；
 *     正确证据是详情页 subbar 显示的是该库名（不是「未选择知识库」）。
 *   · **文件树持久化在 IndexedDB**（`fileService.saveState` 300ms 防抖写 kv 表），
 *     localStorage 只放版本号 → 读树必须走 IndexedDB。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1）：
 *   node .workbuddy/artifacts/cdp-verify-usagedocs-seed.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const SEED_KEY = 'markcraft-usage-docs-seeded'
const TREE_KEY = 'markcraft-file-manager'
const DOCS_FOLDER = 'MarkCraft 使用文档'
const EXPECT_PAGES = 16

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
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
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

/** 就绪判据：真实应用外壳 + 样式表到位（别用 #root，过早为真） */
function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

/** 首启引导浮层若存在则关掉（真实点击优先，退化为 remove） */
async function dismissOnboarding(cdp) {
  return cdp.eval(`(() => {
    for (const sel of ['.aurora-audience', '.aurora-onboarding']) {
      const el = document.querySelector(sel)
      if (!el) continue
      const b = [...el.querySelectorAll('button')].find(x => /开始|跳过|知道了|进入|继续/.test(x.textContent || ''))
      if (b) { b.click(); return 'clicked:' + sel }
      el.remove(); return 'removed:' + sel
    }
    return 'none'
  })()`)
}

/** 合成点击（折叠分组内的侧栏项几何为 0，真实鼠标点不到；合成 click 仍走 React onClick） */
async function clickByText(cdp, sel, text) {
  return cdp.eval(`(() => {
    const e = [...document.querySelectorAll(${JSON.stringify(sel)})]
      .find(x => (x.textContent || '').includes(${JSON.stringify(text)}))
    if (!e) return false
    e.click()
    return true
  })()`)
}
async function clickSel(cdp, sel, nth = 0) {
  return cdp.eval(`(() => {
    const e = document.querySelectorAll(${JSON.stringify(sel)})[${nth}]
    if (!e) return false
    e.click()
    return true
  })()`)
}

/**
 * 从 IndexedDB（Dexie 库 `markcraft` → 表 `kv`）读真实文件树。
 * 注意：`fileService.saveState` 写的是 IndexedDB（300ms 防抖），不是 localStorage ——
 * 早先按 localStorage 读会得到「树不存在」的假阴性。
 */
const TREE_READ = `(async () => {
  const val = await new Promise((resolve) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { resolve(null); return }
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('kv')) { d.close(); resolve(null); return }
      let g
      try { g = d.transaction('kv', 'readonly').objectStore('kv').get(${JSON.stringify(TREE_KEY)}) } catch { d.close(); resolve(null); return }
      g.onsuccess = () => { const r = g.result; d.close(); resolve(r ? r.value : null) }
      g.onerror = () => { d.close(); resolve(null) }
    }
  })
  if (!val) return { found: false }
  let s = null
  try { s = JSON.parse(val) } catch {}
  if (!s || !s.rootFolder) return { found: false }
  const kids = s.rootFolder.children || []
  const docs = kids.find(c => c.type === 'folder' && c.name === ${JSON.stringify(DOCS_FOLDER)})
  const mine = kids.find(c => c.type === 'folder' && c.name === '我的笔记')
  const allFiles = []
  const walk = (n) => { if (n.type === 'file') allFiles.push(n.name); else (n.children || []).forEach(walk) }
  walk(s.rootFolder)
  return {
    found: true,
    folders: kids.map(c => c.name),
    docsFolderCount: kids.filter(x => x.type === 'folder' && x.name === ${JSON.stringify(DOCS_FOLDER)}).length,
    docsFileCount: docs ? (docs.children || []).filter(c => c.type === 'file').length : -1,
    docsNames: docs ? (docs.children || []).map(c => c.name) : [],
    myNotesCount: mine ? (mine.children || []).length : -1,
    hasLegacyManual: allFiles.includes('用户手册.md'),
    totalFiles: allFiles.length,
    tabsCount: (s.tabs || []).length,
  }
})()`

/** 等树在 IndexedDB 里可读（saveState 有 300ms 防抖）
 *  ⚠️ TREE_READ 是 IIFE 求值出的 Promise —— 直接拼 `.found` 会读到 undefined（假超时）。*/
function waitTree(cdp, tries = 24) {
  return waitFor(cdp, `(async () => (await ${TREE_READ}).found === true)()`, {
    tries, ms: 500, label: 'IndexedDB 文件树',
  })
}

/**
 * 详情页库名是 `loadKb(kbId)` **异步**解析后填充的 —— 元素先出现、文案后到。
 * 因此「库名正确」这条断言必须轮询**文本**，只等元素存在会拿到占位值「未选择知识库」
 * （实测：同一份代码一次过、一次挂在 `.aurora-kb-subbar__name` 的占位文案上 = 典型时序假阴性）。
 */
const SUBBAR_NAME = `((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`
function waitSubbarName(cdp, tries = 30) {
  return waitFor(cdp, `${SUBBAR_NAME} === ${JSON.stringify(DOCS_FOLDER)}`, {
    tries, ms: 400, label: '详情页库名（异步 loadKb）',
  })
}

// ────────────────────────────── 主流程 ──────────────────────────────

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

  console.log('\n=== 0. 就绪 + 扫描面自检（零命中类断言的前置）===')
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({
    sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length,
    sheets: document.styleSheets.length,
    hash: location.hash,
  })`)
  ok('应用外壳已挂载（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `readyTries=${rdy} sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets} hash=${surface.hash}`)

  // 首启环境说明：profile 是否全新由 bash 侧（PROFILE_FRESH）保证；
  // 页面内能自证的是「树里没有旧种子的三篇遗物」——那才是首启语义的实质。
  const env = await cdp.eval(`({ seedKey: localStorage.getItem(${JSON.stringify(SEED_KEY)}) })`)
  info(`播种标记 = ${env.seedKey ?? 'null'}（bash 侧已打印 PROFILE_FRESH）`)

  console.log('\n=== 1. 对照：进入知识库前，知识库列表卡片必须不存在 ===')
  const kbCardBefore = await cdp.eval(`document.querySelectorAll('.aurora-kb-kbcard').length`)
  ok('未进知识库视图时 .aurora-kb-kbcard = 0（证明该断言有区分能力）', kbCardBefore === 0, `count=${kbCardBefore}`)

  console.log('\n=== 2. 首启播种：等待播种落地（真实 IndexedDB 文件树）===')
  const seedTries = await waitFor(cdp, `localStorage.getItem(${JSON.stringify(SEED_KEY)}) === '1'`, {
    tries: 90, ms: 500, label: '播种标记 markcraft-usage-docs-seeded',
  })
  ok('播种标记已写入', seedTries >= 0, `等待轮次=${seedTries}`)

  const treeWait = await waitTree(cdp)
  const treeSnap = await cdp.eval(TREE_READ)
  ok('文件树已持久化到 IndexedDB（读取面非空）', treeWait >= 0 && treeSnap.found === true,
    `found=${treeSnap.found}`)
  ok('文件树中已存在「MarkCraft 使用文档」文件夹且含 16 篇', treeSnap.docsFileCount === EXPECT_PAGES,
    `docsFileCount=${treeSnap.docsFileCount}`)
  ok('「我的笔记」不再预置内容（空）', treeSnap.myNotesCount === 0, `myNotesCount=${treeSnap.myNotesCount}`)
  ok('根下不再出现旧《用户手册.md》（新种子已拆分替代）', treeSnap.hasLegacyManual === false,
    `hasLegacyManual=${treeSnap.hasLegacyManual}`)
  ok('播种未污染标签页（tabs = 0）', treeSnap.tabsCount === 0, `tabs=${treeSnap.tabsCount}`)
  ok('根下文件夹恰为 2 个（使用文档 + 我的笔记）', (treeSnap.folders || []).length === 2,
    JSON.stringify(treeSnap.folders))
  info('篇章名：' + (treeSnap.docsNames || []).slice(0, 5).join(' , ') + ' …')

  console.log('\n=== 3. 知识库界面：默认存在该知识库并可直接进入 ===')
  await dismissOnboarding(cdp)
  const clickedKb = await clickByText(cdp, '.aurora-sidebar-item', '知识库')
  ok('点侧栏「知识库」', clickedKb)
  const cardWait = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, {
    tries: 40, ms: 400, label: '知识库列表卡片',
  })
  const cards = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-kbcard')].map(c => ({
    name: (c.querySelector('.aurora-kb-kbcard__name') || {}).textContent || '',
    meta: (c.querySelector('.aurora-kb-kbcard__meta') || {}).textContent || '',
  }))`)
  ok('知识库列表出现卡片（对照线已翻转为「存在」）', cardWait >= 0 && cards.length >= 1, `cards=${cards.length}`)
  ok('默认知识库名为「MarkCraft 使用文档」', cards[0]?.name === DOCS_FOLDER, `name="${cards[0]?.name}"`)
  ok('知识库列表仅此一条（未多建/未重名）', cards.length === 1, `names=${JSON.stringify(cards.map(c => c.name))}`)
  info('卡片元信息 = "' + (cards[0]?.meta || '').trim() + '"（fileCount 口径见报告「已知遗留」）')
  info('hash = ' + (await cdp.eval('location.hash')))

  const opened = await clickSel(cdp, '.aurora-kb-kbcard', 0)
  const detailWait = await waitFor(cdp, `!!document.querySelector('.aurora-kb-subbar__name')`, {
    tries: 40, ms: 400, label: '知识库详情 subbar',
  })
  const subbarName = await cdp.eval(SUBBAR_NAME)
  const nameWait = await waitSubbarName(cdp)
  const subbarName2 = await cdp.eval(SUBBAR_NAME)
  ok('点卡片进入详情页（subbar 出现）', opened && detailWait >= 0, `subbar="${subbarName2}"`)
  // hash 只携带视图名（viewState 内存持有 kbId）→ 用「subbar 显示的是该库名而非『未选择知识库』」作证据
  ok('nav("kb", kbId) 的 kbId 真的传进了详情页（param 未静默丢失）',
    nameWait >= 0 && subbarName2 === DOCS_FOLDER, `首采样="${subbarName}" 稳态="${subbarName2}"`)

  console.log('\n=== 4. 详情页「笔记」tab：16 篇内置文档 ===')
  const tabClicked = await clickByText(cdp, '.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]', '笔记')
  const notesWait = await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, {
    tries: 30, ms: 400, label: '笔记 tab',
  })
  const noteCount = await cdp.eval(`(document.querySelector('.aurora-kb-notes__head-count') || {}).textContent || ''`)
  const noteRows = await cdp.eval(`document.querySelectorAll('.aurora-kb-recent__item').length`)
  ok('切到「笔记」tab 并渲染计数徽标', tabClicked && notesWait >= 0, `head-count="${noteCount}"`)
  ok('笔记数量 = 16（与内置篇章一一对应）', noteCount === String(EXPECT_PAGES), `count="${noteCount}"`)
  ok('笔记行数 ≥ 16（渲染面非空，非空列表）', noteRows >= EXPECT_PAGES, `rows=${noteRows}`)

  const firstNote = await cdp.eval(`(() => {
    const e = document.querySelector('.aurora-kb-recent__item')
    return e ? (e.textContent || '').trim().slice(0, 60) : ''
  })()`)
  info('首篇：' + firstNote)

  console.log('\n=== 5. 打开一篇：内容真的渲染（不是空壳）===')
  const openNote = await clickSel(cdp, '.aurora-kb-recent__item', 0)
  const editorWait = await waitFor(cdp, `location.hash.includes('view=editor')`, { tries: 40, ms: 400, label: '编辑器视图' })
  const editorSnap = await waitFor(
    cdp,
    `(() => {
      const el = document.querySelector('.cm-content') || document.querySelector('.ProseMirror')
      return !!el && (el.textContent || '').length > 200
    })()`,
    { tries: 40, ms: 400, label: '编辑器正文' },
  )
  const bodyLen = await cdp.eval(`(() => {
    const el = document.querySelector('.cm-content') || document.querySelector('.ProseMirror')
    return el ? (el.textContent || '').length : -1
  })()`)
  ok('点笔记行 → 真实跳转编辑器', openNote && editorWait >= 0, `hash=${await cdp.eval('location.hash')}`)
  ok('编辑器正文已渲染（textContent > 200 字）', editorSnap >= 0 && bodyLen > 200, `bodyLen=${bodyLen}`)

  console.log('\n=== 6. 对照：进「设置」时详情页元素必须消失 ===')
  await clickByText(cdp, '.aurora-sidebar-item', '设置')
  const settingsWait = await waitFor(cdp, `!!document.querySelector('.aurora-settings')`, { tries: 40, ms: 400, label: '设置页' })
  const notesInSettings = await cdp.eval(`document.querySelectorAll('.aurora-kb-notes').length`)
  ok('已进入设置页', settingsWait >= 0)
  ok('设置页中 .aurora-kb-notes = 0（对照线成立）', notesInSettings === 0, `count=${notesInSettings}`)

  console.log('\n=== 7. 设置 → 关于 → 使用文档：应用内跳转直达该知识库详情 ===')
  const aboutClicked = await clickByText(cdp, '.aurora-settings__nav-tab', '关于')
  const linkWait = await waitFor(cdp, `!!document.querySelector('[data-testid="about-usage-docs"]')`, {
    tries: 30, ms: 400, label: '关于 → 使用文档入口',
  })
  const linkText = await cdp.eval(`(document.querySelector('[data-testid="about-usage-docs"]') || {}).textContent || ''`)
  ok('切到「关于」并渲染「使用文档」入口', aboutClicked && linkWait >= 0, `text="${linkText}"`)

  const docsClicked = await clickSel(cdp, '[data-testid="about-usage-docs"]', 0)
  const backWait = await waitFor(cdp, `!!document.querySelector('.aurora-kb-subbar')`, {
    tries: 40, ms: 400, label: '使用文档 → KB 详情',
  })
  const nameWait7 = await waitSubbarName(cdp)
  const landed = await cdp.eval(`({
    hash: location.hash,
    subbar: ${SUBBAR_NAME},
    listCards: document.querySelectorAll('.aurora-kb-kbcard').length,
  })`)
  ok('点「使用文档」→ 跳到知识库详情（而非列表页）', docsClicked && backWait >= 0,
    `hash=${landed.hash} listCards=${landed.listCards}`)
  ok('落地库名 =「MarkCraft 使用文档」', nameWait7 >= 0 && landed.subbar === DOCS_FOLDER, `subbar="${landed.subbar}"`)
  ok('落地是详情页而非知识库列表（列表卡片 = 0）', landed.listCards === 0, `listCards=${landed.listCards}`)

  // 详情页默认 tab 是「概览」，笔记列表要切到「笔记」tab（切换后重新断言 16 篇，
  // 证明这条入口落到的确实是同一个内建库、且笔记齐备）
  await clickByText(cdp, '.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]', '笔记')
  const notesAgain = await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, {
    tries: 30, ms: 400, label: '设置入口 → 笔记 tab',
  })
  const notesCount2 = await cdp.eval(`(document.querySelector('.aurora-kb-notes__head-count') || {}).textContent || ''`)
  ok('设置入口落地后「笔记」tab 仍为 16 篇', notesAgain >= 0 && notesCount2 === String(EXPECT_PAGES),
    `notes="${notesCount2}"`)

  console.log('\n=== 8. 幂等重载：刷新后不得再建一个知识库（不重复播种）===')
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=reload#view=kb` })
  await sleep(800)
  await ready(cdp)
  await dismissOnboarding(cdp)
  await sleep(800)
  await clickByText(cdp, '.aurora-sidebar-item', '知识库')
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400 })
  await sleep(800)
  const afterReload = await cdp.eval(`({
    cards: [...document.querySelectorAll('.aurora-kb-kbcard')].map(c => (c.querySelector('.aurora-kb-kbcard__name') || {}).textContent || ''),
  })`)
  const tree2 = await cdp.eval(TREE_READ)
  ok('重载后知识库列表仍只有一条', afterReload.cards.length === 1, `cards=${JSON.stringify(afterReload.cards)}`)
  ok('重载后文件树中该文件夹也只有一份（幂等）', tree2.docsFolderCount === 1, `docsFolderCount=${tree2.docsFolderCount}`)
  ok('重载后篇章数仍为 16（未重复创建）', tree2.docsFileCount === EXPECT_PAGES, `count=${tree2.docsFileCount}`)
  ok('重载后「我的笔记」仍为空', tree2.myNotesCount === 0, `myNotesCount=${tree2.myNotesCount}`)

  console.log('\n=== 9. 阳性对照 + 不复活端到端：清空持久化但保留播种标记 ===')
  // 目的有两层：
  //   ① 证明第 3 节「出现 1 张卡片」这条断言**翻转得动**（控制组必须看到 0 张 + 空态）；
  //   ② 端到端验证「不复活」——用户删掉该库后，下次进入不得重建（jsdom 单测之外的实链路）。
  await cdp.eval(`(async () => {
    await new Promise((res) => {
      const req = indexedDB.open('markcraft')
      req.onerror = () => res()
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch { d.close(); res(); return }
        tx.objectStore('kv').clear()
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    try { localStorage.setItem(${JSON.stringify(SEED_KEY)}, '1') } catch {}
    return true
  })()`)
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=control#view=kb` })
  await sleep(800)
  await ready(cdp)
  await dismissOnboarding(cdp)
  await sleep(1000)
  await clickByText(cdp, '.aurora-sidebar-item', '知识库')
  await sleep(1200)
  const control = await cdp.eval(`({
    cards: document.querySelectorAll('.aurora-kb-kbcard').length,
    empty: !!document.querySelector('.aurora-kb-manage__empty'),
    seedKey: localStorage.getItem(${JSON.stringify(SEED_KEY)}),
  })`)
  ok('控制组：清空持久化后知识库卡片 = 0（第 3 节断言确实翻转得动）', control.cards === 0, `cards=${control.cards}`)
  ok('控制组显示知识库空态（不是静默白屏）', control.empty === true, `empty=${control.empty}`)
  ok('控制组未复活种子（播种标记仍为 1 且未重建库）', control.seedKey === '1' && control.cards === 0,
    `seedKey=${control.seedKey} cards=${control.cards}`)

  console.log('\n=== 10. 页面错误 ===')
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
