/**
 * GraphPanel 力导向每帧 reconcile 成本 · 规模压力测试
 * --------------------------------------------------------------------------
 * 缘起：PLAN-02 原定的「柱状图 height → scaleY」前提不成立（那两处都是死代码）。
 * 转向调查项目里**真正在用**的 rAF 图表：GraphPanel 的力导向模拟。
 *
 * 已知事实（代码层）：
 *   GraphPanel.tsx:735-744  loop() { step(); bump(); if (alpha>0.01||dragging) rAF(loop) }
 *   `bump` = useReducer dispatch（行 273）→ **每帧触发 React 重渲染**
 *   → 全量重算 + 全量 SVG reconcile（节点 <circle> + <text> + 边 <line> 全部走 JS 协调）
 *
 * 本探针要回答的问题：这个「每帧 React 重渲染」在真实规模下是否会掉帧？
 *
 * 方法（沿用项目已验证的 CDP 注入式方法论）：
 *   直接向页面注入与 GraphPanel 同构的 SVG（类名逐字一致 → 命中相同的 CSS 规则与浏览器渲染路径），
 *   在 rAF 循环里**每帧改写全部节点的 cx/cy 属性**（等价于 React 每帧 reconcile 后的 DOM 提交），
 *   逐级放大节点数（60 / 200 / 400），采样帧间隔。
 *
 * 为什么这样能代表真实组件：
 *   React 的 reconcile 最终产出的就是「对 N 个 SVG 元素的属性写入」。注入式把这个最终效果
 *   原样复现，因此测出的渲染/布局成本与真实组件同阶。它不能测出 React 协调本身的开销，
 *   但能回答「DOM 规模到多少会掉帧」这一关键问题 —— 而 React 协调只会让结论更悲观。
 *
 * 运行：node .workbuddy/artifacts/probe-graph-scale.mjs
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9337
const APP = 'http://127.0.0.1:5174/#view=graph'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-scale-'))
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
  for (let i = 0; i < 50; i++) {
    if (await evalJs(`!!document.querySelector('#aurora-root')?.children.length`)) break
    await sleep(300)
  }
  // 等图谱真正填充数据（前次探针在此处抢跑导致读到 0 节点）
  let n = 0
  for (let i = 0; i < 60; i++) {
    n = await evalJs(`document.querySelectorAll('.aurora-graph__dot').length`)
    if (n > 0) break
    await sleep(300)
  }
  console.log(`真实图谱节点数: ${n}`)

  // 用真实图谱的 SVG 作为宿主（保持真实布局上下文与视口尺寸）
  const hostInfo = await evalJs(`
    (() => {
      const svg = document.querySelector('.aurora-graph__svg');
      const b = svg.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y) };
    })()
  `)
  console.log('图谱视口:', JSON.stringify(hostInfo))

  /**
   * 注入压力场景：在页面 fixed 覆盖层里创建 N 个节点（circle+text）+ N 条边，
   * 类名与 GraphPanel 完全一致 → 命中相同 CSS；然后在 rAF 里每帧改写 cx/cy。
   */
  const setupStress = (count) => `
    (() => {
      document.getElementById('mc-stress')?.remove();
      const host = document.createElement('div');
      host.id = 'mc-stress';
      host.style.cssText = 'position:fixed;inset:24px;z-index:99999;background:var(--mc-bg-app)';
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'aurora-graph__svg');
      svg.setAttribute('width', String(${hostInfo.w}));
      svg.setAttribute('height', String(${hostInfo.h}));
      svg.setAttribute('viewBox', '0 0 ${hostInfo.w} ${hostInfo.h}');
      const g = document.createElementNS(NS, 'g');
      svg.appendChild(g);

      const W = ${hostInfo.w}, H = ${hostInfo.h};
      const rnd = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
      const store = [];

      // N 条边（模拟 GraphPanel 的 <line>）
      for (let i = 0; i < ${count}; i++) {
        const ln = document.createElementNS(NS, 'line');
        ln.setAttribute('class', 'aurora-graph__edge');
        ln.setAttribute('x1', String(80 + rnd(i * 3.1) * (W - 160)));
        ln.setAttribute('y1', String(60 + rnd(i * 7.7) * (H - 120)));
        ln.setAttribute('x2', String(80 + rnd(i * 11.3) * (W - 160)));
        ln.setAttribute('y2', String(60 + rnd(i * 13.9) * (H - 120)));
        g.appendChild(ln);
        store.push({ el: ln, kind: 'line', seed: i });
      }
      // N 个节点（模拟 <circle class="aurora-graph__dot"> + <text class="aurora-graph__label">）
      for (let i = 0; i < ${count}; i++) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'aurora-graph__dot aurora-graph__dot--file');
        c.setAttribute('r', '5');
        c.setAttribute('cx', String(80 + rnd(i * 2.3) * (W - 160)));
        c.setAttribute('cy', String(60 + rnd(i * 5.9) * (H - 120)));
        g.appendChild(c);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('class', 'aurora-graph__label');
        t.setAttribute('x', c.getAttribute('cx'));
        t.setAttribute('y', String(parseFloat(c.getAttribute('cy')) + 14));
        t.textContent = 'n' + i;
        g.appendChild(t);
        store.push({ el: c, kind: 'dot', seed: i }, { el: t, kind: 'text', seed: i });
      }
      host.appendChild(svg);
      document.body.appendChild(host);

      window.__mcStress = { store, frames: 0, raf: null, W, H };
      return { els: store.length, nodes: ${count} };
    })()
  `

  const runStress = (frames) => `
    new Promise((resolve) => {
      const S = window.__mcStress;
      const rnd = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
      const samples = []; let last = performance.now(); let n = 0; let t = 0;
      const tick = () => {
        const now = performance.now(); samples.push(now - last); last = now; n++; t++;
        // 每帧改写全部属性（等价 React reconcile 后的 DOM 提交）
        for (const it of S.store) {
          const ph = t * 0.02 + it.seed;
          const x = 80 + rnd(it.seed * 2.3 + Math.sin(ph) * 0.3) * (S.W - 160);
          const y = 60 + rnd(it.seed * 5.9 + Math.cos(ph) * 0.3) * (S.H - 120);
          if (it.kind === 'line') {
            it.el.setAttribute('x1', String(x)); it.el.setAttribute('y1', String(y));
            it.el.setAttribute('x2', String(x + 20)); it.el.setAttribute('y2', String(y + 20));
          } else if (it.kind === 'dot') {
            it.el.setAttribute('cx', String(x)); it.el.setAttribute('cy', String(y));
          } else {
            it.el.setAttribute('x', String(x)); it.el.setAttribute('y', String(y + 14));
          }
        }
        S.frames++;
        if (n < ${frames}) requestAnimationFrame(tick);
        else {
          const sorted = [...samples].sort((a,b)=>a-b);
          const p = (q) => sorted[Math.floor(sorted.length*q)];
          resolve({ frames: n,
            avg: +(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2),
            p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +Math.max(...samples).toFixed(2),
            over16_7: samples.filter(s=>s>16.7).length,
            over20ms: samples.filter(s=>s>20).length, over33ms: samples.filter(s=>s>33).length });
        }
      };
      requestAnimationFrame(tick);
    })
  `

  const results = []
  for (const count of [60, 200, 400]) {
    const setup = await evalJs(setupStress(count))
    await sleep(500) // 让首帧稳定
    const r1 = await evalJs(runStress(120), true)
    await sleep(200)
    const r2 = await evalJs(runStress(120), true)
    const merged = {
      count,
      els: setup?.els,
      runs: [r1, r2],
      avg: +((r1.avg + r2.avg) / 2).toFixed(2),
      p95: Math.max(r1.p95, r2.p95),
      over20: r1.over20ms + r2.over20ms,
      over33: r1.over33ms + r2.over33ms,
    }
    results.push(merged)
    console.log(`\n=== N=${count} 节点（${setup?.els} 个 SVG 元素）===`)
    console.log(`  帧间隔 avg=${merged.avg}ms  p95=${merged.p95}ms`)
    console.log(`  掉帧：>20ms ${merged.over20} 次 / >33ms ${merged.over33} 次（240 帧采样）`)
  }

  await evalJs(`document.getElementById('mc-stress')?.remove(); true`)

  console.log('\n=== 汇总（每帧改写全部属性）===')
  console.log('  节点数 | 元素数 | avg(ms) | p95(ms) | >20ms | >33ms')
  for (const r of results) {
    console.log(`  ${String(r.count).padStart(6)} | ${String(r.els).padStart(6)} | ${String(r.avg).padStart(7)} | ${String(r.p95).padStart(7)} | ${String(r.over20).padStart(5)} | ${String(r.over33).padStart(5)}`)
  }

  ws.close(); edge.kill()
  setTimeout(() => { try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}; process.exit(0) }, 400)
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
