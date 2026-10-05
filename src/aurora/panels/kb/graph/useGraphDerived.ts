/**
 * Aurora 知识图谱 · 派生集合（邻接 / 模式作用域 / 可见性 / 分组聚合 / 搜索命中 / dim 判定）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出：全部为「由状态 → 集合」的纯派生，无副作用。
 */
import { useMemo, useCallback } from 'react'
import type { GNode, GEdge, GraphMode, GraphGroup } from './graphModel'

export interface GraphDerivedOpts {
  nodesRef: { readonly current: GNode[] }
  edgesRef: { readonly current: GEdge[] }
  /** 节点/边集合版本号（布点 effect 中自增） */
  graphRev: number
  // 模式
  mode: GraphMode
  centerId: string
  depth: number
  // 筛选
  hidden: Set<string>
  showNote: boolean
  showTag: boolean
  showFolder: boolean
  showOrphan: boolean
  minConn: number
  selectedTags: string[]
  extraNeighbors: Set<string>
  search: string
  // 着色分组
  focusGroup: string | null
  groups: GraphGroup[]
  groupKeyFor: (n: GNode) => string
  groupMeta: Record<string, { name: string; color: string }>
  /** 高亮锚点（hoverId ?? selectedId）：邻域之外压暗 */
  highlightId: string | null
}

