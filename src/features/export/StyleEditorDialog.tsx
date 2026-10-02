import { useState } from 'react'
import { useLanguage } from '../../stores/LanguageStore'
import type { ExportStylePreset } from './exportStyleManager'

/**
 * 导出样式编辑器对话框（P5-4 自 SaveAsModal.tsx 拆出，JSX 逐字未动）。
 * 纯受控组件：名称/CSS 编辑 + 内置样式列表的编辑/删除入口 + CSS 导入按钮，
 * 保存/删除/导入动作均由宿主回调承担。
 */
interface StyleEditorDialogProps {
  editingStyle: ExportStylePreset | null
  customPresets: ExportStylePreset[]
  onSave: (style: ExportStylePreset) => void
  onDelete: (id: string) => void
  onEdit: (style: ExportStylePreset) => void
  onImport: () => void
  onClose: () => void
}

export default function StyleEditorDialog({
  editingStyle,
  customPresets,
  onSave,
  onDelete,
  onEdit,
  onImport,
  onClose,
}: StyleEditorDialogProps) {
  const { t } = useLanguage()
  const [styleName, setStyleName] = useState(editingStyle?.name || '')
  const [styleCss, setStyleCss] = useState(editingStyle?.css || '')
  const isEditing = editingStyle !== null

  const handleSave = () => {
    if (!styleName.trim() || !styleCss.trim()) return
    onSave({
      id: editingStyle?.id || `custom_${Date.now()}`,
      name: styleName.trim(),
      description: '自定义样式',
      css: styleCss,
      isBuiltIn: false,
    })
  }

  return (
    <div className="save-as-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="save-as-modal save-as-style-editor-modal" role="dialog" aria-modal="true" aria-label={t.saveAs.styleEditor}>
        <div className="save-as-header">
          <h3 className="save-as-title">{isEditing ? t.saveAs.editStyle : t.saveAs.styleEditor}</h3>
          <button onClick={onClose} className="save-as-close-btn" aria-label={t.saveAs.close}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="save-as-body">
          <div className="save-as-field">
            <label className="save-as-label" htmlFor="style-name">{t.saveAs.styleName}</label>
            <input
              id="style-name"
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              className="save-as-input"
              placeholder={t.saveAs.styleNamePlaceholder}
              autoComplete="off"
            />
          </div>

          <div className="save-as-field">
            <label className="save-as-label" htmlFor="style-css">{t.saveAs.styleCss}</label>
            <textarea
              id="style-css"
              value={styleCss}
              onChange={(e) => setStyleCss(e.target.value)}
              className="save-as-textarea"
              placeholder={t.saveAs.styleCssPlaceholder}
              rows={8}
              spellCheck={false}
            />
          </div>

          {!isEditing && customPresets.length > 0 && (
            <div className="save-as-field">
              <label className="save-as-label">{t.saveAs.customStyles}</label>
              <div className="save-as-style-list">
                {customPresets.map(style => (
                  <div key={style.id} className="save-as-style-item">
                    <span className="save-as-style-item-name">{style.name}</span>
                    <div className="save-as-style-item-actions">
                      <button onClick={() => onEdit(style)} className="save-as-style-item-btn" title={t.saveAs.editStyle}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(style.id)} className="save-as-style-item-btn save-as-style-item-btn-delete" title={t.saveAs.deleteStyle}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="save-as-footer">
          <button onClick={onImport} className="save-as-btn save-as-btn-cancel" type="button">
            {t.saveAs.importCss}
          </button>
          <div className="save-as-footer-spacer" />
          <button onClick={onClose} className="save-as-btn save-as-btn-cancel" type="button">
            {t.saveAs.cancel}
          </button>
          <button
            onClick={handleSave}
            className="save-as-btn save-as-btn-confirm"
            disabled={!styleName.trim() || !styleCss.trim()}
            type="button"
          >
            {t.saveAs.saveStyle}
          </button>
        </div>
      </div>
    </div>
  )
}
