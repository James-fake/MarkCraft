/**
 * GraphPanel 真实组件性能直测（不靠注入式推断）
 * --------------------------------------------------------------------------
 * 前一个探针（probe-graph-scale.mjs）用注入式 DOM 测出「每帧改写 1200 个 SVG 属性
 * 仍能维持 60fps」，但**它绕过了 React reconcile** —— 而 GraphPanel 的成本大头恰恰在
 * `loop()` 里的 `bump()`（useReducer dispatch → 每帧 React 重渲染）。
 *
 * 因此本探针改为**直测真实组件**：
 *   T1 用 PerformanceObserver 采长任务（longtask），在真实拖拽期间统计主线程阻塞
 *   T2 用 React Profiler 不可行（未接入），改用 performance.measure 包裹 rAF 帧
 *   T3 在真实图谱节点上执行拖拽（pointerdown→move→up），采帧间隔 + 主线程任务
 *   T4 对照：同一页面不拖拽时的基线
 *
 * 关键区分：
 *   - 若拖拽期帧间隔与基线无显著差异 → 该组件在此规模下无问题（结论：不需要改）
 *   - 若拖拽期出现 >16.7ms 长尾且与 DOM 规模相关 → 存在真实问题
 *
 * 注意本环境真实数据只有 8 个节点，规模过小。因此本探针同时也报告
 * 「在当前规模下是否可观测到问题」，若不可观测则结论是「当前无实证问题」，
 * 而不是「已证明无问题」—— 这是诚实的边界。
 *
 * 运行：node .workbuddy/artifacts/probe-graph-real.mjs
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9338
const APP = 'http://127.0.0.1:5174/#view=graph'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-real-'))
const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`,
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1600,1000', APP,
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
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  }
  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description }
    return r.result.value
  }

  await send('Page.enable'); await send('Runtime.enable')
  // 采集长任务（>50ms 的主线程阻塞）。headless 下 longtask 可能不支持 → 降级为自测「帧内 JS 耗时」
  const obsStatus = await evalJs(`
    (() => {
      window.__mcLong = [];
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.__mcLong.push({ dur: +e.duration.toFixed(1), start: +e.startTime.toFixed(1) });
        }).observe({ entryTypes: ['longtask'] });
        return 'longtask-observer-on';
      } catch (e) { return 'longtask-unsupported: ' + (e && e.message); }
    })()
  `)
  console.log('longtask 采集:', obsStatus)

  for (let i = 0; i < 50; i++) {
    if (await evalJs(`!!document.querySelector('#aurora-root')?.children.length`)) break
    await sleep(300)
  }
  let n = 0
  for (let i = 0; i < 60; i++) {
    n = await evalJs(`document.querySelectorAll('.aurora-graph__dot').length`)
    if (n > 0) break
    await sleep(300)
  }
  console.log(`真实图谱节点数: ${n}`)
  const scale = await evalJs(`
    (() => ({
      dots: document.querySelectorAll('.aurora-graph__dot').length,
      labels: document.querySelectorAll('.aurora-graph__label').length,
      edges: document.querySelectorAll('.aurora-graph__edge').length,
      svgTotal: document.querySelector('.aurora-graph__svg')?.querySelectorAll('*').length ?? 0,
      nodes: document.querySelectorAll('.aurora-graph__node').length,
    }))()
  `)
  console.log('图谱 DOM:', JSON.stringify(scale))

  const frameSampler = (frames) => `
    new Promise((resolve) => {
      const samples = []; let last = performance.now(); let n = 0;
      const tick = () => {
        const now = performance.now(); samples.push(now - last); last = now; n++;
        if (n < ${frames}) requestAnimationFrame(tick);
        else {
          const sorted = [...samples].sort((a,b)=>a-b);
          const p = (q) => sorted[Math.floor(sorted.length*q)];
          resolve({ frames: n,
            avg: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2),
            p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +Math.max(...samples).toFixed(2),
            over16_7: samples.filter(s=>s>16.7).length,
            over20: samples.filter(s=>s>20).length, over33: samples.filter(s=>s>33).length });
        }
      };
      requestAnimationFrame(tick);
    })
  `

  // ===== T4 基线（不拖拽）=====
  await sleep(800)
  await evalJs('Array.isArray(window.__mcLong) && (window.__mcLong.length = 0); true')
  const base = await evalJs(frameSampler(150), true)
  const baseLongRaw = await evalJs('Array.isArray(window.__mcLong) ? window.__mcLong.slice() : null')
  const baseLong = Array.isArray(baseLongRaw) ? baseLongRaw : []
  console.log('\n=== T4 基线（静置 150 帧）===')
  console.log('  帧间隔:', JSON.stringify(base))
  console.log('  长任务(>50ms):', Array.isArray(baseLongRaw) ? JSON.stringify(baseLong) : '（该环境不支持 longtask，改用帧间隔判定）')

  // ===== 找到可拖拽的节点 =====
  const pt = await evalJs(`
    (() => {
      const d = document.querySelector('.aurora-graph__dot');
      if (!d) return null;
      const b = d.getBoundingClientRect();
      return { x: Math.round(b.x + b.width/2), y: Math.round(b.y + b.height/2) };
    })()
  `)
  console.log('\n拖拽目标节点:', JSON.stringify(pt))

  if (pt && pt.x > 0) {
    await evalJs('Array.isArray(window.__mcLong) && (window.__mcLong.length = 0); true')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
    // 保持拖拽 150 帧：持续小幅移动（维持 dragRef + reheat）
    const dragFrames = await evalJs(`
      new Promise((resolve) => {
        const samples = []; let last = performance.now(); let n = 0; let t = 0;
        const tick = () => {
          const now = performance.now(); samples.push(now - last); last = now; n++; t++;
          // 通过合成 mousemove 维持拖拽（每 3 帧一次，避免过度事件）
          if (t % 3 === 0) {
            const ev = new MouseEvent('mousemove', { bubbles: true, clientX: ${pt.x} + Math.sin(t*0.1)*40, clientY: ${pt.y} + Math.cos(t*0.1)*30 });
            document.querySelector('.aurora-graph__svg')?.dispatchEvent(ev);
          }
          if (n < 150) requestAnimationFrame(tick);
          else {
            const sorted = [...samples].sort((a,b)=>a-b);
            const p = (q) => sorted[Math.floor(sorted.length*q)];
            resolve({ frames: n,
              avg: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2),
              p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +Math.max(...samples).toFixed(2),
              over16_7: samples.filter(s=>s>16.7).length,
              over20: samples.filter(s=>s>20).length, over33: samples.filter(s=>s>33).length });
          }
        };
        requestAnimationFrame(tick);
      })
    `, true)
    const dragLongRaw = await evalJs('Array.isArray(window.__mcLong) ? window.__mcLong.slice() : null')
    const dragLong = Array.isArray(dragLongRaw) ? dragLongRaw : []
    console.log('\n=== T3 真实拖拽期（150 帧，力导向模拟运行）===')
    console.log('  帧间隔:', JSON.stringify(dragFrames))
    console.log('  长任务(>50ms):', Array.isArray(dragLongRaw) ? JSON.stringify(dragLong) : '（该环境不支持 longtask）')

    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x + 30, y: pt.y + 20, button: 'left', clickCount: 1 })
    await sleep(300)

    // ===== 对照分析（仅基于有效数据：帧间隔 + 掉帧计数）=====
    console.log('\n=== 对照分析（基于帧间隔，不看 longtask）===')
    const dAvg = dragFrames.avg - base.avg
    const dP95 = dragFrames.p95 - base.p95
    const dOver33 = dragFrames.over33 - base.over33
    console.log(`  avg: 基线 ${base.avg}ms → 拖拽 ${dragFrames.avg}ms  (Δ${dAvg >= 0 ? '+' : ''}${dAvg.toFixed(2)}ms)`)
    console.log(`  p95: 基线 ${base.p95}ms → 拖拽 ${dragFrames.p95}ms  (Δ${dP95 >= 0 ? '+' : ''}${dP95.toFixed(2)}ms)`)
    console.log(`  >20ms 帧数: 基线 ${base.over20} → 拖拽 ${dragFrames.over20}`)
    console.log(`  >33ms 帧数: 基线 ${base.over33} → 拖拽 ${dragFrames.over33}`)
    console.log(`  max: 基线 ${base.max}ms → 拖拽 ${dragFrames.max}ms`)

    // 判定：拖拽期 avg 不超过基线 +1.5ms，且严重掉帧(>33ms)不显著增加
    const degraded = dAvg > 1.5 || dOver33 > 3
    console.log(`\n  判定：${degraded
      ? '❌ 观测到拖动期帧率退化 —— 需进一步定位（本组件每帧 React 重渲染可疑）'
      : '✅ 未观测到显著退化（拖拽期帧间隔与基线同档）'}`)
    console.log(`  ⚠️ 规模边界：当前库仅 ${n} 个节点（DOM ${scale.svgTotal} 个元素）。`)
    console.log(`     此结论仅覆盖「当前规模无实证问题」，不等于「任意规模无问题」。`)
    console.log(`     若图谱增长到数百节点，须在此重测。`)
  } else {
    console.log('\n未找到可拖拽节点，无法执行拖拽测量')
  }

  ws.close(); edge.kill()
  setTimeout(() => { try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}; process.exit(0) }, 400)
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
