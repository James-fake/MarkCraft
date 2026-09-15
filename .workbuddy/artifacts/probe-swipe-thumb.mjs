/**
 * 探针：四面板「分段控件滑块」实测（需求 N 第四轮）
 * ------------------------------------------------------------------
 * 用户定案形态（Apple Segmented Control）：
 *   ① 常驻滑块压在选中项上；
 *   ② 按住任一 tab 拖动 → **只有滑块**跟手滑；
 *   ③ **tab 文字一个像素都不动**；④ **内容区一个像素都不动**；
 *   ⑤ 松手滑块落到目标 tab；⑥ 栏**不滚动**（scrollLeft 恒 0）。
 *
 * 因此本探针量的不是"位移大不大"，而是**谁动了、谁没动**：
 *   - 滑块 rest/mid/after 的绝对 left（跟手 + 落位）
 *   - 激活 tab 的 left 在 rest 与 mid 之间是否恒等（文字钉住）
 *   - 内容层 left 是否恒等（内容区零位移）
 *   - 栏 scrollLeft 是否恒 0
 *
 * 环境：dev server @5174；Edge CDP @9445（须与脚本同一次前台 bash 启动）
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = Number(process.env.CDP_PORT || 9445)
const OUT_DIR = '.workbuddy/artifacts'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
  async shot(name) {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await this.send('Page.captureScreenshot', { format: 'png' })
        writeFileSync(`${OUT_DIR}/${name}.png`, Buffer.from(r.data, 'base64'))
        return `${name}.png`
      } catch {
        await sleep(800)
      }
    }
    console.warn(`  ⚠️ 截图失败（${name}），继续`)
    return null
  }
}

async function drag(cdp, { fromX, fromY, dx, durationMs = 450, steps = 14, midProbe }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none', clickCount: 0 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(80)
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(fromX + dx * (i / steps)), y: fromY, button: 'left', buttons: 1 })
    await sleep(Math.max(6, durationMs / steps))
  }
  const mid = midProbe ? await midProbe() : null
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fromX + dx, y: fromY, button: 'left', buttons: 0, clickCount: 1 })
  return mid
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
// 首启引导浮层（position:fixed;inset:0）会吞掉所有指针事件 → 假阴性
await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-audience')
  if (!el) return 'NO_OVERLAY'
  const b = [...el.querySelectorAll('button')].find(x => /开始使用|跳过|完成|知道了/.test(x.textContent || ''))
  if (b) { b.click(); return 'CLICKED' }
  el.remove(); return 'REMOVED'
})()`)
await cdp.send('Page.bringToFront')
await cdp.eval(`window.focus()`)
await sleep(700)
// 唤醒点击：合成鼠标前几次会被「窗口激活」吞掉
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400, button: 'none', clickCount: 0 })
await sleep(120)

/** 切到目标面板 */
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

/** 白板左栏默认收起：空态时点「文件便签」（= 直接钉住左栏到文件 Tab），否则悬停左边缘 */
async function openCanvasLeftOverlay() {
  // 空态引导里的「文件便签」按钮会 setLeftPinned(true) → 左栏常驻展开（最可靠）
  const byEmptyBtn = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-canvas__empty-btn')].find(x => (x.textContent || '').includes('文件便签'))
    if (!b) return false
    b.click()
    return true
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
  // 钉住（否则移开鼠标即收起）
  await cdp.eval(`(() => {
    const pin = document.querySelector('.aurora-canvas__pin')
    if (pin && !pin.classList.contains('is-on')) pin.click()
    return !!pin
  })()`)
  await sleep(500)
  return 'EDGE'
}

/**
 * 知识库：subbar tab 栏只在「进入某个库的详情页」才渲染。
 * 空数据环境走真实 UI 建库（createKb 走 Dexie/IndexedDB，real Edge 里可用），
 * 再点卡片进入详情 —— 这样这条栏也能端到端验证，而不是"以单测兜底"。
 */
