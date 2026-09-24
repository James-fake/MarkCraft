/**
 * CDP 真机取证探针 · 浮层单源基底（2026-09-24）
 * ------------------------------------------------------------
 * 目的：静态断言只证「源码已归位」；本探针证「真机渲染确实拿到 aurora 材质」，
 *       并**同时证伪**旧皮肤逃逸机制仍然成立（否则说明扫描面本身无意义）。
 *
 * 关键设计：探针元素一律挂在 `document.body`（= #aurora-root 的**兄弟**），
 *   这正是 createPortal 浮层的真实处境；而不是挂在 #aurora-root 内自欺欺人。
 *
 * 阴性对照（证明「逃逸」不是臆想）：
 *   · 在 body 上放 `var(--editor-bg, rgb(255,0,255))` → **实测结果修正了原假设**：
 *     它不是「未定义 → 落 CSS 兜底（品红）」，而是**直接命中 base.css 在 :root 定义的
 *     旧 slate 值 rgb(15,23,42)=#0f172a**；
 *   · 同一变量放进 #aurora-root → rgb(16,18,24)=#101218（= --mc-bg-content 真值）。
 *   ⇒ 判据：**同一变量在 portal 作用域内外取值不同**，且域外取的是旧 slate 指纹。
 *     这同时解释了报障现象「浮层看起来是最旧一版 UI」：旧变量始终有值，只是值是旧的。
 *   若两端取值相同，本探针无诊断力，结论一律作废。
 *
 * 用法：node .workbuddy/artifacts/cdp-overlay-verify.cjs [appUrl] [cdpUrl]
 */
const APP_URL = process.argv[2] || 'http://localhost:5174/'
const CDP_URL = process.argv[3] || 'http://127.0.0.1:9222'

function withTimeout(promise, ms, label) {
  let t
  return Promise.race([
    promise,
    new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error(`TIMEOUT ${label} (${ms}ms)`)), ms)
    }),
  ]).finally(() => clearTimeout(t))
}

