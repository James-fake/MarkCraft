import { Icon } from '../../icons'
import { KbFileRow } from './KbFileRow'
import { useLanguage } from '@stores/LanguageStore'
import type { FileNode } from '@src/types/fileManager'

// ─── 依赖分析 Tab：列出库内文件，点击打开单文件依赖面板 ───

export function DependencyTab({ files, onSelect }: { files: FileNode[]; onSelect: (id: string) => void }) {
  const { t } = useLanguage()
  const kp = t.kbPanel
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">{kp.notesEmptyTitle}</div>
        <div className="aurora-kb-placeholder__desc">{kp.depEmptyDesc}</div>
      </div>
    )
  }
  return (
    <div className="aurora-kb-notes">
      {/* 引导标题：由 .aurora-kb-notes__lead 自带顶部留白。
          容器 `.aurora-kb-notes` 顶内边距仅 2px（为「自带 __head 的笔记 Tab」设计），
          依赖 Tab 没有 head，复用 .aurora-kb-card__title + 内联 margin 会令标题
          贴住 subbar 下沿 —— 见 kb.css 中 __lead 的说明。 */}
      <div className="aurora-kb-notes__lead">
        {kp.depLead}
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onSelect} hint={kp.depRowHint.replace(String.raw`{name}`, f.name)} />
      ))}
    </div>
  )
}
