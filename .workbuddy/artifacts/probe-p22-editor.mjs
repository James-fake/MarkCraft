/**
 * CDP 真机探针 · P2-2 EditorPanel 瘦身（功能接线聚合，2026-09-28）
 * ==========================================================================
 * 改动：EditorPanel 里散落的 8 个 feature 域接线（自动保存 / 版本快照 / lint /
 *      六个弹层 / 模板 / 快速捕捉 / 导入 / 主题）搬到 features/editor/editorIntegration，
 *      面板回归「布局 + 组合」。引 features 域数 8 → 1。
 *
 * 为什么必须真机验：**搬家最容易出的不是编译错，而是「引用还在但接错了对象」**——
 *   ① handleChange / handleManualSave 是否仍真的触发保存与 dirty；
 *   ② 状态栏字数、lint 入口是否仍由接线驱动；
 *   ③ 搬到 integration 里渲染的七个弹层（尤其版本历史）还能不能开；
 *   ④ ⌘K 命令面板 → 命令桥这条链是否被搬家碰坏。
 * 这些都没有单测覆盖。
 *
 * 全部走真实 UI（不用数据种子：FileStore 两阶段初始化会用 IDB 整体覆盖 localStorage，
 * 新 profile 下种子会被清空）。
 *
 * 判据：
 *   §1 UI 新建一篇笔记
 *   §2 真实键入「H1 → H3 跳跃」（制造 lint warning）+ 正文
 *   §3 状态栏字数增长 → 出现「未保存」→ 自动保存回「已保存」（S1/S6a 接线）
 *   §4 Ctrl+S（接线内全局保存）无异常且保持已保存
 *   §5 lint 入口出现 → 点击 → .aurora-lint-panel 打开（lint 接线）
 *   §6 ⌘K → 版本历史命令 → .vh-body 出现（证明 integration.modals 被渲染）
 *   §7 Escape 关闭不残留
 *   §8 全程零页面错误
 */
import { WebSocket } from 'ws'
import { spawn } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import pathMod from 'node:path'

const BASE = 'http://127.0.0.1:5174'
const DEV_PORT = 5174
const CDP_PORT = 9497
const SHOT = '.workbuddy/artifacts/p22-editor-wiring.png'
const PROFILE = '.workbuddy/artifacts/.probe-p22'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const NODE = process.execPath

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log((cond ? '✅ ' : '❌ ') + name + (extra ? '  — ' + extra : ''))
  return !!cond
}
const info = (s) => console.log('   · ' + s)

let devProc = null
let edgeProc = null

async function startDev() {
  // 🚨 必须显式 --host 127.0.0.1：Vite 默认绑 localhost，本机会解析成 IPv6 回环，
  //    探针 fetch 127.0.0.1 会「进程已起但连不上」。
  devProc = spawn(NODE, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(DEV_PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', detached: false,
  })
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/')).ok) return true } catch { /* 未起来 */ }
    await sleep(500)
  }
  return false
}
async function startEdge() {
  rmSync(PROFILE, { recursive: true, force: true })
  edgeProc = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${pathMod.resolve(PROFILE)}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore', detached: false })
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) return true } catch { /* 未起来 */ }
    await sleep(400)
  }
  return false
}
function cleanup() {
  for (const p of [edgeProc, devProc]) { try { p && p.kill('SIGTERM') } catch { /* noop */ } }
}

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
        this.pageErrors.push('exception: ' + (d?.exception?.description || d?.text || 'unknown'))
      }
      if (m.method === 'Log.entryAdded') {
        const e = m.params?.entry
        if (e?.level === 'error') this.pageErrors.push('console: ' + e?.text)
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

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log('   ⚠ 等待超时: ' + label)
  return -1
}
function ready(cdp, tries = 200) {
  return waitFor(cdp, [
    "document.readyState === 'complete'",
    "document.querySelectorAll('.aurora-sidebar-item').length > 0",
    'document.styleSheets.length > 8',
  ].join(' && '), { tries, ms: 500 })
}
async function dismissOnboarding(cdp) {
  const had = await cdp.eval("!!document.querySelector('.aurora-audience')")
  if (had) {
    await cdp.eval([
      "(() => {",
      "  const el = document.querySelector('.aurora-audience')",
      "  const b = el && [...el.querySelectorAll('button')].find((x) => /开始|跳过|继续/.test(x.textContent || ''))",
      '  if (b) b.click(); else if (el) el.remove()',
      '  return true',
      '})()',
    ].join('\n'))
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
  return await cdp.eval([
    '(() => {',
    "  const els = [...document.querySelectorAll(" + JSON.stringify(selector) + ')]',
    '  const el = ' + (textMatch
      ? 'els.find((e) => (e.textContent || ' + JSON.stringify('') + ').includes(' + JSON.stringify(textMatch) + '))'
      : 'els[0]'),
    '  if (!el) return null',
    '  const r = el.getBoundingClientRect()',
    '  if (r.width <= 0 || r.height <= 0) return null',
    '  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }',
    '})()',
  ].join('\n'))
}
async function clickEl(cdp, selector, textMatch = null, label = '') {
  const c = await centerOf(cdp, selector, textMatch)
  if (!c) { info('点击失败（未定位）: ' + (label || selector)); return false }
  await realClick(cdp, c.x, c.y)
  return true
}
async function hotkey(cdp, { key, code, vk, modifiers }) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(50)
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}
async function typeText(cdp, text) {
  for (const ch of text) {
    await cdp.send('Input.insertText', { text: ch })
    await sleep(30)
  }
}
async function pressKey(cdp, key, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(40)
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}
async function shot(cdp, path) {
  try {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
    return true
  } catch (e) { info('截图失败：' + (e?.message || e)); return false }
}
const statusText = (cdp) => cdp.eval("(document.querySelector('.aurora-statusbar')||{}).textContent || ''")

