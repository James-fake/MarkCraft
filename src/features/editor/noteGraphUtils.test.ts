/**
 * P1-4 反链/迷你图谱纯函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  parseWikiLinks,
  extractNeighborhood,
  layoutMiniGraph,
} from './noteGraphUtils'

describe('parseWikiLinks', () => {
  it('解析普通 wikilink', () => {
    const r = parseWikiLinks('see [[Note A]] here')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ target: 'Note A', embed: false })
  })

  it('解析带别名', () => {
    const r = parseWikiLinks('[[Note A|别名显示]]')
    expect(r[0].target).toBe('Note A')
    expect(r[0].alias).toBe('别名显示')
  })

  it('解析嵌入 ![[...]]', () => {
    const r = parseWikiLinks('![[Embedded]]')
    expect(r[0].embed).toBe(true)
    expect(r[0].target).toBe('Embedded')
  })

  it('无链接返回空', () => {
    expect(parseWikiLinks('just text')).toEqual([])
    expect(parseWikiLinks('[not a link]')).toEqual([])
  })

  it('解析多个链接', () => {
    const r = parseWikiLinks('[[A]] and [[B|bee]] and ![[C]]')
    expect(r.map(l => l.target)).toEqual(['A', 'B', 'C'])
    expect(r[2].embed).toBe(true)
  })

  it('空目标被跳过', () => {
    expect(parseWikiLinks('[[]]')).toEqual([])
    expect(parseWikiLinks('[[ | 只有别名]]')).toEqual([])
  })

  it('保留原始匹配串', () => {
    expect(parseWikiLinks('[[X]]')[0].raw).toBe('[[X]]')
  })
})

describe('extractNeighborhood', () => {
  const nodes = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ]
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'c' },
  ]

  it('提取中心 + 直接邻居', () => {
    const g = extractNeighborhood(nodes, edges, 'a')
    expect(g.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c'])
    expect(g.nodes.find(n => n.id === 'a')?.isCenter).toBe(true)
    expect(g.edges).toHaveLength(2) // a-b, a-c；b-c 不连 a 故排除
  })

  it('孤立中心节点', () => {
    const g = extractNeighborhood([{ id: 'a', label: 'A' }], [], 'a')
    expect(g.nodes).toHaveLength(1)
    expect(g.nodes[0].isCenter).toBe(true)
    expect(g.edges).toHaveLength(0)
  })

  it('仅保留中心与直接邻居，无关节点排除', () => {
    const g = extractNeighborhood(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'x', label: 'X' },
      ],
      [{ source: 'a', target: 'b' }],
      'a',
    )
    expect(g.nodes.map(n => n.id).sort()).toEqual(['a', 'b'])
    expect(g.nodes.find(n => n.id === 'a')?.isCenter).toBe(true)
    expect(g.edges).toHaveLength(1)
  })

  it('非邻居边被排除', () => {
    const g = extractNeighborhood(nodes, [{ source: 'b', target: 'c' }], 'a')
    expect(g.nodes.map(n => n.id)).toEqual(['a']) // 仅中心
    expect(g.edges).toHaveLength(0)
  })
})

describe('layoutMiniGraph', () => {
  const mini = {
    nodes: [
      { id: 'a', label: 'A', isCenter: true },
      { id: 'b', label: 'B', isCenter: false },
      { id: 'c', label: 'C', isCenter: false },
    ],
    edges: [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }],
  }

  it('确定性：同输入同输出', () => {
    const p1 = layoutMiniGraph(mini, 224, 168)
    const p2 = layoutMiniGraph(mini, 224, 168)
    expect(p1).toEqual(p2)
  })

  it('中心位于画布正中', () => {
    const p = layoutMiniGraph(mini, 224, 168)
    const center = p.find(n => n.isCenter)!
    expect(center.x).toBeCloseTo(112, 5)
    expect(center.y).toBeCloseTo(84, 5)
  })

  it('邻居数量与输入一致', () => {
    const p = layoutMiniGraph(mini, 224, 168)
    expect(p.filter(n => !n.isCenter)).toHaveLength(2)
  })

  it('所有坐标在画布范围内', () => {
    const p = layoutMiniGraph(mini, 224, 168)
    for (const n of p) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(224)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(168)
    }
  })

  it('无邻居时仅中心', () => {
    const p = layoutMiniGraph({ nodes: [{ id: 'a', label: 'A', isCenter: true }], edges: [] }, 224, 168)
    expect(p).toHaveLength(1)
  })
})
