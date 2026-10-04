import React, { useState, useEffect, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/core'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { findNode } from '@services/fileService'
import { markdownToHtml } from '../markdownConvert'
import { sanitizeHtml } from '@services/sanitizeHtml'
import { imageStore } from '@core/storage/imageStore'
import { useLanguage } from '@stores/LanguageStore'

/** Parse target like "笔记#第三章" → { fileName: '笔记', heading: '第三章' }
 *  Also supports line ranges: "file#L10-L20" or "file#L10"
 *  And block references: "file#^blockid"
 */
const parseTarget = (target: string) => {
  const hashIdx = target.indexOf('#')
  if (hashIdx === -1) return { fileName: target, heading: undefined, lineStart: undefined, lineEnd: undefined, blockId: undefined }

  const fileName = target.slice(0, hashIdx)
  const anchor = target.slice(hashIdx + 1)

  // Check for line range: L10-L20 or L10
  const lineMatch = anchor.match(/^L(\d+)(?:-L(\d+))?$/i)
  if (lineMatch) {
    return {
      fileName,
      heading: undefined,
      lineStart: parseInt(lineMatch[1]),
      lineEnd: lineMatch[2] ? parseInt(lineMatch[2]) : parseInt(lineMatch[1]),
      blockId: undefined,
    }
  }

  // Check for block reference: ^blockid
  if (anchor.startsWith('^')) {
    return {
      fileName,
      heading: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      blockId: anchor.slice(1),
    }
  }

  // Regular heading
  return { fileName, heading: anchor, lineStart: undefined, lineEnd: undefined, blockId: undefined }
}

const EmbedContentView: React.FC<{ node: PMNode; editor: Editor }> = ({ node }) => {
  const { t } = useLanguage()
  const { target, embedType } = node.attrs
  const { resolveTarget, indexVersion, onFileUpdate } = useLinkIndex()
  const { rootFolder, openFile } = useFileManager()
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [expanded, setExpanded] = useState(false)
  const [totalLines, setTotalLines] = useState(0)
  const [resolvedFileId, setResolvedFileId] = useState<string | undefined>(undefined)

  // Force re-render when index changes
  void indexVersion

  const { fileName, heading, lineStart, lineEnd, blockId } = parseTarget(target)

  const loadContent = useCallback(() => {
    if (embedType === 'image') {
      return
    }

    const fileId = resolveTarget(fileName)
    setResolvedFileId(fileId)

    if (!fileId) {
      setPreviewHtml(`<p style="color:#ef4444;font-size:12px;">${t.embedView.fileMissing}</p>`)
      setTotalLines(0)
      return
    }

    const fileNode = findNode(rootFolder, fileId)
    if (!fileNode || !fileNode.content) {
      setPreviewHtml(`<p style="color:#ef4444;font-size:12px;">${t.embedView.loadFailed}</p>`)
      setTotalLines(0)
      return
    }

    try {
      let relevantContent: string

      if (lineStart !== undefined) {
        // F1: Line range embed
        const lines = fileNode.content.split('\n')
        const start = Math.max(0, lineStart - 1) // 1-indexed to 0-indexed
        const end = lineEnd !== undefined ? Math.min(lines.length, lineEnd) : start + 1
        relevantContent = lines.slice(start, end).join('\n')
      } else if (blockId !== undefined) {
        // F2: Block reference embed
        const lines = fileNode.content.split('\n')
        let blockStart = -1
        let blockEnd = -1
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`^${blockId}`)) {
            blockStart = i
            // The block extends from the previous blank line to the next blank line
            for (let j = i - 1; j >= 0; j--) {
              if (lines[j].trim() === '') { blockStart = j + 1; break; }
              if (j === 0) blockStart = 0
            }
            blockEnd = lines.length
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim() === '') { blockEnd = j; break; }
            }
            break
          }
        }

        if (blockStart === -1) {
          relevantContent = t.embedView.blockRefNotFound.replace('{id}', blockId)
        } else {
          const blockLines = lines.slice(blockStart, blockEnd)
          relevantContent = blockLines.map(l => l.replace(`^${blockId}`, '').trimEnd()).join('\n')
        }
      } else if (heading) {
        const lines = fileNode.content.split('\n')
        let headingStart = -1
        let headingLevel = 0

        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
          if (match && match[2].trim().toLowerCase() === heading.toLowerCase()) {
            headingStart = i
            headingLevel = match[1].length
            break
          }
        }

        if (headingStart === -1) {
          // Heading not found, fallback to full content
          relevantContent = fileNode.content
        } else {
          // Find end of section (next heading of same or higher level)
          let headingEnd = lines.length
          for (let i = headingStart + 1; i < lines.length; i++) {
            const match = lines[i].match(/^(#{1,6})\s+/)
            if (match && match[1].length <= headingLevel) {
              headingEnd = i
              break
            }
          }
          relevantContent = lines.slice(headingStart, headingEnd).join('\n')
        }
      } else {
        relevantContent = fileNode.content
      }

      const allLines = relevantContent.split('\n')
      setTotalLines(allLines.length)

      // Render preview: first 5 lines when collapsed, full when expanded
      const displayContent = expanded
        ? relevantContent
        : allLines.slice(0, 5).join('\n') + (allLines.length > 5 ? '\n...' : '')
      const html = markdownToHtml(displayContent, imageStore)
      // C-2：嵌入笔记内容经 markdownToHtml 产出，未净化前不得注入 DOM。
      // 否则 `!((恶意笔记))` 块嵌入可在受害者打开正常笔记时执行跨笔记 XSS。
      setPreviewHtml(sanitizeHtml(html))
    } catch {
      setPreviewHtml(`<p style="color:#ef4444;font-size:12px;">${t.embedView.renderFailed}</p>`)
      setTotalLines(0)
    }
  }, [fileName, heading, lineStart, lineEnd, blockId, embedType, resolveTarget, rootFolder, expanded, t])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  // F3: Subscribe to file updates for the embedded target
  useEffect(() => {
    const unsub = onFileUpdate((updatedFileId) => {
      const targetFileId = resolveTarget(fileName)
      if (updatedFileId === targetFileId) {
        loadContent()
      }
    })
    return unsub
  }, [fileName, resolveTarget, onFileUpdate, loadContent])

  if (embedType === 'image') {
    return (
      <NodeViewWrapper>
        <div
          style={{
            margin: '8px 0',
            padding: '4px',
            borderRadius: '6px',
            border: '1px dashed var(--border-color, #444)',
            position: 'relative',
          }}
          data-embed="true"
          data-embed-target={target}
          data-embed-type="image"
        >
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-secondary, #888)',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🖼</span>
            <span>{target}</span>
          </div>
          <img
            src={target}
            alt={target}
            style={{ maxWidth: '100%', borderRadius: 4 }}
          />
        </div>
      </NodeViewWrapper>
    )
  }

  const displayLabel = heading
    ? `${fileName} > ${heading}`
    : lineStart !== undefined
      ? `${fileName} : L${lineStart}${lineEnd !== undefined && lineEnd !== lineStart ? `-L${lineEnd}` : ''}`
      : blockId !== undefined
        ? `${fileName} > ^${blockId}`
        : target

  return (
    <NodeViewWrapper>
      <div
        style={{
          margin: '8px 0',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #444)',
          overflow: 'hidden',
          position: 'relative',
        }}
        data-embed="true"
        data-embed-target={target}
        data-embed-type="note"
      >
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--mc-accent-soft)',
            borderBottom: '1px solid var(--border-color, #444)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--button-primary, #3b82f6)',
            fontWeight: 500,
          }}
        >
          <span>📄</span>
          <span>{displayLabel}</span>
          <span
            onClick={(e) => {
              e.stopPropagation()
              if (resolvedFileId) openFile(resolvedFileId)
            }}
            style={{ cursor: 'pointer', opacity: 0.6, marginLeft: 'auto' }}
            title={t.embedView.editInSource}
          >
            ✏️
          </span>
        </div>
        <div
          style={{
            padding: '8px 12px',
            fontSize: 13,
            lineHeight: 1.5,
            ...(expanded ? { maxHeight: '500px', overflow: 'auto' } : {}),
            opacity: 0.85,
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {totalLines > 5 && (
          <div
            onClick={() => setExpanded(prev => !prev)}
            style={{
              padding: '4px 12px',
              borderTop: '1px solid var(--border-color, #444)',
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--button-primary, #3b82f6)',
              cursor: 'pointer',
              userSelect: 'none',
              opacity: 0.7,
            }}
          >
            {expanded ? t.embedView.collapse : t.embedView.expandWithLines.replace('{n}', String(totalLines))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default EmbedContentView
