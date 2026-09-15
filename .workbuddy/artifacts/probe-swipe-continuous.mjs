/**
 * 探针：滑块**连续滑动**验证（2026-09-15 第六轮）
 * ---------------------------------------------------------------------------
 * 用户诉求原话：
 *   「现在要求可以连续滑动，例如在知识库功能 tab 可以直接从概况，直接滑动到
 *     最后一个导出，就不需要一个一个滑动过去」
 *
 * 对每条 tab 栏做两趟**跨多格**拖拽（不是一格）：
 *   ① 先把第 0 个 tab 点成激活（知识库 = 概况），再从它一次拖到**最后一格**；
 *   ② 再从最后一格一次拖回**第 0 格**。
 * 每趟断言四件事：
 *   · 落点吸附：激活 index 必须等于目标格（跨了几格就落几格）
 *   · 落位精确：滑块 left == 目标 tab 的 x（Δ ≤ 1.5px）
 *   · 跟手 1:1：拖动中滑块位移 ≈ 鼠标位移（Δ ≤ 4px；旧「一格限幅」第二格起几乎不动）
 *   · 其余零变化：tab 文字 left 指纹不变、栏 scrollLeft 恒 0
 *
 * 环境：dev @5174；Edge CDP @9445（须与脚本同一次前台 bash 启动）
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const CDP_PORT = Number(process.env.CDP_PORT || 9445)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 选中态判定：兼容 `--active` / `is-active` 两种 BEM 写法与 aria-selected */
const ACTIVE_PRED = `(e => /--active|is-active/.test(e.className) || e.getAttribute('aria-selected') === 'true')`

const SNAP_EXPR = `(() => {
  const bar = document.querySelector(window.__probeBar)
  const thumb = document.querySelector(window.__probeThumb)
  if (!bar || !thumb) return null
  const tabs = [...bar.querySelectorAll(window.__probeTab)]
  const transform = getComputedStyle(thumb).transform
  const cs = getComputedStyle(thumb)
  const tr = thumb.getBoundingClientRect()
  // ⚠️ 别用 elementFromPoint 判"看得见"：滑块是 pointer-events:none，
  // 规范上不参与命中测试 → 永远返回它下面的元素，是**假阴性**。
  // 只断言"真的被绘制"：不透明、可见、有非透明背景、有面积。
  const painted = cs.opacity !== '0' && cs.visibility === 'visible' && cs.display !== 'none'
    && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && tr.width > 0 && tr.height > 0
  return {
    activeIdx: tabs.findIndex(${ACTIVE_PRED}),
    thumbLeft: Math.round(tr.x * 10) / 10,
    thumbW: Math.round(tr.width * 10) / 10,
    transformX: transform === 'none' ? null : Math.round(new DOMMatrixReadOnly(transform).m41 * 10) / 10,
    tabX: tabs.map(e => Math.round(e.getBoundingClientRect().x * 10) / 10),
    tabW: tabs.map(e => Math.round(e.getBoundingClientRect().width * 10) / 10),
    scrollLeft: bar.scrollLeft,
    thumbOpacity: cs.opacity,
    thumbBg: cs.backgroundColor,
    thumbH: Math.round(tr.height * 10) / 10,
    thumbPainted: painted,
  }
})()`

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)) } }, 20000)
    })
  }
  onMessage(raw) {
    const msg = JSON.parse(raw)
    if (msg.id && this.pending.has(msg.id)) {
      const { res, rej } = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    }
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
}

/**
 * 按住 from 点横向拖 dx（慢速拖 —— 末段速度 < 0.3 px/ms，确保判定走「落点」而非甩掷）。
 * 返回释放前的快照。
 */
async function dragSlow(cdp, { fromX, fromY, dx, durationMs = 2400, steps = 12, shotMid = null }) {
  // 拖动中途（60% 处）截图：最能体现"滑块跟手走到轨道中间、尚未落位"
  const shotAt = Math.max(1, Math.round(steps * 0.6))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(60)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(90)
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(fromX + dx * (i / steps)),
      y: fromY,
      button: 'left',
      buttons: 1,
    })
    await sleep(Math.max(8, durationMs / steps))
    // ⚠️ 截图必须在 **mouseReleased 之前**：释放后内容立刻切换、滑块也已落位，
    // 那样拍到的就不是"拖动中跟手"的证据了。
    if (shotMid && i === shotAt) {
      await sleep(700)
      await shoot(shotMid)
      shotMid = null
    }
  }
  const mid = await cdp.eval(SNAP_EXPR)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(fromX + dx), y: fromY, button: 'left', buttons: 0, clickCount: 1 })
  return mid
}

