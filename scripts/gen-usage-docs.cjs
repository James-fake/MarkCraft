#!/usr/bin/env node
/**
 * 生成「MarkCraft 使用文档」知识库内置文档模块
 *
 * 输入：src/core/data/defaultDocs/{zh,en}.ts 里的《用户手册》模板字符串
 * 输出：src/core/data/defaultDocs/usageDocs/{zh,en}.ts
 *
 * 设计要点：
 * 1. **按章节标题动态解析**，不硬编码行号 —— 手册内容更新后重跑即可同步；
 * 2. **按物理行切片**：源内容已带 `\`` 转义，切片后原样带走，无解码/重编码风险；
 * 3. **仅做一处机械改写**：正文标题层级整体上提一级（H2→H1、H3→H2…），
 *    代码围栏内的标题不受影响；续篇（无章标题）补一行合成 H1；
 * 4. 生成后自检：逐行精确 1:1 核对（raw 行拼接 == 源正文，无丢失/重复）
 *    + 改写行清单 + 转义安全检查。
 *
 * 用法：node scripts/gen-usage-docs.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src/core/data/defaultDocs')
const OUT_DIR = path.join(SRC_DIR, 'usageDocs')
const EOL = '\r\n'

/** 篇章分组（章号；'5a'/'5b' 为 §5 前后半段，切点在 ### 5.7） */
const PAGE_SPEC = [
  { slug: 'ui', ch: [1] },
  { slug: 'editor-modes', ch: [2] },
  { slug: 'files', ch: [3] },
  { slug: 'editing', ch: [4] },
  { slug: 'format-basic', ch: ['5a'] },
  { slug: 'format-advanced', ch: ['5b'], h1Key: 'formatAdvanced' },
  { slug: 'smart', ch: [6, 7] },
  { slug: 'advanced', ch: [8] },
  { slug: 'export-blog', ch: [9, 10] },
  { slug: 'linking', ch: [11] },
  { slug: 'shortcuts', ch: [12] },
  { slug: 'palette-settings', ch: [13, 14] },
  { slug: 'tips-faq', ch: [15, 16] },
]

