/**
 * CDP 真机探针 · 「发布为博客」跨面板入口通道（P2-1，2026-09-28）
 * ==========================================================================
 * 改动：编辑器写入目标笔记 id 的通道，从 BlogPanel 的模块级变量下沉到
 *       @services/blogEntry（消除 EditorPanel → BlogPanel 的面板横向 import）。
 * 风险点：通道是**模块级状态 + 一次性消费**（BlogPanel 的 useLayoutEffect 读后即清），
 *        单测覆盖的是 hook 行为；真机要验证的是「跨面板（组件树重建）后意图仍送达」。
 *
 * 判据：
 *   §1 走真实入口进编辑器（种 IDB → 点侧栏笔记）
 *   §2 打开右栏「辅助」Tab → 点「发布为博客」（真实点击，非调 API）
 *   §3 视图切到博客工作室（.aurora-blog 存在）
 *   §4 🚨 单篇提示条出现（.aurora-blog-source-bar 含「单篇发布」）—— 通道确实送达
 *   §5 点「查看全部笔记」可退回（提示条消失）—— 消费后不残留
 *   §6 全程无页面错误
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9491)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const MC_PORT = Number(new URL(BASE).port || 5174)
const SHOT = process.env.MC_SHOT || '.workbuddy/artifacts/blog-entry-single.png'

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
      const t = setTimeout(() => rej(new Error('CDP timeout: ' + method)), 20000)
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(t); res(v) },
        reject: (e) => { clearTimeout(t); rej(e) },
      })
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
  if (!c) { info(`点击失败（未定位）: ${label || selector}`); return false }
  await realClick(cdp, c.x, c.y)
  return true
}
async function shot(cdp, path) {
  try {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
    return true
  } catch (e) { info(`截图失败：${e?.message || e}`); return false }
}

const NOTES_FOLDER_ID = 'f-notes-p21'
const NOTES = ['甲笔记.md', '乙笔记.md']
const BODIES = ['# 甲笔记\n\n这是甲笔记正文，用于验证发布为博客入口通道。\n', '# 乙笔记\n\n乙笔记正文。\n']
let KEY_FILE_TREE = 'markcraft-file-manager'
let STORAGE_VERSION = 'v5'

async function loadStorageConsts() {
  const txt = await (await fetch(`${BASE}/src/core/files/fileTree.ts`)).text()
  const k = txt.match(/const STORAGE_KEY = '([^']+)'/)
  const v = txt.match(/const STORAGE_VERSION = '([^']+)'/)
  if (k) KEY_FILE_TREE = k[1]
  if (v) STORAGE_VERSION = v[1]
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
  // 走 fileService.loadStateAsync 的**降级路径**：localStorage（IDB 库名/store 名随实现变化，
  // 而 loadLargeData 在 IDB 取不到时会 fallback 到 localStorage，写这里最稳）
  return `(() => {
    const tree = ${JSON.stringify(tree)}
    localStorage.setItem(${JSON.stringify(KEY_FILE_TREE)}, JSON.stringify(tree))
    localStorage.setItem(${JSON.stringify(KEY_FILE_TREE + '-version')}, ${JSON.stringify(STORAGE_VERSION)})
    return true
  })()`
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

  console.log(`\n=== 0. 自检（${BASE} · CDP ${CDP_PORT}）===`)
  await loadStorageConsts()
  ok('§0 应用外壳就绪', (await ready(cdp)) >= 0)
  info(`§0 首启引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  ok('§0 种子写入成功', (await cdp.eval(SEED_EXPR())) === true)
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=p21-${Date.now()}#view=editor` })
  await sleep(1000)
  ok('§0 重载后外壳就绪', (await ready(cdp)) >= 0)
  info(`§0 重载后引导浮层：${(await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'}`)
  await sleep(600)

  console.log('\n=== 1. 打开一篇笔记（真实点击文件树/空态文件列表）===')
  const diag = await cdp.eval(`(() => {
    return {
      href: location.href,
      tree: document.querySelectorAll('.aurora-filetree__item').length,
      emptyRows: [...document.querySelectorAll('.aurora-emptyfiles__row')].map((e) => (e.textContent || '').trim()).slice(0, 8),
      lsKeys: Object.keys(localStorage).filter((k) => /file-manager/.test(k)),
    }
  })()`)
  info('§1 诊断: ' + JSON.stringify(diag))
  // 空态（未打开任何文件）时没有文件树，只有「全部文件」列表；两种入口都试
  let openedRow = await clickEl(cdp, '.aurora-emptyfiles__row', '甲笔记', '点空态列表「甲笔记」')
  if (!openedRow) await clickEl(cdp, '.aurora-filetree__item', '甲笔记', '点文件树「甲笔记」')
  const opened = await waitFor(cdp, `document.querySelectorAll('.aurora-tab').length > 0`, { tries: 50, ms: 400, label: '标签页出现' })
  ok('§1 笔记已打开（标签页出现）', opened >= 0, `waitIdx=${opened}`)
  const tabs = await cdp.eval(`[...document.querySelectorAll('.aurora-tab')].map(e=>(e.textContent||'').trim()).slice(0,3)`)
  info('§1 当前标签: ' + JSON.stringify(tabs))

  console.log('\n=== 2. 右栏「辅助」Tab → 点「发布为博客」===')
  // 右栏默认可能是折叠态（只剩竖条 rail），先展开再点 Tab
  // 右栏是 hover 浮出式（rightOverlay.mounted 由 hoverzone 的 onMouseEnter 驱动），
  // 必须真实把鼠标移到右缘才会挂载 —— 直接找 DOM 是找不到的。
  const hz = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-editor__hoverzone--right')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }
  })()`)
  ok('§2 右缘 hoverzone 可定位（扫描面非空）', !!hz, JSON.stringify(hz))
  if (hz) {
    // 落点必须留在 hoverzone 内（它只有 7px 宽）：先移到外侧，再移进来并**停住**
    await realMove(cdp, hz.x - 60, hz.y, 0)
    await sleep(100)
    await realMove(cdp, hz.x, hz.y, 0) // 进入 → 触发 onMouseEnter
    await sleep(120)
    await realMove(cdp, hz.x, hz.y + 40, 0) // 区内移动，保持在里面
    await sleep(600) // 等 HOVER_INTENT_MS 意图延迟
  }
  const overlayAt = await waitFor(cdp, `document.querySelector('.aurora-editor__overlay--right') !== null`, { tries: 30, ms: 300, label: '右栏浮出' })
  ok('§2 鼠标 hover 后右栏浮出', overlayAt >= 0, `waitIdx=${overlayAt}`)
  const tabAt = await waitFor(cdp, `[...document.querySelectorAll('.aurora-rightbar__tab')].some((e)=>(e.textContent||'').includes('辅助'))`, { tries: 30, ms: 300, label: '右栏辅助 Tab' })
  ok('§2a 右栏「辅助」Tab 可见（扫描面非空）', tabAt >= 0, JSON.stringify(await cdp.eval(`[...document.querySelectorAll('.aurora-rightbar__tab')].map(e=>(e.textContent||'').trim())`)))
  await clickEl(cdp, '.aurora-rightbar__tab', '辅助', '点右栏「辅助」Tab')
  await sleep(400)
  const publishRowFound = await waitFor(cdp, `[...document.querySelectorAll('.aurora-aidpanel__row')].some((e)=>(e.textContent||'').includes('发布为博客'))`, { tries: 30, ms: 300, label: '发布为博客行' })
  ok('§2b 辅助面板含「发布为博客」入口', publishRowFound >= 0, `waitIdx=${publishRowFound}`)
  const clicked = await clickEl(cdp, '.aurora-aidpanel__row', '发布为博客', '点「发布为博客」')
  ok('§2 已点击「发布为博客」', clicked)

  console.log('\n=== 3. 🚨 跨面板通道：视图切换 + 单篇锁定 ===')
  const blogAt = await waitFor(cdp, `document.querySelector('.aurora-blog') !== null`, { tries: 50, ms: 400, label: '博客工作室' })
  ok('§3 已跳转到博客工作室', blogAt >= 0, `waitIdx=${blogAt}`)
  const barAt = await waitFor(cdp, `[...document.querySelectorAll('.aurora-blog-source-bar__label')].some((e)=>(e.textContent||'').includes('单篇发布'))`, { tries: 40, ms: 300, label: '单篇提示条' })
  const barText = await cdp.eval(`(document.querySelector('.aurora-blog-source-bar__label')||{}).textContent || ''`)
  ok('§4 🚨 单篇提示条出现（入口通道确实送达）', barAt >= 0, barText.trim())
  await shot(cdp, SHOT)

  console.log('\n=== 4. 退回全部笔记（消费后不残留）===')
  // 先确认提示条此刻确实存在（否则「消失」是假绿）
  const barStillThere = await cdp.eval(`[...document.querySelectorAll('.aurora-blog-source-bar__label')].some((e)=>(e.textContent||'').includes('单篇发布'))`)
  ok('§5a 退回前提示条确实在（排除「本来就没有」的假绿）', barStillThere === true)
  const clearBtn = await centerOf(cdp, '.aurora-blog-source-bar__clear')
  ok('§5b 「查看全部笔记」按钮可定位', !!clearBtn)
  if (clearBtn) await realClick(cdp, clearBtn.x, clearBtn.y)
  const cleared = await waitFor(cdp, `![...document.querySelectorAll('.aurora-blog-source-bar__label')].some((e)=>(e.textContent||'').includes('单篇发布'))`, { tries: 30, ms: 300 })
  ok('§5 单篇提示条已消失（可退回）', cleared >= 0 && barStillThere === true, `waitIdx=${cleared}`)

  console.log('\n=== 5. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§6 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) failed.forEach((f) => console.log('  ❌ ' + f.name))
  await sleep(300)
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
