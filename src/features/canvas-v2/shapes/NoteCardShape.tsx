/**
 * NoteCardShape — 笔记卡片的数据形状定义
 *
 * 引擎收敛说明：
 * 本文件原先同时包含 tldraw 的 NoteCardShapeUtil（BaseBoxShapeUtil 子类）与
 * 其 React 渲染组件。白板已收敛为 Excalidraw 混合引擎，卡片改由
 * engine/OverlayCards.tsx 的 HTML 浮层渲染，tldraw 渲染实现遂整体删除。
 *
 * 保留部分仅为「卡片数据形状的类型契约」：各面板、hooks、导入导出工具
 * 仍以这些类型描述卡片数据；下方 tlschema 模块增强亦须保留，
 * 因为 CanvasEngine 对外伪装为 tldraw Editor，调用方的
 * editor.createShape({ type: 'note-card', props }) 依赖该增强完成类型校验。
 */
import type { TLBaseShape } from '../engine/engineTypes'
import type { RelationType } from '../types'

// ─── 笔记卡片属性类型 ───
export interface NoteCardShapeProps {
  w: number
  h: number
  text: string
  color: string // hex 颜色（取渐变起点色）
  fileId?: string // 关联文件 ID
  collapsed: boolean // 是否折叠
  syncEnabled: boolean // 是否编辑回写源文件
  tags?: string // 标签（逗号分隔，如 "概念,引用"）
  pinned?: boolean // 是否置顶
  updatedAt?: number // 最后更新时间戳
  // P3 扩展
  parentId?: string // P3-14：父卡片 ID
  relationType?: RelationType // P3-3：与父卡片的关系类型
  isMoc?: boolean // P3-4：是否为 MOC 卡片
  // P4 扩展
  placeholder?: string // P4：引导式占位提示
}

// ─── NoteCardShape 类型定义 ───
export type NoteCardShape = TLBaseShape<'note-card', NoteCardShapeProps>

// 模块增强：将 note-card 注册到 tldraw 类型系统
