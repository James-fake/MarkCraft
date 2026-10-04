import type { ReplaceDiffPreview } from './searchUtils'
import { useLanguage } from '../../stores/LanguageStore'

/** P1.2 任务3: 替换预览（diff 视图）—— 纯展示组件，确认/取消动作由调用方承担 */
interface ReplacePreviewProps {
  preview: ReplaceDiffPreview
  onConfirm: () => void
  onCancel: () => void
}

export function ReplacePreview({ preview, onConfirm, onCancel }: ReplacePreviewProps) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ backgroundColor: 'rgba(128,128,128,0.03)' }}>
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--mc-border-subtle)' }}
      >
        <span style={{ color: 'var(--mc-text-primary)', fontSize: '12px', fontWeight: 600 }}>
          {t.globalSearch.replacePreviewTitle
            .replace('{changes}', String(preview.diffs.length))
            .replace('{files}', String(preview.modifications.length))}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirm}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: '11px', cursor: 'pointer',
              border: '1px solid var(--button-primary)',
              backgroundColor: 'var(--button-primary)', color: '#fff',
            }}
          >{t.globalSearch.confirmReplace}</button>
          <button
            onClick={onCancel}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: '11px', cursor: 'pointer',
              border: '1px solid var(--mc-border-subtle)',
              backgroundColor: 'transparent', color: 'var(--mc-text-secondary)',
            }}
          >{t.globalSearch.cancel}</button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
        {preview.diffs.length === 0 && (
          <div className="px-4 py-8 text-center" style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '13px' }}>
            {t.globalSearch.noChanges}
          </div>
        )}
        {preview.diffs.map((d, idx) => (
          <div key={idx} style={{ borderBottom: '1px solid var(--mc-border-subtle)' }}>
            <div
              className="px-3 py-0.5 flex items-center gap-2"
              style={{ backgroundColor: 'rgba(128,128,128,0.08)' }}
            >
              <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '10px', fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>
                {d.line}
              </span>
              <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.6, fontSize: '10px' }}>
                {d.fileName}
              </span>
            </div>
            <div
              className="px-3 py-0.5 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(255,80,80,0.12)' }}
            >
              <span style={{ color: '#e55', fontFamily: 'monospace', fontSize: '11px', flexShrink: 0 }}>-</span>
              <span style={{ color: '#e55', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {d.oldLine}
              </span>
            </div>
            <div
              className="px-3 py-0.5 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(80,200,80,0.12)' }}
            >
              <span style={{ color: '#5a5', fontFamily: 'monospace', fontSize: '11px', flexShrink: 0 }}>+</span>
              <span style={{ color: '#5a5', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {d.newLine}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
