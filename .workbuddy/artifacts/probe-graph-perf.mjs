/**
 * GraphPanel 力导向性能量化探针（PLAN-02 改动 B 的替代调查）
 * --------------------------------------------------------------------------
 * 缘起：PLAN-02 原定的「柱状图 height → scaleY」改动前提不成立 ——
 *   · canvas.css 的 .aurora-dash-bar__fill 是**死 CSS**（Aurora 演示期仪表盘残留）
 *   · features/dashboard/DashboardPanel.tsx 是**死组件**（tools.openDashboard 已删）
 * 项目里真正在用的、带 rAF 循环的图表是 `src/aurora/panels/kb/GraphPanel.tsx`（双链图谱）。
 * 它的 `loop()` 每帧调用 `bump()`（useReducer dispatch）→ 触发 React 重渲染 →
 * 全量 SVG reconcile。这可能是真实性能问题，但必须**量化**而非凭观感下结论。
 *
 * 测什么：
 *   P3 图谱 DOM 规模（决定每帧 reconcile 成本）
 *   P1 静置期帧间隔基线（无模拟运行）
 *   P2 力导向模拟运行期帧间隔 + MutationObserver 统计每帧 DOM 变更量
 *   P4 模拟停止后是否真的归还空闲（alpha 衰减 → 0 后应零变更）
 *
 * 运行：node .workbuddy/artifacts/probe-graph-perf.mjs
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9335
// 深链直达双链图谱（STANDARD_VIEWS 之一）
const APP = 'http://127.0.0.1:5174/#view=graph'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-graph-'))
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
      const list = await r.json()
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('CDP 未就绪')
}

let seq = 0
const pending = new Map()

async function main() {
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
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description }
    return r.result.value
  }

  const frameSampler = (n) => `
    new Promise((resolve) => {
      const samples = []; let last = performance.now(); let n = 0;
      const tick = () => {
        const now = performance.now(); samples.push(now - last); last = now; n++;
        if (n < ${n}) requestAnimationFrame(tick);
        else {
          const sorted = [...samples].sort((a,b)=>a-b);
          const p = (q) => sorted[Math.floor(sorted.length*q)];
          resolve({ frames: samples.length,
            avg: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2),
            p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +Math.max(...samples).toFixed(2),
            over20ms: samples.filter(s=>s>20).length, over33ms: samples.filter(s=>s>33).length });
        }
      };
      requestAnimationFrame(tick);
    })
  `

  const moStart = (slot) => `
    (() => {
      window['__mcMut' + ${slot}] = { attr: 0, child: 0 };
      const svg = document.querySelector('.aurora-graph__svg');
      if (!svg) return false;
      const mo = new MutationObserver((recs) => {
        const acc = window['__mcMut' + ${slot}];
        for (const r of recs) { if (r.type === 'attributes') acc.attr++; else if (r.type === 'childList') acc.child++; }
      });
      mo.observe(svg, { attributes: true, childList: true, subtree: true,
                        attributeFilter: ['cx','cy','r','transform','style','x','y','width','height'] });
      window['__mcMo' + ${slot}] = mo;
      return true;
    })()
  `

  await send('Page.enable')
  await send('Runtime.enable')
  for (let i = 0; i < 50; i++) {
    if (await evalJs(`!!document.querySelector('#aurora-root')?.children.length`)) break
    await sleep(300)
  }

  let svgReady = false
  for (let i = 0; i < 60; i++) {
    svgReady = await evalJs(`!!document.querySelector('.aurora-graph__svg')`)
    if (svgReady) break
    await sleep(300)
  }
  console.log('hash:', await evalJs('location.hash'))
  console.log('图谱 SVG 已渲染:', svgReady)
  if (!svgReady) {
    console.log('  页面文本片段:', String(await evalJs('(document.body.innerText||"").slice(0,240)')).replace(/\n/g, ' | '))
    finish(); return
  }

  // ⚠️ 铁律：svgReady（SVG 挂载）≠ 数据就绪。须轮询到真实节点数 >0 再采样，
  // 否则读到空图谱（nodes:0）→ 性能数字全是假的。
  let dots = 0
  for (let i = 0; i < 40; i++) {
    dots = await evalJs(`document.querySelectorAll('.aurora-graph__dot').length`)
    if (dots > 0) { console.log(`节点数据就绪: ${dots} 个 dot（第 ${i} 次轮询）`); break }
    await sleep(400)
  }
  if (dots === 0) { console.log('⚠️ 40 次轮询后仍无节点，图谱可能空库；性能结论不可信'); }

  // ===== P3 DOM 规模 =====
  const scale = await evalJs(`
    (() => ({
      nodes: document.querySelectorAll('.aurora-graph__node').length,
      dots: document.querySelectorAll('.aurora-graph__dot').length,
      edges: document.querySelectorAll('.aurora-graph__edge').length,
      labels: document.querySelectorAll('.aurora-graph__label').length,
      svgTotal: (document.querySelector('.aurora-graph__svg')?.querySelectorAll('*').length ?? 0),
    }))()
  `)
  console.log('\n=== P3 图谱 DOM 规模 ===')
  console.log(JSON.stringify(scale))

  // ===== P1 静置基线 =====
  await sleep(600)
  const idle = await evalJs(frameSampler(90), true)
  console.log('\n=== P1 静置期帧间隔（90 帧，模拟未运行）===')
  console.log(JSON.stringify(idle))

  // ===== P2 触发模拟 =====
  // 优先拖拽一个真节点（dot--file 半径更大更好命中），退化到首个 dot
  const nodePt = await evalJs(`
    (() => {
      const n = document.querySelector('.aurora-graph__dot--file') || document.querySelector('.aurora-graph__dot');
      if(!n) return null;
      const b = n.getBoundingClientRect();
      if (b.width === 0) return null;
      return { x: Math.round(b.x + b.width/2), y: Math.round(b.y + b.height/2) };
    })()
  `)
  console.log('\n拖拽目标节点坐标:', JSON.stringify(nodePt))

  if (nodePt && nodePt.x > 0) {
    await evalJs(moStart(1), true)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: nodePt.x, y: nodePt.y, button: 'none' })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: nodePt.x, y: nodePt.y, button: 'left', clickCount: 1 })
    // 小幅拖动以维持 dragRef（模拟运行条件之一）
    for (let i = 1; i <= 6; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: nodePt.x + i * 6, y: nodePt.y + i * 3, button: 'left' })
      await sleep(20)
    }

    const sim = await evalJs(frameSampler(60), true)
    const mut = await evalJs(`window.__mcMut1`)
    console.log('\n=== P2 力导向模拟运行期（拖拽中，60 帧）===')
    console.log('  帧间隔:', JSON.stringify(sim))
    console.log('  该窗口内 SVG DOM 变更:', JSON.stringify(mut),
      mut ? `→ 每帧 attr≈${(mut.attr / 60).toFixed(1)} child≈${(mut.child / 60).toFixed(1)}` : '')

    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: nodePt.x + 36, y: nodePt.y + 18, button: 'left', clickCount: 1 })
    await evalJs(`window.__mcMo1 && window.__mcMo1.disconnect(); true`, true)
  }

  // ===== P4 松手后是否归还空闲 =====
  await sleep(2400) // 等 alpha 衰减到 0
  await evalJs(moStart(2), true)
  const after = await evalJs(`
    new Promise((resolve) => setTimeout(() => resolve(window.__mcMut2), 900))
  `, true)
  await evalJs(`window.__mcMo2 && window.__mcMo2.disconnect(); true`, true)
  const afterFrames = await evalJs(frameSampler(60), true)
  console.log('\n=== P4 松手 2.4s 后（alpha 应已衰减归零）===')
  console.log('  900ms 内 SVG DOM 变更:', JSON.stringify(after), after && after.attr + after.child === 0 ? '✅ 已完全静默' : '⚠️ 仍在变更')
  console.log('  帧间隔:', JSON.stringify(afterFrames))

  finish()

  function finish() {
    ws.close(); edge.kill()
    setTimeout(() => { try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}; process.exit(0) }, 400)
  }
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
