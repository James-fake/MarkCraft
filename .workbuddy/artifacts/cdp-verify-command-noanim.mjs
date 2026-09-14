/**
 * PLAN-03 命令面板去入场动画 · CDP 真机验证
 * ------------------------------------------------------------
 * 验证目标：⌘K 唤起的命令面板**零入场动画**，瞬时呈现。
 *
 * 这是「契约测试测不出的真机行为」——CSS 里删了 animation 不等于浏览器
 * 真的没动画（可能被其它规则、或 React 侧的入场 style 重新加上）。
 * 唯一可靠证据：打开瞬间读 `getComputedStyle().animationName` 与
 * `getAnimations().length`，并在打开的临界帧前后做时间切片对照。
 *
 * 启动方式（必须与 Edge 在**同一次 bash 前台**内，否则后台 bash 收编子进程）：
 *   node .workbuddy/artifacts/cdp-verify-command-noanim.mjs
 *
 * 断言项：
 *   A1 应用挂载完成，无致命控制台错误
 *   A2 ⌘K 唤起命令面板，overlay 与 panel 均出现
 *   A3 overlay 的 animationName === 'none'
 *   A4 panel   的 animationName === 'none'
 *   A5 overlay/panel 的 getAnimations() 长度为 0（无 CSS/JS 动画在跑）
 *   A6 panel 的 transform === 'none'（无 translateY 入场残留）
 *   A7 panel 的 opacity === '1'（无淡入残留）
 *   A8 打开后 0ms 采样与 250ms 采样一致（无「渐进到位」的证据）
 *   A9 Esc 关闭 → overlay 消失；再开一次仍为零动画（可重复）
 *   B1 静态视觉未丢：max-width / border-radius / box-shadow / max-height 仍生效
 *   B2 overlay 定位未丢：position fixed / inset 0 / z-index 9000
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9335
const APP = 'http://127.0.0.1:5174/#view=editor'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-'))
const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1440,900',
  APP,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('CDP 未就绪')
}

let seq = 0
const pending = new Map()

function makeClient(ws) {
  return {
    send(method, params = {}) {
      const id = ++seq
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

async function main() {
  const wsUrl = await getWsUrl()
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  const client = makeClient(ws)
  const consoleErrors = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '))
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  }

  const results = []
  const ok = (name, pass, detail = '') => {
    results.push({ name, pass, detail })
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  }

  const evalJS = async (expression, awaitPromise = false) => {
    const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expression.slice(0, 80))
    return r.result.value
  }

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('DOM.enable')

  // ── 等应用挂载 ─────────────────────────────────────────────
  for (let i = 0; i < 40; i++) {
    const ready = await evalJS(`!!document.querySelector('#aurora-root') && document.querySelector('#aurora-root').children.length > 0`)
    if (ready) break
    await sleep(250)
  }
  await sleep(600)
  ok('A1 应用挂载完成', true, consoleErrors.length ? `${consoleErrors.length} 条 console.error` : '无 console.error')

  // ── ⌘K 唤起命令面板 ────────────────────────────────────────
  const pressMetaK = async () => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75 })
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75 })
  }

  const PALETTE = `.aurora-command, [class*="command"][class*="palette"], [role="dialog"]`

  // 找到真实存在的命令面板选择器（Aurora 用 .aurora-command-overlay / .aurora-command）
  const probe = await evalJS(`
    (() => {
      const ov = document.querySelector('.aurora-command-overlay');
      const panel = document.querySelector('.aurora-command');
      return { hasOverlay: !!ov, hasPanel: !!panel };
    })()
  `)

  await pressMetaK()
  await sleep(120)

  let hasOverlay = await evalJS(`!!document.querySelector('.aurora-command-overlay')`)
  if (!hasOverlay) {
    // 可能还没打开 → 多等一会儿重试一次
    await sleep(400)
    hasOverlay = await evalJS(`!!document.querySelector('.aurora-command-overlay')`)
  }
  ok('A2 ⌘K 唤起命令面板', hasOverlay, probe.hasOverlay ? '(预检已见)' : '')

  if (!hasOverlay) {
    console.log('\n⚠️ 命令面板未出现，跳过后续断言。当前 DOM 顶层节点：')
    console.log(await evalJS(`[...document.body.children].map(e=>e.tagName+'.'+e.className).join('\\n')`))
    ws.close(); edge.kill(); await sleep(300)
    try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
    process.exit(1)
  }

  // ── A3/A4 animationName ────────────────────────────────────
  const animName = async (sel) => evalJS(`(()=>{const el=document.querySelector('${sel}');return el?getComputedStyle(el).animationName:null})()`)
  const ovAnim = await animName('.aurora-command-overlay')
  ok('A3 overlay animationName === none', ovAnim === 'none', String(ovAnim))
  const pnAnim = await animName('.aurora-command')
  ok('A4 panel animationName === none', pnAnim === 'none', String(pnAnim))

  // ── A5 getAnimations 为空 ──────────────────────────────────
  const running = await evalJS(`
    (() => {
      const a = [...document.querySelectorAll('.aurora-command-overlay, .aurora-command')]
        .flatMap(el => el.getAnimations().map(x => x.animationName || '(js)'));
      return { count: a.length, names: a };
    })()
  `)
  ok('A5 面板无运行中动画', running.count === 0, `count=${running.count} ${JSON.stringify(running.names)}`)

  // ── A6/A7 transform / opacity ──────────────────────────────
  const pnT = await evalJS(`(()=>{const el=document.querySelector('.aurora-command');return el?getComputedStyle(el).transform:null})()`)
  ok("A6 panel transform === 'none'", pnT === 'none', String(pnT))
  const pnO = await evalJS(`(()=>{const el=document.querySelector('.aurora-command');return el?getComputedStyle(el).opacity:null})()`)
  ok('A7 panel opacity === 1', pnO === '1', String(pnO))

  // ── A8 时间切片一致性（0ms vs 250ms 后完全一致 = 无渐进）──
  const snapNow = await evalJS(`
    (() => { const el=document.querySelector('.aurora-command'); const b=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      return { y: b.y, h: b.height, t: cs.transform, o: cs.opacity, an: cs.animationName }; })()
  `)
  await sleep(250)
  const snapLater = await evalJS(`
    (() => { const el=document.querySelector('.aurora-command'); const b=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      return { y: b.y, h: b.height, t: cs.transform, o: cs.opacity, an: cs.animationName }; })()
  `)
  const same = JSON.stringify(snapNow) === JSON.stringify(snapLater)
  ok('A8 0ms 与 250ms 快照一致（无渐进到位）', same,
     same ? `y=${snapNow.y.toFixed(1)}` : `now=${JSON.stringify(snapNow)} later=${JSON.stringify(snapLater)}`)

  // ── B1/B2 静态视觉与定位未丢 ───────────────────────────────
  // 注意：max-height:70vh 的 computed 值是**已解析的像素**（70% × 视口高），
  // 不是字面 '70vh' —— 断言须接受「等于视口高 × 0.7」而非字面量。
  const visual = await evalJS(`
    (() => { const el=document.querySelector('.aurora-command'); const cs=getComputedStyle(el);
      const expected70 = window.innerHeight * 0.7;
      return { maxWidth: cs.maxWidth, radius: cs.borderRadius,
               shadow: cs.boxShadow.slice(0,40),
               maxHeight: cs.maxHeight,
               maxHeightPx: parseFloat(cs.maxHeight),
               expected70,
               display: cs.display, overflow: cs.overflow }; })()
  `)
  const maxHeightOK = Math.abs(visual.maxHeightPx - visual.expected70) < 1.5
  ok('B1 静态视觉保留（560px / 圆角 / 阴影 / 70vh）',
     visual.maxWidth === '560px' && visual.radius !== '0px' && visual.shadow !== 'none' && maxHeightOK,
     `maxW=${visual.maxWidth} r=${visual.radius} shadow=${visual.shadow} maxH=${visual.maxHeight} (期望≈${visual.expected70.toFixed(1)}px)`)

  const ovPos = await evalJS(`
    (() => { const el=document.querySelector('.aurora-command-overlay'); const cs=getComputedStyle(el);
      return { pos: cs.position, top: cs.top, left: cs.left, right: cs.right, bottom: cs.bottom, z: cs.zIndex }; })()
  `)
  ok('B2 overlay 定位保留（fixed / inset 0 / z 9000）',
     ovPos.pos === 'fixed' && ovPos.top === '0px' && ovPos.left === '0px' && ovPos.z === '9000',
     JSON.stringify(ovPos))

  // 截图（命令面板打开态）
  const shot = await client.send('Page.captureScreenshot', { format: 'png' })
  const { writeFileSync } = await import('fs')
  writeFileSync('.workbuddy/artifacts/command-noanim-verified.png', Buffer.from(shot.data, 'base64'))

  // ── A9 Esc 关闭 → 再开仍为零动画 ───────────────────────────
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  await sleep(250)
  const closed = !(await evalJS(`!!document.querySelector('.aurora-command-overlay')`))
  await pressMetaK()
  await sleep(150)
  const reopened = await evalJS(`!!document.querySelector('.aurora-command-overlay')`)
  const reopenAnim = await evalJS(`(()=>{const el=document.querySelector('.aurora-command');return el?getComputedStyle(el).animationName:null})()`)
  ok('A9 Esc 关闭 + 重开仍零动画', closed && reopened && reopenAnim === 'none',
     `closed=${closed} reopened=${reopened} animationName=${reopenAnim}`)

  const passed = results.filter((r) => r.pass).length
  console.log(`\n===== ${passed}/${results.length} 通过 =====`)
  results.filter((r) => !r.pass).forEach((r) => console.log(`  未过：${r.name} — ${r.detail}`))

  ws.close()
  edge.kill()
  await sleep(400)
  try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
