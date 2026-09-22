/**
 * CDP 真机探针 · 升级迁移：旧版永久落盘的使用文档标签在启动时被剥掉（2026-09-22 第三轮报障）
 * ==========================================================================
 * 报障原话：「请修复，为什么现在点击编辑功能进入后还是会显示 markcraft 使用文档知识库内的笔记文档」
 *
 * 根因：瞬态标签机制上线**之前**的版本把点开的使用文档当普通标签（无 isTransient）
 * 随 tabs/activeTabId 整体序列化进 IndexedDB；升级后 loadStateAsync 原样还原，
 * 编辑器直接落在说明书上。
 *
 * 本探针证三件事：
 *   §M1 注入「旧格式落盘 state」（activeTabId 指向说明书，最恶劣现场）→ reload →
 *       ① 编辑器标签栏/编辑区落在普通笔记（不是说明书）；② 落盘被净化回写（tabs 剥掉说明书、
 *       activeTabId 修正）；③ 普通笔记标签**没有被误删**。
 *   §M2 对照组：注入干净 state（只有普通笔记 tab）→ reload → 原样保留（激活不变）——
 *       证明 §M1 的剥除是条件式的，不是「启动清空所有标签」。
 *
 * ⚠️ HEAD 阳性对照（还原 FileStore.tsx 到 HEAD 后跑 ONLY=M1 应精确翻红）由外层 bash 编排，
 *    本文件不负责还原。
 *
 * 用法（**必须与 Edge 同一次前台 bash**）：
 *   node .workbuddy/artifacts/cdp-verify-usagedoc-migration.mjs
 * 作用域开关：ONLY=M1 / ONLY=M2
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const ONLY = process.env.ONLY || ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ✅ ${label}`) }
  else { fail++; console.log(`  ❌ ${label}`) }
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.pageErrors = []; this.consoleLogs = []
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
        return
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params?.exceptionDetails
        this.pageErrors.push(`exception: ${d?.exception?.description || d?.text || 'unknown'}`)
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'info') {
        this.consoleLogs.push((m.params.args || []).map(a => a.value ?? '').join(' '))
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
}

async function connectPage() {
  const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json())
  const page = list.find(t => t.type === 'page' && t.url.includes('5174'))
  if (!page) throw new Error('找不到 5174 页面 target：' + JSON.stringify(list.map(t => t.url)))
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  return cdp
}

/** 旧格式 state：说明书以普通标签落盘且**处于激活位**（升级现场的最恶劣形态） */
const NOTE_ID = 'f-note-mig', NOTE_TAB = 't-note-mig', BUILTIN_ID = 'f-builtin-mig', BUILTIN_TAB = 't-builtin-mig'
const NOTE_NAME = '迁移对照-普通笔记.md'
const LEGACY_STATE = JSON.stringify({
  rootFolder: {
    id: 'root', name: '文件管理器', type: 'folder', createdAt: 1700000000000, updatedAt: 1700000000000,
    children: [
      {
        id: 'folder-docs', name: 'MarkCraft 使用文档', type: 'folder', createdAt: 1700000000000, updatedAt: 1700000000000,
        children: [{ id: BUILTIN_ID, name: '00 开始使用.md', type: 'file', content: '# MarkCraft 使用文档\n\n内置说明书。', createdAt: 1700000000000, updatedAt: 1700000000000 }],
      },
      {
        id: 'folder-notes', name: '我的笔记', type: 'folder', createdAt: 1700000000000, updatedAt: 1700000000000,
        children: [{ id: NOTE_ID, name: NOTE_NAME, type: 'file', content: '# 迁移对照普通笔记\n\n用户内容。', createdAt: 1700000000000, updatedAt: 1700000000000 }],
      },
    ],
  },
  tabs: [
    { id: BUILTIN_TAB, fileId: BUILTIN_ID, name: '00 开始使用.md', isActive: true },
    { id: NOTE_TAB, fileId: NOTE_ID, name: NOTE_NAME, isActive: false },
  ],
  activeTabId: BUILTIN_TAB,
  searchQuery: '', sidebarVisible: true,
})

const CLEAN_STATE = JSON.stringify({
  rootFolder: JSON.parse(LEGACY_STATE).rootFolder,
  tabs: [{ id: NOTE_TAB, fileId: NOTE_ID, name: NOTE_NAME, isActive: true }],
  activeTabId: NOTE_TAB,
  searchQuery: '', sidebarVisible: true,
})

const STATE_TO_WRITE = ONLY === 'M2' ? CLEAN_STATE : LEGACY_STATE
const PERSIST_WRITE = `(async () => {
  // 🚨 loadStateAsync 有版本闸门：localStorage 版本键不匹配 → 直接返回 null（注入数据不被读，
  //    随后被同步 T0 覆盖 = 全假绿）。必须一并写版本键 + link-guide 迁移键（防迁移改树扰断言）。
  try {
    localStorage.setItem('markcraft-file-manager-version', 'v5')
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
  } catch {}
  // state JSON 用 JSON.stringify 双层编码嵌入（规避控制字符二次解析）
  const stateJson = ${JSON.stringify(STATE_TO_WRITE)};
  await new Promise((res) => {
    const req = indexedDB.open('markcraft')
    req.onsuccess = () => {
      const d = req.result
      const tx = d.transaction('kv', 'readwrite')
      tx.objectStore('kv').put({ key: 'markcraft-file-manager', value: stateJson })
      tx.oncomplete = () => { d.close(); res() }
      tx.onerror = () => { d.close(); res() }
    }
  })
})()`

