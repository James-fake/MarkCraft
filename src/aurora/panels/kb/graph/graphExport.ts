/**
 * 知识图谱 · 导出（PNG / SVG / JSON）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出：纯函数，无 React 依赖。
 * 调用方传 svg 引用与当前可见集合；toast 回调由面板注入。
 */
import type { GEdge, GNode } from './graphModel'

/** 导出提示文案（可被调用方以目标语言覆盖） */
export interface GraphExportMessages {
  svgDone: string
  jsonDone: string
  pngDone: string
  failed: string
}

export const DEFAULT_GRAPH_EXPORT_MESSAGES: GraphExportMessages = {
  svgDone: '已导出 SVG',
  jsonDone: '已导出 JSON',
  pngDone: '已导出 PNG',
  failed: '导出失败',
}

const download = (url: string, name: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // blob: URL 用后必须回收，否则对象句柄/内存泄漏（审查 M3-graphExport）；
  // data: URL 无需回收。click 同步触发下载读之后即可安全回收。
  if (url.startsWith('blob:')) {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* 已失效则忽略 */
      }
    }, 0)
  }
}

/** 克隆 SVG 并把 :root 上的 var() 解析为具体值（导出为独立文件后脱离文档，var() 无法解析） */
const serializeGraph = (svg: SVGSVGElement): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  const rootStyle = getComputedStyle(document.documentElement)
  const resolve = (name: string): string => {
    let val = rootStyle.getPropertyValue(name).trim()
    let guard = 0
    while (val.includes('var(') && guard++ < 5) {
      const inner = val.slice(val.indexOf('(') + 1, val.indexOf(')')).trim()
      val = rootStyle.getPropertyValue(inner).trim()
    }
    return val
  }
  style.textContent = `
    .aurora-graph__edge{stroke:${resolve('--mc-graph-edge')};stroke-width:1.3}
    .aurora-graph__edge--tag{stroke:${resolve('--mc-graph-edge-tag')};stroke-dasharray:3 3;opacity:.4}
    .aurora-graph__edge--folder{stroke:${resolve('--mc-graph-edge-folder')};stroke-dasharray:2 3;opacity:.3}
    .aurora-graph__dot--file{fill:${resolve('--mc-graph-file')};stroke:${resolve('--mc-graph-file-stroke')}}
    .aurora-graph__dot--tag{fill:${resolve('--mc-graph-tag')};stroke:${resolve('--mc-graph-tag-stroke')}}
    .aurora-graph__dot--folder{fill:${resolve('--mc-graph-folder')};stroke:${resolve('--mc-graph-folder-stroke')}}
    .aurora-graph__dot--orphan{fill:${resolve('--mc-graph-orphan')};stroke:${resolve('--mc-graph-orphan-stroke')}}
    .aurora-graph__dot--current{fill:${resolve('--mc-accent')};stroke:${resolve('--mc-graph-current-stroke')}}
    .aurora-graph__label{fill:${resolve('--mc-text-secondary')};font-size:11px;text-anchor:middle}`
  clone.insertBefore(style, clone.firstChild)
  return new XMLSerializer().serializeToString(clone)
}

export const exportSVG = (
  svg: SVGSVGElement,
  toast?: (msg: string) => void,
  messages: GraphExportMessages = DEFAULT_GRAPH_EXPORT_MESSAGES,
) => {
  const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializeGraph(svg))
  download(data, 'knowledge-graph.svg')
  toast?.(messages.svgDone)
}

export const exportJSON = (
  nodes: GNode[],
  edges: GEdge[],
  visibleIds: Set<string>,
  toast?: (msg: string) => void,
  messages: GraphExportMessages = DEFAULT_GRAPH_EXPORT_MESSAGES,
) => {
  const data = {
    nodes: nodes.filter((n) => visibleIds.has(n.id)).map((n) => ({ id: n.id, label: n.label, type: n.type, tags: n.tags })),
    edges: edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
  }
  download(
    URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
    'knowledge-graph.json',
  )
  toast?.(messages.jsonDone)
}

export const exportPNG = (
  svg: SVGSVGElement,
  toast?: (msg: string) => void,
  messages: GraphExportMessages = DEFAULT_GRAPH_EXPORT_MESSAGES,
) => {
  try {
    const xml = serializeGraph(svg)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = svg.clientWidth || 1200
      c.height = svg.clientHeight || 800
      const ctx = c.getContext('2d')!
      // P2-1 背景主题化：读内容区背景变量（亮/暗主题自适应），替代原硬编码 #0A0B0F
      const rootStyle = getComputedStyle(document.documentElement)
      const bg = rootStyle.getPropertyValue('--mc-bg-content').trim() || '#101218'
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => {
        if (b) download(URL.createObjectURL(b), 'knowledge-graph.png')
      })
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    toast?.(messages.pngDone)
  } catch {
    toast?.(messages.failed)
  }
}
