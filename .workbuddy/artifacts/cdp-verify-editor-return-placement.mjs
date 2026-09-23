/**
 * CDP 真机探针 · 编辑器「返回来源」按钮的**落点**（2026-09-23 用户报障）
 * ==========================================================================
 * 用户原话：「从其他功能等地方点击笔记进入到编辑界面，顶部会有一个返回按钮，
 *   现在这个位置非常的不合理，现在要求将这个返回按钮放置到文件打开标签左侧。」
 *
 * 为什么必须上真机：jsdom **不做布局**，`getBoundingClientRect` 恒为 0 ⇒
 *   「在标签左侧」「不再独占一整行」这两个判据在单测里只能退化为 DOM 顺序断言
 *   （见 EditorReturnPlacement.test.tsx）。**像素级落点只有真机能量**。
 *
 * 判据（逐条对应「位置不合理」与「挪到标签左侧」）：
 *   ① 按钮在标签行容器 `.aurora-toolbar__tabs` 内（不是工具栏之外的游离元素）；
 *   ② 按钮**左边**落在第一个标签左边之左（`btn.right <= firstTab.left + 1`）；
 *   ③ 按钮与标签**同一行**（中心 y 相差 ≤ 4px，且都在工具栏 36px 的纵向带内）；
 *   ④ 按钮与内容区之间**没有独立的一整行**：`.aurora-editor__layout` 的 top
 *      紧贴工具栏 bottom（间距 ≤ 1px），且 `.aurora-editor__returnbar` 不存在；
 *   ⑤ 点它仍能回到来源（图谱），且来源上下文一次性清空。
 *
 * ⚠️ 锚点只用**修复前后都存在**的元素（`.aurora-editor__return` / `.aurora-tabs` /
 *    `.aurora-toolbar__tabs` / `.aurora-editor__layout`），不依赖本次新增的修饰类 ——
 *   否则「旧版扫描面 = 0」会让红的理由变成「选择器在旧版不存在」（归因不诚实）。
 *
 * 用法（**必须与 Edge 同一次前台 bash**；CDP_PORT 须与启动端口一致）：
 *   CDP_PORT=9472 node .workbuddy/artifacts/cdp-verify-editor-return-placement.mjs
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(process.env.MC_PORT || new URL(BASE).port || 5174)
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/editor-return-placement.png'

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

function ready(cdp, tries = 200) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

/**
 * 关掉首启引导浮层（`.aurora-audience`）。
 * ⚠️ skill 铁律 2-①：全新 profile 首次启动会弹全屏引导，其 backdrop **截获所有指针事件**
 *    ⇒ 后续合成点击全部落在浮层上 = 假阴性。这是排查时最该先排除的一项。
 */
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
async function centerOf(cdp, selector, textMatch = null) {
  return await cdp.eval(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const el = ${textMatch ? `els.find((e) => (e.textContent || '').includes(${JSON.stringify(textMatch)}))` : 'els[0]'}
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width, h: r.height }
  })()`)
}
async function domClick(cdp, selector, textMatch = null) {
  return await cdp.eval(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const el = ${textMatch ? `els.find((e) => (e.textContent || '').includes(${JSON.stringify(textMatch)}))` : 'els[0]'}
    if (!el) return false
    el.click(); return true
  })()`)
}
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
const KB_ID = 'kb-ret-1'
const KB_NAME = '甲知识库'
const NOTES = ['甲笔记.md', '乙笔记.md']
const BODIES = ['# 甲笔记\n\n[[乙笔记]] 的正文。\n', '# 乙笔记\n\n[[甲笔记]] 的正文。\n']

let KEY_FILE_TREE = 'markcraft-file-manager'
let KEY_VERSION = 'markcraft-file-manager-version'
let STORAGE_VERSION = 'v5'

