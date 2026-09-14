import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMarkdownRenderer } from '../useMarkdownRenderer'

const identity = (m: string) => m

describe('useMarkdownRenderer - 预览代码块行号 (G7)', () => {
  it('为预览代码块渲染行号列与行号元素', () => {
    const md = '```js\nconst a = 1\nconst b = 2\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    expect(result.current.renderedHtml).toContain('code-block-lines')
    expect(result.current.renderedHtml).toContain('code-line-no')
  })

  it('行号数量与代码行数一致', () => {
    const lines = ['const a = 1', 'const b = 2', 'const c = 3']
    const md = '```js\n' + lines.join('\n') + '\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    const matches = result.current.renderedHtml.match(/code-line-no/g) || []
    expect(matches.length).toBe(lines.length)
  })

  it('空行也计入行号', () => {
    const md = '```\nline1\n\nline3\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    const matches = result.current.renderedHtml.match(/code-line-no/g) || []
    expect(matches.length).toBe(3)
  })

  it('行号从 1 开始递增', () => {
    const md = '```js\na\nb\nc\nd```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    const nums = [
      ...result.current.renderedHtml.matchAll(/code-line-no">(\d+)</g),
    ].map((m) => Number(m[1]))
    expect(nums).toEqual([1, 2, 3, 4])
  })

  it('长代码块（>10 行）仍带行号列且标记折叠', () => {
    const body = Array.from({ length: 15 }, (_, i) => `const x${i} = ${i}`).join('\n')
    const md = '```js\n' + body + '\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    const html = result.current.renderedHtml
    expect(html).toContain('code-block-lines')
    expect(html).toContain('code-block-collapsed')
    const matches = html.match(/code-line-no/g) || []
    expect(matches.length).toBe(15)
  })
})

describe('useMarkdownRenderer - PlantUML 渲染 (E3)', () => {
  it('识别 plantuml 代码块并生成占位容器 + 设置 hasPlantUml', () => {
    const md = '```plantuml\n@startuml\nA -> B: hi\n@enduml\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    expect(result.current.hasPlantUml).toBe(true)
    expect(result.current.renderedHtml).toContain('plantuml-diagram')
    expect(result.current.renderedHtml).toContain('data-code')
    expect(result.current.renderedHtml).toContain('plantuml-loading')
  })

  it('puml 简写同样被识别', () => {
    const md = '```puml\n@startuml\nA -> B\n@enduml\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    expect(result.current.hasPlantUml).toBe(true)
  })

  it('普通代码块不会误报 plantuml', () => {
    const md = '```js\nconst a = 1\n```'
    const { result } = renderHook(() => useMarkdownRenderer(md, identity))
    expect(result.current.hasPlantUml).toBe(false)
  })
})
