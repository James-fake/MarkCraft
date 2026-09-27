import { BlogGenerationResult } from '../blogGenerator'
import type { Translations } from '@src/types/translations'

interface GenerationResultProps {
  result: BlogGenerationResult
  totalSize: number
  onPreview: () => void
  t: Translations
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function GenerationResult({ result, totalSize, onPreview, t }: GenerationResultProps) {
  return (
    <div style={{
      border: '1px solid var(--editor-border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        backgroundColor: 'var(--mc-accent-soft)',
        borderBottom: '1px solid var(--editor-border)',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--editor-text)',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          {t.blogModal.generateResult}（{result.files.length} {t.blogModal.fileCount}，{t.blogModal.totalSize} {formatSize(totalSize)}）
        </span>
        <button
          onClick={onPreview}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 4,
            border: '1px solid var(--link-color)',
            backgroundColor: 'transparent',
            color: 'var(--link-color)',
            cursor: 'pointer',
            fontFamily: "'Inter', -apple-system, sans-serif",
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          {t.blogModal.preview}
        </button>
      </div>
      <div style={{
        maxHeight: 200,
        overflowY: 'auto',
        backgroundColor: 'var(--editor-bg)',
      }}>
        {result.files.map((file, idx) => (
          <div
            key={file.path}
            style={{
              padding: '6px 12px',
              borderBottom: idx < result.files.length - 1 ? '1px solid var(--editor-border)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{
              fontSize: 12,
              fontFamily: "'Fira Code', 'Consolas', monospace",
              color: 'var(--editor-text)',
              opacity: 0.8,
            }}>
              {file.path}
            </span>
            <span style={{
              fontSize: 11,
              fontFamily: "'Inter', -apple-system, sans-serif",
              color: 'var(--editor-text)',
              opacity: 0.4,
            }}>
              {formatSize(new Blob([file.content]).size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
