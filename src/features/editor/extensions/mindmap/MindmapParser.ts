/** Mindmap node shape types matching Mermaid mindmap syntax */
export type MindmapNodeShape = 'circle' | 'square' | 'rounded' | 'cloud' | 'hexagon' | 'bang' | 'default'

/** A single node in the mindmap tree */
export interface MindmapNode {
  id: string
  text: string
  shape: MindmapNodeShape
  indent: number
  children: MindmapNode[]
  lineNumber: number
}

/** Result of parsing a Mermaid mindmap code block */
export interface MindmapParseResult {
  root: MindmapNode | null
  rawLines: string[]
  configBlock: string
}

/** Shape pattern: [regex, shape] — order matters, more specific first */
const SHAPE_PATTERNS: [RegExp, MindmapNodeShape][] = [
  [/^\(\((.+)\)\)$/, 'circle'],
  [/^\)\)(.+)\(\($/, 'bang'],
  [/^\{\{(.+)\}\}$/, 'hexagon'],
  [/^\)(.+)\($/, 'cloud'],
  [/^\[(.+)\]$/, 'square'],
  [/^\((.+)\)$/, 'rounded'],
  [/^(.+)$/, 'default'],
]

/** Extract shape and text from a line's content */
function parseNodeContent(raw: string): { text: string; shape: MindmapNodeShape } {
  const trimmed = raw.trim()
  for (const [pattern, shape] of SHAPE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return { text: match[1], shape }
  }
  return { text: trimmed, shape: 'default' }
}

/** Generate a unique node ID based on line number */
function nodeId(lineNumber: number): string {
  return `mm-node-${lineNumber}`
}

/** Check if a line is the mindmap keyword line */
function isMindmapKeyword(line: string): boolean {
  return line.trim() === 'mindmap'
}

/** Check if a line is a config block delimiter */
function isConfigDelimiter(line: string): boolean {
  return line.trim() === '---'
}

/** Calculate indent level (number of leading spaces / 4) */
function indentLevel(line: string): number {
  const match = line.match(/^( *)/)
  if (!match) return 0
  return Math.floor(match[1].length / 4)
}

/** Parse Mermaid mindmap code into a node tree */
export function parseMindmapCode(code: string): MindmapParseResult {
  const lines = code.split('\n')
  const rawLines = [...lines]

  // Extract config block if present
  let configBlock = ''
  let startIdx = 0

  if (lines.length > 0 && isConfigDelimiter(lines[0])) {
    const endIdx = lines.findIndex((l, i) => i > 0 && isConfigDelimiter(l))
    if (endIdx !== -1) {
      configBlock = lines.slice(0, endIdx + 1).join('\n')
      startIdx = endIdx + 1
    }
  }

  // Skip "mindmap" keyword line
  let mindmapLineIdx = -1
  for (let i = startIdx; i < lines.length; i++) {
    if (isMindmapKeyword(lines[i])) {
      mindmapLineIdx = i
      break
    }
  }
  if (mindmapLineIdx !== -1) {
    startIdx = mindmapLineIdx + 1
  }

  // Parse nodes
  const nodeStack: MindmapNode[] = []
  let root: MindmapNode | null = null

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    // Skip direction marker comments (%% direction: xxx %%)
    if (/^%%\s*direction:\s*\w+\s*%%/.test(line.trim())) continue

    const indent = indentLevel(line)
    let content = line.trim()

    // Mermaid mindmap root node uses "root" keyword before the shape syntax
    // e.g. "root((Center))" → extract "((Center))", then parseNodeContent gets "Center"
    if (content.toLowerCase().startsWith('root')) {
      const afterRoot = content.slice(4)
      // Only strip "root" if followed by a shape character (not a space + regular text)
      if (/^[[(){]/.test(afterRoot)) {
        content = afterRoot
      }
    }

    const { text, shape } = parseNodeContent(content)

    const node: MindmapNode = {
      id: nodeId(i),
      text,
      shape,
      indent,
      children: [],
      lineNumber: i,
    }

    // Find parent: pop stack until we find a node with lower indent
    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].indent >= indent) {
      nodeStack.pop()
    }

    if (nodeStack.length > 0) {
      nodeStack[nodeStack.length - 1].children.push(node)
    } else {
      root = node
    }

    nodeStack.push(node)
  }

  return { root, rawLines, configBlock }
}

