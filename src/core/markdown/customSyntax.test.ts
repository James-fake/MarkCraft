import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@services/sanitizeHtml'
import { preprocessCustomSyntax, preprocessImageAttrs, restorePlaceholders } from './customSyntax'
import { markdownToHtml } from '@features/editor/mdToHtml'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 回归锁（2026-10-10 真实事故）：所见即所得里下划线/高亮正常，**切到预览却原样显示**
 * `++文本|red++` / `==文本|red==`。
 *
 * 成因：预览走的是另一条管线（`hooks/useMarkdownRenderer` → marked），
 * 而 marked 不认识本项目的方言 —— 必须先经 `preprocessCustomSyntax` 预处理。
 * 本文件同时锁「预览与所见即所得共用同一份规则」（单一来源）。
 */
const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

/** 预览管线的等价简化：图片属性 → 自定义语法 → marked(+消毒)（与 useMarkdownRenderer 同序） */
const renderPreview = (md: string) => renderMarkdown(preprocessCustomSyntax(preprocessImageAttrs(md)))

describe('自定义语法预处理 · 预览管线', () => {
  it('下划线（指定色）：不再原样显示 ++…|red++，且带 text-decoration-color', () => {
    const html = renderPreview('前 ++重点|red++ 后')
    expect(html, '不得残留原始语法').not.toContain('++')
    expect(html).toContain('<u')
    expect(html).toContain('data-underline-color="red"')
    expect(html, '颜色必须落到内联样式上（预览侧没有 data-* 的 CSS）').toContain(
      'text-decoration-color',
    )
  })

  it('高亮（指定色）：不再原样显示 ==…|red==，且带 background-color', () => {
    const html = renderPreview('前 ==重点|red== 后')
    expect(html).not.toContain('==')
    expect(html).toContain('<mark')
    expect(html).toContain('data-highlight-color="red"')
    expect(html).toContain('background-color')
  })

  it('最短形态（不带色）也能渲染，且 auto 下划线不写死颜色', () => {
    expect(renderPreview('++重点++')).toMatch(/<u[^>]*>重点<\/u>/)
    expect(renderPreview('++重点++')).not.toContain('text-decoration-color')
    expect(renderPreview('==重点==')).toMatch(/<mark[^>]*>重点<\/mark>/)
  })

  it('消毒器不得剥掉 style（否则颜色白给）', () => {
    const html = renderPreview('++重点|red++')
    expect(html, 'style 被 DOMPurify 剥掉会让预览没颜色').toMatch(/style="[^"]*text-decoration/)
  })

  it('与所见即所得产出同形（单一来源）：两边都不含原始语法', () => {
    const md = '前 ++下划线|red++ 中 ==高亮|blue== 后'
    const wysiwyg = markdownToHtml(md, noopImageStore)
    const preview = renderPreview(md)
    for (const out of [wysiwyg, preview]) {
      expect(out).not.toContain('++')
      expect(out).not.toContain('==')
      expect(out).toContain('data-underline-color="red"')
      expect(out).toContain('data-highlight-color="blue"')
    }
  })
})

/**
 * 回归锁（2026-10-11 真实事故）：所见即所得插入图片正常，切源码正常，
 * **切到预览 / 再切回所见即所得 → 图片变乱码**。
 *
 * 成因：`preprocessCustomSyntax` 把语法规则套在**整段 markdown** 上，
 * 而 base64 data URL 的字母表含 `+`（尾部还有 `=`）——`++…++` 会被下划线规则
 * 误当成 `++text++` 改写成 `<u>…</u>`，`==…==` 会被高亮规则改写，
 * 于是 URL 被撕碎。修复：跑规则前先把 URL 目标抽成占位，规则只作用于正文。
 */
describe('自定义语法预处理 · 不得破坏 URL（回归 2026-10-11）', () => {
  // 含 `++` 与尾部 `==` 的 base64 片段
  const b64 = 'iVBORw0KGgoAA++BBBB++CCCC=='
  const imgMd = `![img](data:image/png;base64,${b64})`

  it('base64 含 ++ 的图片 URL 不被下划线规则改写（整段原样返回）', () => {
    const out = preprocessCustomSyntax(imgMd)
    expect(out, 'URL 必须逐字保留').toBe(imgMd)
    expect(out).not.toContain('<u>')
  })

  it('预览管线：base64 图片 URL 原样出现在渲染结果中', () => {
    const html = renderMarkdown(preprocessCustomSyntax(imgMd))
    expect(html).toContain(b64)
    expect(html, '不得把 ++ 变成 <u>').not.toContain('<u>')
  })

  it('所见即所得管线：base64 图片 URL 也不被改写', () => {
    const html = markdownToHtml(imgMd, noopImageStore)
    expect(html).toContain(b64)
    expect(html).not.toContain('<u>')
  })

  it('markdown 链接目的地含 ++ 时不被改写', () => {
    const md = '[x](https://example.com/++p++/q)'
    expect(preprocessCustomSyntax(md)).toBe(md)
  })

  it('URL 被保护的同时，正文里的自定义语法仍照常生效', () => {
    const md = `前 ++重点++ ${imgMd} 后 ==高亮==`
    const out = preprocessCustomSyntax(md)
    expect(out, '正文下划线/高亮仍生效').toContain('<u')
    expect(out).toContain('<mark')
    expect(out, 'URL 不受影响').toContain(b64)
  })
})

