/**
 * P1-6 模板与范例库逻辑测试
 * 覆盖：场景模板（博客/Newsletter/系列）已内置、applyTemplate 变量替换、
 * 范例库 getExamples / getExampleById，以及共享模板导入。
 */
import { describe, it, expect } from 'vitest'
import {
  BUILTIN_TEMPLATES,
  getAllTemplates,
  applyTemplate,
  getExamples,
  getExampleById,
  importSharedTemplate,
  type Template,
} from './templateManager'

describe('P1-6 场景模板', () => {
  it('内置模板包含博客发文 / Newsletter / 系列专栏（以及原有读书笔记）', () => {
    const ids = BUILTIN_TEMPLATES.map(t => t.id)
    expect(ids).toContain('blog-post')
    expect(ids).toContain('newsletter')
    expect(ids).toContain('series')
    expect(ids).toContain('book-notes')
  })

  it('场景模板通过 getAllTemplates 对外可见', () => {
    const all = getAllTemplates()
    expect(all.find(t => t.id === 'blog-post')).toBeTruthy()
    expect(all.find(t => t.id === 'newsletter')).toBeTruthy()
    expect(all.find(t => t.id === 'series')).toBeTruthy()
  })

  it('applyTemplate 正确替换 {{date}} 与 {{title}}', () => {
    const tpl: Template = {
      id: 'x', name: 'x', nameEn: 'x', icon: 'x',
      content: '# {{title}}\n日期 {{date}}', isBuiltIn: true,
    }
    const out = applyTemplate(tpl, { title: '我的文章' })
    expect(out).toContain('我的文章')
    expect(out).not.toContain('{{title}}')
    expect(out).toContain('日期')
    expect(out).not.toContain('{{date}}')
  })
})

describe('P1-6 范例库', () => {
  it('提供可一键载入的成稿范例', () => {
    const ex = getExamples()
    expect(ex.length).toBeGreaterThanOrEqual(3)
    expect(ex.map(e => e.id)).toEqual(
      expect.arrayContaining(['ex-blog-local-first', 'ex-newsletter-issue', 'ex-series-pkm'])
    )
  })

  it('范例内容为非空成稿且带场景标签', () => {
    for (const e of getExamples()) {
      expect(e.content.trim().length).toBeGreaterThan(50)
      expect(e.scene).toBeTruthy()
    }
  })

  it('getExampleById 按 id 精确查找', () => {
    const e = getExampleById('ex-blog-local-first')
    expect(e).toBeTruthy()
    expect(e!.name).toContain('本地优先写作')
    expect(getExampleById('nope')).toBeUndefined()
  })
})

describe('共享模板导入（UGC）', () => {
  // jsdom 的 File 未实现 .text()，用最小 file-like 对象替代
  const makeFile = (name: string, text: string): File =>
    ({ name, text: async () => text }) as unknown as File

  it('从 .json 导入共享模板', async () => {
    const payload = JSON.stringify({
      type: 'markcraft-template', version: 1,
      template: { id: 'u1', name: '导入模板', nameEn: 'Imported', icon: '📦', content: '# 导入' },
    })
    const tmpl = await importSharedTemplate(makeFile('imported.markcraft-template.json', payload))
    expect(tmpl.name).toBe('导入模板')
    expect(tmpl.isBuiltIn).toBe(false)
    expect(getAllTemplates().some(t => t.id === tmpl.id)).toBe(true)
  })

  it('从 .md 导入（以首个 H1 作为名称）', async () => {
    const md = '# 我的 Markdown 模板\n\n正文内容\n'
    const tmpl = await importSharedTemplate(makeFile('mytpl.md', md))
    expect(tmpl.name).toBe('我的 Markdown 模板')
    expect(tmpl.content).toContain('正文内容')
  })
})
