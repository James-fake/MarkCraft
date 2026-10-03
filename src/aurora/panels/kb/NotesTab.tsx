import { Icon } from '../../icons'
import { KbFileRow } from './KbFileRow'
import { useLanguage } from '@stores/LanguageStore'
import type { FileNode } from '@src/types/fileManager'

// 笔记 Tab：由真实 KB 文件集合派生；点击在编辑器中打开，并可一键新建笔记
export function NotesTab({ files, onOpen, onCreate }: { files: FileNode[]; onOpen: (id: string) => void; onCreate?: () => void }) {
  const { t } = useLanguage()
  const kp = t.kbPanel
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">{kp.notesEmptyTitle}</div>
        <div className="aurora-kb-placeholder__desc">{kp.notesEmptyDesc}</div>
        <div className="aurora-kb-placeholder__actions">
          {onCreate && <button className="aurora-kb-btn" onClick={onCreate}><Icon.plus size={14} /> {kp.newNote}</button>}
        </div>
      </div>
    )
  }
  return (
    <div className="aurora-kb-notes">
      <div className="aurora-kb-notes__head">
        <div className="aurora-kb-notes__head-left">
          <span className="aurora-kb-notes__head-title">{kp.notesHeadTitle}</span>
          <span className="aurora-kb-notes__head-count" aria-label={kp.notesCountAria.replace(String.raw`{n}`, String(files.length))}>{files.length}</span>
        </div>
        {onCreate && (
          <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={onCreate}><Icon.plus size={14} /> {kp.newNote}</button>
        )}
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onOpen} hint={kp.openInEditorHint.replace(String.raw`{name}`, f.name)} />
      ))}
    </div>
  )
}
