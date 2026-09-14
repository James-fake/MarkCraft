import { formatFileSize } from '../shared/utils/imageHelpers'
import type { Translations } from '../../types/translations'

interface LargeImageConfirmDialogProps {
  largeImageConfirm: { file: File; onConfirm: () => void }
  onDismiss: () => void
  t: Translations
}

export default function LargeImageConfirmDialog({ largeImageConfirm, onDismiss, t }: LargeImageConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div
        className="rounded-lg shadow-xl max-w-md w-full mx-4"
        style={{
          backgroundColor: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--editor-border)',
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6 flex-shrink-0" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-base font-semibold">{t.editor.largeImageTitle}</h3>
          </div>
          <p className="text-sm mb-1" style={{ opacity: 0.8 }}>
            {t.editorExtra.imagePrefix} "{largeImageConfirm.file.name}" {t.editorExtra.imageSizeInfo} {formatFileSize(largeImageConfirm.file.size)}，{t.editor.largeImageMessage}
          </p>
          <p className="text-sm" style={{ opacity: 0.6 }}>
            {t.editor.largeImageAdvice}
          </p>
        </div>
        <div
          className="px-6 py-3 flex items-center justify-end gap-2 border-t"
          style={{ borderColor: 'var(--editor-border)' }}
        >
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'rgba(128, 128, 128, 0.1)',
              color: 'var(--editor-text)',
              border: '1px solid var(--editor-border)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
          >
            {t.editor.cancel}
          </button>
          <button
            onClick={() => {
              largeImageConfirm.onConfirm()
              onDismiss()
            }}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)' }}
          >
            {t.editor.insertAsBase64}
          </button>
        </div>
      </div>
    </div>
  )
}
