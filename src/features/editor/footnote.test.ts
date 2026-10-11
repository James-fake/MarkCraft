/**
 * 脚注面板可编辑能力（A3）纯函数测试：
 * 计数 / 跳回引用 / 编辑定义 / 删除 / 新增
 */
import { describe, it, expect } from 'vitest'
import {
  countFootnoteReferences,
  firstFootnoteReferenceLine,
  editFootnoteDefinition,
  deleteFootnote,
  addFootnote,
} from './footnote'

describe('countFootnoteReferences', () => {
  it('只统计正文引用，不计定义行 [^id]:', () => {
    const md = '首 [^1] 中 [^1] 尾。\n\n[^1]: 定义内容'
    expect(countFootnoteReferences(md, '1')).toBe(2)
  })
  it('无引用返回 0', () => {
    expect(countFootnoteReferences('[^1]: 仅定义', '1')).toBe(0)
  })
})

describe('firstFootnoteReferenceLine', () => {
  it('返回首个引用所在行（1-based），跳过定义行', () => {
    const md = '[^1]: 定义\n第二行 [^1] 引用'
    expect(firstFootnoteReferenceLine(md, '1')).toBe(2)
  })
  it('无引用返回 -1', () => {
    expect(firstFootnoteReferenceLine('[^1]: 仅定义', '1')).toBe(-1)
  })
})

describe('editFootnoteDefinition', () => {
  it('替换定义内容（含续行一并清掉）', () => {
    const md = '[^1]: 旧第一行\n    旧续行\n其他正文 [^1]'
    expect(editFootnoteDefinition(md, '1', '新内容')).toBe('[^1]: 新内容\n其他正文 [^1]')
  })
})

describe('deleteFootnote', () => {
  it('删除定义行与全部正文引用', () => {
    const md = '[^1]: 定义\n[^1] 前 [^1] 后'
    const out = deleteFootnote(md, '1')
    expect(out).not.toContain('[^1]:')
    expect(out).not.toContain('[^1]')
  })
})

describe('addFootnote', () => {
  it('文末追加引用标记与定义占位，返回新 id', () => {
    const { text, newId } = addFootnote('正文段落。')
    expect(newId).toBe('1')
    expect(text).toBe('正文段落。\n\n[^1]\n\n[^1]: ')
  })
  it('带内容时填到定义处', () => {
    const { text } = addFootnote('正文段落。', '来源说明')
    expect(text).toContain('[^1]: 来源说明')
  })
  it('已有脚注时序号递增', () => {
    const { text, newId } = addFootnote('[^1]: 已有')
    expect(newId).toBe('2')
    expect(text).toContain('[^2]')
  })
})
