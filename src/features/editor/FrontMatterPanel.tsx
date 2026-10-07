// Phase 4（2026-09-18）自 features/shared/ui/ **原样迁入**（内容一字未改）。
// 定位：编辑器业务 UI（读 @stores/LanguageStore 取文案），唯一消费者是
// features/editor/EditorSlots.tsx。
// 🎯 它是「环 #3 残余形态」两条反向边之一：寄居 features/shared 时构成
// features/shared → stores，使 stores > hooks > features/shared > stores 成环。
// 归位到消费方 feature 后，该边变为 features/editor → stores —— 合法（L5 → L3 向下）。
//
// ── 2026-09-24 旧皮肤迁移（审计 AUDIT-EDITOR-UI-LEGACY-SKIN §6 P2 收口）──────────
// 它属「编辑器系模态」家族，与批次 3 的 GoToLineDialog / LinkModal / TableGridSelector
// 同族，却是漏网的一个，且自持皮肤最完整：
//   · 遮罩 `rgba(0,0,0,.5)` + `blur(4px)` + **z-index 200** 手写（200 落在锚定浮层带
//     1000 之下 —— 模态本应阻断下层，层级给反了）；
//   · 面板/头部/底栏/字段的 `--editor-*` 旧变量（仅在 #aurora-root 内被重映射，
//     靠「碰巧在作用域内」才没翻旧）；
//   · 字段焦点环 `rgba(59,130,246,.2)` = Tailwind blue-500（横向缺陷 §7）；
//   · `handleFocus/handleBlur` 直接写 `currentTarget.style.*` 手搓 hover/focus 态。
// 现统一：遮罩/面板/头/底 → `.aurora-modal-overlay` + `.aurora-modal*`（z 3000 带）；
// 字段 → 共享 `Input`（`.aurora-field` label + `.aurora-input` 聚焦环）；开关 → 共享
// `Switch`（`.aurora-switch*`）；按钮 → `.aurora-btn`。经 createPortal 挂 body ⇒ 内部
// 只允许引用全局 `--mc-*`（见 features/editor/toolbar/portalOverlayBasis.test.ts）。
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { parseFrontMatter, generateFrontMatter } from '@utils/frontMatter'
import { useLanguage } from '@stores/LanguageStore'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { Input } from '@components/ui/Input'
import { Switch } from '@components/ui/Switch'

interface FrontMatterPanelProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onContentChange: (newContent: string) => void
}

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 模态正文：字段纵向排布（间距走内联结构值，外观一律交给 aurora 类） */
const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

/** 多行字段（textarea）：复用 .aurora-input 的材质/聚焦环，仅解开单行高度锁 */
const textareaClass = 'aurora-input aurora-input--multiline'

