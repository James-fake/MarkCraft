/* 编辑器界面「新旧样式」穷尽审计扫描器（临时工具，用完即删）
 * 判据分层：
 *   L1 作用域逃逸：createPortal 到 document.body → 脱离 #aurora-root 重映射
 *   L2 旧变量：var(--editor-…) / --hover-bg / --code-block-bg 等在 L1 场景必然回落旧值
 *   L3 内联旧样式：硬编码 hex / rgba / tailwind 字面量 / 魔法 z-index
 *   L4 单源基底缺失：浮层根无 aurora-dropdown / aurora-modal 基底类
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  'src/features/editor',
  'src/aurora/panels/editor',
  'src/components/ui',
];
const EXTRA_CSS = [
  'src/styles/tiptap.css',
  'src/styles/markdown.css',
  'src/styles/mermaid.css',
  'src/styles/components.css',
  'src/styles/base.css',
  'src/aurora/styles/panels/editor.css',
];

// #aurora-root 已重映射的旧变量（tokens.css L497-519）→ 作用域内安全、作用域外回落
const REMAPPED = new Set([
  '--app-bg','--sidebar-bg','--tab-bg','--tab-active-bg','--toolbar-bg',
  '--editor-bg','--editor-text','--editor-border',
  '--preview-bg','--preview-text','--preview-border',
  '--line-number-bg','--line-number-color','--line-number-border',
  '--code-block-bg','--code-block-text','--code-bg',
  '--katex-background','--katex-color','--blockquote-bg','--titlebar-bg',
]);
// 非颜色型旧变量（排版/尺寸）→ 不做色相判定
const NON_COLOR = /^--(editor-(font|line|code-font)|app-.*(radius|size))|^--(radius|space|font)/;
// 旧蓝系遗留变量前缀
const LEGACY_PREFIX = /^--(editor|hover|code|code-block|button|app|sidebar|tab|toolbar|preview|line-number|katex|blockquote|titlebar)-/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/(^|\/)(node_modules|__tests__|docs)$/.test(p)) continue;
      walk(p, out);
    } else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function eolInfo(file) {
  const b = fs.readFileSync(file);
  const crlf = (b.toString('utf8').match(/\r\n/g) || []).length;
  const lf = (b.toString('utf8').match(/\n/g) || []).length;
  return { crlf, lfOnly: lf - crlf, bom: b[0] === 0xef };
}

const files = [];
for (const r of ROOTS) walk(r, files);
for (const f of EXTRA_CSS) if (fs.existsSync(f)) files.push(f);

const rows = [];
for (const file of [...new Set(files)]) {
  const src = fs.readFileSync(file, 'utf8');
  const code = stripComments(src);
  const isCss = file.endsWith('.css');
  const row = {
    file: file.replace(/\\/g, '/'),
    kind: isCss ? 'css' : 'tsx',
    portals: (code.match(/createPortal\s*\(/g) || []).length,
    portalToBody: (code.match(/createPortal\([\s\S]{0,400}?document\.body/g) || []).length,
    basis: (code.match(/aurora-dropdown|aurora-modal|aurora-popover|aurora-menu(?!-bar)/g) || []).length,
    remappedVars: new Set(),
    hardVars: new Set(),   // 未重映射的旧变量（作用域内也可能错）
    mcVars: new Set(),
    hex: (code.match(/#[0-9a-fA-F]{3,8}\b/g) || []),
    rgba: (code.match(/rgba?\([^)]*\)/g) || []),
    magicZ: (code.match(/zIndex\s*:\s*(\d{3,})|z-index\s*:\s*(\d{3,})/g) || []),
    tailwindLit: (code.match(/'0?\.\d+rem'|"[0-9.]+rem"|shadow-(sm|md|lg|xl)|rounded-(sm|md|lg|xl|full)|(bg|text|border)-(slate|gray|blue|zinc|neutral)-\d{3}/g) || []),
    // 内联手写外观（panel skin 自持的信号）
    inlineSkin: (code.match(/(backgroundColor|background|color|border|borderColor|boxShadow|borderRadius)\s*:\s*(['"`])(?!var\(|inherit|transparent|none)[^'"`]{2,}\2/g) || []),
  };
  for (const m of code.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
    const v = m[1];
    if (v.startsWith('--mc-')) { row.mcVars.add(v); continue; }
    if (LEGACY_PREFIX.test(v)) {
      (REMAPPED.has(v) && !NON_COLOR.test(v) ? row.remappedVars : row.hardVars).add(v);
    }
  }
  for (const k of ['remappedVars', 'hardVars', 'mcVars']) row[k] = [...row[k]].sort();
  const e = eolInfo(file);
  row.eol = e.crlf && e.lfOnly ? 'MIXED' : (e.crlf ? 'CRLF' : 'LF');
  row.bom = e.bom;
  rows.push(row);
}

rows.sort((a, b) => {
  const s = (r) => r.portals * 3 + r.hardVars.length * 2 + a.portals ? 0 : 0;
  const sc = (r) => (r.portals > 0 ? 10 : 0) + r.hardVars.length * 2 + r.hex.length + r.tailwindLit.length * 2 + (r.basis ? -6 : (r.portals ? 4 : 0));
  return sc(b) - sc(a);
});

const out = { generatedAt: new Date().toISOString(), remapped: [...REMAPPED], rows };
fs.writeFileSync('.workbuddy/artifacts/audit-editor-ui-skin.json', JSON.stringify(out, null, 1));

// 控制台速览
console.log('files scanned:', rows.length);
console.log('with portal   :', rows.filter(r => r.portals).length);
console.log('hard legacy vars total:', rows.reduce((n, r) => n + r.hardVars.length, 0));
console.log('');
for (const r of rows) {
  if (!r.portals && !r.hardVars.length && !r.hex.length && !r.tailwindLit.length && !r.inlineSkin.length) continue;
  console.log([
    r.portals ? `PORTAL x${r.portals}${r.portalToBody ? '/body' : ''}` : '        ',
    r.basis ? `basis:${r.basis}` : 'basis:0',
    `hard:${r.hardVars.length}${r.hardVars.length ? '(' + r.hardVars.join(',') + ')' : ''}`,
    `hex:${r.hex.length}`,
    `tw:${r.tailwindLit.length}`,
    `skin:${r.inlineSkin.length}`,
    `mc:${r.mcVars.length}`,
    r.file,
  ].join('  '));
}