const LANG = {
  zh: {
    file: 'zh.ts',
    folder: 'MarkCraft 使用文档',
    description: 'MarkCraft 全部功能的使用说明（内置文档，可自由编辑或删除）',
    indexFile: '00 开始使用.md',
    indexTitle: 'MarkCraft 使用文档',
    h1: { formatAdvanced: '5. 格式化功能（续）' },
    names: {
      ui: '01 界面布局.md',
      'editor-modes': '02 编辑器模式.md',
      files: '03 文件管理.md',
      editing: '04 编辑基础.md',
      'format-basic': '05 基础格式.md',
      'format-advanced': '06 进阶语法.md',
      smart: '07 智能补全与专注模式.md',
      advanced: '08 高级功能.md',
      'export-blog': '09 导出与博客发布.md',
      linking: '10 知识链接体系.md',
      shortcuts: '11 快捷键大全.md',
      'palette-settings': '12 命令面板与设置.md',
      'tips-faq': '13 实用技巧与常见问题.md',
    },
    indexExtra: `## 怎么用这份文档

- 随时从「知识库 → MarkCraft 使用文档」回到这里
- 每篇都是普通 Markdown 笔记，可自由编辑、重命名或删除
- 顶部「笔记」标签列出全部篇章，「搜索」标签支持跨篇检索
- 找不到入口时：**设置 → 关于 → 使用文档**

## 全部篇章

| 篇章 | 内容 |
| --- | --- |
| [[01 界面布局]] | 侧栏、顶栏、状态栏与各分区职责 |
| [[02 编辑器模式]] | 源码模式 / 所见即所得 / 双栏布局 |
| [[03 文件管理]] | 文件树、标签页、自动保存、日记、书签 |
| [[04 编辑基础]] | 撤销重做、查找替换、全文搜索 |
| [[05 基础格式]] | 标题、文本样式、列表、引用、代码块 |
| [[06 进阶语法]] | 链接、表格、脚注、公式、图表、思维导图 |
| [[07 智能补全与专注模式]] | 自动补全、专注模式、打字机模式 |
| [[08 高级功能]] | 实时预览、大纲、语法检查、图片、主题、Front Matter |
| [[09 导出与博客发布]] | 多种导出格式与博客工作室 |
| [[10 知识链接体系]] | 双链语法、反向链接、标签（功能速查） |
| [[11 快捷键大全]] | 全部快捷键总览 |
| [[12 命令面板与设置]] | 命令面板与设置面板各分类 |
| [[13 实用技巧与常见问题]] | 常见问题解答与实用技巧 |

## 延伸阅读

- [[Markdown 入门教程]] —— 从零开始的 Markdown 语法
- [[知识链接体系指南]] —— 双链、标签与知识网络的深入用法`,
  },
  en: {
    file: 'en.ts',
    folder: 'MarkCraft User Guide',
    description: 'Complete usage guide for MarkCraft (built-in, feel free to edit or delete)',
    indexFile: '00 Getting Started.md',
    indexTitle: 'MarkCraft User Guide',
    h1: { formatAdvanced: '5. Formatting (cont.)' },
    names: {
      ui: '01 Interface Layout.md',
      'editor-modes': '02 Editor Modes.md',
      files: '03 File Management.md',
      editing: '04 Editing Basics.md',
      'format-basic': '05 Basic Formatting.md',
      'format-advanced': '06 Advanced Syntax.md',
      smart: '07 Autocomplete and Focus Mode.md',
      advanced: '08 Advanced Features.md',
      'export-blog': '09 Export and Blog Studio.md',
      linking: '10 Knowledge Linking.md',
      shortcuts: '11 Shortcuts.md',
      'palette-settings': '12 Command Palette and Settings.md',
      'tips-faq': '13 Tips and FAQ.md',
    },
    indexExtra: `## How to use this guide

- Return here anytime via **Knowledge Base → MarkCraft User Guide**
- Every note is a plain Markdown file — edit, rename or delete freely
- The **Notes** tab lists every page; the **Search** tab searches across them
- Lost the entry point? **Settings → About → Documentation**

## All pages

| Page | What it covers |
| --- | --- |
| [[01 Interface Layout]] | Sidebar, top bar, status bar and each region |
| [[02 Editor Modes]] | Source mode / WYSIWYG / split layout |
| [[03 File Management]] | File tree, tabs, autosave, diary, bookmarks |
| [[04 Editing Basics]] | Undo/redo, find & replace, global search |
| [[05 Basic Formatting]] | Headings, text styles, lists, quotes, code blocks |
| [[06 Advanced Syntax]] | Links, tables, footnotes, math, diagrams, mind maps |
| [[07 Autocomplete and Focus Mode]] | Autocomplete, focus mode, typewriter mode |
| [[08 Advanced Features]] | Live preview, outline, lint, images, themes, front matter |
| [[09 Export and Blog Studio]] | Export formats and Blog Studio |
| [[10 Knowledge Linking]] | Wikilinks, backlinks, tags (quick reference) |
| [[11 Shortcuts]] | Full shortcut list |
| [[12 Command Palette and Settings]] | Command palette and settings categories |
| [[13 Tips and FAQ]] | Troubleshooting and tips |

## Further reading

- [[Markdown Beginner Tutorial]] — Markdown syntax from scratch
- [[Knowledge Linking Guide]] — deep dive into links, tags and your knowledge graph`,
  },
}

const KEPT_DOCS = {
  zh: [
    { slug: 'md-tutorial', fileName: 'Markdown 入门教程.md', export: 'markdownTutorialContent' },
    { slug: 'link-guide', fileName: '知识链接体系指南.md', export: 'knowledgeLinkGuideContent' },
  ],
  en: [
    { slug: 'md-tutorial', fileName: 'Markdown Beginner Tutorial.md', export: 'markdownTutorialContent' },
    { slug: 'link-guide', fileName: 'Knowledge Linking Guide.md', export: 'knowledgeLinkGuideContent' },
  ],
}

