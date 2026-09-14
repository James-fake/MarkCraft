import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/core'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useTagIndex } from '@stores/TagIndexStore'
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

  const popup = (
    <div
      ref={popupRef}
      onMouseEnter={handlePopupMouseEnter}
      onMouseLeave={handlePopupMouseLeave}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        maxWidth: 320,
        padding: 12,
        background: '#1e1e2e',
        border: '1px solid var(--border-color, #333)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
        fontSize: 12,
      }}
    >
      {previewData.broken ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ef4444', fontSize: 14 }}>⚠</span>
          <span style={{ color: '#ef4444', fontSize: 12 }}>文件不存在</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: (previewData.fuzzy || previewData.relation) ? 6 : 0 }}>
            {previewData.relation && (
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {previewData.relation}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 'bold', color: '#e0e0e0' }}>
              {previewData.title}
            </span>
            {previewData.fuzzy && (
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
                whiteSpace: 'nowrap',
              }}>
                模糊匹配
              </span>
            )}
          </div>
          {/* Tags */}
          {previewData.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {previewData.tags.slice(0, 5).map(tag => (
                <span key={tag} style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: 'rgba(34,197,94,0.12)',
                  color: '#22c55e',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {previewData.summary && (
            <div
              style={{
                fontSize: 12,
                color: '#aaa',
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
              fontSize: 11,
              color: '#c4b5fd',
              lineHeight: 1.5,
              marginBottom: 6,
              padding: '4px 8px',
              background: 'rgba(139, 92, 246, 0.08)',
              borderRadius: 4,
              borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
            }}>
              <span style={{ fontSize: 10, opacity: 0.6, marginRight: 4 }}>备注:</span>
              {previewData.note}
            </div>
          )}
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#666', flexWrap: 'wrap' }}>
            <span>{previewData.backlinkCount} 个反向链接</span>
            <span>{previewData.outgoingCount} 个出链</span>
            {previewData.lastModified && <span>{previewData.lastModified}</span>}
          </div>
        </>
      )}
    </div>
  )

  return createPortal(popup, document.body)
}

export default WikiLinkHoverPreview
