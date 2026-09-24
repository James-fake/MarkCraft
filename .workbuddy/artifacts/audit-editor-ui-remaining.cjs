/**
 * 编辑界面旧皮肤 · 剩余项实测（2026-09-24 第二批）
 * ------------------------------------------------------------
 * 用途：批次 4/1/2/3/5/6 执行完毕后，用可复算脚本回答「还剩什么」，
 *       替代凭上一轮计数下结论（计数会因批次推进而过期）。
 *
 * 输出三块：
 *   A. 内联 z-index 清单（按层级带表判定：带内 / 越带 / 未知值）
 *   B. 品牌色 blue-500 字面量（#3b82f6 / #60a5fa / rgba(59,130,246,·)），
 *      **分「裸字面量（必生效）」与「var() 死兜底（不生效）」两列**，
 *      并剔除合法文件（代码高亮主题 / 用户可选色板数据 / token 定义）
 *   C. 仍在用旧变量（--editor-* 等）的文件计数 —— **三锚点细分**，不再只看
 *      「是否在重映射表里」（那是初版假阳性来源）：
 *        ① 已重映射 → 作用域内安全（portal 外翻旧）；
 *        ② 不在表内但**别处有定义位**（base.css :root 旧 palette / editor.css 桥接 /
 *           JS·主题运行时写入）→ 属「旧色值」或「运行时变量」，**不是缺陷**；
 *        ③ 不在表内且**全仓无定义位** → 引用即失效，这才是真缺陷。
 *      ⚠️ 定义位判定必须排除 `getPropertyValue` / `removeProperty`（那是「读」不是「写」）。
 *
 * 用法：node .workbuddy/artifacts/audit-editor-ui-remaining.cjs [--json]
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')

/** 层级带表（tokens.css §14）——判定 z-index 是否越带 */
const BAND = new Map([
  [1000, '锚定浮层带（dropdown / hover card / lint panel）'],
  [1500, '编辑器 kb-menu 浮层（mask 1499 配套）'],
  [3000, 'Aurora 共享 Modal 遮罩'],
  [9000, 'Command 命令/搜索浮层'],
  [9980, 'Modal 阻断模态（filetree 确认 / 画布列表管理）'],
  [9990, 'Toast 轻提示'],
  [9998, '画布 dock 遮罩'],
  [9999, '画布 dock 上下文浮层'],
  [10001, '画布 ctxmenu / dock 更多菜单（保留画布局部原序）'],
  [10030, 'ContextMenu 瞬态右键菜单'],
  [10050, 'Onboarding 首启引导'],
  [10060, 'CrashRecovery 崩溃恢复'],
])
/** 容器内局部层级（不参与全局带竞争）——低于该阈值视为局部，不判定越带 */
const LOCAL_MAX = 100

