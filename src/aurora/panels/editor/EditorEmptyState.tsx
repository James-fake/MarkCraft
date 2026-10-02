/**
 * 空态「新建笔记」引导界面（EditorPanel 主区 `!activeFileId` 分支的整块 JSX）：
 * 文件名输入 + 新建按钮 + 内嵌文件列表。
 * 文件列表直接内嵌于引导界面：轻量定制列表（非侧栏 FileTree），点文件即打开，无需再点按钮唤起侧栏。
 * 文件名状态由宿主持有（新建后需清空输入），本组件纯展示 + 回调。
 */
import { useRef } from 'react'
import { Icon } from '../../icons'
import { EmptyFileBrowser } from './EmptyFileBrowser'

interface EditorEmptyStateProps {
  /** 当前文件名输入值（受控于宿主的 newFileName） */
  value: string
  /** 输入变化（宿主 setNewFileName） */
  onChange: (v: string) => void
  /** 提交新建（宿主 handleCreateNote：留空回退未命名 + 同名去重） */
  onCreate: () => void
}

export function EditorEmptyState({ value, onChange, onCreate }: EditorEmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="aurora-editor__empty">
      <div className="aurora-editor__empty-icon">
        <Icon.fileText size={20} />
      </div>
      <div className="aurora-editor__empty-title">未打开文档</div>
      <div className="aurora-editor__empty-sub">
        在下方文件列表中选择一篇笔记，或按 <kbd className="aurora-editor__empty-kbd">⌘K</kbd> 打开命令面板快速定位
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
            placeholder="为这篇笔记起个名字…"
            aria-label="新文件名"
            autoFocus
          />
          <button
            type="button"
            className="aurora-editor__newfile-btn"
            onClick={onCreate}
          >
            新建笔记
          </button>
        </div>
      </div>
      <div className="aurora-editor__empty-files">
        <EmptyFileBrowser />
      </div>
    </div>
  )
}
