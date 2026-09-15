/**
 * 四面板复验：在【顶栏功能切换 tab 栏本身内】横向拖动是否能切 Tab
 *
 * 用户诉求原文：「顶栏的功能切换 tab，支持左右滑动」
 * 本脚本逐面板验证 tab 栏内拖动（而非内容区拖动）路径。
 *
 * 面板与 tab 栏选择器：
 *   settings → .aurora-settings__nav-tabs  / 激活 .aurora-settings__nav-tab--active
 *   kb       → .aurora-kb-subbar-tabs      / 激活 .aurora-kb-subbar-tab--active
 *   blog     → .aurora-blog__subseg        / 激活 .aurora-blog__subseg-btn--active
 *   canvas   → .aurora-csp__tabs           / 激活 .aurora-csp__tab--active
 */
import { WebSocket } from 'ws'
const CDP_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
}

async function swipe(cdp, { fromX, fromY, toX, toY, steps = 16, stepDelay = 16 }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: Math.round(fromX + (toX - fromX) * t), y: Math.round(fromY + (toY - fromY) * t), button: 'left', buttons: 1,
    })
    await sleep(stepDelay)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1, buttons: 0 })
}

async function key(cdp, { modifiers = 0, keyCode, code, key }) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, windowsVirtualKeyCode: keyCode, code, key })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, windowsVirtualKeyCode: keyCode, code, key })
}

/** 侧栏导航：按可见文案点击（侧栏按钮类名统一 .aurora-sidebar-item） */
const clickSidebar = (label) => `(() => {
  const items = [...document.querySelectorAll('.aurora-sidebar-item')]
  const hit = items.find(e => (e.textContent || '').includes('${label}'))
  if (!hit) return 'NOT_FOUND'
  hit.click()
  return 'CLICKED'
})()`

