import { useMemo, useState, useEffect, useCallback } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import { useFileManager } from '@stores/FileStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { KbSearchPanel } from '@features/knowledgeBase/components/KbSearchPanel'
import { setEditorReturn } from '../../navigation/navReturn'
import { readKbTab, saveKbTab } from './kbSession'
import KbChatPanel from '@features/knowledgeBase/components/KbChatPanel'
import { KbExportMenu } from '@features/knowledgeBase/components/KbExportMenu'
import { FileDependencyPanel } from '@features/knowledgeBase/components/FileDependencyPanel'
import { findNode } from '@core/files/fileTree'
import { loadKb, getKbList, getKbFiles, updateDescription, deleteKb } from '@stores/kbStore'
import { calculateKbHealth } from '@features/knowledgeBase'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'
import { TABS, type KbTab, type OverviewData } from './kbPanelShared'
import { OverviewTab } from './OverviewTab'
import { NotesTab } from './NotesTab'
import { DependencyTab } from './DependencyTab'
import { MocTab } from './MocTab'
import { EditKbModal } from './EditKbModal'
import { DeleteKbModal } from './DeleteKbModal'
import { KbCanvasSection } from './KbCanvasSection'
import '../../styles/panels/kb.css'
// 使用优化④：kb-* 组件类（搜索/问答/导出/依赖内嵌 features 组件）单源样式此前从未被任何入口加载，
// 导致搜索 tab 布局裸奔（元素堆左上角）；主题差异由 kb.css 的 .aurora-kb.kb-shell 复合选择器重映射兜底。
import '@features/knowledgeBase/kb-ui.css'

/**
 * Aurora 知识库工作室面板（详情页）
 *
 * 对齐项目实际功能（src/features/knowledgeBase/）：
 * - KbManager 外壳（Topbar + 左分类导航 + 内容区）
 * - KbDashboard 概览首屏（5 KPI + 健康度 + AI 摘要 + 最近活动 + 标签体系 + 专属图谱）
 * - 11 个 Tab 可切换（概览/笔记/搜索/任务/目标/回顾/问答/依赖/MOC/盲区/导出）
 *
 * 数据层（2026-08-26 换芯）：移除 MOCK_KBS / 写死 KPI，全部由真实来源派生：
 *  - kb 文档：loadKb(kbId)（IndexedDB / canvas-v2 同款存储）
 *  - 文件集合：getKbFiles(rootFolder, kb) → 真实文件节点
 *  - KPI：字数（中文字+英文词）、标签数（TagIndex 跨 KB 文件）、白板数（kb.canvasIds）
 *  - 双链数：LinkIndex.getGraphData 中两端均在 KB 内的 wikilink 去重计数
 *  - 健康度：复用真实 calculateKbHealth（链接密度/非孤立率/标签覆盖/更新活跃 四维）
 *  - 最近活动 / 标签体系：由 KB 文件 updatedAt / TagIndex 真实派生
 *  - 专属图谱：由 getGraphData 过滤到 KB 文件子集（节点=笔记·连线=引用）
 *
 * P4-1 拆分（2026-10）：各 Tab / Modal / 白板区块已按哑组件边界抽为同目录子文件
 * （OverviewTab / NotesTab / DependencyTab / MocTab / EditKbModal / DeleteKbModal /
 * KbCanvasSection），共享模型在 ./kbPanelShared；本文件只保留主组件的
 * 数据派生、导航动作与 PageFrame 骨架。
 */

export interface KbPanelProps {
  kbId?: string
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
}

// kbSession 以 `import type { KbTab } from './KbPanel'` 引用 —— 拆分后保持再导出，外部路径不变
export type { KbTab }

