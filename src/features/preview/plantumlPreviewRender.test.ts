import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { encodeDiagramCode, decodeDiagramCode } from '@core/markdown/diagramCodec'
import {
  renderPlantUmlInDom,
  buildPlantUmlUrl,
  ensurePlantUmlWrapper,
} from '@features/editor/extensions/plantumlEncoder'

/**
 * 回归锁（2026-10-11 用户报障）：PlantUML 在所见即所得/源码模式正常，**预览窗格一直转圈**。
 *
 * 根因与 mermaid/mindmap 那次**完全同类**（两条管线不一致）：
 *   产出端 `hooks/useMarkdownRenderer.ts` 只把 ```plantuml 代码块换成占位
 *     `<div class="plantuml-diagram plantuml-loading" data-code="<base64>">`
 *   而全仓唯一的渲染器是 Tiptap 的 PlantUmlBlockView（**节点视图**）——
 *   预览没有 Tiptap 实例 → 没有任何组件认领占位 → loading 永远不消失。
 *
 * 佐证「设计上本该有渲染器」：`styles/mermaid.css` 里**早已定义** `.plantuml-rendered` /
 * `.plantuml-failed` / `.plantuml-fallback` 一整套状态类，却没有任何代码去加它们。
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')
const LABELS = { noEndpoint: '端点未配置', renderFailed: '渲染失败' }
const CODE = '@startuml\nAlice -> Bob: 你好\n@enduml'

/** 造一个与 useMarkdownRenderer 产出**同形**的占位 */
const makePlaceholder = (code: string): HTMLDivElement => {
  const container = document.createElement('div')
  const el = document.createElement('div')
  el.className = 'plantuml-diagram plantuml-loading'
  el.dataset.code = encodeDiagramCode(code)
  container.appendChild(el)
  return container
}

describe('预览窗格的 PlantUML 渲染（回归锁）', () => {
  const preview = read('src/features/preview/Preview.tsx')
  const producer = read('src/hooks/useMarkdownRenderer.ts')
  const renderer = read('src/features/editor/extensions/plantumlEncoder.ts')

  it('两端必须对上：产出占位的一端与渲染占位的一端都要在', () => {
    expect(producer, '预览管线应产出 plantuml 占位').toContain('plantuml-diagram plantuml-loading')
    expect(producer, '占位需带 data-code 供渲染器解码').toMatch(/plantuml-diagram[^`]*data-code=/)
    expect(renderer, '必须存在 DOM 渲染器').toContain('export function renderPlantUmlInDom')
    expect(renderer, '选择器必须匹配占位').toContain('${PLANTUML_DIAGRAM_CLASS}[data-code]')
  })

  it('Preview 必须真的调用渲染器并传入端点（函数存在但没人调用 = 还是转圈）', () => {
    expect(preview, '预览渲染后必须调用').toContain('renderPlantUmlInDom(')
    expect(preview, '必须传端点，否则永远降级成源码').toMatch(
      /renderPlantUmlInDom\(host,\s*settings\.plantumlEndpoint/,
    )
    expect(preview, '端点变化必须触发重渲染').toContain('settings.plantumlEndpoint]')
  })

  it('渲染完必须置 data-rendered，且 morphdom 保留时要比对 data-code', () => {
    expect(renderer, '渲染完要打标记，morphdom 才认').toContain("el.dataset.rendered = 'true'")
    expect(preview, '保留逻辑必须覆盖 plantuml').toContain("fromEl.classList.contains('plantuml-diagram')")
    expect(preview, '保留逻辑必须比对 data-code').toContain('fromEl.dataset.code === toEl.dataset.code')
  })

  it('渲染产物不能被当成「笔记里的图片」包上删除按钮（否则删除会删错图）', () => {
    expect(preview, '必须跳过图表容器内的 img').toContain(
      "imgEl.closest('.plantuml-diagram, .mermaid-diagram')",
    )
  })

  it('端点为空 → 立即降级为可读源码（绝不能一直转圈）', () => {
    const container = makePlaceholder(CODE)
    renderPlantUmlInDom(container, '', LABELS)

    const el = container.querySelector('.plantuml-diagram') as HTMLElement
    expect(el.dataset.rendered, '必须打上已渲染标记').toBe('true')
    expect(el.classList.contains('plantuml-loading'), 'loading 必须摘掉').toBe(false)
    expect(el.classList.contains('plantuml-failed'), '走降级样式').toBe(true)
    expect(el.textContent, '源码必须可见（绝不吞掉用户内容）').toContain('Alice -> Bob: 你好')
    expect(el.textContent).toContain('端点未配置')
    expect(container.querySelector('img'), '端点为空时不该产生 img').toBeNull()
  })

  it('端点可用 → 生成指向 PlantUML SVG 的 <img>（而不是停在下拉转圈）', () => {
    const container = makePlaceholder(CODE)
    renderPlantUmlInDom(container, 'https://www.plantuml.com/plantuml/svg', LABELS)

    const img = container.querySelector('.plantuml-diagram img') as HTMLImageElement
    expect(img, '必须生成 img').toBeTruthy()
    expect(img.getAttribute('src')).toContain('/plantuml/svg/')
    // 占位里的 spinner 文案必须已被替换掉
    expect(container.textContent).not.toContain('Rendering...')
  })

  it('已渲染（data-rendered=true）的图不重复渲染 —— 否则每次更新都会闪一次', () => {
    const container = makePlaceholder(CODE)
    const el = container.querySelector('.plantuml-diagram') as HTMLElement
    el.dataset.rendered = 'true'
    el.textContent = '已渲染的产物'

    renderPlantUmlInDom(container, 'https://www.plantuml.com/plantuml/svg', LABELS)

    expect(el.textContent, '已渲染内容必须原样保留').toBe('已渲染的产物')
  })

  it('data-code 损坏时降级，不抛错', () => {
    const container = document.createElement('div')
    container.innerHTML = '<div class="plantuml-diagram plantuml-loading" data-code="不是base64"></div>'
    expect(() =>
      renderPlantUmlInDom(container, 'https://www.plantuml.com/plantuml/svg', LABELS),
    ).not.toThrow()
    const el = container.querySelector('.plantuml-diagram') as HTMLElement
    expect(el.dataset.rendered).toBe('true')
  })

  it('base64(UTF-8) 往返：中文 / 换行 / 注释标记都不能失真', () => {
    const samples = [
      CODE,
      "@startuml\n' 中文注释\nAlice -> 张三 : 消息\n@enduml",
      '@startuml\n!theme plain\nnote right: 多行\n备注\n@enduml',
    ]
    for (const code of samples) {
      expect(decodeDiagramCode(encodeDiagramCode(code))).toBe(code)
    }
  })

  it('URL 构造与包裹补全（渲染器的输入前提）', () => {
    expect(buildPlantUmlUrl(CODE, ''), '端点为空必须返回 null 以触发降级').toBeNull()
    expect(buildPlantUmlUrl('', 'https://a/b'), '空源码不该出 URL').toBeNull()
    expect(
      buildPlantUmlUrl(CODE, 'https://a/b/'),
      '端点尾斜杠要被规范化（否则拼出 //）',
    ).toBe(buildPlantUmlUrl(CODE, 'https://a/b'))
    expect(ensurePlantUmlWrapper('Alice -> Bob'), '缺包裹要补').toContain('@startuml')
    expect(ensurePlantUmlWrapper(CODE), '已有包裹不该重复加').toBe(CODE)
  })
})