/** 面板定义 */
const PANELS = [
  {
    name: '设置页',
    enter: (cdp) => key(cdp, { modifiers: 2, keyCode: 188, code: 'Comma', key: ',' }),
    ready: '.aurora-settings',
    bar: '.aurora-settings__nav-tabs',
    active: '.aurora-settings__nav-tab--active',
    content: '.aurora-settings__content',
  },
  {
    name: '知识库',
    enter: (cdp) => cdp.eval(clickSidebar('知识库')),
    // 知识库需先打开某个 KB 才出现 subbar tab 行；若停在列表页则用列表页的 tab 行
    ready: '.aurora-kb',
    bar: '.aurora-kb-subbar-tabs',
    active: '.aurora-kb-subbar-tab.is-active',
    content: '.aurora-kb-content',
  },
  {
    name: '博客工作室',
    enter: (cdp) => cdp.eval(clickSidebar('博客')),
    ready: '.aurora-blog',
    bar: '.aurora-blog__subseg',
    active: '.aurora-blog__subseg-btn.is-active',
    content: '.aurora-blog__panelzone-body',
  },
  {
    name: '白板',
    enter: (cdp) => cdp.eval(clickSidebar('白板')),
    ready: '.aurora-csp',
    bar: '.aurora-csp__tabs',
    active: '.aurora-csp__tab--active',
    content: '.aurora-csp__body',
  },
]

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  if (!page) { console.error('未找到 5174 页面'); process.exit(1) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  // ⚠️ 全新 profile 会弹出「受众首启引导」（.aurora-audience，position:fixed;inset:0），
  //    它的 backdrop 会吞掉所有指针事件 → 手势探针必然假失败。
  //    这里先等 app 就绪，再关掉引导（或直接写 localStorage 标记后刷新）。
  await cdp.eval(`new Promise(r => { const i = setInterval(() => { if (document.querySelector('.aurora-page')) { clearInterval(i); r(1) } }, 50); setTimeout(() => { clearInterval(i); r(0) }, 12000) })`)
  await sleep(600)
  const onboardVisible = await cdp.eval(`!!document.querySelector('.aurora-audience')`)
  if (onboardVisible) {
    console.log('检测到首启引导浮层，先关闭…')
    await cdp.eval(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes('开始使用'))
      if (btn) { btn.click(); return 'CLICKED' }
      try { localStorage.setItem('markcraft.onboarding.seen', '1') } catch {}
      return 'FLAG_SET'
    })()`)
    await sleep(900)
    if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
      // 兜底：直接移除浮层节点
      await cdp.eval(`(() => { const el = document.querySelector('.aurora-audience'); el && el.remove(); return 'REMOVED' })()`)
    }
    await sleep(400)
  }
  console.log('引导浮层已清除:', !(await cdp.eval(`!!document.querySelector('.aurora-audience')`)))

  const results = []
  let coldStart = true

  for (const p of PANELS) {
    console.log(`\n=== ${p.name} ===`)
    await p.enter(cdp)

    // 冷启动/切面板后必须等几何稳态：连续两次采样一致才算就绪
    // （否则会在飞入动画中途取到错的 rect —— 这是第一轮假失败的根因）
    let geo = null
    for (let attempt = 0; attempt < 12; attempt++) {
      await sleep(coldStart ? 500 : 300)
      const ok = await cdp.eval(`!!document.querySelector('${p.ready}')`)
      if (!ok) continue
      const g1 = await cdp.eval(`(() => {
        const bar = document.querySelector('${p.bar}')
        if (!bar) return null
        const r = bar.getBoundingClientRect()
        const activeEl = document.querySelector('${p.active}')
        return { x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2, active: activeEl ? activeEl.textContent.trim() : null, count: bar.children.length }
      })()`)
      await sleep(120)
      const g2 = await cdp.eval(`(() => {
        const bar = document.querySelector('${p.bar}')
        if (!bar) return null
        const r = bar.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2 }
      })()`)
      if (g1 && g2 && Math.abs(g1.x - g2.x) < 1 && Math.abs(g1.w - g2.w) < 1 && Math.abs(g1.y - g2.y) < 1) { geo = g1; break }
    }
    coldStart = false

    if (!geo) { console.log(`  ⚠️ 面板/tab 栏未就绪（${p.bar}），跳过`); results.push({ name: p.name, status: 'SKIP' }); continue }
    console.log(`  tab 栏几何: x=${Math.round(geo.x)} w=${Math.round(geo.w)} cy=${Math.round(geo.cy)} | 激活="${geo.active}" | 子项=${geo.count}`)

    if (geo.w < 60) { console.log('  ⚠️ tab 栏过窄，无法做横向拖动测试'); results.push({ name: p.name, status: 'TOO_NARROW' }); continue }

    // 命中测试守卫：拖动起点必须真的落在 tab 栏内（否则是被浮层遮挡 → 结果无意义）
    const probeX = Math.round(geo.x + geo.w * 0.8)
    const probeY = Math.round(geo.cy)
    const hitInfo = await cdp.eval(`(() => {
      const bar = document.querySelector('${p.bar}')
      const el = document.elementFromPoint(${probeX}, ${probeY})
      return { inBar: el ? bar.contains(el) : false, tag: el ? el.tagName : null, cls: el && typeof el.className === 'string' ? el.className : null }
    })()`)
    if (!hitInfo.inBar) {
      console.log(`  ⚠️ 拖动起点被遮挡（命中 ${hitInfo.tag}.${hitInfo.cls}），跳过`)
      results.push({ name: p.name, status: 'COVERED' })
      continue
    }

    // 在 tab 栏内：从右侧 80% 拖到左侧 20%（向左滑 = 下一个 tab）
    // 注：吸附阈值按「内容区宽度」算（measureRef），故窄 tab 栏上必须拖足够远才生效。
    //     这里取 max(tab 栏 60% 宽, 内容区 45% 宽) 作为拖动距离，起点保持落在 tab 栏内。
    const contentW = await cdp.eval(`(() => {
      const c = document.querySelector('${p.content || '.aurora-content__body'}')
      return c ? c.clientWidth : 0
    })()`)
    const dragDist = Math.max(Math.round(geo.w * 0.6), Math.round((contentW || 600) * 0.45))
    const startX = Math.round(geo.x + geo.w * 0.95)
    const endX = startX - dragDist
    const before = geo.active
    await swipe(cdp, {
      fromX: startX, fromY: Math.round(geo.cy),
      toX: endX, toY: Math.round(geo.cy),
    })
    await sleep(700)
    const after = await cdp.eval(`(document.querySelector('${p.active}')||{}).textContent || null`)

    const changed = before !== after
    console.log(`  【tab 栏内拖动】 ${before} → ${after}  ${changed ? '✅ 有反应' : '❌ 无反应'}`)
    results.push({ name: p.name, status: changed ? 'PASS' : 'FAIL', before, after })
  }

  console.log('\n========== 汇总 ==========')
  for (const r of results) {
    console.log(`${r.name.padEnd(12)} ${r.status}${r.before ? `  (${r.before} → ${r.after})` : ''}`)
  }
  const fail = results.filter((r) => r.status !== 'PASS')
  console.log(`\n通过 ${results.length - fail.length}/${results.length}`)

  ws.close(); process.exit(fail.length ? 2 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
