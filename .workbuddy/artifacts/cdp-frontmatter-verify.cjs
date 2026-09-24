/**
 * CDP 真机取证探针 · FrontMatterPanel（文档属性模态）迁移后
 * ------------------------------------------------------------
 * 与前一个探针（cdp-overlay-verify.cjs，只探「基底类」）的区别：
 *   本探针**真的把面板点开**（打开文件 → 工具栏「更多」→「文章元信息」），
 *   再读**组件实际渲染出来的**计算样式 —— 静态断言只证源码归位，这一步证「真机真的长对了」。
 *
 * 关键断言（每条都读 CSSOM 真值，不抄字面值）：
 *   · 遮罩是 portal 到 body 的（= #aurora-root 的兄弟）⇒ 证明守卫前提成立；
 *   · 遮罩 z-index = 3000（模态带）/ 面板底 = --mc-bg-content 真值；
 *   · 字段走 .aurora-input（28px + --mc-bg-elevated）/ 焦点环走 --mc-accent；
 *   · 多行字段 .aurora-input--multiline：解开单行高度锁（height auto / min-height 64）；
 *   · **反证**：面板底色不得命中旧 slate 指纹 rgb(15,23,42)（= --editor-bg 旧值）。
 *
 * 用法：node .workbuddy/artifacts/cdp-frontmatter-verify.cjs [appUrl] [cdpUrl]
 */
const fs = require('fs')
const path = require('path')

const APP_URL = process.argv[2] || 'http://localhost:5174/#view=editor'
const CDP_URL = process.argv[3] || 'http://127.0.0.1:9222'
const PROGRESS = path.join(process.cwd(), '.workbuddy/artifacts/_cdp-progress.log')

