import { useMemo } from 'react'
import { Icon } from '../../icons'
import { extractFootnotes, type FootnoteItem } from '@features/editor/footnote'
import { useLanguage } from '@stores/LanguageStore'

interface AuroraFootnotesProps {
  /** 当前笔记 Markdown 源码（来自编辑器 localContent） */
  content: string
  /** 点击脚注：跳转正文引用 / 定义并高亮 */
  onFootnoteClick: (footnoteId: string, line: number) => void
  /** 当前高亮脚注 id（由点击跳转设置） */
  activeFootnoteId?: string | null
}

/**
 * Aurora 脚注面板（编辑器右栏 · 脚注 Tab · 换芯）
 *
 * 对齐 Aurora 设计（与大纲 Tab 同款视觉语言）：
 *  - 数据：真实 `extractFootnotes`（与正文渲染同源）。
 *  - 界面：面板头（标题 + 计数）+ 脚注列表；行高 / 字号 / 圆角 / 缩进 / 当前高亮
 *          均沿用 Aurora `--mc-*` token，无任何旧界面的渐变条 / 彩色圆点 / 胶囊徽章 / Inter 字体。
 *  - 交互：点击经 onFootnoteClick 滚动定位 + 高亮；默认展开（旧组件默认折叠是错误行为）。
 */
export function AuroraFootnotes({ content, onFootnoteClick, activeFootnoteId }: AuroraFootnotesProps) {
  const { t } = useLanguage()
  const footnotes = useMemo<FootnoteItem[]>(() => extractFootnotes(content), [content])

  return (
    <div className="aurora-footnotes">
      <div className="aurora-outline__header">
        <div className="aurora-outline__title">
          <span className="aurora-outline__title-bar" />
          <span>{t.footnote.title}</span>
          {footnotes.length > 0 && <span className="aurora-outline__count">{footnotes.length} 条</span>}
        </div>
      </div>

      <div className="aurora-footnotes__list">
        {footnotes.length === 0 ? (
          <div className="aurora-footnotes__empty">
            <Icon.bookmark size={26} />
            <div className="aurora-footnotes__empty-title">{t.footnote.noFootnotes}</div>
            <div className="aurora-footnotes__empty-sub">{t.footnote.addFootnoteTip}</div>
          </div>
        ) : (
          footnotes.map((fn, i) => {
            const isActive = activeFootnoteId === fn.id
            const refId = fn.id.split('-')[0] || fn.id
            return (
              <button
                key={fn.id}
                type="button"
                className={`aurora-footnotes__item ${isActive ? 'is-active' : ''}`}
                onClick={() => onFootnoteClick(fn.id, fn.line)}
                title={fn.fullContent}
              >
                <span className="aurora-footnotes__index">{i + 1}</span>
                <span className="aurora-footnotes__ref">[^{refId}]</span>
                <span className="aurora-footnotes__content">{fn.content}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AuroraFootnotes
