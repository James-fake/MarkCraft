/* blue-500 清剿 codemod —— 仅 App UI 裸字面量（范围 A）
 * 读 audit-blue500.json 的精确命中，按规则替换；默认 dry-run，加 --apply 才落盘。
 * 安全护栏：
 *  - 跳过 bucket ∈ {token-def, fallback, comment, doc}
 *  - 跳过 EXCLUDE 前缀（blog 主题 / 导出 / 数据可视化调色板 / mermaid 第三方 CSS / 审计文档）
 *  - 行级再筛：含 var(--button-primary|link-color|cv-|kb-|accent 兜底 → 跳过；CSS 自定义属性定义行 → 跳过
 *  - 实心 #3b82f6 / rgb(59,130,246) → var(--mc-accent)；软 tint rgba(59,130,246,a) → var(--mc-accent-soft)
 */
const fs = require('fs')
const path = require('path')
const ROOT = 'D:/TracSolo_Project/MarkdownEditor qoder'
const ART = path.join(ROOT, '.workbuddy', 'artifacts', 'audit-blue500.json')
const manifest = JSON.parse(fs.readFileSync(ART, 'utf8'))

const EXCLUDE = [
  'features/blog/themes/',
  'features/blog/components/panels/CssPresetChips',
  'features/export/',
  'features/knowledgeBase/export/',
  'features/canvas-v2/types',
  'features/canvas-v2/engine/OverlayCards',
  'features/dashboard/useDashboardData',
  'features/diary/diaryMoods',
  'features/themes/CodeThemeManager.ts',
  'features/editor/extensions/highlightColors.ts',
  'styles/mermaid.css',
  'aurora/docs/',
]
const FALLBACK_SAFE = /var\(--(?:button-primary|link-color|cv-|kb-|accent)/i
const CSS_DEF = /^\s*--[\w-]+\s*:/
const IS_TEST = /\.test\.(ts|tsx)$|\.spec\.(ts|tsx)$/

function targetFor(text) {
  return /^rgba\(/i.test(text) ? 'var(--mc-accent-soft)' : 'var(--mc-accent)'
}

const plan = []
for (const h of manifest.hits) {
  if (h.bucket !== 'accent' && h.bucket !== 'link') continue
  if (IS_TEST.test(h.rel)) continue // 守卫/单测里的 blue-500 是"负例断言"字符串，不能动
  if (EXCLUDE.some((p) => h.rel.startsWith(p))) continue
  // 注：死兜底 var(--x, #3b82f6) 已由 audit 精确归入 fallback 桶并在此被 bucket 过滤排除；
  // 不再用粗粒度行级护栏（会误杀同行含合法 var(--link-color) 的裸 rgba）。
  if (CSS_DEF.test(h.raw)) continue
  plan.push({ rel: h.rel, line: h.line, col: h.col, from: h.text, to: targetFor(h.text) })
}

const byFile = {}
for (const p of plan) byFile[p.rel] = (byFile[p.rel] || 0) + 1

console.log('PLANNED changes:', plan.length)
console.log('files touched:', Object.keys(byFile).length)
console.log('byFile:', JSON.stringify(byFile, null, 2))
console.log('\n--- per-file plan (from → to) ---')
for (const rel of Object.keys(byFile)) {
  console.log(`\n### ${rel} (${byFile[rel]})`)
  for (const p of plan.filter((x) => x.rel === rel)) {
    console.log(`  L${p.line}@${p.col}  ${p.from}  →  ${p.to}`)
  }
}

if (!process.argv.includes('--apply')) {
  console.log('\n[DRY-RUN] 未落盘。加 --apply 执行。')
  process.exit(0)
}

// ---- apply ----
const grouped = {}
for (const p of plan) (grouped[p.rel] = grouped[p.rel] || []).push(p)
let applied = 0
for (const rel of Object.keys(grouped)) {
  const f = path.join(ROOT, 'src', rel)
  const content = fs.readFileSync(f, 'utf8')
  const eol = content.includes('\r\n') ? '\r\n' : '\n' // 保真 EOL（仓混 CRLF/LF）
  const lines = content.split(eol)
  // 同行多命中：按 col 倒序处理，避免前置替换改变后续列偏移
  grouped[rel].sort((a, b) => a.line - b.line || b.col - a.col)
  for (const p of grouped[rel]) {
    const i = p.line - 1
    const ln = lines[i]
    if (!ln || ln.substring(p.col, p.col + p.from.length) !== p.from) {
      console.error(`  ⚠️ SKIP ${rel}:${p.line} 期望 ${p.from} 但位置不匹配（可能已改/偏移）`)
      continue
    }
    lines[i] = ln.substring(0, p.col) + p.to + ln.substring(p.col + p.from.length)
    applied++
  }
  fs.writeFileSync(f, lines.join(eol))
}
console.log(`\n[APPLIED] ${applied}/${plan.length} 处已落盘`)
