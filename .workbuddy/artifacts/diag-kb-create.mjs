/** 诊断：知识库列表页 → 建库 → 进详情 这条链路卡在哪一步 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9448)
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
    if (r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') }
    return r.result?.value
  }
}

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.filter((t) => t.type === 'page' && t.url.includes('localhost:5174')).pop()
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => (ws.on('open', r)))
const cdp = new Cdp(ws)
ws.on('message', (raw) => cdp.onMessage(raw))
await cdp.send('Runtime.enable')
await cdp.send('Page.enable')

// 收集 console 错误
const logs = []
await cdp.send('Log.enable').catch(() => {})
ws.on('message', (raw) => {
  const m = JSON.parse(raw)
  if (m.method === 'Log.entryAdded') logs.push(`[${m.params.entry.level}] ${m.params.entry.text}`)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    logs.push('[console.error] ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
})

const dump = async (tag) => {
  const r = await cdp.eval(`(() => ({
    hash: location.hash,
    manage: document.querySelectorAll('.aurora-kb-manage').length,
    emptyBtn: [...document.querySelectorAll('.aurora-kb-manage__empty-btn')].map(e => e.textContent.trim()),
    primaryBtns: [...document.querySelectorAll('.aurora-kb-btn--primary')].map(e => e.textContent.trim()).slice(0, 8),
    cards: document.querySelectorAll('.aurora-kb-kbcard').length,
    modal: document.querySelectorAll('[class*="Modal"], .aurora-kb-modal').length,
    modalInputs: [...document.querySelectorAll('input')].map(e => e.className + '|' + e.placeholder).slice(0, 6),
    modalBtns: [...document.querySelectorAll('[class*="modal"] button, .aurora-kb-modal button')].map(e => e.textContent.trim()).slice(0, 8),
    subbar: document.querySelectorAll('.aurora-kb-subbar-tabs').length,
    bodyClass: document.body.className,
  }))()`)
  console.log(`--- ${tag} ---`)
  console.log(JSON.stringify(r, null, 1))
  return r
}

// 回列表
await cdp.eval(`(() => { location.hash = '#view=kb'; window.dispatchEvent(new HashChangeEvent('hashchange')); return 1 })()`)
await sleep(1500)
await cdp.eval(`(() => { const c = document.querySelector('.aurora-kb-kbcard'); if (c) c.click(); return !!c })()`)
await sleep(1200)
await cdp.eval(`(() => { location.hash = '#view=kb'; window.dispatchEvent(new HashChangeEvent('hashchange')); return 1 })()`)
await sleep(1500)
const a = await dump('1. 进入 kb 列表页')

// 点新建
await cdp.eval(`(() => {
  const b = document.querySelector('.aurora-kb-manage__empty-btn') || document.querySelector('.aurora-kb-manage .aurora-kb-btn--primary')
  if (b) b.click()
  return !!b
})()`)
await sleep(1000)
await dump('2. 点「新建知识库」后')

// 填名
const filled = await cdp.eval(`(() => {
  const el = document.querySelector('.aurora-kb-modal input.aurora-kb-input') || document.querySelector('.aurora-kb-input')
  if (!el) return 'NO_INPUT'
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, 'CDP 验证库')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return el.value
})()`)
console.log(`填入名称 → ${JSON.stringify(filled)}`)
await sleep(500)
console.log('填写后按钮态 →', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('.aurora-kb-btn--primary')].map(b => ({ t: b.textContent.trim(), disabled: b.disabled })))()`)))

// 提交
const clicked = await cdp.eval(`(() => {
  const b = [...document.querySelectorAll('.aurora-kb-btn--primary')].find(x => /创建知识库/.test(x.textContent || ''))
  if (!b) return 'NO_BTN'
  if (b.disabled) return 'DISABLED'
  b.click()
  return 'CLICKED'
})()`)
console.log(`提交按钮 → ${clicked}`)
await sleep(2000)
await dump('3. 提交后')
console.log('页面可见文本片段 →', JSON.stringify(String(await cdp.eval(`document.body.innerText.replace(/\\s+/g,' ').slice(0,400)`))))
console.log('toast 节点 →', JSON.stringify(await cdp.eval(`[...document.querySelectorAll('[class*="toast" i]')].map(e => e.textContent.trim()).slice(0,5)`)))

console.log('--- 浏览器日志 ---')
for (const l of logs.slice(-25)) console.log(' ', l)

ws.close()