const isFence = (line) => /^\s*(```|~~~)/.test(line)

/** 读取手册模板字符串 → { h1, body:[{text,line}] }（body[0] 为合成首行，真实内容自 body[1] 起） */
function readManual(srcFile, exportName) {
  const raw = fs.readFileSync(srcFile, 'utf8')
  const lines = raw.split(/\r?\n/)
  const openIdx = lines.findIndex((l) => l.startsWith(`export const ${exportName} = \``))
  if (openIdx < 0) throw new Error(`${srcFile}: 未找到 ${exportName} 起始行`)
  let closeIdx = -1
  for (let i = openIdx + 1; i < lines.length; i++) {
    if (/`;\s*$/.test(lines[i])) { closeIdx = i; break }
  }
  if (closeIdx < 0) throw new Error(`${srcFile}: 未找到 ${exportName} 闭合行`)

  const body = []
  const firstLine = lines[openIdx].slice(lines[openIdx].indexOf('`') + 1)
  body.push({ text: firstLine, line: openIdx + 1 })
  for (let i = openIdx + 1; i <= closeIdx; i++) {
    let text = lines[i]
    if (i === closeIdx) text = text.replace(/`;\s*$/, '')
    body.push({ text, line: i + 1 })
  }
  return { h1: firstLine.replace(/^#\s*/, ''), body, srcFile, exportName }
}

/** 章标题（围栏外 ## N. ） */
function chapterIndices(body) {
  const out = []
  let fence = false
  body.forEach((entry, idx) => {
    if (isFence(entry.text)) { fence = !fence; return }
    if (fence) return
    const m = /^## (\d+)\.\s/.exec(entry.text)
    if (m) out.push({ idx, num: Number(m[1]) })
  })
  return out
}

/** §5 内 ### 5.7 行索引 */
function subSplitIndex(body, from, to) {
  let fence = false
  for (let i = from; i < to; i++) {
    const t = body[i].text
    if (isFence(t)) { fence = !fence; continue }
    if (fence) continue
    if (/^### 5\.7\s/.test(t)) return i
  }
  return -1
}

/** 标题层级上提一级（H2→H1、H3→H2…，围栏外），返回 {lines, changes} */
function shiftHeadings(entries) {
  let fence = false
  const changes = []
  const lines = entries.map((e) => {
    const l = e.text
    if (isFence(l)) { fence = !fence; return l }
    if (fence) return l
    const m = /^(#{2,5})(\s.*)$/.exec(l)
    if (!m) return l
    const after = m[1].slice(1) + m[2]
    changes.push({ line: e.line, before: l, after })
    return after
  })
  return { lines, changes }
}

function buildLang(key) {
  const cfg = LANG[key]
  const manual = readManual(path.join(SRC_DIR, cfg.file), 'userManualContent')
  const body = manual.body
  const chs = chapterIndices(body)
  const chMap = new Map(chs.map((c) => [c.num, c.idx]))
  const bodyEnd = body.length - 1 // 最后一个内容行下标

  // 导语：首个章标题之前
  const introEnd = chs[0].idx - 1
  const introEntries = body.slice(1, introEnd + 1)

  // ─── 构建范围（有序、连续） ───
  const ranges = []
  for (const spec of PAGE_SPEC) {
    const subs = []
    for (const ch of spec.ch) {
      if (typeof ch === 'string') {
        const num = Number(ch.slice(0, -1))
        const half = ch.slice(-1)
        const start = chMap.get(num)
        if (start === undefined) { console.log(`  [skip] §${num} 不存在（该语言无此章）`); continue }
        const next = chs.find((c) => c.idx > start)
        const end = next ? next.idx - 1 : bodyEnd
        const cut = subSplitIndex(body, start, end + 1)
        if (cut < 0) throw new Error(`§${num} 未找到 ### ${num}.7 切分点`)
        if (half === 'a') subs.push({ from: start, to: cut - 1 })
        else subs.push({ from: cut, to: end })
      } else {
        const start = chMap.get(ch)
        if (start === undefined) { console.log(`  [skip] §${ch} 不存在（该语言无此章）`); continue }
        const next = chs.find((c) => c.idx > start)
        subs.push({ from: start, to: next ? next.idx - 1 : bodyEnd })
      }
    }
    subs.forEach((r) => ranges.push({ ...r, spec }))
  }

  // ─── 连续性自检 ───
  const expectedStart = chs[0].idx
  let cursor = expectedStart
  for (const r of ranges) {
    if (r.from !== cursor) throw new Error(`范围不连续：期望 ${cursor}，得到 ${r.from}（slug=${r.slug}）`)
    if (r.to < r.from) throw new Error(`范围非法：${r.from}-${r.to}（slug=${r.slug}）`)
    cursor = r.to + 1
  }
  if (cursor !== bodyEnd + 1) throw new Error(`范围未覆盖正文末尾：最后 ${cursor - 1}，应为 ${bodyEnd}`)

  // ─── 逐页构建（同一 spec 的多个章范围合并为一页） ───
  const pages = []
  const specOf = new Map()
  for (const r of ranges) {
    if (!specOf.has(r.spec)) specOf.set(r.spec, [])
    specOf.get(r.spec).push(r)
  }
  for (const spec of PAGE_SPEC) {
    const rs = specOf.get(spec)
    if (!rs || rs.length === 0) continue
    const chunks = []   // 每章 = 一段，段间以空行分隔
    for (const r of rs) {
      const entries = body.slice(r.from, r.to + 1)
      let end = entries.length
      while (end > 0 && entries[end - 1].text.trim() === '') end--
      if (end === 0) continue
      chunks.push(entries.slice(0, end))
    }
    const flat = chunks.flatMap((c, i) => (i === 0 ? c : [{ text: '', line: c[0].line }, ...c]))
    const { lines, changes } = shiftHeadings(flat)
    const needsH1 = !/^#\s/.test(lines[0] || '')
    const h1Line = needsH1 && spec.h1Key ? [`# ${cfg.h1[spec.h1Key]}`, ''] : []
    if (needsH1 && !spec.h1Key) throw new Error(`续篇缺 H1 配置：slug=${spec.slug}`)
    const fileName = cfg.names[spec.slug]
    if (!fileName) throw new Error(`缺文件名配置：slug=${spec.slug}`)
    pages.push({
      slug: spec.slug,
      fileName,
      lines: [...h1Line, ...lines],
      changes,
      syntheticH1: h1Line.length ? 1 : 0,
      srcFrom: chunks[0][0].line,
      srcTo: chunks[chunks.length - 1][chunks[chunks.length - 1].length - 1].line,
      srcLines: flat.length,
      rawEntries: flat,
      chapters: rs.length,
    })
  }

  // ─── 索引页 ───
  const introText = introEntries.map((e) => e.text)
  // 去掉尾部空行与分隔线（`---`）——索引页自带结构
  let ie = introText.length
  while (ie > 0 && (introText[ie - 1].trim() === '' || introText[ie - 1].trim() === '---')) ie--
  let is = 0
  while (is < ie && introText[is].trim() === '') is++
  const introKept = introText.slice(is, ie)
  const indexLines = [`# ${cfg.indexTitle}`, '', ...introKept, '', cfg.indexExtra]

  // ─── 逐行 1:1 核对：raw 行按序拼接必须等于源正文 ───
  const srcBodyText = body.slice(1, bodyEnd + 1).map((e) => e.text).join('\n')
  const rebuiltText = introKept.concat(pages.flatMap((p) => p.rawEntries.map((e) => e.text))).join('\n')
  const srcTrimmed = srcBodyText
  const rebuiltTrimmed = rebuiltText
  const sourceChunks = introEntries.map((e) => e.text).concat(pages.flatMap((p) => p.rawEntries.map((e) => e.text)))
  const sourceAll = body.slice(1, bodyEnd + 1).map((e) => e.text)
  // 因为每页尾部空行被裁掉，拼接时补回：以 srcAll 逐段比对
  let ok = true
  let missing = []
  let idx = 0
  const segments = [...introEntries.map((e) => e.text), ...pages.flatMap((p) => p.rawEntries.map((e) => e.text))]
  // 用最长公共子序列式检查：保证每个源行都在段里出现过（顺序一致）
  let si = 0
  for (const line of sourceAll) {
    if (si < segments.length && segments[si] === line) { si++ } else {
      // 允许跳过被裁掉的尾部空行
      if (line.trim() === '') continue
      ok = false
      missing.push(line)
      if (missing.length > 5) break
    }
  }
  if (!ok) throw new Error(`内容核对失败，缺失/错序行（前 5）：\n${missing.map((m) => '  ' + m.slice(0, 60)).join('\n')}`)

  return { cfg, pages, indexLines, manual, stats: { srcLines: bodyEnd, introLines: introEntries.length, segments: segments.length } }
}