/**
 * 回归锁（2026-10-11 真实事故）：所见即所得里对图片**靠左/靠右/放大缩小**有效，
 * 切到预览**毫无效果**，且图片下方**原样显示** `{align="left"}` 之类的参数。
 *
 * 成因：图片属性语法 `![alt](src){width align}` 只在所见即所得管线（`mdToHtml`）
 * 经 `preprocessImageAttrs` 转成 HTML，**预览管线漏调**，于是 marked 把 `{…}` 当普通文本。
 * 修复：`preprocessImageAttrs` 下沉到 `customSyntax`（单一来源），两条管线共用。
 */
describe('图片属性语法 · 预览与所见即所得共用（回归 2026-10-11）', () => {
  const md = '![图](https://a.com/x.png){width="200" align="left"}'

  it('preprocessImageAttrs：产出带对齐与宽度的 HTML，且不残留 {…}', () => {
    const out = preprocessImageAttrs(md)
    expect(out).toContain('data-align="left"')
    expect(out).toContain('text-align: left')
    expect(out).toContain('width="200"')
    expect(out, '不得残留属性花括号').not.toContain('{')
  })

  it('预览管线：不再原样显示 {align="left"}，且对齐/宽度生效', () => {
    const html = renderPreview(md)
    expect(html, '属性必须被消费、不能当文本显示').not.toContain('{align')
    expect(html).toContain('data-align="left"')
    expect(html).toContain('width="200"')
  })

  it('所见即所得管线：与预览同形（单一来源）', () => {
    const html = markdownToHtml(md, noopImageStore)
    expect(html).not.toContain('{align')
    expect(html).toContain('data-align="left"')
  })

  it('无属性的普通图片不受影响', () => {
    const plain = '![图](https://a.com/x.png)'
    expect(preprocessImageAttrs(plain)).toBe(plain)
  })
})

/**
 * 回归锁（2026-11-03 真实事故）：首启种子文档里的 Callout 在所见即所得里露出原文 ——
 * `<div data-callout>` 的属性被消毒闸门剥成空 `<div>`，标题随 data-title 一起消失；
 * 同时首行被替换成 `<div>` 后，后续 `>` 内容行失去归属，`>` 前缀原样留在正文里。
 */
describe('Callout · 整块转换与属性保全', () => {
  const md = ['前文', '', '> [!tip] 标题', '> 正文内容', '> 第二行', '', '后文'].join('\n')

  it('属性齐全（消毒后仍保留 data-callout / data-callout-type / data-title）', () => {
    const html = renderPreview(md)
    expect(html).toContain('data-callout="true"')
    expect(html).toContain('data-callout-type="tip"')
    expect(html).toContain('data-title="标题"')
  })

  it('正文行的 > 前缀被消费，不残留原文', () => {
    const html = renderPreview(md)
    expect(html).not.toContain('&gt; 正文内容')
    expect(html).not.toContain('> 正文内容')
    expect(html).toContain('正文内容')
    expect(html).toContain('第二行')
  })

  it('callout 之外的段落不被吞进块内', () => {
    const html = renderPreview(md)
    expect(html).toContain('后文')
    // 后文必须在 callout div 闭合之后
    expect(html.indexOf('后文')).toBeGreaterThan(html.indexOf('</div>'))
  })

  it('可折叠标记 + 与 - 都落成 data-collapsible', () => {
    for (const mark of ['+', '-']) {
      const html = renderPreview(`> [!note]${mark} 可折叠\n> 内容`)
      expect(html).toContain('data-collapsible="true"')
    }
  })

  it('普通引用（无 [!type]）不受影响', () => {
    const html = renderPreview('> 只是一段引用\n> 第二行')
    expect(html).not.toContain('data-callout')
    expect(html).toContain('只是一段引用')
  })
})

/**
 * 回归锁（2026-11-03）：latex 里的 `^` `_` 被上标/下标规则误伤 ——
 * `$E = mc^2$` 变成 `mc<sup>2`，块级公式漏出 `</sup>` 碎片。
 */
describe('公式 · 不被行内方言规则污染', () => {
  it('行内公式里的 ^ 保持原样（不被改成 <sup>）', () => {
    const html = renderPreview('前 $E = mc^2$ 后')
    expect(html).toContain('$E = mc^2$')
    expect(html).not.toContain('<sup>')
  })

  it('所见即所得管线：块级公式的 latex 完整（_ 与 ^ 都不被改写）', () => {
    const html = markdownToHtml('$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$', noopImageStore)
    expect(html).toContain('data-latex="\\int_0^1 x^2 dx = \\frac{1}{3}"')
    expect(html).not.toContain('&lt;/sup&gt;')
    expect(html).not.toContain('</sup>')
  })

  it('公式之外的 ^上标^ / ~下标~ 仍然生效（保护只针对 $ 段）', () => {
    const html = renderPreview('正文 ^上标^ 与 ~下标~，公式 $a_i^2$ 保持原样')
    expect(html).toContain('<sup>上标</sup>')
    expect(html).toContain('<sub>下标</sub>')
    expect(html).toContain('$a_i^2$')
    expect(html).not.toContain('<sub>i</sub>')
  })
})

