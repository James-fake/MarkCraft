import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import { getAllTemplates, applyTemplate, applyTemplateWithCursor, importSharedTemplate, exportTemplateAsFile, getExamples, saveNoteAsTemplate, renameUserTemplate, deleteUserTemplate, toggleTemplateFavorite, getFavoriteTemplateIds, getRecentTemplateIds, pushRecentTemplate, Template, ExampleDoc } from './templateManager'
import { Button } from '../../components/ui'
import { useToast } from '../../components/ui/ToastProvider'
import { useSettings } from '../../stores/SettingsStore'

interface TemplateInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string, meta?: { name?: string; at?: 'start' | 'end'; /** {{cursor}} 在 content 中的偏移；null/undefined = 模板未声明 */ cursorOffset?: number | null }) => void
  /** 打开模板发现层（P2-7） */
  onOpenDiscovery?: () => void
  /** 当前笔记名（解析 {{title}} / {{filename}}；无文件时为空） */
  currentTitle?: string
  /** 当前笔记内容（「存为模板」用） */
  currentContent?: string
}

const TemplateInsertModal: React.FC<TemplateInsertModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  onOpenDiscovery,
  currentTitle = '',
  currentContent = '',
}) => {
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
  const TP = t.templates

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<'template' | 'example'>('template')
  const searchRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { settings, updateSetting } = useSettings()

  // 模板变量：{{title}}/{{filename}} 取当前笔记名（修复此前恒为空）
  const vars = useMemo(() => ({ title: currentTitle, filename: currentTitle }), [currentTitle])
  // 自定义模板管理（重命名 / 删除）
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // 收藏 / 最近过滤（仅模板标签）+ 插入位置
  const [filter, setFilter] = useState<'all' | 'fav' | 'recent'>('all')
  const [favVersion, setFavVersion] = useState(0)
  const [insertAt, setInsertAt] = useState<'start' | 'end'>('end')

  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: isOpen/version 为 getAllTemplates() 读取型调用的失效闸（打开弹窗与获取模板后刷新列表）
  const allTemplates = useMemo(() => getAllTemplates(), [isOpen, version])
  const examples = useMemo(() => getExamples(), [])

  // 当前标签页数据源（模板 or 范例）
  const list = useMemo<Array<Template | ExampleDoc>>(() => {
    let base: Array<Template | ExampleDoc> = tab === 'template' ? allTemplates : examples
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.nameEn.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    }
    // 收藏 / 最近过滤（仅模板标签；按最近使用顺序重排）
    if (tab === 'template' && filter === 'fav') {
      const favs = new Set(getFavoriteTemplateIds())
      base = base.filter(t => favs.has(t.id))
    } else if (tab === 'template' && filter === 'recent') {
      const byId = new Map(base.map(t => [t.id, t]))
      base = getRecentTemplateIds().map(id => byId.get(id)).filter((t): t is Template => !!t)
    }
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps -- favVersion：收藏/最近变更后刷新
  }, [tab, allTemplates, examples, searchQuery, filter, favVersion])

  // 收藏集合（避免每行每渲染都读 localStorage）
  // eslint-disable-next-line react-hooks/exhaustive-deps -- favVersion：收藏变更后重建
  const favSet = useMemo(() => new Set(getFavoriteTemplateIds()), [favVersion])

  const selectedTemplate = useMemo<Template | null>(
    () => (tab === 'template' ? (list as Template[]).find(t => t.id === selectedId) ?? null : null),
    [tab, list, selectedId]
  )
  const selectedExample = useMemo<ExampleDoc | null>(
    () => (tab === 'example' ? (list as ExampleDoc[]).find(t => t.id === selectedId) ?? null : null),
    [tab, list, selectedId]
  )
  const current = selectedTemplate ?? selectedExample

  const onCloseRef = useRef(onClose)
  const onInsertRef = useRef(onInsert)
  useEffect(() => {
    onCloseRef.current = onClose
    onInsertRef.current = onInsert
  }, [onClose, onInsert])

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setRenamingId(null)
      setPendingDeleteId(null)
      setFilter('all')
      const firstId = list[0]?.id ?? ''
      setSelectedId(firstId)
      requestAnimationFrame(() => {
        setVisible(true)
        setTimeout(() => {
          searchRef.current?.focus()
        }, 200)
      })
    } else {
      setVisible(false)
    }
  }, [isOpen, list])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleInsert = useCallback(() => {
    const item = list.find(t => t.id === selectedId)
    if (!item) return
    // 模板与范例都套变量（范例此前不套 → {{date}} 会原样插入）
    // 附带名称（无文件时用于「用模板新建命名笔记」）、插入位置与 {{cursor}} 光标落点
    const { content, cursorOffset } = applyTemplateWithCursor(item, vars)
    onInsertRef.current(content, {
      name: isZh ? item.name : item.nameEn,
      at: insertAt,
      cursorOffset,
    })
    if (tab === 'template') pushRecentTemplate(item.id)
    onCloseRef.current()
  }, [selectedId, list, vars, isZh, insertAt, tab])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseRef.current()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleInsert()
    }
  }, [handleInsert])

  // 预览显示**已解析**的变量（把 {{date}} 等换成真实值），所见即所得
  const resolvedContent = useMemo(() => (current ? applyTemplate(current, vars) : ''), [current, vars])
  const previewLines = useMemo(() => resolvedContent.split('\n').slice(0, 15), [resolvedContent])

  const texts = useMemo(() => ({
    title: TP.insertTitle,
    subtitle: TP.insertSubtitle,
    searchPlaceholder: TP.searchPhInsert,
    builtin: TP.builtin,
    custom: TP.custom,
    preview: TP.preview,
    noTemplate: TP.noTemplate,
    noSelection: TP.noSelection,
    cancel: TP.cancel,
    insert: TP.insert,
    variables: TP.variables,
    tabTemplate: TP.tabTemplate,
    tabExample: TP.tabExample,
    example: TP.example,
    importShared: TP.importShared,
    discover: TP.discover,
    shareTemplate: TP.shareTemplate,
    importSuccess: TP.importSuccess,
    importFailed: TP.importFailed,
    shareDone: TP.shareDone,
    saveAsTemplate: TP.saveAsTemplate,
    saveTemplateDone: TP.saveTemplateDone,
    saveTemplateEmpty: TP.saveTemplateEmpty,
    renameTemplate: TP.renameTemplate,
    deleteTemplate: TP.deleteTemplate,
    deleteConfirm: TP.deleteConfirm,
    untitledTemplate: TP.untitledTemplate,
    renameHint: TP.renameHint,
    favorites: TP.favorites,
    recent: TP.recent,
    filterAll: TP.filterAll,
    insertPosition: TP.insertPosition,
    insertAtStart: TP.insertAtStart,
    insertAtEnd: TP.insertAtEnd,
    dailyTemplate: TP.dailyTemplate,
  }), [TP])

  // 导入共享/社区模板（UGC：用户从文件导入他人分享的模板）
  const handleImportShared = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const tmpl = await importSharedTemplate(file)
      setVersion(v => v + 1)
      setSelectedId(tmpl.id)
      toast.show(texts.importSuccess, 'success')
    } catch (err) {
      toast.show(texts.importFailed + (err as Error).message, 'error')
    }
  }, [texts, toast])

  // 分享此模板（UGC：导出为共享 .json 文件，供他人导入）
  const handleShare = useCallback(() => {
    if (!selectedTemplate) return
    exportTemplateAsFile(selectedTemplate)
    toast.show(texts.shareDone, 'success')
  }, [selectedTemplate, texts, toast])

  // 存为模板：把当前笔记内容存为用户自定义模板
  const handleSaveAsTemplate = useCallback(() => {
    if (!currentContent.trim()) {
      toast.show(texts.saveTemplateEmpty, 'error')
      return
    }
    const name = (currentTitle || '').replace(/\.md$/i, '').trim() || texts.untitledTemplate
    const tmpl = saveNoteAsTemplate(name, currentContent)
    setVersion(v => v + 1)
    setTab('template')
    setSelectedId(tmpl.id)
    toast.show(texts.saveTemplateDone, 'success')
  }, [currentContent, currentTitle, texts, toast])

  const startRename = useCallback((tmpl: Template) => {
    setRenamingId(tmpl.id)
    setRenameValue(tmpl.name)
  }, [])

  const commitRename = useCallback(() => {
    if (!renamingId) return
    const name = renameValue.trim()
    if (name) {
      renameUserTemplate(renamingId, name)
      setVersion(v => v + 1)
    }
    setRenamingId(null)
  }, [renamingId, renameValue])

  const handleDelete = useCallback((id: string) => {
    deleteUserTemplate(id)
    setVersion(v => v + 1)
    setPendingDeleteId(null)
    if (selectedId === id) setSelectedId('')
  }, [selectedId])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: visible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: 'blur(4px)',
        transition: 'background-color 0.3s ease',
      }}
      onClick={onCloseRef.current}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '80vh',
          backgroundColor: 'var(--mc-bg-panel)',
          border: '1px solid var(--mc-border-subtle)',
          borderRadius: 'var(--mc-radius-lg)',
          boxShadow: 'var(--mc-shadow-popover)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--mc-accent)',
          borderRadius: 'var(--mc-radius-lg) var(--mc-radius-lg) 0 0',
        }} />

        {/* Header */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--mc-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                color: 'var(--mc-text-primary)',
                letterSpacing: '-0.01em',
              }}>
                {texts.title}
              </h2>
              <p style={{
                fontSize: 12,
                margin: '2px 0 0',
                opacity: 0.4,
              }}>
                {texts.subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={handleSaveAsTemplate}
              style={{ fontSize: 12, padding: '6px 10px', flexShrink: 0 }}
              aria-label={texts.saveAsTemplate}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {texts.saveAsTemplate}
            </Button>
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 12, padding: '6px 10px', flexShrink: 0 }}
              aria-label={texts.importShared}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {texts.importShared}
            </Button>
            {onOpenDiscovery && (
              <Button
                variant="ghost"
                onClick={onOpenDiscovery}
                style={{ fontSize: 12, padding: '6px 10px', flexShrink: 0 }}
                aria-label={texts.discover}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                {texts.discover}
              </Button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.4,
              pointerEvents: 'none',
            }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={texts.searchPlaceholder}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                fontSize: 13,
                border: '1px solid var(--mc-border-subtle)',
                borderRadius: 10,
                backgroundColor: 'var(--mc-bg-hover)',
                color: 'var(--mc-text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid var(--mc-accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--mc-accent-soft)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid var(--mc-border-subtle)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Tab toggle: 模板 / 范例（P1-6） */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['template', 'example'] as const).map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  aria-label={t === 'template' ? texts.tabTemplate : texts.tabExample}
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: active ? '1px solid var(--mc-accent)' : '1px solid var(--mc-border-subtle)',
                    background: active ? 'var(--mc-accent-soft)' : 'transparent',
                    color: active ? 'var(--mc-accent-text)' : 'var(--mc-text-primary)',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {t === 'template' ? texts.tabTemplate : texts.tabExample}
                </button>
              )
            })}
          </div>

          {/* 收藏 / 最近过滤（仅模板标签） */}
          {tab === 'template' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {(['all', 'fav', 'recent'] as const).map((f) => {
                const active = filter === f
                const label = f === 'all' ? texts.filterAll : f === 'fav' ? texts.favorites : texts.recent
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-label={label}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: active ? '1px solid var(--mc-accent)' : '1px solid var(--mc-border-subtle)',
                      background: active ? 'var(--mc-accent-soft)' : 'transparent',
                      color: active ? 'var(--mc-accent-text)' : 'var(--mc-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body: List + Preview */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '0 24px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {/* Template List */}
          <div style={{
            width: '280px',
            flexShrink: 0,
            border: '1px solid var(--mc-border-subtle)',
            borderRadius: 10,
            backgroundColor: 'var(--mc-bg-elevated)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              padding: 6,
            }}>
              {list.length > 0 ? (
                list.map((tmpl) => {
                  const isSelected = selectedId === tmpl.id
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelect(tmpl.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        borderRadius: 8,
                        backgroundColor: isSelected
                          ? 'var(--mc-accent-soft)'
                          : 'transparent',
                        border: isSelected
                          ? '1px solid var(--mc-accent-soft)'
                          : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        marginBottom: 4,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--mc-bg-hover)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          left: 4,
                          top: 6,
                          bottom: 6,
                          width: 2,
                          borderRadius: 1,
                          background: 'var(--mc-accent)',
                        }} />
                      )}
                      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>
                        {tmpl.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          color: 'var(--mc-text-primary)',
                          fontWeight: isSelected ? 500 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {isZh ? tmpl.name : tmpl.nameEn}
                        </div>
                        <div style={{
                          fontSize: 10,
                          opacity: 0.4,
                          marginTop: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {tab === 'template'
                            ? ((tmpl as Template).isBuiltIn ? texts.builtin : texts.custom)
                            : texts.example}
                        </div>
                      </div>
                      {tab === 'template' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleTemplateFavorite(tmpl.id); setFavVersion(v => v + 1) }}
                          aria-label={texts.favorites}
                          aria-pressed={favSet.has(tmpl.id)}
                          title={texts.favorites}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            flexShrink: 0,
                            lineHeight: 0,
                            color: favSet.has(tmpl.id) ? 'var(--mc-warning)' : 'var(--mc-text-tertiary)',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={favSet.has(tmpl.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
                          </svg>
                        </button>
                      )}
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mc-accent-text)" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{
                  fontSize: 13,
                  textAlign: 'center',
                  padding: '24px 0',
                  opacity: 0.4,
                  color: 'var(--mc-text-secondary)',
                }}>
                  {texts.noTemplate}
                </div>
              )}
            </div>
          </div>

          {/* Preview Pane */}
          <div style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--mc-border-subtle)',
            borderRadius: 10,
            backgroundColor: 'var(--mc-bg-elevated)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              padding: '8px 12px',
              borderBottom: '1px solid var(--mc-border-subtle)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--mc-text-primary)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: 0.6,
              }}>
                <div style={{
                  width: 2,
                  height: 10,
                  borderRadius: 1,
                  background: 'var(--mc-accent)',
                  flexShrink: 0,
                }} />
                {texts.preview}
              </div>
              {selectedTemplate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {!selectedTemplate.isBuiltIn && (
                    renamingId === selectedTemplate.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          else if (e.key === 'Escape') setRenamingId(null)
                        }}
                        placeholder={texts.renameHint}
                        aria-label={texts.renameHint}
                        style={{
                          fontSize: 11,
                          padding: '3px 6px',
                          borderRadius: 6,
                          width: 120,
                          border: '1px solid var(--mc-border-subtle)',
                          background: 'transparent',
                          color: 'var(--mc-text-primary)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => startRename(selectedTemplate)} style={{ fontSize: 11, padding: '4px 8px' }} aria-label={texts.renameTemplate}>
                          {texts.renameTemplate}
                        </Button>
                        {pendingDeleteId === selectedTemplate.id ? (
                          <Button variant="ghost" onClick={() => handleDelete(selectedTemplate.id)} style={{ fontSize: 11, padding: '4px 8px', color: 'var(--mc-danger)' }} aria-label={texts.deleteConfirm}>
                            {texts.deleteConfirm}
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => setPendingDeleteId(selectedTemplate.id)} style={{ fontSize: 11, padding: '4px 8px' }} aria-label={texts.deleteTemplate}>
                            {texts.deleteTemplate}
                          </Button>
                        )}
                      </>
                    )
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => updateSetting('dailyTemplateId', settings.dailyTemplateId === selectedTemplate.id ? '' : selectedTemplate.id)}
                    aria-pressed={settings.dailyTemplateId === selectedTemplate.id}
                    title={texts.dailyTemplate}
                    style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0, color: settings.dailyTemplateId === selectedTemplate.id ? 'var(--mc-accent-text)' : undefined }}
                  >
                    {texts.dailyTemplate}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleShare}
                    style={{ fontSize: 11, padding: '4px 8px', fontWeight: 500, flexShrink: 0 }}
                    aria-label={texts.shareTemplate}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {texts.shareTemplate}
                  </Button>
                </div>
              )}
            </div>
            {current ? (
              <div style={{
                padding: 12,
                overflowY: 'auto',
                maxHeight: 300,
                flex: 1,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--mc-border-subtle)',
                }}>
                  <span style={{ fontSize: 22 }}>{current.icon}</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--mc-text-primary)',
                  }}>
                    {isZh ? current.name : current.nameEn}
                  </span>
                </div>
                <pre style={{
                  margin: 0,
                  fontSize: 12,
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  color: 'var(--mc-text-primary)',
                  opacity: 0.75,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                }}>
                  {previewLines.join('\n')}
                </pre>
                <div style={{
                  marginTop: 10,
                  padding: '6px 10px',
                  fontSize: 11,
                  opacity: 0.5,
                  backgroundColor: 'var(--mc-accent-soft)',
                  border: '1px solid var(--mc-accent-soft)',
                  borderRadius: 8,
                  color: 'var(--mc-text-primary)',
                }}>
                  {texts.variables}
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                opacity: 0.4,
                color: 'var(--mc-text-secondary)',
                padding: 24,
                textAlign: 'center',
              }}>
                {texts.noSelection}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '16px 24px 20px',
        }}>
          {/* 插入位置：开头 / 末尾 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mc-text-secondary)' }}>
            <span>{texts.insertPosition}</span>
            {(['start', 'end'] as const).map((pos) => {
              const active = insertAt === pos
              const label = pos === 'start' ? texts.insertAtStart : texts.insertAtEnd
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setInsertAt(pos)}
                  aria-label={label}
                  aria-pressed={active}
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    border: active ? '1px solid var(--mc-accent)' : '1px solid var(--mc-border-subtle)',
                    background: active ? 'var(--mc-accent-soft)' : 'transparent',
                    color: active ? 'var(--mc-accent-text)' : 'var(--mc-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={onCloseRef.current}>
              {texts.cancel}
            </Button>
            <Button variant="brand" onClick={handleInsert} disabled={!current}>
              {texts.insert}
            </Button>
          </div>
        </div>

        {/* 隐藏的文件输入：导入共享/社区模板（.json / .md） */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.md,.markdown,application/json"
          style={{ display: 'none' }}
          onChange={handleImportShared}
        />
      </div>
    </div>
  )
}

export default TemplateInsertModal
