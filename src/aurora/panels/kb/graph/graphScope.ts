import { readGraphSession, type GraphSession } from '../graphSession'
import type { GNode, GEdge } from './graphModel'
import { keepFilesByPredicate } from './graphModel'

/**
 * 双链图谱 · 数据范围与现场隔离（P2-3 从 GraphPanel.tsx 拆出，2026-09-28）
 * ==========================================================================
 * 承载：三档范围（files/all/kb）的定义与范围键编码、localStorage 持久化、
 * 「按范围匹配」的图谱现场读取、知识库裁剪 / 排除两个谓词入口。
 * 纯逻辑层：无 React（localStorage 读写带 try/catch 兜底）。
 */

/**
 * 读取「与本范围匹配」的图谱现场。
 *
 * graphSession 是模块级单例，若不按范围隔离，会出现两类串台：
 *  - 某知识库图谱 → 侧栏进默认范围：沿用范围图的坐标/中心 ⇒ 图少了一半、位置却还是那半张；
 *  - 默认范围 → 某知识库：中心节点指向库外笔记（sceneRef 的 centerId 不在本图里）。
 * 故把「范围键」也记进现场，范围不符即视为无现场（重新布点，符合直觉）。
 */
export function readScopedSession(scope: string): GraphSession | null {
  const s = readGraphSession()
  return s && s.scope === scope ? s : null
}

// ---- 数据范围（2026-09-23 用户需求：三档范围 + 选择器）----
/**
 * 数据范围三档：
 *  - 'files'：**默认**。只画「文件列表」里的文件 —— 口径 B（用户拍板）= 排除**所有**知识库
 *    （含内置《MarkCraft 使用文档》）的文件，只留不属于任何知识库的散装笔记；
 *  - 'all'  ：整个 MarkCraft 的文件全部画出来；
 *  - 'kb'   ：只画所选知识库的文件（知识库「查看完整图谱」入口也归这一档）。
 *
 * 三档是**同一份全量图**的三种过滤谓词（见 keepFilesByPredicate），
 * 不改变数据来源，也不动索引层。
 */
export type GraphScopeKind = 'files' | 'kb' | 'all'

export const DEFAULT_GRAPH_SCOPE = 'files'

/**
 * 范围键：'files' | 'all' | 'kb:<库 id>'。
 * 单一表示 —— 组件状态、graphSession 现场键、localStorage 持久化都用它，
 * 避免出现「同一件事三种编码」的漂移。
 */
export function scopeKeyOf(kind: GraphScopeKind, kbId?: string): string {
  return kind === 'kb' ? `kb:${kbId ?? ''}` : kind
}

/** 解析范围键。非法/脏数据一律回落到默认档 —— 绝不因为一条脏值把图谱画成空白 */
export function parseScopeKey(key: string): { kind: GraphScopeKind; kbId: string } {
  if (key === 'all') return { kind: 'all', kbId: '' }
  if (key.startsWith('kb:') && key.length > 3) return { kind: 'kb', kbId: key.slice(3) }
  return { kind: 'files', kbId: '' }
}

// 范围选择的持久化（用户拍板：记住最后一次；与颜色分组 GROUPS_KEY 同款 localStorage 模式）
const SCOPE_STORE_KEY = 'markcraft-graph-scope'
export function readStoredScope(): string {
  try {
    const { kind, kbId } = parseScopeKey(localStorage.getItem(SCOPE_STORE_KEY) ?? '')
    return scopeKeyOf(kind, kbId)
  } catch {
    return DEFAULT_GRAPH_SCOPE // 隐私模式等取不到 localStorage：按默认档走
  }
}
export function writeStoredScope(key: string): void {
  try {
    localStorage.setItem(SCOPE_STORE_KEY, key)
  } catch {
    /* 存不了就不记，不影响本次浏览 */
  }
}

/**
 * 把全局图谱裁到「某个知识库」的范围（2026-09-23 用户需求）。
 *
 * 场景：知识库概览 →「查看完整图谱」进入双链图谱，此前看到的是**全库文件**的全局图，
 * 文件管理器里跟这个知识库无关的笔记也混在里面。要求：只留该知识库的文件节点。
 * 判据与知识库详情页 KPI / 博客清单同源 —— 都是 `getKbFiles` 的结果。
 */
export function scopeGraphToKb(
  data: { nodes: GNode[]; edges: GEdge[] },
  kbFileIds: ReadonlySet<string>,
): { nodes: GNode[]; edges: GEdge[] } {
  return keepFilesByPredicate(data, (id) => kbFileIds.has(id))
}

/**
 * 排除「若干知识库」的全部文件（2026-09-23 用户需求：默认「文件列表」范围）。
 *
 * 场景：图谱默认形态不再显示任何知识库里的文件 —— 用户的原话是
 * 「默认不显示知识库中文件节点，只显示文件列表中的文件节点」。
 * 口径 B（用户拍板）：**所有**知识库（含内置《MarkCraft 使用文档》）的文件都排除，
 * 只留不属于任何知识库的散装笔记；要看某个库就显式选它。
 *
 * 与 scopeGraphToKb 是同一个核心的两种谓词（保留 vs 排除），
 * 所以「标签两步法」的坑在此自动继承、无需重复实现。
 */
export function excludeGraphFiles(
  data: { nodes: GNode[]; edges: GEdge[] },
  excludedFileIds: ReadonlySet<string>,
): { nodes: GNode[]; edges: GEdge[] } {
  return keepFilesByPredicate(data, (id) => !excludedFileIds.has(id))
}
