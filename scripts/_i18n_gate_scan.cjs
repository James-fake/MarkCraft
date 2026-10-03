// 二次筛选：找出「有中文 UI 串、但无语言门控信号」的文件
// 门控信号：useLanguage / isZh / language === / t.<x> / lang / labelEn / nameEn / _EN / { zh
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', 'src')
const SKIP_DIRS = ['__tests__', 'node_modules']
const EXT = new Set(['.ts', '.tsx'])

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) { if (SKIP_DIRS.includes(name)) continue; walk(p, out) }
    else if (EXT.has(path.extname(name)) && !/\.test\.|\.spec\./.test(name)) out.push(p)
  }
}

function stripComments(src) {
  // 状态机：去注释但**保留换行**（替换为 '\n'），保证 cleanLines 与源码行号对齐。
  let out = '', i = 0
  const n = src.length
  let state = 'code'
  while (i < n) {
    const c = src[i], c2 = src[i + 1]
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; i += 2; continue }
      if (c === '/' && c2 === '*') { state = 'block'; i += 2; continue }
      if (c === "'") { state = 'sq'; out += c; i++; continue }
      if (c === '"') { state = 'dq'; out += c; i++; continue }
      if (c === '`') { state = 'tpl'; out += c; i++; continue }
      out += c; i++; continue
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += '\n' } i++; continue }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i += 2 }
      else { if (c === '\n') out += '\n'; i++ }
      continue
    }
    if (state === 'sq') { out += c; if (c === '\\') { out += src[i + 1]; i += 2; continue } if (c === "'") state = 'code'; i++; continue }
    if (state === 'dq') { out += c; if (c === '\\') { out += src[i + 1]; i += 2; continue } if (c === '"') state = 'code'; i++; continue }
    if (state === 'tpl') { out += c; if (c === '\\') { out += src[i + 1]; i += 2; continue } if (c === '`') state = 'code'; i++; continue }
  }
  return out
}

const files = []
walk(ROOT, files)

const GATE = /useLanguage|isZh|language\s*===|language\s*==|\bt\.[a-zA-Z]|labelEn|nameEn|_EN\b|sceneEn|descriptionEn|\{\s*zh\s*:|zhDesc|lang\s*===|lang\s*==|:\s*'zh'|bl\b/
const results = []
for (const f of files) {
  const rel = path.relative(path.resolve(__dirname, '..'), f)
  if (rel.includes('locales')) continue
  if (rel.includes('defaultDocs')) continue
  const raw = fs.readFileSync(f, 'utf8')
  const clean = stripComments(raw)
  const cleanLines = clean.split('\n')
  const rawLines = raw.split('\n')
  const hits = []
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i]
    const inStr = /(['"`])[^'"`]*[\u4e00-\u9fa5]/.test(line)
    const inJsx = />[^<>{}]*[\u4e00-\u9fa5]/.test(line)
    if (inStr || inJsx) hits.push({ n: i + 1, line: rawLines[i].trim().slice(0, 130) })
  }
  if (!hits.length) continue
  const gated = GATE.test(clean)
  results.push({ file: rel, count: hits.length, gated, hits })
}

const ungated = results.filter(r => !r.gated)
const gated = results.filter(r => r.gated)
console.log(`有中文 UI 串文件: ${results.length}｜其中无门控信号: ${ungated.length}\n`)
console.log('=== 无门控信号（优先处理）===')
for (const r of ungated.sort((a, b) => b.count - a.count)) console.log(`  ${r.count}\t${r.file}`)
console.log('\n=== 有门控信号（可能已处理）===')
for (const r of gated.sort((a, b) => b.count - a.count).slice(0, 25)) console.log(`  ${r.count}\t${r.file}`)
