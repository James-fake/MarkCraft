/**
 * 截图探针 · 「点知识库首篇」三态（2026-09-22）
 * 目的：DOM 断言全绿但用户仍报障时，**直接看界面**——很多问题是"看得见"的
 * （重复行、错位浮层、编辑器里显示的其实是另一页、行列被裁切…）。
 *
 * 用法（必须与 Edge 同一次前台 bash）：
 *   node .workbuddy/artifacts/shot-kb-firstdoc.mjs
 */
import { WebSocket } from 'ws'
import fs from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const OUT_DIR = process.env.OUT_DIR || 'C:/Users/HJN/AppData/Local/Temp/mc-shots'
const TARGET_DOC = process.env.DOC || '00 开始使用.md'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
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
  async shot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    const p = `${OUT_DIR}/${name}.png`
    fs.writeFileSync(p, Buffer.from(data, 'base64'))
    console.log('SHOT ' + p)
    return p
  }
}

async function waitFor(cdp, expr, { tries = 60, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

const rowByDoc = (docName, scope) => `(() => {
  const rows = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .aurora-kb-recent__item')]
  return rows.find(r => (r.textContent || '').includes(${JSON.stringify(docName)})) || null
})()`

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 页面 target'); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=shot-${Date.now()}#view=editor` })
  // 就绪：应用外壳真实挂载（别用 #root，过早为真）
  const rdy = await waitFor(cdp, `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`, { tries: 200, ms: 500, label: '应用外壳' })
  console.log(`READY=${rdy}  sidebarItems=${await cdp.eval(`document.querySelectorAll('.aurora-sidebar-item').length`)}  sheets=${await cdp.eval('document.styleSheets.length')}`)

  // 关掉首启引导（会吞指针）
  const hadAudience = await cdp.eval(`!!document.querySelector('.aurora-audience')`)
  if (hadAudience) {
    await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); const b = el && [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent||'')); if (b) b.click(); else if (el) el.remove(); return true })()`)
    await sleep(400)
  }
  // 等播种（kb-list 落库）
  await waitFor(cdp, `(async () => {
    const all = await new Promise((resolve) => {
      const req = indexedDB.open('markcraft')
      req.onsuccess = () => { const d = req.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); resolve(r || []) } }
      req.onerror = () => resolve([])
    })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let list = []; try { list = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return list.length > 0
  })()`, { tries: 60, ms: 500, label: '播种' })
  await sleep(1500)

  async function enterKbDetail() {
    const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
    for (let a = 1; a <= 3; a++) {
      await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
      if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1200); continue }
      await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
      if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) return true
    }
    return false
  }

  console.log('--- 1) 进详情页（概览 Tab）---')
  await enterKbDetail()
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { tries: 40, ms: 400, label: '概览最近活动行' })
  await sleep(600)
  await cdp.shot('01-kb-overview')

  console.log('--- 2) 笔记 Tab ---')
  await cdp.eval(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 2`, { tries: 30, ms: 400, label: '笔记行' })
  await sleep(600)
  await cdp.shot('02-kb-notes')

  console.log('--- 3) 点首行（DOM click，保证送达）→ 编辑器 ---')
  await cdp.eval(`(() => { const r = ${rowByDoc(TARGET_DOC, '.aurora-kb-notes')}; if (r) r.click(); return !!r })()`)
  await sleep(1600)
  const snap = await cdp.eval(`({ hash: location.hash, editor: !!document.querySelector('.cm-content, .ProseMirror'), kbPanel: document.querySelectorAll('.aurora-kb').length, chip: (document.querySelector('.aurora-editor__return')||{}).textContent || null, docName: (document.querySelector('.aurora-editor__breadcrumb, .aurora-editor__crumb, .aurora-editor__docname')||{}).textContent || null })`)
  console.log('AFTER_CLICK ' + JSON.stringify(snap))
  await cdp.shot('03-after-click-editor')

  console.log('DONE')
  ws.close()
  process.exit(0)
}

main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
