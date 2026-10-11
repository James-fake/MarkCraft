import { useMemo, useState, useCallback } from 'react'
import { Icon } from '../../icons'
import { extractFootnotes, type FootnoteItem, countFootnoteReferences, firstFootnoteReferenceLine, editFootnoteDefinition, deleteFootnote, addFootnote } from '@features/editor/footnote'
import { useLanguage } from '@stores/LanguageStore'

interface AuroraFootnotesProps {
  /** 当前笔记 Markdown 源码（来自编辑器 localContent） */
  content: string
  /** 点击脚注：跳转正文引用 / 定义并高亮 */
  onFootnoteClick: (footnoteId: string, line: number) => void
  /** 当前高亮脚注 id（由点击跳转设置） */
  activeFootnoteId?: string | null
  /** 编辑回写（新增 / 编辑定义 / 删除） */
  onChange?: (next: string) => void
}

/**
 * Aurora 脚注面板（编辑器右栏 · 脚注 Tab · 换芯 + 可编辑）
 *
 *  - 数据：真实 `extractFootnotes`（与正文渲染同源）。
 *  - 交互：点击经 onFootnoteClick 滚动定位定义；双击定义可直接编辑；每条显示
 *          「被引用 N 处」并可一键跳回首个引用点；顶部「+ 新增脚注」追加定义。
 *  - 纯函数（编辑/删除/新增/计数）落在 @features/editor/footnote，便于单测。
 */
export function AuroraFootnotes({ content, onFootnoteClick, activeFootnoteId, onChange }: AuroraFootnotesProps) {
  const { t } = useLanguage()
  const footnotes = useMemo<FootnoteItem[]>(() => extractFootnotes(content), [content])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const flash = useCallback((el: HTMLElement) => {
    el.classList.add('footnote-highlight')
    window.setTimeout(() => el.classList.remove('footnote-highlight'), 3000)
  }, [])

  const scrollToReference = useCallback((id: string) => {
    const refEl = document.getElementById(`footnote-ref-${id}`)
    if (refEl) {
      refEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      flash(refEl)
      return
    }
    const line = firstFootnoteReferenceLine(content, id)
    if (line > 0) {
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      const cmLine = document.querySelectorAll('.cm-line')[line - 1] as HTMLElement | null
      if (scroller && cmLine) {
        scroller.scrollTo({ top: Math.max(0, cmLine.offsetTop - 16), behavior: 'smooth' })
        flash(cmLine)
      }
    }
  }, [content, flash])

  const commitEdit = useCallback(() => {
    if (editingId == null || !onChange) { setEditingId(null); return }
    onChange(editFootnoteDefinition(content, editingId, editValue))
    setEditingId(null)
  }, [editingId, editValue, content, onChange])

  const handleDelete = useCallback((id: string) => {
    if (!onChange) return
    if (window.confirm(t.footnote.deleteConfirm)) onChange(deleteFootnote(content, id))
  }, [content, onChange, t])

  const handleAdd = useCallback(() => {
    if (!onChange) return
    onChange(addFootnote(content).text)
  }, [content, onChange])

  return (
    <div className="aurora-footnotes">
      <div className="aurora-outline__header">
        <div className="aurora-outline__title">
          <span className="aurora-outline__title-bar" />
          <span>{t.footnote.title}</span>
          {footnotes.length > 0 && <span className="aurora-outline__count">{footnotes.length} 条</span>}
        </div>
        {onChange && (
          <button
            type="button"
            className="aurora-footnotes__add"
            onClick={handleAdd}
            title={t.footnote.add}
            aria-label={t.footnote.add}
          >
            <Icon.plus size={14} />
          </button>
        )}
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
            const refCount = countFootnoteReferences(content, fn.id)
            const isEditing = editingId === fn.id
            return (
              <div key={fn.id} className={`aurora-footnotes__item ${isActive ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="aurora-footnotes__main"
                  onClick={() => onFootnoteClick(fn.id, fn.line)}
                  title={fn.fullContent}
                >
                  <span className="aurora-footnotes__index">{i + 1}</span>
                  <span className="aurora-footnotes__ref">[^{refId}]</span>
                  {isEditing ? (
                    <span
                      className="aurora-footnotes__editwrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        className="aurora-footnotes__edit"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitEdit() }
                          if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                        }}
                      />
                    </span>
                  ) : (
                    <span
                      className="aurora-footnotes__content"
                      onDoubleClick={() => { if (onChange) { setEditingId(fn.id); setEditValue(fn.fullContent) } }}
                      title={onChange ? t.footnote.edit : fn.fullContent}
                    >
                      {fn.content}
                    </span>
                  )}
                </button>
                <div className="aurora-footnotes__meta">
                  <span className="aurora-footnotes__refcount">
                    {t.footnote.referencedBy.replace('{n}', String(refCount))}
                  </span>
                  {onChange && (
                    <span className="aurora-footnotes__actions">
                      <button
                        type="button"
                        className="aurora-footnotes__act"
                        onClick={() => scrollToReference(fn.id)}
                        title={t.footnote.jumpToRef}
                        aria-label={t.footnote.jumpToRef}
                      >
                        <Icon.arrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="aurora-footnotes__act"
                        onClick={() => { setEditingId(fn.id); setEditValue(fn.fullContent) }}
                        title={t.footnote.edit}
                        aria-label={t.footnote.edit}
                      >
                        <Icon.edit size={12} />
                      </button>
                      <button
                        type="button"
                        className="aurora-footnotes__act aurora-footnotes__act--danger"
                        onClick={() => handleDelete(fn.id)}
                        title={t.footnote.delete}
                        aria-label={t.footnote.delete}
                      >
                        <Icon.trash size={12} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AuroraFootnotes
