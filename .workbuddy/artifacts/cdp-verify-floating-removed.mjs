/**
 * CDP 真机探针 · 编辑器「选中文本弹出的浮动格式工具栏」是否已删除（2026-09-23）
 * ==========================================================================
 * 用户原话：「将编辑器，选择内容就显示的浮动功能菜单栏删除。」
 * 该浮动栏 = FloatingFormatToolbar（role=toolbar + aria-label='浮动格式工具栏' /
 *   'Floating format toolbar'），由 EditorLayout 的选区监听 + createPortal 驱动，
 *   仅在「真实鼠标选中文本」时弹出。jsdom **不做布局 / 不触发真实 selection**，
 *   所以「删除后不再弹出」只能上真机验证。
 *
 * 判据：
 *   §1 进入编辑器（走真实入口：知识库 → 查看完整图谱 → 点笔记 → 编辑器）
 *   §2 在编辑区用真实鼠标**拖拽选中一段文字**
 *   §2a 选区确实包含文字（window.getSelection().toString().length > 0）
 *       —— 这是「扫描面非空」的保证：若没选中所导致的"没弹出"属假阴性，必须排除
 *   §2b 浮动栏 DOM 不存在：`[aria-label="浮动格式工具栏"],[aria-label="Floating format toolbar"]`
 *       当前代码期望 count === 0；HEAD 阳性对照期望 count > 0
 *
 * 用法（与 Edge 同一次前台 bash；CDP_PORT 须与 Edge 启动端口一致）：
 *   MC_BASE=http://127.0.0.1:5180 CDP_PORT=9475 EXPECT_FLOATING=0 \
 *     node .workbuddy/artifacts/cdp-verify-floating-removed.mjs
 *   HEAD 对照：MC_BASE=http://127.0.0.1:5181 CDP_PORT=9476 EXPECT_FLOATING=1 node ...
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9475)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5180'
const MC_PORT = Number(new URL(BASE).port || 5180)
const EXPECT_FLOATING = process.env.EXPECT_FLOATING === '1'
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/floating-removed.png'

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
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()`)
}
async function clickEl(cdp, selector, textMatch = null, label = '') {
  const c = await centerOf(cdp, selector, textMatch)
  if (!c) return false
  await realClick(cdp, c.x, c.y)
  return true
}

const NOTES_FOLDER_ID = 'f-notes'
const KB_ID = 'kb-float-1'
const KB_NAME = '甲知识库'
const NOTES = ['甲笔记.md', '乙笔记.md']
const BODIES = ['# 甲笔记\n\n这是一段用于选中测试的示例正文内容，用来验证浮动栏的删除。\n', '# 乙笔记\n\n[[甲笔记]] 的正文。\n']
let KEY_FILE_TREE = 'markcraft-file-manager'
let STORAGE_VERSION = 'v5'
let KEY_VERSION = 'markcraft-file-manager-version'
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
        id: NOTES_FOLDER_ID, name: '我的笔记', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
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
    localStorage.setItem(${JSON.stringify(KEY_VERSION)}, ${JSON.stringify(STORAGE_VERSION)})
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    try { localStorage.removeItem('markcraft-usage-docs-seeded') } catch {}
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
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  const m0 = cdp.mark()

  console.log(`\n=== 0. 自检（目标 ${BASE}，CDP ${CDP_PORT}，期望浮动栏出现=${EXPECT_FLOATING}）===`)
  const consts = await loadStorageConsts()
  ok('§0 已从 dev server 现取存储常量', !!consts.key && !!consts.version, `key=${consts.key} version=${consts.version}`)
  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪', r0 >= 0, `waitIdx=${r0}`)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  ok('§0 种子写入成功', (await cdp.eval(SEED_EXPR())) === true)
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=floatrm-${Date.now()}#view=editor` })
  await sleep(800)
  ok('§0 重载后外壳再次就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  const seededAt = await waitFor(cdp, `localStorage.getItem('markcraft-usage-docs-seeded') === '1'`, { tries: 60, ms: 500, label: '内置使用文档播种' })
  ok('§0 内置《使用文档》播种完成', seededAt >= 0, `waitIdx=${seededAt}`)
  await sleep(600)

  console.log('\n=== 1. 走真实入口进编辑器（知识库 → 查看完整图谱 → 点笔记）===')
  const g1 = await waitFor(cdp, `[...document.querySelectorAll('.aurora-sidebar-item')].some((e) => (e.textContent || '').includes('知识库'))`, { tries: 30, ms: 300 })
  ok('§1 侧栏可见', g1 >= 0)
  await clickEl(cdp, '.aurora-sidebar-item', '知识库', '点侧栏「知识库」')
  const cardAt = await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 60, ms: 400, label: '知识库列表' })
  ok('§1 知识库列表出现', cardAt >= 0, `waitIdx=${cardAt}`)
  await clickEl(cdp, '.aurora-kb-kbcard', KB_NAME, `点开「${KB_NAME}」`)
  const linkAt = await waitFor(cdp, `[...document.querySelectorAll('.aurora-kb-card__link')].some((b) => (b.textContent || '').includes('查看完整图谱'))`, { tries: 60, ms: 400, label: '查看完整图谱入口' })
  ok('§1 出现「查看完整图谱」', linkAt >= 0, `waitIdx=${linkAt}`)
  await clickEl(cdp, '.aurora-kb-card__link', '查看完整图谱', '点「查看完整图谱」')
  const gAt = await waitFor(cdp, `document.querySelectorAll('.aurora-graph__node[data-node-type="file"]').length > 0`, { tries: 60, ms: 400, label: '范围图谱节点' })
  ok('§1 图谱渲染出文件节点', gAt >= 0, `waitIdx=${gAt}`)
  const nodeC = await centerOf(cdp, '.aurora-graph__node[data-node-type="file"]')
  ok('§1 图谱节点可定位', !!nodeC, nodeC ? `(${nodeC.x},${nodeC.y})` : 'null')
  if (nodeC) {
    await realClick(cdp, nodeC.x + 240, nodeC.y + 170)
    await sleep(150)
    await realClick(cdp, nodeC.x, nodeC.y)
  }
  const edAt = await waitFor(cdp, `document.querySelector('.aurora-editor__return') !== null`, { tries: 50, ms: 400, label: '编辑器返回按钮' })
  ok('§1 进入编辑器（返回按钮已渲染）', edAt >= 0, `waitIdx=${edAt}`)
  await sleep(500)

  console.log('\n=== 2. 🚨 核心：真实三击选中段落 → 浮动栏是否出现 ===')
  const box = await cdp.eval(`(() => {
    const ed = document.querySelector('.tiptap-editor-content, .cm-content')
    if (!ed) return null
    const line = ed.querySelector('.cm-line')
      || [...ed.querySelectorAll('p,li,div,h1,h2,h3,h4,h5,h6')].find((e) => {
        const t = (e.textContent || '').trim()
        const r = e.getBoundingClientRect()
        return t.length > 0 && r.width > 0 && r.height > 0
      })
    const el = line || ed
    const r = el.getBoundingClientRect()
    return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }
  })()`)
  ok('§2 编辑区内文字行可定位（扫描面非空）', !!box, box ? `(${box.left},${box.top},${box.width}x${box.height})` : 'null')
  if (box) {
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    for (let c = 1; c <= 3; c++) {
      await realMove(cdp, cx, cy, 0)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: c })
      await sleep(30)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', buttons: 0, clickCount: c })
      await sleep(50)
    }
  }
  await sleep(700)
  const selLen = await cdp.eval(`(window.getSelection ? window.getSelection().toString().length : 0)`)
  const floating = await cdp.eval(`document.querySelectorAll('[aria-label="浮动格式工具栏"],[aria-label="Floating format toolbar"]').length`)
  info(`§2 选区文字长度 = ${selLen}；浮动栏 DOM 数 = ${floating}`)
  ok('§2a 🚨 文本确实被真实选中（排除「没选中导致的假阴性」）', selLen > 0, `selLen=${selLen}`)
  if (EXPECT_FLOATING) {
    ok('§2b 🚨 HEAD 阳性对照：浮动栏确实出现（证明选中操作能触发它）', floating > 0, `count=${floating}`)
  } else {
    ok('§2b 🚨 当前代码：浮动栏未出现（已删除）', floating === 0, `count=${floating}`)
  }
  const clip = box ? { x: Math.max(0, box.left - 20), y: Math.max(0, box.top - 20), width: Math.round(box.width) + 40, height: Math.round(box.height) + 40 } : null
  await shot(cdp, SHOT, clip)

  console.log('\n=== 3. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§3 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) failed.forEach((f) => console.log('  ❌ ' + f.name))
  try { cdp.send('Browser.close').catch(() => {}) } catch { /* 忽略 */ }
  await sleep(400)
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
