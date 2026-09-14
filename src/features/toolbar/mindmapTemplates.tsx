import React from 'react'

export type LayoutType = 'radial' | 'right' | 'down'
export type ColorTheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender'

export interface MindmapTemplate {
  id: string
  icon: string
  labelZh: string
  labelEn: string
  descZh: string
  descEn: string
  templateZh: string
  templateEn: string
  preview: React.ReactNode
}

export const colorThemes: Record<ColorTheme, { labelZh: string; labelEn: string; color: string; classDef: string }> = {
  default: {
    labelZh: '默认',
    labelEn: 'Default',
    color: '#3b82f6',
    classDef: '',
  },
  ocean: {
    labelZh: '海洋',
    labelEn: 'Ocean',
    color: '#0ea5e9',
    classDef: '\nclassDef ocean fill:#0ea5e9,stroke:#0284c7,color:#fff\nclassDef oceanChild fill:#38bdf8,stroke:#0ea5e9,color:#fff\nclassDef oceanLeaf fill:#bae6fd,stroke:#38bdf8,color:#0c4a6e',
  },
  forest: {
    labelZh: '森林',
    labelEn: 'Forest',
    color: '#22c55e',
    classDef: '\nclassDef forest fill:#22c55e,stroke:#16a34a,color:#fff\nclassDef forestChild fill:#4ade80,stroke:#22c55e,color:#fff\nclassDef forestLeaf fill:#bbf7d0,stroke:#4ade80,color:#14532d',
  },
  sunset: {
    labelZh: '日落',
    labelEn: 'Sunset',
    color: '#f97316',
    classDef: '\nclassDef sunset fill:#f97316,stroke:#ea580c,color:#fff\nclassDef sunsetChild fill:#fb923c,stroke:#f97316,color:#fff\nclassDef sunsetLeaf fill:#fed7aa,stroke:#fb923c,color:#7c2d12',
  },
  lavender: {
    labelZh: '薰衣草',
    labelEn: 'Lavender',
    color: '#a78bfa',
    classDef: '\nclassDef lavender fill:#a78bfa,stroke:#8b5cf6,color:#fff\nclassDef lavenderChild fill:#c4b5fd,stroke:#a78bfa,color:#fff\nclassDef lavenderLeaf fill:#ede9fe,stroke:#c4b5fd,color:#4c1d95',
  },
}

const CircleNode = ({ x, y, r, color }: { x: number; y: number; r: number; color: string }) => (
  <circle cx={x} cy={y} r={r} fill={color} stroke="none" />
)

const SquareNode = ({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) => (
  <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2} fill={color} stroke="none" />
)

