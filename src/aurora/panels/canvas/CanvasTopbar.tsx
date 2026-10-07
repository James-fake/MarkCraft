import { Icon } from '../../icons'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import type { CanvasViewId } from './CanvasPanel'
import { useLanguage } from '@stores/LanguageStore'

/**
 * Aurora 白板顶栏（.aurora-ctop）—— 视图切换（居中）+ 白板名/列表 + 导出
 */
export interface CanvasTopbarProps {
  view: CanvasViewId
  onView: (v: CanvasViewId) => void
  canvasName: string
  onOpenList: () => void
  /** 导出当前白板（JSON+PNG，由 CanvasPanel 提供真实逻辑） */
  onExport?: () => void
  /** 首启锁定态：禁用思维导图/看板/时间轴切换（仅保留白板视图） */
  locked?: boolean
  /**
   * 所属知识库（由 CanvasPanel 反向查询 canvasIds 得到）。
   * 以**面包屑**形态落在白板名左侧（`知识库名 › 白板名`），点击回跳知识库——
   * 旧版是一条独占整行的「所属知识库」芯片条，既占高度又与顶栏割裂，已按用户反馈改为面包屑。
   */
  owningKb?: { id: string; name: string } | null
  /** 点击面包屑回跳知识库（由 CanvasPanel 注入 nav，顶栏不自行拼路由） */
  onOpenOwningKb?: () => void
}

const VIEWS: { id: CanvasViewId; labelKey: string; icon: string }[] = [
  { id: 'canvas', labelKey: 'viewCanvas', icon: 'canvas' },
  { id: 'mindmap', labelKey: 'viewMindmap', icon: 'mindmap' },
  { id: 'kanban', labelKey: 'viewKanban', icon: 'kanban' },
  { id: 'timeline', labelKey: 'viewTimeline', icon: 'timeline' },
]

export function CanvasTopbar({
  view,
  onView,
  canvasName,
  onOpenList,
  onExport,
  locked,
  owningKb,
  onOpenOwningKb,
}: CanvasTopbarProps) {
  /**
   * 顶栏视图切换 = Apple 分段控件式滑块（需求 N 第七轮）。
   *
   * 与设置/知识库/博客同源（`useTabStripThumb`）：一条**常驻滑块**压在选中视图
   * 上；按住任一视图左右拖 → **只有滑块跟手走**（可一次跨多格，白板 ↔ 时间轴
   * 直达），tab 文字与白板内容一个像素都不动；松手落到**落点最近**的视图。
   *
   * 首启锁定态（`locked`）只有「白板」可用 → 手势一并停用：拖到被锁的视图
   * 没有意义，停用它比让滑块滑过去再弹回更符合直觉（点击路径本就 return）。
   *
   * ⚠️ 真机验证注意：`locked = isCanvasEmpty && !guideSkipped`（CanvasPanel）——
   * 白板为空且没点过「跳过，直接开始」时它就是 true，看着像"手势坏了"。
   * 要验手势得先在空态点「跳过，直接开始」退出该状态。jsdom 侧见
   * `tabBarSwipeBinding.test.tsx` 的「引导锁定态下手势停用」两条对照组。
   */
  const { t } = useLanguage()
  const ct = t.canvasTopbar
  const tabs = useTabStripThumb({
    index: Math.max(0, VIEWS.findIndex((v) => v.id === view)),
    count: VIEWS.length,
    enabled: !locked,
    onIndexChange: (next) => onView(VIEWS[next].id),
  })

  return (
    <div className="aurora-ctop">
      <div className="aurora-ctop__left">
        {/* 所属知识库面包屑：只在白板确有关联库时出现，无关联时顶栏保持原样 */}
        {owningKb && (
          <>
            <button
              type="button"
              className="aurora-ctop__crumb"
              onClick={onOpenOwningKb}
              title={ct.openKb.replace('{name}', owningKb.name)}
            >
              <Icon.book size={13} />
              <span>{owningKb.name}</span>
            </button>
            <span className="aurora-ctop__crumb-sep" aria-hidden="true">›</span>
          </>
        )}
        <button type="button" className="aurora-ctop__name" onClick={onOpenList} title={ct.canvasList}>
          <Icon.file size={14} />
          <span>{canvasName || ct.untitledCanvas}</span>
          <Icon.chevronDown size={12} />
        </button>
      </div>

      <div
        className="aurora-ctop__switcher"
        role="tablist"
        aria-label={ct.viewSwitcherAria}
        data-swiping={tabs.dragging || undefined}
        {...tabs.bind}
      >
        {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中，常驻） */}
        <div className="aurora-ctop__switcher-track" ref={tabs.trackRef}>
          {/* 滑块：选中态的视觉承载者（选中底色/阴影已从 tab 迁到这里） */}
          <span className="aurora-ctop__switcher-thumb" ref={tabs.thumbRef} aria-hidden="true" />
          {VIEWS.map((v) => {
            const IconComp = Icon[v.icon as keyof typeof Icon]
            const disabled = !!locked && v.id !== 'canvas'
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                aria-disabled={disabled}
                disabled={disabled}
                className={`aurora-ctop__view ${view === v.id ? 'aurora-ctop__view--active' : ''}${disabled ? ' aurora-ctop__view--disabled' : ''}`}
                onClick={() => { if (disabled) return; onView(v.id) }}
              >
                {IconComp ? <IconComp size={15} className="aurora-ctop__view-icon" /> : null}
                <span>{(ct as unknown as Record<string, string>)[v.labelKey]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="aurora-ctop__right">
        {onExport && (
          <button type="button" className="aurora-ctop__export" onClick={onExport} title={ct.exportTitle} aria-label={ct.exportAria}>
            <Icon.download size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