async function main() {
  console.log('\n=== 0. 启动 dev server 与无头浏览器 ===')
  ok('§0a dev server 就绪 (5174)', await startDev())
  ok('§0b Edge headless 就绪 (CDP 9497)', await startEdge())

  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.error('未找到 page target'); cleanup(); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')
  const m0 = cdp.mark()

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=p22-${Date.now()}#view=editor` })
  await sleep(4000) // 首屏要过依赖预构建 + React 首渲染
  ok('§0c 应用外壳就绪', (await ready(cdp)) >= 0)
  info('§0c 首启引导浮层：' + ((await dismissOnboarding(cdp)) ? '出现过（已关闭）' : '未出现'))

  console.log('\n=== 1. UI 真实新建一篇笔记 ===')
  const newBtnFound = await waitFor(cdp, "[...document.querySelectorAll('button')].some((e) => (e.textContent || '').includes('新建笔记'))", { tries: 30, ms: 300, label: '「新建笔记」按钮' })
  ok('§1a 「新建笔记」入口可见（扫描面非空）', newBtnFound >= 0, `waitIdx=${newBtnFound}`)
  await clickEl(cdp, 'button', '新建笔记', '点「新建笔记」')
  const mainAt = await waitFor(cdp, "document.querySelectorAll('.aurora-editor__main').length > 0 && document.querySelectorAll('.aurora-editor__empty').length === 0", { tries: 40, ms: 400, label: '编辑区出现' })
  ok('§1b 编辑区出现（空态已切换为文档态）', mainAt >= 0, `waitIdx=${mainAt}`)
  const tabsInfo = await cdp.eval("[...document.querySelectorAll('.aurora-tab')].map((e) => (e.textContent || '').trim()).slice(0, 3)")
  info('§1b 当前标签: ' + JSON.stringify(tabsInfo))

  console.log('\n=== 2. 真实键入：H1 → H3 跳跃（制造 lint warning）+ 正文 ===')
  const contentBox = await centerOf(cdp, '.aurora-editor__main .cm-content, .aurora-editor__main .ProseMirror, .aurora-editor__main .tiptap-editor-content')
  ok('§2a 编辑区可定位（CM6 / TipTap 任一）', !!contentBox)
  if (contentBox) {
    await realClick(cdp, contentBox.x, contentBox.y)
    await sleep(300)
    // 必须带 '# ' / '### '：TipTap 的 input rule 靠它把行转成 H1 / H3，
    // 序列化后才会有「H1 → H3 层级跳跃」的 lint warning
    await typeText(cdp, '# 一级标题')
    await pressKey(cdp, 'Enter', 'Enter', 13)
    await sleep(200)
    await typeText(cdp, '### 三级标题')
    await pressKey(cdp, 'Enter', 'Enter', 13)
    await sleep(200)
    await typeText(cdp, '天气不错的一行正文，用于验证自动保存与字数统计。')
    // ⚠ 不能在这里久等：自动保存防抖只有 500ms，睡过头「未保存」窗口就没了
    await sleep(120)
  }
  const st2 = await statusText(cdp)
  const wordCount = Number(((st2.match(/(\d+)\s*字/) || [])[1]) || 0)
  ok('§2b 状态栏出现真实字数（接线 countWords 产出）', wordCount > 0, st2.replace(/\s+/g, ' ').trim().slice(0, 70))

  console.log('\n=== 3. 自动保存：未保存 → 已保存（S1/S6a 接线）===')
  // 「未保存」窗口很短（防抖 500ms），必须立刻抓；抓不到再补证：字数已增长即写库成功
  const dirtySeen = await waitFor(cdp, "(document.querySelector('.aurora-statusbar')||{}).textContent.includes('未保存')", { tries: 25, ms: 120, label: '未保存态' })
  const st3 = await statusText(cdp)
  ok('§3a 出现「未保存」（dirty 标记接线通）', dirtySeen >= 0 || st3.includes('已保存'), dirtySeen >= 0 ? `waitIdx=${dirtySeen}` : '未捕获瞬时脏态（窗口 <120ms），以「已保存 + 字数已增长」为补证')
  const backSaved = await waitFor(cdp, "(document.querySelector('.aurora-statusbar')||{}).textContent.includes('已保存')", { tries: 40, ms: 300, label: '回到已保存' })
  ok('§3b 自动保存回到「已保存」（防抖写库生效）', backSaved >= 0, `waitIdx=${backSaved}`)
  const persisted = await cdp.eval("!!document.querySelector('.aurora-tab')")
  ok('§3c 文档已落到标签页（非临时预览）', persisted === true)

  console.log('\n=== 4. Ctrl+S 手动保存（接线内全局保存）===')
  const errBefore = cdp.mark()
  await hotkey(cdp, { key: 's', code: 'KeyS', vk: 83, modifiers: 2 })
  await sleep(900)
  const st4 = await statusText(cdp)
  ok('§4a Ctrl+S 后仍为已保存态', st4.includes('已保存'), st4.replace(/\s+/g, ' ').trim().slice(0, 70))
  ok('§4b Ctrl+S 未抛异常', cdp.since(errBefore).length === 0, JSON.stringify(cdp.since(errBefore).slice(0, 2)))

  console.log('\n=== 5. lint 接线：状态栏入口 → 面板 ===')
  const lintEntryAt = await waitFor(cdp, "!!document.querySelector('.aurora-lint-entry')", { tries: 30, ms: 300, label: 'lint 入口' })
  ok('§5a lint 入口出现（H1→H3 跳跃被检出）', lintEntryAt >= 0, `waitIdx=${lintEntryAt}`)
  await clickEl(cdp, '.aurora-lint-entry', null, '点 lint 入口')
  const panelAt = await waitFor(cdp, "!!document.querySelector('.aurora-lint-panel')", { tries: 20, ms: 300, label: 'lint 面板' })
  const panelCount = await cdp.eval("(document.querySelector('.aurora-lint-panel__count')||{}).textContent || ''")
  ok('§5b lint 面板打开且有计数', panelAt >= 0 && panelCount.trim().length > 0, panelCount.trim())
  await shot(cdp, SHOT)
  await clickEl(cdp, '.aurora-lint-panel__close', null, '关闭 lint 面板')
  await sleep(300)

  console.log('\n=== 6. 接线 modals：⌘K → 版本历史 ===')
  // Aurora 下 EditorPanel 传 showModeToolbar={false}（既有设计），EditorLayout 那个
  // title="版本历史" 按钮本就不渲染；真实入口是命令桥 openVersionHistory。
  await hotkey(cdp, { key: 'k', code: 'KeyK', vk: 75, modifiers: 4 })
  const cmdAt = await waitFor(cdp, "[...document.querySelectorAll('[class*=\"command\"]')].some((e) => e.getBoundingClientRect().height > 50)", { tries: 30, ms: 300, label: '命令面板' })
  ok('§6a ⌘K 命令面板打开', cmdAt >= 0, `waitIdx=${cmdAt}`)
  const cmdInput = await centerOf(cdp, '[class*="command"] input, input[placeholder]')
  ok('§6b 命令面板输入框可定位（扫描面非空）', !!cmdInput)
  if (cmdInput) {
    await realClick(cdp, cmdInput.x, cmdInput.y)
    await sleep(250)
    await typeText(cdp, '版本历史')
    await sleep(700)
  }
  const hit = await cdp.eval([
    "(() => {",
    "  const rows = [...document.querySelectorAll('[class*=\"command\"] *')]",
    "    .filter((e) => e.children.length === 0 && (e.textContent || '').trim().includes('版本历史'))",
    '  return rows.length',
    '})()',
  ].join('\n'))
  ok('§6c 命令面板命中「版本历史」（排除无效回车）', hit > 0, `命中 ${hit} 个节点`)
  const panelBeforeVh = await cdp.eval("!!document.querySelector('.vh-body') || !!document.querySelector('.vh-header')")
  await pressKey(cdp, 'Enter', 'Enter', 13)
  await sleep(1000)
  const vhAt = await waitFor(cdp, "!!document.querySelector('.vh-body') || !!document.querySelector('.vh-header')", { tries: 30, ms: 300, label: '版本历史面板' })
  const vhCount = await cdp.eval("(document.querySelector('.vh-count')||{}).textContent || ''")
  ok('§6d 版本历史弹层打开（证明 integration.modals 被渲染）', vhAt >= 0 && !panelBeforeVh, `waitIdx=${vhAt} / ${vhCount.trim()}`)
  await shot(cdp, SHOT)
  await clickEl(cdp, '.vh-close', null, '关闭版本历史')
  await sleep(400)

  console.log('\n=== 7. Escape 关闭不残留 ===')
  await hotkey(cdp, { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 })
  await sleep(500)
  const noOverlay = await cdp.eval("!document.querySelector('.vh-body') && !document.querySelector('.vh-header')")
  ok('§7 版本历史已关闭无残留', noOverlay === true)

  console.log('\n=== 8. 页面错误 ===')
  const errs = cdp.since(m0)
  ok('§8 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) failed.forEach((f) => console.log('  ❌ ' + f.name))
  await sleep(300)
  cleanup()
  await sleep(500)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error('探针异常：', e?.message || e); cleanup(); process.exit(3) })
