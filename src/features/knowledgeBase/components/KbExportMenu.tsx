/**
 * KbExportMenu - 知识库导出菜单
 * 提供分享包、静态站点、PDF、EPUB、Markdown 合并导出
 * 导出完成后自动下载，并记录导出历史
 */
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useKbStore } from '@stores/useKbStore'
import { useLanguage } from '@stores/LanguageStore'
import { getKbOverlayRoot } from './kbOverlayRoot'
import { KB_COLORS } from '../kbTheme'
import { IconExport, IconClose, IconLayers, IconNetwork, IconFileText, IconBook, IconEdit } from './KbIcons'
import { exportKbPackage } from '../export/sharePackager'
import { exportStaticSite } from '../export/staticSiteExporter'
import { exportPdf, exportEpub, exportMarkdown } from '../export/documentExporter'
import type { KnowledgeBase, ExportRecord } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

interface KbExportMenuProps {
  kb: KnowledgeBase
  files: FileNode[]
  /** dialog（默认）：居中浮层；page（Aurora 使用优化④）：填充 tab 内容区的独立页面，无遮罩/无关闭按钮 */
  variant?: 'dialog' | 'page'
  onClose?: () => void
}

/** 导出类型 */
type ExportType = 'share' | 'static-site' | 'pdf' | 'epub' | 'markdown'

/** 导出选项文案键（展示文案由 t.kbExportMenu 解析，数据层不持文案） */
type ExportLabelKey = 'optShare' | 'optStaticSite' | 'optPdf' | 'optEpub' | 'optMarkdown'
type ExportDescKey = 'optShareDesc' | 'optStaticSiteDesc' | 'optPdfDesc' | 'optEpubDesc' | 'optMarkdownDesc'

/** 导出选项配置 */
interface ExportOption {
  type: ExportType
  icon: React.FC
  labelKey: ExportLabelKey
  descKey: ExportDescKey
  ext: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  { type: 'share', icon: IconLayers, labelKey: 'optShare', descKey: 'optShareDesc', ext: 'mcshare' },
  { type: 'static-site', icon: IconNetwork, labelKey: 'optStaticSite', descKey: 'optStaticSiteDesc', ext: 'zip' },
  { type: 'pdf', icon: IconFileText, labelKey: 'optPdf', descKey: 'optPdfDesc', ext: 'pdf' },
  { type: 'epub', icon: IconBook, labelKey: 'optEpub', descKey: 'optEpubDesc', ext: 'epub' },
  { type: 'markdown', icon: IconEdit, labelKey: 'optMarkdown', descKey: 'optMarkdownDesc', ext: 'md' },
]

