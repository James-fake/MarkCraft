import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '@features/editor/mdToHtml'
import { htmlToMarkdown } from '@features/editor/htmlToMd'
import { preprocessCustomSyntax } from '@core/markdown/customSyntax'
import { lintMarkdown } from '@features/lint/markdownLinter'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 性能基准 + 稳定性/边界测试（2026-11-03 全面测试轮）。
 *
 * 性能断言给的是宽松上限（比正常耗时高一个数量级），目的不是精确基准，
 * 而是守住「数量级不劣化」——任何一次性引入 O(n²) 管线的回归都会在这里变红。
 * 精确耗时输出到 stdout，供人工对照。
 */

const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

/** 合成一份真实的混合文档：段落 + 列表 + 代码块 + 表格 + 公式 + 任务列表 + 双链 */
function buildDoc(sections: number): string {
  const parts: string[] = []
  for (let i = 0; i < sections; i++) {
    parts.push(
      `## 第 ${i} 节`,
      '',
      `这是第 ${i} 节的正文段落，包含 ==高亮==、++下划线++ 与 \`行内代码\`，还有 [[另一节]] 的双链。`,
      '',
      '- [x] 已完成任务 ' + i,
      '- [ ] 未完成任务 ' + i,
      '- 普通列表项 ' + i,
      '',
      '```javascript',
      `const value${i} = ${i}; // 注释`,
      '```',
      '',
      '| 列 A | 列 B |',
      '| --- | --- |',
      `| ${i}a | ${i}b |`,
      '',
      '行内公式 $E_' + i + ' = mc^2$ 与一块公式：',
      '',
      '$$',
      `\\int_0^1 x^${i} dx = \\frac{1}{${i + 1}}`,
      '$$',
      '',
      '> [!tip] 提示 ' + i,
      '> 第 ' + i + ' 条提示的正文。',
      '',
    )
  }
  return parts.join('\n')
}

function time(label: string, fn: () => void): number {
  const t0 = performance.now()
  fn()
  const ms = performance.now() - t0
  console.log(`[perf] ${label}: ${ms.toFixed(1)}ms`)
  return ms
}

