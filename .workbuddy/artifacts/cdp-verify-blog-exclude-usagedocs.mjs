/**
 * CDP 真机探针 · 博客工作室不得把内置《MarkCraft 使用文档》当博客文章（2026-09-23 用户报障）
 * ==========================================================================
 * 报障原话：
 *   「点击进入到博客功能，预览界面中的博客文章会显示 Markcraft 使用文档知识库中的笔记，
 *     现在文件列表中的没有这些笔记文件，要求从博客文章中删除。」
 *
 * 判定口径（本项目既有单源）：内置《使用文档》= 内置文件夹内、文件名命中内置篇章清单的文件。
 * 编辑器文件列表已按 `hiddenIds` 过滤；博客入口（无 kbId）的清单是**文件列表的镜像**，
 * 故必须用**同一集合**过滤 —— 这就是本探针要证的事。
 *
 * 两条「别自欺」的设计（本探针 v2 相对 v1 的修正）：
 *   ① 内置文件名清单**从 dev server 现取**（`src/core/data/defaultDocs/usageDocs/{zh,en,legacyNames}.ts`），
 *      不硬编码 —— v1 只核对了我自己种的那 4 篇，而应用启动时会把内置文档**补齐到 16 篇**，
 *      于是有 12 篇不在检查范围内（零命中断言被削弱）。
 *   ② 期望值在**断言时刻**重新读树计算，不用「播种后立刻读」的旧快照 ——
 *      否则会拿补齐之前的树去对补齐之后的界面（v1 曾因此侥幸通过）。
 *
 * 六段（每条都配了「不该成立」的对照，见 skill《防假绿升级》）：
 *   §0 自检：真实重载（window.__probeBoot 钩子）+ 就绪（外壳 + styleSheets）
 *        + 权威树里确含内置文档（扫描面非空）+ 确含 2 篇普通笔记（对照面非空）
 *   §1 进入博客（启动 URL #view=blog）→ 打开「数据」tab → 读清单标题
 *   §2 等式：清单 === 树内【非内置】.md（← 核心断言，在 HEAD 上必然翻红）
 *   §3 零命中：清单里一篇内置文档都没有（按 16 篇全量清单核对）
 *   §5 预览同源（真实 generateSingleFileBlog 产物）：渲染的是普通笔记正文，且不含任何内置文档正文
 *   §4 页面错误逐视图归属
 *
 * 用法（**必须与 Edge 同一次前台 bash**，见 skill 铁律 1；CDP 端口须与启动端口一致）：
 *   CDP_PORT=9468 node .workbuddy/artifacts/cdp-verify-blog-exclude-usagedocs.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.MC_BASE || 'http://127.0.0.1:5174'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.pageErrors = []
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
      if (m.method === 'Log.entryAdded') {
        const e = m.params?.entry
        if (e?.level === 'error') this.pageErrors.push(`console: ${e?.text}`)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
  mark() { return this.pageErrors.length }
  since(mark) { return this.pageErrors.slice(mark).filter((e) => !/ResizeObserver loop|Permissions-Policy/i.test(e)) }
}

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`)
  return !!cond
}
const info = (s) => console.log(`   · ${s}`)

async function waitFor(cdp, expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await cdp.eval(expr)) return i } catch { /* 上下文重建期 */ }
    await sleep(ms)
  }
  if (label) console.log(`   ⚠ 等待超时: ${label}`)
  return -1
}

/** 就绪判据必须与应用同源（别用 #root / .aurora-page，过早为真） */
function ready(cdp, tries = 180) {
  return waitFor(
    cdp,
    `document.readyState === 'complete'
     && document.querySelectorAll('.aurora-sidebar-item').length > 0
     && document.styleSheets.length > 8`,
    { tries, ms: 500 },
  )
}

// ────────────────────────── 种子 ──────────────────────────
// 名字必须用源码里的真名：文件夹 = core/data/defaultDocs/usageDocs/zh.ts#USAGE_DOC_FOLDER
const USAGE_FOLDER = 'MarkCraft 使用文档'
const NOTES_FOLDER = '我的笔记'
/** 本探针自种的内置篇章（**来源是真名的子集**）；其余由应用启动时补齐 —— 清单以现取为准 */
const SEEDED_USAGE_PAGES = ['00 开始使用.md', '01 界面布局.md', '02 编辑器模式.md', '知识链接体系指南.md']
/** 内置文档正文的 H1（**故意起独特名字**：预览若混入它们，断言必红，不存在巧合命中） */
const SEEDED_USAGE_H1S = ['内置说明书一', '内置说明书二', '内置说明书三', '内置说明书四']
/** 用户普通笔记（非内置 → 必须出现在博客清单里） */
const PLAIN_NOTES = ['甲笔记.md', '乙笔记.md']
const PLAIN_BODIES = ['这是甲笔记的正文，应当出现在博客预览里。', '这是乙笔记的正文。']

