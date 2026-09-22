// 知识库概览「专属图谱」迷你节点图 —— 由真实 LinkIndex 过滤到 KB 文件子集（节点=笔记 · 连线=引用）。
//
// 为什么要单独成文件（2026-09-22 报障「点第一篇 00 开始使用.md 会回到/停在知识库详情界面」）：
//   全应用穷举（`.workbuddy/artifacts/cdp-sweep-kb-alltabs-firstdoc.mjs`，扫遍 7 个 Tab +
//   编辑器 + 图谱）后，渲染「00 开始使用」的元素只有 6 处，其中 5 处都是已接线的可点行
//   （KbFileRow ×3 / EmptyFileBrowser / 欢迎页 hero），**唯一「看着可点、点了不动」的就是本图**：
//     · 12 个节点圆点写着 `cursor: pointer`，但整张图**没有任何点击处理**；
//     · 而全图**只给一个节点渲染名字**（`currentId` = `miniNodes[0]`）——
//       库内引用最多、排在首位的那篇正是「00 开始使用」。
//   ⇒ 用户唯一看得见、又"看着能点"的那个笔记名，点了毫无反应 ⇒ 表现为「只有第一篇点不动」。
//
// 修法沿用 KbFileRow 的既定原则：
//   · **可交互性由「有没有 onSelect」派生**（`.is-interactive` / role / tabIndex / 键盘），
//     绝不为纯展示图伪造可点暗示（`cursor: pointer` 也跟着改成条件式，见 kb.css）；
//   · 每个节点补 `<title>`，让名字**可发现**（此前只有 currentId 一个节点有可见名字，
//     其余节点无名可读，等于把「可点目标」只摆在第一篇上）。
//
// 设计约束：
//   · 图内坐标是 0–100 的 viewBox 空间（非像素），几何沿用原实现，不动视觉；
//   · Enter 与 Space 都要能触发（桌面应用行内按钮的键盘惯例）。
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface MiniGraphNode {
  id: string
  label: string
}

export interface MiniGraphProps {
  nodes: MiniGraphNode[]
  edges: [string, string][]
  /** 高亮并渲染名字的节点（通常是引用最多的一篇） */
  currentId?: string
  /**
   * 提供后节点才成为可交互节点（点击 / 回车 / 空格 → 在编辑器中打开该笔记）；
   * 缺省为纯展示图 —— 与 KbFileRow 同一套「有 handler 才算可交互」的规则。
   */
  onSelect?: (id: string) => void
}

export function MiniGraph({ nodes, edges, currentId, onSelect }: MiniGraphProps) {
  const N = nodes.length || 1
  const interactive = !!onSelect
  const positioned = nodes.map((n, i) => {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2
    return {
      ...n,
      x: 50 + 36 * Math.cos(ang),
      y: 50 + 36 * Math.sin(ang),
      r: n.id === currentId ? 7 : 4.5,
    }
  })
  const posById = new Map(positioned.map((p) => [p.id, p]))
  return (
    <svg className="aurora-kb-minigraph" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-label="专属知识图谱">
      {edges.map(([a, b], i) => {
        const na = posById.get(a)
        const nb = posById.get(b)
        if (!na || !nb) return null
        return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="aurora-kb-minigraph__edge" />
      })}
      {positioned.map((n) => (
        <g
          key={n.id}
          className={`aurora-kb-minigraph__g${interactive ? ' is-interactive' : ''}`}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? `在编辑器中打开「${n.label}」` : undefined}
          onClick={interactive ? () => onSelect?.(n.id) : undefined}
          onKeyDown={
            interactive
              ? (e: ReactKeyboardEvent<SVGGElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect?.(n.id)
                  }
                }
              : undefined
          }
        >
          {/* 悬停即知节点是谁：此前只有 currentId 一个节点有可见名字 */}
          <title>{n.label}</title>
          <circle
            cx={n.x} cy={n.y} r={n.r}
            className={`aurora-kb-minigraph__node ${n.id === currentId ? 'aurora-kb-minigraph__node--current' : 'aurora-kb-minigraph__node--file'}`}
          />
          {n.id === currentId && (
            <text x={n.x} y={n.y + n.r + 4} className="aurora-kb-minigraph__label">{n.label}</text>
          )}
        </g>
      ))}
    </svg>
  )
}
