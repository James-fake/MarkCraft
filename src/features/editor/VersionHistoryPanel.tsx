import React, { useState, useEffect, useMemo } from 'react'
import { useNoteVersion, NoteVersion } from '../../stores/NoteVersionStore'
import { HistoryIcon } from './HistoryIcon'
import './versionHistory.css'

interface VersionHistoryPanelProps {
  fileId: string | undefined
  onRestore: (content: string) => void
  currentContent: string
  onClose?: () => void
  language?: 'zh' | 'en'
}

type GroupKey = 'today' | 'yesterday' | 'earlier'
type ViewMode = 'list' | 'preview' | 'diff'

const operationMeta: Record<string, { label: string; color: string }> = {
  save: { label: '保存', color: 'var(--mc-accent)' },
  manual: { label: '手动', color: '#10b981' },
  auto: { label: '自动', color: '#6b7280' },
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatAbsolute(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRelative(ts: number, now: number, lang: 'zh' | 'en') {
  const diff = now - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return lang === 'zh' ? '刚刚' : 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return lang === 'zh' ? `${min} 分钟前` : `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return lang === 'zh' ? `${hr} 小时前` : `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return lang === 'zh' ? `${day} 天前` : `${day}d ago`
  const mon = Math.floor(day / 30)
  if (mon < 12) return lang === 'zh' ? `${mon} 个月前` : `${mon}mo ago`
  return `${Math.floor(mon / 12)} ${lang === 'zh' ? '年前' : 'y ago'}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function groupOf(ts: number, now: number): GroupKey {
  const d = new Date(ts)
  const today = new Date(now)
  if (isSameDay(d, today)) return 'today'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (isSameDay(d, y)) return 'yesterday'
  return 'earlier'
}

/** 行级 diff（与当前版本对比） */
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)
  const rows: { type: 'same' | 'added' | 'removed'; text: string }[] = []
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]
    if (oldLine === newLine) {
      rows.push({ type: 'same', text: newLine || '' })
    } else {
      if (oldLine !== undefined) rows.push({ type: 'removed', text: oldLine })
      if (newLine !== undefined) rows.push({ type: 'added', text: newLine })
    }
  }
  return rows
}

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  fileId,
  onRestore,
  currentContent,
  onClose,
  language = 'zh',
}) => {
  const { versions, loading, loadVersions, restoreVersion, deleteVersion, toggleLock } = useNoteVersion()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('list')
  const [confirm, setConfirm] = useState<{ type: 'restore' | 'delete'; version: NoteVersion } | null>(null)
  const now = Date.now()

  // 进入动画
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (fileId) loadVersions(fileId)
  }, [fileId, loadVersions])

  const requestClose = () => {
    setOpen(false)
    window.setTimeout(() => onClose?.(), 260)
  }

  const selected = useMemo(
    () => versions.find((v) => v.versionId === selectedId) ?? null,
    [versions, selectedId],
  )

  const groups = useMemo(() => {
    const map: Record<GroupKey, NoteVersion[]> = { today: [], yesterday: [], earlier: [] }
    for (const v of versions) map[groupOf(v.timestamp, now)].push(v)
    return map
  }, [versions, now])

  const groupLabels: Record<GroupKey, string> = {
    today: language === 'zh' ? '今日' : 'Today',
    yesterday: language === 'zh' ? '昨日' : 'Yesterday',
    earlier: language === 'zh' ? '更早' : 'Earlier',
  }

  const wordDiff = (v: NoteVersion, idx: number) => {
    const prev = versions[idx + 1]
    return prev ? v.wordCount - prev.wordCount : 0
  }

  const handleRestoreConfirm = async () => {
    if (!confirm) return
    const target = confirm.version
    setConfirm(null)
    const content = await restoreVersion(target.versionId)
    if (content !== null) onRestore(content) // 父级会应用内容并关闭面板
  }

  const handleDeleteConfirm = async () => {
    if (!confirm) return
    const target = confirm.version
    setConfirm(null)
    await deleteVersion(target.versionId)
    if (selectedId === target.versionId) {
      setSelectedId(null)
      setView('list')
    }
  }

  const t = {
    title: language === 'zh' ? '版本历史' : 'Version History',
    preview: language === 'zh' ? '预览' : 'Preview',
    diff: language === 'zh' ? '对比' : 'Diff',
    restore: language === 'zh' ? '恢复' : 'Restore',
    delete: language === 'zh' ? '删除' : 'Delete',
    lock: language === 'zh' ? '锁定' : 'Lock',
    unlock: language === 'zh' ? '解锁' : 'Unlock',
    back: language === 'zh' ? '返回列表' : 'Back',
    empty: language === 'zh' ? '暂无版本历史' : 'No version history',
    emptyHint: language === 'zh'
      ? '编辑并保存后，系统会自动记录版本。按 Ctrl/⌘+S 可手动创建版本。'
      : 'Versions are recorded automatically as you edit and save. Press Ctrl/⌘+S to save a manual version.',
    loading: language === 'zh' ? '加载中…' : 'Loading…',
    confirmRestore: language === 'zh' ? '恢复到此版本？' : 'Restore this version?',
    confirmRestoreDesc: language === 'zh'
      ? '当前未保存的内容将被该版本覆盖，此操作不可撤销。'
      : 'Your current unsaved content will be overwritten by this version. This cannot be undone.',
    confirmDelete: language === 'zh' ? '删除此版本？' : 'Delete this version?',
    confirmDeleteDesc: language === 'zh' ? '删除后无法恢复。' : 'This action cannot be undone.',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    author: language === 'zh' ? '我' : 'Me',
    compareLabel: language === 'zh' ? '对比当前版本' : 'vs current',
  }

  return (
    <>
      <div className={`vh-backdrop${open ? ' vh-open' : ''}`} onClick={requestClose} />
      <aside className={`vh-drawer${open ? ' vh-open' : ''}`} aria-label={t.title} role="dialog">
        {/* 顶栏 */}
        <div className="vh-header">
          <HistoryIcon size={16} />
          <h3>
            {t.title}
            {!loading && versions.length > 0 && <span className="vh-count">· {versions.length}</span>}
          </h3>
          <button className="vh-close" onClick={requestClose} aria-label={t.cancel} title={t.cancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {view === 'list' && (
          <div className="vh-body">
            {loading && (
              <div className="vh-state">
                <div className="vh-spinner" />
                <div className="vh-state-hint">{t.loading}</div>
              </div>
            )}
            {!loading && versions.length === 0 && (
              <div className="vh-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5" />
                  <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <div className="vh-state-title">{t.empty}</div>
                <div className="vh-state-hint">{t.emptyHint}</div>
              </div>
            )}

            {(Object.keys(groupLabels) as GroupKey[]).map((g) =>
              groups[g].length === 0 ? null : (
                <div key={g}>
                  <div className="vh-group-title">{groupLabels[g]}</div>
                  {groups[g].map((v, idx) => {
                    const op = operationMeta[v.operation] || operationMeta.auto
                    const diff = wordDiff(v, idx)
                    const isSel = selectedId === v.versionId
                    return (
                      <button
                        key={v.versionId}
                        className={`vh-item${isSel ? ' is-selected' : ''}`}
                        onClick={() => {
                          setSelectedId(v.versionId)
                          setView('list')
                        }}
                      >
                        <div className="vh-item-top">
                          <span className="vh-badge" style={{ backgroundColor: op.color + '22', color: op.color }}>
                            {op.label}
                          </span>
                          <span className="vh-time">{formatAbsolute(v.timestamp)}</span>
                          <span className="vh-relative">{formatRelative(v.timestamp, now, language)}</span>
                        </div>
                        <div className="vh-item-meta">
                          <span className="vh-author">
                            <span className="vh-avatar">{t.author.slice(0, 1)}</span>
                            {t.author}
                          </span>
                          <span className="vh-word">{v.wordCount} 字</span>
                          {diff !== 0 && (
                            <span className={diff > 0 ? 'vh-diff-up' : 'vh-diff-down'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          )}
                          {v.locked && <span className="vh-lock">🔒</span>}
                        </div>

                        {isSel && (
                          <div className="vh-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="vh-btn" onClick={() => { setSelectedId(v.versionId); setView('preview') }}>
                              {t.preview}
                            </button>
                            <button
                              className="vh-btn"
                              onClick={() => {
                                if (v.content === currentContent) {
                                  // 与当前一致，直接进入对比页即可（diff 全 same）
                                }
                                setSelectedId(v.versionId)
                                setView('diff')
                              }}
                            >
                              {t.diff}
                            </button>
                            <button className="vh-btn vh-btn-primary" onClick={() => setConfirm({ type: 'restore', version: v })}>
                              {t.restore}
                            </button>
                            <button className="vh-btn" onClick={() => toggleLock(v.versionId)}>
                              {v.locked ? t.unlock : t.lock}
                            </button>
                            {!v.locked && (
                              <button className="vh-btn vh-btn-danger" onClick={() => setConfirm({ type: 'delete', version: v })}>
                                {t.delete}
                              </button>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ),
            )}
          </div>
        )}

        {view === 'preview' && selected && (
          <div className="vh-detail">
            <div className="vh-detail-bar">
              <button className="vh-btn" onClick={() => setView('list')}>← {t.back}</button>
              <span className="vh-detail-title">{formatAbsolute(selected.timestamp)}</span>
            </div>
            <div className="vh-preview">{selected.content}</div>
          </div>
        )}

        {view === 'diff' && selected && (
          <div className="vh-detail">
            <div className="vh-detail-bar">
              <button className="vh-btn" onClick={() => setView('list')}>← {t.back}</button>
              <span className="vh-detail-title">
                {formatAbsolute(selected.timestamp)} → {language === 'zh' ? '当前' : 'current'}
              </span>
            </div>
            <div className="vh-diff">
              {computeDiff(selected.content, currentContent).map((row, i) => (
                <div key={i} className={`vh-diff-row ${row.type}`}>
                  <span className="vh-diff-sign">{row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}</span>
                  {row.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {confirm && (
        <div className="vh-confirm-mask" onClick={() => setConfirm(null)}>
          <div className="vh-confirm" onClick={(e) => e.stopPropagation()}>
            <h4>{confirm.type === 'restore' ? t.confirmRestore : t.confirmDelete}</h4>
            <p>{confirm.type === 'restore' ? t.confirmRestoreDesc : t.confirmDeleteDesc}</p>
            <div className="vh-confirm-actions">
              <button className="vh-btn" onClick={() => setConfirm(null)}>{t.cancel}</button>
              {confirm.type === 'restore' ? (
                <button className="vh-btn vh-btn-primary" onClick={handleRestoreConfirm}>{t.restore}</button>
              ) : (
                <button className="vh-btn vh-btn-danger" onClick={handleDeleteConfirm}>{t.delete}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VersionHistoryPanel
