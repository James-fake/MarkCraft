import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import { MergeResult } from './librarySync'
import { Button } from '../../components/ui'

interface LibrarySyncModalProps {
  isOpen: boolean
  onClose: () => void
  /** 导出当前库（调用方负责生成并下载备份文件） */
  onExport: () => void
  /** 导入备份文件：解析、合并并落盘，返回合并结果 */
  onImportFile: (file: File) => Promise<MergeResult>
}

const LibrarySyncModal: React.FC<LibrarySyncModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onImportFile,
}) => {
  const { language } = useLanguage()
  const isZh = language === 'zh'
  const [visible, setVisible] = useState(false)
  const [summary, setSummary] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (isOpen) {
      setSummary(null)
      setError(null)
      setBusy(false)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const texts = {
    title: isZh ? '库同步 · 本地/手动' : 'Library Sync · Local',
    hint: isZh ? '不上云 · 仅本机备份' : 'No cloud · local backup only',
    desc: isZh
      ? '把整个笔记库导出为一个本地备份文件，或导入另一台设备的备份合并进来。全部发生在本机。'
      : 'Export your whole library to a local backup, or import a backup from another device. All on-device.',
    export: isZh ? '导出库（.json）' : 'Export Library (.json)',
    import: isZh ? '导入库备份' : 'Import Backup',
    added: isZh ? '新增' : 'Added',
    updated: isZh ? '更新' : 'Updated',
    skipped: isZh ? '跳过' : 'Skipped',
    done: isZh ? '完成' : 'Done',
    cancel: isZh ? '关闭' : 'Close',
    invalid: isZh ? '备份文件无效' : 'Invalid backup file',
  }

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await onImportFile(file)
      setSummary(res)
    } catch (err) {
      setError((err as Error).message || texts.invalid)
    } finally {
      setBusy(false)
    }
  }, [onImportFile, texts.invalid])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        backdropFilter: 'blur(4px)', transition: 'background-color 0.3s ease',
      }}
      onClick={onCloseRef.current}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '480px',
          backgroundColor: 'var(--mc-bg-panel)', border: '1px solid var(--mc-border-subtle)',
          borderRadius: 'var(--mc-radius-lg)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          padding: 24, boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--mc-text-primary)', letterSpacing: '-0.01em' }}>
            {texts.title}
          </h2>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 999, color: '#34d399',
            border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.08)',
          }}>
            {texts.hint}
          </span>
        </div>

        <p style={{ fontSize: 12, opacity: 0.6, color: 'var(--mc-text-primary)', lineHeight: 1.6, margin: '0 0 16px' }}>
          {texts.desc}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="brand" onClick={onExport}>{texts.export}</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            {busy ? '…' : texts.import}
          </Button>
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: '8px 12px', fontSize: 12, borderRadius: 8,
            color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)',
            background: 'rgba(251,191,36,0.08)',
          }}>
            {error}
          </div>
        )}

        {summary && (
          <div style={{
            marginTop: 14, padding: '12px 14px', fontSize: 13, borderRadius: 10,
            border: '1px solid var(--mc-border-subtle)', background: 'rgba(167,139,250,0.06)',
            color: 'var(--mc-text-primary)', display: 'flex', gap: 16,
          }}>
            <span>{texts.added}：<b>{summary.added}</b></span>
            <span>{texts.updated}：<b>{summary.updated}</b></span>
            <span>{texts.skipped}：<b>{summary.skipped}</b></span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <Button variant="secondary" onClick={onCloseRef.current}>
            {summary ? texts.done : texts.cancel}
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
    </div>
  )
}

export default LibrarySyncModal
