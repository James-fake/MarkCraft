import { useState } from 'react'
import { Icon } from '../../icons'
import { generateKbMoc } from '@features/knowledgeBase'
import { useLanguage } from '@stores/LanguageStore'
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
  const { t } = useLanguage()
  const kp = t.kbPanel
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)

  const gen = async () => {
    setBusy(true)
    try {
      const md = await generateKbMoc(kb, files)
      setPreview(md)
      toast?.(kp.mocGenerated)
    } catch (err) {
      toast?.(kp.mocGenerateFailed.replace(String.raw`{msg}`, (err as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(preview)
      toast?.(kp.mocCopied)
    } catch {
      toast?.(kp.mocCopyFailed)
    }
  }

  const save = () => {
    if (!preview) return
    const id = createFile(kb.folderId, 'MOC.md', preview, false)
    if (id) toast?.(kp.mocSaved)
  }

  return (
    <div className="aurora-kb-moc">
      <div className="aurora-kb-moc__bar">
        <span className="aurora-kb-moc__title">{kp.mocTitle}</span>
        <div className="aurora-kb-moc__actions">
          <button className="aurora-kb-btn aurora-kb-btn--primary" onClick={gen} disabled={busy}>
            {busy ? kp.mocGenerating : kp.mocGenerate}
          </button>
          <button className="aurora-kb-btn" onClick={copy} disabled={!preview}>{kp.mocCopy}</button>
          <button className="aurora-kb-btn" onClick={save} disabled={!preview}>{kp.mocSaveAsNote}</button>
        </div>
      </div>
      {preview ? (
        <pre className="aurora-kb-moc__preview">{preview}</pre>
      ) : (
        <div className="aurora-kb-placeholder">
          <div className="aurora-kb-placeholder__icon"><Icon.layers size={28} /></div>
          <div className="aurora-kb-placeholder__title">{kp.mocPlaceholderTitle}</div>
          <div className="aurora-kb-placeholder__desc">{kp.mocPlaceholderDesc}</div>
        </div>
      )}
    </div>
  )
}
