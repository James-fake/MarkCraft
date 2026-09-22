/**
 * CDP 端到端验收 · 「概览 · 专属图谱」节点点击 → 在编辑器中打开**该**笔记
 * ==========================================================================
 * 报障（2026-09-22）：只有第一篇 00 开始使用.md 点击后会回到/停在知识库详细界面。
 * 根因（全应用穷举后唯一命中的哑元素）：MiniGraph 的节点是 `cursor: pointer`，
 * 但整张图无任何点击处理，且**只给一个节点渲染名字**（currentId = miniNodes[0] = 首篇）
 * ⇒ 用户唯一看得见、又"看着能点"的笔记名，点了毫无反应。
 *
 * ⚠️ 选择器必须**实现无关**（踩过的坑）：第一版用修复后才存在的 `.aurora-kb-minigraph__g`
 *    取节点 ⇒ HEAD 对照组"红"是因为**选择器在旧版不存在**（节点数 0），
 *    而不是因为行为差异 —— 属于「归因不诚实」。现改为**由 `<circle>` 反查父 `<g>`**
 *    （圆点在修复前后都存在），红的理由才落在真正的行为上。
 * ⚠️ `SVGElement` 没有 `.click()`（Chromium 实测）→ 用派发**冒泡 MouseEvent** 走 React 委托链路；
 *    另附一条**真实鼠标**点击作为补充证据（无前台窗口时 Chromium 可能不派发，见 skill 坑 T：
 *    未送达只记 info、不判失败）。
 *
 * 用法（与 Edge 同一次前台 bash；profile 必须 Windows 形态路径）：
 *   CDP_PORT=9455 node .workbuddy/artifacts/cdp-verify-kb-minigraph-click.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9455)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const DOC1 = process.env.DOC || '00 开始使用'
const DOC2 = process.env.DOC2 || '01 界面布局'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.pageErrors = []
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); return }
      if (m.method === 'Runtime.exceptionThrown') this.pageErrors.push('exception: ' + (m.params?.exceptionDetails?.exception?.description || ''))
      if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') this.pageErrors.push('console: ' + m.params.entry.text)
    })
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
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
const info = (s) => console.log('   · ' + s)
const head = (s) => console.log('\n===== ' + s + ' =====')

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) { try { if (await cdp.eval(expr)) return i } catch {} ; await sleep(ms) }
  if (label) console.log('   ⚠ 超时: ' + label)
  return -1
}
const ED = '.cm-content, .ProseMirror'
const ready = (cdp) => waitFor(cdp, `document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`, { tries: 200, ms: 500 })

/** 实现无关的节点清单：由 <circle> 反查父 <g>（圆点在修复前后都存在） */
const NODES = `(() => {
  const circles = [...document.querySelectorAll('.aurora-kb-card--graph .aurora-kb-minigraph circle')]
  return circles.map((c, i) => {
    const g = c.parentElement
    const t = g.querySelector('title')
    return {
      i,
      name: t ? (t.textContent || '').trim() : '',
      interactive: g.classList.contains('is-interactive'),
      role: g.getAttribute('role'),
      isCurrent: c.classList.contains('aurora-kb-minigraph__node--current'),
      cursor: getComputedStyle(c).cursor,
      label: (g.querySelector('.aurora-kb-minigraph__label') || {}).textContent ?? null,
    }
  })
})()`

/** 派发**冒泡** MouseEvent（SVGElement 无 .click()）→ 走 React 委托链路 */
const clickNodeByPicker = (picker) => `(() => {
  const gs = [...document.querySelectorAll('.aurora-kb-card--graph .aurora-kb-minigraph circle')].map(c => c.parentElement)
  const g = ${picker}
  if (!g) return { ok: false, found: gs.length }
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
  g.dispatchEvent(ev)
  return { ok: true, tag: g.tagName, cls: (g.className || '').toString().slice(0, 60) }
})()`
const clickCurrent = clickNodeByPicker(`gs.find(x => x.querySelector('.aurora-kb-minigraph__node--current'))`)
const clickOther = clickNodeByPicker(`gs.find(x => !x.querySelector('.aurora-kb-minigraph__node--current'))`)

const SNAP = `({
  hash: location.hash,
  editor: !!document.querySelector(${JSON.stringify(ED)}),
  kbDetail: !!document.querySelector('.aurora-kb-subbar__name'),
  body: ((document.querySelector('.ProseMirror') || document.querySelector('.cm-content') || {}).textContent || '').slice(0, 80),
  chip: ((document.querySelector('.aurora-editor__return') || {}).textContent || '').trim(),
})`

