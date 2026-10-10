import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 回归锁（2026-10-11 真实事故）：表格在浅色/深色下**边框都几乎看不见**，
 * 且**最后一行没有下框线** —— 用户看不到表格边界，就以为已经离开表格、
 * 把块级公式等内容继续输进了单元格里。
 *
 * 另有：表格上方的浮动菜单（TableBubbleMenu）原本悬在表格外 40px 处，
 * 会盖住上一行内容（用户插的水平分割线被遮住）。
 *
 * 这些都是**纯样式约定**，最容易在后续改样式时悄悄回归，故做源码级断言。
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')
/** 断言前必须剥掉 CSS 注释：本次的说明注释里就写了「不能 overflow: hidden」，否则会自摆乌龙 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('表格边框可见性（源码级回归锁）', () => {
  const tiptap = read('src/styles/tiptap.css')
  const base = read('src/styles/base.css')
  const markdown = read('src/styles/markdown.css')

  it('编辑器表格的边框必须用 --table-border（不能用更淡的 --editor-border）', () => {
    // 抓 table / td / th 三条规则里的 border 声明
    const tableBlock = tiptap.slice(tiptap.indexOf('.tiptap-editor-wrapper .tiptap table {'))
    expect(tableBlock).toContain('var(--table-border)')
    // 单元格
    const cellIdx = tiptap.indexOf('.tiptap-editor-wrapper .tiptap td,')
    const cellBlock = tiptap.slice(cellIdx, cellIdx + 300)
    expect(cellBlock, '单元格边框也必须用 --table-border').toContain('var(--table-border)')
  })

  it('--table-border 在两套主题下都必须够醒目（不得退回那两个看不见的旧值）', () => {
    const defs = [...base.matchAll(/--table-border:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(defs.length, '深/浅两套主题各一条').toBe(2)
    for (const v of defs) {
      expect(['#334155', '#e2e8f0'], `${v} 是「几乎看不见」的旧值，会造成真实事故`).not.toContain(v)
    }
  })

  it('表格不得同时使用 overflow:hidden + border-radius（会把最后一行底边裁掉）', () => {
    const idx = tiptap.indexOf('.tiptap-editor-wrapper .tiptap table {')
    const block = stripComments(tiptap.slice(idx, tiptap.indexOf('}', idx)))
    const hasHidden = /overflow:\s*hidden/.test(block)
    const hasRadius = /border-radius/.test(block)
    expect(
      hasHidden && hasRadius,
      'overflow:hidden + border-radius 叠加会裁掉末行底边 → 用户看不到表格下边界',
    ).toBe(false)
  })

  it('表格顶部必须为浮动菜单预留空间（margin-top ≥ 30px）', () => {
    const idx = tiptap.indexOf('.tiptap-editor-wrapper .tiptap table {')
    const block = tiptap.slice(idx, tiptap.indexOf('}', idx))
    const m = block.match(/margin:\s*(\d+)px/)
    expect(m, '表格规则里应有 margin 简写').toBeTruthy()
    expect(Number(m![1]), '预留空间不足会让菜单盖住上一行内容').toBeGreaterThanOrEqual(30)
  })

  it('菜单必须落在表格顶部预留带内（偏移量不得大于预留高度）', () => {
    const menu = read('src/features/editor/TableBubbleMenu.tsx')
    expect(menu, '菜单定位需用 MENU_H 常量表达').toContain('MENU_H')
    // 预留 34px；菜单高 30 + 间距 4 = 34 —— 不得出现「比预留带还大」的偏移
    const offset = menu.match(/tableRect\.top - wrapperRect\.top - ([^;]+)/)
    expect(offset, '应保留相对表格顶部的定位表达式').toBeTruthy()
  })

  it('预览侧表格与编辑器共用同一 token（避免只修一半）', () => {
    const idx = markdown.indexOf('.markdown-preview table {')
    const block = markdown.slice(idx, markdown.indexOf('}', idx))
    expect(block).toContain('var(--table-border)')
  })
})
