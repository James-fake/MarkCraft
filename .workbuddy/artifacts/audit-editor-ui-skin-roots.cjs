/* 抽取每个 portal 文件 createPortal 内的「根元素皮肤」——判定它穿的是 old skin 还是 mc 基底 */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync('.workbuddy/artifacts/audit-editor-ui-skin.json', 'utf8'));

for (const r of data.rows.filter(x => x.portals > 0)) {
  const src = fs.readFileSync(r.file, 'utf8');
  let i = -1, n = 0;
  while ((i = src.indexOf('createPortal(', i + 1)) !== -1 && n < 2) {
    n++;
    const win = src.slice(i, i + 1400);
    // 找到第一个宿主元素开标签
    const m = win.match(/<(div|aside|section|ul|dialog|nav)\b[\s\S]{0,700}?(?:\/>|>)/);
    const tag = m ? m[0].replace(/\s+/g, ' ') : '(未匹配到元素)';
    const cls = (tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/) || [])[1] || (tag.match(/className=\{`([^`]*)`\}/) || [])[1] || '';
    const styleKeys = (tag.match(/([a-zA-Z]+)\s*:/g) || []).map(s => s.replace(/\s*:/, '')).join(',');
    const ln = src.slice(0, i).split('\n').length;
    console.log(`── ${r.file} :${ln}`);
    console.log(`   className: ${cls || '(无 className)'}`);
    console.log(`   styleKeys: ${styleKeys || '(无内联)'}`);
    if (/\b(bg-|text-gray|text-slate|border-gray|border-slate|rounded-(sm|md|lg|xl|full)|shadow-(sm|md|lg|xl))\b/.test(tag)) {
      console.log('   ⚠️  命中 Tailwind 皮肤工具类');
    }
    console.log('');
  }
}
