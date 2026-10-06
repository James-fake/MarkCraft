import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_ACCEPT,
  getExtension,
  isSupportedFile,
  stripExtension,
  importFileToMarkdown,
} from '../importFile'

describe('importFile（统一导入入口）', () => {
  it('SUPPORTED_ACCEPT 覆盖与「打开文件」一致的 6 种格式', () => {
    expect(SUPPORTED_ACCEPT).toBe('.md,.markdown,.txt,.docx,.html,.htm')
  })

  it('getExtension 取小写扩展名', () => {
    expect(getExtension('A.MD')).toBe('md')
    expect(getExtension('无扩展名')).toBe('')
  })

  it('isSupportedFile 命中白名单', () => {
    expect(isSupportedFile('a.docx')).toBe(true)
    expect(isSupportedFile('a.HTML')).toBe(true)
    expect(isSupportedFile('a.png')).toBe(false)
  })

  it('stripExtension 去扩展名', () => {
    expect(stripExtension('季度报告.docx')).toBe('季度报告')
  })

  it('txt 直接读取文本', async () => {
    const f = { name: 'a.txt', text: async () => 'hello' } as unknown as File
    await expect(importFileToMarkdown(f)).resolves.toEqual({ baseName: 'a', content: 'hello' })
  })

  it('不支持格式抛错', async () => {
    const f = { name: 'a.png', text: async () => 'x' } as unknown as File
    await expect(importFileToMarkdown(f)).rejects.toThrow('不支持的格式')
  })
})
