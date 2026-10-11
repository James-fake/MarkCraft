import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MindmapNode } from './MindmapParser'
import { parseMindmapCode, updateNodeText, addChildNode, removeNode } from './MindmapParser'
import { computeLayout, type LayoutNode, type LayoutDirection } from './mindmapLayout'
import { getDepthColor as getColor, MINDMAP_FONT_FAMILY, MINDMAP_FONT_SIZE } from './mindmapTheme'

function flattenNodes(node: MindmapNode): MindmapNode[] {
  const result: MindmapNode[] = [node]
  for (const child of node.children) result.push(...flattenNodes(child))
  return result
}

function serializeTree(root: MindmapNode, configBlock?: string): string {
  const lines: string[] = []
  if (configBlock) lines.push(configBlock)
  lines.push('mindmap')
  function ser(node: MindmapNode, depth: number, isRoot: boolean) {
    const indent = '    '.repeat(depth)
    let content = node.text
    switch (node.shape) {
      case 'circle': content = `((${content}))`; break
      case 'square': content = `[${content}]`; break
      case 'rounded': content = `(${content})`; break
      case 'cloud': content = `)${content}(`; break
      case 'hexagon': content = `{{${content}}}`; break
      case 'bang': content = `))${content}((`; break
    }
    lines.push(`${indent}${isRoot ? 'root' : ''}${content}`)
    for (const child of node.children) ser(child, depth + 1, false)
  }
  ser(root, 1, true)
  return lines.join('\n')
}

// 深度配色 / 字体已下沉 mindmapTheme（编辑器画布与预览共用同一份，改一处两边一起变）

interface MindmapCanvasProps {
  code: string
  onUpdateCode: (code: string) => void
  isEditing: boolean
  onExit: () => void
  initialEditNodeId?: string | null
  onNodeDoubleClick?: (nodeId: string) => void
  direction?: LayoutDirection
}

