/**
 * 空态「新建笔记」引导界面（EditorPanel 主区 `!activeFileId` 分支的整块 JSX）：
 * 文件名输入 + 新建按钮 + 打开文件按钮 + 内嵌文件列表。
 * 文件列表直接内嵌于引导界面：轻量定制列表（非侧栏 FileTree），点文件即打开，无需再点按钮唤起侧栏。
 * 文件名状态由宿主持有（新建后需清空输入），本组件纯展示 + 回调。
 */
import { useRef } from 'react'
import { Icon } from '../../icons'
import { EmptyFileBrowser } from './EmptyFileBrowser'
import { useLanguage } from '@stores/LanguageStore'

interface EditorEmptyStateProps {
  /** 当前文件名输入值（受控于宿主的 newFileName） */
  value: string
  /** 输入变化（宿主 setNewFileName） */
  onChange: (v: string) => void
  /** 提交新建（宿主 handleCreateNote：留空回退未命名 + 同名去重） */
  onCreate: () => void
  /** 打开文件（宿主 openImport：直达系统文件框并导入，与「新建」并列的次级入口） */
  onImportFile: () => void
}

export function EditorEmptyState({ value, onChange, onCreate, onImportFile }: EditorEmptyStateProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="aurora-editor__empty">
      <div className="aurora-editor__empty-icon">
        <Icon.fileText size={20} />
      </div>
      <div className="aurora-editor__empty-title">{t.auroraEditor.emptyTitle}</div>
      <div className="aurora-editor__empty-sub">
        {t.auroraEditor.emptySubBefore}<kbd className="aurora-editor__empty-kbd">⌘K</kbd>{t.auroraEditor.emptySubAfter}
      </div>
      <div className="aurora-editor__empty-actions">
        <div className="aurora-editor__newfile">
          <Icon.fileText size={15} className="aurora-editor__newfile-icon" />
          <input
            ref={inputRef}
            className="aurora-editor__filename-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreate() }}
            placeholder={t.auroraEditor.emptyNamePlaceholder}
            aria-label={t.auroraEditor.emptyNameAria}
            autoFocus
          />
          <button
            type="button"
            className="aurora-editor__newfile-btn"
            onClick={onCreate}
          >
            {t.auroraEditor.emptyCreate}
          </button>
        </div>
        <button
          type="button"
          className="aurora-editor__openfile-btn"
          onClick={onImportFile}
        >
          <Icon.folderOpen size={15} />
          {t.auroraEditor.emptyOpenFile}
        </button>
      </div>
      <div className="aurora-editor__empty-files">
        <EmptyFileBrowser />
      </div>
    </div>
  )
}