async function enterKbDetail(cdp) {
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 4; a++) {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1000); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) {
      await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--graph .aurora-kb-minigraph circle').length > 0`, { tries: 30, ms: 400, label: '图谱节点' })
      return true
    }
  }
  return false
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 target'); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__logs = [] })()` })
  await cdp.send('Page.bringToFront'); await cdp.eval('window.focus()')

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=minigraph-${Date.now()}#view=editor` })
  await sleep(900)
  const rdy = await ready(cdp)
  const surface = await cdp.eval(`({ s: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length, reload: Array.isArray(window.__logs) })`)
  head('0. 自检（扫描面非空 + 真实重载）')
  ok('应用外壳已挂载且样式表到位（扫描面非空）', rdy >= 0 && surface.s > 0 && surface.sheets > 8, `sidebarItems=${surface.s} styleSheets=${surface.sheets}`)
  ok('确实发生了真实重载（注入钩子生效）', surface.reload === true)
  if (!(rdy >= 0 && surface.s > 0)) { console.error('❌ 扫描面为空 → 结论不可信，退出'); process.exit(4) }
  if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
    await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); const b = el && [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent || '')); if (b) b.click(); else if (el) el.remove(); return true })()`)
    await sleep(400); info('首启引导已关闭')
  }
  const seeded = await waitFor(cdp, `(async () => {
    const all = await new Promise((res) => { const q = indexedDB.open('markcraft'); q.onsuccess = () => { const d = q.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); res(r || []) } }; q.onerror = () => res([]) })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500, label: '播种' })
  ok('「使用文档」知识库已播种（数据面非空）', seeded >= 0)
  await sleep(1200); await ready(cdp)

  head('1. 进入知识库详情（概览 Tab），清点图谱节点')
  const entered = await enterKbDetail(cdp)
  ok('已进入知识库详情页（库名已解析）', entered, `kbName=${JSON.stringify(await cdp.eval(`((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '')`))}`)
  const nodes = await cdp.eval(NODES)
  info(`图谱节点 = ${nodes.length} 个`)
  nodes.slice(0, 6).forEach((n) => info(`  [${n.i}] name=${JSON.stringify(n.name)} interactive=${n.interactive} role=${n.role} isCurrent=${n.isCurrent} circleCursor=${n.cursor} label=${JSON.stringify(n.label)}`))
  ok('图谱节点数 ≥ 2（扫描面非空，后续断言才有意义）', nodes.length >= 2, `nodes=${nodes.length}`)

  // ★ 修复前：节点恒定 cursor:pointer 但 interactive=0 / 无 handler。
  //   注意扫描面来自 <circle>，**修复前后都存在** ⇒ 本条的"红"只因行为差异（归因诚实）。
  const interactiveCount = nodes.filter((n) => n.interactive).length
  ok('每个图谱节点都是可交互节点（.is-interactive + role=button）',
    nodes.length > 0 && interactiveCount === nodes.length && nodes.every((n) => n.role === 'button'),
    `interactive=${interactiveCount}/${nodes.length}`)
  ok('节点名可发现：每个节点都有非空 <title>', nodes.length > 0 && nodes.every((n) => n.name.length > 0),
    `有名节点=${nodes.filter((n) => n.name).length}/${nodes.length}`)
  const names = nodes.map((n) => n.name)
  info(`节点名（前 8）= ${JSON.stringify(names.slice(0, 8))}`)

  head(`2. 点「当前节点」（即首篇 ${DOC1}）→ 应在编辑器打开该篇`)
  const r1 = await cdp.eval(clickCurrent)
  await sleep(1200)
  const s1 = await cdp.eval(SNAP)
  info(`派发点击 = ${JSON.stringify(r1)}`)
  info(`点击后 = ${JSON.stringify({ hash: s1.hash, editor: s1.editor, kbDetail: s1.kbDetail })}`)
  info(`编辑器正文开头 = ${JSON.stringify(s1.body.slice(0, 46))} ｜ 返回芯片 = ${JSON.stringify(s1.chip)}`)
  ok('点节点后视图切到编辑器（报障点：此前毫无反应）', s1.hash === '#view=editor' && s1.editor === true, `hash=${s1.hash}`)

  head(`3. 点**另一个**节点 → 必须打开那一篇（证明按节点 id 打开）`)
  if (await enterKbDetail(cdp)) {
    const other = nodes.find((n) => !n.isCurrent)
    if (other) {
      info(`目标节点 = [${other.i}] name=${JSON.stringify(other.name)}`)
      const r2 = await cdp.eval(clickOther)
      await sleep(1200)
      const s2 = await cdp.eval(SNAP)
      info(`派发点击 = ${JSON.stringify(r2)}`)
      info(`点击后 = ${JSON.stringify({ hash: s2.hash, editor: s2.editor })} 正文开头 = ${JSON.stringify(s2.body.slice(0, 46))}`)
      ok('点另一节点 → 打开的是**另一篇**而不是首篇（按该节点 id 打开）',
        s2.hash === '#view=editor' && s2.editor === true && !s2.body.includes('MarkCraft 使用文档'),
        `hash=${s2.hash} body=${JSON.stringify(s2.body.slice(0, 40))}`)
    } else {
      ok('点另一节点 → 打开的是**另一篇**而不是首篇（按该节点 id 打开）', false, '图内只有一个节点')
    }
  } else {
    ok('点另一节点 → 打开的是**另一篇**而不是首篇（按该节点 id 打开）', false, '进不了详情页')
  }

  head('4. 补充证据：真实鼠标点当前节点（未送达只记 info，不判失败 — 见 skill 坑 T）')
  if (await enterKbDetail(cdp)) {
    const pt = await cdp.eval(`(() => {
      const c = document.querySelector('.aurora-kb-card--graph .aurora-kb-minigraph__node--current')
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })()`)
    if (pt) {
      for (let i = 0; i < 3; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, buttons: 0 }); await sleep(120) }
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1, buttons: 1 })
      await sleep(60)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1, buttons: 0 })
      await sleep(1200)
      const s3 = await cdp.eval(SNAP)
      info(`真实鼠标点(${pt.x},${pt.y}) 后 hash=${s3.hash} editor=${s3.editor}`)
      if (s3.hash === '#view=editor') ok('真实鼠标点节点 → 也进编辑器', true, `hash=${s3.hash}`)
      else info('合成鼠标未送达（无前台窗口时 Chromium 不派发，见坑 T）→ 记 info，不判失败')
    } else info('未定位到 current 节点')
  }

  head('5. 页面错误')
  const errs = cdp.pageErrors.filter((x) => !/ResizeObserver loop|Permissions-Policy/i.test(x))
  info(`错误条数 = ${errs.length}${errs.length ? '：' + JSON.stringify(errs.slice(0, 3)) : ''}`)

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) { console.log('未通过：'); failed.forEach((f) => console.log('  ❌ ' + f.name)) }
  ws.close()
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