/**
 * 回归锁（2026-11-08 审查 C 组）：
 * 占位符还原各只 `replace` 一次（非递归）→ 畸形 / 嵌套 markdown 会把 `\uE000…`
 * 私有区字符**写回用户文件**（WYSIWYG 保存路径原样落盘）。修复：循环还原至稳定，
 * 并对已占位区段跳过后续保护规则，避免产出嵌套占位符。
 */
describe('占位符还原 · 递归与私有区字符（回归 2026-11-08）', () => {
  const PUA_RE = /[\uE000\uE001]/

  it('公式内含 markdown 链接：嵌套占位完整还原，不残留私有区字符', () => {
    const md = '$[x](y)$'
    const out = preprocessCustomSyntax(md)
    expect(PUA_RE.test(out), `残留私有区字符：${JSON.stringify(out)}`).toBe(false)
    expect(out).toBe(md)
  })

  it('restorePlaceholders 循环还原嵌套占位（单轮会留下 MATHBLOCKPLACEHOLDER0END）', () => {
    const out = restorePlaceholders('MATHBLOCKPLACEHOLDER1END', ['A', 'MATHBLOCKPLACEHOLDER0END'])
    expect(out).toBe('A')
  })

  it('自引用占位符不死循环 / 不膨胀，残留标记被清除', () => {
    const out = restorePlaceholders('MATHBLOCKPLACEHOLDER0END', ['MATHBLOCKPLACEHOLDER0END'])
    expect(out).toBe('')
  })

  it('行内代码内含 URL：代码段整体保护，还原后逐字不变', () => {
    const md = '`[x](https://a.com/++p++)`'
    const out = preprocessCustomSyntax(md)
    expect(PUA_RE.test(out)).toBe(false)
    expect(out).toBe(md)
  })

  it('base64 URL 仍逐字保留（2026-10-11 事故不回归）', () => {
    const b64 = 'iVBORw0KGgoAA++BBBB++CCCC=='
    const md = `![img](data:image/png;base64,${b64})`
    expect(preprocessCustomSyntax(md)).toBe(md)
  })

  it('查询串含 & / ++ 的链接 URL 原样保留', () => {
    const md = '[x](https://a.com/?q=a++b&k==v)'
    expect(preprocessCustomSyntax(md)).toBe(md)
  })
})

/**
 * 回归锁（2026-11-08 审查 C 组）：只有 wiki-link 属性用了 escapeHtmlAttr，
 * `img src` / `data-embed-*` / `displayText` / `data-block-*` 仍直接插值（XSS 面）。
 * 修复：属性值统一 escapeHtmlAttr、文本统一转义。
 */
describe('属性/文本插值 · 统一转义（回归 2026-11-08）', () => {
  it('图片 alt 中的引号被转义，不能闭合属性注入', () => {
    const out = preprocessImageAttrs('![" onerror="alert(1)](https://a.com/a.png){align="left"}')
    expect(out).toContain('&quot;')
    expect(out, '不得出现可执行的裸属性').not.toContain(' onerror="')
  })

  it('图片 src 中的引号被转义，不能闭合属性注入', () => {
    const out = preprocessImageAttrs('![x](https://a.com/a.png" onload="alert){align="left"}')
    expect(out).toContain('&quot;')
    expect(out).not.toContain(' onload="')
  })

  it('![[target]] 的 data-embed-* / img 属性被转义', () => {
    const out = preprocessCustomSyntax('![[a" onerror="alert(1).png]]')
    expect(out).toContain('&quot;')
    expect(out).not.toContain('" onerror="')
  })

  it('wiki-link 的 target/label 属性被转义', () => {
    const out = preprocessCustomSyntax('[[a" onmouseover="alert(1)|label]]')
    expect(out).toContain('&quot;')
    expect(out).not.toContain('" onmouseover="')
  })

  it('wiki-link 的 displayText 作为文本被转义（不能注入标签）', () => {
    const out = preprocessCustomSyntax('[[目标|<img src=x onerror=alert(1)>]]')
    expect(out).toContain('&lt;img')
    expect(out).not.toContain('<img')
  })

  it('块引用的 data-block-* 属性被转义、alias 文本不能注入标签', () => {
    const attr = preprocessCustomSyntax('((b|x" onmouseover="alert(1)))')
    expect(attr).toContain('data-block-alias="x&quot; onmouseover=&quot;alert(1"')

    const text = preprocessCustomSyntax('((b|<img src=x onerror=alert>))')
    expect(text).toContain('&lt;img')
    expect(text).not.toContain('<img')
  })

  it('文本中的 & 正常转义为实体（显示语义不变）', () => {
    const out = preprocessCustomSyntax('[[目标|A & B]]')
    expect(out).toContain('A &amp; B')
  })
})
