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
 *   §4 页面错误逐视图归属。
 *
 * 起手区（skill 铁律 0）：使用文档**已不在编辑器文件列表里**（这正是需求①的效果），
 *   所以「打开使用文档」必须走**它在真机上唯一还存在的入口** —— 知识库详情页的笔记列表。
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1）：
 *   node .workbuddy/artifacts/cdp-verify-usagedoc-brief.mjs
 * 作用域开关：ONLY=1 / ONLY=2 / ONLY=3
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
/** 权威树里应有的**全部** .md 文件数（3 篇使用文档 + 2 篇普通笔记） */
const TOTAL_FILES = USAGE_PAGES.length + PLAIN_NOTES.length
/** 编辑器文件列表**应当**看得见的文件数 = 过滤后 */
const VISIBLE_FILES = PLAIN_NOTES.length

const KB_ID = 'kb-usagedoc-brief-0001'
const KB_FOLDER = 'usage-folder-seed'

function SEED_SQL() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const doc = (name, body) => f('ud-' + name.slice(0, 2), name, body)
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        {
          id: KB_FOLDER, name: USAGE_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: [
            doc(USAGE_PAGES[0], '# 开始使用\n\n欢迎使用 MarkCraft。\n\n- 条目一\n- 条目二\n'),
            doc(USAGE_PAGES[1], '# 界面布局\n\n侧栏、顶栏、状态栏。\n'),
            doc(USAGE_PAGES[2], '# 编辑器模式\n\n源码模式 / 所见即所得 / 双栏布局。\n'),
          ],
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
    folderId: KB_FOLDER, fileCount: USAGE_PAGES.length, canvasCount: 0, createdAt: T, updatedAt: T,
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

const clickEmptyRow = (name) => `(() => {
  const rows = [...document.querySelectorAll('.aurora-emptyfiles__row')]
  const r = rows.find(x => ((x.querySelector('.aurora-emptyfiles__row-name') || {}).textContent || '').trim() === ${JSON.stringify(name)})
  if (!r) return false
  r.click(); return true
})()`

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