const STORAGE_KEY = 'markcraft-file-manager'
const STORAGE_VERSION = 'v5'

/** 从 dev server 现取**权威**内置文件名清单（zh + en + 历史旧名），不硬编码 */
async function loadBuiltinNames() {
  const dir = 'src/core/data/defaultDocs/usageDocs'
  const names = new Set()
  for (const f of ['zh.ts', 'en.ts', 'legacyNames.ts']) {
    const res = await fetch(`${BASE}/${dir}/${f}`)
    if (!res.ok) continue
    const txt = await res.text()
    for (const m of txt.matchAll(/fileName:\s*"([^"]+)"/g)) names.add(m[1])
    // legacyNames 是「旧名数组」结构：抓所有形如 "xxx.md" 的字面量
    for (const m of txt.matchAll(/"([^"]+\.md)"/g)) names.add(m[1])
  }
  return names
}

function SEED_EXPR() {
  const T = 1700000000000
  const f = (id, name, content) => ({ id, name, type: 'file', content, createdAt: T, updatedAt: T })
  const tree = {
    rootFolder: {
      id: 'root', name: '文件管理器', type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
      children: [
        {
          id: 'f-usage', name: USAGE_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: SEEDED_USAGE_PAGES.map((n, i) => f('ud-' + i, n, `# ${SEEDED_USAGE_H1S[i]}\n\n这是内置说明书的正文。\n`)),
        },
        {
          id: 'f-notes', name: NOTES_FOLDER, type: 'folder', createdAt: T, updatedAt: T, isExpanded: true,
          children: PLAIN_NOTES.map((n, i) => f('pn-' + i, n, `# ${n.replace(/\.md$/, '')}\n\n${PLAIN_BODIES[i]}\n`)),
        },
      ],
    },
    tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
  }
  return `(async () => {
    const tree = ${JSON.stringify(tree)}
    await new Promise((res) => {
      let req
      try { req = indexedDB.open('markcraft') } catch { res(); return }
      req.onerror = () => res()
      req.onsuccess = () => {
        const d = req.result
        let tx
        try { tx = d.transaction('kv', 'readwrite') } catch { d.close(); res(); return }
        tx.objectStore('kv').put({ key: ${JSON.stringify(STORAGE_KEY)}, value: JSON.stringify(tree) })
        tx.oncomplete = () => { d.close(); res() }
        tx.onerror = () => { d.close(); res() }
      }
    })
    // 🚨 坑 AJ：IDB 之外**必须**同时写 localStorage 的版本键，否则 loadStateAsync 的版本闸门直接 return null，
    //         注入的树根本不被读（随后被同步 T0 整体覆盖）→ 断言全假绿或全假红。
    localStorage.setItem(${JSON.stringify(STORAGE_KEY + '-version')}, ${JSON.stringify(STORAGE_VERSION)})
    // 关掉会追加文件的启动迁移（保证除了「内置文档补齐」，没有别的写入者改我的树）
    localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
    return true
  })()`
}

/**
 * 直读 IndexedDB 权威树（坑 M：文件树介质是 IndexedDB，localStorage 只有版本号）。
 * 同时返回「内置文件夹内每个文件的 名称 + 正文首个标题」——预览的文章标题取自正文 H1，故需要它。
 */
const TREE_READ = `(async () => {
  const val = await new Promise((res) => {
    let req
    try { req = indexedDB.open('markcraft') } catch { res(null); return }
    req.onerror = () => res(null)
    req.onsuccess = () => {
      const d = req.result
      let tx
      try { tx = d.transaction('kv', 'readonly') } catch { d.close(); res(null); return }
      const g = tx.objectStore('kv').get(${JSON.stringify(STORAGE_KEY)})
      g.onsuccess = () => { const r = g.result; d.close(); res(r ? r.value : null) }
      g.onerror = () => { d.close(); res(null) }
    }
  })
  if (!val) return { found: false, files: [], usageFolder: [] }
  const tree = typeof val === 'string' ? JSON.parse(val) : val
  const files = [], usageFolder = []
  const walk = (n, inUsage) => {
    if (!n) return
    if (n.type === 'file') {
      files.push(n.name)
      if (inUsage) {
        const first = String(n.content || '').split('\\n').map((s) => s.trim()).find((s) => s.startsWith('#')) || ''
        usageFolder.push({ name: n.name, h1: first.replace(/^#+\\s*/, '') })
      }
      return
    }
    const nowInUsage = inUsage || n.name === ${JSON.stringify(USAGE_FOLDER)}
    for (const c of n.children || []) walk(c, nowInUsage)
  }
  walk(tree.rootFolder, false)
  return { found: true, files, usageFolder }
})()`

