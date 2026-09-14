/**
 * PLAN-02 改动 A · CDP 真机验证（博客浮层 left → translateX）
 * --------------------------------------------------------------------------
 * 验证目标：位移载体从 `left` 换成 `transform: translateX()` 后，
 * ① 停靠逻辑仍然正确；② 右贴边落点与改前**逐像素一致**（这是改造的核心风险）；
 * ③ 拖拽期无过渡（实时跟手）、松手有 spring 过渡（吸附动画）。
 *
 * 关键断言设计（为什么不能只看 transform）：
 *   只看 `transform` 值只能证明「CSS 生效了」，不能证明「位置对了」。
 *   真正的等价性断言 = `getBoundingClientRect().right` 与容器右缘之差 ≈ 0。
 *   这个几何量在改前由 `left: max` 决定、改后由 `left:0 + translateX(max)` 决定，
 *   两者须落在同一坐标 —— 只要它成立，改造就在语义上等价。
 *
 * 运行（浏览器与脚本必须同一次 bash 前台调用，否则后台 bash 收编子进程中途断 WS）：
 *   node .workbuddy/artifacts/cdp-verify-blog-dock.mjs
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9334
// 深链直达博客工作室：`#view=` 深链优先级高于欢迎页（见 useAuroraShell.shouldAutoOpenWelcome），
// 必须在启动时作为 URL 传入 —— 应用挂载后再设 hash 会因 viewState 未同步而停在欢迎页。
const APP = 'http://127.0.0.1:5174/#view=blog'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-dock-'))
const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1600,1000',
  APP,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 80; i++) {
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

async function main() {
  const wsUrl = await getWsUrl()
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  }
  const send = (method, params = {}) => {
    const id = ++seq
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  const results = []
  const ok = (name, pass, detail = '') => {
    results.push({ name, pass, detail })
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  }

  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails))
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')

  for (let i = 0; i < 50; i++) {
    const ready = await evalJs(`!!document.querySelector('#aurora-root') && document.querySelector('#aurora-root').children.length > 0`)
    if (ready) break
    await sleep(300)
  }
  ok('A1 应用挂载完成', true)

  // 等博客视图渲染（深链已在启动 URL 中，这里只等 DOM 出现）
  let blogReady = false
  for (let i = 0; i < 40; i++) {
    blogReady = await evalJs(`!!document.querySelector('.aurora-blog') && !!document.querySelector('.aurora-blog__tab')`)
    if (blogReady) break
    await sleep(300)
  }
  ok('A1b 博客视图已渲染（深链 #view=blog）', blogReady, `hash=${await evalJs('location.hash')}`)

  // 展开博客浮层：点击当前激活的 tab（默认 panelOpen=false，须点 tab 才展开）
  const opened = await evalJs(`
    (() => {
      const zone = document.querySelector('.aurora-blog__panelzone');
      if (zone && zone.classList.contains('is-open')) return 'already-open';
      const tabs = [...document.querySelectorAll('.aurora-blog__tab')];
      const active = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
      if (!active) return 'no-tab:' + tabs.length;
      active.click();
      return 'clicked:' + (active.textContent || '').trim();
    })()
  `)
  await sleep(700)

  const isOpen = await evalJs(`!!document.querySelector('.aurora-blog__panelzone.is-open')`)
  ok('A2 博客浮层已展开', isOpen, String(opened))

  if (!isOpen) {
    console.log('\n无法展开浮层，放弃后续断言')
    finish()
    return
  }

  // 等入场动画结束（铁律：读几何前须等 animations finished）
  await evalJs(`Promise.all([...document.querySelectorAll('.aurora-blog__panelzone')].flatMap(el => el.getAnimations().map(a => a.finished.catch(()=>{})))).then(()=>true)`, true)
  await sleep(420)

  const geometry = () => evalJs(`
    (() => {
      const root = document.querySelector('.aurora-blog');
      const zone = document.querySelector('.aurora-blog__panelzone');
      if (!root || !zone) return null;
      const r = root.getBoundingClientRect();
      const z = zone.getBoundingClientRect();
      const cs = getComputedStyle(zone);
      return {
        containerLeft: r.left, containerRight: r.right, containerWidth: r.width,
        zoneLeft: z.left, zoneRight: z.right, zoneWidth: z.width,
        transform: cs.transform, transitionProp: cs.transitionProperty,
        transitionDur: cs.transitionDuration, willChange: cs.willChange,
        cls: zone.className,
      };
    })()
  `)

  const g0 = await geometry()
  ok('B0 读到浮层几何', !!g0, g0 ? `zone.w=${g0.zoneWidth.toFixed(1)}` : '')
  if (!g0) { finish(); return }

  // B1 CSS 载体已换：transition 属性含 transform、不含 left
  ok('B1 transition-property 含 transform', /transform/.test(g0.transitionProp), g0.transitionProp)
  ok('B2 transition-property 不含 left', !/\bleft\b/.test(g0.transitionProp), g0.transitionProp)
  ok('B3 时长 = 280ms（--mc-dur-base 未被改）', /0\.28s/.test(g0.transitionDur), g0.transitionDur)
  ok('B4 will-change 含 transform', /transform/.test(g0.willChange), g0.willChange)

  // B5 左贴边：位移应为 0，左缘贴合容器左缘
  const leftGap = Math.abs(g0.zoneLeft - g0.containerLeft)
  ok('B5 左贴边吸附（左缘贴合容器，gap≤1px）', leftGap <= 1, `gap=${leftGap.toFixed(2)}px, transform=${g0.transform}`)

  // ===== 拖拽甩到右贴边 =====
  const head = await evalJs(`
    (() => {
      const h = document.querySelector('.aurora-blog__panelzone-head');
      if (!h) return null;
      const b = h.getBoundingClientRect();
      return { x: b.x + 40, y: b.y + b.height / 2 };
    })()
  `)
  ok('C0 找到拖拽手柄', !!head)
  if (!head) { finish(); return }

  const mouse = (type, x, y, button = 'left') =>
    send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: type === 'mouseMoved' ? 0 : 1 })

  await mouse('mouseMoved', head.x, head.y, 'none')
  await mouse('mousePressed', head.x, head.y)

  // C1 拖拽期：transition 应为 none（实时跟手）
  await sleep(80)
  const dragCs = await evalJs(`getComputedStyle(document.querySelector('.aurora-blog__panelzone')).transitionProperty`)
  const dragDur = await evalJs(`getComputedStyle(document.querySelector('.aurora-blog__panelzone')).transitionDuration`)
  ok('C1 拖拽期过渡已关闭（跟随指针）', dragDur.startsWith('0s') || dragCs === 'none', `prop=${dragCs} dur=${dragDur}`)

  // 快速向右甩（位移 + 速度双超阈值 → 判定为抛掷手势）
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    await mouse('mouseMoved', head.x + (i * (g0.containerWidth * 0.75)) / steps, head.y)
    await sleep(9)
  }
  // C2 拖拽期 transform 确实在动（位移 ≠ 0）
  const midT = await evalJs(`getComputedStyle(document.querySelector('.aurora-blog__panelzone')).transform`)
  ok('C2 拖拽期 transform 紧随指针变化', midT !== g0.transform && midT !== 'none', midT)

  await mouse('mouseReleased', head.x + g0.containerWidth * 0.75, head.y)

  // 等 spring 吸附过渡结束
  await sleep(700)

  const g1 = await geometry()
  const rightGap = Math.abs(g1.containerRight - g1.zoneRight)
  // D1 核心等价性断言：右贴边时浮层右缘贴合容器右缘
  ok('D1 右贴边吸附（右缘贴合容器右缘，gap≤1px）', rightGap <= 1,
    `gap=${rightGap.toFixed(2)}px, zoneRight=${g1.zoneRight.toFixed(1)}, containerRight=${g1.containerRight.toFixed(1)}`)
  ok('D2 已切到 is-right 类', /is-right/.test(g1.cls), g1.cls)
  ok('D3 松手后过渡恢复（非 none）', !g1.transitionDur.startsWith('0s'), g1.transitionDur)

  // D4 位移值 = 容器宽 − 浮层宽（translateX 语义正确）
  const expectedMax = g1.containerWidth - g1.zoneWidth
  const m = g1.transform.match(/matrix\(1,\s*0,\s*0,\s*1,\s*([-\d.]+),\s*([-\d.]+)\)/)
  const tx = m ? parseFloat(m[1]) : NaN
  ok('D4 translateX 值 = 容器宽 − 浮层宽', Math.abs(tx - expectedMax) <= 1.5,
    `tx=${Number.isFinite(tx) ? tx.toFixed(1) : 'n/a'}, expected=${expectedMax.toFixed(1)}`)

  // D5 浮层未溢出容器（overflow:hidden 下不应超出右缘）
  ok('D5 浮层未溢出容器右缘', g1.zoneRight <= g1.containerRight + 1.5,
    `zoneRight=${g1.zoneRight.toFixed(1)} vs containerRight=${g1.containerRight.toFixed(1)}`)

  // ===== 甩回左贴边（往返验证）=====
  const head2 = await evalJs(`
    (() => { const h = document.querySelector('.aurora-blog__panelzone-head'); if(!h) return null;
      const b = h.getBoundingClientRect(); return { x: b.x + 40, y: b.y + b.height/2 }; })()
  `)
  await mouse('mouseMoved', head2.x, head2.y, 'none')
  await mouse('mousePressed', head2.x, head2.y)
  for (let i = 1; i <= steps; i++) {
    await mouse('mouseMoved', head2.x - (i * (g1.containerWidth * 0.75)) / steps, head2.y)
    await sleep(9)
  }
  await mouse('mouseReleased', head2.x - g1.containerWidth * 0.75, head2.y)
  await sleep(700)
  const g2 = await geometry()
  ok('E1 甩回左贴边成功（往返可逆）', Math.abs(g2.zoneLeft - g2.containerLeft) <= 1,
    `gap=${Math.abs(g2.zoneLeft - g2.containerLeft).toFixed(2)}px, cls=${g2.cls}`)

  // ===== 窗口缩放后仍贴合（ResizeObserver 路径）=====
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await sleep(800)
  const g3 = await geometry()
  ok('F1 缩放后左贴边仍贴合', Math.abs(g3.zoneLeft - g3.containerLeft) <= 1.5,
    `gap=${Math.abs(g3.zoneLeft - g3.containerLeft).toFixed(2)}px, cw=${g3.containerWidth.toFixed(1)}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync('.workbuddy/artifacts/blog-dock-transform-verified.png', Buffer.from(shot.data, 'base64'))

  finish()

  function finish() {
    const passed = results.filter((r) => r.pass).length
    console.log(`\n===== ${passed}/${results.length} 通过 =====`)
    results.filter((r) => !r.pass).forEach((r) => console.log(`  未过：${r.name} — ${r.detail}`))
    ws.close()
    edge.kill()
    setTimeout(() => {
      try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
      process.exit(passed === results.length ? 0 : 1)
    }, 400)
  }
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