/** 格式化日期为 YYYYMMDD */
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** 触发浏览器下载 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放，避免下载未完成就被回收
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const KbExportMenu: React.FC<KbExportMenuProps> = ({ kb, files, variant = 'dialog', onClose }) => {
  const asPage = variant === 'page'
  const { addExportRecord } = useKbStore()
  const { t } = useLanguage()
  const ke = t.kbExportMenu
  const [busy, setBusy] = useState<ExportType | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  /** 记录导出历史（markdown 类型不在 ExportRecord 支持范围内，跳过） */
  const recordHistory = async (type: ExportType, filename: string, sizeBytes: number) => {
    if (type === 'markdown') return
    const record: ExportRecord = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as ExportRecord['type'],
      filename,
      fileCount: files.length,
      exportedAt: Date.now(),
      sizeBytes,
    }
    try {
      await addExportRecord(kb.id, record)
    } catch (err) {
      console.error('[KB] 记录导出历史失败:', err)
    }
  }

  /** 执行导出 */
  const handleExport = async (option: ExportOption) => {
    setBusy(option.type)
    setMessage(null)
    try {
      const dateStr = formatDate(new Date())
      const filename = `${kb.name}-${ke[option.labelKey]}-${dateStr}.${option.ext}`

      switch (option.type) {
        case 'share': {
          const blob = await exportKbPackage(kb, files, undefined, t.exportKit)
          downloadBlob(blob, filename)
          await recordHistory(option.type, filename, blob.size)
          break
        }
        case 'static-site': {
          const blob = await exportStaticSite(kb, files, kb.blogConfig, t.exportKit)
          downloadBlob(blob, filename)
          await recordHistory(option.type, filename, blob.size)
          break
        }
        case 'pdf': {
          // PDF 通过浏览器打印生成，无 Blob 体积
          await exportPdf(kb, files, t.exportKit)
          await recordHistory(option.type, filename, 0)
          break
        }
        case 'epub': {
          const blob = await exportEpub(kb, files)
          downloadBlob(blob, filename)
          await recordHistory(option.type, filename, blob.size)
          break
        }
        case 'markdown': {
          const blob = await exportMarkdown(kb, files, t.exportKit)
          downloadBlob(blob, filename)
          // markdown 类型不在 ExportRecord 支持范围，不记录历史
          break
        }
      }
      setMessage({ type: 'success', text: ke.exportSuccess.replace('{label}', ke[option.labelKey]) })
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: ke.exportFailed.replace('{label}', ke[option.labelKey]).replace('{msg}', text) })
    } finally {
      setBusy(null)
    }
  }

  // page 模式（使用优化④）：填充 tab 内容区的独立页面，无遮罩/无 portal/无关闭按钮
  const card = (
    <div
      className="kb-panel"
      style={asPage
        ? { width: '100%', height: '100%', padding: 0, overflow: 'auto', borderRadius: 0, boxShadow: 'none', border: 'none' }
        : { width: 380, padding: 0, overflow: 'hidden' }}
      onClick={e => e.stopPropagation()}
    >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: `1px solid ${KB_COLORS.border}`,
          }}
        >
          <span className="kb-section-title" style={{ margin: 0 }}>
            <IconExport /> {ke.title}
          </span>
          {!asPage && onClose && (
            <button onClick={onClose} className="kb-icon-btn" aria-label={ke.close}>
              <IconClose />
            </button>
          )}
        </div>

        {/* 知识库名称 */}
        <div style={{ padding: '10px 18px', fontSize: 13, color: KB_COLORS.textSecondary }}>
          {kb.name}
        </div>

        {/* 选项列表 */}
        <div style={{ padding: '4px 0' }}>
          {EXPORT_OPTIONS.map(opt => {
            const isBusy = busy === opt.type
            const disabled = busy !== null
            return (
              <button
                key={opt.type}
                onClick={() => handleExport(opt)}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '12px 18px',
                  border: 'none',
                  background: 'transparent',
                  cursor: disabled ? 'wait' : 'pointer',
                  opacity: disabled && !isBusy ? 0.5 : 1,
                  textAlign: 'left',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!disabled) e.currentTarget.style.background = KB_COLORS.bgHover
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
                  <opt.icon />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: KB_COLORS.textMain }}>
                    {isBusy ? ke.exporting.replace('{label}', ke[opt.labelKey]) : ke[opt.labelKey]}
                  </div>
                  <div style={{ fontSize: 12, color: KB_COLORS.textSecondary, marginTop: 2 }}>
                    {ke[opt.descKey]}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 状态消息 */}
        {message && (
          <div
            style={{
              padding: '10px 18px',
              fontSize: 13,
              color: message.type === 'success' ? KB_COLORS.success : KB_COLORS.danger,
              backgroundColor: message.type === 'success' ? KB_COLORS.successBg : KB_COLORS.dangerBg,
              borderTop: `1px solid ${KB_COLORS.border}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* 底部信息 */}
        <div
          style={{
            padding: '10px 18px',
            fontSize: 12,
            color: KB_COLORS.textTertiary,
            borderTop: `1px solid ${KB_COLORS.border}`,
          }}
        >
          {ke.fileCount.replace('{n}', String(files.length))}
        </div>
    </div>
  )

  if (asPage) return card
  return createPortal(
    <div
      className="kb-pop-mask"
      style={{
        zIndex: 1000,
        background: 'var(--kb-mask, rgba(0,0,0,.3))',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        animation: 'kbFadeUp .2s ease both',
      }}
      onClick={onClose}
    >
      {card}
    </div>,
    getKbOverlayRoot(),
  )
}
