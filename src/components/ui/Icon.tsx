/**
 * Icon —— 统一矢量图标组件
 *
 * 单一图标出口，供全应用（编辑器命令面板、白板、侧边栏等）复用。
 * 设计：24x24 描边式线性图标（currentColor 跟随文字色），少数图标（pinFill/play）为填充式。
 * 安全网：当 `name` 不是已注册图标名时，
 *   - 若值本身是 emoji，则原样渲染（保证旧 emoji 命令图标不丢）；
 *   - 否则渲染占位空白，避免布局塌陷。
 *
 * 白板模块通过 `src/features/canvas-v2/components/CanvasIcon.tsx` 兼容别名复用本组件。
 */
import React from 'react'

type IconDef = {
  /** 每个元素为一条 SVG path 的 d 属性（与下方 node 二选一） */
  paths?: string[]
  /** 原始 SVG 子节点（rect/circle/path 等），用于从 aurora/icons 合并的图标；优先于 paths */
  node?: React.ReactNode
  /** 是否为填充式图标（如 pinFill / play）。默认 false = 描边式 */
  filled?: boolean
  /** 覆盖默认描边宽度 */
  sw?: number
}

const ICONS = {
  // ---------- 基础操作 ----------
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  close: { paths: ['M18 6 6 18', 'M6 6l12 12'] },
  check: { paths: ['M20 6 9 17l-5-5'] },
  more: {
    paths: [
      'M5 12a1.5 1.5 0 1 0 0-.01',
      'M12 12a1.5 1.5 0 1 0 0-.01',
      'M19 12a1.5 1.5 0 1 0 0-.01',
    ],
    sw: 2.4,
  },
  arrow: { paths: ['M5 12h14', 'M13 6l6 6-6 6'] },
  arrowLeft: { paths: ['M19 12H5', 'M11 6l-6 6 6 6'] },
  chevronRight: { paths: ['M9 18l6-6-6-6'] },
  chevronLeft: { paths: ['M15 18l-6-6 6-6'] },
  chevronDown: { paths: ['M6 9l6 6 6-6'] },
  chevronUp: { paths: ['M6 15l6-6 6 6'] },

  // ---------- 编辑 ----------
  edit: { paths: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'] },
  pen: { paths: ['M20.7 3.3a1 1 0 0 0-1.4 0L3 19.6V22h2.4L22 4.7a1 1 0 0 0 0-1.4z'] },
  copy: {
    paths: ['M9 9h11v11H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  },
  duplicate: {
    paths: ['M18 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4', 'M9 9h11v11H9z'],
  },
  delete: {
    paths: [
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6',
      'M14 11v6',
    ],
  },
  scissors: {
    paths: [
      'M6 6a3 3 0 1 0 0 .01',
      'M6 18a3 3 0 1 0 0 .01',
      'M20 4 8.12 15.88',
      'M14.47 14.48 20 20',
      'M8.12 8.12 12 12',
    ],
    sw: 1.6,
  },
  replace: {
    paths: [
      'M3 9l3-3 3 3',
      'M6 6v9a3 3 0 0 0 3 3h9',
      'M21 15l-3 3-3-3',
      'M18 18v-9a3 3 0 0 0-3-3H6',
    ],
  },
  convert: {
    paths: [
      'M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3',
      'M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3',
      'M21 3v6h-6',
      'M3 21v-6h6',
    ],
  },

  // ---------- 视图 / 显示 ----------
  code: {
    paths: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
    sw: 1.8,
  },
  split: {
    paths: ['M4 4h16v16H4z', 'M12 4v16'],
    sw: 1.8,
  },
  search: { paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'] },
  link: {
    paths: [
      'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
      'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    ],
  },
  externalLink: {
    paths: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  },
  eye: {
    paths: [
      'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z',
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ],
  },
  fit: {
    paths: [
      'M8 3H5a2 2 0 0 0-2 2v3',
      'M16 3h3a2 2 0 0 1 2 2v3',
      'M21 16v3a2 2 0 0 1-2 2h-3',
      'M8 21H5a2 2 0 0 1-2-2v-3',
    ],
  },
  target: {
    paths: [
      'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
      'M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0',
      'M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
    ],
  },
  grid: { paths: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'] },
  layers: {
    paths: ['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  },
  map: {
    paths: [
      'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z',
      'M9 4v14',
      'M15 6v14',
    ],
  },
  image: {
    paths: [
      'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
      'M21 15l-5-5L5 21',
    ],
  },
  camera: {
    paths: [
      'M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z',
      'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    ],
  },
  play: { paths: ['M6 4l14 8-14 8z'], filled: true },
  sparkle: { paths: ['M12 2l2.2 6.5L21 11l-6.8 2.5L12 20l-2.2-6.5L3 11l6.8-2.5z'] },
  palette: {
    paths: [
      'M12 3a9 9 0 0 0 0 18c1.7 0 2-1.3 1.2-2.2-.8-.9-.3-2.2 1-2.2h2a4 4 0 0 0 4-4c0-4.4-4-7.6-9-7.6z',
      'M7.5 11.5m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
      'M12 7.5m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
      'M16.5 10m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
    ],
    sw: 1.6,
  },
  theme: {
    paths: [
      'M4 21v-7',
      'M4 10V3',
      'M12 21v-9',
      'M12 8V3',
      'M20 21v-5',
      'M20 12V3',
      'M1 14h6',
      'M9 8h6',
      'M17 16h6',
    ],
  },
  template: { paths: ['M3 3h18v18H3z', 'M3 9h18', 'M9 9v12'] },
  note: {
    paths: [
      'M14 3v4a1 1 0 0 0 1 1h4',
      'M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z',
      'M9 9h1',
      'M9 13h6',
      'M9 17h6',
    ],
  },
  moon: { paths: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'] },
  sun: {
    paths: [
      'M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10z',
      'M12 1v2',
      'M12 21v2',
      'M4.2 4.2l1.4 1.4',
      'M18.4 18.4l1.4 1.4',
      'M1 12h2',
      'M21 12h2',
      'M4.2 19.8l1.4-1.4',
      'M18.4 5.6l1.4-1.4',
    ],
    sw: 1.6,
  },

  // ---------- 文件 / 文件夹 ----------
  file: {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  },
  folder: {
    paths: [
      'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 4.1A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z',
    ],
  },
  folderOpen: {
    paths: [
      'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z',
      'M3 9h18l-1.5 8.5A2 2 0 0 1 17.5 19h-11A2 2 0 0 1 4.5 17.5z',
    ],
  },
  export: { paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  import: { paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 8l5-5 5 5', 'M12 3v12'] },
  archive: { paths: ['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4'] },
  inbox: {
    paths: [
      'M22 12h-6l-2 3h-4l-2-3H2',
      'M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z',
    ],
  },
  emptyBox: {
    paths: ['M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3', 'M3 8l9 6 9-6', 'M3 8v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8'],
  },
  noResults: {
    paths: [
      'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
      'M21 21l-4.3-4.3',
      'M9 9l6 6',
      'M15 9l-6 6',
    ],
  },

  // ---------- 绘图工具 ----------
  select: { paths: ['M3 3l7.07 16.97 2.51-7.39 7.39-2.51z'] },
  hand: {
    paths: [
      'M18 11V6a2 2 0 0 0-4 0',
      'M14 10V4a2 2 0 0 0-4 0v6',
      'M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8v-4a2 2 0 0 0-4 0',
    ],
  },
  text: { paths: ['M4 7V5h16v2', 'M9 19h6', 'M12 5v14'] },
  draw: { paths: ['M3 21c3 0 4-1 4-3', 'M14 4l6 6-9 9H5v-6z', 'M13 7l4 4'] },
  rectangle: { paths: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'] },
  ellipse: { paths: ['M12 21a9 6 0 1 0 0-18 9 6 0 1 0 0 18z'] },
  line: { paths: ['M5 19 19 5'] },
  eraser: {
    paths: ['M20 20H7L3 16a2 2 0 0 1 0-3L13 3a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8', 'M9 9l6 6'],
  },
  frame: { paths: ['M4 4h16v16H4z', 'M8 8h8v8H8z'] },
  tag: {
    paths: ['M12 2H4a2 2 0 0 0-2 2v8l10 10 8-8z', 'M7 7m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'],
  },

  // ---------- 对齐 / 分布 ----------
  alignLeft: { paths: ['M4 3v18', 'M10 8h10', 'M10 12h7', 'M10 16h10'] },
  alignCenterV: { paths: ['M12 3v18', 'M8 8h8', 'M9 12h6', 'M8 16h8'] },
  alignRight: { paths: ['M20 3v18', 'M6 8h10', 'M7 12h10', 'M6 16h10'] },
  alignTop: { paths: ['M3 4h18', 'M8 10v10', 'M12 10v7', 'M16 10v10'] },
  alignBottom: { paths: ['M3 20h18', 'M8 4v10', 'M12 4v7', 'M16 4v10'] },
  alignCenterH: { paths: ['M3 12h18', 'M8 8v8', 'M12 9v6', 'M16 8v8'] },
  distributeH: { paths: ['M3 3v18', 'M21 3v18', 'M11 7h2v10h-2z'] },
  distributeV: { paths: ['M3 3h18', 'M3 21h18', 'M7 11h10v2H7z'] },

  // ---------- 杂项（白板） ----------
  outline: { paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
  filter: { paths: ['M22 3H2l8 9.5V19l4 2v-8.5z'] },
  recommend: { paths: ['M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'] },
  backlinks: {
    paths: [
      'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
      'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    ],
  },
  history: { paths: ['M3 3v5h5', 'M3.05 13A9 9 0 1 0 6 5.3L3 8', 'M12 7v5l4 2'] },
  undo: { paths: ['M9 14 4 9l5-5', 'M4 9h11a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-4'] },
  redo: { paths: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0-5 5 5 5 0 0 0 5 5h4'] },
  lock: {
    paths: [
      'M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z',
      'M8 11V7a4 4 0 0 1 8 0v4',
    ],
  },
  unlock: {
    paths: [
      'M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z',
      'M8 11V7a4 4 0 0 1 7.5-2',
    ],
  },
  pin: { paths: ['M12 17v5', 'M9 3h6l-1 9 3 3H7l3-3z'] },
  pinFill: { paths: ['M12 17v5', 'M9 3h6l-1 9 3 3H7l3-3z'], filled: true },
  warning: {
    paths: [
      'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
      'M12 9v4',
      'M12 17h.01',
    ],
  },
  info: {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 1 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  },
  save: {
    paths: [
      'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
      'M17 21v-8H7v8',
      'M7 3v5h8',
    ],
  },
  sync: {
    paths: [
      'M21 2v6h-6',
      'M3 22v-6h6',
      'M21 8a9 9 0 0 0-15-3.7L3 8',
      'M3 16a9 9 0 0 0 15 3.7l3-2.7',
    ],
  },
  resources: {
    paths: ['M12 2 2 7l10 5 10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  },
  favorites: {
    paths: [
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z',
    ],
  },
  kanban: { paths: ['M6 4h3v16H6z', 'M15 4h3v9h-3z'] },
  dashboard: {
    paths: [
      'M3 3h8v8H3z',
      'M13 3h8v5h-8z',
      'M13 11h8v10h-8z',
      'M3 13h8v8H3z',
    ],
  },
  canvasList: { paths: ['M4 4h16v16H4z', 'M4 9h16', 'M9 9v11'] },
  canvasRef: { paths: ['M4 4h16v16H4z', 'M10 8h4v8h-4z', 'M2 12h2', 'M20 12h2'] },
  handshake: {
    paths: ['M8 13 11 16a3 3 0 0 0 4 0', 'M16 11l3 3', 'M8 13l-3 1', 'M16 7l3 3-3 3'],
    sw: 1.6,
  },
  lightbulb: {
    paths: [
      'M9 18h6',
      'M10 21h4',
      'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
    ],
  },
  robot: {
    paths: [
      'M12 2v3',
      'M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z',
      'M9 13h.01',
      'M15 13h.01',
    ],
    sw: 1.6,
  },
  plugins: {
    paths: [
      'M6 6h.01',
      'M6 12h.01',
      'M6 18h.01',
      'M12 6h.01',
      'M12 12h.01',
      'M12 18h.01',
      'M18 6h.01',
      'M18 12h.01',
      'M18 18h.01',
    ],
    sw: 2,
  },
  autoLayout: {
    paths: [
      'M4 4h6v6H4z',
      'M14 4h6v6h-6z',
      'M4 14h6v6H4z',
      'M14 14h6v6h-6z',
      'M10 7h4',
      'M7 10v4',
      'M17 10v4',
      'M10 17h4',
    ],
  },
  menu: { paths: ['M3 6h18', 'M3 12h18', 'M3 18h18'] },
  settings: {
    paths: [
      'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
      'M12 2v3',
      'M12 19v3',
      'M2 12h3',
      'M19 12h3',
      'M4.9 4.9l2.1 2.1',
      'M17 17l2.1 2.1',
      'M4.9 19.1l2.1-2.1',
      'M17 7l2.1-2.1',
    ],
    sw: 1.6,
  },
  knowledgeGraph: {
    paths: [
      'M12 7m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
      'M6 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
      'M18 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
      'M11 9 7 15',
      'M13 9l4 6',
    ],
  },
  command: {
    paths: [
      'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
    ],
  },
  calendar: {
    paths: [
      'M8 2v4',
      'M16 2v4',
      'M3 10h18',
      'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    ],
  },
  bolt: { paths: ['M13 2 3 14h7l-1 8 10-12h-7l1-8z'] },
  bookmark: { paths: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'] },
  book: { paths: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z'] },
  library: { paths: ['M5 4h4v16H5z', 'M11 4h4v16h-4z', 'M17 5l3 1-2 13-3-1z'] },
  globe: {
    paths: [
      'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z',
      'M3 12h18',
      'M12 3c2.5 2.7 2.5 15.3 0 18',
      'M12 3c-2.5 2.7-2.5 15.3 0 18',
    ],
  },
  keyboard: {
    paths: [
      'M2 6h20v12H2z',
      'M6 10h.01',
      'M10 10h.01',
      'M14 10h.01',
      'M18 10h.01',
      'M6 14h12',
    ],
    sw: 1.6,
  },
  sidebar: {
    paths: ['M3 3h18v18H3z', 'M9 3v18', 'M9 9h12', 'M9 15h12'],
  },
  scroll: {
    paths: [
      'M15 3h6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2',
      'M9 8h6',
      'M9 12h6',
      'M9 16h3',
    ],
  },
  chart: { paths: ['M3 3v18h18', 'M7 16v-6', 'M12 16V8', 'M17 16v-9'] },

  // ---------- 图谱 / 分析 ----------
  trophy: {
    paths: [
      'M8 21h8',
      'M12 17v4',
      'M7 4h10v5a5 5 0 0 1-10 0z',
      'M19 5h1a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1',
      'M5 5H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1',
    ],
  },
  puzzle: {
    paths: [
      'M14 4a2 2 0 1 0-4 0',
      'M4 10a2 2 0 1 0 0-4',
      'M20 10a2 2 0 1 1 0-4',
      'M14 20a2 2 0 1 1-4 0',
      'M10 4v6H4v4h6v6h4v-6h6v-4h-6v-6z',
    ],
  },
  clipboard: {
    paths: [
      'M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1z',
      'M9 4a1 1 0 0 0-1 1v1h8V5a1 1 0 0 0-1-1z',
      'M8 11h8',
      'M8 15h6',
    ],
  },
  ruler: {
    paths: [
      'M3 17 17 3l4 4L7 21z',
      'M7.5 7.5l1 1',
      'M10.5 5.5l1 1',
      'M13.5 11.5l1 1',
    ],
  },
  hierarchy: {
    paths: [
      'M12 4a2 2 0 1 0 0-.01',
      'M5 20a2 2 0 1 0 0-.01',
      'M19 20a2 2 0 1 0 0-.01',
      'M12 6v4',
      'M12 10H5v8',
      'M12 10h7v8',
    ],
  },
  vector: {
    paths: [
      'M3 3h7v7H3z',
      'M14 3h7v7h-7z',
      'M14 14h7v7h-7z',
      'M3 14h7v7H3z',
      'M3 3l18 18',
    ],
  },
  diagram: {
    paths: [
      'M4 4h6v6H4z',
      'M14 14h6v6h-6z',
      'M10 7h4v4h4',
    ],
  },


  // ---------- Aurora 图标（从 aurora/icons.tsx 合并 · 单一来源 · Phase4 #155 4.2） ----------
  canvas: { node: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></>, sw: 1.5 },
  graph: { node: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8 7l8 0M7.5 8l3.5 8M16.5 9l-3.5 7" /></>, sw: 1.5 },
  mindmap: { node: <><rect x="9" y="9" width="6" height="6" rx="1.5" /><path d="M9 12H4M12 9V4M15 12h5M12 15v5" /><circle cx="3" cy="12" r="1.5" /><circle cx="12" cy="3" r="1.5" /><circle cx="21" cy="12" r="1.5" /><circle cx="12" cy="21" r="1.5" /></>, sw: 1.5 },
  timeline: { node: <><path d="M3 12h18" /><path d="M7 12V6M12 12v6M17 12V6" /><circle cx="7" cy="6" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="17" cy="6" r="1.6" /></>, sw: 1.5 },
  knowledge: { node: <><path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-3v18h3a2 2 0 0 0 2-2V5Z" /></>, sw: 1.5 },
  blog: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h7M7 16h10" /></>, sw: 1.5 },
  about: { node: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>, sw: 1.5 },
  migrate: { node: <><path d="M4 7h11M11 4l3 3-3 3" /><path d="M20 17H9M13 14l-3 3 3 3" /></>, sw: 1.5 },
  clipper: { node: <><path d="M9 4h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2V5a1 1 0 0 1 1-1Z" /><path d="M9 11l2.5 2.5L16 9" /></>, sw: 1.5 },
  welcome: { node: <><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9 20v-6h6v6" /></>, sw: 1.5 },
  panelLeft: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>, sw: 1.5 },
  panelRight: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>, sw: 1.5 },
  density: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>, sw: 1.5 },
  chevron: { node: <path d="m9 6 6 6-6 6" />, sw: 1.5 },
  table: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></>, sw: 1.5 },
  bold: { node: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />, sw: 1.5 },
  italic: { node: <path d="M10 5h8M6 19h8M14 5l-4 14" />, sw: 1.5 },
  quote: { node: <path d="M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4" />, sw: 1.5 },
  list: { node: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" /><circle cx="4.5" cy="12" r="1.2" /><circle cx="4.5" cy="18" r="1.2" /></>, sw: 1.5 },
  heading: { node: <path d="M6 4v16M18 4v16M6 12h12" />, sw: 1.5 },
  trash: { node: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></>, sw: 1.5 },
  download: { node: <><path d="M12 4v10M8 11l4 4 4-4" /><path d="M5 20h14" /></>, sw: 1.5 },
  star: { node: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.8 7.2 19l.9-5.4L4.2 9.7l5.4-.8L12 4Z" />, sw: 1.5 },
  clock: { node: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, sw: 1.5 },
  spark: { node: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />, sw: 1.5 },
  heart: { node: <path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z" />, sw: 1.5 },
  send: { node: <><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></>, sw: 1.5 },
  bell: { node: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>, sw: 1.5 },
  key: { node: <><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M17 17l2-2M14 14l2-2" /></>, sw: 1.5 },
  desktop: { node: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>, sw: 1.5 },
  tablet: { node: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M11 18h2" /></>, sw: 1.5 },
  mobile: { node: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>, sw: 1.5 },
  cursor: { node: <path d="M6 3l1 15 3.1-4.1L13 17l1.4-1.4-3.7-3.8L15.5 9 6 3Z" />, sw: 1.5 },
  square: { node: <rect x="4" y="4" width="16" height="16" rx="2" />, sw: 1.5 },
  circle: { node: <circle cx="12" cy="12" r="8" />, sw: 1.5 },
  arrowR: { node: <><path d="M4 12h14" /><path d="M13 6l6 6-6 6" /></>, sw: 1.5 },
  alert: { node: <><path d="M12 4 4 20h16L12 4Z" /><path d="M12 10v4M12 17v1" /></>, sw: 1.5 },
  chat: { node: <><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4V16H6a2 2 0 0 1-2-2V5Z" /><path d="M8 8h8M8 11h5" /></>, sw: 1.5 },
  share: { node: <><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="M8.3 11 14.7 7.5M8.3 13l6.4 3.5" /></>, sw: 1.5 },
  route: { node: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 6h6a4 4 0 0 1 4 4v6" /></>, sw: 1.5 },
  underline: { node: <><path d="M7 4v8a5 5 0 0 0 10 0V4" /><path d="M5 20h14" /></>, sw: 1.5 },
  strike: { node: <><path d="M5 12h14" /><path d="M8 7a4 3 0 0 1 8 0" /><path d="M8 17a4 3 0 0 0 8 0" /></>, sw: 1.5 },
  highlight: { node: <><path d="M9 11 4 16a1.5 1.5 0 0 0 0 2 1.5 1.5 0 0 0 2 0l5-5" /><path d="M14 4l6 6-2 2-6-6 2-2Z" /></>, sw: 1.5 },
  superscript: { node: <><path d="M5 18 8 12l3 6" /><path d="M15 4h5v5" /></>, sw: 1.5 },
  subscript: { node: <><path d="M5 6 8 12l3-6" /><path d="M15 20H10V15" /></>, sw: 1.5 },
  paragraph: { node: <><path d="M13 4v16" /><path d="M5 8h8a3 3 0 0 1 0 6H5" /></>, sw: 1.5 },
  numbers: { node: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M5 5.5V9M4.5 9h1" /><path d="M5 15.5V19M4.5 19h1" /></>, sw: 1.5 },
  task: { node: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5.5 5.5 7 8 4.5" /><path d="M4 11.5 5.5 13 8 10.5" /><path d="M4 17.5 5.5 19 8 16.5" /></>, sw: 1.5 },
  indent: { node: <><path d="M4 6h16M4 12h10M4 18h16" /><path d="M11 9l-3 3 3 3" /></>, sw: 1.5 },
  outdent: { node: <><path d="M4 6h16M4 12h10M4 18h16" /><path d="M8 9l3 3-3 3" /></>, sw: 1.5 },
  toc: { node: <><path d="M4 5h11M4 10h11M4 15h11M4 20h11" /><path d="M16 5v14M19 5v14" /></>, sw: 1.5 },
  footnote: { node: <><path d="M4 5h16M4 10h16M4 15h8" /><path d="M12 15l4 4" /></>, sw: 1.5 },
  math: { node: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10l4 4M12 10l-4 4M8 15h8" /></>, sw: 1.5 },
  frontmatter: { node: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M7 9h6M7 13h10M7 17h10" /></>, sw: 1.5 },
  print: { node: <><path d="M7 9V4h10v5" /><path d="M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v6H7z" /></>, sw: 1.5 },
  wand: { node: <><path d="M15 5l4 4-9 9-4 1 1-4 8-10Z" /><path d="M5 19l2-2" /></>, sw: 1.5 },
  braces: { node: <><path d="M9 4C6 4 6 8 6 10s0 2-3 2c3 0 3 0 3 2 0 2 0 6-3 6" /><path d="M15 4c3 0 3 4 3 6s0 2 3 2c-3 0-3 0-3 2 0 2 0 6 3 6" /></>, sw: 1.5 },
  emoji: { node: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M8.5 14.5a4 4 0 0 0 7 0" /></>, sw: 1.5 },
  caretDown: { node: <path d="m6 9 6 6 6-6" />, sw: 1.5 },
  type: { node: <><path d="M5 6h14" /><path d="M12 6v12" /></>, sw: 1.5 },
  hr: { node: <path d="M3 12h18" />, sw: 1.5 },
  atSign: { node: <><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" /></>, sw: 1.5 },
  shield: { node: <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />, sw: 1.5 },
  refresh: { node: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>, sw: 1.5 },
  hash: { node: <path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />, sw: 1.5 },
  listTree: { node: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" /><circle cx="4.5" cy="12" r="1.2" /><circle cx="4.5" cy="18" r="1.2" /><path d="M4.5 7.2v9.6" /></>, sw: 1.5 },
  cornerDownRight: { node: <path d="M5 5v9a4 4 0 0 0 4 4h10M14 15l5 5-5 5" />, sw: 1.5 },
  fileText: { node: <><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>, sw: 1.5 },
  layout: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>, sw: 1.5 },
  filePdf: { node: <><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3Zm0 3v2" /></>, sw: 1.5 },
  filePlus: { node: <><path d="M6 3h8l4 4v6" /><path d="M14 3v4h4" /><path d="M14 14v6M11 17h6" /></>, sw: 1.5 },
  folderPlus: { node: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M12 11v4M10 13h4" /></>, sw: 1.5 },
  tags: { node: <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.3" /><path d="M8 14 19 3" /></>, sw: 1.5 },
  eyeOff: { node: <><path d="M3 3l18 18" /><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.3 6.3A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>, sw: 1.5 },
  grip: { node: <><circle cx="9" cy="6" r="1.3" /><circle cx="15" cy="6" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="15" cy="12" r="1.3" /><circle cx="9" cy="18" r="1.3" /><circle cx="15" cy="18" r="1.3" /></>, sw: 1.5 },
  present: { node: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M12 17v4M8 21h8M9 9h6" /></>, sw: 1.5 },
  upload: { node: <><path d="M12 20V10M8 13l4-4 4 4" /><path d="M5 4h14" /></>, sw: 1.5 },
  user: { node: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>, sw: 1.5 },
  panel: { node: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>, sw: 1.5 },
  paint: { node: <><path d="M5 11h9a3 3 0 0 0 3-3V5a2 2 0 0 0-4 0M14 5h3a2 2 0 0 1 2 2v1" /><path d="M5 11v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" /></>, sw: 1.5 },
  penTool: { node: <><path d="M15 5l4 4-9 9-4 1 1-4 8-10Z" /><path d="M13 7l4 4" /></>, sw: 1.5 },
  corner: { node: <path d="M5 19V9a4 4 0 0 1 4-4h10" />, sw: 1.5 },
  group: { node: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /><path d="M4 16h7M16 4v7" /></>, sw: 1.5 },
  ungroup: { node: <><rect x="4" y="4" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>, sw: 1.5 },
  chevronsUp: { node: <><path d="m7 11 5-5 5 5M7 17l5-5 5 5" /></>, sw: 1.5 },
  chevronsDown: { node: <><path d="m7 7 5 5 5-5M7 13l5 5 5-5" /></>, sw: 1.5 },
  arrowUp: { node: <><path d="M12 19V5M6 11l6-6 6 6" /></>, sw: 1.5 },
  maximize: { node: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>, sw: 1.5 },
  minimize: { node: <path d="M5 19h14" />, sw: 1.5 },
  restore: { node: <><rect x="5" y="5" width="14" height="14" rx="1.5" /><rect x="9" y="3" width="10" height="10" rx="1" fill="none" /></>, sw: 1.5 },
  sort: { node: <><path d="M7 5v14M7 5l-3 3M7 5l3 3" /><path d="M17 19V5M17 19l-3-3M17 19l3-3" /></>, sw: 1.5 },
  moveLeft: { node: <><path d="M11 6 5 12l6 6" /><path d="M19 6l-6 6 6 6" /></>, sw: 1.5 },
  moveRight: { node: <><path d="M13 6l6 6-6 6" /><path d="M5 6l6 6-6 6" /></>, sw: 1.5 },
  number: { node: <><path d="M5 9h14M5 15h14M9 5l-2 14M15 5l2 14" /></>, sw: 1.5 },
  bar: { node: <><path d="M5 20V10M12 20V4M19 20v-7" /></>, sw: 1.5 },
  progress: { node: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 8 8h-8V4Z" /></>, sw: 1.5 },
  donut: { node: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>, sw: 1.5 },
  pie: { node: <><path d="M12 3a9 9 0 1 0 9 9h-9V3Z" /><path d="M12 3v9h9A9 9 0 0 0 12 3Z" /></>, sw: 1.5 },
  cloud: { node: <><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 18H7Z" /></>, sw: 1.5 },
  smile: { node: <><circle cx="12" cy="12" r="8" /><path d="M8 14a4 4 0 0 0 8 0M9 9.5h.01M15 9.5h.01" /></>, sw: 1.5 },
  workflow: { node: <><rect x="3" y="4" width="7" height="6" rx="1.5" /><rect x="14" y="14" width="7" height="6" rx="1.5" /><path d="M10 7h4a3 3 0 0 1 3 3v4" /></>, sw: 1.5 },
  shapes: { node: <><rect x="4" y="4" width="8" height="8" rx="1.5" /><circle cx="16" cy="16" r="4" /></>, sw: 1.5 },
  slides: { node: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M12 17v4M8 21h8" /></>, sw: 1.5 },
  cut: { node: <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.2 7.5 20 18M8.2 16.5 20 6" /></>, sw: 1.5 },
  fullscreen: { node: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>, sw: 1.5 },
  logo: { node: <><path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="rgba(255,255,255,.25)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13 4v5h5" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M8 13h7M8 16.5h5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/></>, sw: 1.5 },
} satisfies Record<string, IconDef>

const ICON_KEYS = Object.keys(ICONS) as Array<keyof typeof ICONS>

// eslint-disable-next-line react-refresh/only-export-components -- 图标注册表常量与 Icon 组件同文件聚合，非跨组件共享
export const iconNames: readonly (keyof typeof ICONS)[] = ICON_KEYS

/**
 * 图标名字面量联合（2026-11-03 审查 P2）：此前退化为 `string`，拼错图标名编译期不报，
 * 运行时 `Icon[name]` 返回 undefined → 渲染 `<undefined />` 直接崩面板。
 */
export type IconName = keyof typeof ICONS

// eslint-disable-next-line react-refresh/only-export-components -- 类型守卫与 Icon 组件同文件聚合，非跨组件共享
export function isIconName(v: string): v is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, v)
}

const EMOJI_RE = /\p{Extended_Pictographic}/u

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: string
  size?: number | string
  strokeWidth?: number
  /** 强制以填充模式渲染（覆盖图标自带设定） */
  filled?: boolean
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 18, strokeWidth, filled, className, style, color, ...rest },
  ref
) {
  // 安全网：未注册的图标
  if (!Object.prototype.hasOwnProperty.call(ICONS, name)) {
    if (typeof name === 'string' && EMOJI_RE.test(name)) {
      // emoji 原样渲染（兼容旧命令图标）
      const px = typeof size === 'number' ? size : undefined
      return (
        <span
          className={className}
          style={{ fontSize: px, lineHeight: 1, display: 'inline-flex', alignItems: 'center', ...style }}
          aria-hidden="true"
        >
          {name}
        </span>
      )
    }
    // 未知非图标名：占位空白，避免塌陷
    const px = typeof size === 'number' ? size : 16
    return <span className={className} style={{ width: px, height: px, display: 'inline-block' }} />
  }

  // name 是 string（允许 emoji 与运行时兜底），上面已有 hasOwnProperty 守卫 → 此处断言安全
  // 断言到 IconDef：satisfies 保留了各图标条目的字面量结构，联合类型直接取可选字段会报错
  const def = ICONS[name as keyof typeof ICONS] as IconDef
  const isFilled = def.filled || filled
  const sw = strokeWidth ?? def.sw ?? 1.75

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : color ?? 'currentColor'}
      strokeWidth={isFilled ? 0 : sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {def.node ??
        def.paths?.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
})

Icon.displayName = 'Icon'

export default Icon
