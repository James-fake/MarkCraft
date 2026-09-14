/**
 * NoteHoverCard —— 笔记悬浮预览卡
 *
 * 对标 Obsidian 的 hover preview：悬停 WikiLink / 反链条目时展示目标笔记的
 * 标题、摘要、标签与链接统计。三个消费方共用：
 *  - NoteContextPanel（反链面板 hover）→ 容器版（context 取数据）
 *  - CM6 源码模式 hover tooltip（wikiLinkHoverTooltip）→ View 版（纯展示，数据由扩展注入）
 *  - 未来 WYSIWYG WikiLinkHoverPreview 可复用 View 版统一视觉
 */
import React from 'react'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { findNode } from '@services/fileService'

export interface NoteHoverData {
  title: string
  summary: string
  backlinkCount: number
  outgoingCount: number
  tags: string[]
  broken: boolean
  fuzzy: boolean
  fileId: string
}

function truncate(s: string, n: number): string {
  return s && s.length > n ? `${s.slice(0, n)}…` : s || ''
}

interface NoteHoverCardViewProps {
  data: NoteHoverData
  /** 点击「打开」时回调（可选） */
  onOpen?: (fileId: string) => void
  width?: number
}

/** 纯展示层：不依赖任何 context，供 createRoot 等脱离 Provider 的环境使用 */
export function NoteHoverCardView({ data, onOpen, width = 300 }: NoteHoverCardViewProps) {
  const cardStyle: React.CSSProperties = {
    maxWidth: width,
    padding: 12,
    background: 'var(--editor-bg, #fff)',
    border: '1px solid var(--editor-border, #333)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    fontSize: 12,
    color: 'var(--editor-text, #111)',
    pointerEvents: 'auto',
  }

  if (data.broken) {
    return (
      <div style={cardStyle}>
        <span style={{ color: '#ef4444', fontSize: 14 }}>⚠ </span>
        <span style={{ color: '#ef4444', fontSize: 12 }}>文件不存在：{data.title}</span>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{truncate(data.title, 24)}</span>
        {data.fuzzy && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: 'rgba(245,158,11,0.15)', color: '#f59e0b', whiteSpace: 'nowrap',
          }}>
            模糊匹配
          </span>
        )}
      </div>

      {/* 标签 */}
      {data.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {data.tags.slice(0, 5).map(tag => (
            <span key={tag} style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 3,
              background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 摘要 */}
      {data.summary && (
        <div style={{
          fontSize: 12, opacity: 0.85, lineHeight: 1.5, maxHeight: 120,
          overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 6,
        }}>
          {data.summary}
        </div>
      )}

      {/* 统计 + 打开 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, opacity: 0.6 }}>
        <span>{data.backlinkCount} 反链 · {data.outgoingCount} 出链</span>
        {onOpen && data.fileId && (
          <button
            type="button"
            onClick={() => onOpen(data.fileId)}
            style={{
              border: '1px solid var(--editor-border, #444)',
              borderRadius: 4, background: 'transparent', cursor: 'pointer',
              fontSize: 11, padding: '2px 8px', color: 'var(--editor-text, #111)',
            }}
          >
            打开
          </button>
        )}
      </div>
    </div>
  )
}

interface NoteHoverCardProps {
  /** 已解析的目标文件 id（优先于 target） */
  fileId?: string
  /** 未解析的 [[target]] 文本（走 resolveTargetFuzzy） */
  target?: string
  /** 点击「打开」时回调（可选，不传则不显示打开按钮） */
  onOpen?: (fileId: string) => void
  width?: number
}

/** 容器版：在 Provider 内使用，自行取数后交给 View 渲染 */
export default function NoteHoverCard({ fileId, target, onOpen, width }: NoteHoverCardProps) {
  const { resolveTargetFuzzy, getBacklinks, getOutgoingLinks } = useLinkIndex()
  const { getFileContent, rootFolder } = useFileManager()
  const { getTagsForFile } = useTagIndex()

  let resolvedId = fileId
  let fuzzy = false
  if (!resolvedId && target) {
    const r = resolveTargetFuzzy(target.split('#')[0].trim())
    if (r) {
      resolvedId = r.fileId
      fuzzy = r.fuzzy
    }
  }

  if (!resolvedId) {
    return <NoteHoverCardView data={{ title: target || '', summary: '', backlinkCount: 0, outgoingCount: 0, tags: [], broken: true, fuzzy: false, fileId: '' }} onOpen={onOpen} width={width} />
  }

  const content = getFileContent(resolvedId) || ''
  const fileNode = findNode(rootFolder, resolvedId)
  const data: NoteHoverData = {
    title: fileNode?.name ? fileNode.name.replace(/\.md$/, '') : (target || ''),
    summary: content.trim().slice(0, 240),
    backlinkCount: getBacklinks(resolvedId).length,
    outgoingCount: getOutgoingLinks(resolvedId).length,
    tags: getTagsForFile(resolvedId),
    broken: false,
    fuzzy,
    fileId: resolvedId,
  }
  return <NoteHoverCardView data={data} onOpen={onOpen} width={width} />
}
