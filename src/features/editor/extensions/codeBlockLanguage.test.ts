import { describe, it, expect } from 'vitest'
import { LANGUAGES, LANGUAGE_ALIASES, normalizeCodeLanguage } from './codeBlockLanguage'

/**
 * 回归锁（2026-11-03）：```js / ```ts / ```py 这类短别名在高亮里一直是好的
 * （lowlight 认识别名），但 CodeBlockView 的语言下拉查不到 value → 显示 "Custom..."。
 */
describe('代码块语言 · 短别名归一化', () => {
  it('高频短别名映射到规范值', () => {
    expect(normalizeCodeLanguage('js')).toBe('javascript')
    expect(normalizeCodeLanguage('ts')).toBe('typescript')
    expect(normalizeCodeLanguage('py')).toBe('python')
    expect(normalizeCodeLanguage('sh')).toBe('bash')
    expect(normalizeCodeLanguage('yml')).toBe('yaml')
  })

  it('大小写不敏感（```JS / ```Py 同样命中）', () => {
    expect(normalizeCodeLanguage('JS')).toBe('javascript')
    expect(normalizeCodeLanguage('Py')).toBe('python')
  })

  it('全名与未知语言原样返回 —— 未知值保留 Custom 语义', () => {
    expect(normalizeCodeLanguage('javascript')).toBe('javascript')
    expect(normalizeCodeLanguage('go')).toBe('go')
    expect(normalizeCodeLanguage('mylang')).toBe('mylang')
    expect(normalizeCodeLanguage('')).toBe('')
  })

  it('防漂移：每个别名的目标值都必须是下拉选项表里存在的 value', () => {
    const values = new Set(LANGUAGES.map((l) => l.value))
    for (const [alias, target] of Object.entries(LANGUAGE_ALIASES)) {
      expect(values.has(target), `别名 ${alias} 的目标 ${target} 不在 LANGUAGES 里`).toBe(true)
    }
  })

  it('防漂移：LANGUAGES 的 value 无重复（AuroraSelect 按 value 匹配）', () => {
    const values = LANGUAGES.map((l) => l.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
