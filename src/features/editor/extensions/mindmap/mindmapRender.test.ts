import { describe, it, expect } from 'vitest'
import { renderMindmapSvgString } from './mindmapRender'
import { isMindmapCode } from './MindmapParser'

/**
 * 回归锁（2026-10-11）：预览的思维导图原本交给 mermaid，配色/形状/字体/布局都与
 * 编辑器画布（MindmapCanvas）不同。现预览改用本模块（与画布共享 computeLayout +
 * mindmapTheme），保证「所见即所得 = 预览」。
 */
describe('renderMindmapSvgString（预览与编辑器共用自研渲染器）', () => {
  it('渲染节点文字、形状与连线', () => {
    const svg = renderMindmapSvgString('mindmap\n  root((中心主题))\n    子主题A\n    子主题B')
    expect(svg).toBeTruthy()
    expect(svg).toContain('<svg')
    expect(svg).toContain('中心主题')
    expect(svg).toContain('子主题A')
    expect(svg).toContain('<text')
    expect(svg, '连线').toContain('<path')
  })

  it('各形状都能渲染（方/圆/云/六边形/爆炸）', () => {
    // mermaid mindmap 的形状语法：括号即节点内容，如 ((圆)) / )云( / {{六}} / ))爆((
    const svg = renderMindmapSvgString('mindmap\n  root[方]\n    ((圆))\n    )云(\n    {{六}}\n    ))爆((')
    expect(svg).toBeTruthy()
    expect(svg, '方形').toContain('<rect')
    expect(svg, '圆/云/爆炸').toContain('<ellipse')
    expect(svg, '六边形').toContain('<polygon')
  })

  it('转义节点文字里的 XML（防注入）', () => {
    const svg = renderMindmapSvgString('mindmap\n  root((<script>alert(1)</script>))')
    expect(svg).toBeTruthy()
    expect(svg!.includes('<script>')).toBe(false)
    expect(svg).toContain('&lt;script&gt;')
  })

  it('空内容返回 null（渲染器防御）', () => {
    expect(renderMindmapSvgString('')).toBeNull()
  })

  it('与 isMindmapCode 判据配合：非 mindmap 不会被误渲染', () => {
    // 预览侧先判 isMindmapCode 再调用，故 flowchart 不会走到这里
    expect(isMindmapCode('graph TD\n  A-->B')).toBe(false)
    expect(isMindmapCode('mindmap\n  root((x))')).toBe(true)
  })
})
