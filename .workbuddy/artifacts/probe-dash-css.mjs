/**
 * 死 CSS 判定脚本（PLAN-02 调查用）
 * 用途：从 canvas.css 提取 aurora-dash-* 类名，逐个在 src 下的 ts/tsx 中统计引用数。
 * 判定法（沿用 PLAN-01 的方法论）：类名在 TSX/TS 中零引用 = 死 CSS，不应纳入既有功能的改动范围。
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const css = readFileSync(resolve(ROOT, 'src/aurora/styles/panels/canvas.css'), 'utf-8')

// 收集所有非 CSS 源文件
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(p, out)
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}
const sources = walk(resolve(ROOT, 'src'))
const corpus = sources.map((f) => readFileSync(f, 'utf-8')).join('\n')

// 提取 CSS 中所有 .aurora-dash-* 类名（去重）
const classNames = [...new Set((css.match(/\.aurora-dash-[a-zA-Z0-9_-]+/g) ?? []).map((s) => s.slice(1)))]
classNames.sort()

console.log(`CSS 中 aurora-dash-* 类名共 ${classNames.length} 个，逐个核对 src/**/*.{ts,tsx} 引用：\n`)
const dead = []
const alive = []
for (const cn of classNames) {
  // 用词边界避免 dash-card 命中 dash-card--3 之类的子串误判
  const re = new RegExp(`\\b${cn.replace(/[-]/g, '\\-')}\\b`, 'g')
  const n = (corpus.match(re) ?? []).length
  ;(n === 0 ? dead : alive).push([cn, n])
}
console.log('【零引用 = 死 CSS】')
for (const [cn, n] of dead) console.log(`  ${cn}`)
console.log(`\n 小计 ${dead.length} 个`)
console.log('\n【有引用 = 活代码】')
for (const [cn, n] of alive) console.log(`  ${cn}  ×${n}`)
console.log(`\n 小计 ${alive.length} 个`)

// 顺便报告引用所在文件，便于人工确认
console.log('\n【活类名的引用文件】')
for (const [cn] of alive) {
  const hits = sources.filter((f) => new RegExp(`\\b${cn.replace(/[-]/g, '\\-')}\\b`).test(readFileSync(f, 'utf-8')))
  console.log(`  ${cn}: ${hits.map((h) => h.replace(ROOT, '').replace(/\\/g, '/')).join(', ')}`)
}