async function ensureKbOpen() {
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'ALREADY'
  // 已有卡片 → 直接打开
  if (await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) { c.click(); return true } return false })()`)) {
    await sleep(1400)
    if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'OPENED'
  }
  // 空列表 → 打开创建弹窗 → 填名提交
  await cdp.eval(`(() => {
    const b = document.querySelector('.aurora-kb-manage__empty-btn') || document.querySelector('.aurora-kb-manage .aurora-kb-btn--primary')
    if (b) b.click()
    return !!b
  })()`)
  await sleep(700)
  const filled = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-kb-modal input.aurora-kb-input')
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'CDP 验证库')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!filled) return 'NO_FORM'
  await sleep(400)
  // ⚠️ 必须限定在 modal 内 + 精确文案：宽正则 `/创建|新建/` 会先命中页面底层的
  //    「新建知识库」按钮（modal 走 portal 渲染在 body 末尾，DOM 顺序在后）→ 点了个无效按钮。
  const submit = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('.aurora-kb-modal .aurora-kb-btn--primary')]
      .find(x => /创建知识库/.test(x.textContent || ''))
    if (!b) return 'NO_BTN'
    if (b.disabled) return 'DISABLED'
    b.click()
    return 'CLICKED'
  })()`)
  if (submit !== 'CLICKED') return `SUBMIT_${submit}`
  // 轮询等待：modal 关闭 + 列表刷新出新卡片
  for (let i = 0; i < 12; i++) {
    await sleep(400)
    if (!(await cdp.eval(`!!document.querySelector('.aurora-kb-modal')`))) break
  }
  if (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) return 'CREATED'
  // 弹窗关闭后回到列表 → 点新卡片进详情
  await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) c.click(); return !!c })()`)
  await sleep(1400)
  return (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar-tabs')`)) ? 'CREATED_OPENED' : 'FAILED'
}

const PANELS = [
  {
    name: '设置页', sidebar: '设置',
    bar: '.aurora-settings__nav-tabs', track: '.aurora-settings__nav-track', thumb: '.aurora-settings__nav-thumb',
    tab: '.aurora-settings__nav-tab', active: '.aurora-settings__nav-tab--active', content: '.aurora-settings__content',
  },
  {
    name: '博客工作室', sidebar: '博客',
    bar: '.aurora-blog__subseg', track: '.aurora-blog__subseg-track', thumb: '.aurora-blog__subseg-thumb',
    tab: '.aurora-blog__subseg-btn', active: '.aurora-blog__subseg-btn.is-active',
    // ⚠️ 不能用 .aurora-blog__panelzone-body（panelOpen 才渲染）→ 用常驻的预览区
    content: '.aurora-blog__stage',
  },
  {
    name: '白板侧栏', sidebar: '白板',
    bar: '.aurora-csp__tabs', track: '.aurora-csp__tabs-track', thumb: '.aurora-csp__tabs-thumb',
    tab: '.aurora-csp__tab', active: '.aurora-csp__tab--active', content: '.aurora-csp__body',
  },
  {
    name: '知识库', sidebar: '知识库',
    bar: '.aurora-kb-subbar-tabs', track: '.aurora-kb-subbar-track', thumb: '.aurora-kb-subbar-thumb',
    tab: '.aurora-kb-subbar-tab', active: '.aurora-kb-subbar-tab.is-active', content: '.aurora-kb-content',
  },
]

const j = JSON.stringify
const results = []

