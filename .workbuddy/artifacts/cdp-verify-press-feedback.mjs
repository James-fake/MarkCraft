/**
 * PLAN-04 按压反馈 · CDP 真机验证
 * ------------------------------------------------------------
 * 验证目标：主按钮族按下时是否真的产生 scale(0.97) 物理下沉，
 * 且松手后回到 none。这是「契约测试测不出的真机行为」——
 * CSS 里写了 scale 不等于浏览器真的应用了（可能被更具体的规则覆盖）。
 *
 * 启动方式（必须与 Edge 在**同一次 bash 前台**内，否则后台 bash 收编子进程）：
 *   node .workbuddy/artifacts/cdp-verify-press-feedback.mjs
 *
 * 断言项：
 *   A1 页面加载，控制台无致命错误
 *   A2 注入真实按钮 DOM（复用 .aurora-btn 类名 → CSS 规则真实命中）
 *   A3 mousePressed 后 transform = matrix(0.97,0,0,0.97,0,0)
 *   A4 **按住保持**：press 后等 400ms 再读，仍为 0.97（不是一闪而过）
 *   A5 mouseReleased 后回到 none（或过渡中）
 *   A6 五个变体逐一验证
 *   A7 disabled 按钮按下**不**缩小（pointer-events:none 生效）
 *   A8 blog 按钮变体同样成立
 *   B1 过渡时长 = --mc-dur-fast（180ms），读 computed transition-duration
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9333
const APP = 'http://127.0.0.1:5174/'

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
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
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

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('DOM.enable')

  // 等应用挂载
  for (let i = 0; i < 40; i++) {
    const r = await client.send('Runtime.evaluate', {
      expression: `!!document.querySelector('#aurora-root') && document.querySelector('#aurora-root').children.length > 0`,
      returnByValue: true,
    })
    if (r.result.value) break
    await sleep(250)
  }
  ok('A1 应用挂载完成', true)

  // 注入真实按钮 DOM（类名一致 → CSS 真实命中）
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('mc-probe-host')?.remove();
        const host = document.createElement('div');
        host.id = 'mc-probe-host';
        host.setAttribute('style', 'position:fixed;inset:24px;z-index:99999;display:flex;flex-direction:column;gap:12px;background:#111;padding:16px;');
        const variants = ['primary','secondary','ghost','danger','danger-solid'];
        host.innerHTML =
          variants.map(v => '<button class="aurora-btn aurora-btn--'+v+'" data-v="'+v+'" style="height:32px;padding:0 16px">'+v+'</button>').join('') +
          '<button class="aurora-btn aurora-btn--primary" data-v="disabled" disabled>disabled</button>' +
          '<button class="aurora-blog-btn aurora-blog-btn--primary" data-v="blog">blog primary</button>';
        document.body.appendChild(host);
        return host.children.length;
      })()
    `,
    returnByValue: true,
  })

  // 等入场动画全部结束（铁律：读 transform 前须等 animations finished）
  await client.send('Runtime.evaluate', {
    expression: `Promise.all([...document.querySelectorAll('#mc-probe-host *')].flatMap(el => el.getAnimations().map(a => a.finished.catch(()=>{})))).then(()=>true)`,
    awaitPromise: true,
    returnByValue: true,
  })
  await sleep(420)

  const rect = async (sel) => {
    const r = await client.send('Runtime.evaluate', {
      expression: `(()=>{const el=document.querySelector('${sel}');if(!el)return null;const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`,
      returnByValue: true,
    })
    return r.result.value
  }

  const readTransform = async (sel) => {
    const r = await client.send('Runtime.evaluate', {
      expression: `getComputedStyle(document.querySelector('${sel}')).transform`,
      returnByValue: true,
    })
    return r.result.value
  }

  const pressAndHold = async (pt, holdMs) => {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' })
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
    await sleep(holdMs)
  }

  const release = async (pt) => {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
  }

  const variants = ['primary', 'secondary', 'ghost', 'danger', 'danger-solid']
  for (const v of variants) {
    const sel = `[data-v="${v}"]`
    const pt = await rect(sel)
    if (!pt) { ok(`A6.${v} 元素存在`, false, '未找到'); continue }
    await pressAndHold(pt, 260) // 超过过渡时长 180ms → 到达稳定态
    const t = await readTransform(sel)
    const pressed = /matrix\(0\.97,\s*0,\s*0,\s*0\.97/.test(t)
    ok(`A3.${v} 按下 = scale(0.97)`, pressed, t)
    await sleep(200) // 继续按住，验证「保持」
    const t2 = await readTransform(sel)
    ok(`A4.${v} 按住保持缩小态`, /matrix\(0\.97,\s*0,\s*0,\s*0\.97/.test(t2), t2)
    await release(pt)
    await sleep(260)
    const t3 = await readTransform(sel)
    ok(`A5.${v} 松手回到 none`, t3 === 'none' || /matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(t3), t3)
    await sleep(120)
  }

  // A7 disabled 不缩小
  {
    const pt = await rect('[data-v="disabled"]')
    await pressAndHold(pt, 260)
    const t = await readTransform('[data-v="disabled"]')
    ok('A7 disabled 按下不缩小（pointer-events:none）', !/matrix\(0\.97/.test(t), t)
    await release(pt)
    await sleep(150)
  }

  // A8 blog 按钮
  {
    const pt = await rect('[data-v="blog"]')
    await pressAndHold(pt, 260)
    const t = await readTransform('[data-v="blog"]')
    ok('A8 blog 按钮按下 = scale(0.97)', /matrix\(0\.97,\s*0,\s*0,\s*0\.97/.test(t), t)
    await release(pt)
    await sleep(200)
  }

  // B1 过渡时长
  {
    const r = await client.send('Runtime.evaluate', {
      expression: `getComputedStyle(document.querySelector('[data-v="primary"]')).transitionDuration`,
      returnByValue: true,
    })
    const d = r.result.value
    ok('B1 过渡含 0.18s（--mc-dur-fast）', /0\.18s/.test(d), d)
  }

  // 截图
  const shot = await client.send('Page.captureScreenshot', { format: 'png' })
  const { writeFileSync } = await import('fs')
  writeFileSync('.workbuddy/artifacts/press-feedback-verified.png', Buffer.from(shot.data, 'base64'))

  // 按住态截图（单独一张，直观展示下沉）
  {
    const pt = await rect('[data-v="primary"]')
    await pressAndHold(pt, 260)
    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.workbuddy/artifacts/press-feedback-pressed.png', Buffer.from(shot2.data, 'base64'))
    await release(pt)
  }

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
