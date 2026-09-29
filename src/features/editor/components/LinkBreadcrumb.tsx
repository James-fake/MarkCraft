import React, { useMemo } from 'react'
import { useLinkIndex } from '@stores/LinkIndexStore'

interface LinkBreadcrumbProps {
  activeFileId: string | null
  onOpenFile: (fileId: string) => void
}

const stripMdExt = (name: string) => name.endsWith('.md') ? name.slice(0, -3) : name

const LinkBreadcrumb: React.FC<LinkBreadcrumbProps> = ({ activeFileId, onOpenFile }) => {
  const { getBacklinks, indexVersion } = useLinkIndex()
  void indexVersion

  const backlinks = useMemo(() => {
    if (!activeFileId) return []
    return getBacklinks(activeFileId).slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: indexVersion 为链接种子（:13 void indexVersion 显式登记），反链索引更新时强制重算
  }, [activeFileId, getBacklinks, indexVersion])

  if (!activeFileId || backlinks.length === 0) return null

  const totalCount = getBacklinks(activeFileId).length
  const hasMore = totalCount > 5

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 12px',
      fontSize: 11,
      color: 'var(--editor-text, #888)',
      opacity: 0.6,
      borderBottom: '1px solid var(--border-color, rgba(128,128,128,0.1))',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{ opacity: 0.5 }}>←</span>
      {backlinks.map((bl, i) => (
        <React.Fragment key={bl.sourceFileId}>
          {i > 0 && <span style={{ opacity: 0.3 }}>·</span>}
          <span
            onClick={() => onOpenFile(bl.sourceFileId)}
            style={{ cursor: 'pointer', color: 'var(--button-primary, #3b82f6)', opacity: 0.8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          >
            {stripMdExt(bl.sourceFileName)}
          </span>
        </React.Fragment>
      ))}
      {hasMore && (
        <span style={{ opacity: 0.4, fontSize: 10 }}>
          +{totalCount - 5}
        </span>
      )}
    </div>
  )
}

export default LinkBreadcrumb
