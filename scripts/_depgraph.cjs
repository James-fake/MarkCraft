const fs = require('fs');
const path = require('path');
// 可移植：以脚本位置推算仓库根（原先硬编码了本机绝对路径）
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// 别名表**从 vite.config.ts 派生**，不再硬编码。
//
// 为什么必须派生：本工具是「模块级环是否消失」的唯一验证手段，而 resolveSpec 对
// 未登记的别名返回 null → 该 import 被**静默丢边** → 环检测漏报（假阴性）。
// 这是最危险的失败方向：图看起来「更干净了」，而真相是它没看见。
//
// Phase 1 真实踩过：@core 未登记 → core 的边数为 0；而 30 条未解析项里 3 条真问题
// （@core/storage/db|migrate|blobStore）被 @tiptap/* / @codemirror/* 等 npm 包淹没。
//
// 解析异常一律 fail-fast —— 宁可报错，也不要拿一张残缺的图下结论。
const ALIAS = (() => {
  const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
  const block = cfg.match(/const alias\s*=\s*\{([\s\S]*?)\n\}/);
  if (!block) {
    throw new Error('[depgraph] 未能从 vite.config.ts 解析出 alias 块 —— 写法可能已变，请同步本工具');
  }
  const map = {};
  const re = /'(@[\w-]+)'\s*:\s*(?:(?:resolve|join)\(\s*SRC\s*,\s*'([^']+)'\s*\)|SRC)/g;
  let m;
  while ((m = re.exec(block[1])) !== null) map[m[1]] = m[2] || '';
  if (Object.keys(map).length < 5) {
    throw new Error('[depgraph] 从 vite.config.ts 解析出的别名表异常（少于 5 项），拒绝以此结论输出');
  }
  return map;
})();

function walk(dir, acc) {
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules') continue; walk(p, acc); }
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

// 模块键：features 取二级；components 取二级；aurora 取二级（panels/app/components/hooks/styles/themes 细分）；其余取一级
function moduleOf(abs) {
  const rel = path.relative(SRC, abs).replace(/\\/g, '/');
  const parts = rel.split('/');
  const t = parts[0];
  if (t === 'features') return 'features/' + (parts[1] || '_');
  if (t === 'components') return 'components/' + (parts[1] || '_');
  if (t === 'aurora') {
    const s = parts[1];
    if (['panels', 'app', 'components', 'hooks', 'styles', 'themes'].includes(s)) return 'aurora/' + s;
    return 'aurora/' + (s || '_');
  }
  return t;
}

function resolveSpec(fromFile, spec) {
  if (!spec) return null;
  if (spec.startsWith('@')) {
    const segs = spec.split('/');
    const base = ALIAS[segs[0]];
    if (base === undefined) return null;
    return path.join(SRC, base, segs.slice(1).join('/'));
  }
  if (spec.startsWith('.')) return path.resolve(path.dirname(fromFile), spec);
  return null; // 外部依赖
}

const allFiles = walk(SRC, []);
const files = allFiles.filter((f) => !/\.test\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f));
const fileModule = {};
for (const f of files) fileModule[f] = moduleOf(f);

const fromRe = /(?:import|export)[\s\S]{0,400}?\bfrom\s*['"]([^'"]+)['"]/g;
const bareRe = /\bimport\s*['"]([^'"]+)['"]/g;
const dynRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const edges = {};      // 'A -> B' : 文件对数
const edgeSamples = {}; // 'A -> B' : [示例文件]
const unresolved = new Set();

for (const f of files) {
  const mod = fileModule[f];
  const content = fs.readFileSync(f, 'utf8');
  const specs = [];
  let m;
  fromRe.lastIndex = 0; while ((m = fromRe.exec(content))) specs.push(m[1]);
  bareRe.lastIndex = 0; while ((m = bareRe.exec(content))) specs.push(m[1]);
  dynRe.lastIndex = 0; while ((m = dynRe.exec(content))) specs.push(m[1]);
  const seen = new Set();
  for (const sp of specs) {
    const abs = resolveSpec(f, sp);
    if (!abs) { if (sp.startsWith('@')) unresolved.add(sp); continue; }
    const tgt = moduleOf(abs);
    if (tgt === mod) continue;
    const key = mod + ' -> ' + tgt;
    if (seen.has(key)) continue;
    seen.add(key);
    edges[key] = (edges[key] || 0) + 1;
    if (!edgeSamples[key]) edgeSamples[key] = [];
    if (edgeSamples[key].length < 3) edgeSamples[key].push(path.relative(SRC, f).replace(/\\/g, '/'));
  }
}