async function main() {
  // 新建空白 target（禁整页 reload：renderer 扛不住）
  const target = await withTimeout(
    fetch(`${CDP_URL}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()),
    8000,
    'json/new',
  )
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await withTimeout(
    new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = () => rej(new Error('WS 连接失败'))
    }),
    8000,
    'ws-open',
  )

  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    }
  }
  const send = (method, params = {}, ms = 15000) =>
    withTimeout(
      new Promise((res, rej) => {
        const myId = ++id
        pending.set(myId, { res, rej })
        ws.send(JSON.stringify({ id: myId, method, params }))
      }),
      ms,
      method,
    )

  await send('Page.enable')
  await send('Runtime.enable')

  await send('Page.navigate', { url: APP_URL })

  const evalJs = async (expression, ms = 15000) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, ms)
    if (r.exceptionDetails) throw new Error(`页面内异常：${JSON.stringify(r.exceptionDetails)}`)
    return r.result.value
  }

  // 等 #aurora-root 挂载
  const bootAt = Date.now()
  let mounted = false
  for (let i = 0; i < 60; i++) {
    mounted = await evalJs("!!document.querySelector('#aurora-root')")
    if (mounted) break
    await new Promise((r) => setTimeout(r, 500))
  }
  if (!mounted) throw new Error(`等不到 #aurora-root（${APP_URL} 是否为本项目 dev server？）`)
  const mountMs = Date.now() - bootAt

  // 等 token 真值就绪（读 CSSOM，不抄字面值）
  let tokensReady = false
  for (let i = 0; i < 40; i++) {
    tokensReady = await evalJs(
      "!!getComputedStyle(document.documentElement).getPropertyValue('--mc-bg-elevated').trim()",
    )
    if (tokensReady) break
    await new Promise((r) => setTimeout(r, 250))
  }
  if (!tokensReady) throw new Error('等不到 --mc-* token 真值（样式表未加载？）')

  const PROBE = `(() => {
    const rootEl = document.documentElement
    const truth = (n) => getComputedStyle(rootEl).getPropertyValue(n).trim()
    const MK = 'rgba(255, 0, 255)'
    const body = document.body           // ★ #aurora-root 的兄弟 = portal 浮层的真实处境
    const aurora = document.querySelector('#aurora-root')

    const mk = (tag, cls) => { const el = document.createElement(tag); el.className = cls; body.appendChild(el); return el }
    const pick = (el) => {
      const s = getComputedStyle(el)
      const r = {
        bg: s.backgroundColor, color: s.color, radius: s.borderRadius, z: s.zIndex,
        borderTop: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor,
        shadow: s.boxShadow === 'none' ? 'none' : 'present',
      }
      el.remove(); return r
    }
    const probeVarOn = (hostEl) => {
      const el = document.createElement('div')
      el.style.background = 'var(--editor-bg, ' + MK + ')'
      hostEl.appendChild(el)
      const v = getComputedStyle(el).backgroundColor
      el.remove(); return v
    }

    return JSON.stringify({
      appUrl: location.href,
      visibility: document.visibilityState,
      hasAuroraRoot: !!aurora,
      truth: {
        bgElevated: truth('--mc-bg-elevated'),
        bgContent: truth('--mc-bg-content'),
        radiusMd: truth('--mc-radius-md'),
        borderMedium: truth('--mc-border-medium'),
        textInverse: truth('--mc-text-inverse'),
      },
      probes: {
        dropdown: pick(mk('div', 'aurora-dropdown')),
        modalDim: pick(mk('div', 'aurora-modal-overlay aurora-modal-overlay--dim')),
        commandOverlay: pick(mk('div', 'aurora-command-overlay')),
        lightboxBtn: pick(mk('button', 'aurora-lightbox__btn')),
        lightboxBar: pick(mk('div', 'aurora-lightbox__bar')),
      },
      // 阴性对照：body 上必须品红（证明 --editor-* 在 portal 作用域外确实不存在）
      negativeControl: { onBody: probeVarOn(body), inAurora: probeVarOn(aurora) },
      magentaExpect: MK,
    })
  })()`

  const raw = await evalJs(PROBE, 20000)
  const data = JSON.parse(raw)
  data.mountMs = mountMs

  const MAGENTA = data.magentaExpect
  const t = data.truth
  const p = data.probes
  const toRgb = (hex) => {
    const h = hex.replace('#', '')
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`
  }

  const checks = []
  const ok = (name, pass, actual, expected) => checks.push({ name, pass, actual, expected })

  // ── 阴性对照（无诊断力则整体结论作废）──────────────────────────────
  // 实测修正：portal 到 body 后 --editor-bg **不是未定义**，而是直接命中 base.css 在
  // :root 定义的**旧 slate 值 #0f172a**；只有在 #aurora-root 内才被重映射为 aurora 的
  // #101218。⇒ 判据应是「同变量在作用域内外取值不同」，而非「落回 CSS 兜底/浏览器默认」。
  const LEGACY_SLATE_EDITOR_BG = 'rgb(15, 23, 42)' // base.css :root 旧值（缺陷指纹）
  ok(
    '对照·body 上 --editor-bg = 旧 slate 值（缺陷指纹，非 aurora 值）',
    data.negativeControl.onBody === LEGACY_SLATE_EDITOR_BG,
    data.negativeControl.onBody,
    LEGACY_SLATE_EDITOR_BG,
  )
  ok(
    '对照·同一变量在 #aurora-root 内已被重映射为 aurora 值 ⇒ 逃逸机制真实存在',
    data.negativeControl.inAurora !== data.negativeControl.onBody,
    data.negativeControl.inAurora,
    `≠ ${data.negativeControl.onBody}`,
  )
  ok(
    '对照·#aurora-root 内 --editor-bg = --mc-bg-content 真值（重映射目标正确）',
    data.negativeControl.inAurora === toRgb(t.bgContent),
    data.negativeControl.inAurora,
    toRgb(t.bgContent),
  )
  void MAGENTA

  // 单源基底真机取值
  ok('.aurora-dropdown 背景 = --mc-bg-elevated 真值', p.dropdown.bg === toRgb(t.bgElevated), p.dropdown.bg, toRgb(t.bgElevated))
  ok('.aurora-dropdown 圆角 = --mc-radius-md 真值', p.dropdown.radius === t.radiusMd, p.dropdown.radius, t.radiusMd)
  ok('.aurora-dropdown 层级 = 锚定浮层带 1000', p.dropdown.z === '1000', p.dropdown.z, '1000')
  ok('.aurora-dropdown 边框含 --mc-border-medium 真值', p.dropdown.borderTop.includes(toRgb(t.borderMedium)), p.dropdown.borderTop, `含 ${toRgb(t.borderMedium)}`)
  ok('.aurora-dropdown 阴影已生效', p.dropdown.shadow === 'present', p.dropdown.shadow, 'present')

  ok('.aurora-modal-overlay--dim 遮罩 = rgba(0,0,0,0.85)', p.modalDim.bg === 'rgba(0, 0, 0, 0.85)', p.modalDim.bg, 'rgba(0, 0, 0, 0.85)')
  ok('.aurora-modal-overlay 层级 = 模态带 3000', p.modalDim.z === '3000', p.modalDim.z, '3000')
  ok('.aurora-command-overlay 层级 = 命令带 9000', p.commandOverlay.z === '9000', p.commandOverlay.z, '9000')
  ok('.aurora-lightbox__btn 前景 = --mc-text-inverse 真值', p.lightboxBtn.color === toRgb(t.textInverse), p.lightboxBtn.color, toRgb(t.textInverse))
  ok('.aurora-lightbox__btn 底色非透明（半透明反色底生效）', p.lightboxBtn.bg !== 'rgba(0, 0, 0, 0)', p.lightboxBtn.bg, '非透明')

  const failed = checks.filter((c) => !c.pass)
  const report = { appUrl: data.appUrl, visibility: data.visibility, mountMs, truth: t, checks }
  console.log(JSON.stringify(report, null, 2))
  console.log(
    failed.length === 0
      ? `\n✅ 全部 ${checks.length} 项真机断言通过`
      : `\n❌ ${failed.length}/${checks.length} 项失败：${failed.map((f) => f.name).join(' | ')}`,
  )
  ws.close()
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('探针失败：', e.message)
  process.exit(2)
})