/** Wrap text with shape brackets for Mermaid syntax */
function wrapWithShape(text: string, shape: MindmapNodeShape): string {
  switch (shape) {
    case 'circle': return `((${text}))`
    case 'square': return `[${text}]`
    case 'rounded': return `(${text})`
    case 'cloud': return `)${text}(`
    case 'hexagon': return `{{${text}}}`
    case 'bang': return `))${text}((`
    case 'default': return text
  }
}

/** Serialize a node tree back to Mermaid mindmap code */
export function serializeMindmapTree(root: MindmapNode | null, configBlock?: string): string {
  if (!root) return 'mindmap\n'

  const lines: string[] = []
  if (configBlock) lines.push(configBlock)
  lines.push('mindmap')

  function serializeNode(node: MindmapNode, depth: number) {
    const indent = '    '.repeat(depth)
    const content = wrapWithShape(node.text, node.shape)
    lines.push(`${indent}${content}`)
    for (const child of node.children) {
      serializeNode(child, depth + 1)
    }
  }

  serializeNode(root, 1)
  return lines.join('\n')
}

/** Deep clone a node tree */
function cloneNode(node: MindmapNode): MindmapNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  }
}

/** Find a node by ID in the tree */
function findNode(root: MindmapNode, nodeId: string): MindmapNode | null {
  if (root.id === nodeId) return root
  for (const child of root.children) {
    const found = findNode(child, nodeId)
    if (found) return found
  }
  return null
}

/** Find parent of a node by ID */
function findParent(root: MindmapNode, nodeId: string): MindmapNode | null {
  for (const child of root.children) {
    if (child.id === nodeId) return root
    const found = findParent(child, nodeId)
    if (found) return found
  }
  return null
}

/** Update a node's text, returns a new tree */
export function updateNodeText(root: MindmapNode, targetId: string, newText: string): MindmapNode {
  const newRoot = cloneNode(root)
  const node = findNode(newRoot, targetId)
  if (node) node.text = newText
  return newRoot
}

/** Add a child node to a parent, returns a new tree */
export function addChildNode(
  root: MindmapNode,
  parentId: string,
  text = '新节点',
  shape: MindmapNodeShape = 'default'
): MindmapNode {
  const newRoot = cloneNode(root)
  const parent = findNode(newRoot, parentId)
  if (parent) {
    const newNode: MindmapNode = {
      id: `mm-new-${Date.now()}`,
      text,
      shape,
      indent: parent.indent + 1,
      children: [],
      lineNumber: -1,
    }
    parent.children.push(newNode)
  }
  return newRoot
}

/** Add a sibling node (same parent), returns a new tree */
export function addSiblingNode(
  root: MindmapNode,
  siblingId: string,
  text = '新节点',
  shape: MindmapNodeShape = 'default'
): MindmapNode | null {
  const newRoot = cloneNode(root)
  const parent = findParent(newRoot, siblingId)
  if (!parent) return newRoot

  const idx = parent.children.findIndex(c => c.id === siblingId)
  if (idx === -1) return newRoot

  const newNode: MindmapNode = {
    id: `mm-new-${Date.now()}`,
    text,
    shape,
    indent: parent.children[idx].indent,
    children: [],
    lineNumber: -1,
  }
  parent.children.splice(idx + 1, 0, newNode)
  return newRoot
}

/** Remove a node and its children, returns a new tree (or null if root removed) */
export function removeNode(root: MindmapNode, targetId: string): MindmapNode | null {
  if (root.id === targetId) return null
  const newRoot = cloneNode(root)
  const parent = findParent(newRoot, targetId)
  if (parent) {
    parent.children = parent.children.filter(c => c.id !== targetId)
  }
  return newRoot
}

/** Change a node's shape, returns a new tree */
export function changeNodeShape(root: MindmapNode, targetId: string, shape: MindmapNodeShape): MindmapNode {
  const newRoot = cloneNode(root)
  const node = findNode(newRoot, targetId)
  if (node) node.shape = shape
  return newRoot
}

/** Check if a Mermaid code block is a mindmap type */
export function isMindmapCode(code: string): boolean {
  const trimmed = code.trim()
  const withoutConfig = trimmed.replace(/^---[\s\S]*?---\s*/, '')
  // Also skip direction markers that may appear before "mindmap"
  const withoutDirection = withoutConfig.trimStart().replace(/^%%\s*direction:\s*\w+\s*%%\s*\n?/, '')
  return withoutDirection.trimStart().startsWith('mindmap')
}