/**
 * 截图（Page.captureScreenshot 偶发超时 → 重试 3 次）；存到 artifacts 目录。
 *
 * ⚠️ 窗口在后台/被遮挡时，Chromium 会**节流合成** → 截图拿到的是上一帧
 * （表现为"拖动中滑块明明动了，图里却还在原位"）。所以先抬到前台并等两帧。
 */
async function shoot(name) {
  try { await cdp.send('Page.bringToFront') } catch { /* 忽略 */ }
  await Promise.race([
    cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))'),
    sleep(900),
  ]).catch(() => {})
  for (let i = 0; i < 3; i++) {
    try {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(HERE, `${name}.png`), Buffer.from(data, 'base64'))
      return true
    } catch { await sleep(500) }
  }
  console.log(`    ⚠️ 截图 ${name} 失败（不影响判定）`)
  return false
}

/* ---------------- 连接 ---------------- */
const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const pages = list.filter((t) => t.type === 'page' && t.url.includes('localhost:5174'))
const page = pages[pages.length - 1]
if (!page) { console.error('未找到 5174 页面 —— Edge 是否与脚本同一次 bash 启动？'); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
const cdp = new Cdp(ws)
ws.on('message', (raw) => cdp.onMessage(raw))
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')

for (let i = 0; i < 40; i++) {
  try { if (await cdp.eval(`document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0`)) break } catch { /* 未就绪 */ }
  await sleep(500)
}
await sleep(1200)
// 首启引导浮层（fixed 全屏）会吞掉所有指针事件 → 假阴性
await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-audience')
  if (!el) return 'NO_OVERLAY'
  const b = [...el.querySelectorAll('button')].find(x => /开始使用|跳过|完成|知道了/.test(x.textContent || ''))
  if (b) { b.click(); return 'CLICKED' }
  el.remove(); return 'REMOVED'
})()`)
await cdp.send('Page.bringToFront')
await cdp.eval(`window.focus()`)
await sleep(600)
// 唤醒点击：合成鼠标的最早几次事件会被「窗口激活」吞掉
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400, button: 'none', clickCount: 0 })
await sleep(120)

async function goto(sidebarLabel) {
  for (let i = 0; i < 6; i++) {
    await cdp.eval(`(() => {
      const hit = [...document.querySelectorAll('.aurora-sidebar-item')].find(e => (e.textContent || '').includes(${JSON.stringify(sidebarLabel)}))
      if (hit) hit.click()
      return !!hit
    })()`)
    await sleep(700)
    const act = await cdp.eval(`[...document.querySelectorAll('.aurora-sidebar-item--active')].map(e => e.textContent || '').join('')`)
    if (String(act).includes(sidebarLabel)) return true
  }
  return false
}

async function openCanvasLeftOverlay() {
  const byEmptyBtn = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-canvas__empty-btn')].find(x => (x.textContent || '').includes('文件便签'))
    if (!b) return false
    b.click(); return true
  })()`)
  if (byEmptyBtn) { await sleep(900); return 'EMPTY_BTN' }
  const edge = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-canvas__edge--left')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
  if (!edge) return 'NO_EDGE'
  for (let i = 0; i < 3; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: edge.x, y: edge.y, button: 'none', clickCount: 0 })
    await sleep(500)
    if (await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)) break
  }
  await cdp.eval(`(() => { const p = document.querySelector('.aurora-canvas__pin'); if (p && !p.classList.contains('is-on')) p.click(); return !!p })()`)
  await sleep(500)
  return 'EDGE'
}

