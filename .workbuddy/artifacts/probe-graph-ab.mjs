/**
 * GraphPanel 力导向模拟代价 · 重复采样探针
 * ------------------------------------------------------------
 * 缘起：probe-graph-perf 单次采样显示拖拽期 p95=37.6ms / max=62.8ms，
 * 但静置期也有 max=53.8ms（噪声）。单次无法区分「信号」与「抖动」。
 *
 * 本探针做 A/B 重复对照：
 *   · A 组：静置期（无拖拽）多轮采样
 *   · B 组：拖拽期（模拟运行）多轮采样
 * 每组取多轮，比较中位数，判断拖拽是否**稳定**劣化。
 *
 * 关键：必须先轮询到真实节点数（svgReady ≠ 数据就绪）。
 *
 * 运行：node .workbuddy/artifacts/probe-graph-ab.mjs
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9337
const APP = 'http://127.0.0.1:5174/#view=graph'
const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-ab-'))
const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--window-size=1600,1000',
  APP,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getWsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const l = await r.json()
      const p = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('CDP 未就绪')
}

let seq = 0
const pending = new Map()
const ws = new WebSocket(await getWsUrl())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}
const send = (method, params = {}) => {
  const id = ++seq
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
}
const evalJs = async (e, a = false) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: a })
  if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description }
  return r.result.value
}

const frameSampler = (n) => `
  new Promise((resolve) => {
    const samples = []; let last = performance.now(); let k = 0;
    const tick = () => {
      const now = performance.now(); samples.push(now - last); last = now; k++;
      if (k < ${n}) requestAnimationFrame(tick);
      else {
        const sorted = [...samples].sort((a,b)=>a-b);
        const p = (q) => sorted[Math.floor(sorted.length*q)];
        resolve({ n: samples.length,
          avg: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2),
          p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +Math.max(...samples).toFixed(2),
          over20: samples.filter(s=>s>20).length, over33: samples.filter(s=>s>33).length });
      }
    };
    requestAnimationFrame(tick);
  })
`

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

await send('Page.enable')
await send('Runtime.enable')
for (let i = 0; i < 50; i++) {
  if (await evalJs(`!!document.querySelector('#aurora-root')?.children.length`)) break
  await sleep(300)
}

// 等数据就绪（关键）
let dots = 0
for (let i = 0; i < 40; i++) {
  dots = await evalJs(`document.querySelectorAll('.aurora-graph__dot').length`)
  if (dots > 0) { console.log(`节点数据就绪: ${dots} 个（第 ${i} 次轮询）`); break }
  await sleep(400)
}
if (dots === 0) { console.log('⚠️ 无节点，终止'); ws.close(); edge.kill(); process.exit(1) }

const scale = await evalJs(`({
  nodes: document.querySelectorAll('.aurora-graph__node').length,
  dots: document.querySelectorAll('.aurora-graph__dot').length,
  edges: document.querySelectorAll('.aurora-graph__edge').length,
  svgTotal: document.querySelector('.aurora-graph__svg')?.querySelectorAll('*').length ?? 0,
})`)
console.log('DOM 规模:', JSON.stringify(scale))

// ===== A 组：静置期多轮 =====
console.log('\n===== A 组：静置期（无模拟运行）=====')
const idleRuns = []
for (let r = 0; r < 5; r++) {
  await sleep(300)
  const s = await evalJs(frameSampler(60), true)
  idleRuns.push(s)
  console.log(`  A${r + 1}: avg=${s.avg} p95=${s.p95} max=${s.max} >33ms=${s.over33}`)
}

// ===== B 组：拖拽期多轮 =====
const nodePt = await evalJs(`
  (() => { const n = document.querySelector('.aurora-graph__dot--file') || document.querySelector('.aurora-graph__dot');
    if(!n) return null; const b = n.getBoundingClientRect();
    return { x: Math.round(b.x + b.width/2), y: Math.round(b.y + b.height/2) }; })()
`)
console.log('\n===== B 组：拖拽期（力模拟持续运行）=====')
console.log('拖拽目标:', JSON.stringify(nodePt))
const dragRuns = []
if (nodePt && nodePt.x > 0) {
  for (let r = 0; r < 5; r++) {
    // 每轮重新按下并持续移动，保持模拟运行
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: nodePt.x, y: nodePt.y, button: 'none' })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: nodePt.x, y: nodePt.y, button: 'left', clickCount: 1 })
    // 后台持续小幅度移动（不 await，边移动边采样会干扰，故用定时器式）
    const moves = (async () => {
      for (let i = 1; i <= 40; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: nodePt.x + Math.sin(i / 5) * 30, y: nodePt.y + Math.cos(i / 5) * 30, button: 'left' })
        await sleep(16)
      }
    })()
    const s = await evalJs(frameSampler(50), true)
    await moves
    dragRuns.push(s)
    console.log(`  B${r + 1}: avg=${s.avg} p95=${s.p95} max=${s.max} >33ms=${s.over33}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: nodePt.x, y: nodePt.y, button: 'left', clickCount: 1 })
    // 等 alpha 衰减
    await sleep(1800)
  }
}

// ===== 汇总 =====
console.log('\n===== 汇总对照（中位数）=====')
const sum = (runs, key) => median(runs.map((r) => r[key]))
console.log(`               avg      p95      max     >33ms总`)
console.log(`  A 静置:      ${sum(idleRuns, 'avg').toFixed(2)}   ${sum(idleRuns, 'p95').toFixed(2)}   ${sum(idleRuns, 'max').toFixed(2)}   ${idleRuns.reduce((a, r) => a + r.over33, 0)}`)
if (dragRuns.length) {
  console.log(`  B 拖拽:      ${sum(dragRuns, 'avg').toFixed(2)}   ${sum(dragRuns, 'p95').toFixed(2)}   ${sum(dragRuns, 'max').toFixed(2)}   ${dragRuns.reduce((a, r) => a + r.over33, 0)}`)
  const dAvg = sum(dragRuns, 'avg') - sum(idleRuns, 'avg')
  const dP95 = sum(dragRuns, 'p95') - sum(idleRuns, 'p95')
  console.log(`\n  Δavg = ${dAvg.toFixed(2)}ms   Δp95 = ${dP95.toFixed(2)}ms`)
  const verdict = (sum(dragRuns, 'p95') > 24 || dragRuns.reduce((a, r) => a + r.over33, 0) > 3)
    ? '⚠️ 拖拽期存在稳定劣化（p95 超 24ms 或掉帧累计 >3）'
    : '✅ 拖拽期与静置期无显著差异（当前 8 节点规模）'
  console.log('  判定:', verdict)
}

ws.close(); edge.kill(); await sleep(300)
try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
process.exit(0)
