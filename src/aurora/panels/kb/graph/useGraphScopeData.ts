/**
 * Aurora 知识图谱 · 数据范围状态族（scope / kbDocs / 裁剪集合 / realData 映射）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出。
 * 职责：三档范围（文件列表 / 全部文件 / 指定知识库）的状态、持久化、就绪判定与
 * 最终图数据（realData）的裁剪映射；不含布点与物理（在主面板 / graphModel）。
 */
import { useState, useMemo, useEffect } from 'react'
import { loadKb, getKbFiles } from '@stores/kbStore'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { GraphData } from '@stores/LinkIndexStore'
import type { FileNode } from '@src/types/fileManager'
import {
  DEFAULT_GRAPH_SCOPE, scopeKeyOf, parseScopeKey, readStoredScope, writeStoredScope,
  scopeGraphToKb, excludeGraphFiles,
} from './graphScope'
import { buildGraphData, type GNode, type GEdge } from './graphModel'

export interface GraphScopeDataOpts {
  /** 路由带入的知识库 id（「查看完整图谱」入口指令），可空 */
  kbId?: string
  rootFolder: FileNode
  activeFileId: string | null
  getFilePath: (id: string) => string
  tagIndex: Map<string, Set<string>>
  /** 链接索引的图数据构建（useLinkIndex().getGraphData，柯里化） */
  getGraphData: (tagIndex: Map<string, Set<string>>) => GraphData
  /** 知识库清单（useKbStore.kbList，响应式） */
  kbList: { id: string; name: string }[]
  /** 清单是否已加载过（useKbStore.version > 0） */
  kbListed: boolean
}

