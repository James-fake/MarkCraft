/**
 * CDP 真机探针 · 内置「使用文档」→ ① 不进编辑器文件列表 ② 只读简介页（2026-09-22 用户需求）
 * ==========================================================================
 * 需求原话：
 *   ①「使用文档的笔记内容不应出现在编辑功能的文件列表中，需在文件树的数据来源或渲染层面过滤排除。」
 *   ②「点击使用文档笔记后…虽仍处于编辑区域，但需呈现为简洁的简介页面：隐藏左侧文件列表，
 *      移除顶部工具栏中的删除按钮和编辑模式选择框，仅保留阅读该简介内容所需的必要元素。」
 *
 * 本探针要证的四件事（**每条都配了「不该成立」的对照组**，见 skill《防假绿升级》）：
 *   §1 编辑器空态文件列表（EmptyFileBrowser）：只列普通笔记；**权威树里确实有 5 篇**（含 3 篇使用文档）
 *      → 证明是「过滤掉了 3 篇」而不是「本来就没数据」。
 *   §2 【对照组】打开普通笔记：编辑功能**完好**（标签栏/模式框/左右栏都在、无简介页）
 *      → 证明 §3 的「缺席」是**条件式裁剪**，不是「编辑器整块坏掉」。
 *   §3 经真实入口（知识库 → 笔记 Tab）打开使用文档：呈现 `.aurora-brief` 简介页，
 *      且标签栏 / 模式选择框 / 左右缘 hoverzone **全部缺席**、返回芯片与状态栏「简介」仍在。
 *   §5 🚨【紧急修复回归 · 用户报障场景】把**用户自己的笔记放进内置文件夹**：
 *      它必须仍出现在文件列表里、点开仍是**完整编辑器**（不是简介页）；
 *      而同一文件夹内的**内置说明书那一篇**仍必须是简介页（防「修过头」）。
 *   §6 🚨【第二轮需求 · 退出即无痕】使用文档「只能从知识库点进去看」：
 *      打开它不进「最近文件」；退出编辑器后标签栏里不留它、落盘（IndexedDB）里也不留它
 *      （否则「看着说明书刷新」会被记成上次打开的文档）。对照组 = 普通笔记照常进最近 / 照常落盘。
 *   §4 页面错误逐视图归属。
 *
 * 起手区（skill 铁律 0）：使用文档**已不在编辑器文件列表里**（这正是需求①的效果），
 *   所以「打开使用文档」必须走**它在真机上唯一还存在的入口** —— 知识库详情页的笔记列表。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1）：
 *   node .workbuddy/artifacts/cdp-verify-usagedoc-brief.mjs
 * 作用域开关：ONLY=1 / ONLY=2 / ONLY=3 / ONLY=5 / ONLY=6
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const ONLY = process.env.ONLY || ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.pageErrors = []
    this.errMarks = []
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
  /** 取错误快照下标（逐视图归属错误，别用「共 N 条」掩盖落点） */
  mark() { this.errMarks.push(this.pageErrors.length); return this.pageErrors.length }
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

async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

// ────────────────────────── 种子 ──────────────────────────
// 关键：文件夹**必须用源码里的真名**（`core/data/defaultDocs/usageDocs/zh.ts#USAGE_DOC_FOLDER`
// = "MarkCraft 使用文档"）—— 判定单源是「文件夹名命中该常量」，换个名字就等于换了测的东西。
const USAGE_FOLDER = 'MarkCraft 使用文档'
const NOTES_FOLDER = '我的笔记'
const USAGE_PAGES = ['00 开始使用.md', '01 界面布局.md', '02 编辑器模式.md']
const PLAIN_NOTES = ['甲笔记.md', '乙笔记.md']
/** §5 专用：用户自己在**内置文件夹内**建的笔记（名字**不**命中内置篇章清单） */
const USER_NOTE_IN_USAGE = '我的读书笔记.md'
/** 权威树里应有的**全部** .md 文件数（3 篇使用文档 + 2 篇普通笔记） */
const TOTAL_FILES = USAGE_PAGES.length + PLAIN_NOTES.length
/** 编辑器文件列表**应当**看得见的文件数 = 过滤后 */
const VISIBLE_FILES = PLAIN_NOTES.length
/** §5 场景：3 篇使用文档 + 2 篇普通笔记 + 1 篇「在内置文件夹内的用户笔记」= 6 篇 */
const TOTAL_FILES_S5 = TOTAL_FILES + 1
/** §5 场景：使用文档 3 篇仍被过滤 → 可见 = 2 篇普通笔记 + 1 篇用户笔记 */
const VISIBLE_FILES_S5 = PLAIN_NOTES.length + 1

const KB_ID = 'kb-usagedoc-brief-0001'
const KB_FOLDER = 'usage-folder-seed'

