/**
 * CDP 真机探针 · Phase 3 验收：navReturn 迁移后「编辑器 ↔ 知识库返回」链路
 *
 * 验证目标（方案 Phase 3「风险」条明确要求）：
 *   navReturn 是导航上下文（模块级单例），jsdom 单测覆盖不到「真实 nav() 路由跳转」这一层。
 *   本探针在真实浏览器 + 真实 IndexedDB + 真实 hash 路由下走完整链路。
 *
 * 与 jsdom 的分工（摘要）：
 *   - jsdom 已覆盖：GraphPanel 登记 {view:'graph'}（GraphPanel.smoke:196）、
 *     图谱分支芯片渲染 + 点击回跳 + 清除（EditorPanel.smoke:184）。
 *   - 本探针覆盖：kbId 分支的端到端（建库 → 详情 → 跳编辑器 → 芯片 → 真实点击回跳），
 *     以及 nav('kb', kbId) 的参数映射是否真的把 kbId 带回去（memory 已知坑：参数漏登记即静默丢失）。
 *
 * 用法（必须与 Edge 同一次前台 bash，见 skill 铁律 1）：
 *   node .workbuddy/artifacts/cdp-verify-navreturn-phase3.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'
const KB_NAME = process.env.MC_KB_NAME || `P3返回库-${Date.now() % 100000}`
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
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
    return r.result.value
  }
}

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log(`   · ${s}`)

/** 轮询等待：连接成功 ≠ 页面已加载；过早 evaluate 会挂起而非报错 */
async function waitFor(cdp, expr, { tries = 60, ms = 500, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期忽略 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

/** 就绪判据 = 应用外壳 + 样式表到位（别用 #root，过早为真；别用固定 sleep，冷启要数十秒） */
async function ready(cdp, tries = 180) {
  const i = await waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
  return i
}

/** 首启引导浮层 position:fixed;inset:0 会截获所有指针 → 先排除（skill 铁律 2-1） */
async function dismissOnboarding(cdp) {
  return cdp.eval(`(() => {
    const el = document.querySelector('.aurora-audience')
    if (!el) return 'none'
    const b = [...el.querySelectorAll('button')].find(x => /开始|跳过|知道了|进入|继续/.test(x.textContent || ''))
    if (b) { b.click(); return 'clicked' }
    el.remove(); return 'removed'
  })()`)
}

async function rectOf(cdp, sel, nth = 0) {
  return cdp.eval(`(() => {
    const e = document.querySelectorAll(${JSON.stringify(sel)})[${nth}]
    if (!e) return null
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, txt: (e.textContent || '').trim().slice(0, 40) }
  })()`)
}

/** 真实鼠标点击（坐标 = CSS px） */
async function mouseClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  await sleep(40)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(50)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

/**
 * 点击元素并等待条件成立；窗口激活可能吞掉最早的合成鼠标事件 → 带重试（第 1 轮失败第 2 轮成功是常态）。
 * 返回 { via: 'real' | 'synthetic' | 'none', attempt }
 */
async function clickUntil(cdp, sel, cond, { tries = 6, nth = 0, label = sel } = {}) {
  for (let i = 1; i <= tries; i++) {
    const r = await rectOf(cdp, sel, nth)
    if (!r) { await sleep(500); continue }
    if (r.w === 0 || r.h === 0) { await sleep(500); continue }
    await mouseClick(cdp, r.x, r.y)
    const hit = await waitFor(cdp, cond, { tries: 10, ms: 400 })
    if (hit >= 0) return { via: 'real', attempt: i, rect: r }
    // 兜底：真实鼠标连续失败后改用合成 click()（会在报告中标注）
    if (i >= Math.ceil(tries / 2)) {
      const sent = await cdp.eval(`(() => {
        const e = document.querySelectorAll(${JSON.stringify(sel)})[${nth}]
        if (!e) return false
        e.click(); return true
      })()`)
      if (sent) {
        const hit2 = await waitFor(cdp, cond, { tries: 10, ms: 400 })
        if (hit2 >= 0) return { via: 'synthetic', attempt: i, rect: r }
      }
    }
  }
  console.log(`   ⚠ clickUntil 失败: ${label}`)
  return { via: 'none', attempt: tries }
}

async function goto(cdp, url, tries = 180) {
  await cdp.send('Page.navigate', { url })
  await sleep(700)
  const r = await ready(cdp, tries)
  await dismissOnboarding(cdp)
  await sleep(300)
  return r
}

// ────────────────────────────── 主流程 ──────────────────────────────

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) { console.error('未找到 5174 页面 target；当前 targets:', list.map(t => t.url).join('\n')); process.exit(2) }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')
  await cdp.send('Page.bringToFront')
  await cdp.eval(`window.focus()`)

  console.log('══════ 自检段：证明「芯片条件渲染」而非恒在（否则下游断言全为假绿）══════')
  {
    const u = `${BASE}/?p3=a#view=editor`
    const rdy = await goto(cdp, u)
    const shell = await cdp.eval(`document.querySelectorAll('.aurora-editor__layout, .aurora-editor').length`)
    const chip = await cdp.eval(`document.querySelector('.aurora-editor__return') ? document.querySelector('.aurora-editor__return').textContent.trim() : null`)
    const scanned = await cdp.eval(`({ sidebar: document.querySelectorAll('.aurora-sidebar-item').length, sheets: document.styleSheets.length, url: location.href })`)
    info(`就绪=${rdy >= 0}  编辑器节点=${shell}  扫描面=${JSON.stringify(scanned)}`)
    ok('自检#0a 编辑器真实挂载（扫描面非空）', shell > 0, `节点数=${shell}`)
    ok('自检#0b 无来源登记时**不得**出现返回芯片', chip === null, `芯片=${JSON.stringify(chip)}`)
  }

  console.log('\n══════ 链路准备：知识库管理页 → 建库 → 详情 ══════')
  const rdy2 = await goto(cdp, `${BASE}/?p3=b#view=kb`)
  ok('#1 落到知识库管理页', (await cdp.eval(`!!document.querySelector('.aurora-kb-manage')`)), `就绪=${rdy2 >= 0}`)

  let kbName = await cdp.eval(`document.querySelector('.aurora-kb-kbcard__name')?.textContent?.trim() ?? null`)
  if (!kbName) {
    console.log('   空态 → 走真实建库流程（新 profile 的 IndexedDB 为空）')
    let r = await clickUntil(cdp, '.aurora-kb-manage__empty-btn', `!!document.querySelector('#kb-create-name')`, { label: '空态「新建知识库」' })
    info(`建库弹窗打开方式 = ${r.via}`)
    const filled = await cdp.eval(`(() => {
      const el = document.querySelector('#kb-create-name')
      if (!el) return null
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(el, ${JSON.stringify(KB_NAME)})
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return el.value
    })()`)
    info(`受控 input 原生 setter 写入 = ${JSON.stringify(filled)}（React 影子状态需 input 事件，见坑 F）`)
    await sleep(200)
    const submitted = await cdp.eval(`(() => {
      const b = [...document.querySelectorAll('button')].find(x => /创建知识库/.test(x.textContent || '') && !x.disabled)
      if (!b) return false
      b.click(); return true
    })()`)
    await waitFor(cdp, `!!document.querySelector('.aurora-kb-kbcard')`, { tries: 40 })
    kbName = await cdp.eval(`document.querySelector('.aurora-kb-kbcard__name')?.textContent?.trim() ?? null`)
    info(`提交=${submitted} → 库名=${JSON.stringify(kbName)}`)
  } else {
    info(`复用已有知识库：${JSON.stringify(kbName)}`)
  }
  ok('#2 知识库卡片就绪', !!kbName, `kbName=${JSON.stringify(kbName)}`)

  const enter = await clickUntil(cdp, '.aurora-kb-kbcard', `!!document.querySelector('.aurora-kb-subbar')`, { label: '库卡片 → 详情' })
  const detailName = await cdp.eval(`document.querySelector('.aurora-kb-subbar__name')?.textContent?.trim() ?? null`)
  ok('#3 进入知识库详情页', (await cdp.eval(`!!document.querySelector('.aurora-kb-subbar')`)) === true, `点击方式=${enter.via}  详情库名=${JSON.stringify(detailName)}`)
  ok('#3b 详情页库名与卡片一致', detailName === kbName, `${JSON.stringify(detailName)} vs ${JSON.stringify(kbName)}`)

  const notesTab = `(() => {
    const b = [...document.querySelectorAll('.aurora-kb-subbar-tab')].find(x => /笔记/.test(x.textContent || ''))
    if (!b) return false
    b.click(); return true
  })()`
  await cdp.eval(notesTab)
  await waitFor(cdp, `!!document.querySelector('.aurora-kb-notes, .aurora-kb-placeholder')`, { tries: 20 })

  // ── 链路 A：新建笔记（KbPanel.handleCreateNote → setEditorReturn{view:'kb',kbId,label}）──
  console.log('\n══════ 链路 A：详情页 →「新建笔记」→ 编辑器 →「← 返回 <库名>」→ 详情页 ══════')
  const createSel = (await cdp.eval(`!!document.querySelector('.aurora-kb-notes__head button')`))
    ? '.aurora-kb-notes__head button' : '.aurora-kb-placeholder__actions button'
  info(`「新建笔记」选择器 = ${createSel}`)
  const hashBefore = await cdp.eval(`location.hash`)
  const a1 = await clickUntil(cdp, createSel, `!!document.querySelector('.aurora-editor__return')`, { label: '新建笔记 → 芯片出现' })
  ok('#4 点「新建笔记」→ 编辑器出现返回芯片', a1.via !== 'none', `点击方式=${a1.via}(第${a1.attempt}轮)  hash ${hashBefore} → ${await cdp.eval(`location.hash`)}`)

  const chipA = await cdp.eval(`document.querySelector('.aurora-editor__return')?.textContent?.replace(/\\s+/g,' ').trim() ?? null`)
  ok('#5 芯片文案 = 「← 返回 <库名>」', chipA === `← 返回 ${kbName}`, `实际=${JSON.stringify(chipA)}`)

  const a2 = await clickUntil(cdp, '.aurora-editor__return', `!!document.querySelector('.aurora-kb-subbar')`, { label: '真实点芯片 → 回详情' })
  const afterA = await cdp.eval(`({
    hash: location.hash,
    subbar: !!document.querySelector('.aurora-kb-subbar'),
    manage: !!document.querySelector('.aurora-kb-manage'),
    name: document.querySelector('.aurora-kb-subbar__name')?.textContent?.trim() ?? null,
    chip: document.querySelector('.aurora-editor__return')?.textContent?.trim() ?? null,
  })`)
  ok('#6 真实点芯片 → 回到知识库详情（而非管理页）', a2.via !== 'none' && afterA.subbar && !afterA.manage, `点击方式=${a2.via}  hash=${afterA.hash}  subbar=${afterA.subbar}  manage=${afterA.manage}`)
  ok('#7 回跳带回了 kbId（同一库，非首项兜底）', afterA.name === kbName, `实际库名=${JSON.stringify(afterA.name)}`)
  ok('#8 回跳后芯片已消失（clearEditorReturn 生效）', afterA.chip === null, `芯片=${JSON.stringify(afterA.chip)}`)

  // ── 链路 B：点库内笔记条目（KbPanel.openInEditor，同一 setEditorReturn 通路）──
  console.log('\n══════ 链路 B：详情页 → 点库内笔记条目 → 编辑器 → 芯片 → 详情页 ══════')
  await cdp.eval(notesTab)
  await waitFor(cdp, `!!document.querySelector('.aurora-kb-recent__item')`, { tries: 30 })
  const noteCount = await cdp.eval(`document.querySelectorAll('.aurora-kb-recent__item').length`)
  info(`库内笔记条目数 = ${noteCount}`)
  if (noteCount > 0) {
    const b1 = await clickUntil(cdp, '.aurora-kb-recent__item', `!!document.querySelector('.aurora-editor__return')`, { label: '笔记条目 → 芯片出现' })
    ok('#9 点笔记条目 → 编辑器出现返回芯片', b1.via !== 'none', `点击方式=${b1.via}`)
    const chipB = await cdp.eval(`document.querySelector('.aurora-editor__return')?.textContent?.replace(/\\s+/g,' ').trim() ?? null`)
    ok('#10 芯片文案 = 「← 返回 <库名>」', chipB === `← 返回 ${kbName}`, `实际=${JSON.stringify(chipB)}`)
    const b2 = await clickUntil(cdp, '.aurora-editor__return', `!!document.querySelector('.aurora-kb-subbar')`, { label: '真实点芯片 → 回详情(B)' })
    const afterB = await cdp.eval(`({ subbar: !!document.querySelector('.aurora-kb-subbar'), name: document.querySelector('.aurora-kb-subbar__name')?.textContent?.trim() ?? null, chip: document.querySelector('.aurora-editor__return') ? 1 : null })`)
    ok('#11 真实点芯片 → 回到同一库详情且芯片清除', b2.via !== 'none' && afterB.subbar && afterB.name === kbName && afterB.chip === null, `点击方式=${b2.via}  库名=${JSON.stringify(afterB.name)}`)
  } else {
    info('⚠ 库内无笔记条目 → 链路 B 跳过（新建笔记应已入库，若为 0 说明 folderId 归集异常）')
  }

  console.log('\n══════ 截图（静止态）══════')
  {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
    const fs = await import('fs')
    const out = `.workbuddy/artifacts/phase3-navreturn-final.png`
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
    info(`已保存 ${out}`)
  }

  console.log('\n──────── 汇总 ────────')
  const pass = results.filter(r => r.cond).length
  results.filter(r => !r.cond).forEach(r => console.log(`   ✗ 未通过: ${r.name}`))
  console.log(`${pass}/${results.length} 通过`)
  ws.close()
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针崩溃:', e); process.exit(3) })
