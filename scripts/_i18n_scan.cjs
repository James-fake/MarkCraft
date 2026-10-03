// 扫描源码中「疑似未语言化」的中文 UI 串：
// - 排除注释（行注释 // 与块注释 /* */）
// - 只统计出现在字符串字面量 / JSX 文本中的中文
// 输出：文件 → 命中行（前 N 行）
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', 'src')
const SKIP_DIRS = ['__tests__', 'node_modules']
const EXT = new Set(['.ts', '.tsx'])

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (SKIP_DIRS.includes(name)) continue
      walk(p, out)
    } else if (EXT.has(path.extname(name)) && !/\.test\.|\.spec\./.test(name)) {
      out.push(p)
    }
  }
}

function stripComments(src) {
  // 状态机：去掉 // 与 /* */ 注释，保留字符串。
  // ⚠️ 关键：注释内的换行必须原样保留（替换为 '\n'），否则 cleanLines 与 rawLines
  //    行号错位，报出的命中行会张冠李戴（本脚本初版即栽在这里）。
  let out = ''
  let i = 0
  const n = src.length
  let state = 'code' // code | line | block | sq | dq | tpl
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

const HAN = /[\u4e00-\u9fa5]/
const results = []
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8')
  const clean = stripComments(raw)
  const cleanLines = clean.split('\n')
  const rawLines = raw.split('\n')
  const hits = []
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i]
    // 字符串字面量内中文
    const inStr = /(['"`])[^'"`]*[\u4e00-\u9fa5]/.test(line)
    // JSX 文本：>中文
    const inJsx = />[^<>{}]*[\u4e00-\u9fa5]/.test(line)
    // 裸标识符/属性值中文（如 aria-label="中文" 已被 inStr 覆盖）
    if (inStr || inJsx) hits.push({ n: i + 1, line: rawLines[i].trim().slice(0, 120) })
  }
  if (hits.length) results.push({ file: path.relative(path.resolve(__dirname, '..'), f), count: hits.length, hits })
}

results.sort((a, b) => b.count - a.count)
const LIMIT = parseInt(process.argv[2] || '40', 10)
const SHOW = parseInt(process.argv[3] || '0', 10)
console.log(`文件数: ${results.length}，命中总行: ${results.reduce((s, r) => s + r.count, 0)}\n`)
for (const r of results.slice(0, LIMIT)) {
  console.log(`### ${r.file}  (${r.count})`)
  if (SHOW > 0) for (const h of r.hits.slice(0, SHOW)) console.log(`  ${h.n}: ${h.line}`)
}