describe('性能基准（宽松上限，精确值看 stdout）', () => {
  it('markdownToHtml：1KB / 58KB / 230KB 三档', () => {
    // ⚠️ 上限校准到「现实中的超大文档」：230KB ≈ 5 万字长文。更大的输入在 jsdom 测试
    //    环境会把 worker 打到 OOM（jsdom 的 DOM 节点比浏览器重 5-10 倍）—— 那是测试
    //    环境限制而非产品缺陷，浏览器堆 4GB+ 且 DOM 更轻。
    const small = buildDoc(1) // ~1KB
    const medium = buildDoc(200) // ~58KB
    const large = buildDoc(800) // ~230KB
    expect(small.length).toBeLessThan(3_000)
    expect(medium.length).toBeGreaterThan(50_000)
    expect(large.length).toBeGreaterThan(200_000)

    // 预热（首次含模块初始化，不计入）
    markdownToHtml(small, noopImageStore)

    const msSmall = time('mdToHtml ~1KB', () => markdownToHtml(small, noopImageStore))
    const msMedium = time('mdToHtml ~58KB', () => markdownToHtml(medium, noopImageStore))
    const msLarge = time('mdToHtml ~230KB', () => markdownToHtml(large, noopImageStore))

    expect(msSmall).toBeLessThan(3_000)
    // ⚠️ 全量套件并发跑时 CPU 争抢会让本档波动约 3 倍（单跑 ≈2.4-3.2s，全量里可到 ~11s），
    //    上限按并发环境校准；单跑的精确数据看 stdout（当前基线 ≈2.7s）。
    expect(msMedium).toBeLessThan(15_000)
    // 大文档档：绝对时间只做「真卡死」兜底（单跑 ≈25s，全量 188 文件并发时实测可到 90s+），
    // 真正的守门交给下面的**比值**——同一次运行内两个测量受同一负载影响，比值更稳。
    expect(msLarge).toBeLessThan(180_000)
    // 线性度守门：阈值 15× 的设计意图是「只抓灾难性劣化」—— 真 O(n²) 时 4× 输入会是
    // 16× 耗时（超阈值变红），O(n³) 是 64×。实测 4× 输入 ≈ 7-9× 耗时（轻度超线性，
    // 来源：marked/JS-DOM 对大 DOM 的固有开销，浏览器中显著更轻），属已知特征非回归。
    expect(msLarge).toBeLessThan(Math.max(msMedium, 100) * 15)
  })

  it('htmlToMarkdown：58KB / 230KB 两档', () => {
    const medium = markdownToHtml(buildDoc(200), noopImageStore)
    const large = markdownToHtml(buildDoc(800), noopImageStore)
    const msMedium = time('htmlToMd ~58KB', () => htmlToMarkdown(medium))
    const msLarge = time('htmlToMd ~230KB', () => htmlToMarkdown(large))
    expect(msMedium).toBeLessThan(5_000)
    expect(msLarge).toBeLessThan(30_000)
  })

  it('往返转换 5 次无劣化（编辑器切内核场景）', () => {
    const doc = buildDoc(100)
    let html = markdownToHtml(doc, noopImageStore)
    const t0 = performance.now()
    for (let i = 0; i < 5; i++) {
      html = markdownToHtml(htmlToMarkdown(html), noopImageStore)
    }
    const ms = performance.now() - t0
    console.log(`[perf] 往返×5: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(30_000)
  })

  it('preprocessCustomSyntax：500KB 纯文本（方言正则的线性度）', () => {
    const big = ('普通中文段落，无任何方言标记。'.repeat(40) + '\n').repeat(200)
    const ms = time('preprocessCustomSyntax ~500KB', () => preprocessCustomSyntax(big))
    expect(ms).toBeLessThan(2_000)
  })

  it('病态输入：大量 $ 符号（公式正则的最坏情形）不炸不挂', () => {
    const evil = '$a$'.repeat(20_000) // 6 万个 $，考验 $...$ 配对的最坏情形
    const ms = time('公式正则 6 万 $', () => markdownToHtml(evil, noopImageStore))
    expect(ms).toBeLessThan(15_000)
  })
})

describe('稳定性 · 边界输入（渲染不崩、不产生脚本执行面）', () => {
  it('空串 / 纯空白 / 只有换行 → 不崩且输出可控', () => {
    for (const input of ['', '   ', '\n\n\n', '\t\t']) {
      const html = markdownToHtml(input, noopImageStore)
      expect(typeof html).toBe('string')
    }
  })

  it('超深嵌套列表（300 层）→ 顶层 catch 兜住或正常产出，不白屏', () => {
    let deep = ''
    for (let i = 0; i < 300; i++) deep += '  '.repeat(i) + '- 层 ' + i + '\n'
    const html = markdownToHtml(deep, noopImageStore)
    expect(typeof html).toBe('string')
  })

  it('巨型单行（500KB 无换行）→ 不挂', () => {
    const line = '很长的一行文字没有任何换行与标记。'.repeat(15_000)
    const ms = time('巨型单行 ~500KB', () => markdownToHtml(line, noopImageStore))
    expect(ms).toBeLessThan(15_000)
  })

  it('XSS 冒烟：script / 事件属性 / javascript: href 不出现在渲染产物中', () => {
    const evil = [
      '<script>window.__pwned = 1</script>',
      '<img src=x onerror="window.__pwned = 1">',
      '[点我](javascript:alert(1))', // 无空格：marked 会解析为链接，href 必须被剥
      '<iframe src="javascript:window.__pwned = 1"></iframe>',
      '"><svg onload="window.__pwned = 1">',
    ].join('\n\n')
    const html = markdownToHtml(evil, noopImageStore)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('onload')
    // javascript: 只能以「字面文本」存在（如同文章里提到这个词），绝不能出现在 href/src 里
    expect(html).not.toMatch(/(href|src)\s*=\s*["']?\s*javascript:/i)
  })

  it('特殊内容：emoji / RTL / 控制字符 / null 字节邻接 → 不崩', () => {
    const weird = [
      '🎉🚀💯 emoji 段落',
      'مرحبا بالعربية RTL 文字混排',
      '控制字符\x01\x02\x1b[31m 混排',
      'null 邻接 \0 后续文字',
      'Zalgo: z̸̛a̷l̶g̷o̸',
    ].join('\n\n')
    const html = markdownToHtml(weird, noopImageStore)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('方言预处理对畸形输入不崩：半个高亮 / 空公式 / 未闭合 callout / 孤立 wikilink', () => {
    for (const input of ['==未闭合', '$$', '$ $', '>> [!tip]', '[[', '![[', '```', '~~', '^', '++', '%%']) {
      expect(() => preprocessCustomSyntax(input)).not.toThrow()
      expect(() => markdownToHtml(input, noopImageStore)).not.toThrow()
    }
  })

  it('往返幂等：第二轮 md→html→md 与第一轮语义一致（忽略空白行差异）', () => {
    // 全等会误报 turndown 的空白规范化噪声（列表后多一个全空格行）；
    // 这里去掉空行后逐行全等 —— 任何内容丢失（丢 [x]、丢 [[双链]]）仍会被抓住。
    const norm = (s: string) =>
      s
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .filter((l) => l.trim().length > 0)
        .join('\n')
    const doc = buildDoc(10)
    const html1 = markdownToHtml(doc, noopImageStore)
    const md1 = htmlToMarkdown(html1)
    const md2 = htmlToMarkdown(markdownToHtml(md1, noopImageStore))
    expect(norm(md2)).toBe(norm(md1))
  })
})

/**
 * 阶段 0（TiptapEditor 性能方案）：每键击成本剖面。
 * 无法在 jsdom 里复现 ProseMirror 的 getHTML，但 htmlToMarkdown（Turndown 全文档）
 * 与 lintMarkdown（全量规则）是纯函数，可直接测出两者的占比，作为优化优先级依据。
 * 阶段 2（序列化防抖）落地后，这个档位应能看出「相同工作量被合并」的收益。
 */
describe('WYSIWYG 每键击成本剖面（阶段 0 埋点基准）', () => {
  it('20 次键击：htmlToMarkdown 与 lintMarkdown 耗时占比', () => {
    const md = buildDoc(30) // ~8KB（常见笔记规模；28KB/100 次档实测见 docs/TiptapEditor-Perf-Plan.md）
    const html = markdownToHtml(md, noopImageStore)
    // 预热（首次含模块初始化）
    htmlToMarkdown(html)
    lintMarkdown(md)

    const measure = (fn: () => void, n: number): number => {
      const t0 = performance.now()
      for (let i = 0; i < n; i++) fn()
      return performance.now() - t0
    }
    const toMd = measure(() => htmlToMarkdown(html), 20)
    const lint = measure(() => lintMarkdown(md), 20)
    const total = toMd + lint
    console.log(
      `[perf] 20 次键击: htmlToMarkdown=${toMd.toFixed(1)}ms (${((toMd / total) * 100).toFixed(1)}%) ` +
      `lintMarkdown=${lint.toFixed(1)}ms (${((lint / total) * 100).toFixed(1)}%) 合计=${total.toFixed(1)}ms`,
    )
    // 数量级守门（jsdom 比浏览器慢数倍）：单次键击两段合计不得超过 2000ms（jsdom 比浏览器慢数倍）
    expect(total / 20).toBeLessThan(2000)
  })
})