function SEED_SQL(opts = {}) {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const doc = (name, body) => f('ud-' + name.slice(0, 2), name, body)
  const usageChildren = [
    doc(USAGE_PAGES[0], '# 开始使用\n\n欢迎使用 MarkCraft。\n\n- 条目一\n- 条目二\n'),
    doc(USAGE_PAGES[1], '# 界面布局\n\n侧栏、顶栏、状态栏。\n'),
    doc(USAGE_PAGES[2], '# 编辑器模式\n\n源码模式 / 所见即所得 / 双栏布局。\n'),
  ]
  // §5：把**用户的笔记**放进内置文件夹 —— 复刻用户报障时的数据形态
  if (opts.userNoteInUsageFolder) {
    usageChildren.push(f('un-1', USER_NOTE_IN_USAGE, '# 我的读书笔记\n\n这是用户自己的正文，不是内置说明。\n'))
  }
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        {
          id: KB_FOLDER, name: USAGE_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: usageChildren,
        },
        {
          id: NOTES_FOLDER, name: NOTES_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: [
            f('pn-1', PLAIN_NOTES[0], '# 甲笔记\n\n这是普通笔记的正文。\n'),
            f('pn-2', PLAIN_NOTES[1], '# 乙笔记\n\n这是第二篇普通笔记。\n'),
          ],
        },
      ],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  // 这个 KB 的 folderId 指向**使用文档文件夹** —— 复刻真机「知识库 = 内置使用文档」的形态
  const kbDoc = {
    id: KB_ID, name: USAGE_FOLDER, description: '探针种子库（指向内置使用文档文件夹）',
    folderId: KB_FOLDER, createdAt: T, updatedAt: T,
    canvasIds: [], fileIds: [], rules: [],
  }
  const kbItem = {
    id: KB_ID, name: USAGE_FOLDER, description: '探针种子库（指向内置使用文档文件夹）',
    folderId: KB_FOLDER, fileCount: usageChildren.length, canvasCount: 0, createdAt: T, updatedAt: T,
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
    // 标记「已播种」→ 跳过内置播种/迁移，保证 profile 只含本探针种子（判定与「用户已有库」对齐）
    localStorage.setItem('markcraft-usage-docs-seeded', '1')
    localStorage.setItem('markcraft-migrated-link-guide', '1')
    localStorage.setItem('markcraft-link-guide-added', '1')
    return true
  })()`
}

/** 直读 IndexedDB 里的**权威文件树**（坑 M：文件树介质是 IndexedDB，localStorage 只有版本号） */
const TREE_READ = `(async () => {
  const val = await new Promise((res) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { res(null); return }
    req.onerror = () => res(null)
    req.onsuccess = () => {
      const d = req.result
      let tx
      try { tx = d.transaction('kv', 'readonly') } catch { d.close(); res(null); return }
      const g = tx.objectStore('kv').get('markcraft-file-manager')
      g.onsuccess = () => { const r = g.result; d.close(); res(r ? r.value : null) }
      g.onerror = () => { d.close(); res(null) }
    }
  })
  if (!val) return { found: false, files: [], folders: [] }
  const tree = typeof val === 'string' ? JSON.parse(val) : val
  const files = [], folders = []
  const walk = (n) => {
    if (!n) return
    if (n.type === 'file') { files.push(n.name); return }
    folders.push(n.name)
    for (const c of n.children || []) walk(c)
  }
  walk(tree.rootFolder)
  return { found: true, files: files, folders: folders }
})()`

// ────────────────────────── 选择器 / 取数 ──────────────────────────

/**
 * 直读**落盘**的 FileManager state（§6 用）：tabs / activeTabId 是「有没有被记住」的唯一判据。
 * 介质同上（IndexedDB 的 kv）——「看着说明书时刷新会不会记得它」问的就是这里。
 */
const PERSIST_READ = `(async () => {
  const val = await new Promise((res) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { res(null); return }
    req.onerror = () => res(null)
    req.onsuccess = () => {
      const d = req.result
      let tx
      try { tx = d.transaction('kv', 'readonly') } catch { d.close(); res(null); return }
      const g = tx.objectStore('kv').get('markcraft-file-manager')
      g.onsuccess = () => { const r = g.result; d.close(); res(r ? r.value : null) }
      g.onerror = () => { d.close(); res(null) }
    }
  })
  if (!val) return { found: false }
  const s = typeof val === 'string' ? JSON.parse(val) : val
  const tabs = s.tabs || []
  return {
    found: true,
    activeTabId: s.activeTabId || null,
    tabNames: tabs.map((t) => t.name),
    tabFileIds: tabs.map((t) => t.fileId),
    tabTransient: tabs.map((t) => !!t.isTransient),
    activeTabFileId: (tabs.find((t) => t.id === s.activeTabId) || {}).fileId || null,
  }
})()`

/** 「最近文件」条目名（localStorage）——欢迎页「继续《…》」与「插入双链」候选的唯一来源 */
const RECENT_READ = `(() => {
  try {
    const raw = localStorage.getItem('markcraft_recent_files')
    const arr = raw ? JSON.parse(raw) : []
    return arr.map((f) => f.fileName)
  } catch { return [] }
})()`

const EMPTY_ROW_NAMES = `[...document.querySelectorAll('.aurora-emptyfiles__row-name')].map((e) => (e.textContent || '').trim())`
const TREE_ROW_NAMES = `[...document.querySelectorAll('.aurora-filetree__item-name')].map((e) => (e.textContent || '').trim())`
/** 状态栏右区文案（**必须限定作用域**：正文里合法出现「所见即所得」等模式词） */
const STATUS_RIGHT = `[...document.querySelectorAll('.aurora-statusbar__right .aurora-statusbar__item')].map((e) => (e.textContent || '').trim())`

const EDITOR_CHROME = `({
  brief: document.querySelectorAll('.aurora-brief').length,
  briefMarked: document.querySelectorAll('[data-usage-doc-brief]').length,
  preview: document.querySelectorAll('.markdown-preview').length,
  toolbar: document.querySelectorAll('.aurora-toolbar').length,
  tabs: document.querySelectorAll('.aurora-tabs').length,
  modeToggles: document.querySelectorAll('.aurora-mode-toggles').length,
  modeToggle: document.querySelectorAll('.aurora-mode-toggle').length,
  hoverzones: document.querySelectorAll('.aurora-editor__hoverzone').length,
  returnChip: document.querySelectorAll('.aurora-editor__return').length,
  returnText: ((document.querySelector('.aurora-editor__return') || {}).textContent || '').trim(),
  statusRight: ${STATUS_RIGHT},
  hash: location.hash,
})`

const CLICK_KB_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库'))
  if (e) e.click()
  return !!e
})()`