const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  code,
  onUpdateCode,
  isEditing,
  onExit,
  initialEditNodeId,
  onNodeDoubleClick,
  direction = 'radial',
}) => {
  const [layouts, setLayouts] = useState<LayoutNode[]>([])
  const [editingId, setEditingId] = useState<string | null>(initialEditNodeId ?? null)
  const [editText, setEditText] = useState('')
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [svgSize, setSvgSize] = useState({ width: 400, height: 300 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const layoutsRef = useRef<LayoutNode[]>([])
  layoutsRef.current = layouts

  const parseResult = useMemo(() => parseMindmapCode(code), [code])
  const flatNodes = useMemo(
    () => parseResult.root ? flattenNodes(parseResult.root) : [],
    [parseResult.root]
  )

  // Compute layout when code changes
  useEffect(() => {
    if (parseResult.root) {
      const { nodes, width, height } = computeLayout(parseResult.root, direction)
      setLayouts(nodes)
      setSvgSize({ width, height })
    }
  }, [parseResult.root, direction])

  // Initialize editing from initialEditNodeId
  useEffect(() => {
    if (initialEditNodeId) {
      setEditingId(initialEditNodeId)
      const node = flatNodes.find(n => n.id === initialEditNodeId)
      if (node) setEditText(node.text)
    }
  }, [initialEditNodeId, flatNodes])

  // Focus input when editing
  useEffect(() => {
    if (!editingId) return
    const focusInput = () => {
      const input = document.querySelector(`input[data-canvas-editing-id="${editingId}"]`) as HTMLInputElement | null
      if (input) {
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      }
    }
    focusInput()
    const timers = [setTimeout(focusInput, 50), setTimeout(focusInput, 150)]
    return () => timers.forEach(clearTimeout)
  }, [editingId])

  // Drag handling
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (!isEditing) return
    e.preventDefault()
    e.stopPropagation()
    const node = layouts.find(n => n.id === nodeId)
    if (!node || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = svgSize.width / rect.width
    const scaleY = svgSize.height / rect.height
    setDragging({
      id: nodeId,
      offsetX: (e.clientX - rect.left) * scaleX - node.x,
      offsetY: (e.clientY - rect.top) * scaleY - node.y,
    })
  }, [isEditing, layouts, svgSize])

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = svgSize.width / rect.width
      const scaleY = svgSize.height / rect.height
      let x = (e.clientX - rect.left) * scaleX - dragging.offsetX
      let y = (e.clientY - rect.top) * scaleY - dragging.offsetY
      // Clamp node position so it stays within SVG boundaries
      const dragNode = layoutsRef.current.find(n => n.id === dragging.id)
      if (dragNode) {
        const hw = dragNode.width / 2
        const hh = dragNode.height / 2
        x = Math.max(hw, Math.min(svgSize.width - hw, x))
        y = Math.max(hh, Math.min(svgSize.height - hh, y))
      }
      setLayouts(prev => prev.map(n => n.id === dragging.id ? { ...n, x, y } : n))
    }
    const handleMouseUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, svgSize])

  // Click outside to exit
  useEffect(() => {
    if (!isEditing) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-mindmap-canvas]')) return
      confirmEditRef.current()
      onExit()
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [isEditing, onExit])

  // Edit handlers
  const handleConfirmEdit = useCallback(() => {
    if (editingId && parseResult.root) {
      const newTree = updateNodeText(parseResult.root, editingId, editText)
      onUpdateCode(serializeTree(newTree, parseResult.configBlock))
    }
    setEditingId(null)
  }, [editingId, editText, parseResult.root, parseResult.configBlock, onUpdateCode])

  const confirmEditRef = useRef<() => void>(() => {})
  confirmEditRef.current = handleConfirmEdit

  const handleAddChild = useCallback((nodeId: string) => {
    if (!parseResult.root) return
    const newTree = addChildNode(parseResult.root, nodeId)
    onUpdateCode(serializeTree(newTree, parseResult.configBlock))
  }, [parseResult.root, parseResult.configBlock, onUpdateCode])

  const handleDelete = useCallback((nodeId: string) => {
    if (!parseResult.root) return
    const newTree = removeNode(parseResult.root, nodeId)
    if (!newTree) {
      onUpdateCode('mindmap\n')
    } else {
      onUpdateCode(serializeTree(newTree, parseResult.configBlock))
    }
    setEditingId(null)
  }, [parseResult.root, parseResult.configBlock, onUpdateCode])

  const handleSelect = useCallback((nodeId: string) => {
    if (editingId === nodeId) return
    if (editingId && parseResult.root) {
      const currentNode = flatNodes.find(n => n.id === editingId)
      if (currentNode && editText !== currentNode.text) {
        const newTree = updateNodeText(parseResult.root, editingId, editText)
        onUpdateCode(serializeTree(newTree, parseResult.configBlock))
      }
    }
    setEditingId(nodeId)
    const node = flatNodes.find(n => n.id === nodeId)
    if (node) setEditText(node.text)
  }, [editingId, editText, flatNodes, parseResult.root, parseResult.configBlock, onUpdateCode])

  // Double-click to enter edit mode (from preview)
  const handleDoubleClick = useCallback((nodeId: string) => {
    if (isEditing) {
      setEditingId(nodeId)
      const node = flatNodes.find(n => n.id === nodeId)
      if (node) setEditText(node.text)
    } else {
      onNodeDoubleClick?.(nodeId)
    }
  }, [isEditing, flatNodes, onNodeDoubleClick])

  // Render connections - curves adapted to layout direction
  const connections = layouts.filter(n => n.parentId).map(node => {
    const parent = layouts.find(n => n.id === node.parentId)
    if (!parent) return null
    const color = getColor(parent.depth)

    let path: string
    if (direction === 'down') {
      // Top-down: connect from bottom of parent to top of child
      const x1 = parent.x
      const y1 = parent.y + parent.height / 2
      const x2 = node.x
      const y2 = node.y - node.height / 2
      const midY = (y1 + y2) / 2
      path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
    } else {
      // Radial / right: connect from side of parent to side of child
      const isLeft = node.x < parent.x
      const x1 = isLeft ? parent.x - parent.width / 2 : parent.x + parent.width / 2
      const y1 = parent.y
      const x2 = isLeft ? node.x + node.width / 2 : node.x - node.width / 2
      const y2 = node.y
      const dx = isLeft ? -30 : 30
      path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
    }

    return (
      <path
        key={`conn-${node.id}`}
        d={path}
        fill="none"
        stroke={color.border}
        strokeWidth="2"
        opacity="0.3"
      />
    )
  })

  // Render nodes
  const nodeElements = layouts.map(node => {
    const color = getColor(node.depth)
    const isEditingNode = editingId === node.id
    const isHovered = hoveredId === node.id
    const showButtons = isEditing && isHovered && !isEditingNode
    const shape = node.shape

    // Shape-specific dimensions: circles need equal width/height
    const isCircleLike = shape === 'circle' || shape === 'bang'
    const renderW = isCircleLike ? Math.max(node.width, node.height) : node.width
    const renderH = isCircleLike ? renderW : node.height
    const rnx = node.x - renderW / 2
    const rny = node.y - renderH / 2

    const strokeColor = isEditingNode ? 'var(--mc-accent)' : color.border
    const strokeWidth = isEditingNode ? 2 : 1.5

    return (
      <g
        key={node.id}
        data-node-id={node.id}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Node shape */}
        {shape === 'circle' ? (
          <ellipse
            cx={node.x} cy={node.y}
            rx={renderW / 2} ry={renderH / 2}
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
          />
        ) : shape === 'bang' ? (
          <ellipse
            cx={node.x} cy={node.y}
            rx={renderW / 2} ry={renderH / 2}
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
            strokeDasharray="4 2"
          />
        ) : shape === 'square' ? (
          <rect
            x={rnx} y={rny}
            width={renderW} height={renderH}
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
          />
        ) : shape === 'cloud' ? (
          <ellipse
            cx={node.x} cy={node.y}
            rx={renderW / 2} ry={renderH / 2}
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
            strokeDasharray="6 3"
          />
        ) : shape === 'hexagon' ? (
          <polygon
            points={
              `${node.x - renderW / 2 + 12},${rny} ` +
              `${node.x + renderW / 2 - 12},${rny} ` +
              `${node.x + renderW / 2},${node.y} ` +
              `${node.x + renderW / 2 - 12},${rny + renderH} ` +
              `${node.x - renderW / 2 + 12},${rny + renderH} ` +
              `${node.x - renderW / 2},${node.y}`
            }
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
          />
        ) : (
          /* rounded (default) */
          <rect
            x={rnx} y={rny}
            width={renderW} height={renderH}
            rx="8" ry="8"
            fill={color.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#node-shadow)"
          />
        )}

        {/* Text or edit input */}
        {isEditingNode ? (
          <foreignObject x={rnx} y={rny} width={renderW} height={renderH}>
            <input
              data-canvas-editing-id={node.id}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); handleConfirmEdit() }
                if (e.key === 'Escape') setEditingId(null)
                if (e.key === 'Tab') { e.preventDefault(); handleConfirmEdit(); handleAddChild(node.id) }
              }}
              onBlur={(e) => {
                const related = e.relatedTarget as HTMLElement | null
                if (related && related.closest('[data-mindmap-canvas]')) return
                handleConfirmEdit()
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                fontSize: '13px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                backgroundColor: 'transparent',
                color: color.text,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}
            />
          </foreignObject>
        ) : (
          <text
            x={node.x} y={node.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color.text}
            fontSize={MINDMAP_FONT_SIZE}
            fontFamily={MINDMAP_FONT_FAMILY}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {node.text}
          </text>
        )}

        {/* Drag / click / double-click handle */}
        <rect
          x={rnx} y={rny}
          width={renderW} height={renderH}
          fill="transparent"
          cursor={isEditing ? (dragging?.id === node.id ? 'grabbing' : 'grab') : 'pointer'}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
          onClick={(e) => {
            e.stopPropagation()
            if (isEditing) handleSelect(node.id)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            handleDoubleClick(node.id)
          }}
        />

        {/* + button (add child) */}
        {showButtons && (
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); handleAddChild(node.id) }}
          >
            <circle
              cx={rnx - 10} cy={node.y}
              r="10"
              fill="var(--mc-accent-soft)"
              stroke="var(--mc-accent-soft)"
              strokeWidth="1"
            />
            <text
              x={rnx - 10} y={node.y}
              textAnchor="middle" dominantBaseline="central"
              fill="#fff" fontSize="14" fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >+</text>
          </g>
        )}

        {/* - button (delete) */}
        {showButtons && (
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); handleDelete(node.id) }}
          >
            <circle
              cx={rnx + renderW + 10} cy={node.y}
              r="10"
              fill="rgba(239,68,68,0.9)"
              stroke="rgba(239,68,68,0.5)"
              strokeWidth="1"
            />
            <text
              x={rnx + renderW + 10} y={node.y}
              textAnchor="middle" dominantBaseline="central"
              fill="#fff" fontSize="14" fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >−</text>
          </g>
        )}
      </g>
    )
  })

  return (
    <div
      data-mindmap-canvas="true"
      style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center', padding: '4px 0', minHeight: '60px' }}
    >
      <svg
        ref={svgRef}
        width={svgSize.width}
        height={svgSize.height}
        viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
      >
        <defs>
          <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" />
          </filter>
        </defs>
        {connections}
        {nodeElements}
      </svg>
    </div>
  )
}

export default MindmapCanvas