export function useGraphDerived(p: GraphDerivedOpts) {
  // ---- 邻接 ----
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const add = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set())
      m.get(a)!.add(b)
    }
    p.edgesRef.current.forEach((e) => {
      if (e.kind === 'tag' || e.kind === 'folder') return
      add(e.source, e.target)
      add(e.target, e.source)
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.graphRev])

  const neighborsOf = useCallback(
    (id: string) => {
      const s = new Set<string>([id])
      ;(adjacency.get(id) || []).forEach((n) => s.add(n))
      return s
    },
    [adjacency],
  )

  // ---- 图谱模式作用域（modeScope：由 mode/centerId/depth 派生的可见集合）----
  // ⚠️ 名字刻意不叫 scope —— 那是「数据范围」（画哪些文件），两者是不同维度：
  // 数据范围决定节点集合，本作用域再在集合内按模式收窄（全局/局部/反向/正向/标签）。
  const modeScope = useMemo(() => {
    if (p.mode === 'global') return null
    const set = new Set<string>([p.centerId])
    if (p.mode === 'local') {
      let frontier = [p.centerId]
      for (let d = 0; d < p.depth; d++) {
        const next: string[] = []
        frontier.forEach((id) =>
          (adjacency.get(id) || []).forEach((n) => {
            if (!set.has(n)) {
              set.add(n)
              next.push(n)
            }
          }),
        )
        frontier = next
      }
    } else if (p.mode === 'backlinks') {
      p.edgesRef.current.forEach((e) => {
        if (e.kind !== 'tag' && e.kind !== 'folder' && e.target === p.centerId) set.add(e.source)
      })
    } else if (p.mode === 'forwardlinks') {
      p.edgesRef.current.forEach((e) => {
        if (e.kind !== 'tag' && e.kind !== 'folder' && e.source === p.centerId) set.add(e.target)
      })
    } else if (p.mode === 'tag') {
      // 以标签节点为中心，纳入与其相连的笔记
      p.edgesRef.current.forEach((e) => {
        if (e.kind === 'tag') {
          if (e.target === p.centerId) set.add(e.source)
          if (e.source === p.centerId) set.add(e.target)
        }
      })
    }
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.mode, p.centerId, p.depth, adjacency, p.graphRev])

  // ---- 可见性（组合所有筛选）----
  const visibleIds = useMemo(() => {
    const set = new Set<string>()
    p.nodesRef.current.forEach((n) => {
      if (p.hidden.has(n.id)) return
      if (n.type === 'file' && !p.showNote) return
      if (n.type === 'tag' && !p.showTag) return
      if (n.type === 'folder' && !p.showFolder) return
      if (n.type === 'file' && n.deg === 0 && !p.showOrphan) return
      if (n.deg < p.minConn) return
      if (p.selectedTags.length > 0) {
        const ok =
          (n.type === 'file' && n.tags.some((t) => p.selectedTags.includes(t))) ||
          (n.type === 'tag' && p.selectedTags.includes(n.label)) ||
          n.type === 'folder'
        if (!ok) return
      }
      if (modeScope && !modeScope.has(n.id) && !p.extraNeighbors.has(n.id)) return
      set.add(n.id)
    })
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: p.graphRev 为 nodesRef.current 读取的失效闸（体读 ref，规则视为不必要实为故意）
  }, [p.hidden, p.showNote, p.showTag, p.showFolder, p.showOrphan, p.minConn, p.selectedTags, modeScope, p.graphRev, p.extraNeighbors, p.nodesRef])

  // 方案 C · 着色分组导航聚合：依赖 visibleIds，置于其声明之后
  const groupAgg = useMemo(() => {
    const map = new Map<string, { key: string; name: string; color: string; count: number }>()
    p.nodesRef.current.forEach((n) => {
      if (!visibleIds.has(n.id)) return
      const key = p.groupKeyFor(n)
      let meta: { name: string; color: string }
      if (key.startsWith('grp:')) {
        const g = p.groups.find((x) => `grp:${x.id}` === key)
        meta = g ? { name: g.name, color: g.color } : p.groupMeta.note
      } else {
        meta = p.groupMeta[key]
      }
      if (!map.has(key)) map.set(key, { key, name: meta.name, color: meta.color, count: 0 })
      map.get(key)!.count++
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, p.groupKeyFor, p.groups, p.graphRev, p.nodesRef])

  // 搜索匹配
  const matchedIds = useMemo(() => {
    if (!p.search.trim()) return null
    const q = p.search.trim().toLowerCase()
    const s = new Set<string>()
    p.nodesRef.current.forEach((n) => {
      if (n.label.toLowerCase().includes(q)) s.add(n.id)
    })
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.search, p.graphRev, p.nodesRef])

  const highlightSet = p.highlightId ? neighborsOf(p.highlightId) : null

  // 节点 id → 节点 索引表。isDim / isEdgeDim 会对每个节点、每条边各调用一次，
  // 原实现用 Array.find 线性查找 → 整体退化成 O(N²)；改 Map 查表后为 O(1)（审查 M5）。
  const nodeById = useMemo(() => {
    const m = new Map<string, GNode>()
    p.nodesRef.current.forEach((n) => m.set(n.id, n))
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps -- graphRev 为节点重建的变更信号（nodesRef 是稳定 ref，须靠 graphRev 触发重算）
  }, [p.graphRev, p.nodesRef])

  const isDim = (id: string): boolean => {
    if (matchedIds) return !matchedIds.has(id)
    if (p.focusGroup) {
      const n = nodeById.get(id)
      return n ? p.groupKeyFor(n) !== p.focusGroup : false
    }
    if (highlightSet) return !highlightSet.has(id)
    if (modeScope) return !modeScope.has(id)
    return false
  }
  const isEdgeDim = (s: string, t: string): boolean => {
    if (matchedIds) return !(matchedIds.has(s) || matchedIds.has(t))
    if (p.focusGroup) {
      const ns = nodeById.get(s)
      const nt = nodeById.get(t)
      const ks = ns ? p.groupKeyFor(ns) : ''
      const kt = nt ? p.groupKeyFor(nt) : ''
      return ks !== p.focusGroup && kt !== p.focusGroup
    }
    if (highlightSet) return !(highlightSet.has(s) || highlightSet.has(t))
    if (modeScope) return !(modeScope.has(s) || modeScope.has(t))
    return false
  }

  return { adjacency, neighborsOf, modeScope, visibleIds, groupAgg, matchedIds, isDim, isEdgeDim }
}
