import { describe, it, expect } from 'vitest'
import { applyTemplate, applyTemplateWithCursor, formatDatePattern } from './templateApply'
import type { Template } from './templateData'

const tpl = (content: string): Template => ({
  id: 'x',
  name: 'x',
  nameEn: 'x',
  icon: '📄',
  content,
  isBuiltIn: false,
})

describe('formatDatePattern', () => {
  const now = new Date(2026, 9, 11, 9, 5, 3) // 2026-10-11 09:05:03
  it('YYYY-MM-DD', () => expect(formatDatePattern(now, 'YYYY-MM-DD')).toBe('2026-10-11'))
  it('YY/M/D 不补零', () => expect(formatDatePattern(now, 'YY/M/D')).toBe('26/10/11'))
  it('HH:mm:ss 补零', () => expect(formatDatePattern(now, 'HH:mm:ss')).toBe('09:05:03'))
  it('未知 token 原样保留', () => expect(formatDatePattern(now, 'YYYY年QQ')).toBe('2026年QQ'))
})

describe('applyTemplate · 变量（模板优化 A 档）', () => {
  it('{{title}} 由 extraVars 解析（此前插入方不传 → 恒为空）', () => {
    expect(applyTemplate(tpl('# {{title}}'), { title: '我的笔记' })).toBe('# 我的笔记')
  })

  it('{{filename}} 解析，缺省回退到 title', () => {
    expect(applyTemplate(tpl('{{filename}}'), { title: 'A' })).toBe('A')
    expect(applyTemplate(tpl('{{filename}}'), { title: 'A', filename: 'B.md' })).toBe('B.md')
  })

  it('{{date:格式}} / {{year}} / {{month}} / {{day}} / {{weekday}} 解析', () => {
    const now = new Date()
    const out = applyTemplate(tpl('{{date:YYYY-MM-DD}} {{year}} {{month}} {{day}} {{weekday}}'))
    expect(out).toContain(String(now.getFullYear()))
    expect(out).toMatch(/星期/)
    expect(out).not.toContain('{{')
  })

  it('默认 {{date}} / {{time}} 仍可用', () => {
    const out = applyTemplate(tpl('{{date}} {{time}}'))
    expect(out).not.toContain('{{date}}')
    expect(out).not.toContain('{{time}}')
  })

  it('未知变量保持原样（不静默吞掉）', () => {
    expect(applyTemplate(tpl('{{nope}}'))).toBe('{{nope}}')
  })

  it('vars.date 覆盖「当前时间」（修日记按目标日期生成）', () => {
    expect(applyTemplate(tpl('{{date:YYYY-MM-DD}}'), { date: new Date(2020, 0, 2) })).toBe('2020-01-02')
  })

  it('vars.dateFormat 决定默认 {{date}} 的格式', () => {
    expect(applyTemplate(tpl('{{date}}'), { date: new Date(2026, 9, 11), dateFormat: 'YYYY-MM-DD' })).toBe('2026-10-11')
    // 未指定 dateFormat 时保持本地化日期（含年份）
    expect(applyTemplate(tpl('{{date}}'), { date: new Date(2026, 9, 11) })).toContain('2026')
  })
})

describe('applyTemplate · {{cursor}} 光标落点', () => {
  it('applyTemplate 剥除 {{cursor}}（产出干净文本，不落盘）', () => {
    expect(applyTemplate(tpl('# T\n\n{{cursor}}'))).toBe('# T\n\n')
    // 多个标记全部剥除
    expect(applyTemplate(tpl('{{cursor}}A{{cursor}}B'))).toBe('AB')
  })

  it('applyTemplateWithCursor 返回首个标记的偏移并剥除全部标记', () => {
    const { content, cursorOffset } = applyTemplateWithCursor(tpl('# {{title}}\n\n{{cursor}}\n\n正文'), { title: 'X' })
    expect(content).toBe('# X\n\n\n\n正文')
    expect(cursorOffset).toBe('# X\n\n'.length)
  })

  it('未声明 {{cursor}} 时 cursorOffset 为 null', () => {
    const { content, cursorOffset } = applyTemplateWithCursor(tpl('纯文本 {{date:YYYY}}'))
    expect(content).toBe('纯文本 2026')
    expect(cursorOffset).toBeNull()
  })

  it('{{cursor}} 不被其他变量替换规则误伤', () => {
    // {{cursor}} 内含 {{...}} 形态，须原样穿透 substitute
    const { cursorOffset } = applyTemplateWithCursor(tpl('{{cursor}}'), { title: 'T' })
    expect(cursorOffset).toBe(0)
  })
})
