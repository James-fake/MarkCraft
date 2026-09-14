/**
 * CDP 探针：博客工作室 功能面板浮层「组内子面板」滑动切 Tab（axis=x）
 *
 * 语义边界（DesignBrief §4.4）：
 *   - 只滑**组内子面板**（主题=[样式,配色] / 数据=[内容,功能] / 高级=[CSS,导出]），**不跨组**
 *   - 浮层收起（panelOpen=false）时手势禁用
 *   - 避开浮层表头（表头横拖 = 浮层左右换边，另有其手势）
 *
 * ⚠️ 拖拽起点必须落在**子面板内容体的非交互留白区**，
 *    且不能落在子面板分段按钮（.aurora-blog__subseg）上 —— 否则 mouseup 会触发 click 假切换。
 *
 * 用法: node .workbuddy/artifacts/probe-swipe-blog.mjs
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

/** 当前激活的子面板标签（.aurora-blog__subseg-btn.is-active） */
const activeSub = (cdp) => cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__subseg-btn.is-active'); return b ? b.textContent : null })()`)

/** 当前激活的分组标签（.aurora-blog__tab.is-active） */
const activeGroup = (cdp) => cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__tab.is-active'); return b ? b.querySelector('span')?.textContent : null })()`)

/** 点击指定文字的分组标签 */
const clickGroup = (cdp, label) => cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-blog__tab')].find(x=>x.querySelector('span')?.textContent===${JSON.stringify(label)}); if(b){b.click();return true} return false })()`)

/** 确保浮层展开且落在指定分组：同组再点会收起，故需先探测状态 */
async function ensureGroupOpen(cdp, label) {
  const isActive = await cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__tab.is-active'); return b ? b.querySelector('span')?.textContent : null })()`)
  const bodyOpen = await cdp.eval(`!!document.querySelector('.aurora-blog__panelzone-body')`)
  if (isActive === label && bodyOpen) return
  if (isActive === label && !bodyOpen) { await clickGroup(cdp, label) }        // 同组收起 → 点开
  else { await clickGroup(cdp, label) }                                        // 切组（自动展开）
  await sleep(450)
}