/** 打开博客「数据」tab（组内首个子面板 = 内容），并回报顶部 tab 文案 */
const BLOG_LIST = `(() => {
  const tabs = [...document.querySelectorAll('.aurora-blog__tab')]
  const dataTab = tabs.find((t) => (t.textContent || '').trim().startsWith('数据'))
  if (dataTab) dataTab.click()
  return { tabs: tabs.map((t) => (t.textContent || '').trim()) }
})()`

const DOC_TITLES = `[...document.querySelectorAll('.aurora-blog-doc__title')].map((e) => (e.textContent || '').trim())`
const PREVIEW_SRC = `(() => {
  const fr = document.querySelector('iframe[title="博客预览"]')
  return fr ? fr.getAttribute('srcdoc') || '' : ''
})()`

const stripMd = (n) => String(n).replace(/\.md$/i, '')

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  // 坑 I：host 可能是 127.0.0.1 或 localhost —— 两者都匹配
  const page = list.find((t) => t.type === 'page' && /(localhost|127\.0\.0\.1):5174/.test(t.url))
  if (!page) {
    console.error('未找到 5174 页面 target；当前 targets:\n' + list.map((t) => t.url).join('\n'))
    process.exit(2)
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.enable')
  // 坑 P 判据：注入钩子 → 导航后断言它存在 ⇒ 证明**真的发生了重载**
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__probeBoot = (window.__probeBoot || 0) + 1;' })
  await cdp.send('Page.bringToFront')
  await cdp.eval('window.focus()')

  const m0 = cdp.mark()

  console.log('\n=== 0. 自检（播种 + 真实重载 + 扫描面/对照面非空）===')
  const builtinNames = await loadBuiltinNames()
  ok('§0 已从 dev server 现取到权威内置文件名清单（不硬编码）', builtinNames.size > 0,
    `${builtinNames.size} 个：${[...builtinNames].slice(0, 4).join(' / ')} …`)

  const r0 = await ready(cdp)
  ok('§0 应用外壳就绪（侧栏项 > 0 且样式表 > 8）', r0 >= 0, `waitIdx=${r0}`)

  const seeded = await cdp.eval(SEED_EXPR())
  ok('§0 种子写入成功（IndexedDB 权威树 + localStorage 版本键）', seeded === true, `seeded=${seeded}`)

  // 真实重载（换 query 触发新 document；坑 P：同 URL 导航可能不重建 document）
  await cdp.send('Page.navigate', { url: `${BASE}/?_p=blog-${Date.now()}#view=blog` })
  await sleep(600)
  const boot = await cdp.eval('window.__probeBoot || 0')
  ok('§0 确实发生了真实重载（__probeBoot 钩子存在 ⇒ 结论可信）', boot >= 1, `__probeBoot=${boot}`)
  const r1 = await ready(cdp)
  ok('§0 重载后应用外壳再次就绪', r1 >= 0, `waitIdx=${r1}`)

  // 等内置文档补齐到位（应用启动会把内置篇章 materialize 进该文件夹）
  await sleep(1500)

  console.log('\n=== 1. 进入博客 → 数据 tab → 读清单 ===')
  let tabsAt = await waitFor(cdp, `document.querySelectorAll('.aurora-blog__tab').length >= 3`, { tries: 20, ms: 400 })
  if (tabsAt < 0) {
    // 兜底入口：点侧栏「博客」（合成 DOM click，不经窗口激活 —— 见 skill 铁律 2 / 坑 T）
    const clicked = await cdp.eval(`(() => {
      const el = [...document.querySelectorAll('.aurora-sidebar-item')].find((e) => (e.textContent || '').includes('博客'))
      if (!el) return false
      el.click()
      return true
    })()`)
    info('§1 深链未直接进博客，兜底点侧栏「博客」→ clicked=' + clicked)
    tabsAt = await waitFor(cdp, `document.querySelectorAll('.aurora-blog__tab').length >= 3`, { tries: 60, ms: 500, label: '博客顶部 tab(兜底)' })
  }
  const tabInfo = await cdp.eval(BLOG_LIST)
  info('§1 顶部 tab = ' + JSON.stringify(tabInfo.tabs))
  ok('§1 博客工作室已挂载（启动 URL 深链 #view=blog 生效）',
    tabsAt >= 0 && Array.isArray(tabInfo?.tabs) && tabInfo.tabs.some((t) => t.startsWith('数据')),
    `tabs=${JSON.stringify(tabInfo.tabs)}`)

  await waitFor(cdp, `document.querySelectorAll('.aurora-blog-doc__title').length > 0`, { tries: 40, ms: 500, label: '待发布清单' })
  const titles = await cdp.eval(DOC_TITLES)
  const previewSrc = await cdp.eval(PREVIEW_SRC)
  info('§1 清单(' + titles.length + ') = ' + JSON.stringify(titles))
  info('§1 预览 srcdoc 长度 = ' + (previewSrc || '').length)

  // ⚠️ 期望值在**此刻**重新读树（不用播种后的旧快照 —— 应用会把内置文档补齐，旧快照会漏掉它们）
  const tree = await cdp.eval(TREE_READ)
  const usageInTree = (tree.usageFolder || []).filter((f) => builtinNames.has(f.name))
  info('§0 断言时刻的树：全部文件 ' + (tree.files || []).length + " 个；内置文件夹内命中内置清单 " + usageInTree.length + ' 篇')
  ok('§0 扫描面非空：权威树里**确实**躺着内置文档（否则后面的「零命中」是空转）',
    tree.found === true && usageInTree.length >= SEEDED_USAGE_PAGES.length,
    `usageFolder=${JSON.stringify((tree.usageFolder || []).map((f) => f.name))}`)
  ok('§0 对照面非空：权威树里也有 2 篇普通笔记',
    PLAIN_NOTES.every((n) => (tree.files || []).includes(n)), `files=${JSON.stringify(tree.files)}`)

  console.log('\n=== 2. 清单口径 = 文件列表（树内非内置 .md）===')
  const expectTitles = (tree.files || [])
    .filter((n) => /\.md$/i.test(n))
    .filter((n) => !(builtinNames.has(n) && (tree.usageFolder || []).some((f) => f.name === n)))
    .map(stripMd)
    .sort()
  const gotTitles = [...titles].sort()
  ok('§2 🚨 待发布清单 === 树内【非内置】.md（本种子 = 甲笔记 / 乙笔记）',
    JSON.stringify(gotTitles) === JSON.stringify(expectTitles),
    `期望=${JSON.stringify(expectTitles)} 实际=${JSON.stringify(gotTitles)}`)
  ok('§2 清单非空（证明清单链路可用，不是"整体没渲染"）', gotTitles.length > 0, `count=${gotTitles.length}`)

  console.log('\n=== 3. 零命中：内置文档一篇都不在清单里 ===')
  const builtinTitles = new Set([...builtinNames].map(stripMd))
  const leaked = gotTitles.filter((t) => builtinTitles.has(t))
  ok('§3 🚨 清单里不出现任何一篇内置《使用文档》', leaked.length === 0,
    leaked.length ? `泄漏=${JSON.stringify(leaked)}` : `按 ${builtinTitles.size} 篇内置全量清单核对，清单 ${gotTitles.length} 篇全为普通笔记`)

  console.log('\n=== 5. 预览同源（真实生成器产物）===')
  ok('§5 预览渲染的是普通笔记正文（甲 / 乙都在）',
    previewSrc.includes(PLAIN_BODIES[0]) && previewSrc.includes(PLAIN_BODIES[1]),
    `len=${(previewSrc || '').length}`)
  // 预览的文章标题取自**正文首个标题** → 用树里内置文档的真实 H1 核对（数据派生，不是写死字面量）
  const usageH1s = usageInTree.map((f) => f.h1).filter((h) => h && h.length > 1)
  info('§5 内置文档真实 H1 样本 = ' + JSON.stringify(usageH1s.slice(0, 6)))
  const leakedH1 = usageH1s.filter((h) => previewSrc.includes(h))
  ok('§5 🚨 预览里不含任何内置文档正文（内置文档的正文标题一个都不出现）',
    usageH1s.length > 0 && leakedH1.length === 0,
    leakedH1.length ? `泄漏=${JSON.stringify(leakedH1)}` : `检测 ${usageH1s.length} 个内置 H1，命中 0`)

  console.log('\n=== 4. 页面错误（逐视图归属）===')
  const errs = cdp.since(m0)
  ok('§4 全程无新增页面错误', errs.length === 0, errs.length ? JSON.stringify(errs.slice(0, 3)) : '0 条')

  const failed = results.filter((r) => !r.cond)
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) {
    console.log('未通过：')
    failed.forEach((f) => console.log('  ❌ ' + f.name))
  }
  ws.close()
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('探针异常：', e?.message || e)
  process.exit(3)
})