const outMap = {}, inMap = {};
for (const k of Object.keys(edges)) {
  const [a, b] = k.split(' -> ');
  outMap[a] = (outMap[a] || 0) + edges[k];
  inMap[b] = (inMap[b] || 0) + edges[k];
}

const line = () => console.log('-'.repeat(70));
console.log('SRC_FILES_SCANNED', files.length, '(excluded .test/.d.ts)');

line();
console.log('== EDGES (from -> to : 引用该模块的文件数) ==');
Object.entries(edges).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));

line();
console.log('== OUT-DEGREE (该模块依赖多少外部模块引用点) ==');
Object.entries(outMap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));

line();
console.log('== IN-DEGREE (被依赖程度 = 基础性) ==');
Object.entries(inMap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));

line();
console.log('== BIDIRECTIONAL PAIRS (A<->B 双向依赖) ==');
const seenPair = new Set();
Object.keys(edges).forEach((k) => {
  const [a, b] = k.split(' -> ');
  const rev = b + ' -> ' + a;
  if (edges[rev]) {
    const key = [a, b].sort().join(' <-> ');
    if (seenPair.has(key)) return;
    seenPair.add(key);
    const [x, y] = key.split(' <-> ');
    console.log('  ' + key + '   (' + x + '->' + y + '=' + edges[x + ' -> ' + y] + ', ' + y + '->' + x + '=' + edges[y + ' -> ' + x] + ')');
  }
});
if (!seenPair.size) console.log('  (none)');

line();
console.log('== MODULE-LEVEL CYCLES ==');
const adj = {};
for (const k of Object.keys(edges)) { const [a, b] = k.split(' -> '); (adj[a] = adj[a] || new Set()).add(b); }
const color = {}, stack = [], cycles = new Set();
function dfs(n) {
  color[n] = 1; stack.push(n);
  for (const nb of (adj[n] || [])) {
    if (color[nb] === 1) {
      const idx = stack.indexOf(nb);
      cycles.add(stack.slice(idx).concat(nb).join(' > '));
    } else if (!color[nb]) dfs(nb);
  }
  stack.pop(); color[n] = 2;
}
Object.keys(adj).forEach((n) => { if (!color[n]) dfs(n); });
if (!cycles.size) console.log('  (none)');
else [...cycles].sort().forEach((c) => console.log('  ' + c));

line();
console.log('== FEATURE <-> FEATURE EDGES (横向耦合) ==');
const ff = Object.entries(edges).filter(([k]) => k.startsWith('features/') && k.includes(' -> features/'));
if (!ff.length) console.log('  (none)');
else ff.sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  const ex = (edgeSamples[k] || []).slice(0, 2).join(' , ');
  console.log('  ' + k + ' : ' + v + '    e.g. ' + ex);
});

line();
console.log('== FEATURES -> (non-features) ==');
Object.entries(edges).filter(([k]) => k.startsWith('features/') && !k.includes('-> features/')).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));

line();
console.log('== AURORA -> (others) ==');
Object.entries(edges).filter(([k]) => k.startsWith('aurora/')).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));

line();
console.log('== UNRESOLVED @-specs (别名未映射) ==');
console.log(unresolved.size ? [...unresolved].join(', ') : '  (none)');

// 自检：把「本项目自己的别名漏登记」从 npm 包噪声里摘出来单独报警。
// 判据：首段在 node_modules 中不存在 ⇒ 不是第三方包 ⇒ 只能是本项目别名（或拼写错误）。
// 这样即使将来新增别名忘了登记，也不会被 30 条 npm 包淹没（Phase 1 的教训）。
const ownAliasGaps = [...unresolved].filter(
  (s) => !fs.existsSync(path.join(ROOT, 'node_modules', s.split('/')[0]))
);
console.log('');
if (ownAliasGaps.length) {
  console.log('!! 本项目别名未登记（会导致静默丢边 → 环漏报，请立即补 vite.config.ts）!!');
  ownAliasGaps.forEach((s) => console.log('   - ' + s));
} else {
  console.log('本项目别名登记完整：未解析项全部为 node_modules 第三方包 ✅');
}
