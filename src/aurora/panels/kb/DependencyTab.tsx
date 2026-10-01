import { Icon } from '../../icons'
import { KbFileRow } from './KbFileRow'
import type { FileNode } from '@src/types/fileManager'

// ─── 依赖分析 Tab：列出库内文件，点击打开单文件依赖面板 ───

export function DependencyTab({ files, onSelect }: { files: FileNode[]; onSelect: (id: string) => void }) {
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">暂无笔记</div>
        <div className="aurora-kb-placeholder__desc">本知识库尚未收录任何文件，无法分析依赖关系。</div>
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
        依赖分析 · 选择文件查看出链 / 入链 / 删除影响
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onSelect} hint={`查看「${f.name}」的依赖关系`} />
      ))}
    </div>
  )
}
