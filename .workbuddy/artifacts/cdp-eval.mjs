/**
 * cdp-eval · 在已启动的 Edge(CDP@9444) 页面里执行一段 JS 并打印结果
 *
 * 用法：
 *   node .workbuddy/artifacts/cdp-eval.mjs "document.title"
 *   node .workbuddy/artifacts/cdp-eval.mjs --url "#view=settings" "location.hash"
 *   node .workbuddy/artifacts/cdp-eval.mjs --all "document.querySelectorAll('.aurora-page').length"
 *
 * 前提：Edge 必须以 --remote-debugging-port=9444 且与脚本同一次 bash 启动（后台 bash 会收编子进程）。
 */
import { WebSocket } from 'ws'
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
let wantUrl = null
let wantAll = false
let exprFile = null
const rest = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--url') { wantUrl = argv[++i]; continue }
  if (argv[i] === '--all') { wantAll = true; continue }
  if (argv[i] === '--file') { exprFile = argv[++i]; continue }
  rest.push(argv[i])
}
const expr = exprFile ? readFileSync(exprFile, 'utf8') : (rest.join(' ') || 'document.title')

const list = await (await fetch('http://127.0.0.1:9444/json/list')).json()
const pages = list.filter((t) => t.type === 'page' && t.url.includes('localhost:5174'))
if (!pages.length) { console.error('❌ 无 5174 页面（Edge 起了吗？同一次 bash 启动？）'); process.exit(1) }

let page = wantUrl ? pages.find((p) => p.url.includes(wantUrl)) : pages[pages.length - 1]
if (!page) { console.error(`❌ 没有匹配 "${wantUrl}" 的页面，现有：`); pages.forEach((p) => console.error('   ' + p.url)); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
let id = 0
const pending = new Map()
ws.on('message', (raw) => {
  const m = JSON.parse(raw)
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) }
})
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pending.has(i)) { pending.delete(i); rej(new Error('timeout ' + method)) } }, 15000) })

await send('Runtime.enable')
if (wantAll) {
  for (const p of pages) console.log(`${p.url}\n   ${p.title}`)
  ws.close()
  process.exit(0)
}
console.log(`页面: ${page.url}`)
const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
if (r.exceptionDetails) console.error('⚠️ 表达式抛错:', r.exceptionDetails.exception?.description || r.exceptionDetails.text)
console.log(typeof r.result?.value === 'string' ? r.result.value : JSON.stringify(r.result?.value, null, 2))
ws.close()
