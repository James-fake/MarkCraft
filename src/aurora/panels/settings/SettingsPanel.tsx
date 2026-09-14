import { useState, useEffect, useRef, useCallback } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useSwipeTabs } from '../../hooks/useSwipeTabs'
import { GeneralSection } from './sections/GeneralSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { EditorSection } from './sections/EditorSection'
import { ImageSection } from './sections/ImageSection'
import { ExportSection } from './sections/ExportSection'
import { DataSection } from './sections/DataSection'
import { ShortcutsSection } from './sections/ShortcutsSection'
import { AboutSection } from './sections/AboutSection'
import { UserSection } from './sections/UserSection'

/**
 * 设置分类项
 */
interface SettingsCategory {
  /** 唯一 id */
  id: string
  /** 显示名称 */
  label: string
  /** 图标 */
  icon: IconName
}

const CATEGORIES: SettingsCategory[] = [
  { id: 'user', label: '用户', icon: 'user' as IconName },
  { id: 'general', label: '通用', icon: 'settings' as IconName },
  { id: 'appearance', label: '外观', icon: 'sun' as IconName },
  { id: 'editor', label: '编辑器', icon: 'edit' as IconName },
  { id: 'image', label: '图片', icon: 'image' as IconName },
  { id: 'export', label: '导出', icon: 'export' as IconName },
  { id: 'data', label: '数据', icon: 'save' as IconName },
  { id: 'shortcuts', label: '快捷键', icon: 'command' as IconName },
  { id: 'about', label: '关于', icon: 'info' as IconName },
]

const CATEGORY_TITLES: Record<string, { title: string; desc: string }> = {
  user: { title: '用户设置', desc: '你的昵称、头像与生日，让 MarkCraft 更懂你' },
  general: { title: '通用设置', desc: '启动、更新、语言与隐私等基础设置' },
  appearance: { title: '外观设置', desc: '主题、字体、动效与界面元素' },
  editor: { title: '编辑器设置', desc: '编辑体验、Markdown 预览与排版' },
  image: { title: '图片设置', desc: '图床类型与图片插入路径行为' },
  export: { title: '导出设置', desc: '默认导出格式、样式与图表渲染端点' },
  data: { title: '数据设置', desc: '视图大纲可见性与设置数据管理' },
  shortcuts: { title: '快捷键', desc: '所有键盘快捷键一览，可搜索' },
  about: { title: '关于 MarkCraft', desc: '版本信息、更新日志与相关链接' },
}

/**
 * 设置面板 Props
 */
export interface SettingsPanelProps {
  /** 导航回调 */
  nav?: (id: string) => void
  /** Toast 回调 */
  toast?: (msg: string) => void
  /** 进入设置时定位的分类（如头像点击 → 'user'）；无效或省略则落到默认分类 */
  initialCategory?: string
}

/**
 * Aurora 设置页
 * - 顶栏导航栏：分类切换（对齐白板 / 博客的顶栏结构）
 * - 右侧设置内容
 */
export function SettingsPanel({ nav, toast, initialCategory }: SettingsPanelProps) {
  const [activeCategory, setActiveCategory] = useState(
    () => (initialCategory && CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : 'general'),
  )
  const { openCommandPalette } = useCommandPalette()

  /** 内容区滑动切 Tab（跟手拖拽 / 触控板双指横滑） */
  const rootRef = useRef<HTMLDivElement>(null)
  const swipeLayerRef = useRef<HTMLDivElement>(null)

  /**
   * 进度联动：把位移映射为 --swipe-progress ∈ [-1,1]，
   * 挂到面板根节点（.aurora-settings），供顶栏指示器与内容层阴影共同消费。
   */
  const handleOffsetChange = useCallback((offset: number) => {
    const root = rootRef.current
    if (!root) return
    const width = swipeLayerRef.current?.clientWidth || root.clientWidth || 1
    const progress = Math.max(-1, Math.min(1, offset / width))
    root.style.setProperty('--swipe-progress', String(progress))
  }, [])

  const swipe = useSwipeTabs({
    index: CATEGORIES.findIndex((c) => c.id === activeCategory),
    count: CATEGORIES.length,
    onIndexChange: (next) => setActiveCategory(CATEGORIES[next].id),
    onOffsetChange: handleOffsetChange,
    // 位移落到内层无 padding 的包裹层，避免把 padding 一起推走
    targetRef: swipeLayerRef,
  })

  /** 拖拽结束后归零指示器进度 */
  useEffect(() => {
    if (!swipe.dragging) {
      rootRef.current?.style.setProperty('--swipe-progress', '0')
    }
  }, [swipe.dragging])

  // 外部带参进入（如侧栏头像点击）→ 同步定位到目标分类
  useEffect(() => {
    if (initialCategory && CATEGORIES.some((c) => c.id === initialCategory)) {
      setActiveCategory(initialCategory)
    }
  }, [initialCategory])

  const handleNav = (id: string) => {
    // 侧边栏导航：label → 路由 id，真正切换视图
    nav?.(resolveAuroraNav(id))
  }

  const renderCategory = (id: string) => {
    switch (id) {
      case 'user':
        return <UserSection toast={toast} />
      case 'general':
        return <GeneralSection toast={toast} />
      case 'appearance':
        return <AppearanceSection toast={toast} />
      case 'editor':
        return <EditorSection toast={toast} />
      case 'image':
        return <ImageSection toast={toast} />
      case 'export':
        return <ExportSection toast={toast} />
      case 'data':
        return <DataSection toast={toast} />
      case 'shortcuts':
        return <ShortcutsSection toast={toast} />
      case 'about':
        return <AboutSection toast={toast} />
      default:
        return <GeneralSection toast={toast} />
    }
  }

  const categoryInfo = CATEGORY_TITLES[activeCategory]

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="设置"
      onSidebarSelect={handleNav}
      breadcrumbs={['设置', categoryInfo.title]}
      statusRightItems={[
        { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-settings" ref={rootRef}>
        {/* 顶栏导航栏：分类切换（对齐白板 / 博客顶栏结构） */}
        <div className="aurora-settings__nav">
          <div
            className="aurora-settings__nav-tabs"
            role="tablist"
            aria-label="设置分类"
            data-swiping={swipe.dragging || undefined}
          >
            {CATEGORIES.map((cat, i) => {
              const IconComp = Icon[cat.icon]
              const isActive = cat.id === activeCategory
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-tab-index={i}
                  className={[
                    'aurora-settings__nav-tab',
                    isActive ? 'aurora-settings__nav-tab--active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setActiveCategory(cat.id)}
                  title={cat.label}
                >
                  <IconComp size={16} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 内容区（滑动切 Tab 手势绑定于此） */}
        <div
          className={`aurora-settings__content ${swipe.dragging ? 'is-swiping' : ''}`}
          {...swipe.bind}
        >
          <div className="aurora-settings__swipe-layer" ref={swipeLayerRef}>
            <div className="aurora-settings__header">
              <div className="aurora-settings__header-title">{categoryInfo.title}</div>
              <div className="aurora-settings__header-desc">{categoryInfo.desc}</div>
            </div>
            {renderCategory(activeCategory)}
          </div>
        </div>
      </div>
    </PageFrame>
  )
}