/** 点击指定文字的子面板按钮 */
const clickSub = (cdp, label) => cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-blog__subseg-btn')].find(x=>x.textContent===${JSON.stringify(label)}); if(b){b.click();return true} return false })()`)

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  await cdp.eval(`location.hash = '#view=blog'`)
  await sleep(2600)

  // 定位到面板浮层：需先点一个分组标签展开（首次默认收起）
  await ensureGroupOpen(cdp, '主题')
  const bodyExists = await cdp.eval(`!!document.querySelector('.aurora-blog__panelzone-body')`)
  if (!bodyExists) {
    console.error('浮层内容体未出现，URL:', await cdp.eval('location.href'))
    process.exit(1)
  }
  console.log('浮层内容体已就绪，当前组:', await activeGroup(cdp), '/ 子面板:', await activeSub(cdp))

  // 归位：主题组 + 样式
  await ensureGroupOpen(cdp, '主题')
  const b0 = await activeSub(cdp)
  if (b0 !== '样式') { await clickSub(cdp, '样式'); await sleep(300) }
  console.log('归位后:', await activeGroup(cdp), '/', await activeSub(cdp))

  // 取内容体几何，用于计算安全的拖拽坐标（避开表头与分段按钮）
  const geo = await cdp.eval(`(() => {
    const body = document.querySelector('.aurora-blog__panelzone-body')
    const head = document.querySelector('.aurora-blog__panelzone-head')
    const seg  = document.querySelector('.aurora-blog__subseg')
    const br = body.getBoundingClientRect()
    const hr = head ? head.getBoundingClientRect() : null
    const sr = seg ? seg.getBoundingClientRect() : null
    return { bx: br.x, by: br.y, bw: br.width, bh: br.height,
             headBottom: hr ? hr.bottom : br.y,
             segBottom: sr ? sr.bottom : (hr ? hr.bottom : br.y) }
  })()`)
  console.log('内容体几何:', JSON.stringify(geo))
  // 安全纵坐标：取分段按钮下方 + 一点偏移，保证落在内容留白上
  const safeY = Math.round(Math.max(geo.segBottom, geo.headBottom, geo.by) + 48)

  const res = []

  // #1 组内横滑 → 子面板切换（样式 → 配色）
  const b1 = await activeSub(cdp)
  const g1 = await activeGroup(cdp)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.78), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.22), toY: safeY })
  await sleep(450)
  const a1 = await activeSub(cdp)
  const ga1 = await activeGroup(cdp)
  res.push(ok('#1 组内横滑 → 子面板切换', b1 !== a1 && ga1 === g1, `${g1}/${b1} → ${ga1}/${a1}`))

  // #2 反向横滑 → 切回
  const b2 = await activeSub(cdp)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.22), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.78), toY: safeY })
  await sleep(450)
  const a2 = await activeSub(cdp)
  res.push(ok('#2 反向横滑 → 切回', b2 !== a2, `${b2} → ${a2}`))

  // #3 小位移慢速 → 回弹（不切换）
  const b3 = await activeSub(cdp)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.6), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.45), toY: safeY, steps: 30, stepDelay: 40 })
  await sleep(450)
  const a3 = await activeSub(cdp)
  res.push(ok('#3 小位移慢速 → 回弹', b3 === a3, `${b3} → ${a3}`))

  // #4 小位移快速甩 → 切换
  const b4 = await activeSub(cdp)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.62), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.4), toY: safeY, steps: 3, stepDelay: 4 })
  await sleep(450)
  const a4 = await activeSub(cdp)
  res.push(ok('#4 小位移快速甩 → 切换', b4 !== a4, `${b4} → ${a4}`))

  // #5 纵向小拖 → 不切换、内容体无横向位移
  const b5 = await activeSub(cdp)
  const g5 = await activeGroup(cdp)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.5), fromY: safeY - 10, toX: Math.round(geo.bx + geo.bw * 0.5), toY: safeY + 10, steps: 10 })
  await sleep(450)
  const a5 = await activeSub(cdp)
  const t5 = await cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__panelzone-body'); return b ? b.style.transform || 'none' : 'missing' })()`)
  res.push(ok('#5 纵向小拖 → 不切换（横向手势未抢占）', b5 === a5 && g5 === (await activeGroup(cdp)) && (t5 === 'none' || t5 === ''), `${g5}/${b5} → ${await activeGroup(cdp)}/${a5}  transform=${t5}`))

  // #6 不跨组：在「主题」组滑到边界后仍不进入「数据」组
  await ensureGroupOpen(cdp, '主题'); await sleep(250)
  await clickSub(cdp, '配色'); await sleep(300)
  const g6before = await activeGroup(cdp)
  // 往「下一个」方向猛甩两次，若允许跨组会跑到「数据」
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.85), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.15), toY: safeY, steps: 3, stepDelay: 4 })
  await sleep(400)
  await swipe(cdp, { fromX: Math.round(geo.bx + geo.bw * 0.85), fromY: safeY, toX: Math.round(geo.bx + geo.bw * 0.15), toY: safeY, steps: 3, stepDelay: 4 })
  await sleep(450)
  const g6after = await activeGroup(cdp)
  res.push(ok('#6 组边界处不跨组', g6before === g6after, `${g6before} → ${g6after}`))

  // #7 收起浮层：同组再点 = 收起
  await ensureGroupOpen(cdp, '主题'); await sleep(250)
  await clickGroup(cdp, '主题')
  await sleep(500)
  const collapsed = await cdp.eval(`!document.querySelector('.aurora-blog__panelzone-body')`)
  res.push(ok('#7 同组再点 → 收起浮层', collapsed, `bodyExists=${!collapsed}`))

  // #8 点击子面板按钮仍可用
  await ensureGroupOpen(cdp, '数据')
  const b8 = await activeSub(cdp)
  await clickSub(cdp, '功能'); await sleep(350)
  const a8 = await activeSub(cdp)
  res.push(ok('#8 点击子面板 → 立即切换', b8 !== a8 && a8 === '功能', `${b8} → ${a8}`))

  console.log('\n──────── 汇总 ────────')
  const p = res.filter(Boolean).length
  console.log(`${p}/${res.length} 通过`)
  ws.close()
  process.exit(p === res.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
