import { describe, it, expect } from 'vitest'
import { minifyCss } from './cssMinifier'

describe('cssMinifier —— 受保护片段（字符串 / url()）不被压缩改坏', () => {
  it('content 字符串内的冒号+空格不被吃掉（原实现会变成 content:"a:b"）', () => {
    expect(minifyCss('a { content: "a: b"; }')).toBe('a{content:"a: b"}')
  })

  it('url(data:…) 内容原样保留', () => {
    const css = 'i { background: url(data:image/png;base64,AAA=); }'
    expect(minifyCss(css)).toBe('i{background:url(data:image/png;base64,AAA=)}')
  })

  it('字符串内的 0px 不被压缩为 0', () => {
    expect(minifyCss('a { content: "0px"; }')).toBe('a{content:"0px"}')
  })

  it('单引号字符串同样受保护', () => {
    expect(minifyCss("a { content: 'x  :  y'; }")).toBe("a{content:'x  :  y'}")
  })

  it('基础压缩仍然生效（去注释、去空白、0px→0）', () => {
    expect(minifyCss('/* hi */ a { color : red ; margin : 0px ; }')).toBe(
      'a{color:red;margin:0}',
    )
  })

  it('空输入原样返回', () => {
    expect(minifyCss('')).toBe('')
    expect(minifyCss('   ')).toBe('   ')
  })
})