const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}`
  console.log(line)
  try { fs.appendFileSync(PROGRESS, line + '\n') } catch {}
}

function withTimeout(promise, ms, label) {
  let t
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`TIMEOUT ${label} (${ms}ms)`)), ms) }),
  ]).finally(() => clearTimeout(t))
}

async function main() {
  const target = await withTimeout(
    fetch(`${CDP_URL}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()),
    8000, 'json/new',
  )
  log(`新 target 已建：${target.id}`)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await withTimeout(new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 连接失败')) }), 8000, 'ws-open')

  let id = 0
  const pending = new Map()
  const consoleErrors = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 300))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXCEPTION: ' + (msg.params.exceptionDetails?.exception?.description || '').slice(0, 300))
    }
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    }
  }
  const send = (method, params = {}, ms = 20000) =>
    withTimeout(new Promise((res, rej) => {
      const myId = ++id
      pending.set(myId, { res, rej })
      ws.send(JSON.stringify({ id: myId, method, params }))
    }), ms, method)

  const evalJs = async (expression, ms = 20000) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, ms)
    if (r.exceptionDetails) throw new Error('页面内异常：' + JSON.stringify(r.exceptionDetails).slice(0, 500))
    return r.result.value
  }
  const waitFor = async (expr, label, rounds = 40, gap = 500) => {
    for (let i = 0; i < rounds; i++) {
      if (await evalJs(expr)) return true
      await new Promise((r) => setTimeout(r, gap))
    }
    log(`!! 等待超时：${label}`)
    return false
  }

  await send('Page.enable')
  await send('Runtime.enable')
  // 先注入 __bootAt 再导航（本仓铁律：禁裸 reload 后无锚点）
  await send('Page.navigate', { url: APP_URL })
  log('已导航到 ' + APP_URL)

  if (!(await waitFor("(() => { const r = document.getElementById('aurora-root'); return !!r && r.children.length > 0 })()", '#aurora-root 内部有内容', 90, 500))) {
    // ★ 只能等「内部有内容」：`#aurora-root` 本身写在 index.html 里，等它会假绿（本轮实测踩过）
    throw new Error('等不到 #aurora-root 内部渲染内容')
  }
  if (!(await waitFor("!!getComputedStyle(document.documentElement).getPropertyValue('--mc-bg-elevated').trim()", '--mc-* token', 40, 250))) {
    throw new Error('等不到 --mc-* token 真值')
  }
  log('应用已挂载，token 就绪')

  const vis = await evalJs('document.visibilityState')
  log('visibilityState = ' + vis)

  // ── 步骤 1：造一个已打开的文件（空库时是空态 ⇒ 点「新建笔记」）────────
  const opened = await evalJs(`(() => {
    // ① 会话已恢复出打开的文件（标签页在）⇒ 直接用，别再新建
    if (document.querySelector('.aurora-tab')) {
      return { ok: true, via: 'existing-tab', picked: (document.querySelector('.aurora-tab').textContent || '').trim().slice(0, 40) }
    }
    // ② 文件树里有可点项（侧栏悬停展开后才会渲染）
    const items = [...document.querySelectorAll('.aurora-filetree__item')]
      .filter(el => !el.className.includes('--editing') && el.getBoundingClientRect().height > 0)
    if (items.length) {
      const md = items.find(el => /\\.(md|markdown|txt)$/i.test(el.textContent || '')) || items[0]
      md.click()
      return { ok: true, via: 'filetree', picked: (md.textContent || '').trim().slice(0, 40) }
    }
    // ③ 空库空态：「新建笔记」
    const nb = [...document.querySelectorAll('.aurora-editor__newfile-btn')].find(el => el.getBoundingClientRect().height > 0)
    if (!nb) return { ok: false, reason: 'no-tab-no-filetree-no-newfile-btn' }
    nb.click()
    return { ok: true, via: 'newfile-btn', picked: (nb.textContent || '').trim() }
  })()`)
  log('步骤1 打开文件：' + JSON.stringify(opened))
  if (!opened.ok) throw new Error('无法准备一个已打开的文件：' + JSON.stringify(opened))

  // 若落在行内命名态（本仓 FileTree 新建范式），回车提交
  await new Promise((r) => setTimeout(r, 800))
  const renamed = await evalJs(`(() => {
    const inp = document.activeElement
    if (inp && inp.tagName === 'INPUT') {
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      return { hadInput: true, value: inp.value }
    }
    return { hadInput: false }
  })()`)
  if (renamed.hadInput) log('步骤1b 行内命名提交：' + JSON.stringify(renamed))

  // 等工具栏出现（说明编辑器真的开起来了）
  const toolbarUp = await waitFor(`!!document.querySelector('button[title="更多"]')`, '编辑器工具栏出现', 30, 500)
  log('步骤1c 工具栏出现=' + toolbarUp)

  // ── 步骤 1d：切到「源码」模式 ────────────────────────────────
  // 原因（本轮实测发现，属**既有接线缺口**，非本轮改动）：
  //   TiptapEditor.tsx 的 modalsValue 里 `onOpenFrontMatter: () => {}` 是空实现
  //   ⇒ 富文本（WYSIWYG）模式下「文章元信息」点了没反应。源码模式（CM6）才接线。
  if (!(await evalJs("!!document.querySelector('.aurora-editor__source')"))) {
    const sw = await evalJs(`(() => {
      const b = [...document.querySelectorAll('.aurora-mode-toggle')]
        .find(el => (el.getAttribute('title') || '').startsWith('源码') && el.getBoundingClientRect().height > 0)
      if (!b) return { ok: false }
      b.click(); return { ok: true }
    })()`)
    log('步骤1d 切源码模式：' + JSON.stringify(sw))
    await waitFor("!!document.querySelector('.aurora-editor__source')", '源码视图就绪', 20, 300)
  }
  const modeNow = await evalJs("document.querySelector('.aurora-editor__source') ? 'source' : 'other'")
  log('当前模式 = ' + modeNow)

  // ── 步骤 2：点可见的「更多」按钮（同名入口可能散布多工具栏 ⇒ 必须按可见性筛选）──
  const btnClicked = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button[title="更多"]')]
    const seen = btns.map(b => ({ h: Math.round(b.getBoundingClientRect().height), vis: !!b.offsetParent }))
    const vis = btns.filter(b => b.getBoundingClientRect().height > 0 && b.offsetParent !== null)
    if (!vis.length) return { ok: false, candidates: seen }
    vis[0].click()
    return { ok: true, candidates: seen, picked: vis.length }
  })()`)
  log('步骤2 点「更多」：' + JSON.stringify(btnClicked))

  const menuUp = await waitFor("!!document.querySelector('.aurora-dropdown .aurora-dropdown__item')", '更多菜单展开', 20, 250)
  log('步骤2b 菜单展开=' + menuUp)

  // ── 步骤 3：点「文章元信息」项 ────────────────────────────────
  let itemClicked = { ok: false, reason: 'menu-not-open' }
  if (menuUp) {
    itemClicked = await evalJs(`(() => {
      const items = [...document.querySelectorAll('.aurora-dropdown .aurora-dropdown__item')]
      const labels = items.map(i => (i.textContent || '').trim())
      const hit = items.find(i => (i.textContent || '').includes('文章元信息') || /Front ?Matter/i.test(i.textContent || ''))
      if (!hit) return { ok: false, reason: 'item-not-found', labels }
      hit.click()
      return { ok: true, labels }
    })()`)
  }
  log('步骤3 点菜单项：' + JSON.stringify(itemClicked))

  const panelUp = await waitFor("!!document.querySelector('.aurora-modal-overlay .aurora-modal')", '文档属性面板出现', 40, 300)
  log('步骤3b 面板出现=' + panelUp)
  if (!panelUp) {
    // 失败也要留下现场（禁只报「未出现」而无信息）
    const diag = await evalJs(`(() => JSON.stringify({
      overlayCount: document.querySelectorAll('.aurora-modal-overlay').length,
      modalCount: document.querySelectorAll('.aurora-modal').length,
      bodyChildClasses: [...document.body.children].map(c => c.tagName + '.' + (typeof c.className === 'string' ? c.className.split(/\\s+/).join('.') : '')),
      menuStillOpen: !!document.querySelector('.aurora-dropdown'),
      mode: document.querySelector('.aurora-editor__source') ? 'source(cm6)' : (document.querySelector('.tiptap, .ProseMirror, .wysiwyg') ? 'wysiwyg' : 'unknown'),
      editorRootClasses: [...document.querySelectorAll('.aurora-editor *')].slice(0, 0).length,
      hasSourceWrap: !!document.querySelector('.aurora-editor__source'),
      hasFormatBar: !!document.querySelector('.dv-format-bar, .aurora-editor__formatbar'),
    }))()`)
    log('现场诊断：' + diag)
    log('console 错误：' + (consoleErrors.length ? consoleErrors.slice(0, 5).join(' || ') : '(无)'))
    throw new Error('面板未出现，无法取证')
  }

  // ── 步骤 3c：展开「高级设置」（否则只会渲染 1 个 textarea，断言会误判）──
  const advClicked = await evalJs(`(() => {
    const b = [...document.querySelectorAll('.aurora-modal-overlay button')]
      .find(el => (el.textContent || '').includes('高级设置'))
    if (!b) return { ok: false }
    b.click(); return { ok: true }
  })()`)
  log('步骤3c 展开高级设置：' + JSON.stringify(advClicked))
  await new Promise((r) => setTimeout(r, 600))

  // ── 步骤 4：读真机计算样式 ────────────────────────────────────
  const PROBE = `(() => {
    const truth = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const ov = document.querySelector('.aurora-modal-overlay')
    if (!ov) return JSON.stringify({ found: false })
    const panel = ov.querySelector('.aurora-modal')
    const inp = ov.querySelector('.aurora-input:not(.aurora-input--multiline)')
    const ta = ov.querySelector('.aurora-input--multiline')
    const lbl = ov.querySelector('.aurora-field__label')
    const sw = ov.querySelector('.aurora-switch')
    const title = ov.querySelector('.aurora-modal__title')
    const closeBtn = ov.querySelector('.aurora-modal__close')
    const footer = ov.querySelector('.aurora-modal__footer')
    const btnPrimary = ov.querySelector('.aurora-btn--primary')
    const cs = (el) => el ? getComputedStyle(el) : null
    const S = cs(panel), I = cs(inp), T = cs(ta), L = cs(lbl)
    return JSON.stringify({
      found: true,
      isPortalToBody: ov.parentElement === document.body,
      insideAuroraRoot: !!ov.closest('#aurora-root'),
      fieldCount: ov.querySelectorAll('.aurora-field').length,
      textareaCount: ov.querySelectorAll('.aurora-input--multiline').length,
      selectCount: ov.querySelectorAll('.aurora-select--block').length,
      truth: {
        bgContent: truth('--mc-bg-content'),
        bgElevated: truth('--mc-bg-elevated'),
        radiusLg: truth('--mc-radius-lg'),
        radiusSm: truth('--mc-radius-sm'),
        borderSubtle: truth('--mc-border-subtle'),
        borderMedium: truth('--mc-border-medium'),
        textPrimary: truth('--mc-text-primary'),
        accent: truth('--mc-accent'),
        fontSans: truth('--mc-font-sans'),
      },
      overlay: { z: cs(ov).zIndex, bg: cs(ov).backgroundColor },
      panel: S ? { bg: S.backgroundColor, radius: S.borderRadius, borderTop: S.borderTopWidth + ' ' + S.borderTopColor, overflow: 'hidden' } : null,
      input: I ? { bg: I.backgroundColor, height: I.height, padding: I.padding, radius: I.borderRadius, color: I.color, font: I.fontFamily } : null,
      textarea: T ? { height: T.height, minHeight: T.minHeight, padding: T.padding, resize: T.resize, lineHeight: T.lineHeight, bg: T.backgroundColor } : null,
      label: L ? { color: L.color, fontSize: L.fontSize, fontWeight: L.fontWeight } : null,
      switchEl: sw ? { w: cs(sw).width, h: cs(sw).height, bg: cs(sw).backgroundColor } : null,
      title: title ? { color: cs(title).color, fontSize: cs(title).fontSize } : null,
      closeBtn: closeBtn ? { w: cs(closeBtn).width, color: cs(closeBtn).color } : null,
      footer: footer ? { borderTopColor: cs(footer).borderTopColor, justify: cs(footer).justifyContent } : null,
      primaryBtn: btnPrimary ? { bg: cs(btnPrimary).backgroundColor, color: cs(btnPrimary).color } : null,
    })
  })()`

  const raw = await evalJs(PROBE, 20000)
  const d = JSON.parse(raw)
  if (!d.found) {
    const diag = await evalJs(`(() => JSON.stringify({
      overlayCount: document.querySelectorAll('.aurora-modal-overlay').length,
      modalCount: document.querySelectorAll('.aurora-modal').length,
      bodyChildClasses: [...document.body.children].map(c => c.tagName + '.' + (typeof c.className === 'string' ? c.className.split(/\\s+/).join('.') : '')),
      menuStillOpen: !!document.querySelector('.aurora-dropdown'),
      hasSourceWrap: !!document.querySelector('.aurora-editor__source'),
    }))()`)
    log('现场诊断：' + diag)
    log('console 错误：' + (consoleErrors.length ? consoleErrors.slice(0, 5).join(' || ') : '(无)'))
    throw new Error('面板未出现，无法取证')
  }

  const toRgb = (hex) => {
    const h = hex.replace('#', '')
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`
  }
  const t = d.truth
  const checks = []
  const ok = (name, pass, actual, expected) => checks.push({ name, pass, actual, expected })

  // 反证/前提
  ok('面板 portal 到 body（= #aurora-root 的兄弟，守卫前提成立）', d.isPortalToBody && !d.insideAuroraRoot, `body=${d.isPortalToBody} inRoot=${d.insideAuroraRoot}`, 'body=true / inRoot=false')
  ok('遮罩层级 = 模态带 3000（原实现是 200，给反了）', d.overlay.z === '3000', d.overlay.z, '3000')
  ok('遮罩底色 = rgba(0,0,0,0.5) 单源遮罩', d.overlay.bg === 'rgba(0, 0, 0, 0.5)', d.overlay.bg, 'rgba(0, 0, 0, 0.5)')

  // 面板材质
  ok('面板底 = --mc-bg-content 真值', d.panel.bg === toRgb(t.bgContent), d.panel.bg, toRgb(t.bgContent))
  ok('面板底 **不**是旧 slate 指纹 rgb(15,23,42)（= --editor-bg 旧值）', d.panel.bg !== 'rgb(15, 23, 42)', d.panel.bg, '≠ rgb(15, 23, 42)')
  ok('面板圆角 = --mc-radius-lg 真值（桌面端对话框档）', d.panel.radius === t.radiusLg, d.panel.radius, t.radiusLg)

  // 字段（单源 Input）
  ok('单行字段高 = 28px（.aurora-input 桌面密度）', d.input.height === '28px', d.input.height, '28px')
  ok('单行字段底 = --mc-bg-elevated 真值', d.input.bg === toRgb(t.bgElevated), d.input.bg, toRgb(t.bgElevated))
  ok('单行字段圆角 = --mc-radius-sm 真值', d.input.radius === t.radiusSm, d.input.radius, t.radiusSm)
  // ⚠️ 不能断言「不含 Inter」：--mc-font-sans 本身首项就是 'Inter'（误判过一次）。
  //    正确判据 = 计算值归一化后**等于 token 真值** ⇒ 证明字体来自 token 而非写死栈。
  const norm = (s) => s.replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase()
  ok('字段字体 = --mc-font-sans token 真值（而非写死的 Inter 栈）', norm(d.input.font) === norm(t.fontSans), d.input.font, t.fontSans)

  // 多行字段（新增变体）
  ok('多行字段解开单行高度锁（height ≠ 28px）', d.textarea.height !== '28px', d.textarea.height, '≠ 28px')
  ok('多行字段 min-height = 64px', d.textarea.minHeight === '64px', d.textarea.minHeight, '64px')
  ok('多行字段 padding = 8px 12px（含内边距，非单行 0 12px）', d.textarea.padding === '8px 12px', d.textarea.padding, '8px 12px')
  ok('多行字段 resize = vertical', d.textarea.resize === 'vertical', d.textarea.resize, 'vertical')

  // 标签/开关/头尾
  ok('字段标签色 = --mc-text-primary 真值（,.aurora-field__label）', d.label.color === toRgb(t.textPrimary), d.label.color, toRgb(t.textPrimary))
  ok('草稿开关复用 .aurora-switch（36×20）', d.switchEl && d.switchEl.w === '36px' && d.switchEl.h === '20px', d.switchEl && `${d.switchEl.w}×${d.switchEl.h}`, '36px×20px')
  ok('标题色 = --mc-text-primary 真值', d.title.color === toRgb(t.textPrimary), d.title.color, toRgb(t.textPrimary))
  ok('关闭按钮复用 .aurora-modal__close（24px 命中区）', d.closeBtn.w === '24px', d.closeBtn.w, '24px')
  ok('底栏分隔线 = --mc-border-subtle 真值', d.footer.borderTopColor === toRgb(t.borderSubtle), d.footer.borderTopColor, toRgb(t.borderSubtle))
  ok('主按钮底 = --mc-accent 真值', d.primaryBtn.bg === toRgb(t.accent), d.primaryBtn.bg, toRgb(t.accent))
  ok('字段数 ≥ 7（说明整表真的渲染出来了，而不是只探到空壳）', d.fieldCount >= 7, d.fieldCount, '≥7')
  ok('多行字段 2 个（描述 + 摘要，已展开高级设置）', d.textareaCount === 2, d.textareaCount, '2')
  ok('高级设置里的下拉复用 .aurora-select--block', d.selectCount === 1, d.selectCount, '1')

  const failed = checks.filter((c) => !c.pass)
  const report = { appUrl: APP_URL, visibility: vis, steps: { opened, btnClicked, menuUp, itemClicked, panelUp }, d, consoleErrors, checks }
  fs.writeFileSync(path.join(process.cwd(), '.workbuddy/artifacts/cdp-frontmatter-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(checks, null, 2))
  console.log('\n运行期 console error 数：' + consoleErrors.length)
  if (consoleErrors.length) console.log(consoleErrors.slice(0, 6).join('\n---\n'))
  console.log(
    failed.length === 0
      ? `\n✅ 全部 ${checks.length} 项真机断言通过`
      : `\n❌ ${failed.length}/${checks.length} 项失败：${failed.map((f) => f.name).join(' | ')}`,
  )
  ws.close()
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => { log('探针失败：' + e.message); process.exit(2) })
