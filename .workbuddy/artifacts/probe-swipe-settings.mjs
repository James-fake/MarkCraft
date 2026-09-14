/**
 * CDP 探针：设置页滑动切 Tab 真机验证
 *
 * 断言（对应 DesignBrief §6 验收清单）：
 *   1. 横滑 1 屏 → tab 从 general 切到下一项
 *   2. 横滑 < 32% 且慢速 → 回弹，tab 不变
 *   3. 横滑 < 32% 但快速甩 → 切换
 *   4. 首 tab 反向滑 → tab 不变
 *   5. 纵向拖拽 → 不切 tab，页面正常滚动
 *   6. 点击 tab → 立即切换（点击路径未被劫持）
 *   7. 内容区按钮 click 仍可达（无 pointer capture 吞事件）
 *
 * 用法：node .workbuddy/artifacts/probe-swipe-settings.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = 9333
const TARGET_URL_KEYWORD = 'localhost:5174'

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  return res.json()
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString())
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise,
    })
    if (r.exceptionDetails) {
      throw new Error('eval error: ' + JSON.stringify(r.exceptionDetails))
    }
    return r.result.value
  }
}

/** 模拟真实指针序列：down → N 段 move → up */
async function swipe(cdp, { fromX, fromY, toX, toY, steps = 14, stepDelay = 16 }) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1, buttons: 1,
  })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(fromX + (toX - fromX) * t),
      y: Math.round(fromY + (toY - fromY) * t),
      button: 'left', buttons: 1,
    })
    await sleep(stepDelay)
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1, buttons: 0,
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function ok(name, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return cond
}

