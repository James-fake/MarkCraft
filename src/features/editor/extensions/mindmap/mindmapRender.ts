import { parseMindmapCode } from './MindmapParser'
import { computeLayout } from './mindmapLayout'
import { getDepthColor, MINDMAP_FONT_FAMILY, MINDMAP_FONT_SIZE } from './mindmapTheme'
import { extractLayout } from '@features/editor/toolbar/mindmapUtils'

/**
 * 思维导图 → **纯 SVG 字符串**渲染器（无 React）。
 *
 * 目的：让**预览**与**所见即所得**用同一套渲染 —— 编辑器是交互式 `MindmapCanvas`，
 * 预览没有 Tiptap、原本只能交给 mermaid，导致两边配色/形状/字体/布局全不一样。
 * 本模块复用 `computeLayout`（布局）+ `mindmapTheme`（配色/字体）+ 同一套形状几何，
 * 只把「画」这一步换成字符串拼接，故**所见即所得 = 预览**。
 *
 * 安全：所有文字都经 `escapeXml` 转义、属性全部由本模块生成，故无需再过 DOMPurify。
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SHADOW_ID = 'mc-mindmap-shadow'

/** 把 mindmap 代码渲染成 SVG 字符串；无法解析出根节点时返回 null。 */
export function renderMindmapSvgString(code: string): string | null {
  const { root } = parseMindmapCode(code)
  if (!root) return null

  const direction = extractLayout(code)
  const { nodes, width, height } = computeLayout(root, direction)
  if (nodes.length === 0) return null

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="mc-mindmap-svg">`,
  )
  parts.push(
    `<defs><filter id="${SHADOW_ID}" x="-10%" y="-10%" width="120%" height="130%">` +
      `<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/></filter></defs>`,
  )

  // 连线（与 MindmapCanvas 的 connections 同算法）
  for (const node of nodes) {
    if (!node.parentId) continue
    const parent = nodes.find((n) => n.id === node.parentId)
    if (!parent) continue
    const color = getDepthColor(parent.depth)

    let d: string
    if (direction === 'down') {
      const x1 = parent.x
      const y1 = parent.y + parent.height / 2
      const x2 = node.x
      const y2 = node.y - node.height / 2
      const midY = (y1 + y2) / 2
      d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
    } else {
      const isLeft = node.x < parent.x
      const x1 = isLeft ? parent.x - parent.width / 2 : parent.x + parent.width / 2
      const y1 = parent.y
      const x2 = isLeft ? node.x + node.width / 2 : node.x - node.width / 2
      const y2 = node.y
      const dx = isLeft ? -30 : 30
      d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
    }
    parts.push(`<path d="${d}" fill="none" stroke="${color.border}" stroke-width="2" opacity="0.3"/>`)
  }

  // 节点（形状与 MindmapCanvas 一致）
  for (const node of nodes) {
    const color = getDepthColor(node.depth)
    const shape = node.shape
    const isCircleLike = shape === 'circle' || shape === 'bang'
    const renderW = isCircleLike ? Math.max(node.width, node.height) : node.width
    const renderH = isCircleLike ? renderW : node.height
    const rnx = node.x - renderW / 2
    const rny = node.y - renderH / 2
    const common = `fill="${color.bg}" stroke="${color.border}" stroke-width="1.5" filter="url(#${SHADOW_ID})"`

    let shapeEl: string
    if (shape === 'circle') {
      shapeEl = `<ellipse cx="${node.x}" cy="${node.y}" rx="${renderW / 2}" ry="${renderH / 2}" ${common}/>`
    } else if (shape === 'bang') {
      shapeEl = `<ellipse cx="${node.x}" cy="${node.y}" rx="${renderW / 2}" ry="${renderH / 2}" ${common} stroke-dasharray="4 2"/>`
    } else if (shape === 'square') {
      shapeEl = `<rect x="${rnx}" y="${rny}" width="${renderW}" height="${renderH}" ${common}/>`
    } else if (shape === 'cloud') {
      shapeEl = `<ellipse cx="${node.x}" cy="${node.y}" rx="${renderW / 2}" ry="${renderH / 2}" ${common} stroke-dasharray="6 3"/>`
    } else if (shape === 'hexagon') {
      const pts =
        `${node.x - renderW / 2 + 12},${rny} ` +
        `${node.x + renderW / 2 - 12},${rny} ` +
        `${node.x + renderW / 2},${node.y} ` +
        `${node.x + renderW / 2 - 12},${rny + renderH} ` +
        `${node.x - renderW / 2 + 12},${rny + renderH} ` +
        `${node.x - renderW / 2},${node.y}`
      shapeEl = `<polygon points="${pts}" ${common}/>`
    } else {
      shapeEl = `<rect x="${rnx}" y="${rny}" width="${renderW}" height="${renderH}" rx="8" ry="8" ${common}/>`
    }

    parts.push(
      `<g>${shapeEl}` +
        `<text x="${node.x}" y="${node.y}" text-anchor="middle" dominant-baseline="central" ` +
        `fill="${color.text}" font-size="${MINDMAP_FONT_SIZE}" font-family="${MINDMAP_FONT_FAMILY}" ` +
        `style="pointer-events:none;user-select:none">${escapeXml(node.text)}</text></g>`,
    )
  }

  parts.push('</svg>')
  return parts.join('')
}