export default function FrontMatterPanel({ isOpen, onClose, content, onContentChange }: FrontMatterPanelProps) {
  const { t } = useLanguage()
  const [titleValue, setTitleValue] = useState('')
  const [dateValue, setDateValue] = useState('')
  const [tagsValue, setTagsValue] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [descriptionValue, setDescriptionValue] = useState('')
  const [authorValue, setAuthorValue] = useState('')
  const [coverImageValue, setCoverImageValue] = useState('')
  const [draftValue, setDraftValue] = useState(false)
  const [slugValue, setSlugValue] = useState('')
  const [layoutValue, setLayoutValue] = useState('post')
  const [permalinkValue, setPermalinkValue] = useState('')
  const [updatedValue, setUpdatedValue] = useState('')
  const [excerptValue, setExcerptValue] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const parsed = parseFrontMatter(content)
      const fm = parsed.frontMatter
      setTitleValue(fm.title || '')
      setDateValue(fm.date || getTodayString())
      setTagsValue(Array.isArray(fm.tags) ? fm.tags.join(', ') : '')
      setCategoryValue(fm.category || '')
      setDescriptionValue(fm.description || '')
      setAuthorValue(fm.author || '')
      setCoverImageValue(fm.coverImage || '')
      setDraftValue(fm.draft || false)
      setSlugValue(fm.slug || '')
      setLayoutValue(fm.layout || 'post')
      setPermalinkValue(fm.permalink || '')
      setUpdatedValue(fm.updated || '')
      setExcerptValue(fm.excerpt || '')
    }
  }, [isOpen, content])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleApply = () => {
    const parsed = parseFrontMatter(content)
    // 先铺开原 frontmatter：面板只掌管下列 13 个字段，其余自定义 YAML 键必须原样保留，否则会被静默删除
    const newFrontMatter = {
      ...parsed.frontMatter,
      title: titleValue,
      date: dateValue,
      tags: tagsValue.split(',').map(t => t.trim()).filter(Boolean),
      category: categoryValue,
      description: descriptionValue,
      author: authorValue,
      coverImage: coverImageValue,
      draft: draftValue,
      slug: slugValue,
      layout: layoutValue,
      permalink: permalinkValue,
      updated: updatedValue,
      excerpt: excerptValue,
    }
    const fmString = generateFrontMatter(newFrontMatter)
    const newContent = fmString + '\n' + parsed.content
    onContentChange(newContent)
    onClose()
  }

  if (!isOpen) return null

  // 模态：遮罩/面板/头部/底栏/按钮一律走 aurora 单源类（z-index 3000 带、材质、hover、
  // 聚焦环全由类提供）。createPortal 到 body 已脱离 #aurora-root，内部只引用全局 --mc-* token。
  return createPortal(
    <div
      className="aurora-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.frontMatter.title}
        className="aurora-modal"
        style={{ minWidth: 0, width: 520, maxWidth: '90vw', maxHeight: '85vh' }}
      >
        <div className="aurora-modal__header">
          <div className="aurora-modal__title">{t.frontMatter.title}</div>
          <button
            className="aurora-modal__close"
            onClick={onClose}
            aria-label={t.frontMatter.close}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="aurora-modal__body" style={bodyStyle}>
          <Input
            type="text"
            label={t.frontMatter.articleTitle}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            placeholder={t.frontMatter.articleTitlePlaceholder}
          />

          <Input
            type="text"
            label={t.frontMatter.date}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            placeholder="YYYY-MM-DD"
          />

          <Input
            type="text"
            label={t.frontMatter.tags}
            value={tagsValue}
            onChange={(e) => setTagsValue(e.target.value)}
            placeholder={t.frontMatter.tagsPlaceholder}
          />

          <Input
            type="text"
            label={t.frontMatter.category}
            value={categoryValue}
            onChange={(e) => setCategoryValue(e.target.value)}
            placeholder={t.frontMatter.categoryPlaceholder}
          />

          <div className="aurora-field">
            <label className="aurora-field__label" htmlFor="fm-description">{t.frontMatter.description}</label>
            <textarea
              id="fm-description"
              className={textareaClass}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder={t.frontMatter.descriptionPlaceholder}
              rows={3}
            />
          </div>

          <Input
            type="text"
            label={t.frontMatter.author}
            value={authorValue}
            onChange={(e) => setAuthorValue(e.target.value)}
            placeholder={t.frontMatter.authorPlaceholder}
          />

          <Input
            type="text"
            label={t.frontMatter.coverImage}
            value={coverImageValue}
            onChange={(e) => setCoverImageValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="aurora-field__label">{t.frontMatter.draft}</span>
            <Switch checked={draftValue} onChange={setDraftValue} />
          </div>

          {/* 高级设置折叠区域 */}
          <div style={{ borderTop: '1px solid var(--mc-border-subtle)', paddingTop: 12 }}>
            <button
              type="button"
              className="aurora-btn aurora-btn--sm aurora-btn--ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                style={{
                  transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform var(--mc-dur-fast) var(--mc-ease-out)',
                }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              {t.frontMatter.advancedSettings}
            </button>
          </div>

          {showAdvanced && (
            <>
              <Input
                type="text"
                label={t.frontMatter.slug}
                value={slugValue}
                onChange={(e) => setSlugValue(e.target.value)}
                placeholder={t.frontMatter.slugPlaceholder}
              />

              <div className="aurora-field">
                <span className="aurora-field__label">{t.frontMatter.layout}</span>
                <AuroraSelect
                  value={layoutValue}
                  onChange={(v) => setLayoutValue(v)}
                  options={[
                    { value: 'post', label: t.frontMatter.layoutPost },
                    { value: 'page', label: t.frontMatter.layoutPage },
                  ]}
                  className="aurora-select--block"
                />
              </div>

              <Input
                type="text"
                label={t.frontMatter.permalink}
                value={permalinkValue}
                onChange={(e) => setPermalinkValue(e.target.value)}
                placeholder={t.frontMatter.permalinkPlaceholder}
              />

              <Input
                type="text"
                label={t.frontMatter.updated}
                value={updatedValue}
                onChange={(e) => setUpdatedValue(e.target.value)}
                placeholder="YYYY-MM-DD"
              />

              <div className="aurora-field">
                <label className="aurora-field__label" htmlFor="fm-excerpt">{t.frontMatter.excerpt}</label>
                <textarea
                  id="fm-excerpt"
                  className={textareaClass}
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                  placeholder={t.frontMatter.excerptPlaceholder}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="aurora-modal__footer">
          <button className="aurora-btn aurora-btn--sm aurora-btn--ghost" onClick={onClose}>
            {t.frontMatter.cancel}
          </button>
          <button className="aurora-btn aurora-btn--sm aurora-btn--primary" onClick={handleApply}>
            {t.frontMatter.apply}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
