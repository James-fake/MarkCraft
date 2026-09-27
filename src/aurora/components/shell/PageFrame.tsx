import React, { useEffect, useState } from 'react'
import { TitleBar } from './TitleBar'
import { MenuBar } from './MenuBar'
import { Sidebar, SidebarGroup } from './Sidebar'
import { Inspector, InspectorTab } from './Inspector'
import { StatusBar, StatusBarItem } from './StatusBar'
import { commandRegistry } from '@services/command/commandRegistry'

/**
 * Aurora 桌面页面框架组件
 *
 * 三层结构：
 * 1. TitleBar（标题栏 · 内含窗口级菜单栏）
 * 2. Body = Sidebar + Content + Inspector
 * 3. StatusBar（状态栏）
 *
 * 用法：
 * <AuroraPageFrame
 *   sidebarGroups={[...]}
 *   sidebarActiveId="编辑器"
 *   onSidebarSelect={(id) => navigate(id)}
 *   content={<EditorPanel />}
 *   inspectorTabs={[...]}
 *   breadcrumbs={['项目', '文档.md']}
 * />
 */
export interface PageFrameProps {
  /** 侧栏导航分组（提供 sidebarContent 时可省略） */
  sidebarGroups?: SidebarGroup[]
  /** 当前激活的侧栏项 label */
  sidebarActiveId?: string
  /** 侧栏项点击回调 */
  onSidebarSelect?: (label: string) => void
  /** 侧栏默认是否收起 */
  defaultSidebarCollapsed?: boolean
  /** 自定义侧栏主体内容（提供时替换默认导航，用于文件树等专用面板） */
  sidebarContent?: React.ReactNode

  /** 面包屑路径 */
  breadcrumbs?: string[]
  /** 面包屑点击回调：传入后除最后一项外变为可点击导航 */
  breadcrumbOnClick?: (index: number) => void
  /** 当前文档是否有未保存更改（面包屑末级前显示圆点，HIG §2.4） */
  titlebarModified?: boolean
  /** 标题栏自定义左侧内容（替代面包屑） */
  titlebarLeft?: React.ReactNode
  /** 是否显示窗口控制按钮 */
  showWindowControls?: boolean

  /** 主内容区 */
  children?: React.ReactNode
  /** 内容区工具栏（可选） */
  toolbar?: React.ReactNode

  /** 右栏 Inspector 的 Tab 列表（不传则不显示右栏） */
  inspectorTabs?: InspectorTab[]
  /** 右栏默认是否收起 */
  defaultInspectorCollapsed?: boolean
  /** 右栏受控收起状态（提供时覆盖内部状态） */
  inspectorCollapsed?: boolean
  /** 右栏收起/展开切换回调（受控模式下使用） */
  onInspectorToggle?: () => void
  /** 右栏附加 className（场景化约束，如编辑器内限定高度区间） */
  inspectorClassName?: string
  /** 右栏宽度覆盖（px，默认 token --mc-inspector-w = 280px；P3-A 透传 Inspector.width） */
  inspectorWidth?: number
  /** 右栏 Tab 仅图标模式（白板规范20 §2.2 变体：6 Tab 默认仅图标） */
  inspectorIconMode?: boolean

  /** 状态栏左侧项目 */
  statusLeftItems?: StatusBarItem[]
  /** 状态栏右侧项目 */
  statusRightItems?: StatusBarItem[]
  /** 保存状态：仅文档型面板显式传入（编辑器等）；不传则不渲染保存态，避免无文档页伪「已保存」 */
  savedState?: 'saved' | 'unsaved' | 'saving'

  /** 是否失焦态（窗口失去焦点时） */
  blurred?: boolean

  /** 品牌名 */
  brandName?: string
}

