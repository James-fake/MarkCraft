import { describe, it, expect } from 'vitest'
import { lintMarkdown, fixIssue } from '../markdownLinter'

describe('markdownLinter - 列表标记检测', () => {
  it('真正的列表标记缺少空格时应报警告', () => {
    const issues = lintMarkdown('-hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(1)
    expect(listIssues[0].line).toBe(0)
  })

  it('正确的列表标记不报警告', () => {
    const issues = lintMarkdown('- hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('**加粗标记**不应被误报为列表标记', () => {
    const issues = lintMarkdown('**hello**')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('行首 ** 加粗不应被误报', () => {
    const issues = lintMarkdown('**加粗文本** 后续内容')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('*斜体标记*不应被误报为列表标记', () => {
    const issues = lintMarkdown('*斜体文本*')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('***加粗斜体***不应被误报', () => {
    const issues = lintMarkdown('***加粗斜体***')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('__加粗替代标记__不应被误报', () => {
    const issues = lintMarkdown('__加粗文本__')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('+ 列表标记缺少空格应报警告', () => {
    const issues = lintMarkdown('+hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(1)
  })

  it('缩进后的 * 列表标记缺少空格应报警告', () => {
    const issues = lintMarkdown('  *hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(1)
  })

  it('- 列表标记后有空格不报警告', () => {
    const issues = lintMarkdown('- hello world')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('有序列表标记缺少空格应报警告', () => {
    const issues = lintMarkdown('1.hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterOrderedList')
    expect(listIssues.length).toBe(1)
  })

  it('有序列表标记后有空格不报警告', () => {
    const issues = lintMarkdown('1. hello')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterOrderedList')
    expect(listIssues.length).toBe(0)
  })
})

describe('markdownLinter - fixIssue 修复', () => {
  it('修复真正的列表标记缺少空格', () => {
    const text = '-hello'
    const issues = lintMarkdown(text)
    const listIssue = issues.find(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssue).toBeDefined()
    const fixed = fixIssue(text, listIssue!)
    expect(fixed).toBe('- hello')
  })

  it('修复有序列表标记缺少空格', () => {
    const text = '1.hello'
    const issues = lintMarkdown(text)
    const listIssue = issues.find(i => i.issueType === 'missingSpaceAfterOrderedList')
    expect(listIssue).toBeDefined()
    const fixed = fixIssue(text, listIssue!)
    expect(fixed).toBe('1. hello')
  })

  it('加粗文本不应产生可修复的列表问题', () => {
    const text = '**加粗文本**'
    const issues = lintMarkdown(text)
    const listIssue = issues.find(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssue).toBeUndefined()
  })

  it('修复缩进列表标记缺少空格', () => {
    const text = '  -hello'
    const issues = lintMarkdown(text)
    const listIssue = issues.find(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssue).toBeDefined()
    const fixed = fixIssue(text, listIssue!)
    expect(fixed).toBe('  - hello')
  })
})

describe('markdownLinter - 综合场景', () => {
  it('列表项中的加粗文本不应报警告', () => {
    const text = '- **加粗** 普通文本'
    const issues = lintMarkdown(text)
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('多行文档中加粗和列表共存', () => {
    const text = '**标题**\n\n- 列表项1\n- **加粗列表项**\n\n普通 **加粗** 文本'
    const issues = lintMarkdown(text)
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })

  it('行首 -- 不应被误报（水平线）', () => {
    const issues = lintMarkdown('--')
    const listIssues = issues.filter(i => i.issueType === 'missingSpaceAfterListMarker')
    expect(listIssues.length).toBe(0)
  })
})
