// P2-1 验收扫描：src/aurora/panels 内部「面板 → 另一个面板」的横向 import。
// 判据：import 说明符为相对路径（./ 或 ../），解析后仍落在 panels/ 下、且落在**别的**面板目录。
// 排除：出了 panels（如 ../../components，属壳内通用层，合法）、同面板目录内（正常子组件拆分）。
//
// 🚨 曾踩坑（勿复现）：PANELS 常量用正斜杠、path.join 在 Windows 产出反斜杠 ⇒
//    startsWith 恒 false ⇒ 扫描器**静默全绿**（阳性对照注入违规也报 none，假绿）。
//    正解：所有路径先 normalize 成正斜杠再比较。
const fs = require('fs')
const path = require('path')

const PANELS = 'src/aurora/panels'
const norm = (p) => path.normalize(p).replace(/\\/g, '/')

const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p)
  }
})(PANELS)

// 合法项（不计违规，但透明单列）：
//  - 'aurora-nav'：壳内导航注册表（不是面板），审计报告 §6.2 已判定为合法引用；
//  - *.test.tsx  ：测试装配需要同时挂载多个面板以验证跨面板行为，不构成生产耦合。
const ALLOWED_TARGETS = new Set(['aurora-nav'])
const isTest = (p) => /\.(test|spec)\.tsx?$/.test(p)

const hits = []
const allowed = []
for (const f of files) {
  const filePosix = norm(f)
  const selfDir = path.posix.dirname(filePosix)
  const src = fs.readFileSync(f, 'utf8')
  const re = /(?:from\s+|import\(\s*)['"](\.[^'"]+)['"]/g
  let m
  while ((m = re.exec(src))) {
    const spec = m[1]
    if (!/^\.\.?\//.test(spec)) continue
    const resolved = norm(path.join(selfDir, spec))
    if (!resolved.startsWith(PANELS + '/')) continue
    const targetPanel = resolved.slice(PANELS.length + 1).split('/')[0]
    const selfPanel = selfDir.slice(PANELS.length + 1).split('/')[0]
    if (targetPanel === selfPanel) continue
    const line = src.slice(0, m.index).split(/\r?\n/).length
    const rec = { from: filePosix.replace(/^src\//, ''), to: spec, targetPanel, line }
    if (ALLOWED_TARGETS.has(targetPanel) || isTest(filePosix)) allowed.push(rec)
    else hits.push(rec)
  }
}

console.log('== panel→panel 横向 import（违规）==  扫描文件数:', files.length)
if (!hits.length) console.log('  (none)')
for (const h of hits) console.log(`  ${h.from}:${h.line}  →  ${h.to}   [跨面板: ${h.targetPanel}]`)
console.log('违规合计:', hits.length)
console.log('合法项（aurora-nav 导航注册表 / 测试装配）:', allowed.length)
process.exit(hits.length ? 1 : 0)
