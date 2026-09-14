import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import { getAllTemplates, applyTemplate, importSharedTemplate, exportTemplateAsFile, getExamples, Template, ExampleDoc } from './templateManager'
import { Button } from '../../components/ui'
import { useToast } from '../../components/ui/ToastProvider'

interface TemplateInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
  /** 打开模板发现层（P2-7） */
  onOpenDiscovery?: () => void
}

const TemplateInsertModal: React.FC<TemplateInsertModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  onOpenDiscovery
}) => {
  const { language } = useLanguage()
  const isZh = language === 'zh'

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<'template' | 'example'>('template')
  const searchRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const allTemplates = useMemo(() => getAllTemplates(), [isOpen, version])
  const examples = useMemo(() => getExamples(), [])

  // 当前标签页数据源（模板 or 范例）
  const list = useMemo<Array<Template | ExampleDoc>>(() => {
    const base: Array<Template | ExampleDoc> = tab === 'template' ? allTemplates : examples
    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase()
    return base.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.nameEn.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    )
  }, [tab, allTemplates, examples, searchQuery])

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
    const content = tab === 'template' ? applyTemplate(item as Template) : (item as ExampleDoc).content
    onInsertRef.current(content)
    onCloseRef.current()
  }, [selectedId, list, tab])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseRef.current()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleInsert()
    }
  }, [handleInsert])

  const previewLines = useMemo(() => {
    if (!current) return []
    return current.content.split('\n').slice(0, 15)
  }, [current])

  const texts = useMemo(() => ({
    title: isZh ? '插入模板' : 'Insert Template',
    subtitle: isZh ? '选择一个模板快速开始你的文档' : 'Choose a template to start your document',
    searchPlaceholder: isZh ? '搜索模板...' : 'Search templates...',
    builtin: isZh ? '内置' : 'Built-in',
    custom: isZh ? '自定义' : 'Custom',
    preview: isZh ? '预览' : 'Preview',
    noTemplate: isZh ? '暂无模板' : 'No templates',
    noSelection: isZh ? '请在左侧选择一个模板' : 'Please select a template on the left',
    cancel: isZh ? '取消' : 'Cancel',
    insert: isZh ? '插入' : 'Insert',
    variables: isZh ? '支持变量: {{date}} {{time}} {{title}}' : 'Variables: {{date}} {{time}} {{title}}',
    tabTemplate: isZh ? '模板' : 'Templates',
    tabExample: isZh ? '范例' : 'Examples',
    example: isZh ? '范例' : 'Example',
    importShared: isZh ? '导入共享模板' : 'Import shared',
    discover: isZh ? '发现社区模板' : 'Discover',
    shareTemplate: isZh ? '分享此模板' : 'Share template',
    importSuccess: isZh ? '已导入共享模板' : 'Shared template imported',
    importFailed: isZh ? '导入失败：' : 'Import failed: ',
    shareDone: isZh ? '已导出模板文件' : 'Template exported',
  }), [isZh])

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
          boxShadow: '0 24px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1)',
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
          background: 'linear-gradient(90deg, #a78bfa, #f472b6, #fbbf24)',
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
              background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
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
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: 'var(--mc-text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(167,139,250,0.5)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.1)'
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
                    border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--mc-border-subtle)',
                    background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
                    color: active ? '#a78bfa' : 'var(--mc-text-primary)',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {t === 'template' ? texts.tabTemplate : texts.tabExample}
                </button>
              )
            })}
          </div>
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
            backgroundColor: 'rgba(255,255,255,0.02)',
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
                          ? 'rgba(167,139,250,0.08)'
                          : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(167,139,250,0.2)'
                          : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        marginBottom: 4,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'
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
                          background: 'linear-gradient(180deg, #a78bfa, #f472b6)',
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
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={2.5} style={{ flexShrink: 0 }}>
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
            backgroundColor: 'rgba(255,255,255,0.02)',
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
                  background: 'linear-gradient(180deg, #a78bfa, #f472b6)',
                  flexShrink: 0,
                }} />
                {texts.preview}
              </div>
              {selectedTemplate && (
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
                  backgroundColor: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.12)',
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
          justifyContent: 'flex-end',
          gap: 8,
          padding: '16px 24px 20px',
        }}>
          <Button variant="secondary" onClick={onCloseRef.current}>
            {texts.cancel}
          </Button>
          <Button variant="brand" onClick={handleInsert} disabled={!current}>
            {texts.insert}
          </Button>
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
