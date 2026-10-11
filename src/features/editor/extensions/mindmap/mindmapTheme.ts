/**
 * 思维导图配色 · **单一来源**。
 *
 * 编辑器画布（`MindmapCanvas`，可交互）与预览渲染器（`mindmapRender`，纯 SVG 字符串）
 * 共用这一份，改配色一处生效 —— 保证「所见即所得」与「预览」样式一致。
 * 按节点深度取色（0 = 根）。
 */
export interface MindmapDepthColor {
  /** 节点填充 */
  bg: string
  /** 描边 / 连线 */
  border: string
  /** 文字 */
  text: string
}

export const DEPTH_COLORS: MindmapDepthColor[] = [
  { bg: '#eef2ff', border: '#6366f1', text: '#4338ca' },
  { bg: '#eff6ff', border: 'var(--mc-accent)', text: '#1d4ed8' },
  { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
  { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
  { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' },
]

export function getDepthColor(depth: number): MindmapDepthColor {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length]
}

/** 节点文字字体（编辑器画布与预览共用） */
export const MINDMAP_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
export const MINDMAP_FONT_SIZE = 13
