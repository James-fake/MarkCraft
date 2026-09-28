import { describe, it, expect } from 'vitest'
import { scopeGraphToKb, excludeGraphFiles } from './graph/graphScope'
import type { GNode, GEdge } from './graph/graphModel'

/**
 * 双链图谱「知识库范围」裁剪回归锁（2026-09-23 用户报障）
 *
 * 报障原话：「现在 markcraft 使用文档知识库有图谱，点击查看完整图谱后去到双链图谱功能界面，
 * 但是会有文件列表中的文件在其中，现在要求只要有这个知识库文件节点」。
 *
 * 数据链路：KbPanel 概览「查看完整图谱」→ nav('graph', kbId) → useAuroraShell 映射 kbId
 * → AuroraShell 透传给 GraphPanel → getKbFiles(rootFolder, kb) 得库内文件 id 集合
 * → scopeGraphToKb 把全局图裁到该集合。
 *
 * 本文件只锁「裁剪判据」这一层（纯函数，无 React/无 store）；
 * 「入口有没有把 kbId 传下来」由 KbPanel.smoke.test.tsx 与 GraphPanel.smoke.test.tsx 分别锁。
 */

const node = (id: string, type: 'file' | 'tag' | 'folder'): GNode => ({
  id,
  label: id,
  type,
  tags: [],
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  tx: 0,
  ty: 0,
  inLinks: 0,
  outLinks: 0,
  deg: 0,
  hidden: false,
})

const edge = (source: string, target: string, kind: GEdge['kind']): GEdge => ({ source, target, kind })

/**
 * 场景图（贴近真实数据形态）：
 *   文件：A、B 在库内；C 在库外（文件管理器里的普通笔记）
 *   标签：tag:T1 只被库内 A 用；tag:T2 只被库外 C 用；tag:T3 库内库外都用
 *   边  ：A→B（库内互链）、B→C（跨库）、A→tag:T1、C→tag:T2、A→tag:T3、C→tag:T3
 */
const baseGraph = () => ({
  nodes: [
    node('A', 'file'),
    node('B', 'file'),
    node('C', 'file'),
    node('tag:T1', 'tag'),
    node('tag:T2', 'tag'),
    node('tag:T3', 'tag'),
  ],
  edges: [
    edge('A', 'B', 'wiki'),
    edge('B', 'C', 'wiki'),
    edge('A', 'tag:T1', 'tag'),
    edge('C', 'tag:T2', 'tag'),
    edge('A', 'tag:T3', 'tag'),
    edge('C', 'tag:T3', 'tag'),
  ],
})

const ids = (ns: GNode[]) => ns.map((n) => n.id).sort()
const edgeKeys = (es: GEdge[]) => es.map((e) => `${e.source}->${e.target}`).sort()

