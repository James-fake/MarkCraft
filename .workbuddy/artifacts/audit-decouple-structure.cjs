/**
 * audit-decouple-structure.cjs —— 解耦审查 · 文件级穷尽审计（可复算）
 * 用法：node scripts/../../../.workbuddy/artifacts/audit-decouple-structure.cjs
 * 依赖 vite.config.ts 的别名表（与 scripts/_depgraph.cjs 同法派生，缺登记 fail-fast）。
 * 输出：
 *   §1 分层违规（V1~V8 规则见 LAYER_RULES）
 *   §2 巨型文件 TOP30（>400 行）
 *   §3 features/blog 内部结构
 *   §4 aurora/panels 壳层业务渗漏 TOP（每个 panel 文件 import 的 features 数）
 *   §5 文件级零引入（死代码候选，需人工确认）
 *   §6 跨 feature 依赖明细（文件级）
 * 结果 JSON 落盘 .workbuddy/artifacts/audit-decouple-structure.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

const ALIAS = (() => {
  const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
  const block = cfg.match(/const alias\s*=\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error('[audit] 无法从 vite.config.ts 解析 alias 块');
  const map = {};
  const re = /'(@[\w-]+)'\s*:\s*(?:(?:resolve|join)\(\s*SRC\s*,\s*'([^']+)'\s*\)|SRC)/g;
  let m;
  while ((m = re.exec(block[1])) !== null) map[m[1]] = m[2] || '';
  if (Object.keys(map).length < 5) throw new Error('[audit] 别名表异常');
  return map;
})();

function walk(dir, acc) {
  let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules') continue; walk(p, acc); }
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const rel = (abs) => path.relative(SRC, abs).replace(/\\/g, '/');

// ── 模块判定：features/aurora 取二级，其余取一级 ──
function modOf(abs) {
  const r = rel(abs); const t = r.split('/');
  if (t[0] === 'features') return 'features/' + (t[1] || '_');
  if (t[0] === 'components') return 'components/' + (t[1] || '_');
  if (t[0] === 'aurora') return 'aurora/' + (t[1] || '_');
  return t[0];
}

// ── 分层（低→高）：数字越小越底层 ──
const LAYER = {
  types: 0, locales: 0, utils: 0,
  core: 1, services: 2, stores: 3, hooks: 4,
  'components/ui': 5,
  features: 6,
  aurora: 7,
};
const layerOf = (m) => (m.startsWith('features/') ? 6 : m.startsWith('aurora/') ? 7 : LAYER[m] ?? 9);

// ── 分层违规规则：V1~V8（见报告） ──
const LAYER_RULES = [
  { id: 'V1 core 纯净', from: (m) => m === 'core', forbid: ['services', 'stores', 'hooks', 'components/ui', 'features', 'aurora', 'app'] },
  { id: 'V2 services 不触上', from: (m) => m === 'services', forbid: ['stores', 'hooks', 'components/ui', 'features', 'aurora', 'app'] },
  { id: 'V3 stores 不触 UI', from: (m) => m === 'stores', forbid: ['hooks', 'components/ui', 'features', 'aurora', 'app'] },
  { id: 'V4 components/ui 纯展示', from: (m) => m === 'components/ui', forbid: ['core', 'services', 'stores', 'hooks', 'features', 'aurora', 'app'] },
  { id: 'V5 features 不触壳', from: (m) => m.startsWith('features/'), forbid: ['aurora', 'app'] },
  { id: 'V6 aurora/components 通用不依赖业务', from: (m) => m === 'aurora/components', forbid: ['features', 'app'] },
  { id: 'V7 hooks 不触 UI 层', from: (m) => m === 'hooks', forbid: ['components/ui', 'features', 'aurora', 'app'] },
  { id: 'V8 禁引旧壳 app', from: () => true, forbid: ['app'] },
];
const forbidden = (rule, target) => rule.forbid.some((f) => target === f || target.startsWith(f + '/'));

function resolveSpec(fromFile, spec) {
  if (!spec) return null;
  let abs = null;
  if (spec.startsWith('@')) {
    const segs = spec.split('/'); const base = ALIAS[segs[0]];
    if (base === undefined) return null;
    abs = path.join(SRC, base, segs.slice(1).join('/'));
  } else if (spec.startsWith('.')) {
    abs = path.resolve(path.dirname(fromFile), spec);
  } else return null;
  // 扩展名探测：相对/别名导入常省略扩展名；不探测会把 fan-in 记到幽灵键（§5 全体失真的根因）
  for (const cand of [abs, abs + '.ts', abs + '.tsx', path.join(abs, 'index.ts'), path.join(abs, 'index.tsx')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

const files = walk(SRC, []).filter((f) => !/\.test\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f));
const fromRe = /(?:import|export)[\s\S]{0,400}?\bfrom\s*['"]([^'"]+)['"]/g;
const bareRe = /\bimport\s*['"]([^'"]+)['"]/g;
const dynRe = /\bimport\s*\(\s*['"]([^'"]+)\s*['"]/g;

const violations = [];   // {rule, from, to, spec}
const fileImports = {};  // fromRel -> [toRel]
const fanIn = {};        // toRel -> count
const panelBiz = [];     // aurora/panels 文件的 features 渗漏
const blogDirs = {};
const crossFeature = []; // {from, to}

for (const f of files) {
  const fromMod = modOf(f);
  const content = fs.readFileSync(f, 'utf8');
  const specs = [];
  let m;
  fromRe.lastIndex = 0; while ((m = fromRe.exec(content))) specs.push(m[1]);
  bareRe.lastIndex = 0; while ((m = bareRe.exec(content))) specs.push(m[1]);
  dynRe.lastIndex = 0; while ((m = dynRe.exec(content))) specs.push(m[1]);

  const fRel = rel(f);
  const featuresDeps = new Set();
  const seen = new Set();
  for (const sp of specs) {
    const abs = resolveSpec(f, sp);
    if (!abs) continue;
    const toMod = modOf(abs);
    const tRel = rel(abs);
    if (!fileImports[fRel]) fileImports[fRel] = [];
    if (!seen.has(tRel)) { fileImports[fRel].push(tRel); seen.add(tRel); }
    fanIn[tRel] = (fanIn[tRel] || 0) + 1;
    if (fromMod.startsWith('features/') && toMod.startsWith('features/') && fromMod !== toMod)
      crossFeature.push({ from: fRel, to: toMod });
    if (fromMod === 'features/blog' && tRel.startsWith('features/blog/')) {
      const d = tRel.split('/').slice(0, 3).join('/');
      blogDirs[d] = (blogDirs[d] || 0) + 1;
    }
    for (const rule of LAYER_RULES) {
      if (rule.from(fromMod) && forbidden(rule, toMod)) {
        violations.push({ rule: rule.id, from: fRel, to: toMod, spec: sp });
      }
    }
    if (fromMod === 'aurora/panels' && toMod.startsWith('features/')) featuresDeps.add(toMod);
  }
  if (featuresDeps.size > 0) panelBiz.push({ file: fRel, features: [...featuresDeps].sort(), n: featuresDeps.size });
}

// ── §2 巨型文件 ──
const giant = files
  .map((f) => ({ file: rel(f), loc: fs.readFileSync(f, 'utf8').split(/\r?\n/).length, mod: modOf(f) }))
  .filter((x) => x.loc >= 400)
  .sort((a, b) => b.loc - a.loc);

// ── §3 blog 内部结构 ──
const blogTree = {};
for (const f of files) {
  const r = rel(f);
  if (!r.startsWith('features/blog/')) continue;
  const parts = r.split('/');
  const key = parts.length <= 3 ? '(根)' : parts.slice(2, parts.length - 1).join('/');
  blogTree[key] = blogTree[key] || { n: 0, loc: 0 };
  blogTree[key].n++;
  blogTree[key].loc += fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
}

// ── §5 零引入候选（排除入口/类型声明/桶文件本身被 CSS 引等情况） ──
const entryHints = /(^|\/)(aurora-main|main|index)\.(ts|tsx)$/;
const zeroFanIn = files
  .map((f) => rel(f))
  .filter((r) => (fanIn[r] || 0) === 0 && !entryHints.test(r) && !r.endsWith('.d.ts'));

// ── 输出 ──
const line = (n = 78) => console.log('-'.repeat(n));
console.log('SRC_FILES', files.length);
line();
console.log('== §1 分层违规 ==');
const byRule = {};
violations.forEach((v) => { (byRule[v.rule] = byRule[v.rule] || []).push(v); });
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n[${rule}] ${list.length} 处`);
  list.forEach((v) => console.log(`   ${v.from}\n     -> ${v.spec} (${v.to})`));
}
if (!violations.length) console.log('  (none)');
line();
console.log('== §2 巨型文件 TOP30 (>=400 行) ==  共', giant.length, '个');
giant.slice(0, 30).forEach((g) => console.log('  ' + String(g.loc).padStart(6), g.file));
line();
console.log('== §3 features/blog 内部结构（按子目录） ==');
Object.entries(blogTree).sort((a, b) => b[1].loc - a[1].loc).forEach(([k, v]) =>
  console.log('  ' + String(v.loc).padStart(6), String(v.n).padStart(3), k));
line();
console.log('== §4 aurora/panels 壳层业务渗漏 TOP15（按引用 features 数） ==');
panelBiz.sort((a, b) => b.n - a.n).slice(0, 15).forEach((p) =>
  console.log('  ' + String(p.n).padStart(2), p.file, '\n      -> ' + p.features.join(', ')));
line();
console.log('== §5 文件级零引入（死代码候选，需人工确认）==  共', zeroFanIn.length, '个');
zeroFanIn.forEach((r) => console.log('   ' + r));
line();
console.log('== §6 跨 feature 依赖明细 ==');
crossFeature.sort((a, b) => a.from.localeCompare(b.from)).forEach((c) => console.log('  ' + c.from + '  ->  ' + c.to));
if (!crossFeature.length) console.log('  (none)');

fs.writeFileSync(
  path.join(__dirname, 'audit-decouple-structure.json'),
  JSON.stringify({ violations, giant, blogTree, panelBiz, zeroFanIn, crossFeature }, null, 2),
);
console.log('\nJSON -> .workbuddy/artifacts/audit-decouple-structure.json');
