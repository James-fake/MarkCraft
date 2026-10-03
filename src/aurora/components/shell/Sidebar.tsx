import React, { useState } from 'react'
import { SidebarItem, SidebarItemProps } from './SidebarItem'
import type { IconName } from '../../types'
import { useUserProfile, userDisplayName, userInitial } from '@stores/UserProfileStore'
import { useUserAccountNav } from './UserAccountNav'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 侧栏导航分组
 */
export interface SidebarGroup {
  /** 稳定标识（用于折叠状态记忆；缺省回退 title） */
  id?: string
  /** 分组标题（可选，展示用；已由调用方按语言解析） */
  title?: string
  /** 导航项列表 */
  items: SidebarItemProps[]
  /** 该组是否可折叠（点击标题行展开/收起） */
  collapsible?: boolean
  /** 初始是否收起（默认展开） */
  defaultCollapsed?: boolean
}

/**
 * Aurora 可收起侧栏组件
 * - 展开态：200px 宽，图标 + 文字 + 分组
 * - 收起态：60px 窄书脊，仅图标
 * - 底部：用户区 + 设置 + 收起/展开按钮
 */
export interface SidebarProps {
  /** 导航分组（提供 sidebarContent 时可省略） */
  groups?: SidebarGroup[]
  /** 当前激活项的 label（用于高亮） */
  activeId?: string
  /** 导航项点击回调 */
  onSelect?: (label: string) => void
  /** 是否收起 */
  collapsed?: boolean
  /** 收起状态切换 */
  onToggleCollapse?: () => void
  /** 自定义底部内容（在用户区上方） */
  footerContent?: React.ReactNode
  /** 自定义侧栏主体内容（提供时替换默认导航 groups 渲染，用于文件树等专用面板） */
  sidebarContent?: React.ReactNode
}

export function Sidebar({
  groups,
  activeId,
  onSelect,
  collapsed = false,
  onToggleCollapse,
  footerContent,
  sidebarContent,
}: SidebarProps) {
  // 用户资料（实时）+ 账户导航（点击头像跳转设置）
  const profile = useUserProfile()
  const userNav = useUserAccountNav()
  const displayName = userDisplayName(profile)
  const avatarInitial = userInitial(profile)
  const { t } = useLanguage()

  // 折叠组开合状态（按分组 id 记忆；未显式切换的组跟随 defaultCollapsed）
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const groupKey = (group: SidebarGroup) => group.id ?? group.title ?? ''

  const toggleGroup = (group: SidebarGroup) => {
    const key = groupKey(group)
    setCollapsedGroups((prev) => {
      const current = key in prev ? prev[key] : !!group.defaultCollapsed
      return { ...prev, [key]: !current }
    })
  }

  /**
   * 分组是否收起：
   * - 侧栏本身收起（窄书脊）→ 强制展开，保证图标可达
   * - 激活项所在组 → 强制展开，保证高亮可见
   * - 其余按用户开合状态（未切换过则跟随 defaultCollapsed）
   */
  const isGroupCollapsed = (group: SidebarGroup): boolean => {
    if (collapsed) return false
    if (group.items.some((it) => (it.id ?? it.label) === activeId || it.label === activeId)) return false
    if (!group.collapsible) return false
    const key = groupKey(group)
    if (key in collapsedGroups) return collapsedGroups[key]
    return !!group.defaultCollapsed
  }

  return (
    <aside
      className={[
        'aurora-sidebar',
        collapsed ? 'aurora-sidebar--collapsed' : 'aurora-sidebar--expanded',
      ].filter(Boolean).join(' ')}
      aria-label={t.nav.mainNavAria}
    >
      {/* 导航区 */}
      <nav className="aurora-sidebar__nav">
        {sidebarContent ? (
          sidebarContent
        ) : (
          (groups ?? []).map((group, gi) => {
            const groupCollapsed = isGroupCollapsed(group)
            return (
              <div className="aurora-sidebar__group" key={group.id ?? gi}>
                {group.title &&
                  (group.collapsible ? (
                    <button
                      type="button"
                      className="aurora-sidebar__group-title aurora-sidebar__group-title--btn"
                      onClick={() => toggleGroup(group)}
                      aria-expanded={!groupCollapsed}
                      title={group.title}
                    >
                      <span className="aurora-sidebar__group-title-text">{group.title}</span>
                      <svg
                        className="aurora-sidebar__group-caret"
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 4.5 6 7.5 9 4.5" />
                      </svg>
                    </button>
                  ) : (
                    <div className="aurora-sidebar__group-title">{group.title}</div>
                  ))}
                {/* 组折叠过渡（macOS 动效方案 §3.10）：内容常驻渲染，
                    grid-template-rows 0fr→1fr + opacity 过渡（Apple 抽屉语义） */}
                <div
                  className={`aurora-sidebar__group-body${groupCollapsed ? ' is-collapsed' : ''}`}
                  aria-hidden={groupCollapsed || undefined}
                  {...({ inert: groupCollapsed ? '' : undefined } as Record<string, string | undefined>)}
                >
                  <div className="aurora-sidebar__group-inner">
                    {group.items.map((item, ii) => (
                      <SidebarItem
                        key={item.id ?? `${gi}-${ii}`}
                        icon={item.icon as IconName}
                        label={item.label}
                        id={item.id}
                        active={item.active ?? ((item.id ?? item.label) === activeId)}
                        count={item.count}
                        onClick={() => onSelect?.(item.id ?? item.label)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </nav>

      {/* 底部区 */}
      <div className="aurora-sidebar__footer">
        {footerContent}

        {/* 用户区（点击 → 账户设置） */}
        <button
          type="button"
          className="aurora-sidebar__user"
          title={t.nav.accountHint.replace(String.raw`{name}`, displayName)}
          onClick={() => userNav.open()}
          aria-label={t.nav.manageAccount}
        >
          <div className="aurora-sidebar__user-avatar">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={displayName} className="aurora-sidebar__user-avatar-img" />
            ) : (
              avatarInitial
            )}
          </div>
          <span className="aurora-sidebar__user-name">{displayName}</span>
        </button>

        {/* 底部操作 */}
        <div className="aurora-sidebar__footer-actions">
          <button
            type="button"
            className="aurora-sidebar__toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            title={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <polyline points="6 4 10 8 6 12" />
              ) : (
                <polyline points="10 4 6 8 10 12" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