export function useGraphScopeData(p: GraphScopeDataOpts) {
  // —— 数据范围（2026-09-23 用户需求：默认「文件列表」+ 面板内可选库/全部）——
  // 范围状态 = 范围键（'files' | 'all' | 'kb:<id>'）。初始值优先取「路由指令」
  //（从知识库「查看完整图谱」进入时带 kbId），否则取上次记住的值（用户拍板：记住最后一次）。
  const [scope, setScope] = useState<string>(() => (p.kbId ? scopeKeyOf('kb', p.kbId) : readStoredScope()))
  const { kind: scopeKind, kbId: scopeKbId } = useMemo(() => parseScopeKey(scope), [scope])

  // 路由参数是「入口指令」：每次变化都覆盖当前范围（知识库 → 查看完整图谱 即为该库）
  useEffect(() => {
    if (p.kbId) setScope(scopeKeyOf('kb', p.kbId))
  }, [p.kbId])

  // 变更即持久化 —— 「记住最后一次」的唯一写点（路由带入的那次也算）
  useEffect(() => {
    writeStoredScope(scope)
  }, [scope])

  // 全部知识库文档：**一份数据供三处使用** —— ① 默认档的排除集合 ② 范围库本身 ③ 范围选择器选项。
  // 清单走 useKbStore().kbList（React 响应式，建/删库会自动刷新），再逐个 loadKb 取完整文档
  //（排除需要 folderId/fileIds/rules，列表项里没有）。
  // 刻意不用 useKbStore.activeKb：那是「知识库面板当前打开的库」，图谱既不该驱动它、也不该被它影响。
  const kbListKey = useMemo(() => p.kbList.map((k) => k.id).join('|'), [p.kbList])
  const [kbDocs, setKbDocs] = useState<KnowledgeBase[] | null>(null) // null = 尚未加载完
  useEffect(() => {
    if (!p.kbListed) return // 清单还没到：保持 null（= 未就绪），不产出「空的排除集合」
    let alive = true
    void Promise.all(p.kbList.map((k) => loadKb(k.id))).then((docs) => {
      if (!alive) return
      setKbDocs(docs.filter((d): d is KnowledgeBase => !!d))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.kbListed, kbListKey])

  /** 所有知识库的文件 id 全集 —— 默认档要排除的就是它。口径与知识库详情页 / 博客清单同源：getKbFiles */
  const allKbFileIds = useMemo(() => {
    const s = new Set<string>()
    for (const kb of kbDocs ?? []) for (const id of getKbFiles(p.rootFolder, kb)) s.add(id)
    return s
  }, [kbDocs, p.rootFolder])

  /** 当前范围选中的知识库文档（供裁剪用） */
  const scopeKb = useMemo(
    () => (scopeKind === 'kb' ? (kbDocs ?? []).find((k) => k.id === scopeKbId) ?? null : null),
    [scopeKind, scopeKbId, kbDocs],
  )
  /** 范围显示名（面包屑 / 状态栏 / 空态 / 选择器共用）：文档到位用文档，否则先拿列表项兜底 */
  const scopeKbName =
    scopeKb?.name ?? (scopeKind === 'kb' ? p.kbList.find((k) => k.id === scopeKbId)?.name : undefined) ?? ''

  const scopeKbFileIds = useMemo(
    () => (scopeKb ? new Set(getKbFiles(p.rootFolder, scopeKb)) : null),
    [scopeKb, p.rootFolder],
  )

  // 范围数据是否就绪：知识库文档没到位就先不裁剪（也不布点），否则会先画一版「全量」
  // 再收缩成子集 —— 看起来像图被刷新了一次，且违反「默认不含知识库文件」的语义。
  const scopeReady = scopeKind === 'all' || (p.kbListed && kbDocs !== null && (scopeKind !== 'kb' || !!scopeKbFileIds))

  /** 当前范围显示名（面包屑 / 状态栏 / 画布角标 / 空态共用）；默认档返回空串 = 「无需标注」 */
  const scopeLabel = scopeKind === 'kb' ? scopeKbName || '知识库' : scopeKind === 'all' ? '全部文件' : ''

  /** 范围选择器选项：默认档在最前，然后「全部文件」，最后每个知识库一档 */
  const scopeOptions = useMemo(
    () => [
      { value: DEFAULT_GRAPH_SCOPE, label: '文件列表（不含知识库）' },
      { value: 'all', label: '全部文件' },
      ...p.kbList.map((k) => ({ value: scopeKeyOf('kb', k.id), label: `知识库 · ${k.name}` })),
    ],
    [p.kbList],
  )

  // 记着（或在路由里带着）的知识库已被删除 ⇒ 静默回落默认档。
  // 不回落的话会永远停在一张空图上 —— 空态也说不出「这库已经没了」。
  // ⚠️ 判据必须等清单真的加载过（kbListed）：否则首帧 kbList=[] 会把范围误判成「库已删除」。
  useEffect(() => {
    if (!p.kbListed || kbDocs === null) return
    if (scopeKind !== 'kb') return
    if (kbDocs.some((k) => k.id === scopeKbId)) return
    setScope(DEFAULT_GRAPH_SCOPE)
  }, [p.kbListed, scopeKind, scopeKbId, kbDocs])

  const graph = useMemo(() => p.getGraphData(p.tagIndex), [p.getGraphData, p.tagIndex])
  const realData = useMemo(() => {
    const empty = { nodes: [] as GNode[], edges: [] as GEdge[] }
    if (!scopeReady) return empty
    const base = buildGraphData(graph, p.rootFolder, p.activeFileId, p.getFilePath, p.tagIndex)
    if (scopeKind === 'kb') return scopeKbFileIds ? scopeGraphToKb(base, scopeKbFileIds) : empty
    if (scopeKind === 'files') return excludeGraphFiles(base, allKbFileIds)
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, scopeReady, scopeKind, scopeKbFileIds, allKbFileIds, p.rootFolder, p.activeFileId, p.getFilePath, p.tagIndex])
  const allTags = useMemo(
    () => Array.from(p.tagIndex.keys()).map((x) => (x.includes('/') ? x.split('/').pop()! : x)),
    [p.tagIndex],
  )

  return {
    scope, setScope, scopeKind, scopeKbId, scopeKb, scopeKbName,
    scopeLabel, scopeReady, scopeOptions, scopeKbFileIds, allKbFileIds,
    realData, allTags,
  }
}