export function PageFrame({
  sidebarGroups,
  sidebarActiveId,
  onSidebarSelect,
  defaultSidebarCollapsed = true,
  sidebarContent,
  breadcrumbs,
  breadcrumbOnClick,
  titlebarModified = false,
  titlebarLeft,
  showWindowControls = true,
  children,
  toolbar,
  inspectorTabs,
  defaultInspectorCollapsed = false,
  inspectorCollapsed: inspectorCollapsedProp,
  onInspectorToggle,
  inspectorClassName,
  inspectorWidth,
  inspectorIconMode = false,
  statusLeftItems,
  statusRightItems,
  savedState,
  blurred = false,
  brandName = 'MarkCraft',
}: PageFrameProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed)
  const [inspectorCollapsedInternal, setInspectorCollapsedInternal] = useState(defaultInspectorCollapsed)
  // 窗口控制（批次⑤ P2-A 真实化）：maximized 跟随真实全屏态——无论触发源是本组件的
  // window.zoom 命令、用户 F11 还是菜单/快捷键，fullscreenchange 都会同步图标。
  const [maximized, setMaximized] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const sync = () => setMaximized(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // 受控优先：若提供 inspectorCollapsed prop，则使用受控值；否则用内部状态
  const inspectorCollapsed = inspectorCollapsedProp ?? inspectorCollapsedInternal
  const handleToggleInspector = () => {
    if (onInspectorToggle) {
      onInspectorToggle()
    } else {
      setInspectorCollapsedInternal(prev => !prev)
    }
  }

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  const showInspector = inspectorTabs && inspectorTabs.length > 0

  return (
    <div
      className={[
        'aurora-page',
        blurred ? 'aurora-page--blurred' : '',
      ].filter(Boolean).join(' ')}
      style={{ ['--sidebar-current-w' as string]: sidebarCollapsed ? 'var(--mc-sidebar-collapsed-w)' : 'var(--mc-sidebar-w)' }}
    >
      {/* 标题栏（窗口级菜单栏已并入：品牌名右侧）。窗口控制真实化（批次⑤ P2-A）：
          统一经 commandRegistry 命令单源触发——与菜单栏「窗口/MarkCraft」菜单、快捷键
          同一动作源，绝不在此重复定义 handler。app.quit → QuitModal 确认；
          window.zoom → Fullscreen 切换；window.minimize → Web 壳无真实最小化，
          降级 window.blur()（诚实不伪造）。未注册时静默 no-op（防御注册时序）。 */}
      <TitleBar
        appName={brandName}
        menu={<MenuBar />}
        breadcrumbs={breadcrumbs}
        breadcrumbOnClick={breadcrumbOnClick}
        modified={titlebarModified}
        leftContent={titlebarLeft}
        showWindowControls={showWindowControls}
        maximized={maximized}
        onMinimize={() => commandRegistry.getById('window.minimize')?.action?.()}
        onMaximize={() => commandRegistry.getById('window.zoom')?.action?.()}
        onClose={() => commandRegistry.getById('app.quit')?.action?.()}
      />

      {/* 主体区 */}
      <div className="aurora-body">
        {/* 侧栏 */}
        <Sidebar
          groups={sidebarGroups}
          activeId={sidebarActiveId}
          onSelect={onSidebarSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          sidebarContent={sidebarContent}
        />

        {/* 内容区 */}
        <main className="aurora-content">
          {toolbar && (
            <div className="aurora-toolbar">{toolbar}</div>
          )}
          <div className="aurora-content__body">
            {children}
          </div>
        </main>

        {/* 右栏 Inspector */}
        {showInspector && (
          <Inspector
            tabs={inspectorTabs!}
            collapsed={inspectorCollapsed}
            onToggle={handleToggleInspector}
            className={inspectorClassName}
            width={inspectorWidth}
            iconMode={inspectorIconMode}
          />
        )}
      </div>

      {/* 状态栏 */}
      <StatusBar
        leftItems={statusLeftItems}
        rightItems={statusRightItems}
        savedState={savedState}
      />
    </div>
  )
}

/**
 * 工具条容器组件（左/中/右三栏布局）
 */
export function Toolbar({
  left,
  center,
  right,
}: {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <>
      {left && <div className="aurora-toolbar__left">{left}</div>}
      {center && <div className="aurora-toolbar__center">{center}</div>}
      {right && <div className="aurora-toolbar__right">{right}</div>}
    </>
  )
}
