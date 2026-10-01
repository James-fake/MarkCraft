import { Icon } from '../../icons'
import { KbFileRow } from './KbFileRow'
import type { FileNode } from '@src/types/fileManager'

// 笔记 Tab：由真实 KB 文件集合派生；点击在编辑器中打开，并可一键新建笔记
export function NotesTab({ files, onOpen, onCreate }: { files: FileNode[]; onOpen: (id: string) => void; onCreate?: () => void }) {
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">暂无笔记</div>
        <div className="aurora-kb-placeholder__desc">本知识库尚未收录任何文件。</div>
        <div className="aurora-kb-placeholder__actions">
          {onCreate && <button className="aurora-kb-btn" onClick={onCreate}><Icon.plus size={14} /> 新建笔记</button>}
        </div>
      </div>
    )
  }
  return (
    <div className="aurora-kb-notes">
      <div className="aurora-kb-notes__head">
        <div className="aurora-kb-notes__head-left">
          <span className="aurora-kb-notes__head-title">库内笔记</span>
          <span className="aurora-kb-notes__head-count" aria-label={`共 ${files.length} 条`}>{files.length}</span>
        </div>
        {onCreate && (
          <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={onCreate}><Icon.plus size={14} /> 新建笔记</button>
        )}
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onOpen} hint={`在编辑器中打开「${f.name}」`} />
      ))}
    </div>
  )
}
