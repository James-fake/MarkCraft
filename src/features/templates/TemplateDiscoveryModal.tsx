import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import {
  getDiscoveryEntries,
  acquireEntry,
  importDiscoveryFile,
  getShareTemplate,
  DiscoveryEntry,
} from './templateDiscovery'
import { exportTemplateAsFile, getExampleById } from './templateManager'
import { Button } from '../../components/ui'
import { useToast } from '../../components/ui/ToastProvider'

interface TemplateDiscoveryModalProps {
  isOpen: boolean
  onClose: () => void
  onAcquire?: (content: string) => void
}

type FilterTab = 'all' | 'builtin-template' | 'example' | 'community'

const TemplateDiscoveryModal: React.FC<TemplateDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onAcquire,
}) => {
  const { language } = useLanguage()
  const isZh = language === 'zh'
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [visible, setVisible] = useState(false)
  const [version, setVersion] = useState(0)
  const [acquired, setAcquired] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const entries = useMemo(() => getDiscoveryEntries(), [isOpen, version])

  const list = useMemo<DiscoveryEntry[]>(() => {
    const base = entries.filter(e => tab === 'all' || e.kind === tab)
    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase()
    return base.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.nameEn.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.scene.toLowerCase().includes(q)
    )
  }, [entries, tab, searchQuery])

  const onCloseRef = useRef(onClose)
  const onAcquireRef = useRef(onAcquire)
  useEffect(() => {
    onCloseRef.current = onClose
    onAcquireRef.current = onAcquire
  }, [onClose, onAcquire])

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setTab('all')
      requestAnimationFrame(() => {
        setVisible(true)
        setTimeout(() => searchRef.current?.focus(), 200)
      })
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current()
  }, [])

  const texts = useMemo(() => ({
    title: isZh ? '模板发现 · 本地社区' : 'Template Discovery · Local Community',
    subtitle: isZh ? '发现内置模板、范例与社区共享模板，一键获取，全部离线可用' : 'Discover built-in templates, examples and community templates — all offline',
    localBadge: isZh ? '本地 · 非强制云' : 'Local · No Cloud',
    searchPlaceholder: isZh ? '搜索模板 / 场景...' : 'Search templates / scenes...',
    tabAll: isZh ? '全部' : 'All',
    tabTemplate: isZh ? '模板' : 'Templates',
    tabExample: isZh ? '范例' : 'Examples',
    tabCommunity: isZh ? '社区' : 'Community',
    acquire: isZh ? '获取' : 'Get',
    acquired: isZh ? '已获取' : 'Got',
    load: isZh ? '载入' : 'Load',
    builtin: isZh ? '已内置' : 'Built-in',
    share: isZh ? '分享' : 'Share',
    importShared: isZh ? '导入共享模板' : 'Import shared',
    noResult: isZh ? '没有匹配的模板' : 'No matching templates',
    cancel: isZh ? '关闭' : 'Close',
    importSuccess: isZh ? '已导入共享模板' : 'Shared template imported',
    importFailed: isZh ? '导入失败：' : 'Import failed: ',
    acquireSuccess: isZh ? '已加入我的模板' : 'Added to my templates',
    shareDone: isZh ? '已导出模板文件' : 'Template exported',
  }), [isZh])

  const handleAcquire = useCallback((entry: DiscoveryEntry) => {
    if (entry.kind === 'example') {
      const ex = getExampleById(entry.id)
      if (ex && onAcquireRef.current) {
        onAcquireRef.current(ex.content)
        onCloseRef.current()
      }
      return
    }
    const res = acquireEntry(entry.id)
    if (res.ok) {
      setAcquired(prev => ({ ...prev, [entry.id]: true }))
      if (entry.kind === 'community') {
        toast.show(texts.acquireSuccess, 'success')
      } else {
        toast.show(res.message, 'success')
      }
    } else {
      toast.show(res.message, 'error')
    }
  }, [texts, toast])

  const handleShare = useCallback((entry: DiscoveryEntry) => {
    const tmpl = getShareTemplate(entry.id)
    if (!tmpl) return
    exportTemplateAsFile(tmpl)
    toast.show(texts.shareDone, 'success')
  }, [texts, toast])

  const handleImportShared = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importDiscoveryFile(file)
      setVersion(v => v + 1)
      toast.show(texts.importSuccess, 'success')
    } catch (err) {
      toast.show(texts.importFailed + (err as Error).message, 'error')
    }
  }, [texts, toast])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
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
          maxWidth: '760px',
          maxHeight: '82vh',
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
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #34d399, #a78bfa, #f472b6)',
          borderRadius: 'var(--mc-radius-lg) var(--mc-radius-lg) 0 0',
        }} />

        {/* Header */}
        <div style={{ padding: '22px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #34d399, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--mc-text-primary)', letterSpacing: '-0.01em' }}>
                {texts.title}
              </h2>
              <p style={{ fontSize: 12, margin: '2px 0 0', opacity: 0.4 }}>{texts.subtitle}</p>
            </div>
            <span style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 999,
              color: '#34d399',
              border: '1px solid rgba(52,211,153,0.35)',
              background: 'rgba(52,211,153,0.08)',
              whiteSpace: 'nowrap',
            }}>
              {texts.localBadge}
            </span>
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
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none',
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
                width: '100%', padding: '10px 14px 10px 36px', fontSize: 13,
                border: '1px solid var(--mc-border-subtle)', borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--mc-text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['all', 'builtin-template', 'example', 'community'] as const).map((t) => {
              const active = tab === t
              const label = t === 'all' ? texts.tabAll : t === 'builtin-template' ? texts.tabTemplate : t === 'example' ? texts.tabExample : texts.tabCommunity
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  aria-label={label}
                  style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 999,
                    border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--mc-border-subtle)',
                    background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
                    color: active ? '#a78bfa' : 'var(--mc-text-primary)',
                    cursor: 'pointer', fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 8px' }}>
          {list.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {list.map((entry) => {
                const isCommunity = entry.kind === 'community'
                const isExample = entry.kind === 'example'
                const isBuiltin = entry.kind === 'builtin-template'
                const got = isCommunity && (acquired[entry.id] || false)
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: 12, borderRadius: 12,
                      border: '1px solid var(--mc-border-subtle)',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{entry.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mc-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isZh ? entry.name : entry.nameEn}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
                          {entry.badge} · {entry.scene}
                        </div>
                      </div>
                    </div>
                    {entry.description && (
                      <div style={{ fontSize: 11, opacity: 0.6, color: 'var(--mc-text-primary)', lineHeight: 1.5 }}>
                        {entry.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      {isExample ? (
                        <Button variant="brand" style={{ fontSize: 12, padding: '6px 12px', flex: 1 }} onClick={() => handleAcquire(entry)}>
                          {texts.load}
                        </Button>
                      ) : isBuiltin ? (
                        <>
                          <Button variant="secondary" disabled style={{ fontSize: 12, padding: '6px 12px', flex: 1 }}>
                            {texts.builtin}
                          </Button>
                          <Button variant="ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleShare(entry)} aria-label={texts.share}>
                            {texts.share}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant={got ? 'secondary' : 'brand'}
                            style={{ fontSize: 12, padding: '6px 12px', flex: 1 }}
                            onClick={() => handleAcquire(entry)}
                            disabled={got}
                          >
                            {got ? texts.acquired : texts.acquire}
                          </Button>
                          <Button variant="ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleShare(entry)} aria-label={texts.share}>
                            {texts.share}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, textAlign: 'center', padding: '32px 0', opacity: 0.4, color: 'var(--mc-text-secondary)' }}>
              {texts.noResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px 18px', borderTop: '1px solid var(--mc-border-subtle)' }}>
          <Button variant="secondary" onClick={onCloseRef.current}>{texts.cancel}</Button>
        </div>

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

export default TemplateDiscoveryModal
