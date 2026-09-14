import React from 'react'
import { Icon } from '../../icons'
import { WindowControls, WindowControlsProps } from './WindowControls'

/**
 * Aurora 标题栏组件
 * - 左侧：应用图标 + 应用名 + 菜单栏（menu 插槽）+ 面包屑
 * - 中部：拖拽区
 * - 右侧：窗口控制按钮
 */
export interface TitleBarProps extends WindowControlsProps {
  /** 应用名（默认 MarkCraft） */
  appName?: string
  /** 菜单栏插槽（窗口级 chrome，渲染于应用名与面包屑之间） */
  menu?: React.ReactNode
  /** 面包屑路径，如 ['项目', '设计文档', 'Aurora.md'] */
  breadcrumbs?: string[]
  /** 当前文档是否有未保存更改（在末级文件名前显示圆点，HIG §2.4 编辑态） */
  modified?: boolean
  /** 面包屑点击回调：传入后，除最后一项外的面包屑变为可点击导航（index 为点击项的下标） */
  breadcrumbOnClick?: (index: number) => void
  /** 自定义左侧内容（替代面包屑） */
  leftContent?: React.ReactNode
  /** 是否显示窗口控制按钮 */
  showWindowControls?: boolean
  /** 是否最大化 */
  maximized?: boolean
}

export function TitleBar({
  appName = 'MarkCraft',
  menu,
  breadcrumbs = [],
  modified = false,
  breadcrumbOnClick,
  leftContent,
  showWindowControls = true,
  maximized,
  onMinimize,
  onMaximize,
  onClose,
}: TitleBarProps) {
  return (
    <div className="aurora-titlebar" role="banner">
      <div className="aurora-titlebar__left">
        {/* 应用图标 */}
        <div className="aurora-titlebar__icon" aria-hidden="true">
          <Icon.logo size={18} />
        </div>

        {/* 应用名 */}
        <span className="aurora-titlebar__app-name">{appName}</span>

        {/* 应用菜单栏（窗口级 chrome，紧邻品牌名右侧） */}
        {menu}

        {/* 文档上下文（面包屑）/ 自定义左侧内容 —— 菜单组后 hairline 分区 */}
        {leftContent ?? (breadcrumbs.length > 0 && (
          <>
            <span className="aurora-titlebar__ctx-divider" aria-hidden="true" />
            <div className="aurora-titlebar__breadcrumbs" title={breadcrumbs.join(' › ')}>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1
                const isClickable = !!breadcrumbOnClick && !isLast
                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="aurora-titlebar__crumb-sep" aria-hidden="true">›</span>
                    )}
                    {isLast && modified && (
                      <span
                        className="aurora-titlebar__modified-dot"
                        title="有未保存的更改"
                        aria-label="有未保存的更改"
                      />
                    )}
                    {isClickable ? (
                      <button
                        type="button"
                        className="aurora-titlebar__crumb-btn"
                        title={crumb}
                        onClick={() => breadcrumbOnClick?.(i)}
                      >
                        {crumb}
                      </button>
                    ) : (
                      <span
                        className={isLast ? 'aurora-titlebar__crumb aurora-titlebar__crumb--current' : 'aurora-titlebar__crumb'}
                        title={crumb}
                      >
                        {crumb}
                      </span>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </>
        ))}
      </div>

      {/* 拖拽区 */}
      <div className="aurora-titlebar__drag" />

      {/* 窗口控制按钮 */}
      {showWindowControls && (
        <div className="aurora-titlebar__right">
          <WindowControls
            maximized={maximized}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  )
}