/** 品牌色 blue-500/400 系列 */
const BLUE_RE = /#3b82f6|#60a5fa|rgba\(\s*59\s*,\s*130\s*,\s*246/g
/** 旧变量前缀（作用域内靠重映射碰巧正确） */
const LEGACY_VAR_RE = /var\(\s*(--(?:editor|preview|app|sidebar|tab|toolbar|line-number|code-block|code|katex|blockquote|titlebar|hover|table)-[\w-]*)/g

/** ★ 已被重映射到 --mc-* 的旧变量（声明位实测汇总，三处来源）：
 *    tokens.css:498-518（#aurora-root）· editor.css:2454-2484（.aurora-editor）· diary.css:93-96（.aurora-diary）
 *  ⇒ 在对应作用域内引用 = 安全（值就是 --mc-*）；portal 到作用域外 = 翻旧。
 *  不在此集合的旧变量 = **在哪都是 base.css 旧 slate 值** ⇒ 即使作用域内渲染也是旧皮肤（真缺陷）。 */
const REMAPPED = new Set([
  '--app-bg', '--sidebar-bg', '--tab-bg', '--tab-active-bg', '--toolbar-bg',
  '--editor-bg', '--editor-text', '--editor-border',
  '--preview-bg', '--preview-text', '--preview-border',
  '--line-number-bg', '--line-number-color', '--line-number-border',
  '--code-block-bg', '--code-block-text', '--code-bg',
  '--katex-background', '--katex-color',
  '--blockquote-bg', '--titlebar-bg',
  '--toolbar-text', '--toolbar-border', '--table-border', '--table-header-bg',
  '--editor-code-font-family',
])
/** 旧变量 → --mc-* 的权威映射（仅 REMAPPED 内成员可用作 codemod 的「零视觉变化」替换） */
const REMAP_TARGET = {
  '--app-bg': '--mc-bg-window',
  '--sidebar-bg': '--mc-bg-sidebar',
  '--tab-bg': '--mc-bg-sidebar',
  '--tab-active-bg': '--mc-bg-window',
  '--toolbar-bg': '--mc-bg-content',
  '--toolbar-text': '--mc-text-primary',
  '--toolbar-border': '--mc-border-subtle',
  '--editor-bg': '--mc-bg-content',
  '--editor-text': '--mc-text-primary',
  '--editor-border': '--mc-border-subtle',
  '--preview-bg': '--mc-bg-content',
  '--preview-text': '--mc-text-primary',
  '--preview-border': '--mc-border-subtle',
  '--line-number-bg': '--mc-bg-content',
  '--line-number-color': '--mc-text-tertiary',
  '--line-number-border': '--mc-border-subtle',
  '--code-block-bg': '--mc-bg-elevated',
  '--code-block-text': '--mc-text-primary',
  '--code-bg': '--mc-bg-elevated',
  '--katex-background': '--mc-bg-elevated',
  '--katex-color': '--mc-text-primary',
  '--blockquote-bg': '--mc-bg-elevated',
  '--titlebar-bg': '--mc-bg-window',
  '--table-border': '--mc-border-subtle',
  '--table-header-bg': '--mc-bg-elevated',
  '--editor-code-font-family': '--mc-font-mono',
}

/** 合法文件：这些文件里的蓝色字面量是「数据」或「token 定义」，不是皮肤缺陷 */
const LEGAL_BLUE_FILES = new Set([
  'src/styles/base.css',
  'src/styles/desktop-chrome.css',
  'src/aurora/styles/tokens.css',
  'src/features/editor/cm6/syntax.css',
  'src/features/editor/cm6/markdownHighlight.ts',
  'src/features/editor/extensions/highlightColors.ts',
])

const isEditorScope = (rel) =>
  rel.startsWith('src/features/editor/') ||
  rel.startsWith('src/aurora/panels/editor/') ||
  rel === 'src/aurora/styles/panels/editor.css'

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue
      walk(p, out)
    } else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

/** 把 var(--x, <兜底>) 整段摘出（兜底可能含括号），返回 { stripped, fallbacks[] } */
function stripVarFallbacks(text) {
  const fallbacks = []
  let out = ''
  let i = 0
  while (i < text.length) {
    const at = text.indexOf('var(', i)
    if (at < 0) { out += text.slice(i); break }
    out += text.slice(i, at)
    // 从 var( 开始做括号配对
    let depth = 0
    let j = at + 3
    let commaAt = -1
    for (; j < text.length; j++) {
      const c = text[j]
      if (c === '(') depth++
      else if (c === ')') { depth--; if (depth === 0) break }
      else if (c === ',' && depth === 1 && commaAt < 0) { commaAt = j }
    }
    const whole = text.slice(at, j + 1)
    if (commaAt > 0) fallbacks.push(text.slice(commaAt + 1, j).trim())
    out += 'VAR_PLACEHOLDER'
    i = j + 1
  }
  return { stripped: out, fallbacks }
}

/** 去掉块注释与整行 // 注释 —— 但**用等长空白替换、保留换行**，
 *  这样字节偏移与行号都不变（若直接删除注释，后文所有匹配的行号会错位）。 */
