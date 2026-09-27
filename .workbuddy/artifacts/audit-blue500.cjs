/* 审计：blue-500 (#3b82f6 / rgb(59,130,246)) 横向裸字面量清单 + 语义分类
 * 目的：为「清剿 blue-500 蓝轴缺陷」提供可复算清单，避免盲目全局替换导致色相错乱。
 * 关键事实：Aurora --mc-accent = #7C8CFF (蓝紫)，blue-500 在新体系仅作分类色
 *   (--mc-cat-markdown / --mc-cat-group-5 = #3b82f6)。故裸字面量须按语义分流：
 *   - 交互/accent/默认 UI 蓝 → var(--mc-accent)
 *   - markdown 分类色        → var(--mc-cat-markdown)
 *   - group-5 分类色         → var(--mc-cat-group-5)
 *   - info/链接语义蓝        → var(--mc-info) / var(--mc-accent-text)
 */
const fs = require('fs')
const path = require('path')

const ROOT = 'D:/TracSolo_Project/MarkdownEditor qoder/src'
const HEX = /#3b82f6(?![0-9a-fA-F])/gi
const RGB = /rgba?\(\s*59\s*,\s*130\s*,\s*246(?:\s*,\s*[\d.]+)?\s*\)/gi

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue
      walk(p, out)
    } else {
      out.push(p)
    }
  }
}

const files = []
walk(ROOT, files)

const hits = []
for (const f of files) {
  if (!/\.(ts|tsx|js|jsx|css|scss|less|json)$/i.test(f)) continue // 排除 .md 文档
  const rel = path.relative(ROOT, f).split(path.sep).join('/')
  const src = fs.readFileSync(f, 'utf8')
  const lines = src.split(/\r?\n/)
  lines.forEach((line, i) => {
    const isCssPropDef = /^\s*--[\w-]+\s*:\s*#3b82f6\b/i.test(line) ||
      /^\s*--[\w-]+\s*:\s*rgba?\(\s*59\s*,\s*130\s*,\s*246/i.test(line)
    let m
    HEX.lastIndex = 0
    while ((m = HEX.exec(line))) {
      hits.push(classify(rel, i + 1, m.index, m[0], line, isCssPropDef))
    }
    RGB.lastIndex = 0
    while ((m = RGB.exec(line))) {
      hits.push(classify(rel, i + 1, m.index, m[0], line, isCssPropDef))
    }
  })
}

function classify(rel, line, col, text, raw, isCssPropDef) {
  const lower = raw.toLowerCase()
  const inComment = /\/\//.test(raw.slice(0, col)) || /\/\*/.test(raw.slice(0, col))
  let bucket = 'accent' // 默认：交互/accent 蓝 → --mc-accent
  let reason = 'default interactive/accent blue'
  if (/\.md$/.test(rel)) { bucket = 'doc'; reason = 'audit doc (excluded)' }
  else if (isCssPropDef) { bucket = 'token-def'; reason = 'legit --mc-* categorical definition' }
  else if (/var\(\s*--[\w-]+\s*,\s*#3b82f6/i.test(raw) || /var\(\s*--[\w-]+\s*,\s*rgba?\(\s*59/i.test(raw)) {
    bucket = 'fallback'; reason = 'dead fallback inside var(--x, #3b82f6)'
  }
  else if (/markdown|cat-markdown|--mc-cat/.test(lower)) { bucket = 'cat-markdown'; reason = 'markdown categorical color' }
  else if (/group-5|cat-group-5/.test(lower)) { bucket = 'cat-group-5'; reason = 'group-5 categorical color' }
  else if (/info|--mc-info|infotext/.test(lower)) { bucket = 'info'; reason = 'info/semantic blue' }
  else if (/link|href/.test(lower)) { bucket = 'link'; reason = 'link semantics' }
  else if (inComment) { bucket = 'comment'; reason = 'inside comment' }
  return { rel, line, col, text, bucket, reason, raw: raw.trim() }
}

// 汇总
const byBucket = {}
for (const h of hits) byBucket[h.bucket] = (byBucket[h.bucket] || 0) + 1
const byFile = {}
for (const h of hits) byFile[h.rel] = (byFile[h.rel] || 0) + 1

const manifest = {
  total: hits.length,
  byBucket,
  byFileCount: Object.keys(byFile).length,
  byFile,
  hits,
}
fs.writeFileSync(path.join(ROOT, '..', '.workbuddy', 'artifacts', 'audit-blue500.json'), JSON.stringify(manifest, null, 2))

// 控制台速览
console.log('TOTAL matches:', hits.length)
console.log('byBucket:', JSON.stringify(byBucket, null, 2))
console.log('files touched:', Object.keys(byFile).length)
console.log('\n--- accent (default → --mc-accent) sample ---')
console.log(hits.filter(h => h.bucket === 'accent').slice(0, 25).map(h => `${h.rel}:${h.line}  ${h.raw.slice(0, 80)}`).join('\n'))
console.log('\n--- cat-markdown / cat-group-5 / info / link ---')
console.log(hits.filter(h => ['cat-markdown','cat-group-5','info','link'].includes(h.bucket)).map(h => `[${h.bucket}] ${h.rel}:${h.line}  ${h.raw.slice(0,80)}`).join('\n'))
console.log('\n--- token-def / fallback / comment / doc (likely skip) ---')
console.log(hits.filter(h => ['token-def','fallback','comment','doc'].includes(h.bucket)).map(h => `[${h.bucket}] ${h.rel}:${h.line}  ${h.raw.slice(0,80)}`).join('\n'))
