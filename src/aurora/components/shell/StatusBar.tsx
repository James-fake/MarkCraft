import React from 'react'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 状态栏项
 */
export interface StatusBarItem {
  /** 内容（文字或元素） */
  content: React.ReactNode
  /** 是否可点击 */
  clickable?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 提示文本 */
  title?: string
}

/**
 * Aurora 状态栏组件（P1-4 · 净化语义）
 * - 布局：左 = 文档状态 + 视图统计；右 = 模式 / 环境 / 命令入口；用 · 分隔
 * - 保存态为「文档型面板专属」：仅当显式传入 savedState 才渲染，避免
 *   无文档页面（欢迎 / 设置 / 白板等）出现伪「已保存」
 */
export interface StatusBarProps {
  /** 左侧项目列表（视图统计等；savedState 会渲染在其最前） */
  leftItems?: StatusBarItem[]
  /** 右侧项目列表 */
  rightItems?: StatusBarItem[]
  /** 保存状态：仅文档型面板传入（如编辑器接 tab.isDirty）；不传则不渲染保存态 */
  savedState?: 'saved' | 'unsaved' | 'saving'
  /** 保存状态文字（默认"已保存"/"未保存"） */
  savedText?: string
}

export function StatusBar({
  leftItems,
  rightItems,
  savedState,
  savedText,
}: StatusBarProps) {
  const { t } = useLanguage()
  const sh = t.shell
  const savedItem: StatusBarItem | null =
    savedState === undefined
      ? null
      : {
          content: (
            <>
              <span className={[
                'aurora-statusbar__dot',
                savedState === 'unsaved' ? 'aurora-statusbar__dot--unsaved' : '',
              ].filter(Boolean).join(' ')} />
              {savedText ?? (savedState === 'saved' ? sh.savedStatus : savedState === 'unsaved' ? sh.unsavedStatus : sh.savingStatus)}
            </>
          ),
        }

  const finalLeftItems: StatusBarItem[] = savedItem ? [savedItem, ...(leftItems ?? [])] : (leftItems ?? [])
  const finalRightItems = rightItems ?? []

  return (
    <div className="aurora-statusbar" role="status">
      {finalLeftItems.length > 0 && (
        <div className="aurora-statusbar__left">
          {finalLeftItems.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="aurora-statusbar__sep">·</span>}
              <span
                className={[
                  'aurora-statusbar__item',
                  item.clickable || item.onClick ? 'aurora-statusbar__item--clickable' : '',
                ].filter(Boolean).join(' ')}
                onClick={item.onClick}
                title={item.title}
              >
                {item.content}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      {finalRightItems.length > 0 && (
        <div className="aurora-statusbar__right">
          {finalRightItems.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="aurora-statusbar__sep">·</span>}
              <span
                className={[
                  'aurora-statusbar__item',
                  item.clickable || item.onClick ? 'aurora-statusbar__item--clickable' : '',
                ].filter(Boolean).join(' ')}
                onClick={item.onClick}
                title={item.title}
              >
                {item.content}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
