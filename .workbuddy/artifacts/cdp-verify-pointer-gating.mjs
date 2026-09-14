/**
 * PLAN-01 指针门控 · CDP 真机验证
 * ------------------------------------------------------------
 * 用真实 Chromium/Edge 打开 dev server，通过 CDP 的
 *   Emulation.setEmitTouchEventsForMouse + Emulation.setTouchEmulationEnabled
 * 把「指针类型」切到 coarse，再用 element.matches 直接判定媒体查询是否命中，
 * 并实测「点击后 hover 位移是否残留」。
 *
 * 验证两组：
 *  A. 触屏模拟（coarse）：
 *     - matchMedia('(pointer: coarse)') === true
 *     - 悬停一个位移型元素 → getComputedStyle(el).transform 应为 none
 *     - 开关打开态拇指 → transform 应含 translateX(16px)（复合豁免生效）
 *  B. 桌面（fine）：
 *     - matchMedia('(hover: hover) and (pointer: fine)') === true
 *     - 悬停位移型元素 → transform 不应为 none（hover 生效）
 *
 * 用法：node .workbuddy/artifacts/cdp-verify-pointer-gating.mjs
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = 'http://localhost:5174/'
const PORT = 9333
const profile = mkdtempSync(join(tmpdir(), 'edge-pg-'))

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function http(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`)
  return res.json()
}

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

let child
async function launch() {
  const { existsSync } = await import('node:fs')
  const bin = edgeCandidates.find(p => existsSync(p))
  if (!bin) throw new Error('Edge not found')
  child = spawn(bin, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    URL,
  ], { stdio: 'ignore', detached: false })
  for (let i = 0; i < 60; i++) {
    try { await http('/json/version'); return } catch { await sleep(250) }
  }
  throw new Error('CDP not ready')
}

let ws, msgId = 0
const pending = new Map()
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}

async function main() {
  await launch()
  const targets = await http('/json/list')
  const page = targets.find(t => t.type === 'page' && t.url.startsWith('http'))
  if (!page) throw new Error('no page target')

  const { WebSocket } = await import('ws')
  ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false })
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  ws.on('message', d => {
    const m = JSON.parse(d.toString())
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id)
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
    }
  })

  await send('Runtime.enable')
  await sleep(2500) // 等 React 挂载

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + JSON.stringify(r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }

  const results = []
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail !== undefined ? JSON.stringify(detail) : ''}`)
  }

  // ---------- 辅助：注入测试宿主，避免依赖真实业务页面结构 ----------
  const HOST = `
    (() => {
      let host = document.getElementById('pg-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'pg-host';
        host.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:auto;background:transparent';
        document.body.appendChild(host);
      }
      return host;
    })()
  `

  // 场景元素：真实类名（CSS 已被项目加载，类名一致即命中所有规则）
  const build = (cls, inner = '') => evalJs(`
    (() => {
      let host = document.getElementById('pg-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'pg-host';
        host.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:auto;background:transparent';
        document.body.appendChild(host);
      }
      host.innerHTML = '';
      const el = document.createElement('div');
      el.className = ${JSON.stringify(cls)};
      el.id = 'pg-target';
      el.style.cssText = 'width:120px;height:60px;background:#334;margin:20px;display:block';
      el.innerHTML = ${JSON.stringify(inner)};
      host.appendChild(el);
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()
  `)

  const readTransform = (sel) => evalJs(`
    (async () => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return null;
      // 等入场动画（welcome tile stagger 等）彻底结束，避免读到动画中值
      await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {})));
      return getComputedStyle(el).transform;
    })()
  `)

  // ============ A. 触屏模拟（coarse）============
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' })
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: true })
  await sleep(400)

  const coarse = await evalJs(`JSON.stringify({
    coarse: matchMedia('(pointer: coarse)').matches,
    noHover: matchMedia('(hover: none)').matches,
    gatingMatches: matchMedia('(hover: none), (pointer: coarse)').matches,
    fine: matchMedia('(hover: hover) and (pointer: fine)').matches
  })`)
  const c = JSON.parse(coarse)
  check('A1 触屏模拟下 media 命中粗指针', c.coarse === true && c.noHover === true, c)
  check('A2 门控媒体查询生效', c.gatingMatches === true && c.fine === false, c)

  // A3：位移型 hover 归零（卡片上浮）
  for (const cls of ['aurora-welcome__tile', 'aurora-blog-theme', 'kb-kbcard', 'kb-note']) {
    const rect = await build(cls)
    // 先等入场动画跑完（welcome tile 有 60ms/片 stagger + 420ms 入场，
    // 其 from 帧带 translateY(6px)，不等会读到动画中值 = 假失败）
    await evalJs(`(async () => { const el=document.getElementById('pg-target'); await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))); return true })()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y, button: 'none' })
    await sleep(420) // 等 hover 过渡（fast 180ms）走完再读稳态
    const t = await readTransform('#' + 'pg-target')
    // 归零判定：none 或 identity matrix（translate 分量为 0）
    const isNone = t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'
    check(`A3 ${cls} 悬停位移归零`, isNone, t)
  }

  // A4：缩放型 hover 归零
  for (const cls of ['aurora-cip__swatch', 'scroll-btn']) {
    const rect = await build(cls)
    await evalJs(`(async () => { const el=document.getElementById('pg-target'); await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))); return true })()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y, button: 'none' })
    await sleep(420)
    const t = await readTransform('#pg-target')
    const isNone = t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'
    check(`A4 ${cls} 悬停缩放归零`, isNone, t)
  }

  // A5：开关打开态拇指复合豁免
  await evalJs(`
    (() => {
      const host = ${HOST};
      host.innerHTML = '<div class="aurora-switch aurora-switch--on" id="pg-sw"><div class="aurora-switch__thumb" id="pg-thumb"></div></div>';
      const sw = document.getElementById('pg-sw');
      sw.style.cssText = 'position:relative;width:36px;height:20px;display:block;margin:20px';
      return true;
    })()
  `)
  const swRect = await evalJs(`(() => { const r = document.getElementById('pg-sw').getBoundingClientRect(); return {x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2)} })()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: swRect.x, y: swRect.y, button: 'none' })
  await sleep(160)
  const thumbT = await readTransform('#pg-thumb')
  // 期望：仍是 translateX(16px) 位移（matrix(1,0,0,1,16,0)），不带 scale
  const ok5 = !!thumbT && /matrix\(1,\s*0,\s*0,\s*1,\s*16,\s*0\)/.test(thumbT)
  check('A5 开关打开态拇指保留位移(16px)且无放大', ok5, thumbT)

  // ============ B. 桌面（fine）回归 ============
  // 关键：必须先把「鼠标事件转触摸」也关掉，否则 mouseMoved 被转成 touch，
  // 永远不会产生 :hover（B3 会假失败）
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: false })
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.clearDeviceMetricsOverride')
  await sleep(500)

  const fine = await evalJs(`JSON.stringify({
    fine: matchMedia('(hover: hover) and (pointer: fine)').matches,
    gatingMatches: matchMedia('(hover: none), (pointer: coarse)').matches
  })`)
  const f = JSON.parse(fine)
  check('B1 桌面指针类型恢复 fine', f.fine === true, f)
  check('B2 桌面上门控块不生效', f.gatingMatches === false, f)

  const br = await build('aurora-welcome__tile')
  await evalJs(`(async () => { const el=document.getElementById('pg-target'); await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))); return true })()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: br.x, y: br.y, button: 'none' })
  await sleep(450)
  const bt = await readTransform('#pg-target')
  const hoverStillWorks = !!bt && bt !== 'none' && !/matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(bt)
  check('B3 桌面 hover 位移仍生效（未误伤）', hoverStillWorks, bt)

  // 清理注入宿主
  await evalJs(`(() => { const h = document.getElementById('pg-host'); if (h) h.remove(); return true })()`)

  const failed = results.filter(r => !r.ok)
  console.log('\n========================================')
  console.log(failed.length === 0 ? 'ALL-CHECKS-PASSED' : `FAILED: ${failed.length}`)
  console.log('========================================')
  process.exitCode = failed.length === 0 ? 0 : 1
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exitCode = 2 })
  .finally(async () => {
    try { ws && ws.close() } catch {}
    await sleep(200)
    try { child && child.kill('SIGKILL') } catch {}
    await sleep(300)
    try { rmSync(profile, { recursive: true, force: true }) } catch {}
  })
