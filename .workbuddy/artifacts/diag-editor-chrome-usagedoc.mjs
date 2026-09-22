/**
 * 诊断 · 打开「使用文档」笔记后，编辑器顶部到底有哪些按钮？（2026-09-22）
 * ==========================================================================
 * 目的：需求说「移除顶部工具栏中的**删除按钮**和**编辑模式选择框**」，
 * 但源码里 EditorToolbar 只有 标签栏 + 模式切换（无删除）→ 必须看真机 DOM 定位。
 * 做法：进入使用文档笔记 → 枚举顶部 160px 内所有 button/[role=button] 的
 *      aria-label / title / text / class，并打印关键容器 outerHTML 骨架 + 截图。
 *
 * 用法（与 Edge 同一次前台 bash）：
 *   CDP_PORT=9455 node .workbuddy/artifacts/diag-editor-chrome-usagedoc.mjs
 */
import { WebSocket } from 'ws'
import fs from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9455)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const OUT_DIR = process.env.OUT_DIR || 'C:/Users/HJN/AppData/Local/Temp/mc-shots'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
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
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
  async shot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    fs.mkdirSync(OUT_DIR, { recursive: true })
    const p = `${OUT_DIR}/${name}.png`
    fs.writeFileSync(p, Buffer.from(data, 'base64'))
    console.log('SHOT ' + p)
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

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 页面 target'); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')
  await cdp.send('Page.bringToFront'); await cdp.eval('window.focus()')

  await cdp.send('Page.navigate', { url: `${BASE}/?_p=diagchrome-${Date.now()}#view=editor` })
  await waitFor(cdp, `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`, { tries: 200, ms: 500, label: '应用外壳' })
  if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
    await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); const b = el && [...el.querySelectorAll('button')].find(x => /开始|跳过|继续/.test(x.textContent||'')); if (b) b.click(); else if (el) el.remove(); return true })()`)
    await sleep(400)
  }
  await waitFor(cdp, `(async () => {
    const all = await new Promise((resolve) => {
      const req = indexedDB.open('markcraft')
      req.onsuccess = () => { const d = req.result; const g = d.transaction('kv','readonly').objectStore('kv').getAll(); g.onsuccess = () => { const r = g.result; d.close(); resolve(r || []) } }
      req.onerror = () => resolve([])
    })
    const kv = {}; for (const r of all) kv[r.key] = r.value
    let l = []; try { l = JSON.parse(kv['kb-list'] || '[]') } catch {}
    return l.length > 0
  })()`, { tries: 60, ms: 500, label: '播种' })
  await sleep(1500)

  console.log('--- 进知识库详情 → 笔记 Tab → 点 00 开始使用 ---')
  const NAME_OK = `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || ''); return n.length > 0 && n !== '未选择知识库' })()`
  for (let a = 1; a <= 3; a++) {
    await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
    if (await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 25, ms: 400 }) < 0) { await sleep(1200); continue }
    await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
    if (await waitFor(cdp, NAME_OK, { tries: 25, ms: 400 }) >= 0) break
  }
  await cdp.eval(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
  await waitFor(cdp, `document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 2`, { tries: 30, ms: 400, label: '笔记行' })
  await cdp.eval(`(() => {
    const rows = [...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')]
    const r = rows.find(x => (x.textContent || '').includes('00 开始使用')) || rows[0]
    if (r) r.click(); return !!r
  })()`)
  await sleep(1800)

  const snap = await cdp.eval(`({ hash: location.hash, editor: !!document.querySelector('.cm-content, .ProseMirror'), chip: ((document.querySelector('.aurora-editor__return')||{}).textContent||'').trim() })`)
  console.log('IN_EDITOR ' + JSON.stringify(snap))

  console.log('\n===== 顶部 170px 内所有可点元素 =====')
  const topButtons = await cdp.eval(`(() => {
    const out = []
    for (const el of document.querySelectorAll('button, [role="button"], a')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.top > 170) continue
      out.push({
        top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width),
        cls: (el.className || '').toString().split(' ').filter(c => c.startsWith('aurora')).join('.'),
        aria: el.getAttribute('aria-label'), title: el.getAttribute('title'),
        text: (el.textContent || '').trim().slice(0, 24),
        hasSvg: !!el.querySelector('svg'),
      })
    }
    return out.sort((a, b) => a.top - b.top || a.left - b.left)
  })()`)
  topButtons.forEach((b, i) => console.log(`  [${i}] top=${b.top} left=${b.left} w=${b.w} cls=.${b.cls} aria=${JSON.stringify(b.aria)} title=${JSON.stringify(b.title)} text=${JSON.stringify(b.text)}`))

  console.log('\n===== 关键容器骨架（class 列表，非全量 HTML）=====')
  const skeleton = await cdp.eval(`(() => {
    const dump = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const walk = (n, d) => {
        if (d > 4) return null
        const kids = [...n.children].map(c => walk(c, d + 1)).filter(Boolean)
        return { t: n.tagName.toLowerCase(), c: (n.className || '').toString().split(' ').filter(Boolean).slice(0, 3).join('.'), aria: n.getAttribute && n.getAttribute('aria-label') || undefined, k: kids }
      }
      return walk(el, 0)
    }
    return { toolbar: dump('.aurora-toolbar'), returnbar: dump('.aurora-editor__returnbar'), pagehead: dump('.aurora-pageframe__head, .aurora-page__head, header'), main: dump('.aurora-editor__main') }
  })()`)
  console.log(JSON.stringify(skeleton, null, 1).slice(0, 6000))

  await cdp.shot('diag-usagedoc-editor')
  console.log('\nDONE')
  ws.close()
  process.exit(0)
}

main().catch((e) => { console.error('探针异常：', e?.message || e); process.exit(3) })
