import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './mdToHtml'
import { htmlToMarkdown } from './htmlToMd'
import { preprocessCustomSyntax } from '@core/markdown/customSyntax'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 回归锁（2026-11-03 穷尽式审查 P0-3 / P0-4）。
 *
 * P0-3：方言行内规则无代码围栏保护 —— mermaid 的 `%%` 注释、`((圆节点))`、代码里的
 *       `==`/`++`/`~`/`^`/`[[` 被改写成 HTML 标签；WYSIWYG 保存路径把改写结果原样写回
 *       markdown → **打开→保存即永久损坏用户代码**。
 * P0-4：`data-toc` 不在消毒白名单 → `[TOC]` 往返永久丢失；双链的关系/备注属性被剥 →
 *       `[[目标|关系:x]]` 语义丢失并退化成 `[[x|x]]` 垃圾语法。
 */
const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

describe('P0-3 · 代码围栏 / 行内代码保护', () => {
  it('围栏代码块内的方言字符原样保留（不被改写成 HTML 标签）', () => {
    const md = [
      '```mermaid',
      '%% 这是一行注释',
      'graph TD',
      '  A((圆节点)) --> B[方]',
      '  B -->|x==y| C',
      '```',
    ].join('\n')
    const out = preprocessCustomSyntax(md)
    expect(out).toContain('%% 这是一行注释')
    expect(out).toContain('((圆节点))')
    expect(out).toContain('x==y')
    expect(out).not.toContain('<mark')
    expect(out).not.toContain('<div data-callout')
  })

  it('行内代码里的方言字符原样保留', () => {
    const out = preprocessCustomSyntax('用 `a==b` 与 `c++d` 与 `[[x]]` 表示')
    expect(out).toContain('`a==b`')
    expect(out).toContain('`c++d`')
    expect(out).toContain('`[[x]]`')
    expect(out).not.toContain('<mark')
    expect(out).not.toContain('<u')
  })

  it('围栏之外的同类语法仍然正常转换（保护不误伤）', () => {
    const md = ['正文 ==高亮== 与 ++下划线++', '', '```', 'code ==raw==', '```', '', '再看 ==高亮2=='].join('\n')
    const out = preprocessCustomSyntax(md)
    expect(out).toContain('<mark')
    expect(out).toContain('<u')
    expect(out).toContain('code ==raw==')
  })

  it('未闭合围栏（编辑中的半成品）保守保护：内容不被改写', () => {
    const md = ['```js', 'const a = "==x=="', '// 还没写完围栏'].join('\n')
    const out = preprocessCustomSyntax(md)
    expect(out).toContain('const a = "==x=="')
    expect(out).not.toContain('<mark')
  })

  it('管线级：mermaid 围栏的 %% 注释完整进入 data-code（WYSIWYG 打开不丢源码）', () => {
    const md = ['```mermaid', '%% 注释行', 'graph TD', '  A --> B', '```'].join('\n')
    const html = markdownToHtml(md, noopImageStore)
    expect(html).toContain('data-type="mermaidBlock"')
    expect(html).toContain('%% 注释行')
  })

  it('管线级：普通代码块内的 [[双链]] 不被转换成链接', () => {
    const md = ['```', '[[不是链接]]', '```'].join('\n')
    const html = markdownToHtml(md, noopImageStore)
    expect(html).toContain('[[不是链接]]')
    expect(html).not.toContain('data-wiki-link')
  })
})

describe('P0-4 · [TOC] 与双链关系/备注往返', () => {
  it('[TOC] 经消毒闸门后 data-toc 保留（目录节点可识别）', () => {
    // TOC 的占位转换在 markdownToHtml 内部（customSyntax 之后、marked 之前），必须走真实管线
    const html = markdownToHtml('[TOC]', noopImageStore)
    expect(html).toContain('data-toc="true"')
  })

  it('[[目标|关系:x]] 往返不丢语义、不产生 [[x|x]] 垃圾语法', () => {
    const md = '见 [[设计稿|关系:依赖]] 一文'
    const html = markdownToHtml(md, noopImageStore)
    expect(html).toContain('data-wiki-relation="依赖"')
    const back = htmlToMarkdown(html)
    expect(back).toContain('[[设计稿|关系:依赖]]')
    expect(back).not.toContain('|设计稿]]')
  })

  it('[[目标|备注:x]] 同样往返保留', () => {
    const md = '见 [[设计稿|备注:待补充]]'
    const html = markdownToHtml(md, noopImageStore)
    expect(html).toContain('data-wiki-note="待补充"')
    expect(htmlToMarkdown(html)).toContain('[[设计稿|备注:待补充]]')
  })

  it('普通 [[目标]] 与 [[目标|别名]] 行为不变', () => {
    const html1 = markdownToHtml('[[目标]]', noopImageStore)
    expect(htmlToMarkdown(html1)).toContain('[[目标]]')
    const html2 = markdownToHtml('[[目标|别名]]', noopImageStore)
    expect(htmlToMarkdown(html2)).toContain('[[目标|别名]]')
  })
})