const RoundedNode = ({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) => (
  <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={6} fill={color} stroke="none" />
)

const CloudNode = ({ x, y, color }: { x: number; y: number; color: string }) => (
  <ellipse cx={x} cy={y} rx={14} ry={9} fill={color} stroke="none" />
)

const HexNode = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const s = 11
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${x + s * Math.cos(angle)},${y + s * Math.sin(angle)}`
  }).join(' ')
  return <polygon points={points} fill={color} stroke="none" />
}

const BangNode = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const outer = 13
  const inner = 8
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 4) * i - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    return `${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`
  }).join(' ')
  return <polygon points={points} fill={color} stroke="none" />
}

const Line = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--editor-border, #475569)" strokeWidth={1} opacity={0.5} />
)

const SmallText = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="var(--editor-text, #e2e8f0)" fontSize={4.5} fontFamily="sans-serif">{children}</text>
)

const c = '#3b82f6'
const c2 = '#60a5fa'
const c3 = '#93c5fd'

export const templates: MindmapTemplate[] = [
  {
    id: 'basic',
    icon: '🧠',
    labelZh: '基础思维导图',
    labelEn: 'Basic Mindmap',
    descZh: '圆形根节点，经典发散结构',
    descEn: 'Circle root, classic radial layout',
    templateZh: '```mermaid\nmindmap\n    root((中心主题))\n        子主题1\n        子主题2\n            孙主题1\n            孙主题2\n```',
    templateEn: '```mermaid\nmindmap\n    root((Central Topic))\n        Subtopic 1\n        Subtopic 2\n            Sub-subtopic 1\n            Sub-subtopic 2\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={20} y2={12} />
        <Line x1={40} y1={25} x2={60} y2={12} />
        <Line x1={20} y1={12} x2={10} y2={38} />
        <Line x1={60} y1={12} x2={70} y2={38} />
        <CircleNode x={40} y={25} r={9} color={c} />
        <CircleNode x={20} y={12} r={6} color={c2} />
        <CircleNode x={60} y={12} r={6} color={c2} />
        <CircleNode x={10} y={38} r={4} color={c3} />
        <CircleNode x={70} y={38} r={4} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'square',
    icon: '🏢',
    labelZh: '方形组织图',
    labelEn: 'Square Org Chart',
    descZh: '方形节点，适合组织架构',
    descEn: 'Square nodes, ideal for org charts',
    templateZh: '```mermaid\nmindmap\n    root[组织架构]\n        技术部\n            前端组\n            后端组\n        产品部\n            设计组\n            运营组\n```',
    templateEn: '```mermaid\nmindmap\n    root[Organization]\n        Engineering\n            Frontend\n            Backend\n        Product\n            Design\n            Operations\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={20} y2={12} />
        <Line x1={40} y1={25} x2={60} y2={12} />
        <Line x1={20} y1={12} x2={10} y2={38} />
        <Line x1={60} y1={12} x2={70} y2={38} />
        <SquareNode x={40} y={25} w={20} h={12} color={c} />
        <SquareNode x={20} y={12} w={16} h={10} color={c2} />
        <SquareNode x={60} y={12} w={16} h={10} color={c2} />
        <SquareNode x={10} y={38} w={12} h={8} color={c3} />
        <SquareNode x={70} y={38} w={12} h={8} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'rounded',
    icon: '💡',
    labelZh: '圆角导图',
    labelEn: 'Rounded Mindmap',
    descZh: '圆角方形，柔和风格',
    descEn: 'Rounded squares, soft style',
    templateZh: '```mermaid\nmindmap\n    root(创意构思)\n        方案A\n            优势\n            风险\n        方案B\n            优势\n            风险\n```',
    templateEn: '```mermaid\nmindmap\n    root(Creative Ideas)\n        Option A\n            Pros\n            Risks\n        Option B\n            Pros\n            Risks\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={20} y2={12} />
        <Line x1={40} y1={25} x2={60} y2={12} />
        <Line x1={20} y1={12} x2={10} y2={38} />
        <Line x1={60} y1={12} x2={70} y2={38} />
        <RoundedNode x={40} y={25} w={20} h={12} color={c} />
        <RoundedNode x={20} y={12} w={16} h={10} color={c2} />
        <RoundedNode x={60} y={12} w={16} h={10} color={c2} />
        <RoundedNode x={10} y={38} w={12} h={8} color={c3} />
        <RoundedNode x={70} y={38} w={12} h={8} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'cloud',
    icon: '☁️',
    labelZh: '云形创意图',
    labelEn: 'Cloud Creative Map',
    descZh: '云形根节点，适合创意发散',
    descEn: 'Cloud root, ideal for brainstorming',
    templateZh: '```mermaid\nmindmap\n    root)创意发散(\n        想法1\n            细节A\n            细节B\n        想法2\n            细节C\n        想法3\n```',
    templateEn: '```mermaid\nmindmap\n    root)Brainstorm(\n        Idea 1\n            Detail A\n            Detail B\n        Idea 2\n            Detail C\n        Idea 3\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={18} y2={12} />
        <Line x1={40} y1={25} x2={62} y2={12} />
        <Line x1={18} y1={12} x2={10} y2={38} />
        <CloudNode x={40} y={25} color={c} />
        <CircleNode x={18} y={12} r={6} color={c2} />
        <CircleNode x={62} y={12} r={6} color={c2} />
        <CircleNode x={10} y={38} r={4} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'hexagon',
    icon: '⬡',
    labelZh: '六边形分析图',
    labelEn: 'Hexagon Analysis',
    descZh: '六边形节点，适合分析决策',
    descEn: 'Hexagon nodes, ideal for analysis',
    templateZh: '```mermaid\nmindmap\n    root{{决策分析}}\n        优势\n            成本低\n            效率高\n        劣势\n            风险大\n        机会\n            市场增长\n```',
    templateEn: '```mermaid\nmindmap\n    root{{Decision Analysis}}\n        Strengths\n            Low cost\n            High efficiency\n        Weaknesses\n            High risk\n        Opportunities\n            Market growth\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={20} y2={12} />
        <Line x1={40} y1={25} x2={60} y2={12} />
        <Line x1={20} y1={12} x2={10} y2={38} />
        <HexNode x={40} y={25} color={c} />
        <HexNode x={20} y={12} color={c2} />
        <HexNode x={60} y={12} color={c2} />
        <HexNode x={10} y={38} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'bang',
    icon: '💥',
    labelZh: '爆炸强调图',
    labelEn: 'Bang Emphasis Map',
    descZh: '爆炸形关键节点，突出重点',
    descEn: 'Bang shape for key nodes, highlight focus',
    templateZh: '```mermaid\nmindmap\n    root))核心要点((\n        要点1\n            细节\n        要点2\n            细节\n        要点3\n```',
    templateEn: '```mermaid\nmindmap\n    root))Key Points((\n        Point 1\n            Detail\n        Point 2\n            Detail\n        Point 3\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={18} y2={12} />
        <Line x1={40} y1={25} x2={62} y2={12} />
        <Line x1={18} y1={12} x2={10} y2={38} />
        <BangNode x={40} y={25} color={c} />
        <CircleNode x={18} y={12} r={6} color={c2} />
        <CircleNode x={62} y={12} r={6} color={c2} />
        <CircleNode x={10} y={38} r={4} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'mixed',
    icon: '🎨',
    labelZh: '混合形状导图',
    labelEn: 'Mixed Shape Map',
    descZh: '多种形状混用，层次分明',
    descEn: 'Mixed shapes, clear hierarchy',
    templateZh: '```mermaid\nmindmap\n    root((项目规划))\n        需求分析\n            用户调研\n            竞品分析\n        技术方案{{架构设计}}\n            前端\n            后端\n        发布计划\n            测试\n            上线\n```',
    templateEn: '```mermaid\nmindmap\n    root((Project Plan))\n        Requirements\n            User Research\n            Competitor Analysis\n        Tech Solution{{Architecture}}\n            Frontend\n            Backend\n        Release Plan\n            Testing\n            Launch\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={18} y2={12} />
        <Line x1={40} y1={25} x2={62} y2={12} />
        <Line x1={18} y1={12} x2={10} y2={38} />
        <Line x1={62} y1={12} x2={70} y2={38} />
        <CircleNode x={40} y={25} r={9} color={c} />
        <RoundedNode x={18} y={12} w={16} h={10} color={c2} />
        <HexNode x={62} y={12} color={c2} />
        <SquareNode x={10} y={38} w={12} h={8} color={c3} />
        <CircleNode x={70} y={38} r={4} color={c3} />
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'markdown',
    icon: '📝',
    labelZh: '富文本导图',
    labelEn: 'Rich Text Map',
    descZh: '支持加粗、斜体、换行的富文本节点',
    descEn: 'Bold, italic, multi-line rich text nodes',
    templateZh: '```mermaid\nmindmap\n    root1["`**项目概述**\n第二行说明`"]\n        child1["`*重点模块*`"]\n            grandchild1["`详细说明\n支持换行`"]\n        child2["`**时间规划**`"]\n```',
    templateEn: '```mermaid\nmindmap\n    root1["`**Project Overview**\nSecond line`"]\n        child1["`*Key Module*`"]\n            grandchild1["`Details\nSupports line break`"]\n        child2["`**Timeline**`"]\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={20} y2={12} />
        <Line x1={40} y1={25} x2={60} y2={12} />
        <Line x1={20} y1={12} x2={10} y2={38} />
        <RoundedNode x={40} y={25} w={22} h={14} color={c} />
        <RoundedNode x={20} y={12} w={16} h={10} color={c2} />
        <RoundedNode x={60} y={12} w={16} h={10} color={c2} />
        <RoundedNode x={10} y={38} w={14} h={8} color={c3} />
        <SmallText x={40} y={24}>**B**</SmallText>
        <SmallText x={40} y={29}>line2</SmallText>
      </svg>
    ),
  },
  {
    id: 'deep',
    icon: '🌳',
    labelZh: '深层树形图',
    labelEn: 'Deep Tree Map',
    descZh: '多层级深度结构，适合知识体系',
    descEn: 'Multi-level deep structure, ideal for knowledge systems',
    templateZh: '```mermaid\nmindmap\n    root((知识体系))\n        基础理论\n            概念A\n                原理1\n                原理2\n            概念B\n        应用实践\n            案例X\n                步骤1\n                步骤2\n                步骤3\n            案例Y\n        前沿发展\n            趋势1\n            趋势2\n```',
    templateEn: '```mermaid\nmindmap\n    root((Knowledge System))\n        Fundamentals\n            Concept A\n                Principle 1\n                Principle 2\n            Concept B\n        Applications\n            Case X\n                Step 1\n                Step 2\n                Step 3\n            Case Y\n        Frontiers\n            Trend 1\n            Trend 2\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={10} x2={18} y2={22} />
        <Line x1={40} y1={10} x2={62} y2={22} />
        <Line x1={18} y1={22} x2={8} y2={36} />
        <Line x1={8} y1={36} x2={8} y2={46} />
        <Line x1={62} y1={22} x2={72} y2={36} />
        <CircleNode x={40} y={10} r={7} color={c} />
        <CircleNode x={18} y={22} r={5} color={c2} />
        <CircleNode x={62} y={22} r={5} color={c2} />
        <CircleNode x={8} y={36} r={4} color={c3} />
        <CircleNode x={8} y={46} r={3} color={c3} />
        <CircleNode x={72} y={36} r={4} color={c3} />
        <SmallText x={40} y={10}>Root</SmallText>
      </svg>
    ),
  },
  {
    id: 'icon',
    icon: '🔖',
    labelZh: '图标标注导图',
    labelEn: 'Icon Annotated Map',
    descZh: '带图标标注的节点，信息更直观',
    descEn: 'Nodes with icon annotations, more intuitive',
    templateZh: '```mermaid\nmindmap\n    root((项目管理))\n        规划阶段\n            需求文档\n            时间表\n        执行阶段\n            开发\n            测试\n        交付阶段\n            部署\n            验收\n```',
    templateEn: '```mermaid\nmindmap\n    root((Project Mgmt))\n        Planning\n            Requirements\n            Schedule\n        Execution\n            Development\n            Testing\n        Delivery\n            Deployment\n            Acceptance\n```',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <Line x1={40} y1={25} x2={18} y2={12} />
        <Line x1={40} y1={25} x2={62} y2={12} />
        <Line x1={18} y1={12} x2={10} y2={38} />
        <Line x1={62} y1={12} x2={70} y2={38} />
        <CircleNode x={40} y={25} r={9} color={c} />
        <RoundedNode x={18} y={12} w={16} h={10} color={c2} />
        <RoundedNode x={62} y={12} w={16} h={10} color={c2} />
        <CircleNode x={10} y={38} r={4} color={c3} />
        <CircleNode x={70} y={38} r={4} color={c3} />
        <text x={26} y={9} fontSize={5} fill="#fbbf24">📌</text>
        <text x={70} y={9} fontSize={5} fill="#fbbf24">📌</text>
        <SmallText x={40} y={25}>Root</SmallText>
      </svg>
    ),
  },
]
