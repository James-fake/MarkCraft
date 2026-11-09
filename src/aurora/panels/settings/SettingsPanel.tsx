import { useState, useEffect } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useLanguage } from '@stores/LanguageStore'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import { GeneralSection } from './sections/GeneralSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { EditorSection } from './sections/EditorSection'
import { ImageSection } from './sections/ImageSection'
import { ExportSection } from './sections/ExportSection'
import { DataSection } from './sections/DataSection'
import { ShortcutsSection } from './sections/ShortcutsSection'
import { AboutSection } from './sections/AboutSection'
import { UserSection } from './sections/UserSection'
import { PrivacySection } from './sections/PrivacySection'
import { SettingsBrowser } from './SettingsBrowser'

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

const CATEGORY_IDS: { id: string; icon: IconName; labelKey: 'catUser' | 'catGeneral' | 'catAppearance' | 'catEditor' | 'catImage' | 'catExport' | 'catData' | 'catShortcuts' | 'catAbout' | 'catPrivacy' }[] = [
  { id: 'user', labelKey: 'catUser', icon: 'user' as IconName },
  { id: 'general', labelKey: 'catGeneral', icon: 'settings' as IconName },
  { id: 'appearance', labelKey: 'catAppearance', icon: 'sun' as IconName },
  { id: 'editor', labelKey: 'catEditor', icon: 'edit' as IconName },
  { id: 'image', labelKey: 'catImage', icon: 'image' as IconName },
  { id: 'export', labelKey: 'catExport', icon: 'export' as IconName },
  { id: 'data', labelKey: 'catData', icon: 'save' as IconName },
  { id: 'shortcuts', labelKey: 'catShortcuts', icon: 'command' as IconName },
  { id: 'about', labelKey: 'catAbout', icon: 'info' as IconName },
  { id: 'privacy', labelKey: 'catPrivacy', icon: 'shield' as IconName },
]

const CATEGORY_TITLE_KEYS = {
  user: ['userTitle', 'userDesc'],
  general: ['generalTitle', 'generalDesc'],
  appearance: ['appearanceTitle', 'appearanceDesc'],
  editor: ['editorTitle', 'editorDesc'],
  image: ['imageTitle', 'imageDesc'],
  export: ['exportTitle', 'exportDesc'],
  data: ['dataTitle', 'dataDesc'],
  shortcuts: ['shortcutsTitle', 'shortcutsDesc'],
  about: ['aboutTitle', 'aboutDesc'],
  privacy: ['privacyTitle', 'privacyDesc'],
} as const

/**
 * 设置面板 Props
 */
export interface SettingsPanelProps {
  /** 导航回调（第二参数用于视图内定位，如 nav('kb', kbId) 直达某个知识库） */
  nav?: (id: string, param?: string) => void
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
    () => (initialCategory && CATEGORY_IDS.some((c) => c.id === initialCategory) ? initialCategory : 'general'),
  )
  const { openCommandPalette } = useCommandPalette()
  const { t } = useLanguage()
  const SP = t.settingsPanel
  /** 应用内浏览器视图（「关于」里的 官方网站 / 反馈问题）—— 非 null 时占满内容区 */
  const [browserUrl, setBrowserUrl] = useState<string | null>(null)

  /**
   * 顶栏分类切换 = Apple 分段控件式滑块（需求 N 第四轮定案）。
   *
   * 一条**常驻方块**覆盖在选中项上；按住 tab 拖动时**只有滑块**跟手滑，
   * tab 文字与内容区一个像素都不动；松手滑块过渡滑到最近的 tab（拖过一半就切）。
   * 形态与参数说明见 hooks/tabStripSwipe.ts。
   */
  const tabs = useTabStripThumb({
    index: Math.max(0, CATEGORY_IDS.findIndex((c) => c.id === activeCategory)),
    count: CATEGORY_IDS.length,
    onIndexChange: (next) => setActiveCategory(CATEGORY_IDS[next].id),
  })

  // 外部带参进入（如侧栏头像点击）→ 同步定位到目标分类
  useEffect(() => {
    if (initialCategory && CATEGORY_IDS.some((c) => c.id === initialCategory)) {
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
        return <AboutSection toast={toast} nav={nav} onOpenBrowser={setBrowserUrl} />
      case 'privacy':
        return <PrivacySection />
      default:
        return <GeneralSection toast={toast} />
    }
  }

  const categoryInfo = (() => {
    const [titleKey, descKey] = CATEGORY_TITLE_KEYS[activeCategory as keyof typeof CATEGORY_TITLE_KEYS] ?? ['userTitle', 'userDesc']
    return { title: SP[titleKey], desc: SP[descKey] }
  })()
  const categories: SettingsCategory[] = CATEGORY_IDS.map((c) => ({ id: c.id, label: SP[c.labelKey], icon: c.icon }))

  return (
    <PageFrame
      sidebarGroups={buildAuroraSidebarGroups(t)}
      sidebarActiveId="settings"
      onSidebarSelect={handleNav}
      breadcrumbs={[SP.breadcrumb, categoryInfo.title]}
      statusRightItems={[
        { content: t.welcome.cmdPalette, clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-settings">
        {/* 顶栏导航栏：Apple 分段控件式滑块（需求 N 第四轮定案）
         *  选中态 = 一条**常驻滑块**；按住 tab 拖动时**只有滑块**跟手滑，
         *  tab 文字与内容区一个像素都不动；松手滑块过渡到目标 tab。 */}
        <div className="aurora-settings__nav">
          <div
            className="aurora-settings__nav-tabs"
            role="tablist"
            aria-label={SP.aria}
            data-swiping={tabs.dragging || undefined}
            {...tabs.bind}
          >
            {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中） */}
            <div className="aurora-settings__nav-track" ref={tabs.trackRef}>
              {/* 滑块：选中态的视觉承载者（选中底色已从 tab 迁到这里） */}
              <span className="aurora-settings__nav-thumb" ref={tabs.thumbRef} aria-hidden="true" />
              {categories.map((cat) => {
                const IconComp = Icon[cat.icon]
                const isActive = cat.id === activeCategory
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={[
                      'aurora-settings__nav-tab',
                      isActive ? 'aurora-settings__nav-tab--active' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => { setActiveCategory(cat.id); setBrowserUrl(null) }}
                    title={cat.label}
                  >
                    <IconComp size={16} />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 内容区：完全不参与滑动（需求 N 第四轮：内容区零位移，第三轮的「呼应位移」已删） */}
        <div className="aurora-settings__content">
          {browserUrl ? (
            <SettingsBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />
          ) : (
            <>
              <div className="aurora-settings__header">
                <div className="aurora-settings__header-title">{categoryInfo.title}</div>
                <div className="aurora-settings__header-desc">{categoryInfo.desc}</div>
              </div>
              {renderCategory(activeCategory)}
            </>
          )}
        </div>
      </div>
    </PageFrame>
  )
}
