import React, { useState, useRef, useCallback } from 'react'
import { Modal, Button } from '../../components/ui'
import { useToast } from '../../components/ui/ToastProvider'
import { useFileManager } from '../../stores/FileStore'
import { useLanguage } from '../../stores/LanguageStore'
import { importObsidianVault, importNotionExport } from '@services/import/externalImporter'

type Source = 'obsidian' | 'notion' | null

interface MigrateWizardProps {
  isOpen: boolean
  onClose: () => void
}

const ObsidianIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const NotionIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
    <path d="M8 8h6l-4.5 9H8z" />
    <path d="M14 8v9" />
  </svg>
)

function SourceCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        textAlign: 'left',
        padding: '16px',
        borderRadius: 12,
        cursor: 'pointer',
        color: 'inherit',
        background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(127,127,127,0.22)'}`,
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
    >
      <div style={{ color: active ? '#8b5cf6' : 'currentColor', marginBottom: 10, opacity: active ? 1 : 0.7 }}>
        {icon}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4, lineHeight: 1.45 }}>{desc}</div>
    </button>
  )
}

/**
 * 迁移向导（P3#19）：引导式"库级导入"
 * 复用 externalImporter 的 Obsidian/Notion 解析，写入主笔记库(FileStore) 根目录新建文件夹。
 */
const MigrateWizard: React.FC<MigrateWizardProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage()
  const toast = useToast()
  const { createFile, createFolder } = useFileManager()
  const w = t.welcome
  const [source, setSource] = useState<Source>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ folder: string; count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setSource(null)
    setImporting(false)
    setDone(null)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (importing) return
    reset()
    onClose()
  }, [importing, onClose, reset])

  const handleSelectFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !source) return
      setImporting(true)
      setError(null)
      setDone(null)
      try {
        const result =
          source === 'obsidian'
            ? await importObsidianVault(file, t.importExternal)
            : await importNotionExport(file, t.importExternal)
        // 文件夹名取自用户文件名：必须去掉路径非法字符，否则可能创建失败或落到意外位置
        const rawName = file.name.replace(/\.(zip|tar\.gz)$/i, '')
        const folderName =
          rawName.replace(/[\\/:*?"<>|]/g, '-').trim() || `${w.migrateFolderDefault}-${Date.now()}`
        const folderId = createFolder('root', folderName)
        if (!folderId) {
          throw new Error(`Failed to create folder: ${folderName}`)
        }
        let count = 0
        const failed: string[] = []
        for (const f of result.files) {
          try {
            const fileName = f.name.endsWith('.md') ? f.name : `${f.name}.md`
            createFile(folderId, fileName, f.content)
            count++
          } catch {
            // 单文件失败不中断整体，但必须计数并上报，否则用户以为全部导入成功
            failed.push(f.name)
          }
        }
        setDone({ folder: folderName, count })
        if (failed.length > 0) {
          const msg = w.migratePartial
            .replace('{n}', String(count))
            .replace('{folder}', folderName)
            .replace('{failed}', String(failed.length))
          setError(msg)
          toast.show(msg, 'error')
        } else {
          toast.show(w.migrateDone.replace('{n}', String(count)).replace('{folder}', folderName), 'success')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        toast.show(w.migrateFailed.replace('{msg}', msg), 'error')
      } finally {
        setImporting(false)
      }
    },
    [source, createFile, createFolder, toast, w, t],
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={w.migrateTitle} size="md">
      <div style={{ minHeight: 220 }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(34,197,94,0.14)',
                color: '#22c55e',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>
              {w.migrateDone.replace('{n}', String(done.count)).replace('{folder}', done.folder)}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.5 }}>
              {source === 'obsidian' ? w.migrateObsidian : w.migrateNotion}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="ghost" onClick={() => reset()}>
                {w.migrateAgain}
              </Button>
              <Button variant="brand" onClick={handleClose}>
                {w.migrateClose}
              </Button>
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239,68,68,0.14)',
                color: '#ef4444',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              !
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.7 }}>
              {w.migrateFailed.replace('{msg}', error)}
            </p>
            <Button variant="brand" onClick={() => reset()}>
              {w.migrateAgain}
            </Button>
          </div>
        ) : (
          <>
            <p style={{ opacity: 0.6, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
              {w.migrateDesc}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <SourceCard
                active={source === 'obsidian'}
                onClick={() => {
                  setSource('obsidian')
                  setError(null)
                }}
                icon={<ObsidianIcon />}
                title={w.migrateObsidian}
                desc={w.migrateObsidianDesc}
              />
              <SourceCard
                active={source === 'notion'}
                onClick={() => {
                  setSource('notion')
                  setError(null)
                }}
                icon={<NotionIcon />}
                title={w.migrateNotion}
                desc={w.migrateNotionDesc}
              />
            </div>
            {source && (
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={handleSelectFile}
                />
                <Button
                  variant="brand"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                  aria-label={w.migrateSelectFile}
                >
                  {importing ? w.migrateImporting : w.migrateSelectFile}
                </Button>
                <span style={{ fontSize: 12, opacity: 0.45 }}>{w.migrateSelectFileHint}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default MigrateWizard