const PERSIST_READ = /* js */`(async () => {
  const val = await new Promise((res) => {
    const req = indexedDB.open('markcraft')
    req.onsuccess = () => {
      const d = req.result
      const g = d.transaction('kv', 'readonly').objectStore('kv').get('markcraft-file-manager')
      g.onsuccess = () => { d.close(); res(g.result ? g.result.value : null) }
      g.onerror = () => { d.close(); res(null) }
    }
  })
  if (!val) return null
  const s = typeof val === 'string' ? JSON.parse(val) : val
  return { tabFileIds: s.tabs.map(t => t.fileId), activeTabId: s.activeTabId, tabNames: s.tabs.map(t => t.name) }
})()`

async function reloadAndWait(cdp) {
  await cdp.send('Page.enable')
  await cdp.eval('location.reload()')
  // 轮询等 app 真正挂载（dev 首次编译可能远慢于固定 sleep），再等防抖回写
  const t0 = Date.now()
  let up = false
  while (Date.now() - t0 < 20000) {
    await sleep(500)
    try {
      up = await cdp.eval(`!!document.querySelector('[class*="aurora"]')`)
    } catch { up = false } // reload 期间 eval 上下文销毁会抛错，忽略继续轮询
    if (up) break
  }
  console.log(`app 挂载：${up ? 'yes' : 'NO(20s 超时)'}，耗时 ${Date.now() - t0}ms；hydrated 日志：`)
  console.log('  ' + cdp.consoleLogs.filter(l => l.includes('FileStore')).slice(-2).join('\n  '))
  await sleep(1500)
}

const CLICK_EDITOR_SIDEBAR = `(() => {
  const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('编辑器'))
  if (e) e.click()
  return !!e
})()`

async function domSnapshot(cdp) {
  // reload 后默认视图未必是编辑器（标签栏可能未渲染）→ 先点侧栏「编辑器」切过去再查 DOM
  const clicked = await cdp.eval(CLICK_EDITOR_SIDEBAR)
  await sleep(800)
  return {
    clicked,
    // 🚨 标签栏显示**去掉 .md 后缀**的名字（照抄 brief 探针 6c 的口径），查完整文件名恒假
    hasBuiltinTab: await cdp.eval(`document.body.textContent.includes('00 开始使用')`),
    hasNoteTab: await cdp.eval(`document.body.textContent.includes('迁移对照-普通笔记')`),
  }
}

const cdp = await connectPage()
console.log('CDP 已连接 5174 页面')

// ---------- §M0 起手区：证明扫描面/数据面非空 ----------
const before = await cdp.eval(PERSIST_READ)
console.log('§M0 起手区：当前落盘 =', JSON.stringify(before))
if (ONLY !== 'M2') {
  await cdp.eval(PERSIST_WRITE)
  console.log('§M0 已注入旧格式 state（activeTabId → 说明书）')
}

await reloadAndWait(cdp)

if (ONLY !== 'M2') {
  // ---------- §M1 主断言 ----------
  console.log('\n§M1 旧格式落盘 state → 启动迁移剥掉说明书标签：')
  const dom = await domSnapshot(cdp)
  ok(!dom.hasBuiltinTab, '① 编辑器内不再出现说明书（旧版会直接落在这篇上 = 本次报障现象）')
  ok(dom.hasNoteTab, '② 普通笔记标签原样保留（不误删）')

  // 轮询等防抖回写（save effect 300ms；最多 8s），落盘一变就停
  let persisted = null
  const p0 = Date.now()
  while (Date.now() - p0 < 8000) {
    await sleep(500)
    persisted = await cdp.eval(PERSIST_READ)
    if (persisted && persisted.activeTabId !== BUILTIN_TAB) break
  }
  ok(Array.isArray(persisted?.tabFileIds) && !persisted.tabFileIds.includes(BUILTIN_ID), '③ 落盘 tabs 已剥掉说明书')
  ok(persisted?.tabFileIds?.includes(NOTE_ID), '④ 落盘保留普通笔记')
  ok(persisted?.activeTabId !== BUILTIN_TAB, '⑤ 落盘 activeTabId 不再指向说明书（防悬空）')

  const errs = cdp.pageErrors.filter(e => !/ResizeObserver|Permissions-Policy/i.test(e))
  ok(errs.length === 0, '⑥ 无页面错误（' + errs.slice(0, 2).join(' | ') + '）')
} else {
  // ---------- §M2 对照组 ----------
  console.log('\n§M2 对照组 · 干净 state（只有普通笔记）→ 原样保留：')
  const dom = await domSnapshot(cdp)
  ok(dom.hasNoteTab, '① 普通笔记标签保留')
  ok(!dom.hasBuiltinTab, '② 说明书未出现（本来就不在）')
  await sleep(600)
  const persisted = await cdp.eval(PERSIST_READ)
  ok(persisted?.activeTabId === NOTE_TAB, '③ activeTabId 原样指向普通笔记（迁移不搅动干净数据）')
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
