import { Icon } from '../../icons'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import type { CanvasViewId } from './CanvasPanel'

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
}

const VIEWS: { id: CanvasViewId; label: string; icon: string }[] = [
  { id: 'canvas', label: '白板', icon: 'canvas' },
  { id: 'mindmap', label: '思维导图', icon: 'mindmap' },
  { id: 'kanban', label: '看板', icon: 'kanban' },
  { id: 'timeline', label: '时间轴', icon: 'timeline' },
]

export function CanvasTopbar({ view, onView, canvasName, onOpenList, onExport, locked }: CanvasTopbarProps) {
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
  const tabs = useTabStripThumb({
    index: Math.max(0, VIEWS.findIndex((v) => v.id === view)),
    count: VIEWS.length,
    enabled: !locked,
    onIndexChange: (next) => onView(VIEWS[next].id),
  })

  return (
    <div className="aurora-ctop">
      <div className="aurora-ctop__left">
        <button type="button" className="aurora-ctop__name" onClick={onOpenList} title="白板列表">
          <Icon.file size={14} />
          <span>{canvasName || '未命名白板'}</span>
          <Icon.chevronDown size={12} />
        </button>
      </div>

      <div
        className="aurora-ctop__switcher"
        role="tablist"
        aria-label="视图切换"
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
                <span>{v.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="aurora-ctop__right">
        {onExport && (
          <button type="button" className="aurora-ctop__export" onClick={onExport} title="导出当前白板（PNG+JSON）" aria-label="导出当前白板">
            <Icon.download size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