describe('scopeGraphToKb —— 把全局图谱裁到某个知识库', () => {
  const KB = new Set(['A', 'B'])

  it('① 库外文件节点整体消失（报障的核心诉求）', () => {
    const out = scopeGraphToKb(baseGraph(), KB)
    expect(ids(out.nodes)).toEqual(['A', 'B', 'tag:T1', 'tag:T3'])
  })

  it('② 跨库的边整条丢弃 —— 不允许「线还在、对面是鬼」', () => {
    const out = scopeGraphToKb(baseGraph(), KB)
    expect(edgeKeys(out.edges)).toEqual(['A->B', 'A->tag:T1', 'A->tag:T3'])
    expect(edgeKeys(out.edges).some((k) => k.includes('C'))).toBe(false)
  })

  it('③ 只被库外笔记使用的标签不残留成孤岛', () => {
    const out = scopeGraphToKb(baseGraph(), KB)
    expect(ids(out.nodes)).not.toContain('tag:T2')
    // 但库内库外共用的标签要留下（库内笔记确实连到它）
    expect(ids(out.nodes)).toContain('tag:T3')
  })

  it('④ 对照：全库命中时与输入等价（裁剪不得误伤完整图）', () => {
    const input = baseGraph()
    const out = scopeGraphToKb(input, new Set(['A', 'B', 'C']))
    expect(ids(out.nodes)).toEqual(ids(input.nodes))
    expect(edgeKeys(out.edges)).toEqual(edgeKeys(input.edges))
  })

  it('⑤ 空库 → 空图（图谱走空态，不留下任何标签或边）', () => {
    const out = scopeGraphToKb(baseGraph(), new Set<string>())
    expect(out.nodes).toEqual([])
    expect(out.edges).toEqual([])
  })

  it('⑥ 库内孤立笔记不被误删（deg=0 的保留与否归「孤立」显示开关管，不归范围管）', () => {
    const data = {
      nodes: [node('A', 'file'), node('Solo', 'file'), node('C', 'file')],
      edges: [edge('A', 'C', 'wiki')],
    }
    const out = scopeGraphToKb(data, new Set(['A', 'Solo']))
    expect(ids(out.nodes)).toEqual(['A', 'Solo'])
    expect(out.edges).toEqual([])
  })

  it('⑦ 不改动入参（纯函数：同样的输入两次调用结果一致）', () => {
    const input = baseGraph()
    const snapshot = JSON.stringify(input)
    scopeGraphToKb(input, KB)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})

/**
 * 默认「文件列表」范围（2026-09-23 用户需求，口径 B）
 *
 * 用户原话：「进入双链图谱默认不显示知识库中文件节点，只显示文件列表中的文件节点」，
 * 并明确选了口径 B —— **排除所有知识库**（含内置《MarkCraft 使用文档》）的文件，
 * 只留不属于任何知识库的散装笔记；要看某个库就显式选它。
 *
 * 与 scopeGraphToKb 共用同一份两步裁剪核心，故这里的用例集中在「排除侧」的判据，
 * 尤其是「只被被排除文件使用的标签不得残留」与「空排除集必须等价于不裁剪」。
 */
describe('excludeGraphFiles —— 排除所有知识库文件（默认「文件列表」范围）', () => {
  // 场景同 baseGraph：A、B 属知识库；C 是散装笔记
  const KB_FILES = new Set(['A', 'B'])

  it('① 知识库里的文件节点整体消失，库外散装笔记保留', () => {
    const out = excludeGraphFiles(baseGraph(), KB_FILES)
    expect(ids(out.nodes)).toEqual(['C', 'tag:T2', 'tag:T3'])
  })

  it('② 只被被排除文件使用的标签不残留成孤岛', () => {
    const out = excludeGraphFiles(baseGraph(), KB_FILES)
    // tag:T1 仅被库内的 A 使用 ⇒ 随 A 一起离开
    expect(ids(out.nodes)).not.toContain('tag:T1')
    // tag:T3 库内库外都用 ⇒ 保留（库外笔记确实连到它）
    expect(ids(out.nodes)).toContain('tag:T3')
  })

  it('③ 跨界的边整条丢弃 —— 不允许「线还在、对面是鬼」', () => {
    const out = excludeGraphFiles(baseGraph(), KB_FILES)
    expect(edgeKeys(out.edges)).toEqual(['C->tag:T2', 'C->tag:T3'])
    expect(edgeKeys(out.edges).some((k) => k.includes('A') || k.includes('B'))).toBe(false)
  })

  it('④ 对照：空排除集等价于不裁剪（没有知识库时默认范围不得误伤整图）', () => {
    const input = baseGraph()
    const out = excludeGraphFiles(input, new Set<string>())
    expect(ids(out.nodes)).toEqual(ids(input.nodes))
    expect(edgeKeys(out.edges)).toEqual(edgeKeys(input.edges))
  })

  it('⑤ 全部排除 → 空图（图谱走空态，不留下任何标签或边）', () => {
    const out = excludeGraphFiles(baseGraph(), new Set(['A', 'B', 'C']))
    expect(out.nodes).toEqual([])
    expect(out.edges).toEqual([])
  })

  it('⑥ 与 scopeGraphToKb 互为补集：同一集合下文件节点恰好被一分为二', () => {
    const kept = scopeGraphToKb(baseGraph(), KB_FILES)
    const rest = excludeGraphFiles(baseGraph(), KB_FILES)
    const fileIds = (r: { nodes: GNode[] }) => r.nodes.filter((n) => n.type === 'file').map((n) => n.id).sort()
    expect([...fileIds(kept), ...fileIds(rest)].sort()).toEqual(['A', 'B', 'C'])
    expect(fileIds(kept).filter((id) => fileIds(rest).includes(id))).toEqual([])
  })

  it('⑦ 不改动入参（纯函数：同样的输入两次调用结果一致）', () => {
    const input = baseGraph()
    const snapshot = JSON.stringify(input)
    excludeGraphFiles(input, KB_FILES)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})