/**
 * 点侧栏「编辑器」。
 * ⚠️ 用 `includes` 而不是全等：SidebarItem 的 textContent 可能带上计数徽标（如「编辑器256」）。
 * ⚠️ 这一条在 §6c 里必须**视图 id 不变**地触发（当前已在 editor）——
 *    正因如此 AuroraShell 的「路由离开编辑器」effect 不会跑，回收只能靠 EditorPanel 的
 *    onSidebarSelect 显式完成。若这里失效，§6c 会红。
 */
const CLICK_EDITOR_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('编辑器'))
  if (e) e.click()
  return !!e
})()`

const clickEmptyRow = (name) => `(() => {
  const rows = [...document.querySelectorAll('.aurora-emptyfiles__row')]
  const r = rows.find(x => ((x.querySelector('.aurora-emptyfiles__row-name') || {}).textContent || '').trim() === ${JSON.stringify(name)})
  if (!r) return false
  r.click(); return true
})()`

/** 种子树里使用文档首篇的 id（SEED_SQL 用 `ud-` + 文件名前两字符生成） */
const USAGE_DOC_FIRST_ID = 'ud-' + USAGE_PAGES[0].slice(0, 2)

/**
 * 走真机**唯一入口**打开使用文档首篇：知识库管理页 → 详情 → 「笔记」Tab → 按名点该行。
 * 抽成函数是因为 §6 需要进出**两次**（验两种退出路径），而这段链路有 4 步等待。
 */
async function openBriefViaKb(cdp, tag = '§6') {
  await cdp.eval(CLICK_KB_SIDEBAR)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: `${tag} 知识库卡片` })
  await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
  await waitFor(
    cdp,
    `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '').trim(); return n === ${JSON.stringify(USAGE_FOLDER)} })()`,
    { tries: 40, ms: 400, label: `${tag} 详情页库名` },
  )
  await cdp.eval(`(() => {
    const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
      .find(x => (x.textContent || '').includes('笔记'))
    if (t) t.click(); return !!t
  })()`)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`,
    { tries: 30, ms: 400, label: `${tag} 笔记 Tab` })
  const clicked = await cdp.eval(`(() => {
    const want = ${JSON.stringify(USAGE_PAGES[0])}
    const rows = [...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')]
    const r = rows.find(x => (x.textContent || '').includes(want))
    if (!r) return false
    r.click(); return true
  })()`)
  const briefAt = await waitFor(cdp, `document.querySelectorAll('.aurora-brief').length > 0`,
    { tries: 25, ms: 400, label: `${tag} 简介页挂载` })
  return { clicked, briefAt }
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

  console.log('\n=== 0. 启动应用（首跳）===')
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=udbrief-boot-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy0 = await ready(cdp)
  ok('应用外壳已挂载', rdy0 >= 0, `waitIdx=${rdy0}`)

  console.log('\n=== 0b. 写种子 → 强制真实重载（扫描面自检）===')
  console.log('   · 种子树：' + USAGE_FOLDER + '/（' + USAGE_PAGES.length + ' 篇） + ' + NOTES_FOLDER + '/（' + PLAIN_NOTES.length + ' 篇）')
  await cdp.eval(SEED_SQL())
  // 坑 C + 坑 P：深链只认启动 URL；同 URL 不重载 → 一律加唯一 query
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=udbrief-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const reloaded = await cdp.eval('Array.isArray(window.__logs)')
  const surface = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
  ok('应用外壳已挂载且样式表到位（扫描面非空）', rdy >= 0 && surface.sidebarItems > 0 && surface.sheets > 8,
    `sidebarItems=${surface.sidebarItems} styleSheets=${surface.sheets}`)
  ok('确实发生了真实重载（注入钩子生效，排除「同 URL 不重载」假阴性）', reloaded === true, `__logs=${JSON.stringify(reloaded)}`)

  // 关掉首启引导浮层（backdrop 吞指针 → 最常见假阴性第一嫌疑，skill 铁律 2）
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

  // 权威树自检：证明「数据面非空」且含使用文档 —— 后面「列表里没有」才有意义
  const tree = await cdp.eval(TREE_READ)
  ok('持久化树读得到（介质=IndexedDB，非空）', tree && tree.found === true && tree.files.length > 0,
    `files=${JSON.stringify(tree && tree.files)}`)
  ok(`权威树里确实有 ${TOTAL_FILES} 篇 .md（含 ${USAGE_PAGES.length} 篇使用文档）`,
    !!tree && tree.files.length === TOTAL_FILES && USAGE_PAGES.every((n) => tree.files.includes(n)),
    `count=${tree && tree.files.length} folders=${JSON.stringify(tree && tree.folders)}`)

  // ────────────────── §1 需求①：编辑器文件列表过滤 ──────────────────
  if (!ONLY || ONLY === '1') {
    console.log('\n=== 1. 需求① · 编辑器空态文件列表（EmptyFileBrowser）不得列出使用文档 ===')
    // 判据落在**值**上（坑 N）：等可见行数到位，而不是「容器存在」
    const r1 = await waitFor(cdp, `${EMPTY_ROW_NAMES}.length === ${VISIBLE_FILES}`, { tries: 40, ms: 400, label: '空态列表行数' })
    const names = await cdp.eval(EMPTY_ROW_NAMES)
    const badge = await cdp.eval(`((document.querySelector('.aurora-emptyfiles__count') || {}).textContent || '').trim()`)
    const groups = await cdp.eval(`[...document.querySelectorAll('.aurora-emptyfiles__group-title')].map((e) => (e.textContent || '').trim())`)
    info(`可见行(${names.length}) = ${JSON.stringify(names)}；分组 = ${JSON.stringify(groups)}；计数徽标 = "${badge}"`)
    ok('扫描面非空：确实列出了文件（否则「没有使用文档」恒真 = 假绿）', names.length > 0, `rows=${names.length}`)
    ok('可见行数 = 普通笔记数（使用文档被整体过滤）', names.length === VISIBLE_FILES && r1 >= 0,
      `rows=${names.length} want=${VISIBLE_FILES}`)
    ok('使用文档的篇章名一个都不在列表里', USAGE_PAGES.every((n) => !names.includes(n)),
      `usageHits=${JSON.stringify(names.filter((n) => USAGE_PAGES.includes(n)))}`)
    ok('非空对照：普通笔记**仍在**列表里（证明是过滤，不是"列表全灭"）',
      PLAIN_NOTES.every((n) => names.includes(n)), `plainHits=${JSON.stringify(names.filter((n) => PLAIN_NOTES.includes(n)))}`)
    ok('计数徽标与可见行同源（口径一致）', badge === String(VISIBLE_FILES), `badge="${badge}" want="${VISIBLE_FILES}"`)
    ok('「我的笔记」分组存在、使用文档文件夹不成组（分组标题也不泄漏）',
      groups.includes(NOTES_FOLDER) && !groups.includes(USAGE_FOLDER), `groups=${JSON.stringify(groups)}`)
  }

  // ────────────────── §2 对照组：普通笔记编辑功能完好 ──────────────────
  if (!ONLY || ONLY === '2') {
    console.log('\n=== 2. 【对照组】打开普通笔记 → 编辑 chrome 完好（证明 §3 是条件式裁剪）===')
    const m2 = cdp.mark()
    const clicked = await cdp.eval(clickEmptyRow(PLAIN_NOTES[0]))
    const at2 = await waitFor(cdp, `document.querySelectorAll('.aurora-toolbar').length > 0`, { tries: 30, ms: 400, label: '普通笔记标签栏' })
    const plain = await cdp.eval(EDITOR_CHROME)
    info('普通笔记 chrome = ' + JSON.stringify(plain))
    ok('普通笔记已打开（标签栏出现）', clicked && at2 >= 0, `clicked=${clicked} waitIdx=${at2}`)
    ok('普通笔记：**没有**简介页（对照组 → 简介页的缺席断言有区分能力）', plain.brief === 0, `brief=${plain.brief}`)
    ok('普通笔记：标签栏在（含每标签关闭 × 的容器）', plain.toolbar > 0 && plain.tabs > 0, `toolbar=${plain.toolbar} tabs=${plain.tabs}`)
    ok('普通笔记：编辑模式选择框三枚按钮都在', plain.modeToggle === 3 && plain.modeToggles > 0,
      `modeToggle=${plain.modeToggle} modeToggles=${plain.modeToggles}`)
    ok('普通笔记：左右缘 hoverzone 都在（文件列表 / 检查器入口）', plain.hoverzones === 2, `hoverzones=${plain.hoverzones}`)
    ok('普通笔记：状态栏仍是编辑内核口径（含「所见即所得」、无「简介」）',
      plain.statusRight.includes('所见即所得') && !plain.statusRight.includes('简介'),
      `statusRight=${JSON.stringify(plain.statusRight)}`)

    // 左栏文件树：hover 召唤后同样只剩普通笔记（需求① 在 FileTree 上也成立）
    // ⚠️ 合成鼠标在无前台窗口时可能不派发 → **条件式断言**（skill 坑 T）
    let hovered = false
    let treeNames = []
    for (let i = 1; i <= 3 && !hovered; i++) {
      const pt = await cdp.eval(`(() => {
        const el = document.querySelector('.aurora-editor__hoverzone--left')
        if (!el) return null
        const r = el.getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return null
        return { x: Math.round(r.left + Math.min(r.width / 2, 6)), y: Math.round(r.top + r.height / 2) }
      })()`)
      if (!pt) { info('左缘 hoverzone 几何为 0（不判失败，仅记录）'); break }
      await cdp.send('Page.bringToFront')
      await cdp.eval('window.focus()')
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' })
      await sleep(420) // hover-intent ~220ms + 展开
      const n = await cdp.eval(`${TREE_ROW_NAMES}.length`)
      const opened = await cdp.eval(`document.querySelectorAll('.aurora-filetree__item-name').length > 0`)
      info(`左栏 hover 第 ${i} 轮 @(${pt.x},${pt.y}) → 文件树行数=${n}`)
      if (opened) { hovered = true; treeNames = await cdp.eval(TREE_ROW_NAMES) }
    }
    if (hovered) {
      info('文件树行 = ' + JSON.stringify(treeNames))
      ok('文件树扫描面非空（否则「无使用文档」为假绿）', treeNames.length > 0, `rows=${treeNames.length}`)
      ok('文件树里没有任何使用文档篇章', USAGE_PAGES.every((n) => !treeNames.includes(n)),
        `usageHits=${JSON.stringify(treeNames.filter((n) => USAGE_PAGES.includes(n)))}`)
      // 两条**必须分开**（归因诚实性）：一条是「过滤没把树打光」的非空对照，
      // 另一条才是「使用文档文件夹行也不在」的零命中断言 —— 合并成一条会让 HEAD 对照上
      // 的红被误读成「对照组失败」，而真实原因是零命中断言成立不了。
      ok('非空对照：文件树里普通笔记仍在（证明过滤不是"树全灭"）',
        PLAIN_NOTES.every((n) => treeNames.includes(n)),
        `plainHits=${JSON.stringify(treeNames.filter((n) => PLAIN_NOTES.includes(n)))}`)
      ok('使用文档的**文件夹行**也不在文件树里（连文件夹入口都不给）',
        treeNames.includes(USAGE_FOLDER) === false, `folderRowInTree=${treeNames.includes(USAGE_FOLDER)}`)
    } else {
      info('⚠ 左缘 hover 未送达（无前台窗口时 Chromium 不派发合成输入）→ 该条不判失败；' +
        'FileTree 过滤已由 jsdom 用例 usageDocsFilter.test.tsx 覆盖')
    }
    const e2 = cdp.since(m2)
    ok('打开普通笔记无新增页面错误', e2.length === 0, e2.length ? JSON.stringify(e2.slice(0, 3)) : '0 条')
  }

  // ────────────────── §3 需求②：使用文档 → 只读简介页 ──────────────────
  if (!ONLY || ONLY === '3') {
    console.log('\n=== 3. 需求② · 经真实入口打开使用文档 → 只读简介页 ===')
    const m3 = cdp.mark()
    await cdp.eval(CLICK_KB_SIDEBAR)
    const kbAt = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '知识库卡片' })
    const cards = await cdp.eval(`[...document.querySelectorAll('.aurora-kb-kbcard__name')].map((e) => (e.textContent || '').trim())`)
    info('知识库管理页卡片 = ' + JSON.stringify(cards))
    ok('知识库管理页有卡片且卡片名 = 使用文档库（数据面非空）',
      kbAt >= 0 && cards.includes(USAGE_FOLDER), `cards=${JSON.stringify(cards)}`)

    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    const nameAt = await waitFor(
      cdp,
      `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '').trim(); return n === ${JSON.stringify(USAGE_FOLDER)} })()`,
      { tries: 40, ms: 400, label: '详情页库名' },
    )
    const kbName = await cdp.eval(`((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '').trim()`)
    ok('详情页库名已解析为该库（非占位「未选择知识库」）', nameAt >= 0, `subbar name="${kbName}"`)

    // 控制组：知识库视图下不该有简介页（证明 .aurora-brief 断言有区分能力）
    const beforeBrief = await cdp.eval(`document.querySelectorAll('.aurora-brief').length`)
    ok('控制组：知识库视图下不存在简介页（.aurora-brief 非恒真）', beforeBrief === 0, `brief=${beforeBrief}`)

    // 切到「笔记」Tab → 点第一行（唯一入口，起来区明确）
    await cdp.eval(`(() => {
      const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
        .find(x => (x.textContent || '').includes('笔记'))
      if (t) t.click(); return !!t
    })()`)
    await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes__head-count')`, { tries: 30, ms: 400, label: '笔记 Tab' })
    const rowCount = await cdp.eval(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length`)
    const rowInteractive = await cdp.eval(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item.is-interactive').length`)
    info(`笔记 Tab 行数 = ${rowCount}（可交互 ${rowInteractive}）`)
    ok('笔记 Tab 列出了使用文档（扫描面非空，点击才有对象）', rowCount > 0, `rows=${rowCount}`)

    // 主判定用 element.click()（纯 DOM API，不经窗口激活 —— 验 React 链路是它的正确用途）
    const clickedRow = await cdp.eval(`(() => {
      const e = document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')[0]
      if (!e) return false
      e.click(); return true
    })()`)
    const atEditor = await waitFor(cdp, `location.hash === '#view=editor'`, { tries: 30, ms: 400, label: '跳转编辑器' })
    await waitFor(cdp, `document.querySelectorAll('.aurora-brief').length > 0`, { tries: 20, ms: 300, label: '简介页挂载' })
    const brief = await cdp.eval(EDITOR_CHROME)
    info('使用文档 chrome = ' + JSON.stringify(brief))
    ok('点使用文档笔记 → 进入编辑器视图', clickedRow && atEditor >= 0, `clicked=${clickedRow} waitIdx=${atEditor} hash=${brief.hash}`)
    ok('呈现为简介页（.aurora-brief + data 标记 + 正文已渲染）',
      brief.brief > 0 && brief.briefMarked > 0 && brief.preview > 0,
      `brief=${brief.brief} marked=${brief.briefMarked} preview=${brief.preview}`)
    ok('需求② 顶部工具栏整体缺席（标签栏 / 模式选择框 / 标签关闭 ×）',
      brief.toolbar === 0 && brief.tabs === 0 && brief.modeToggles === 0 && brief.modeToggle === 0,
      `toolbar=${brief.toolbar} tabs=${brief.tabs} modeToggles=${brief.modeToggles} modeToggle=${brief.modeToggle}`)
    ok('需求② 左侧文件列表与右栏检查器入口整块缺席（两个 hoverzone 都不在）',
      brief.hoverzones === 0, `hoverzones=${brief.hoverzones}`)
    ok('保留阅读所需元素：返回来源芯片仍在（唯一回跳入口）',
      brief.returnChip > 0 && brief.returnText.includes('返回'), `chip="${brief.returnText}"`)
    ok('状态栏口径改为「简介」（且不再声称「所见即所得」）',
      brief.statusRight.includes('简介') && !brief.statusRight.includes('所见即所得'),
      `statusRight=${JSON.stringify(brief.statusRight)}`)
    ok('简介页未挂编辑内核：无格式化工具条（撤销/加粗/删除线所在）',
      brief.modeToggle === 0 && brief.preview > 0, `preview=${brief.preview}`)

    // 稳态：1.6s 后仍停在简介页（没被弹回知识库）
    await sleep(1600)
    const steady = await cdp.eval(EDITOR_CHROME)
    ok('1.6s 后仍稳定停在简介页（未被弹回知识库详情）',
      steady.hash === '#view=editor' && steady.brief > 0 && steady.toolbar === 0,
      `hash=${steady.hash} brief=${steady.brief} toolbar=${steady.toolbar}`)

    const e3 = cdp.since(m3)
    ok('使用文档简介页无新增页面错误', e3.length === 0, e3.length ? JSON.stringify(e3.slice(0, 3)) : '0 条')
  }

  // ────────── §5 🚨 紧急修复回归：用户笔记放进内置文件夹，不得被连坐降级 ──────────
  // 用户报障原话：「为什么现在编辑器界面的格式工具栏和左右两侧的列表消失了」+
  //   「只有 markcraft 这一个知识库中的笔记文件点击后才是只读简介页；用户自己创建的
  //    知识库中的笔记点击之后去到的编辑器界面也是可以编辑的」。
  // 旧口径把**整棵内置文件夹子树**都判为使用文档 → 用户放进该文件夹的自己的笔记
  // 既从文件列表消失、又被降级成只读简介页。本段用真机把两侧都钉死。
  if (!ONLY || ONLY === '5') {
    console.log('\n=== 5. 【紧急修复回归】用户笔记放进内置文件夹 → 仍可见、仍完整可编辑 ===')
    const m5 = cdp.mark()
    console.log('   · §5 种子树：' + USAGE_FOLDER + '/（' + USAGE_PAGES.length + ' 篇内置说明 + 1 篇**用户笔记**） + ' + NOTES_FOLDER + '/（' + PLAIN_NOTES.length + ' 篇）')
    await cdp.eval(SEED_SQL({ userNoteInUsageFolder: true }))
    await cdp.send('Page.navigate', { url: `${BASE}/?_p=udbrief-s5-${Date.now()}#view=editor` })
    await sleep(900)
    const rdy5 = await ready(cdp)
    const surface5 = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
    ok('§5 应用外壳已挂载且样式表到位（扫描面非空）', rdy5 >= 0 && surface5.sidebarItems > 0 && surface5.sheets > 8,
      `sidebarItems=${surface5.sidebarItems} styleSheets=${surface5.sheets}`)

    // 关掉首启引导浮层（backdrop 吞指针，skill 铁律 2）—— 逐次导航后都要复查
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-audience')
      if (!el) return false
      const btn = [...el.querySelectorAll('button')].find(b => /开始|跳过|继续/.test(b.textContent || ''))
      if (btn) btn.click(); else el.remove()
      return true
    })()`)
    await sleep(300)

    // 数据面自检：6 篇（含内置文件夹内那篇用户笔记）
    const tree5 = await cdp.eval(TREE_READ)
    ok(`§5 权威树里有 ${TOTAL_FILES_S5} 篇 .md（含内置文件夹内的用户笔记 "${USER_NOTE_IN_USAGE}"）`,
      !!tree5 && tree5.files.length === TOTAL_FILES_S5 && tree5.files.includes(USER_NOTE_IN_USAGE),
      `count=${tree5 && tree5.files.length} files=${JSON.stringify(tree5 && tree5.files)}`)

    // ① 空态文件列表：用户笔记必须在，且承载它的文件夹行也必须在
    const r5 = await waitFor(cdp, `${EMPTY_ROW_NAMES}.length === ${VISIBLE_FILES_S5}`, { tries: 40, ms: 400, label: '§5 空态列表行数' })
    const names5 = await cdp.eval(EMPTY_ROW_NAMES)
    const groups5 = await cdp.eval(`[...document.querySelectorAll('.aurora-emptyfiles__group-title')].map((e) => (e.textContent || '').trim())`)
    info(`§5 可见行(${names5.length}) = ${JSON.stringify(names5)}；分组 = ${JSON.stringify(groups5)}`)
    ok('§5 扫描面非空（否则"用户笔记在列表里"恒假 = 假绿）', names5.length > 0, `rows=${names5.length}`)
    ok('🚨 §5 用户笔记（在内置文件夹内）**仍出现在文件列表里**',
      names5.includes(USER_NOTE_IN_USAGE), `rows=${JSON.stringify(names5)}`)
    ok('🚨 §5 承载它的内置文件夹**作为普通分组出现**（用户点得到自己的文件）',
      groups5.includes(USAGE_FOLDER), `groups=${JSON.stringify(groups5)}`)
    ok('§5 双向对照：同一文件夹内的 3 篇内置说明书仍**不在**列表里',
      USAGE_PAGES.every((n) => !names5.includes(n)),
      `usageHits=${JSON.stringify(names5.filter((n) => USAGE_PAGES.includes(n)))}`)

    // ② 打开该用户笔记 → 必须是**完整编辑器**（不是简介页）
    const clicked5 = await cdp.eval(clickEmptyRow(USER_NOTE_IN_USAGE))
    const at5 = await waitFor(cdp, `document.querySelectorAll('.aurora-toolbar').length > 0`, { tries: 30, ms: 400, label: '§5 用户笔记标签栏' })
    const chrome5 = await cdp.eval(EDITOR_CHROME)
    info('§5 用户笔记 chrome = ' + JSON.stringify(chrome5))
    ok('§5 用户笔记已打开（标签栏出现）', clicked5 && at5 >= 0, `clicked=${clicked5} waitIdx=${at5}`)
    ok('🚨 §5 用户笔记：**没有**简介页（这就是用户报障的「工具栏/左右栏消失」）', chrome5.brief === 0 && chrome5.briefMarked === 0,
      `brief=${chrome5.brief} marked=${chrome5.briefMarked}`)
    ok('🚨 §5 用户笔记：格式工具栏所在标签栏在', chrome5.toolbar > 0 && chrome5.tabs > 0, `toolbar=${chrome5.toolbar} tabs=${chrome5.tabs}`)
    ok('🚨 §5 用户笔记：编辑模式选择框三枚按钮都在', chrome5.modeToggle === 3 && chrome5.modeToggles > 0,
      `modeToggle=${chrome5.modeToggle} modeToggles=${chrome5.modeToggles}`)
    ok('🚨 §5 用户笔记：左右两侧列表（hoverzone 入口）都在', chrome5.hoverzones === 2, `hoverzones=${chrome5.hoverzones}`)
    ok('§5 用户笔记：状态栏仍是编辑内核口径（含「所见即所得」、无「简介」）',
      chrome5.statusRight.includes('所见即所得') && !chrome5.statusRight.includes('简介'),
      `statusRight=${JSON.stringify(chrome5.statusRight)}`)

    // ③ 防「修过头」：同一文件夹内的**内置那一篇**仍必须是简介页
    await cdp.eval(CLICK_KB_SIDEBAR)
    await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 40, ms: 400, label: '§5 知识库卡片' })
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    await waitFor(cdp, `document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]').length > 0`,
      { tries: 40, ms: 400, label: '§5 详情页 tab' })
    await cdp.eval(`(() => {
      const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
        .find(x => (x.textContent || '').includes('笔记'))
      if (t) t.click(); return !!t
    })()`)
    await waitFor(cdp, `document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`, { tries: 30, ms: 400, label: '§5 笔记 Tab' })
    // 按**名字**点内置那一篇（不能取 [0]：这一 Tab 里现在既有内置说明也有用户笔记）
    const clickedBuiltin = await cdp.eval(`(() => {
      const want = ${JSON.stringify(USAGE_PAGES[0])}
      const rows = [...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')]
      const r = rows.find(x => (x.textContent || '').includes(want))
      if (!r) return false
      r.click(); return true
    })()`)
    await waitFor(cdp, `document.querySelectorAll('.aurora-brief').length > 0`, { tries: 25, ms: 400, label: '§5 内置篇简介页' })
    const chrome5b = await cdp.eval(EDITOR_CHROME)
    info('§5 内置篇 chrome = ' + JSON.stringify(chrome5b))
    ok('§5 防修过头：同一文件夹内的**内置说明书**点开仍是简介页（工具栏/左右栏缺席）',
      clickedBuiltin && chrome5b.brief > 0 && chrome5b.toolbar === 0 && chrome5b.modeToggle === 0 && chrome5b.hoverzones === 0,
      `clicked=${clickedBuiltin} brief=${chrome5b.brief} toolbar=${chrome5b.toolbar} modeToggle=${chrome5b.modeToggle} hoverzones=${chrome5b.hoverzones}`)

    const e5 = cdp.since(m5)
    ok('§5 全程无新增页面错误', e5.length === 0, e5.length ? JSON.stringify(e5.slice(0, 3)) : '0 条')
  }

  // ────────── §6 🚨 第二轮需求：使用文档「只能从知识库点进去看」→ 退出即无痕 ──────────
  // 用户原话：「从 markcraft 使用文档知识库中的笔记点击进入后，退出来到编辑器界面不要再次
  //   显示这个笔记，也即是不要保存这个使用文档笔记文件。使用文档的笔记，只能从这个知识库中
  //   点击进入。」
  // 本段把「无痕」拆成三处可观测面（缺一处就退化成「部分无痕」）：
  //   ① 不进「最近文件」（localStorage）—— 欢迎页「继续《…》」与「插入双链」候选的唯一来源；
  //   ② 不进标签栏（退出后编辑器里看不到它）；
  //   ③ 不落盘（IndexedDB 的 tabs/activeTabId）——「看着说明书刷新」不得被记成上次打开的文档。
  // 全部配普通笔记对照组（证明是「条件式」而不是「把这套机制弄坏了」）。
  if (!ONLY || ONLY === '6') {
    console.log('\n=== 6. 【第二轮需求】使用文档「只能从知识库进」→ 退出即无痕 ===')
    const m6 = cdp.mark()
    // 独立起手：重置种子 + 强制重载（不依赖前面各段留下的页面状态）
    await cdp.eval(SEED_SQL())
    await cdp.send('Page.navigate', { url: `${BASE}/?_p=udbrief-s6-${Date.now()}#view=editor` })
    await sleep(900)
    const rdy6 = await ready(cdp)
    const surface6 = await cdp.eval(`({ sidebarItems: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length })`)
    ok('§6 应用外壳已挂载且样式表到位（扫描面非空）',
      rdy6 >= 0 && surface6.sidebarItems > 0 && surface6.sheets > 8,
      `sidebarItems=${surface6.sidebarItems} styleSheets=${surface6.sheets}`)
    await cdp.eval(`(() => {
      const el = document.querySelector('.aurora-audience')
      if (!el) return false
      const b = [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent || ''))
      if (b) b.click(); else el.remove()
      return true
    })()`)
    await sleep(300)

    const tree6 = await cdp.eval(TREE_READ)
    ok('§6 数据面非空：权威树里确实有使用文档首篇（否则「不在列表/不含它」恒真 = 假绿）',
      !!tree6 && tree6.files.includes(USAGE_PAGES[0]), `files=${JSON.stringify(tree6 && tree6.files)}`)

    // ── 6a 对照组：普通笔记照常进最近 + 照常落盘 ──
    const clickedP = await cdp.eval(clickEmptyRow(PLAIN_NOTES[0]))
    const atP = await waitFor(cdp, `document.querySelectorAll('.aurora-toolbar').length > 0`, { tries: 30, ms: 400, label: '§6 普通笔记标签栏' })
    ok('§6a 普通笔记已打开（标签栏出现）', clickedP && atP >= 0, `clicked=${clickedP} waitIdx=${atP}`)
    await sleep(800) // 等 saveState 的 300ms 防抖真正落盘
    const recentA = await cdp.eval(RECENT_READ)
    const persistA = await cdp.eval(PERSIST_READ)
    info('§6a 最近文件 = ' + JSON.stringify(recentA) + '；落盘 tabs = ' + JSON.stringify(persistA.tabNames))
    ok('§6a 对照：普通笔记**进了**「最近文件」', recentA.includes(PLAIN_NOTES[0]), `recent=${JSON.stringify(recentA)}`)
    ok('§6a 对照：普通笔记**落盘**为标签，且全部不是瞬态',
      persistA.found === true && persistA.tabNames.includes(PLAIN_NOTES[0]) && persistA.tabTransient.every((v) => v === false),
      `tabs=${JSON.stringify(persistA.tabNames)} transient=${JSON.stringify(persistA.tabTransient)}`)

    // ── 6b 经知识库打开使用文档 → 简介页；且**不进最近** ──
    const recentBefore = await cdp.eval(RECENT_READ)
    const enter1 = await openBriefViaKb(cdp, '§6b')
    await sleep(500)
    const chromeB = await cdp.eval(EDITOR_CHROME)
    ok('§6b 经知识库点使用文档 → 进入编辑器并呈现简介页',
      enter1.clicked && enter1.briefAt >= 0 && chromeB.hash === '#view=editor' && chromeB.brief > 0,
      `clicked=${enter1.clicked} hash=${chromeB.hash} brief=${chromeB.brief}`)
    const recentB = await cdp.eval(RECENT_READ)
    info('§6b 最近文件 = ' + JSON.stringify(recentB))
    ok('🚨 6b 使用文档**不进「最近文件」**（与打开前逐字节相同）',
      !recentB.includes(USAGE_PAGES[0]) && JSON.stringify(recentB) === JSON.stringify(recentBefore),
      `before=${JSON.stringify(recentBefore)} after=${JSON.stringify(recentB)}`)

    // ── 6c 退出路径一：视图内点侧栏「编辑器」（视图 id 不变 → 只能靠 EditorPanel 显式回收）──
    const clickedEditor = await cdp.eval(CLICK_EDITOR_SIDEBAR)
    await sleep(700)
    const chromeC = await cdp.eval(EDITOR_CHROME)
    const tabsC = await cdp.eval(`[...document.querySelectorAll('.aurora-tab')].map((e) => e.getAttribute('title'))`)
    info('§6c 点侧栏「编辑器」→ ' + JSON.stringify({ clicked: clickedEditor, brief: chromeC.brief, tabs: tabsC }))
    ok('🚨 6c 退出后编辑器**不再显示**这篇使用文档（无简介页）', chromeC.brief === 0 && chromeC.briefMarked === 0,
      `brief=${chromeC.brief} marked=${chromeC.briefMarked}`)
    ok('🚨 6c 标签栏里也**没有**它（此前它会变成一枚带 × 的「已打开文档」）',
      !tabsC.some((t) => String(t || '').includes(USAGE_PAGES[0].replace(/\.md$/, ''))),
      `tabs=${JSON.stringify(tabsC)}`)
    ok('§6c 非空对照：普通笔记的标签仍在（证明不是「标签栏整块没了」）',
      tabsC.some((t) => String(t || '').includes(PLAIN_NOTES[0].replace(/\.md$/, ''))),
      `tabs=${JSON.stringify(tabsC)}`)

    // ── 6d 退出路径二：简介页「← 返回」芯片 → 回知识库 → 再进编辑器 → 落盘仍无痕 ──
    const enter2 = await openBriefViaKb(cdp, '§6d')
    const chipAt = await waitFor(cdp, `document.querySelectorAll('.aurora-editor__return').length > 0`, { tries: 20, ms: 300, label: '§6d 返回芯片' })
    const clickedChip = await cdp.eval(`(() => { const b = document.querySelector('.aurora-editor__return'); if (!b) return false; b.click(); return true })()`)
    const backAt = await waitFor(cdp, `location.hash.startsWith('#view=kb')`, { tries: 30, ms: 400, label: '§6d 回知识库' })
    ok('§6d 从简介页点「← 返回」芯片 → 回到知识库视图',
      enter2.clicked && chipAt >= 0 && clickedChip && backAt >= 0, `clicked=${clickedChip} waitIdx=${backAt}`)
    await cdp.eval(CLICK_EDITOR_SIDEBAR)
    await waitFor(cdp, `location.hash === '#view=editor'`, { tries: 30, ms: 400, label: '§6d 再进编辑器' })
    await sleep(800) // 等落盘防抖
    const chromeD = await cdp.eval(EDITOR_CHROME)
    const persist6 = await cdp.eval(PERSIST_READ)
    info('§6d chrome = ' + JSON.stringify({ brief: chromeD.brief }) + '；落盘 = ' + JSON.stringify(persist6.tabNames))
    ok('🚨 6d 回来时编辑器不显示它（无简介页）', chromeD.brief === 0, `brief=${chromeD.brief}`)
    ok('🚨 6d 落盘（IndexedDB）也不留它的标签 ——「看着说明书刷新」不会被记成上次打开的文档',
      persist6.found === true &&
      !persist6.tabNames.includes(USAGE_PAGES[0]) &&
      !persist6.tabFileIds.includes(USAGE_DOC_FIRST_ID) &&
      persist6.activeTabFileId !== USAGE_DOC_FIRST_ID &&
      persist6.tabTransient.every((v) => v === false),
      `tabs=${JSON.stringify(persist6.tabNames)} activeTabFileId=${persist6.activeTabFileId} transient=${JSON.stringify(persist6.tabTransient)}`)
    ok('§6d 非空对照：普通笔记的标签仍在落盘里',
      persist6.tabNames.includes(PLAIN_NOTES[0]), `tabs=${JSON.stringify(persist6.tabNames)}`)

    const e6 = cdp.since(m6)
    ok('§6 全程无新增页面错误', e6.length === 0, e6.length ? JSON.stringify(e6.slice(0, 3)) : '0 条')
  }

  console.log('\n=== 4. 页面错误汇总（逐视图归属）===')
  const errs = cdp.pageErrors.filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e))
  ok('全程无未归类的页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 5)) : '0 条')

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