for (const p of PANELS) {
  console.log(`\n================ ${p.name} ================`)
  const nav = await goto(p.sidebar)
  await sleep(800)
  if (p.name === '白板侧栏') {
    const r = await openCanvasLeftOverlay()
    console.log(`  打开左栏 overlay: ${r}`)
    await sleep(600)
  }
  if (p.name === '知识库') {
    const r = await ensureKbOpen()
    console.log(`  进入知识库详情: ${r}`)
    await sleep(700)
  }

  const geo = await cdp.eval(`(() => {
    const bar = document.querySelector(${j(p.bar)})
    const track = document.querySelector(${j(p.track)})
    const thumb = document.querySelector(${j(p.thumb)})
    if (!bar || !track || !thumb) return { missing: true, bar: !!bar, track: !!track, thumb: !!thumb }
    const bs = getComputedStyle(bar)
    const ts = getComputedStyle(thumb)
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x * 10) / 10, w: Math.round(r.width * 10) / 10 } }
    const act = document.querySelector(${j(p.active)})
    const tabs = [...document.querySelectorAll(${j(p.tab)})].map(e => {
      const r = e.getBoundingClientRect()
      return { label: (e.textContent || '').trim().slice(0, 6), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), sel: e.getAttribute('aria-selected') === 'true' }
    })
    const idx = tabs.findIndex(t => t.sel)
    return {
      missing: false,
      count: tabs.length,
      activeIdx: idx,
      tabs,
      slot: tabs.length > 1 ? Math.round((tabs[tabs.length - 1].cx - tabs[0].cx) / (tabs.length - 1)) : 0,
      barStyle: { overflow: bs.overflow, overflowX: bs.overflowX, touchAction: bs.touchAction, scrollLeft: bar.scrollLeft },
      thumbStyle: { position: ts.position, transition: ts.transition, pointerEvents: ts.pointerEvents, willChange: ts.willChange },
      thumbRect: rect(thumb),
      activeRect: act ? rect(act) : null,
      thumbText: (thumb.textContent || '').trim(),
    }
  })()`)

  if (geo.missing) {
    const diag = await cdp.eval(`(() => ({
      hash: location.hash,
      canvasRoot: document.querySelectorAll('.aurora-canvas').length,
      leftEdge: document.querySelectorAll('.aurora-canvas__edge--left').length,
      csp: document.querySelectorAll('.aurora-csp').length,
      'kb-manage': document.querySelectorAll('.aurora-kb-manage').length,
      'kb-subbar': document.querySelectorAll('.aurora-kb-subbar-tabs').length,
      'kb-cards': document.querySelectorAll('.aurora-kb-kbcard').length,
      page: [...document.querySelectorAll('.aurora-page')].map(e => e.className).slice(0, 3),
      pageView: (document.querySelector('.aurora-page') || {}).getAttribute ? document.querySelector('.aurora-page').getAttribute('data-view') : null,
      sidebar: [...document.querySelectorAll('.aurora-sidebar-item')].map(e => e.textContent.trim()).slice(0, 12),
      text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200),
    }))()`)
    console.log(`  ⊘ 跳过：bar=${geo.bar} track=${geo.track} thumb=${geo.thumb}`)
    console.log(`    诊断: ${JSON.stringify(diag)}`)
    results.push({ name: p.name, skipped: true, reason: !geo.bar ? 'tab 栏未渲染' : !geo.thumb ? '滑块未渲染' : '轨道未渲染' })
    continue
  }

  const alignRest = geo.activeRect ? Math.abs(geo.thumbRect.x - geo.activeRect.x) : 999
  const widthRest = geo.activeRect ? Math.abs(geo.thumbRect.w - geo.activeRect.w) : 999
  console.log(`  面板激活: ${nav ? '✅' : '⚠️'} | tab 数 ${geo.count} | 槽距 ${geo.slot}px | 起始 index ${geo.activeIdx}`)
  console.log(`  bar : overflow=${geo.barStyle.overflow} touch-action=${geo.barStyle.touchAction} scrollLeft=${geo.barStyle.scrollLeft}`)
  console.log(`  thumb: position=${geo.thumbStyle.position} pointer-events=${geo.thumbStyle.pointerEvents}`)
  console.log(`         transition=${geo.thumbStyle.transition.slice(0, 60)}`)
  console.log(`         静止态过渡: ${/transform/.test(geo.thumbStyle.transition) ? '✅ 含 transform（点击/松手才有滑动）' : '❌ 缺 transform —— 内联 none 残留？'}`)
  console.log(`         ​文本="${geo.thumbText}"（必须为空）`)
  console.log(`  静止态落位: thumb(${geo.thumbRect.x}, w=${geo.thumbRect.w}) vs 激活 tab(${geo.activeRect?.x}, w=${geo.activeRect?.w}) → Δx=${alignRest.toFixed(1)} Δw=${widthRest.toFixed(1)} ${alignRest <= 1.5 && widthRest <= 1.5 ? '✅ 对齐' : '❌ 未对齐'}`)

  await cdp.shot(`thumb-${p.name === '设置页' ? 'settings' : p.name === '博客工作室' ? 'blog' : p.name === '白板侧栏' ? 'canvas' : 'kb'}-rest`)

  if (geo.count < 2) { console.log('  ⊘ 组内仅 1 tab，无法验证切换'); results.push({ name: p.name, skipped: true, reason: '仅 1 tab' }); continue }

  const target = geo.tabs[geo.activeIdx]
  const dir = geo.activeIdx >= geo.count - 1 ? 1 : -1
  const dx = dir * Math.max(60, Math.round(geo.slot * 0.9))

  const SNAP = `(() => {
    const bar = document.querySelector(${j(p.bar)})
    const thumb = document.querySelector(${j(p.thumb)})
    const act = document.querySelector(${j(p.active)})
    const actEls = [...document.querySelectorAll(${j(p.tab)})]
    const content = document.querySelector(${j(p.content)})
    const ts = getComputedStyle(thumb)
    const m = ts.transform === 'none' ? null : new DOMMatrixReadOnly(ts.transform)
    return {
      swiping: bar.hasAttribute('data-swiping'),
      cursor: getComputedStyle(bar).cursor,
      thumbLeft: Math.round(thumb.getBoundingClientRect().x * 10) / 10,
      thumbWidth: Math.round(thumb.getBoundingClientRect().width * 10) / 10,
      thumbInlineTransition: thumb.style.transition,
      thumbTranslateX: m ? Math.round(m.m41 * 10) / 10 : null,
      activeTabLeft: act ? Math.round(act.getBoundingClientRect().x * 10) / 10 : null,
      // 所有 tab 的绝对 left 之和 → 「文字有没有整体被推走」的指纹
      tabsLeftFingerprint: actEls.map(e => Math.round(e.getBoundingClientRect().x * 10) / 10).join(','),
      tabsInlineStyleFingerprint: actEls.map(e => e.getAttribute('style') || '-').join('|'),
      contentLeft: content ? Math.round(content.getBoundingClientRect().x * 10) / 10 : null,
      contentInlineTransform: content ? (content.style.transform || '') : null,
      scrollLeft: bar.scrollLeft,
      active: act ? (act.textContent || '').trim().slice(0, 6) : null,
    }
  })()`

  const rest = await cdp.eval(SNAP)
  let mid = null
  for (let i = 1; i <= 3; i++) {
    mid = await drag(cdp, { fromX: target.cx, fromY: target.cy, dx, midProbe: () => cdp.eval(SNAP) })
    if (mid && mid.swiping) break
    await sleep(400)
  }
  await cdp.shot(`thumb-${p.name === '设置页' ? 'settings' : p.name === '博客工作室' ? 'blog' : p.name === '白板侧栏' ? 'canvas' : 'kb'}-mid`)
  await sleep(700)
  const after = await cdp.eval(SNAP)

  const thumbMoved = Math.abs((mid?.thumbLeft ?? 0) - rest.thumbLeft)
  const textMoved = (mid?.tabsLeftFingerprint ?? '') !== rest.tabsLeftFingerprint
  const textStyled = (mid?.tabsInlineStyleFingerprint ?? '') !== rest.tabsInlineStyleFingerprint
  // ⚠️ 逐字比较（不要把 null ?? 0：元素不存在时会被误判成"动了"）
  const contentPresent = rest.contentLeft != null && mid?.contentLeft != null
  const contentMoved = contentPresent && (mid.contentLeft !== rest.contentLeft || !!mid.contentInlineTransform)
  const switched = rest.active !== after.active
  const landedX = geo.tabs[geo.activeIdx + dir] ? geo.tabs[geo.activeIdx + dir].cx : null
  const afterActive = await cdp.eval(`(() => {
    const act = document.querySelector(${j(p.active)})
    return act ? Math.round(act.getBoundingClientRect().x * 10) / 10 : null
  })()`)
  const landedOk = afterActive != null && Math.abs((after.thumbLeft ?? 0) - afterActive) <= 1.5

  console.log(`  按住「${target.label}」拖 ${dx}px →`)
  console.log(`    手势识别       : ${mid?.swiping ? '✅' : '❌'} | cursor=${mid?.cursor} | 滑块内联过渡=${mid?.thumbInlineTransition || '(空→CSS)'}`)
  console.log(`    **滑块跟手**   : ${rest.thumbLeft} → ${mid?.thumbLeft}（Δ ${thumbMoved.toFixed(1)}px，translateX=${mid?.thumbTranslateX}，w=${mid?.thumbWidth}）${thumbMoved >= 30 ? '✅ 看得见' : '❌ 几乎没动'}`)
  console.log(`    **tab 文字**   : left 指纹 ${textMoved ? '❌ 动了' : '✅ 一像素未动'}｜内联样式 ${textStyled ? '❌ 被写' : '✅ 未碰'}`)
  console.log(`    **内容区**     : ${!contentPresent ? '⊘ 该视图内容层未挂载（跳过）' : contentMoved ? '❌ 动了' : '✅ 一像素未动'}（内联 transform="${mid?.contentInlineTransform || ''}"）`)
  console.log(`    **栏滚动**     : scrollLeft rest=${rest.scrollLeft} mid=${mid?.scrollLeft} after=${after.scrollLeft} ${rest.scrollLeft === 0 && mid?.scrollLeft === 0 && after.scrollLeft === 0 ? '✅ 不滚' : '❌ 滚了'}`)
  console.log(`    松手切换       : ${rest.active} → ${after.active} ${switched ? '✅' : '❌'}`)
  console.log(`    松手落位       : thumbLeft=${after.thumbLeft} vs 激活 tab=${afterActive} → ${landedOk ? '✅ 吸到目标' : '❌ 未落位'}（预期中心 ${landedX}）`)

  results.push({
    name: p.name, slot: geo.slot, thumbMoved, textMoved, textStyled, contentMoved, switched, landedOk,
    scrollOk: rest.scrollLeft === 0 && mid?.scrollLeft === 0 && after.scrollLeft === 0,
    alignRest: alignRest <= 1.5 && widthRest <= 1.5,
    thumbText: geo.thumbText,
    swiping: mid?.swiping,
  })
}

console.log('\n================ 汇总 ================')
for (const r of results) {
  if (r.skipped) { console.log(`  ${r.name.padEnd(6)} ⊘ 跳过（${r.reason}）`); continue }
  const ok = r.thumbMoved >= 30 && !r.textMoved && !r.textStyled && !r.contentMoved && r.switched && r.landedOk && r.scrollOk && r.alignRest
  console.log(`  ${r.name.padEnd(6)} 滑块Δ${String(Math.round(r.thumbMoved)).padStart(4)}px 文字不动${r.textMoved ? '❌' : '✅'} 内容不动${r.contentMoved ? '❌' : '✅'} 落位${r.landedOk ? '✅' : '❌'} 切换${r.switched ? '✅' : '❌'} 不滚${r.scrollOk ? '✅' : '❌'} → ${ok ? '✅ 通过' : '❌ 有问题'}`)
}

ws.close()
console.log('\ndone')
