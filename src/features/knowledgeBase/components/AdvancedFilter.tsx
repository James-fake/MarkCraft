/**
 * AdvancedFilter - 高级筛选器组件
 * 折叠式面板，支持标签/路径/日期/字数/链接数等多维度筛选
 * 实时触发 onChange
 */
import React, { useState, useCallback } from 'react'
import { KB_COLORS } from '../kbTheme'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import type { QueryFilters } from '@stores/kbTypes'
import { useLanguage } from '../../../stores/LanguageStore'

interface AdvancedFilterProps {
  /** 当前筛选器状态 */
  filters: QueryFilters
  /** 筛选器变化回调（实时触发） */
  onChange: (filters: QueryFilters) => void
  /** 可选的标签列表（来自知识库已收集的标签） */
  availableTags: string[]
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ filters, onChange, availableTags }) => {
  const { t } = useLanguage()
  const KF = t.kbFilter
  const [expanded, setExpanded] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagNotInput, setTagNotInput] = useState('')

  /** 通用更新方法：合并 patch 后触发 onChange */
  const update = useCallback((patch: Partial<QueryFilters>) => {
    onChange({ ...filters, ...patch })
  }, [filters, onChange])

  /** 切换标签选中状态（AND 逻辑：必须包含所有选中的标签） */
  const toggleTag = (tag: string) => {
    const current = filters.tags ?? []
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag]
    update({ tags: next.length > 0 ? next : undefined })
  }

  /** 添加排除标签 */
  const addTagNot = () => {
    const tag = tagNotInput.trim().replace(/^#/, '')
    if (!tag) return
    const current = filters.tagsNot ?? []
    if (!current.includes(tag)) {
      update({ tagsNot: [...current, tag] })
    }
    setTagNotInput('')
  }

  /** 移除排除标签 */
  const removeTagNot = (tag: string) => {
    const current = filters.tagsNot ?? []
    const next = current.filter(t => t !== tag)
    update({ tagsNot: next.length > 0 ? next : undefined })
  }

  /** 添加包含标签（手动输入） */
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (!tag) return
    const current = filters.tags ?? []
    if (!current.includes(tag)) {
      update({ tags: [...current, tag] })
    }
    setTagInput('')
  }

  /** 更新日期范围 */
  const updateDateRange = (start?: number, end?: number) => {
    if (start === undefined && end === undefined) {
      update({ dateRange: undefined })
      return
    }
    update({
      dateRange: {
        start: start ?? filters.dateRange?.start ?? 0,
        end: end ?? filters.dateRange?.end ?? Date.now(),
      },
    })
  }

  /** 更新字数范围 */
  const updateWordCount = (min?: number, max?: number) => {
    if (min === undefined && max === undefined) {
      update({ wordCountRange: undefined })
      return
    }
    update({
      wordCountRange: {
        min: min ?? filters.wordCountRange?.min ?? 0,
        max: max ?? filters.wordCountRange?.max ?? Number.MAX_SAFE_INTEGER,
      },
    })
  }

  /** 更新链接数范围 */
  const updateLinkCount = (min?: number, max?: number) => {
    if (min === undefined && max === undefined) {
      update({ linkCountRange: undefined })
      return
    }
    update({
      linkCountRange: {
        min: min ?? filters.linkCountRange?.min ?? 0,
        max: max ?? filters.linkCountRange?.max ?? Number.MAX_SAFE_INTEGER,
      },
    })
  }

  /** 重置所有筛选器 */
  const resetAll = () => {
    onChange({})
    setTagInput('')
    setTagNotInput('')
  }

  // 统计已激活的筛选条件数量
  const activeCount = [
    filters.tags?.length,
    filters.tagsNot?.length,
    filters.pathPattern,
    filters.dateRange,
    filters.wordCountRange,
    filters.linkCountRange,
    filters.hasCanvas,
  ].filter(v => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0)).length

  return (
    <div style={{
      backgroundColor: KB_COLORS.bgCard,
      borderRadius: 8,
      border: `1px solid ${KB_COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* 折叠头部 */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = KB_COLORS.bgHover)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={{ fontSize: 12, color: expanded ? KB_COLORS.primary : KB_COLORS.textSecondary }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: KB_COLORS.textMain }}>
          高级筛选
        </span>
        {activeCount > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, padding: '0 6px', borderRadius: 9,
            backgroundColor: KB_COLORS.primary, color: '#fff',
            fontSize: 11, fontWeight: 600,
          }}>
            {activeCount}
          </span>
        )}
        {activeCount > 0 && expanded && (
          <button
            onClick={e => { e.stopPropagation(); resetAll() }}
            style={{
              marginLeft: 'auto', padding: '2px 8px', fontSize: 11,
              border: `1px solid ${KB_COLORS.border}`, borderRadius: 4,
              backgroundColor: KB_COLORS.bg, color: KB_COLORS.textSecondary,
              cursor: 'pointer',
            }}
          >
            清空
          </button>
        )}
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div style={{
          padding: '8px 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 12,
          borderTop: `1px solid ${KB_COLORS.border}`,
        }}>
          {/* 标签逻辑切换 */}
          <FilterGroup label={KF.tagLogic}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['and', 'or'] as const).map(logic => (
                <label key={logic} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: KB_COLORS.textMain, cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="tagLogic"
                    checked={(filters.tagLogic ?? 'and') === logic}
                    onChange={() => update({ tagLogic: logic })}
                    style={{ cursor: 'pointer' }}
                  />
                  {logic === 'and' ? KF.logicAnd : KF.logicOr}
                </label>
              ))}
            </div>
          </FilterGroup>

          {/* 包含标签 */}
          <FilterGroup label={`包含标签${filters.tags?.length ? ` (${filters.tags.length})` : ''}`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {(filters.tags ?? []).map(tag => (
                <span key={tag} style={tagChipStyle}>
                  #{tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    style={chipRemoveBtnStyle}
                  >×</button>
                </span>
              ))}
            </div>
            {/* 可选标签快速选择 */}
            {availableTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {availableTags
                  .filter(t => !(filters.tags ?? []).includes(t))
                  .slice(0, 12)
                  .map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={tagQuickBtnStyle}
                    >+ {tag}</button>
                  ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTag() }}
                placeholder={KF.tagPlaceholder}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={addTag} style={addBtnStyle}>添加</button>
            </div>
          </FilterGroup>

          {/* 排除标签 */}
          <FilterGroup label={`排除标签${filters.tagsNot?.length ? ` (${filters.tagsNot.length})` : ''}`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {(filters.tagsNot ?? []).map(tag => (
                <span key={tag} style={tagNotChipStyle}>
                  #{tag}
                  <button
                    onClick={() => removeTagNot(tag)}
                    style={chipRemoveBtnStyle}
                  >×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={tagNotInput}
                onChange={e => setTagNotInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTagNot() }}
                placeholder={KF.excludePlaceholder}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={addTagNot} style={addBtnStyle}>排除</button>
            </div>
          </FilterGroup>

          {/* 路径模式 */}
          <FilterGroup label={KF.pathPattern}>
            <input
              value={filters.pathPattern ?? ''}
              onChange={e => update({ pathPattern: e.target.value || undefined })}
              placeholder={KF.pathPlaceholder}
              style={inputStyle}
            />
          </FilterGroup>

          {/* 日期范围 */}
          <FilterGroup label={KF.dateRange}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={filters.dateRange?.start ? toDateInput(filters.dateRange.start) : ''}
                onChange={e => updateDateRange(
                  e.target.value ? new Date(e.target.value).getTime() : undefined,
                  filters.dateRange?.end
                )}
                style={inputStyle}
              />
              <span style={{ color: KB_COLORS.textTertiary, fontSize: 12 }}>~</span>
              <input
                type="date"
                value={filters.dateRange?.end ? toDateInput(filters.dateRange.end) : ''}
                onChange={e => updateDateRange(
                  filters.dateRange?.start,
                  e.target.value ? new Date(e.target.value).getTime() + 86400000 - 1 : undefined
                )}
                style={inputStyle}
              />
            </div>
          </FilterGroup>

          {/* 字数范围 */}
          <FilterGroup label={KF.wordRange}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ScrollNumberInput
                min={0}
                value={filters.wordCountRange?.min ?? ''}
                onChange={(n) => updateWordCount(
                  Number.isNaN(n) ? undefined : n,
                  filters.wordCountRange?.max
                )}
                placeholder={KF.min}
                style={inputStyle}
              />
              <span style={{ color: KB_COLORS.textTertiary, fontSize: 12 }}>~</span>
              <ScrollNumberInput
                min={0}
                value={filters.wordCountRange?.max === Number.MAX_SAFE_INTEGER ? '' : (filters.wordCountRange?.max ?? '')}
                onChange={(n) => updateWordCount(
                  filters.wordCountRange?.min,
                  Number.isNaN(n) ? undefined : n
                )}
                placeholder={KF.max}
                style={inputStyle}
              />
            </div>
          </FilterGroup>

          {/* 链接数范围 */}
          <FilterGroup label={KF.linkRange}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ScrollNumberInput
                min={0}
                value={filters.linkCountRange?.min ?? ''}
                onChange={(n) => updateLinkCount(
                  Number.isNaN(n) ? undefined : n,
                  filters.linkCountRange?.max
                )}
                placeholder={KF.min}
                style={inputStyle}
              />
              <span style={{ color: KB_COLORS.textTertiary, fontSize: 12 }}>~</span>
              <ScrollNumberInput
                min={0}
                value={filters.linkCountRange?.max === Number.MAX_SAFE_INTEGER ? '' : (filters.linkCountRange?.max ?? '')}
                onChange={(n) => updateLinkCount(
                  filters.linkCountRange?.min,
                  Number.isNaN(n) ? undefined : n
                )}
                placeholder={KF.max}
                style={inputStyle}
              />
            </div>
          </FilterGroup>

          {/* 是否关联画布 */}
          <FilterGroup label={KF.other}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: KB_COLORS.textMain, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={filters.hasCanvas === true}
                onChange={e => update({ hasCanvas: e.target.checked || undefined })}
                style={{ cursor: 'pointer' }}
              />
              仅显示关联画布的文件
            </label>
          </FilterGroup>
        </div>
      )}
    </div>
  )
}

// ─── 子组件 ───

const FilterGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 500,
      color: KB_COLORS.textSecondary, marginBottom: 4,
    }}>{label}</label>
    {children}
  </div>
)

// ─── 工具函数 ───

/** 时间戳转 yyyy-mm-dd（用于 date input） */
function toDateInput(ts: number): string {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ─── 样式 ───

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 4,
  border: `1px solid ${KB_COLORS.border}`,
  backgroundColor: KB_COLORS.bg,
  color: KB_COLORS.textMain, fontSize: 12,
  outline: 'none', fontFamily: 'inherit',
}

const tagChipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 10,
  fontSize: 11, fontWeight: 500,
  backgroundColor: KB_COLORS.primaryLight,
  color: KB_COLORS.primaryDark,
}

const tagNotChipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 10,
  fontSize: 11, fontWeight: 500,
  backgroundColor: KB_COLORS.dangerBg,
  color: KB_COLORS.dangerText,
}

const tagQuickBtnStyle: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 10,
  fontSize: 11, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.border}`,
  backgroundColor: KB_COLORS.bg,
  color: KB_COLORS.textSecondary,
}

const chipRemoveBtnStyle: React.CSSProperties = {
  border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 13, padding: 0, lineHeight: 1,
  color: 'inherit', opacity: 0.7,
}

const addBtnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.border}`,
  backgroundColor: KB_COLORS.bgCard,
  color: KB_COLORS.textMain, fontSize: 12,
}