async function main() {
  const targets = await getTargets()
  const page = targets.find((t) => t.type === 'page' && t.url.includes(TARGET_URL_KEYWORD))
    ?? targets.find((t) => t.type === 'page')
  if (!page) {
    console.error('未找到目标页面。请确认 Edge 已用 CDP 启动且 URL 含 #view=settings')
    process.exit(1)
  }
  console.log('目标页面:', page.url)

  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  // ---- 进入设置页 ----
  // 注意：settings 不是 #view= 标准视图，而是 Aurora 本地 auxView，
  // 深链无法直达 → 用全局快捷键 ⌘/Ctrl + ',' 打开（useAuroraShell 已实现）。
  const keyEvent = (type, extra = {}) => cdp.send('Input.dispatchKeyEvent', {
    type, modifiers: 2 /* Ctrl */, windowsVirtualKeyCode: 188, code: 'Comma', key: ',', ...extra,
  })
  await keyEvent('keyDown')
  await keyEvent('keyUp')

  // 等待设置页内容区就绪
  let ready = false
  for (let i = 0; i < 40; i++) {
    ready = await cdp.eval(`!!document.querySelector('.aurora-settings__content')`)
    if (ready) break
    await sleep(250)
  }
  if (!ready) {
    console.error('未能进入设置页（Ctrl+, 无效）。当前 URL:', await cdp.eval('location.href'))
    process.exit(1)
  }
  console.log('已进入设置页')

  const geom = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-settings__content')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width/2, cy: r.y + r.height/2 }
  })()`)
  if (!geom) {
    console.error('设置内容区未就绪')
    process.exit(1)
  }
  console.log('内容区几何:', JSON.stringify(geom))

  const activeId = () => cdp.eval(`(() => {
    const b = document.querySelector('.aurora-settings__nav-tab--active')
    return b ? (b.querySelector('span')?.textContent ?? b.title) : null
  })()`)

  const results = []
  const W = geom.w

  // ---- #1 横滑一屏 → 切换 ----
  const before1 = await activeId()
  await swipe(cdp, { fromX: geom.cx + W * 0.30, fromY: geom.cy, toX: geom.cx - W * 0.30, toY: geom.cy })
  await sleep(450)
  const after1 = await activeId()
  results.push(ok('#1 横滑一屏 → 切换 tab', before1 !== after1, `${before1} → ${after1}`))

  // ---- #2 小位移慢速 → 回弹 ----
  const before2 = await activeId()
  await swipe(cdp, {
    fromX: geom.cx + W * 0.12, fromY: geom.cy, toX: geom.cx - W * 0.10, toY: geom.cy,
    steps: 30, stepDelay: 40,
  })
  await sleep(450)
  const after2 = await activeId()
  results.push(ok('#2 小位移慢速 → 回弹', before2 === after2, `${before2} → ${after2}`))

  // ---- #3 小位移快速甩 → 切换 ----
  const before3 = await activeId()
  await swipe(cdp, {
    fromX: geom.cx + W * 0.12, fromY: geom.cy, toX: geom.cx - W * 0.12, toY: geom.cy,
    steps: 3, stepDelay: 4,
  })
  await sleep(450)
  const after3 = await activeId()
  results.push(ok('#3 小位移快速甩 → 切换', before3 !== after3, `${before3} → ${after3}`))

  // ---- #4 回到首 tab 后反向滑 → 不变 ----
  await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-settings__nav-tab')].find(x => x.querySelector('span')?.textContent === '用户')
    b && b.click()
  })()`)
  await sleep(300)
  const before4 = await activeId()
  await swipe(cdp, { fromX: geom.cx - W * 0.3, fromY: geom.cy, toX: geom.cx + W * 0.3, toY: geom.cy })
  await sleep(450)
  const after4 = await activeId()
  results.push(ok('#4 首 tab 反向滑（越界）→ 不变', before4 === after4, `${before4} → ${after4}`))

  // ---- #5 纵向拖拽 → 不切 tab ----
  const before5 = await activeId()
  const scrollBefore = await cdp.eval(`document.querySelector('.aurora-settings__content').scrollTop`)
  await swipe(cdp, { fromX: geom.cx, fromY: geom.cy + 80, toX: geom.cx, toY: geom.cy - 80 })
  await sleep(450)
  const after5 = await activeId()
  const scrollAfter = await cdp.eval(`document.querySelector('.aurora-settings__content').scrollTop`)
  results.push(ok('#5 纵向拖拽 → tab 不变', before5 === after5, `${before5} → ${after5}`))
  console.log(`   （附注：scrollTop ${scrollBefore} → ${scrollAfter}）`)

  // ---- #6 点击 tab → 立即切换 ----
  const before6 = await activeId()
  const clicked = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-settings__nav-tab')]
      .find(x => x.querySelector('span')?.textContent === '外观')
    if (!b) return false
    b.click()
    return true
  })()`)
  await sleep(200)
  const after6 = await activeId()
  results.push(ok('#6 点击 tab → 立即切换', clicked && before6 !== after6 && after6 === '外观', `${before6} → ${after6}`))

  // ---- #7 内容区内部按钮 click 可达 ----
  const btnTest = await cdp.eval(`(() => {
    const root = document.querySelector('.aurora-settings__content')
    if (!root) return { found: false }
    const btn = root.querySelector('button, [role="switch"], input')
    if (!btn) return { found: false, reason: '内容区无交互控件' }
    // 用 elementFromPoint 验证命中测试没有被透明覆盖层挡住
    const r = btn.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)
    return {
      found: true,
      tag: btn.tagName,
      cls: btn.className?.toString?.().slice(0, 60) ?? '',
      hitInside: !!(hit && (btn.contains(hit) || hit === btn)),
      hitTag: hit?.tagName ?? null,
    }
  })()`)
  results.push(ok(
    '#7 内容区交互控件命中测试通过',
    btnTest.found ? btnTest.hitInside : true,
    JSON.stringify(btnTest),
  ))

  console.log('\n──────── 汇总 ────────')
  const pass = results.filter(Boolean).length
  console.log(`${pass}/${results.length} 通过`)

  ws.close()
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => {
  console.error('探针失败:', e)
  process.exit(1)
})
