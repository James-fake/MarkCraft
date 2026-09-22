/**
 * CDP 快速截图：知识库 → MarkCraft 使用文档 → 点首篇笔记 → 只读简介页全屏截图
 * 用途：人工核验「左侧侧边栏图标」的实际渲染（2026-09-22 用户反馈定位用）
 * 用法：与 Edge 同一条 bash：node .workbuddy/artifacts/cdp-shot-brief-sidebar.mjs [输出路径]
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const OUT = process.argv[2] || '.workbuddy/artifacts/brief-sidebar.png'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.on('message', (raw) => { const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) } }) }
  send(method, params = {}) { const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value }
}
async function waitFor(cdp, expr, { tries = 30, ms = 400, label = '' }) {
  for (let i = 0; i < tries; i++) { if (await cdp.eval(expr)) return; await sleep(ms) }
  throw new Error('waitFor 超时: ' + label)
}

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find(t => t.type === 'page' && t.url.includes('5174'))
if (!page) throw new Error('no 5174 target')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
const cdp = new Cdp(ws)
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')
await sleep(1500)

await cdp.eval(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
await waitFor(cdp, `document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { label: '知识库卡片' })
await cdp.eval(`(() => { const c = document.querySelectorAll('.aurora-kb-kbcard')[0]; if (c) c.click(); return !!c })()`)
await waitFor(cdp, `(() => { const n = ((document.querySelector('.aurora-kb-subbar__name') || {}).textContent || '').trim(); return n === 'MarkCraft 使用文档' })()`, { label: '详情页' })
await cdp.eval(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
await waitFor(cdp, `document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`, { label: '笔记 Tab' })
const clicked = await cdp.eval(`(() => {
  const rows = [...document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item')]
  const r = rows.find(x => (x.textContent || '').includes('00 开始使用'))
  if (!r) return false
  r.click(); return true
})()`)
await waitFor(cdp, `document.querySelectorAll('.aurora-brief').length > 0`, { label: '简介页' })
await sleep(1200)

const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log(JSON.stringify({ clicked, saved: OUT }))
ws.close()
process.exit(0)
