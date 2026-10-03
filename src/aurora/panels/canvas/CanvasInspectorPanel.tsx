import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import type { ShapeLike } from '@features/canvas-v2/engine/engineTypes'
import { useEngineSnapshot } from './canvasHooks'
import { useTagIndex } from '@stores/TagIndexStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import type { FileNode } from '@src/types/fileManager'
import { TABS, TAG_SUGGESTIONS, TAG_SUGGESTIONS_EN, numOr, rad2deg, deg2rad, clamp, type TabId, type ParsedShape } from './inspectorPanelShared'
import { PropsTab } from './PropsTab'
import { LayersTab } from './LayersTab'
import { FilterTab } from './FilterTab'
import { FavTab } from './FavTab'
import { RecTab } from './RecTab'
import { SearchTab } from './SearchTab'

/**
 * Aurora 右栏检查器（.aurora-csp/.aurora-cip）—— spec 20 §2 六 Tab 面板
 *   属性（文本/颜色/字号/坐标/尺寸/旋转/锁定/删除）/ 图层（类型图标+锁定+跳选）
 *   筛选（标签 chips + 类型 + 状态 + 结果列表）/ 收藏（pinned 真实字段，list/grid）
 *   推荐（真实关联笔记，可添加为卡片）/ 搜索（实时过滤 + 跳选）
 * 数据全部来自真实来源：引擎 shape 读写 + useTagIndex/useLinkIndex/useFileManager。
 * 引擎无 reorder/可见性 API → 拖拽重排、可见 Switch 不实现（不造假功能）。
 *
 * P4-2 拆分（2026-10）：主题化下拉 InspectorSelect 与六个 Tab 已抽为同目录子文件，
 * 共享模型在 ./inspectorPanelShared；本文件只保留主组件的引擎订阅、选中态派生
 * 与 Tab 骨架。
 */

export interface CanvasInspectorPanelProps {
  engine: CanvasEngine | null
}

