import type { Translations } from '@src/types/translations'

interface FileInfo {
  name: string
  title: string
  date: string
  tags: string[]
  draft: boolean
}

interface FilePreviewPanelProps {
  fileInfos: FileInfo[]
  mdFilesCount: number
  publishedCount: number
  t: Translations
}

export default function FilePreviewPanel({ fileInfos, mdFilesCount, publishedCount, t }: FilePreviewPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--editor-text)', opacity: 0.8, fontFamily: "'Inter', -apple-system, sans-serif" }}>
          {t.blogModal.filePreview}
        </label>
        <span style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.5, fontFamily: "'Inter', -apple-system, sans-serif" }}>
          {t.blogModal.fileStats.replace('{total}', String(mdFilesCount)).replace('{published}', String(publishedCount))}
        </span>
      </div>
      <div style={{
        border: '1px solid var(--editor-border)',
        borderRadius: 6,
        maxHeight: 340,
        overflowY: 'auto',
        backgroundColor: 'var(--editor-bg)',
      }}>
        {fileInfos.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--editor-text)',
            opacity: 0.5,
            fontSize: 13,
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            {t.blogModal.noMarkdownFiles}
          </div>
        ) : (
          fileInfos.map((fi, idx) => (
            <div
              key={fi.name}
              style={{
                padding: '8px 12px',
                borderBottom: idx < fileInfos.length - 1 ? '1px solid var(--editor-border)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--editor-text)',
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {fi.title}
                </span>
                {fi.draft && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 3,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#d97706',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    flexShrink: 0,
                  }}>
                    {t.blogModal.draft}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--editor-text)',
                opacity: 0.5,
                fontFamily: "'Inter', -apple-system, sans-serif",
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <span>{fi.name}</span>
                {fi.date && <span>{fi.date}</span>}
                {fi.tags.length > 0 && (
                  <span>{fi.tags.join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
