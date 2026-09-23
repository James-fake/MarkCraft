/* 细节展开：仅针对「跑在 #aurora-root 之外」的 portal 文件 */
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.workbuddy/artifacts/audit-editor-ui-skin.json', 'utf8'));

const portals = data.rows.filter(r => r.portals > 0);
console.log('=== 含 portal 的文件共', portals.length, '个 ===\n');
for (const r of portals) {
  const risky = [...r.remappedVars, ...r.hardVars];
  console.log(`── ${r.file}`);
  console.log(`   portal:${r.portals}${r.portalToBody ? '  →document.body' : '  →(非 body)'}   basis-class:${r.basis}   mc-vars:${r.mcVars.length}`);
  console.log(`   作用域内会落空(回落 base.css 旧值): [${r.remappedVars.join(', ') || '无'}]`);
  console.log(`   全局亦非 mc(需单独定性): [${r.hardVars.join(', ') || '无'}]`);
  if (r.hex.length) console.log(`   硬编码 hex(${r.hex.length}): ${[...new Set(r.hex)].slice(0, 14).join(' ')}`);
  if (r.rgba.length) console.log(`   rgba(${r.rgba.length}): ${[...new Set(r.rgba)].slice(0, 6).join(' ')}`);
  if (r.tailwindLit.length) console.log(`   tailwind 字面量(${r.tailwindLit.length}): ${[...new Set(r.tailwindLit)].slice(0, 10).join(' ')}`);
  if (r.magicZ.length) console.log(`   魔法 z-index: ${[...new Set(r.magicZ)].join(' ')}`);
  console.log('');
}
