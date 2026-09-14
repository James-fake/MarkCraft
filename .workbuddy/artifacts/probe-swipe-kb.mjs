/**
 * CDP 探针：知识库详情页滑动切 Tab
 * 用法: node .workbuddy/artifacts/probe-swipe-kb.mjs
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
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
}

async function swipe(cdp, { fromX, fromY, toX, toY, steps = 14, stepDelay = 16 }) {
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

const ok = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? '  — ' + e : ''}`); return c }

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  // 进入知识库视图（标准视图，支持深链）
  await cdp.eval(`location.hash = '#view=kb'`)
  await sleep(1500)

  // 情况 A：已有知识库 → 点卡片进详情
  // 情况 B：空列表 → 新建（可能弹命名模态）
  let entered = false
  let created = false
  for (let i = 0; i < 60; i++) {
    entered = await cdp.eval(`(() => {
      if (document.querySelector('.aurora-kb-subbar-tabs')) return true
      // 1) 若模态已开 → 填名 + 确认
      const modal = document.querySelector('.aurora-kb-modal, .aurora-modal')
      if (modal) {
        const inp = modal.querySelector('input')
        if (inp && !inp.value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
          setter.call(inp, '滑动测试库')
          inp.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const okBtn = [...modal.querySelectorAll('button')]
          .find(b => /确认|确定|创建|保存/.test(b.textContent || ''))
        if (okBtn) { okBtn.click(); return false }
        return false
      }
      // 2) 空态 → 点新建
      const emptyBtn = document.querySelector('.aurora-kb-manage__empty-btn')
      if (emptyBtn && !window.__kbCreating) { window.__kbCreating = true; emptyBtn.click(); return false }
      // 3) 有列表 → 点卡片
      const card = document.querySelector('.aurora-kb-kbcard, .aurora-kb-manage__item, .aurora-kb-card, .aurora-kb-list__item')
      if (card && !window.__kbEntering) { window.__kbEntering = true; card.click(); return false }
      return false
    })()`)
    if (entered) break
    await sleep(400)
  }

  if (!entered) {
    console.error('未能进入知识库详情页。当前 URL:', await cdp.eval('location.href'))
    const dbg = await cdp.eval(`[...document.querySelectorAll('[class*=aurora-kb],[class*=aurora-modal],[role=dialog]')].slice(0,16).map(e=>e.className||e.tagName).join('\\n')`)
    console.error('当前 DOM 类名:\n' + dbg)
    process.exit(1)
  }
  console.log('已进入知识库详情页')

  const g = await cdp.eval(`(() => { const r = document.querySelector('.aurora-kb-content').getBoundingClientRect(); return { cx: r.x + r.width/2, cy: r.y + r.height/2, w: r.width, h: r.height } })()`)
  console.log('内容区几何:', JSON.stringify(g))

  const activeTab = () => cdp.eval(`(() => { const b = document.querySelector('.aurora-kb-subbar-tab.is-active'); return b ? b.querySelector('span')?.textContent : null })()`)

  const res = []
  // 起点设为「概览」
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-kb-subbar-tab')].find(x=>x.querySelector('span')?.textContent==='概览'); b&&b.click() })()`)
  await sleep(300)

  const b1 = await activeTab()
  await swipe(cdp, { fromX: g.cx + g.w * 0.3, fromY: g.cy, toX: g.cx - g.w * 0.3, toY: g.cy })
  await sleep(450)
  const a1 = await activeTab()
  res.push(ok('#1 横滑一屏 → 切换', b1 !== a1, `${b1} → ${a1}`))

  const b2 = await activeTab()
  await swipe(cdp, { fromX: g.cx + g.w * 0.12, fromY: g.cy, toX: g.cx - g.w * 0.10, toY: g.cy, steps: 30, stepDelay: 40 })
  await sleep(450)
  const a2 = await activeTab()
  res.push(ok('#2 小位移慢速 → 回弹', b2 === a2, `${b2} → ${a2}`))

  const b3 = await activeTab()
  await swipe(cdp, { fromX: g.cx + g.w * 0.12, fromY: g.cy, toX: g.cx - g.w * 0.12, toY: g.cy, steps: 3, stepDelay: 4 })
  await sleep(450)
  const a3 = await activeTab()
  res.push(ok('#3 小位移快速甩 → 切换', b3 !== a3, `${b3} → ${a3}`))

  const b4 = await activeTab()
  await swipe(cdp, { fromX: g.cx, fromY: g.cy + 80, toX: g.cx, toY: g.cy - 80 })
  await sleep(450)
  const a4 = await activeTab()
  res.push(ok('#4 纵向拖拽 → tab 不变', b4 === a4, `${b4} → ${a4}`))

  const b5 = await activeTab()
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-kb-subbar-tab')].find(x=>x.querySelector('span')?.textContent==='笔记'); b&&b.click() })()`)
  await sleep(300)
  res.push(ok('#5 点击 tab → 立即切换', (await activeTab()) === '笔记'))

  const hit = await cdp.eval(`(() => {
    const root = document.querySelector('.aurora-kb-content')
    const btn = root?.querySelector('button, [role="switch"], input, a')
    if (!btn) return { found: false }
    const r = btn.getBoundingClientRect()
    const h = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)
    return { found: true, hitInside: !!(h && (btn.contains(h) || h === btn)) }
  })()`)
  res.push(ok('#6 内容区控件命中测试', hit.found ? hit.hitInside : true, JSON.stringify(hit)))

  console.log('\n──────── 汇总 ────────')
  const p = res.filter(Boolean).length
  console.log(`${p}/${res.length} 通过`)
  ws.close()
  process.exit(p === res.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