function stripComments(s) {
  const blank = (m) => m.replace(/[^\n]/g, ' ')
  return s.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank)
}

/** 收集全仓「已定义」的 CSS 变量名 → Map<名, 定义处文件集合>。
 *  ⚠️ 只认**声明/写入位**，绝不能把 `var(--x)` 里的引用也当成定义 ——
 *  否则本判据永远返回 0 命中（假绿）。三类真定义：
 *   ① CSS：`--x:` 声明位；② TS：setProperty('--x') / 引号键 '--x':
 *      或计算键 ['--x' as string]:（style 对象里写自定义属性）；
 *   ③ TS 引号名出现（主题表 THEME_VARS / ThemeManager 预设键等「已知变量」清单）。
 *  ⚠️ 必须排除**读**位：getPropertyValue('--x') / removeProperty('--x')
 *     —— 它们是消费不是定义，算进来会把真缺陷洗成假绿（本轮实测的教训）。 */
function collectDefinedTokens(root, files) {
  /** @type {Map<string, Set<string>>} */
  const defined = new Map()
  const add = (name, file) => {
    if (!defined.has(name)) defined.set(name, new Set())
    defined.get(name).add(file)
  }
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join('/')
    const text = fs.readFileSync(abs, 'utf-8')
    if (abs.endsWith('.css')) {
      for (const m of text.matchAll(/(^|[\s;{])(--[\w-]+)\s*:/gm)) add(m[2], rel)
    } else {
      for (const m of text.matchAll(/setProperty\(\s*['"`](--[\w-]+)['"`]/g)) add(m[1], rel)
      const writes = text.replace(/(get|remove)Property\(\s*['"`]--[\w-]+['"`]/g, '')
      for (const m of writes.matchAll(/['"`](--[\w-]+)['"`]/g)) add(m[1], rel)
    }
  }
  return defined
}
/** 取某变量的定义处（供报告展示，便于人工复核「它到底算不算真缺陷」） */
const defFilesOf = (name) => (DEFINED_TOKENS.get(name) ? [...DEFINED_TOKENS.get(name)] : [])


const files = walk(SRC)
const DEFINED_TOKENS = collectDefinedTokens(ROOT, files)
const zIndexHits = []
const blueBare = []
const blueFallback = []
const legacyVarFiles = new Map()
const legacyUnmapped = []
const undefinedTokenHits = []

for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/')
  const raw = fs.readFileSync(abs, 'utf-8')
  const text = stripComments(raw)
  const lineAt = (idx) => text.slice(0, idx).split('\n').length

  // A. z-index
  for (const m of text.matchAll(/zIndex:\s*(\d+)/g)) {
    const v = Number(m[1])
    if (v <= LOCAL_MAX) continue
    zIndexHits.push({ file: rel, line: lineAt(m.index), value: v, band: BAND.get(v) || null })
  }
  for (const m of text.matchAll(/z-index:\s*(\d+)/g)) {
    const v = Number(m[1])
    if (v <= LOCAL_MAX) continue
    zIndexHits.push({ file: rel, line: lineAt(m.index), value: v, band: BAND.get(v) || null })
  }

  // B. blue-500 字面量（裸 vs 兜底）
  if (!LEGAL_BLUE_FILES.has(rel)) {
    const { stripped, fallbacks } = stripVarFallbacks(text)
    const bare = [...stripped.matchAll(BLUE_RE)].map((x) => x[0])
    const fb = fallbacks.filter((f) => BLUE_RE.test(f))
    BLUE_RE.lastIndex = 0
    if (bare.length) {
      const first = stripped.search(BLUE_RE)
      blueBare.push({ file: rel, line: lineAt(first), count: bare.length, samples: [...new Set(bare)] })
    }
    if (fb.length) blueFallback.push({ file: rel, count: fb.length, samples: [...new Set(fb)] })
  }

  // D. 引用「未定义」的 --mc-* token ⇒ 静默落兜底（= 静默失效家族，与 portal 逃逸同源）
  if (rel.endsWith('.css') || rel.endsWith('.tsx') || rel.endsWith('.ts')) {
    for (const m of text.matchAll(/var\(\s*(--mc-[\w-]+)\s*([,)])/g)) {
      const name = m[1]
      if (DEFINED_TOKENS.has(name)) continue
      // 只在「有兜底」时算静默失效（无兜底 = 直接无效声明，严重性不同）
      const hasFallback = m[2] === ','
      undefinedTokenHits.push({ file: rel, line: lineAt(m.index), token: name, hasFallback })
    }
  }

  // C. 旧变量（区分「已重映射」与「未重映射」）
  const lv = [...text.matchAll(LEGACY_VAR_RE)].map((x) => x[1])
  if (lv.length) {
    const unmapped = lv.filter((v) => !REMAPPED.has(v))
    legacyVarFiles.set(rel, {
      count: lv.length,
      distinct: [...new Set(lv)].length,
      unmappedCount: unmapped.length,
      unmapped: [...new Set(unmapped)],
    })
    for (const m of text.matchAll(LEGACY_VAR_RE)) {
      if (REMAPPED.has(m[1])) continue
      // 第三锚点：不在 REMAPPED ≠ 真缺陷 —— 还要看它是否在别处有定义
      //  （base.css :root 旧 palette / editor.css 桥接 / JS·主题运行时写入）。
      //   有定义 ⇒ 是「旧色值」或「运行时变量」问题，不是「引用即失效」。
      const definedAt = defFilesOf(m[1])
      legacyUnmapped.push({
        file: rel, line: lineAt(m.index), token: m[1],
        definedAt: definedAt.length ? definedAt.slice(0, 3) : null,
      })
    }
  }
}

// ---- 输出 ----
const groupBy = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = m[x[k]] || []).push(x), m), {})

const zByFile = groupBy(zIndexHits, 'file')
const zOff = zIndexHits.filter((h) => !h.band)
const zIn = zIndexHits.filter((h) => h.band)
const zOffEditor = zOff.filter((h) => isEditorScope(h.file))

console.log('=== A. 内联 z-index（>100，共 ' + zIndexHits.length + ' 处 / ' + Object.keys(zByFile).length + ' 文件）===')
console.log('带内 ' + zIn.length + ' 处；未知值（疑似越带）' + zOff.length + ' 处，其中编辑界面 ' + zOffEditor.length + ' 处')
if (zOff.length) {
  console.log('--- 未知值明细 ---')
  for (const h of zOff.sort((a, b) => a.value - b.value)) {
    console.log('  ' + (isEditorScope(h.file) ? '[编辑]' : '[其他]') + ' ' + h.file + ':' + h.line + '  zIndex=' + h.value)
  }
}

console.log('')
console.log('=== B. 品牌色 blue-500 字面量 ===')
console.log('裸字面量（必生效）：' + blueBare.length + ' 文件 / ' + blueBare.reduce((s, x) => s + x.count, 0) + ' 处')
for (const x of blueBare.sort((a, b) => b.count - a.count)) {
  console.log('  ' + (isEditorScope(x.file) ? '[编辑]' : '[其他]') + ' ' + x.file + ':' + x.line + '  x' + x.count + '  ' + x.samples.join(' '))
}
console.log('var() 死兜底（不生效）：' + blueFallback.length + ' 文件 / ' + blueFallback.reduce((s, x) => s + x.count, 0) + ' 处')
for (const x of blueFallback) console.log('  ' + (isEditorScope(x.file) ? '[编辑]' : '[其他]') + ' ' + x.file + '  x' + x.count)

console.log('')
const lvSorted = [...legacyVarFiles.entries()].sort((a, b) => b[1].count - a[1].count)
const lvMapped = lvSorted.reduce((s, x) => s + (x[1].count - x[1].unmappedCount), 0)
console.log('=== C. 旧变量引用（' + lvSorted.length + ' 文件 / ' + lvSorted.reduce((s, x) => s + x[1].count, 0) + ' 处）===')
const lvEditor = lvSorted.filter(([f]) => isEditorScope(f))
const unmappedUndefined = legacyUnmapped.filter((h) => !h.definedAt)
const unmappedDefinedElsewhere = legacyUnmapped.filter((h) => h.definedAt)
console.log('  已重映射（作用域内安全，仅 portal 外翻旧）：' + lvMapped + ' 处')
console.log('  待细分（不在重映射表，共 ' + legacyUnmapped.length + ' 处）：')
console.log('    ① 真·未定义（引用即失效 —— 唯一属缺陷的一类）：' + unmappedUndefined.length + ' 处')
console.log('    ② 别处有定义（假阳性：旧 palette 色值 / 桥接 / JS·主题运行时写入）：' + unmappedDefinedElsewhere.length + ' 处')
for (const [f, v] of lvEditor.slice(0, 10)) console.log('  [编辑] ' + f + '  ' + v.count + ' 处 / ' + v.distinct + ' 个变量')
for (const [f, v] of lvSorted.filter(([f]) => !isEditorScope(f)).slice(0, 6)) console.log('  [其他] ' + f + '  ' + v.count + ' 处')

console.log('')
const umByToken = {}
for (const h of legacyUnmapped) umByToken[h.token] = (umByToken[h.token] || 0) + 1
console.log('=== C2. 不在重映射表的旧变量 · 三锚点细分 ===')
const printTokens = (rows, tag) => {
  const byTok = {}
  for (const h of rows) byTok[h.token] = (byTok[h.token] || 0) + 1
  for (const [tok, n] of Object.entries(byTok).sort((a, b) => b[1] - a[1])) {
    const sample = rows.find((h) => h.token === tok)
    const files = [...new Set(rows.filter((h) => h.token === tok).map((h) => h.file))]
    const where = sample.definedAt ? '  定义于 ' + sample.definedAt.join(' , ') : '  无任何定义位'
    console.log('  [' + tag + '] ' + tok + '  x' + n + '  ' + files.length + ' 文件  ' + where)
    if (files.length > 1) console.log('        消费于 ' + files.slice(0, 4).join(' , '))
  }
}
if (unmappedUndefined.length) printTokens(unmappedUndefined, '真缺陷')
else console.log('  （无真缺陷：所有不在重映射表的旧变量都在别处有定义位）')
if (unmappedDefinedElsewhere.length) printTokens(unmappedDefinedElsewhere, '假阳性')

console.log('')
const undefWithFallback = undefinedTokenHits.filter((h) => h.hasFallback)
const undefNoFallback = undefinedTokenHits.filter((h) => !h.hasFallback)
console.log('=== D. 引用「未定义」token 的静默失效（已定义 token 数 ' + DEFINED_TOKENS.size + '）===')
const undefByToken = {}
for (const h of undefinedTokenHits) undefByToken[h.token] = (undefByToken[h.token] || 0) + 1
for (const [tok, n] of Object.entries(undefByToken).sort((a, b) => b[1] - a[1])) {
  const sample = undefinedTokenHits.find((h) => h.token === tok)
  console.log('  ' + tok + '  x' + n + '  ' + (sample.hasFallback ? '有兜底（静默落兜底色）' : '无兜底（声明直接无效）') + '  首见 ' + sample.file + ':' + sample.line)
}
console.log('  小结：有兜底 ' + undefWithFallback.length + ' 处 / 无兜底 ' + undefNoFallback.length + ' 处')

if (process.argv.includes('--json')) {
  fs.writeFileSync(
    path.join(ROOT, '.workbuddy/artifacts/audit-editor-ui-remaining.json'),
    JSON.stringify({ zIndexHits, zOff, blueBare, blueFallback, legacyVar: Object.fromEntries(legacyVarFiles), undefinedTokenHits }, null, 2),
  )
  console.log('\n已写出 .workbuddy/artifacts/audit-editor-ui-remaining.json')
}
