// Phase 4（2026-09-18）自 features/shared/ui/ **原样迁入**（内容一字未改）。
// 定位：编辑器业务 UI（读 @stores/LanguageStore 取文案），唯一消费者是
// features/editor/EditorSlots.tsx。
// 🎯 它是「环 #3 残余形态」两条反向边之一：寄居 features/shared 时构成
// features/shared → stores，使 stores > hooks > features/shared > stores 成环。
// 归位到消费方 feature 后，该边变为 features/editor → stores —— 合法（L5 → L3 向下）。
import { useState, useEffect } from 'react'
import { parseFrontMatter, generateFrontMatter } from '@utils/frontMatter'
import { useLanguage } from '@stores/LanguageStore'
import { AuroraSelect } from '@components/ui/AuroraSelect'

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid var(--editor-border)',
  borderRadius: 6,
  backgroundColor: 'rgba(128, 128, 128, 0.08)',
  color: 'var(--editor-text)',
  outline: 'none',
  fontFamily: "'Inter', -apple-system, sans-serif",
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--editor-text)',
  opacity: 0.8,
  fontFamily: "'Inter', -apple-system, sans-serif",
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--link-color)'
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)'
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--editor-border)'
  e.currentTarget.style.boxShadow = 'none'
}

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
    const newFrontMatter = {
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.frontMatter.title}
        style={{
          width: 520,
          maxWidth: '90vw',
          maxHeight: '85vh',
          backgroundColor: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--editor-border)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--editor-border)',
          flexShrink: 0,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: 'var(--editor-text)',
          }}>
            {t.frontMatter.title}
          </h3>
          <button
            onClick={onClose}
            aria-label={t.frontMatter.close}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.articleTitle}</label>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder={t.frontMatter.articleTitlePlaceholder}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.date}</label>
            <input
              type="text"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.tags}</label>
            <input
              type="text"
              value={tagsValue}
              onChange={(e) => setTagsValue(e.target.value)}
              placeholder={t.frontMatter.tagsPlaceholder}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.category}</label>
            <input
              type="text"
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              placeholder={t.frontMatter.categoryPlaceholder}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.description}</label>
            <textarea
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder={t.frontMatter.descriptionPlaceholder}
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.author}</label>
            <input
              type="text"
              value={authorValue}
              onChange={(e) => setAuthorValue(e.target.value)}
              placeholder={t.frontMatter.authorPlaceholder}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.frontMatter.coverImage || '封面图片'}</label>
            <input
              type="text"
              value={coverImageValue}
              onChange={(e) => setCoverImageValue(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={fieldGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>{t.frontMatter.draft || '草稿'}</label>
              <button
                type="button"
                onClick={() => setDraftValue(!draftValue)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  border: 'none',
                  backgroundColor: draftValue ? 'var(--button-primary)' : 'rgba(128,128,128,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: draftValue ? 20 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>

          {/* 高级设置折叠区域 */}
          <div style={{ borderTop: '1px solid var(--editor-border)', paddingTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--editor-text)',
                fontSize: 12,
                fontWeight: 500,
                opacity: 0.7,
                padding: '4px 0',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {t.frontMatter.advancedSettings || '高级设置'}
            </button>
          </div>

          {showAdvanced && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>{t.frontMatter.slug || 'URL 路径 (slug)'}</label>
                <input
                  type="text"
                  value={slugValue}
                  onChange={(e) => setSlugValue(e.target.value)}
                  placeholder={t.frontMatter.slugPlaceholder || '留空则自动从标题生成'}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>{t.frontMatter.layout || '布局'}</label>
                <AuroraSelect
                  value={layoutValue}
                  onChange={(v) => setLayoutValue(v)}
                  options={[
                    { value: 'post', label: t.frontMatter.layoutPost || '文章 (post)' },
                    { value: 'page', label: t.frontMatter.layoutPage || '页面 (page)' },
                  ]}
                  className="aurora-select--block"
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>{t.frontMatter.permalink || '永久链接'}</label>
                <input
                  type="text"
                  value={permalinkValue}
                  onChange={(e) => setPermalinkValue(e.target.value)}
                  placeholder={t.frontMatter.permalinkPlaceholder || '留空则自动生成'}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>{t.frontMatter.updated || '更新日期'}</label>
                <input
                  type="text"
                  value={updatedValue}
                  onChange={(e) => setUpdatedValue(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>{t.frontMatter.excerpt || '自定义摘要'}</label>
                <textarea
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                  placeholder={t.frontMatter.excerptPlaceholder || '留空则自动截取正文前200字'}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '12px 20px 16px',
          borderTop: '1px solid var(--editor-border)',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid var(--editor-border)',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: 'var(--editor-text)',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {t.frontMatter.cancel}
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'var(--button-primary)',
              color: '#ffffff',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--button-primary-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--button-primary)' }}
          >
            {t.frontMatter.apply}
          </button>
        </div>
      </div>
    </div>
  )
}