export function KbPanel({ kbId, nav, toast }: KbPanelProps) {
  /**
   * Tab 现场记忆（kbSession）：KB → 编辑器（点笔记）→ 「← 返回 XX」的往返中本组件会
   * 整体卸载重挂，若不复用记忆，用户离开时所在的 Tab（如「笔记」）会复位成「概览」——
   * 报障原话「点击笔记…直接回到了知识库详细界面的概览页面中」。故初始值读记忆，
   * 每次切换写回（见 setTab）。
   */
  const [tab, setTabState] = useState<KbTab>(() => readKbTab(kbId) ?? 'overview')
  const setTab = useCallback(
    (next: KbTab) => {
      setTabState(next)
      saveKbTab(kbId, next)
    },
    [kbId],
  )
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 换库（kbId 变化）时同步该库自己记住的 Tab；无记忆则回「概览」
  useEffect(() => {
    setTabState(readKbTab(kbId) ?? 'overview')
  }, [kbId])

  /**
   * 顶栏 subbar tab 栏 = Apple 分段控件式滑块（需求 N 第四轮定案）。
   *
   * 一条**常驻滑块**覆盖在选中项上；按住 tab 拖动时**只有滑块**跟手滑，
   * tab 文字与内容区一个像素都不动；松手滑块过渡滑到最近的 tab（拖过一半就切）。
   * 形态与参数说明见 hooks/tabStripSwipe.ts。
   */
  const tabs = useTabStripThumb({
    index: Math.max(0, TABS.findIndex((t) => t.id === tab)),
    count: TABS.length,
    onIndexChange: (next) => setTab(TABS[next].id),
  })

  const { rootFolder, renameNode, deleteNode, createFile, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const { getBacklinks, getOutgoingLinks, getGraphData } = useLinkIndex()
  const { tagIndex, getTagsForFile } = useTagIndex()
  // 顶栏操作 + 覆盖层状态
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dependencyFileId, setDependencyFileId] = useState<string | null>(null)

  // 加载真实知识库文档（优先 kbId，缺省取列表首项）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let target = kbId ?? null
        if (!target) {
          const list = await getKbList()
          if (list.length) target = list[0].id
        }
        const doc = target ? await loadKb(target) : null
        if (!alive) return
        setKb(doc)
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [kbId])

  /**
   * 写操作后回写本页 kb 文档。
   *
   * 🚨 单源澄清：本页的 kb 是**组件本地 state**（上面 useEffect 里 loadKb 得到），
   * store 的 addCanvas/removeCanvas 只负责持久化并刷新它自己那份 activeKb，
   * **不会**回流到这里的 state ⇒ 若不回写，「关联白板」列表新增/取消后界面不动，
   * 必须刷新页面重挂载才可见（2026-09-27 用户实测报障）。
   */
  const reloadKb = useCallback(async () => {
    if (!kb?.id) return
    const doc = await loadKb(kb.id)
    if (doc) setKb(doc)
  }, [kb?.id])

  // KB 文件集合（folder + 手动 + 规则）
  const kbFileIds = useMemo(() => (kb ? getKbFiles(rootFolder, kb) : []), [kb, rootFolder])
  const kbFiles = useMemo(
    () =>
      kbFileIds
        .map((id) => findNode(rootFolder, id))
        .filter((n): n is FileNode => !!n && n.type === 'file'),
    [kbFileIds, rootFolder],
  )

  // 概览派生数据
  const data = useMemo<OverviewData>(() => {
    const totalWords = kbFiles.reduce((sum, f) => {
      const c = f.content ?? ''
      const cn = (c.match(/[一-龥]/g) || []).length
      const en = (c.replace(/[一-龥]/g, ' ').trim().split(/\s+/).filter(Boolean)).length
      return sum + cn + en
    }, 0)

    const tagCounts = new Map<string, number>()
    for (const f of kbFiles) {
      for (const t of getTagsForFile(f.id)) tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }))

    const recentFiles = [...kbFiles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

    const backlinksFn = (id: string) => getBacklinks(id).map((r) => r.sourceFileId)
    const outgoingFn = (id: string) => getOutgoingLinks(id).map((r) => r.target)
    const health = kbFiles.length ? calculateKbHealth(kbFiles, backlinksFn, outgoingFn, getTagsForFile) : null

    // 库内双链数（两端均在 KB 文件的 wikilink 去重）
    const idSet = new Set(kbFileIds)
    const g = getGraphData(tagIndex)
    const seen = new Set<string>()
    for (const e of g.edges) {
      if (e.type !== 'wikilink') continue
      if (idSet.has(e.source) && idSet.has(e.target)) {
        seen.add([e.source, e.target].sort().join('|'))
      }
    }
    const linkCount = seen.size

    // 专属图谱子集
    const subNodes = g.nodes
      .filter((n) => idSet.has(n.id))
      .slice(0, 12)
      .map((n) => ({ id: n.id, label: n.label }))
    const subIds = new Set(subNodes.map((n) => n.id))
    const miniEdges = g.edges
      .filter((e) => e.type === 'wikilink' && subIds.has(e.source) && subIds.has(e.target))
      .map((e) => [e.source, e.target] as [string, string])

    return {
      fileCount: kbFiles.length,
      canvasCount: kb?.canvasIds.length ?? 0,
      tagCount: tagCounts.size,
      totalWords,
      linkCount,
      health,
      recentFiles,
      topTags,
      aiSummary: kb?.aiSummary,
      miniNodes: subNodes,
      miniEdges,
    }
  }, [kbFiles, kb, kbFileIds, getTagsForFile, getBacklinks, getOutgoingLinks, getGraphData, tagIndex])

  const kbName = kb?.name ?? ''
  const healthTotal = data.health?.total ?? null

  // 图谱入口单源：带上本库 id，AuroraShell 据此把「双链图谱」裁到本库文件节点
  // （不带 id 的调用形态保持不变 ⇒ 侧栏 / 菜单栏 / 命令面板进入仍为全局图谱）
  const openFullGraph = useCallback(() => {
    if (kb) nav?.('graph', kb.id)
    else nav?.('graph')
  }, [kb, nav])

  const handleNav = (id: string) => {
    if (id === '图谱') {
      openFullGraph()
      return
    }
    nav?.(resolveAuroraNav(id))
  }

  // 发布博客：跳转至博客工作室界面，并带入知识库来源（仅展示该库内笔记）
  const handlePublishBlog = useCallback(() => {
    if (!kb) return
    nav?.('blog', kb.id)
  }, [kb, nav])

  // 跳转到编辑器打开指定笔记（打通 KB 笔记 → 编辑器 闭环，替代原内嵌查看器死胡同）
  const openInEditor = useCallback((id: string) => {
    if (!kb) return
    setEditorReturn({ view: 'kb', kbId: kb.id, label: kb.name })
    openFile(id)
    nav?.('editor')
  }, [kb, openFile, nav])

  // 在知识库文件夹下新建一篇笔记并直接进编辑器（解决「无处添加笔记」）
  const handleCreateNote = useCallback(() => {
    if (!kb) return
    createFile(kb.folderId, `新笔记-${Date.now()}.md`, '')
    setEditorReturn({ view: 'kb', kbId: kb.id, label: kb.name })
    nav?.('editor')
  }, [kb, createFile, nav])

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="知识库"
      onSidebarSelect={handleNav}
      breadcrumbs={['知识库', kbName || '未选择']}
      breadcrumbOnClick={(i) => { if (i === 0) nav?.('kb') }}
      statusLeftItems={[
        { content: kbName || '知识库' },
        { content: `${data.fileCount} 篇笔记` },
      ]}
      statusRightItems={[{ content: `双链 ${data.linkCount} · 标签 ${data.tagCount}` }, { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() }]}
    >
      <div className="aurora-kb kb-shell">
        {/* 顶栏下方的子栏：库名 / 功能 Tab / 操作 */}
        <div className="aurora-kb-subbar">
          <div className="aurora-kb-subbar__left">
            <button className="aurora-kb-subbar__back" onClick={() => nav?.('kb')} title="返回知识库列表">
              <Icon.chevron size={16} />
            </button>
            <div className="aurora-kb-subbar__title">
              <span className="aurora-kb-subbar__name">{kbName || '未选择知识库'}</span>
              <span className="aurora-kb-subbar__badge">健康度 {healthTotal ?? '--'}</span>
            </div>
          </div>

          <div className="aurora-kb-subbar__center">
            <div className="aurora-kb-subbar-tabs" role="tablist" aria-label="知识库功能切换" data-swiping={tabs.dragging || undefined} {...tabs.bind}>
              {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中） */}
              <div className="aurora-kb-subbar-track" ref={tabs.trackRef}>
                {/* 滑块：选中态的视觉承载者（选中底色已从 tab 迁到这里） */}
                <span className="aurora-kb-subbar-thumb" ref={tabs.thumbRef} aria-hidden="true" />
                {TABS.map((t) => {
                  const I = Icon[t.icon]
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={tab === t.id}
                      className={`aurora-kb-subbar-tab ${tab === t.id ? 'is-active' : ''}`}
                      onClick={() => setTab(t.id)}
                      title={t.label}
                    >
                      <I size={15} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="aurora-kb-subbar-actions">
            <button className="aurora-kb-btn" onClick={() => setEditOpen(true)}><Icon.edit size={14} /> 编辑</button>
            <button className="aurora-kb-btn" onClick={() => handlePublishBlog()}><Icon.blog size={14} /> 发布博客</button>
            <span className="aurora-kb-subbar-sep" />
            <button className="aurora-kb-btn aurora-kb-btn--danger" onClick={() => setDeleteOpen(true)}><Icon.trash size={14} /> 删除</button>
          </div>
        </div>

        {/* 内容区：完全不参与滑动（需求 N 第四轮：内容区零位移） */}
        <div className="aurora-kb-content">
          <div className="aurora-kb-content__body">
            {!loaded ? (
              <div className="aurora-kb-placeholder">
                <div className="aurora-kb-placeholder__title">正在加载知识库…</div>
              </div>
            ) : !kb ? (
              <div className="aurora-kb-placeholder">
                <div className="aurora-kb-placeholder__icon"><Icon.book size={28} /></div>
                <div className="aurora-kb-placeholder__title">尚未选择知识库</div>
                <div className="aurora-kb-placeholder__desc">点击左侧「知识库」返回列表，选择或新建一个知识库。</div>
              </div>
          ) : tab === 'overview' ? (
            <OverviewTab
              toast={toast}
              data={data}
              onOpenFullGraph={openFullGraph}
              onOpenNote={openInEditor}
              canvasSlot={<KbCanvasSection kb={kb} nav={nav} toast={toast} onKbChanged={reloadKb} />}
            />
          ) : tab === 'notes' ? (
            <NotesTab files={kbFiles} onOpen={openInEditor} onCreate={handleCreateNote} />
          ) : tab === 'search' ? (
            <div className="aurora-kb-tabfill">
              <KbSearchPanel kbId={kb.id} files={kbFiles} onClose={() => setTab('overview')} onOpenFile={openInEditor} />
            </div>
          ) : tab === 'chat' ? (
            /* 使用优化④：问答从全屏覆盖层弹窗改为独立 tab 页面（与其他功能页一致） */
            <div className="aurora-kb-tabfill">
              <KbChatPanel kbId={kb.id} files={kbFiles} variant="page" />
            </div>
          ) : tab === 'export' ? (
            /* 使用优化④：导出从居中浮层改为独立 tab 页面 */
            <div className="aurora-kb-tabfill">
              <KbExportMenu kb={kb} files={kbFiles} variant="page" />
            </div>
          ) : tab === 'dependency' ? (
            <div className="aurora-kb-tabfill">
              <DependencyTab files={kbFiles} onSelect={(id) => setDependencyFileId(id)} />
            </div>
          ) : tab === 'moc' ? (
            <div className="aurora-kb-tabfill">
              <MocTab kb={kb} files={kbFiles} createFile={createFile} toast={toast} />
            </div>
          ) : (
            /* 问答/导出已页面化（使用优化④）；此分支仅兜底未知 tab */
            <OverviewTab toast={toast} data={data} onOpenFullGraph={openFullGraph} onOpenNote={openInEditor} />
          )}
          </div>
        </div>

        {/* 覆盖层：文件依赖（portal 到 #kb-overlay-root，继承 .kb-shell 主题 token） */}
        {dependencyFileId && (
          <FileDependencyPanel fileId={dependencyFileId} onClose={() => setDependencyFileId(null)} />
        )}

        {/* 编辑 / 删除 对话框 */}
        {kb && editOpen && (
          <EditKbModal
            kb={kb}
            open={editOpen}
            renameNode={renameNode}
            updateDescription={updateDescription}
            loadKb={loadKb}
            onClose={() => setEditOpen(false)}
            onSaved={(doc) => setKb(doc)}
            toast={toast}
          />
        )}
        {kb && deleteOpen && (
          <DeleteKbModal
            kb={kb}
            open={deleteOpen}
            deleteKb={deleteKb}
            deleteNode={deleteNode}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => { setDeleteOpen(false); nav?.('kb') }}
            toast={toast}
          />
        )}

        {/* 知识库覆盖层挂载点（供搜索/问答/导出 portal，继承 .kb-shell 主题 token） */}
        <div id="kb-overlay-root" />

      </div>

    </PageFrame>
  )
}
