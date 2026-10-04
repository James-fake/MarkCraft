import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/core'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { useLanguage } from '@stores/LanguageStore'
import { findNode } from '@services/fileService'

interface WikiLinkHoverPreviewProps {
  editor: Editor | null
}

interface PreviewData {
  title: string
  summary: string
  backlinkCount: number
  broken: boolean
  fuzzy: boolean
  tags: string[]
  lastModified: string
  outgoingCount: number
  relation?: string
  note?: string
}

interface PopupPosition {
  top: number
  left: number
}

const SHOW_DELAY = 300
const HIDE_DELAY = 100

const WikiLinkHoverPreview: React.FC<WikiLinkHoverPreviewProps> = ({ editor }) => {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0 })
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const currentLinkRef = useRef<HTMLElement | null>(null)

  const { resolveTargetFuzzy, getBacklinks, getOutgoingLinks } = useLinkIndex()
  const { getFileContent, rootFolder } = useFileManager()
  const { getTagsForFile } = useTagIndex()

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const computePosition = useCallback((anchor: HTMLElement): PopupPosition => {
    const rect = anchor.getBoundingClientRect()
    const popupWidth = 320
    const popupMaxHeight = 280

    let top = rect.bottom + 6
    let left = rect.left

    // Flip above if would go off bottom
    if (top + popupMaxHeight > window.innerHeight) {
      top = rect.top - 6
    }

    // Shift left if would go off right
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 8
    }

    // Clamp to left edge
    if (left < 8) {
      left = 8
    }

    return { top, left }
  }, [])

  const loadPreview = useCallback((wikiTarget: string, anchor: HTMLElement) => {
    // Read relation and note from the hovered element
    const relation = anchor.getAttribute('data-wiki-relation') || undefined
    const note = anchor.getAttribute('data-wiki-note') || undefined

    const result = resolveTargetFuzzy(wikiTarget)

    if (!result) {
      setPreviewData({
        title: wikiTarget,
        summary: '',
        backlinkCount: 0,
        broken: true,
        fuzzy: false,
        tags: [],
        lastModified: '',
        outgoingCount: 0,
        relation,
        note,
      })
      setPosition(computePosition(anchor))
      setVisible(true)
      return
    }

    const { fileId, fuzzy } = result
    const content = getFileContent(fileId)
    const summary = (content || '').slice(0, 200)
    const backlinks = getBacklinks(fileId)
    const tags = getTagsForFile(fileId)
    const fileNode = findNode(rootFolder, fileId)
    const lastModified = fileNode?.updatedAt ? new Date(fileNode.updatedAt).toLocaleDateString() : ''
    const outgoing = getOutgoingLinks(fileId)
    const outgoingCount = outgoing.length

    setPreviewData({
      title: wikiTarget,
      summary,
      backlinkCount: backlinks.length,
      broken: false,
      fuzzy,
      tags,
      lastModified,
      outgoingCount,
      relation,
      note,
    })
    setPosition(computePosition(anchor))
    setVisible(true)
  }, [resolveTargetFuzzy, getFileContent, getBacklinks, getOutgoingLinks, getTagsForFile, rootFolder, computePosition])

  useEffect(() => {
    if (!editor) return

    const dom = editor.view.dom

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const linkEl = target.closest('[data-wiki-link]') as HTMLElement | null
      if (!linkEl) return

      const wikiTarget = linkEl.getAttribute('data-wiki-target')
      if (!wikiTarget) return

      // Cancel any pending hide
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }

      // If already showing for this link, do nothing
      if (currentLinkRef.current === linkEl && visible) return

      currentLinkRef.current = linkEl

      // Start show timer
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
      }
      showTimerRef.current = setTimeout(() => {
        loadPreview(wikiTarget, linkEl)
        showTimerRef.current = null
      }, SHOW_DELAY)
    }

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const linkEl = target.closest('[data-wiki-link]') as HTMLElement | null
      if (!linkEl) return

      // Cancel show timer
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }

      // Start hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
      hideTimerRef.current = setTimeout(() => {
        setVisible(false)
        currentLinkRef.current = null
        hideTimerRef.current = null
      }, HIDE_DELAY)
    }

    dom.addEventListener('mouseover', handleMouseOver)
    dom.addEventListener('mouseout', handleMouseOut)

    return () => {
      dom.removeEventListener('mouseover', handleMouseOver)
      dom.removeEventListener('mouseout', handleMouseOut)
      clearTimers()
    }
  }, [editor, visible, loadPreview, clearTimers])

  // Mouse entering popup cancels hide timer
  const handlePopupMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  // Mouse leaving popup starts hide timer
  const handlePopupMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      currentLinkRef.current = null
      hideTimerRef.current = null
    }, HIDE_DELAY)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  if (!visible || !previewData) return null

  // 锚定浮层：复用 .aurora-dropdown 基底（材质/边框/圆角/阴影/z-index 1000 全由基底提供）。
  // createPortal 到 body 已脱离 #aurora-root，内部一律引用全局 --mc-* token（含语义色三族）。
  const popup = (
    <div
      ref={popupRef}
      onMouseEnter={handlePopupMouseEnter}
      onMouseLeave={handlePopupMouseLeave}
      className="aurora-dropdown"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        maxWidth: 320,
        padding: 12,
        pointerEvents: 'auto',
      }}
    >
      {previewData.broken ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--mc-danger)', fontSize: 'var(--mc-font-md)' }}>⚠</span>
          <span style={{ color: 'var(--mc-danger)', fontSize: 'var(--mc-font-sm)' }}>{t.editorWidgets.fileMissing}</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: (previewData.fuzzy || previewData.relation) ? 6 : 0 }}>
            {previewData.relation && (
              <span style={{
                fontSize: 'var(--mc-font-xs)',
                padding: '1px 6px',
                borderRadius: 'var(--mc-radius-sm)',
                background: 'var(--mc-accent-soft)',
                color: 'var(--mc-accent-text)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {previewData.relation}
              </span>
            )}
            <span style={{ fontSize: 'var(--mc-font-base)', fontWeight: 600, color: 'var(--mc-text-primary)' }}>
              {previewData.title}
            </span>
            {previewData.fuzzy && (
              <span style={{
                fontSize: 'var(--mc-font-xs)',
                padding: '1px 6px',
                borderRadius: 'var(--mc-radius-sm)',
                background: 'var(--mc-warning-soft)',
                color: 'var(--mc-warning)',
                whiteSpace: 'nowrap',
              }}>
                {t.editorWidgets.fuzzyMatch}
              </span>
            )}
          </div>
          {/* Tags */}
          {previewData.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {previewData.tags.slice(0, 5).map(tag => (
                <span key={tag} style={{
                  fontSize: 'var(--mc-font-xs)',
                  padding: '1px 6px',
                  borderRadius: 'var(--mc-radius-sm)',
                  background: 'var(--mc-success-soft)',
                  color: 'var(--mc-success)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {previewData.summary && (
            <div
              style={{
                fontSize: 'var(--mc-font-sm)',
                color: 'var(--mc-text-secondary)',
                lineHeight: 1.5,
                maxHeight: 100,
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: 6,
              }}
            >
              {previewData.summary}
            </div>
          )}
          {/* Note section */}
          {previewData.note && (
            <div style={{
              fontSize: 'var(--mc-font-xs)',
              color: 'var(--mc-text-secondary)',
              lineHeight: 1.5,
              marginBottom: 6,
              padding: '4px 8px',
              background: 'var(--mc-accent-soft)',
              borderRadius: 'var(--mc-radius-sm)',
              borderLeft: '2px solid var(--mc-accent)',
            }}>
              <span style={{ fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-tertiary)', marginRight: 4 }}>{t.editorWidgets.noteLabel}</span>
              {previewData.note}
            </div>
          )}
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-tertiary)', flexWrap: 'wrap' }}>
            <span>{t.editorWidgets.backlinkCount.replace('{n}', String(previewData.backlinkCount))}</span>
            <span>{t.editorWidgets.outgoingCount.replace('{n}', String(previewData.outgoingCount))}</span>
            {previewData.lastModified && <span>{previewData.lastModified}</span>}
          </div>
        </>
      )}
    </div>
  )

  return createPortal(popup, document.body)
}

export default WikiLinkHoverPreview