export function CanvasInspectorPanel({ engine }: CanvasInspectorPanelProps) {
  const { t, language } = useLanguage()
  const ci = t.canvasInspector
  const ct = t.canvasTab
  const tagSuggestions = language === 'en' ? TAG_SUGGESTIONS_EN : TAG_SUGGESTIONS
  const [tab, setTab] = useState<TabId>('props')
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterTagLogic, setFilterTagLogic] = useState<'AND' | 'OR'>('OR')
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all')
  const [favMode, setFavMode] = useState<'grid' | 'list'>('grid')
  const [searchQ, setSearchQ] = useState('')

  // 引擎数据 → 手动订阅 'document' 变更（避开 useSyncExternalStore 对逐帧新数组的 tearing）
  const [shapes, setShapes] = useState<ParsedShape[]>([])
  useEffect(() => {
    if (!engine) {
      setShapes([])
      return
    }
    const recompute = () => {
      const list = engine.getCurrentPageShapes()
      const next = list
        .filter((s) => s.type !== 'arrow')
        .map((s) => {
          const p = s.props ?? {}
          return {
            id: s.id,
            type: s.type,
            x: s.x ?? 0,
            y: s.y ?? 0,
            rotation: s.rotation ?? 0,
            isLocked: !!s.isLocked,
            w: numOr(p.w, 0),
            h: numOr(p.h, 0),
            text: String(p.text ?? '').replace(/\n/g, ' '),
            color: String(p.color ?? ''),
            fontSize: numOr(p.fontSize, 14),
            fileId: String(p.fileId ?? ''),
            parentId: String(p.parentId ?? ''),
            pinned: !!p.pinned,
            // props.tags 实际存储为逗号分隔字符串（看板拖拽/工具栏写入），兼容历史数组
            tags: typeof p.tags === 'string'
              ? (p.tags as string).split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
              : (Array.isArray(p.tags) ? (p.tags as string[]) : []),
            bg: String(p.bg ?? ''),
            textColor: String(p.textColor ?? ''),
            borderOn: p.borderOn !== false,
          } satisfies ParsedShape
        })
      setShapes((prev) => {
        // 签名须覆盖可编辑属性（含 color / bg / fontSize），否则改色 / 改字号时
        // selected 引用不刷新，检视内色块高亮与数值不跟随变更。
        const sig = next.map((s) => `${s.id}:${s.text}:${s.color}:${s.bg}:${s.fontSize}:${s.pinned}:${s.isLocked}`).join('|')
        const prevSig = prev.map((s) => `${s.id}:${s.text}:${s.color}:${s.bg}:${s.fontSize}:${s.pinned}:${s.isLocked}`).join('|')
        return sig === prevSig ? prev : next
      })
    }
    recompute()
    const unsub = engine.store.listen(recompute, { scope: 'document' })
    return () => unsub()
  }, [engine])

  const selectedIdsSig = useEngineSnapshot(
    engine,
    (e) => e.getSelectedShapeIds().join('|'),
    'session',
  ) ?? ''
  // 按 sig 记忆化：空/非空分支都保持引用稳定，避免下游 useMemo 每渲染失效
  const selectedIds = useMemo(
    () => (selectedIdsSig ? selectedIdsSig.split('|').filter(Boolean) : []),
    [selectedIdsSig],
  )

  const selected = shapes.find((s) => selectedIds.includes(s.id) && s.type !== 'arrow')

  // 选中联动「属性」Tab：选区从空 → 非空（点击便签/标签等）时，自动切回属性列表，
  // 与面板自动展开配合，确保首屏即见属性。已选中时切换其它卡片不再强切 Tab（尊重用户手动选择）。
  const prevSelCount = useRef(0)
  useEffect(() => {
    const count = selectedIds.length
    if (count > 0 && prevSelCount.current === 0) setTab('props')
    prevSelCount.current = count
  }, [selectedIds.length])

  // 父卡片候选：当前白板全部 note-card（排除自身），供思维导图 parentId 设置
  const parentCards = useMemo(
    () => shapes
      .filter((s) => s.type === 'note-card' && !selectedIds.includes(s.id))
      .map((s) => ({ id: s.id, text: s.text || ct.emptyCard })),
    [shapes, selectedIds, ct.emptyCard],
  )

  const { getAllTags } = useTagIndex()
  const { getOutgoingLinks } = useLinkIndex()
  const { rootFolder } = useFileManager()

  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: shapes 变化时强制重算标签合集（getAllTags 为读取型函数，规则看不见其内部数据源）
  const allTags = useMemo(() => Array.from(new Set([...getAllTags(), ...tagSuggestions])), [getAllTags, shapes, tagSuggestions])

  const update = (id: string, partial: Record<string, unknown>) => {
    // 面板侧以宽松 Record 收集控件值，此处一次定向收窄到引擎签名（Partial<ShapeLike> & { id }）
    engine?.updateShape({ id, ...partial } as Partial<ShapeLike> & { id: string })
  }

  const filePathById = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (n: FileNode, parents: string[]) => {
      const path = [...parents, n.name].filter(Boolean).join('/')
      if (n.id) m.set(n.id, path)
      if (n.children) for (const c of n.children) walk(c, [...parents, n.name])
    }
    walk(rootFolder, [])
    return m
  }, [rootFolder])

  return (
    <div className="aurora-csp">
      <div className="aurora-csp__head">
        <div className="aurora-csp__tabs" role="tablist">
          {TABS.map((item) => {
            const IconComp = Icon[item.icon as keyof typeof Icon]
            const label = (ci as unknown as Record<string, string>)[item.labelKey]
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                title={label}
                className={`aurora-csp__tab ${tab === item.id ? 'aurora-csp__tab--active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {IconComp ? <IconComp size={14} /> : null}
                {/* 使用优化⑥：补渲染文字（图标+文字竖排，与编辑器 rightbar__tab 全站同款） */}
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="aurora-csp__body">
        {tab === 'props' && (
          <PropsTab
            engine={engine}
            selected={selected}
            update={update}
            rad2deg={rad2deg}
            deg2rad={deg2rad}
            clamp={clamp}
            parentCards={parentCards}
          />
        )}
        {tab === 'layers' && (
          <LayersTab
            shapes={shapes}
            selectedIds={selectedIds}
            onPick={(id) => engine?.setSelectedShapes([id])}
            onToggleLock={(id) => update(id, { isLocked: !(shapes.find((s) => s.id === id)?.isLocked ?? false) })}
            filePathById={filePathById}
          />
        )}
        {tab === 'filter' && (
          <FilterTab
            shapes={shapes}
            allTags={allTags}
            filterTags={filterTags}
            setFilterTags={setFilterTags}
            filterTagLogic={filterTagLogic}
            setFilterTagLogic={setFilterTagLogic}
            filterTypes={filterTypes}
            setFilterTypes={setFilterTypes}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onPick={(id) => engine?.setSelectedShapes([id])}
          />
        )}
        {tab === 'fav' && (
          <FavTab
            shapes={shapes.filter((s) => s.pinned)}
            mode={favMode}
            setMode={setFavMode}
            onPick={(id) => engine?.setSelectedShapes([id])}
            onToggleFav={(id, v) => update(id, { props: { pinned: v } })}
          />
        )}
        {tab === 'rec' && (
          <RecTab
            engine={engine}
            shapes={shapes}
            getOutgoingLinks={getOutgoingLinks}
            filePathById={filePathById}
          />
        )}
        {tab === 'search' && (
          <SearchTab
            shapes={shapes}
            q={searchQ}
            setQ={setSearchQ}
            onPick={(id) => engine?.setSelectedShapes([id])}
          />
        )}
      </div>
    </div>
  )
}
