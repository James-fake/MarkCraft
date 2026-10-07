import type { MindmapNode } from './MindmapParser'
import { logger } from '../../../../utils/logger'

export interface NodePosition {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
  color: string
  element: Element
}

/** Flatten a mindmap node tree into a list (depth-first) */
function flattenNodes(node: MindmapNode): MindmapNode[] {
  const result: MindmapNode[] = [node]
  for (const child of node.children) {
    result.push(...flattenNodes(child))
  }
  return result
}

/**
 * Locate mindmap nodes in the rendered SVG.
 *
 * Mermaid mindmap (v10+) renders nodes using <foreignObject> with HTML content,
 * NOT SVG <text> elements. The structure looks like:
 *
 *   <g class="mindmap-node default">
 *     <g><rect .../></g>          <!-- shape -->
 *     <g>
 *       <foreignObject ...>
 *         <div><span>Node Text</span></div>
 *       </foreignObject>
 *     </g>
 *   </g>
 *
 * We find nodes by looking for <foreignObject> elements (mindmap)
 * or <text> elements (other diagrams), then match text content to parsed nodes.
 */
export function locateMindmapNodes(
  svgContainer: HTMLElement,
  root: MindmapNode
): NodePosition[] {
  const svg = svgContainer.querySelector('svg')
  if (!svg) return []

  const containerRect = svgContainer.getBoundingClientRect()
  const flatNodes = flattenNodes(root)

  // Collect all text-bearing elements from the SVG
  // Mermaid mindmap uses <foreignObject> with HTML inside
  const textEntries: { element: Element; text: string }[] = []

  // Strategy A: Find <foreignObject> elements (Mermaid mindmap v10+)
  const foreignObjects = svg.querySelectorAll('foreignObject')
  for (const fo of foreignObjects) {
    // Get text from HTML content inside foreignObject
    const htmlText = fo.textContent?.trim() || ''
    if (htmlText) {
      textEntries.push({ element: fo, text: htmlText })
    }
  }

  // Strategy B: Find <text> elements (fallback for other diagram types)
  if (textEntries.length === 0) {
    const textEls = svg.querySelectorAll('text')
    for (const el of textEls) {
      const t = el.textContent?.trim() || ''
      if (t) {
        textEntries.push({ element: el, text: t })
      }
    }
  }

  // Strategy C: Find elements with class containing "node" or "mindmap-node"
  if (textEntries.length === 0) {
    const nodeGroups = svg.querySelectorAll('g[class*="node"], g[class*="mindmap"]')
    for (const g of nodeGroups) {
      const t = g.textContent?.trim() || ''
      if (t) {
        textEntries.push({ element: g, text: t })
      }
    }
  }

  logger.info('[MindmapLocator] textEntries found:', textEntries.length,
    'texts:', textEntries.map(e => e.text.slice(0, 30)),
    'parsed nodes:', flatNodes.map(n => n.text))

  if (textEntries.length === 0) return []

  const positions: NodePosition[] = []
  const matchedNodeIds = new Set<string>()

  // Match text entries to parsed nodes
  for (const entry of textEntries) {
    const normalizedContent = normalizeText(entry.text)
    let matchedNode: MindmapNode | null = null

    // Try exact match
    for (const node of flatNodes) {
      if (matchedNodeIds.has(node.id)) continue
      if (normalizeText(node.text) === normalizedContent) {
        matchedNode = node
        break
      }
    }

    // Try substring match
    if (!matchedNode) {
      for (const node of flatNodes) {
        if (matchedNodeIds.has(node.id)) continue
        const n = normalizeText(node.text)
        if (normalizedContent.includes(n) || n.includes(normalizedContent)) {
          matchedNode = node
          break
        }
      }
    }

    if (!matchedNode) continue
    matchedNodeIds.add(matchedNode.id)

    const pos = getPositionFromElement(entry.element, containerRect)
    if (pos) {
      positions.push({ nodeId: matchedNode.id, ...pos })
    }
  }

  // Order-based fallback
  if (positions.length === 0 && textEntries.length > 0) {
    logger.info('[MindmapLocator] Text matching failed, using order-based matching')
    const count = Math.min(textEntries.length, flatNodes.length)
    for (let i = 0; i < count; i++) {
      const pos = getPositionFromElement(textEntries[i].element, containerRect)
      if (pos) {
        positions.push({ nodeId: flatNodes[i].id, ...pos })
      }
    }
  }

  logger.info('[MindmapLocator] positions found:', positions.length)
  return positions
}

/** Get position and color from an element, walking up to find the enclosing <g> if needed */
function getPositionFromElement(
  el: Element,
  containerRect: DOMRect
): { x: number; y: number; width: number; height: number; color: string; element: Element } | null {
  // For foreignObject, use it directly for positioning
  // For text elements, walk up to the enclosing <g>
  let target: Element = el

  if (el.tagName.toLowerCase() === 'foreignobject') {
    // foreignObject is the right level for positioning
    // But check if its parent <g> is larger (contains the shape too)
    const parentG = el.closest('g')?.parentElement?.closest('g')
    if (parentG) {
      const foRect = el.getBoundingClientRect()
      const gRect = parentG.getBoundingClientRect()
      // Use the larger one (the <g> that contains both shape and text)
      if (gRect.width >= foRect.width * 0.8) {
        target = parentG
      }
    }
  } else {
    // For <text>, walk up to the enclosing <g>
    const g = el.closest('g')
    if (g) target = g
  }

  const rect = target.getBoundingClientRect()
  if (rect.width < 5 || rect.height < 5) return null

  // Extract text color from the element
  const color = getTextColor(el)

  return {
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    width: rect.width,
    height: rect.height,
    color,
    element: target,
  }
}

/** Extract text color from an SVG element, checking fill/style/computed style */
function getTextColor(el: Element): string {
  // For foreignObject, get color from the inner HTML element
  if (el.tagName.toLowerCase() === 'foreignobject') {
    const inner = el.querySelector('span, div, p')
    if (inner) {
      const cs = getComputedStyle(inner)
      if (cs.color && cs.color !== '') return cs.color
    }
  }
  // Check SVG fill attribute
  const fill = el.getAttribute('fill')
  if (fill && fill !== 'none') return fill
  // Check parent elements for fill
  let parent: Element | null = el
  for (let i = 0; i < 5 && parent; i++) {
    const pFill = parent.getAttribute('fill')
    if (pFill && pFill !== 'none') return pFill
    parent = parent.parentElement
  }
  // Fallback: use computed color
  const cs = getComputedStyle(el)
  if (cs.color) return cs.color
  return '#333333'
}

/** Normalize text for fuzzy matching */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function findNodePosition(positions: NodePosition[], nodeId: string): NodePosition | undefined {
  return positions.find(p => p.nodeId === nodeId)
}
