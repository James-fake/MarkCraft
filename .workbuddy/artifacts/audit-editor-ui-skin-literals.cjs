/* 精度收窄：区分「裸字面量（必然生效）」与「var() 死兜底（只有变量未定义才生效）」 */
const fs = require('fs');
const path = require('path');

const SCOPE = ['src/features/editor', 'src/aurora/panels/editor', 'src/components/ui', 'src/styles'];
const files = [];
function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/__tests__|docs/.test(p)) walk(p); }
    else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  }
}
SCOPE.forEach(d => walk(d));

function strip(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); }
const LITERAL = () => /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

let totBare = 0, totFallback = 0;
const perFile = {};
for (const f of files) {
  let code = strip(fs.readFileSync(f, 'utf8'));
  let bare = [], fallback = [];
  // 先摘出所有 var(--x, 兜底) 的兜底段
  code = code.replace(/var\((--[a-z0-9-]+)\s*,([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_m, name, fb) => {
    (fb.match(LITERAL()) || []).forEach(h => fallback.push(`${name}→${h}`));
    return 'VARUSED';
  });
  bare = code.match(LITERAL()) || [];
  if (bare.length || fallback.length) {
    perFile[f.replace(/\\/g, '/')] = { bare: bare.length, fallback: fallback.length, bareSample: [...new Set(bare)].slice(0, 6) };
    totBare += bare.length; totFallback += fallback.length;
  }
}
console.log('=== 编辑界面作用域内的颜色字面量分层 ===');
console.log('裸字面量（必然生效 · 真视觉风险）:', totBare);
console.log('var() 兜底字面量（多为死兜底）  :', totFallback);
console.log('');
console.log('--- 仅列「有裸字面量」的文件（按数量降序，前 30） ---');
Object.entries(perFile).filter(([, v]) => v.bare > 0).sort((a, b) => b[1].bare - a[1].bare).slice(0, 30)
  .forEach(([f, v]) => console.log(`  ${String(v.bare).padStart(3)} 裸 / ${String(v.fallback).padStart(3)} 兜底  ${f}\n       样例: ${v.bareSample.join(' ')}`));
