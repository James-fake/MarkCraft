import React, { useState } from 'react'
import { Icon } from '../../icons'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 右栏 Tab 项定义
 */
export interface InspectorTab {
  /** Tab ID */
  id: string
  /** Tab 标签 */
  label: string
  /** Tab 图标（图标模式下显示） */
  icon?: string
  /** Tab 内容 */
  content: React.ReactNode
}

/**
 * Aurora 右栏情境面板（Inspector）
 * - 顶部 Tab 切换
 * - 可完全收起
 * - 用于显示大纲、反向链接、属性等上下文信息
 */
export interface InspectorProps {
  /** Tab 列表 */
  tabs: InspectorTab[]
  /** 默认激活的 Tab ID */
  defaultTabId?: string
  /** 是否收起 */
  collapsed?: boolean
  /** 收起/展开切换（用于把手条点击） */
  onToggle?: () => void
  /** 宽度（默认 280px，通过 CSS 变量控制） */
  width?: number
  /** 附加 className（用于场景化约束，如编辑器内限定高度区间） */
  className?: string
  /** 仅图标模式：Tab 栏只显示图标，悬停 Tooltip 显示名称（规范20 §2.2 变体） */
  iconMode?: boolean
}

export function Inspector({
  tabs,
  defaultTabId,
  collapsed = false,
  onToggle,
  width,
  className,
  iconMode = false,
}: InspectorProps) {
  const { t } = useLanguage()
  const sh = t.shell
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id)

  if (collapsed) {
    return (
      <aside className={`aurora-inspector aurora-inspector--collapsed ${className ?? ''}`} aria-hidden="true">
        <button
          type="button"
          className="aurora-inspector__collapsed"
          onClick={onToggle}
          aria-label={sh.inspectorCollapsedAria}
          aria-expanded={false}
          title={sh.inspectorCollapsedAria}
        >
          <span className="aurora-inspector__collapsed-label">{sh.inspectorCollapsedLabel}</span>
          <Icon.chevronLeft size={14} />
        </button>
      </aside>
    )
  }

  const activeTabData = tabs.find(t => t.id === activeTab) ?? tabs[0]

  // P3-A：width prop 真正应用——传入时以 inline style 覆盖 CSS token（--mc-inspector-w 默认 280px）；
  // 未传时保持 token 默认，collapsed 分支不适用 width（收起态宽度由 CSS 固定）
  const widthStyle = width != null ? { width } : undefined

  return (
    <aside
      className={`aurora-inspector ${iconMode ? 'aurora-inspector--iconmode' : ''} ${className ?? ''}`}
      style={widthStyle}
      aria-label={sh.inspectorAria}
    >
      {/* Tab 栏 */}
      <div className="aurora-inspector__tabs" role="tablist">
        {tabs.map(tab => {
          const IconComp: React.ComponentType<{ size?: number }> | null = tab.icon ? (Icon[tab.icon as keyof typeof Icon] as React.ComponentType<{ size?: number }>) : null
          return (
            <button
              key={tab.id}
              type="button"
              className={[
                'aurora-inspector__tab',
                tab.id === activeTab ? 'aurora-inspector__tab--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={tab.id === activeTab}
              title={iconMode ? tab.label : undefined}
            >
              {iconMode && IconComp ? <IconComp size={16} /> : tab.label}
            </button>
          )
        })}
        <button
          type="button"
          className="aurora-inspector__collapse-btn"
          onClick={onToggle}
          aria-label={sh.inspectorCollapseAria}
          title={sh.inspectorCollapseAria}
        >
          <Icon.chevronRight size={16} />
        </button>
      </div>

      {/* 内容区 */}
      <div className="aurora-inspector__content" role="tabpanel">
        {activeTabData?.content}
      </div>
    </aside>
  )
}