async function ensureKbOpen() {
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'ALREADY'
  if (await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) { c.click(); return true } return false })()`)) {
    await sleep(1400)
    if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'OPENED'
  }
  await cdp.eval(`(() => {
    const b = document.querySelector('.aurora-kb-manage__empty-btn') || document.querySelector('.aurora-kb-manage .aurora-kb-btn--primary')
    if (b) b.click(); return !!b
  })()`)
  await sleep(700)
  const filled = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-kb-modal input.aurora-kb-input')
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'CDP 连续滑动库')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!filled) return 'NO_FORM'
  await sleep(400)
  const submit = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-kb-modal .aurora-kb-btn--primary')].find(x => /创建知识库/.test(x.textContent || ''))
    if (!b) return 'NO_BTN'
    if (b.disabled) return 'DISABLED'
    b.click(); return 'CLICKED'
  })()`)
  if (submit !== 'CLICKED') return `SUBMIT_${submit}`
  for (let i = 0; i < 12; i++) {
    await sleep(400)
    if (!(await cdp.eval(`!!document.querySelector('.aurora-kb-modal')`))) break
  }
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'CREATED'
  await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) c.click(); return !!c })()`)
  await sleep(1400)
  return (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) ? 'CREATED_OPENED' : 'FAILED'
}

const PANELS = [
  { name: '设置页', sidebar: '设置', bar: '.aurora-settings__nav-tabs', thumb: '.aurora-settings__nav-thumb', tab: '.aurora-settings__nav-tab' },
  { name: '博客工作室', sidebar: '博客', bar: '.aurora-blog__subseg', thumb: '.aurora-blog__subseg-thumb', tab: '.aurora-blog__subseg-btn' },
  { name: '白板侧栏', sidebar: '白板', bar: '.aurora-csp__tabs', thumb: '.aurora-csp__tabs-thumb', tab: '.aurora-csp__tab' },
  { name: '知识库', sidebar: '知识库', bar: '.aurora-kb-subbar-tabs', thumb: '.aurora-kb-subbar-thumb', tab: '.aurora-kb-subbar-tab' },
]

const results = []

/** 把第 idx 个 tab 点成激活（用于固定起点，如知识库的「概况」） */
async function clickTab(p, idx) {
  return cdp.eval(`(() => {
    const tabs = [...document.querySelectorAll(${JSON.stringify(p.bar)} + ' ' + ${JSON.stringify(p.tab)})]
    const t = tabs[${idx}]
    if (!t) return null
    t.click()
    return (t.textContent || '').trim()
  })()`)
}

/**
 * 一趟跨格拖拽：从 activeIdx 一次拖到 targetIdx。
 * @param label 描述（如「概况 → 导出」）
 */
async function dragTo(p, targetIdx, label, shot = null) {
  const geo = await cdp.eval(`(() => {
    const bar = document.querySelector(${JSON.stringify(p.bar)})
    if (!bar) return null
    const tabs = [...bar.querySelectorAll(${JSON.stringify(p.tab)})]
    if (tabs.length < 3) return null
    const rects = tabs.map(e => {
      const r = e.getBoundingClientRect()
      return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), x: Math.round(r.x * 10) / 10 }
    })
    return {
      rects,
      labels: tabs.map(e => (e.textContent || '').trim()),
      activeIdx: tabs.findIndex(${ACTIVE_PRED}),
      count: tabs.length,
    }
  })()`)
  if (!geo || geo.activeIdx < 0) { console.log(`  ⊘ ${label}：量不到激活项`); return null }
  if (geo.activeIdx === targetIdx) { console.log(`  ⊘ ${label}：起点已是目标格`); return null }

  const from = geo.rects[geo.activeIdx]
  const to = geo.rects[targetIdx]
  const dx = to.cx - from.cx
  const hops = Math.abs(targetIdx - geo.activeIdx)

  await cdp.eval(`window.__probeBar=${JSON.stringify(p.bar)}, window.__probeThumb=${JSON.stringify(p.thumb)}, window.__probeTab=${JSON.stringify(p.tab)}`)
  const before = await cdp.eval(SNAP_EXPR)
  const mid = await dragSlow(cdp, {
    fromX: from.cx,
    fromY: from.cy,
    dx,
    // 拖动中截图默认关闭（本环境取到的常是旧帧，见下方调用处注释）
    shotMid: shot && process.env.SHOT_MID === '1' ? `${shot}-mid` : null,
  })
  await sleep(800)
  const after = await cdp.eval(SNAP_EXPR)
  if (shot) await shoot(`${shot}-rest`)

  const followDelta = mid && before ? Math.round((mid.thumbLeft - before.thumbLeft - dx) * 10) / 10 : null
  const followOk = followDelta != null && Math.abs(followDelta) <= 4
  const textMoved = before && mid ? before.tabX.some((x, i) => x !== mid.tabX[i]) : null
  const idxOk = after?.activeIdx === targetIdx
  const landedDelta = after && after.activeIdx >= 0 ? Math.abs(after.thumbLeft - after.tabX[after.activeIdx]) : null
  const landedOk = landedDelta != null && landedDelta <= 1.5
  const widthOk = after && after.activeIdx >= 0 ? Math.abs(after.thumbW - after.tabW[after.activeIdx]) <= 1.5 : false
  const noScroll = (mid?.scrollLeft ?? 0) === 0 && (after?.scrollLeft ?? 0) === 0
  const paintedOk = mid?.thumbPainted === true

  console.log(`  ${label}：跨 ${hops} 格（「${geo.labels[geo.activeIdx]}」→「${geo.labels[targetIdx]}」），鼠标位移 ${dx > 0 ? '+' : ''}${dx}px`)
  console.log(`    跟手 1:1 : 滑块 Δ${mid && before ? Math.round((mid.thumbLeft - before.thumbLeft) * 10) / 10 : '-'} vs 鼠标 Δ${dx} → 差 ${followDelta} ${followOk ? '✅' : '❌'}`)
  console.log(`    落点吸附 : index ${geo.activeIdx} → ${after?.activeIdx} ${idxOk ? '✅' : `❌ 应到 ${targetIdx}`}`)
  console.log(`    滑块落位 : left ${after?.thumbLeft} vs 目标 tab ${after?.tabX?.[after.activeIdx]} → Δ${landedDelta?.toFixed(1)} ${landedOk ? '✅' : '❌'}｜宽度 ${after?.thumbW} vs ${after?.tabW?.[after.activeIdx]} ${widthOk ? '✅' : '❌'}`)
  console.log(`    文字未动 : ${textMoved === false ? '✅ 所有 tab left 指纹未变' : '❌ 有 tab 被推走'}`)
  console.log(`    栏不滚动 : scrollLeft ${mid?.scrollLeft}/${after?.scrollLeft} ${noScroll ? '✅' : '❌'}`)
  console.log(`    拖动中可见 : opacity ${mid?.thumbOpacity} bg ${mid?.thumbBg} ${mid?.thumbW}×${mid?.thumbH} ${mid?.thumbPainted ? '✅ 已绘制' : '❌ 不可见'}`)

  return {
    name: `${p.name}·${label}`, hops,
    fromLabel: geo.labels[geo.activeIdx], toLabel: geo.labels[targetIdx],
    from: geo.activeIdx, targetIdx, gotIdx: after?.activeIdx,
    followDelta, followOk, idxOk, landedOk, widthOk, textMoved, noScroll, paintedOk,
  }
}

for (const p of PANELS) {
  if (process.env.ONLY && !p.name.includes(process.env.ONLY)) continue
  console.log(`\n================ ${p.name} ================`)
  const nav = await goto(p.sidebar)
  await sleep(700)
  if (p.name === '白板侧栏') { console.log(`  打开左栏: ${await openCanvasLeftOverlay()}`); await sleep(600) }
  if (p.name === '知识库') { console.log(`  进入详情: ${await ensureKbOpen()}`); await sleep(700) }

  const has = await cdp.eval(`!!document.querySelector(${JSON.stringify(p.bar)})`)
  if (!has) { console.log('  ⊘ 跳过：tab 栏未渲染'); results.push({ name: p.name, skipped: true }); continue }
  console.log(`  面板激活: ${nav ? '✅' : '⚠️'}`)

  const count = await cdp.eval(`document.querySelectorAll(${JSON.stringify(p.bar)} + ' ' + ${JSON.stringify(p.tab)}).length`)
  if (!count || count < 3) { console.log(`  ⊘ 跳过：tab 数 ${count}（少于 3 格测不出连续）`); results.push({ name: p.name, skipped: true }); continue }
  console.log(`  tab 数: ${count}`)

  // 起点固定到第 0 格（对齐用户场景「从概况开始」）
  const first = await clickTab(p, 0)
  await sleep(900)
  console.log(`  起点: 第 0 格「${first}」`)

  // ① 一次拖到最后一格。视觉证据只留"落位后"那张：
  //    ⚠️ 拖动**中**的截图在本环境不可靠 —— 窗口不前台时 Chromium 节流合成，
  //    captureScreenshot 会返回上一帧（实测：滑块 DOM 已移动 430px，图里却还在原位，
  //    既非 bug 也无法用 sleep / 双 rAF / bringToFront 修好）。要拍就带 SHOT_MID=1，
  //    并且**只当参考、不要当证据**；"拖动中跟手"的证据用数值（跟手差 + 绘制态）。
  const shotName = p.name === '知识库' ? 'thumb-continuous-kb' : null
  const r1 = await dragTo(p, count - 1, `第 0 格 → 末格`, shotName)
  if (r1) results.push(r1)

  // ② 一次拖回第 0 格
  const r2 = await dragTo(p, 0, `末格 → 第 0 格`)
  if (r2) results.push(r2)
}

console.log('\n================ 汇总（连续滑动） ================')
let pass = 0
for (const r of results) {
  if (r.skipped) { console.log(`  ${r.name.padEnd(20)} ⊘ 跳过`); continue }
  const ok = r.idxOk && r.landedOk && r.followOk && r.widthOk && r.textMoved === false && r.noScroll && r.paintedOk
  if (ok) pass++
  console.log(`  ${r.name.padEnd(20)} 跨${r.hops}格 ${r.from} → 应${r.targetIdx} 实${String(r.gotIdx).padStart(2)} | 跟手差${String(r.followDelta).padStart(5)} 落位Δ${r.landedOk ? '✅' : '❌'} 宽${r.widthOk ? '✅' : '❌'} 文字${r.textMoved === false ? '✅' : '❌'} 不滚${r.noScroll ? '✅' : '❌'} 绘制${r.paintedOk ? '✅' : '❌'} → ${ok ? '✅ 通过' : '❌ 有问题'}`)
}
console.log(`\n  通过 ${pass} / ${results.filter((r) => !r.skipped).length}`)

ws.close()
console.log('\ndone')