async function loadStorageConsts() {
  const txt = await (await fetch(`${BASE}/src/core/files/fileTree.ts`)).text()
  const k = txt.match(/const STORAGE_KEY = '([^']+)'/)
  const v = txt.match(/const STORAGE_VERSION = '([^']+)'/)
  if (k) KEY_FILE_TREE = k[1]
  if (v) { STORAGE_VERSION = v[1]; KEY_VERSION = `${k ? k[1] : KEY_FILE_TREE}-version` }
  return { key: KEY_FILE_TREE, version: STORAGE_VERSION }
}

function SEED_EXPR() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [{
        id: NOTES_FOLDER_ID, name: NOTES_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
        children: NOTES.map((n, i) => f('pn-' + i, n, BODIES[i])),
      }],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  const kb = {
    id: KB_ID, name: KB_NAME, description: '探针自种：用于走「知识库 → 查看完整图谱 → 点笔记 → 编辑器」真实路径',
    folderId: NOTES_FOLDER_ID, createdAt: T, updatedAt: T, canvasIds: [], fileIds: [], rules: [],
  }
  const kbListItem = {
    id: KB_ID, name: KB_NAME, description: kb.description, folderId: NOTES_FOLDER_ID,
    fileCount: NOTES.length, canvasCount: 0, createdAt: T, updatedAt: T,
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
    // 🚨 坑 AJ：IDB 之外必须同时写 localStorage 版本键，否则 loadStateAsync 的版本闸门直接 return
    localStorage.setItem(${JSON.stringify(KEY_VERSION)}, ${JSON.stringify(STORAGE_VERSION)})
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    try { localStorage.removeItem('markcraft-usage-docs-seeded') } catch {}
    return true
  })()`
}

// ────────────────────────── 几何读取 ──────────────────────────
/**
 * 一次性取回所有需要的矩形 + 容器归属。
 * ⚠️ 用 getBoundingClientRect 的**真实像素**；`elementFromPoint` 在这里不适用
 *    （按钮上的子元素 pointer-events 正常，但用矩形比较才是「左侧/同一行」的判据）。
 */
const GEOM = `(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { left: +b.left.toFixed(1), right: +b.right.toFixed(1), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }
  }
  const btn = document.querySelector('.aurora-editor__return')
  const tabsZone = document.querySelector('.aurora-toolbar__tabs')
  return {
    btn: r('.aurora-editor__return'),
    firstTab: r('.aurora-tab'),
    toolbar: r('.aurora-toolbar'),
    tabsZone: r('.aurora-toolbar__tabs'),
    layout: r('.aurora-editor__layout'),
    btnText: btn ? (btn.textContent || '').trim() : null,
    btnInTabsZone: !!(btn && tabsZone && tabsZone.contains(btn)),
    btnInToolbar: !!(btn && document.querySelector('.aurora-toolbar')?.contains(btn)),
    returnbarCount: document.querySelectorAll('.aurora-editor__returnbar').length,
    tabCount: document.querySelectorAll('.aurora-tab').length,
  }
})()`

const VIEW_HASH = `(location.hash || '') + ' | ' + (document.querySelector('.aurora-graph') ? 'graph' : document.querySelector('.aurora-editor') ? 'editor' : 'other')`

async function shot(cdp, path, clip) {
  try {
    const r = await cdp.send('Page.captureScreenshot', clip ? { format: 'png', clip: { ...clip, scale: 2 } } : { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
    return true
  } catch (e) {
    info(`截图失败：${e?.message || e}`)
    return false
  }
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
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪', r0 >= 0, `waitIdx=${r0}`)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  ok('§0 种子写入成功', (await cdp.eval(SEED_EXPR())) === true)

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=retplacement-${Date.now()}#view=editor` })
  await sleep(800)
  ok('§0 确实发生了真实重载（__probeBoot 钩子存在）', (await cdp.eval('window.__probeBoot || 0')) >= 1)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  const seededAt = await waitFor(cdp, `localStorage.getItem('markcraft-usage-docs-seeded') === '1'`, { tries: 60, ms: 500, label: '内置使用文档播种' })
  ok('§0 内置《使用文档》播种完成（树已稳定，避免扫描面漂移）', seededAt >= 0, `waitIdx=${seededAt}`)
  await sleep(600)

  // ────────── §1 真实路径进编辑器：知识库 → 查看完整图谱 → 点笔记 ──────────
  console.log('\n=== 1. 走真实入口进编辑器（知识库 → 查看完整图谱 → 点笔记）===')
  const g1 = await waitFor(cdp, `[...document.querySelectorAll('.aurora-sidebar-item')].some((e) => (e.textContent || '').includes('知识库'))`, { tries: 30, ms: 300 })
  ok('§1 侧栏可见', g1 >= 0)
  await clickEl(cdp, '.aurora-sidebar-item', '知识库', '点侧栏「知识库」')
  const cardAt = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 60, ms: 400, label: '知识库列表' })
  ok('§1 知识库列表出现（自种库可见）', cardAt >= 0, `waitIdx=${cardAt}`)
  await clickEl(cdp, '.aurora-kb-kbcard', KB_NAME, `点开「${KB_NAME}」`)
  const linkAt = await waitFor(
    cdp,
    `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`,
    { tries: 60, ms: 400, label: '查看完整图谱入口' },
  )
  ok('§1 进入知识库详情并出现「查看完整图谱」', linkAt >= 0, `waitIdx=${linkAt}`)
  await clickEl(cdp, '.aurora-kb-card__link', '查看完整图谱', '点「查看完整图谱」')
  const gAt = await waitFor(cdp, `document.querySelectorAll('.aurora-graph__node[data-node-type="file"]').length > 0`, { tries: 60, ms: 400, label: '范围图谱节点' })
  ok('§1 图谱渲染出文件节点', gAt >= 0, `waitIdx=${gAt}`)

  const nodeC = await centerOf(cdp, '.aurora-graph__node[data-node-type="file"]')
  ok('§1 图谱节点可定位（扫描面非空）', !!nodeC, nodeC ? `(${nodeC.x},${nodeC.y})` : 'null')
  if (nodeC) {
    // 先点一次画布空白激活窗口（skill 陷阱：窗口激活会吞掉最早的一次鼠标事件）
    await realClick(cdp, nodeC.x + 240, nodeC.y + 170)
    await sleep(150)
    await realClick(cdp, nodeC.x, nodeC.y)
  }
  const edAt = await waitFor(cdp, `document.querySelector('.aurora-editor__return') !== null`, { tries: 50, ms: 400, label: '编辑器返回按钮' })
  ok('§1 🚨 经真实鼠标点击进入编辑器，返回按钮已渲染（前置：无按钮则后续几何无从谈起）', edAt >= 0, `waitIdx=${edAt}`)
  await waitFor(cdp, `document.querySelector('.aurora-tab') !== null`, { tries: 30, ms: 300, label: '标签栏' })
  await sleep(500)

  // ────────── §2 落点几何（核心） ──────────
  console.log('\n=== 2. 🚨 核心：像素级落点 —— 标签左侧、同一行、不再独占整行 ===')
  const g = await cdp.eval(GEOM)
  info(`§2 按钮   ${JSON.stringify(g.btn)}`)
  info(`§2 首标签 ${JSON.stringify(g.firstTab)}`)
  info(`§2 工具栏 ${JSON.stringify(g.toolbar)}（右侧 ${JSON.stringify(g.tabsZone)} 为标签区）`)
  info(`§2 内容区 ${JSON.stringify(g.layout)}；按钮文案=${JSON.stringify(g.btnText)}；标签数=${g.tabCount}；returnbar 数=${g.returnbarCount}`)

  ok('§2 扫描面非空：按钮 / 首个标签 / 工具栏 / 标签区 / 内容区 矩形全部取到',
    !!(g.btn && g.firstTab && g.toolbar && g.tabsZone && g.layout) && g.tabCount > 0,
    `tabCount=${g.tabCount}`)
  ok('§2 ① 按钮在标签行容器内部（不是工具栏之外的游离元素）',
    g.btnInTabsZone && g.btnInToolbar, `inTabsZone=${g.btnInTabsZone} inToolbar=${g.btnInToolbar}`)
  ok('§2 ② 按钮在**第一个文件标签左侧**（按钮右沿 ≤ 标签左沿）',
    g.btn && g.firstTab && g.btn.right <= g.firstTab.left + 1,
    `btn.right=${g.btn?.right} ≤ tab.left=${g.firstTab?.left}`)
  const btnCY = g.btn ? g.btn.top + g.btn.h / 2 : NaN
  const tabCY = g.firstTab ? g.firstTab.top + g.firstTab.h / 2 : NaN
  ok('§2 ③ 按钮与标签**同一行**（中心 y 相差 ≤ 4px）',
    Number.isFinite(btnCY) && Math.abs(btnCY - tabCY) <= 4, `Δcy=${Math.abs(btnCY - tabCY).toFixed(1)}px`)
  ok('§2 ③b 按钮纵向完全落在工具栏这一行内（不再是它自己的行）',
    g.btn && g.toolbar && g.btn.top >= g.toolbar.top - 1 && g.btn.bottom <= g.toolbar.bottom + 1,
    `btn=[${g.btn?.top},${g.btn?.bottom}] toolbar=[${g.toolbar?.top},${g.toolbar?.bottom}]`)
  ok('§2 ④ 工具栏与内容区之间**没有**独立整行（间距 ≤ 1px）',
    g.toolbar && g.layout && g.layout.top - g.toolbar.bottom <= 1,
    `gap=${(g.layout.top - g.toolbar.bottom).toFixed(1)}px`)
  ok('§2 ④b 原先那个独立整行容器 `.aurora-editor__returnbar` 不存在',
    g.returnbarCount === 0, `count=${g.returnbarCount}`)
  ok('§2 按钮文案带来源名（回跳目标可读）',
    (g.btnText || '').includes('返回') && (g.btnText || '').includes(KB_NAME), `text="${g.btnText}"`)

  // ────────── §3 截图取证 ──────────
  console.log('\n=== 3. 截图取证 ===')
  const clip = g.toolbar
    ? { x: Math.max(0, g.toolbar.left), y: Math.max(0, g.toolbar.top), width: Math.round((g.tabsZone?.right ?? g.toolbar.right) - g.toolbar.left) + 8, height: Math.round(g.toolbar.h) }
    : null
  const shotOk = await shot(cdp, SHOT, clip)
  ok('§3 工具栏区域截图已落盘（像素级人眼复核）', shotOk, SHOT)

  // ────────── §4 语义：点它回到来源 ──────────
  console.log('\n=== 4. 点返回按钮 → 回到来源（图谱），且来源一次性清空 ===')
  const beforeClick = await cdp.eval(VIEW_HASH)
  const btnC = await centerOf(cdp, '.aurora-editor__return')
  if (btnC) await realClick(cdp, btnC.x, btnC.y)
  const backAt = await waitFor(cdp, `document.querySelector('.aurora-graph__node') !== null && document.querySelector('.aurora-editor__return') === null`, { tries: 50, ms: 400, label: '回到图谱' })
  const afterView = await cdp.eval(VIEW_HASH)
  info(`§4 点击前视图 = ${beforeClick}`)
  info(`§4 点击后视图 = ${afterView}`)
  ok('§4 🚨 点返回后回到图谱，且返回按钮随之消失（来源一次性）', backAt >= 0, `waitIdx=${backAt}`)

  // ────────── §5 页面错误 ──────────
  console.log('\n=== 5. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§5 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

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