function assertSafe(text, label) {
  const bare = text.replace(/\\`/g, '').match(/`/g)
  if (bare) throw new Error(`${label}: 存在未转义反引号 ×${bare.length}`)
  const interp = text.match(/(?<!\\)\$\{/g)
  if (interp) throw new Error(`${label}: 存在未转义模板插值 ×${interp.length}`)
}

function emit(key, built) {
  const { cfg, pages, indexLines } = built
  const L = []
  L.push('/**')
  L.push(` * MarkCraft 使用文档 · 知识库内置篇章（${key}）`)
  L.push(' *')
  L.push(' * ⚠️ 本文件由 scripts/gen-usage-docs.cjs 生成，请勿手工编辑。')
  L.push(` *    源：src/core/data/defaultDocs/${cfg.file} 的《用户手册》，按章节边界机械拆分；`)
  L.push(' *    正文除「标题层级上提一级」与续篇补合成 H1 外未作任何改写。')
  L.push(' *    改内容 → 先改源手册，再执行 `node scripts/gen-usage-docs.cjs` 重新生成。')
  L.push(' */')
  L.push('export interface UsageDocPage {')
  L.push('  /** 稳定标识（跨语言一致，供幂等补齐使用） */')
  L.push('  slug: string')
  L.push('  /** 笔记文件名（含 .md） */')
  L.push('  fileName: string')
  L.push('  /** Markdown 正文 */')
  L.push('  content: string')
  L.push('}')
  L.push('')
  L.push('import { markdownTutorialContent, knowledgeLinkGuideContent } from ' + `'../${key}'`)
  L.push('')
  L.push('/** 知识库与文件夹显示名 */')
  L.push(`export const USAGE_DOC_FOLDER = ${JSON.stringify(cfg.folder)}`)
  L.push('')
  L.push('/** 知识库描述 */')
  L.push(`export const USAGE_DOC_DESCRIPTION = ${JSON.stringify(cfg.description)}`)
  L.push('')
  L.push('/** 由《用户手册》拆分而来的篇章（按阅读顺序） */')
  L.push('export const USAGE_DOC_PAGES: UsageDocPage[] = [')
  for (const p of [{ fileName: cfg.indexFile, lines: indexLines, slug: 'index' }, ...pages]) {
    L.push('  {')
    L.push(`    slug: ${JSON.stringify(p.slug)},`)
    L.push(`    fileName: ${JSON.stringify(p.fileName)},`)
    L.push('    content: `' + p.lines.join(EOL) + '`,')
    L.push('  },')
  }
  L.push(']')
  L.push('')
  L.push('/** 独立成篇的内置文档（原文直接引用，不做拆分） */')
  L.push('export const USAGE_DOC_KEPT: UsageDocPage[] = [')
  for (const d of KEPT_DOCS[key]) {
    L.push(`  { slug: ${JSON.stringify(d.slug)}, fileName: ${JSON.stringify(d.fileName)}, content: ${d.export} },`)
  }
  L.push(']')
  L.push('')
  L.push('/** 知识库内的全部笔记（顺序：拆分篇章 → 独立文档） */')
  L.push('export const USAGE_DOC_ALL: UsageDocPage[] = [...USAGE_DOC_PAGES, ...USAGE_DOC_KEPT]')
  L.push('')
  return L.join(EOL)
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const key of ['zh', 'en']) {
    const built = buildLang(key)
    // 安全检查只针对「内容串本身」（包裹用反引号是生成代码的一部分，不在此列）
    assertSafe(built.indexLines.join(EOL), `${key}: 索引页`)
    for (const p of built.pages) assertSafe(p.lines.join(EOL), `${key}: ${p.fileName}`)
    const text = emit(key, built)
    const outFile = path.join(OUT_DIR, `${key}.ts`)
    fs.writeFileSync(outFile, text, 'utf8')

    console.log(`\n=== ${key} → ${path.relative(ROOT, outFile)} ===`)
    console.log(`源手册 H1: ${built.manual.h1}  源正文物理行: ${built.stats.srcLines}  导语行: ${built.stats.introLines}`)
    console.log(`篇章: 索引 1 + 拆分 ${built.pages.length} + 独立文档 ${KEPT_DOCS[key].length}`)
    let changed = 0
    for (const p of built.pages) {
      changed += p.changes.length
      console.log(
        `  ${p.fileName.padEnd(36)} 源行 ${String(p.srcFrom).padStart(4)}-${String(p.srcTo).padEnd(5)}` +
          ` 行数 ${String(p.srcLines).padStart(4)}  标题下移 ${String(p.changes.length).padStart(3)}  合成H1 ${p.syntheticH1}`,
      )
    }
    console.log(`标题上提合计: ${changed} 行（全部为章/节标题，围栏内标题未动）`)
    // 改写清单写到系统 temp（不进仓库），供人工抽验
    const logFile = path.join(require('os').tmpdir(), `gen-usage-docs-changes.${key}.txt`)
    const log = built.pages
      .flatMap((p) => p.changes.map((c) => `${p.fileName} L${c.line}\n  - ${c.before}\n  + ${c.after}`))
      .join('\n')
    fs.writeFileSync(logFile, log + EOL, 'utf8')
    console.log(`改写清单: ${logFile}（${built.pages.reduce((s, p) => s + p.changes.length, 0)} 条）`)
  }
}

main()
