import { useState } from 'react'
import { Icon } from '../../icons'
import { generateKbMoc } from '@features/knowledgeBase'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

// ─── MOC 生成 Tab：生成知识库目录索引（复用真实 generateKbMoc）───

export function MocTab({
  kb,
  files,
  createFile,
  toast,
}: {
  kb: KnowledgeBase
  files: FileNode[]
  createFile: (parentId: string, name: string, content?: string, openAfterCreate?: boolean) => string
  toast?: (m: string) => void
}) {
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)

  const gen = async () => {
    setBusy(true)
    try {
      const md = await generateKbMoc(kb, files)
      setPreview(md)
      toast?.('MOC 已生成')
    } catch (err) {
      toast?.(`生成失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(preview)
      toast?.('已复制到剪贴板')
    } catch {
      toast?.('复制失败')
    }
  }

  const save = () => {
    if (!preview) return
    const id = createFile(kb.folderId, 'MOC.md', preview, false)
    if (id) toast?.('已保存为笔记：MOC.md')
  }

  return (
    <div className="aurora-kb-moc">
      <div className="aurora-kb-moc__bar">
        <span className="aurora-kb-moc__title">MOC 目录索引</span>
        <div className="aurora-kb-moc__actions">
          <button className="aurora-kb-btn aurora-kb-btn--primary" onClick={gen} disabled={busy}>
            {busy ? '生成中…' : '生成 MOC'}
          </button>
          <button className="aurora-kb-btn" onClick={copy} disabled={!preview}>复制</button>
          <button className="aurora-kb-btn" onClick={save} disabled={!preview}>保存为笔记</button>
        </div>
      </div>
      {preview ? (
        <pre className="aurora-kb-moc__preview">{preview}</pre>
      ) : (
        <div className="aurora-kb-placeholder">
          <div className="aurora-kb-placeholder__icon"><Icon.layers size={28} /></div>
          <div className="aurora-kb-placeholder__title">知识库目录（MOC）</div>
          <div className="aurora-kb-placeholder__desc">点击「生成 MOC」自动汇总本库所有笔记的标题、标签与摘要，按标签分组生成目录索引。</div>
        </div>
      )}
    </div>
  )
}
