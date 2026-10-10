import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decodeDiagramCode } from '@features/editor/extensions/mermaidCache'

/**
 * 回归锁（2026-10-11 用户报障）：**思维导图在所见即所得/源码模式正常，预览窗格一直转圈**。
 *
 * 根因：预览管线（`useMarkdownRenderer`）只把 ```mermaid/```mindmap 代码块换成
 * `<div class="mermaid-diagram mermaid-loading" data-code="...">` 占位，
 * 而全仓**唯一的渲染器是 Tiptap 的 MermaidBlockView（节点视图）** —— 预览没有 Tiptap，
 * 没有任何组件认领这个占位 → loading 永远不消失。
 * （`Preview.tsx` 里「保留 data-rendered=true 的图表」的注释说明设计上本来就该有这个渲染器。）
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')

describe('预览窗格的 mermaid/mindmap 渲染（回归锁）', () => {
  const preview = read('src/features/preview/Preview.tsx')
  const cache = read('src/features/editor/extensions/mermaidCache.ts')
  const renderer = read('src/hooks/useMarkdownRenderer.ts')

  it('两端必须对上：产出占位的一端与渲染占位的一端都要在', () => {
    // 产出端：预览管线把代码块换成 .mermaid-diagram[data-code]
    expect(renderer, '预览管线应产出 mermaid 占位').toContain('mermaid-diagram mermaid-loading')
    expect(renderer, '占位需带 data-code 供渲染器解码').toContain('data-code=')
    // 渲染端
    expect(cache, '必须存在 DOM 渲染器').toContain('export async function renderMermaidInDom')
    expect(cache, '选择器必须匹配占位').toContain(".mermaid-diagram[data-code]")
  })

  it('Preview 必须真的调用渲染器（函数存在但没人调用 = 还是转圈）', () => {
    expect(preview, '预览渲染后必须调用').toContain('renderMermaidInDom(')
    expect(preview, '必须传入主题（决定 mermaid 配色）').toMatch(/renderMermaidInDom\(host,\s*theme/)
  })

  it('渲染完必须置 data-rendered，且 morphdom 保留时要比对 data-code', () => {
    expect(cache, '渲染完要打标记，morphdom 才认').toContain("el.dataset.rendered = 'true'")
    expect(preview, '保留逻辑必须比对 data-code').toContain('fromEl.dataset.code === toEl.dataset.code')
  })

  it('data-code 是 base64(UTF-8)，解码往返不能失真（中文/换行都要对）', () => {
    const samples = [
      'mindmap\n  root((中心))\n    分支A\n    分支B',
      'graph TD\n  A[开始] --> B{判断}\n  B -->|是| C[结束]',
      'mindmap\n  root\n    %% direction: LR %%\n    甲\n    乙',
    ]
    for (const code of samples) {
      // 与 useMarkdownRenderer 的编码方式一致
      const encoded = btoa(unescape(encodeURIComponent(code)))
      expect(decodeDiagramCode(encoded), '往返必须逐字一致').toBe(code)
    }
  })

  it('坏数据不能让渲染器抛错（防御）', () => {
    expect(decodeDiagramCode('这不是 base64')).toBe('')
    expect(decodeDiagramCode('')).toBe('')
  })
})
