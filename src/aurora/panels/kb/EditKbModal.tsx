import { useState } from 'react'
import { Modal } from '@components/ui/Modal'
import { renameKb } from '@stores/kbStore'
import type { KnowledgeBase } from '@stores/kbTypes'

// ─── 编辑知识库对话框 ───

export function EditKbModal({
  kb,
  renameNode,
  updateDescription,
  loadKb,
  onClose,
  onSaved,
  toast,
  open,
}: {
  kb: KnowledgeBase
  renameNode: (id: string, name: string) => void
  updateDescription: (id: string, desc: string) => Promise<void>
  loadKb: (id: string) => Promise<KnowledgeBase | null>
  onClose: () => void
  onSaved: (doc: KnowledgeBase | null) => void
  toast?: (m: string) => void
  open: boolean
}) {
  const [name, setName] = useState(kb.name)
  const [desc, setDesc] = useState(kb.description)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      toast?.('名称不能为空')
      return
    }
    setBusy(true)
    try {
      await renameKb(kb.id, name.trim(), renameNode)
      await updateDescription(kb.id, desc)
      onSaved(await loadKb(kb.id))
      toast?.('已保存知识库信息')
      onClose()
    } catch (err) {
      toast?.(`保存失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="编辑知识库"
      size="md"
      contentClassName="aurora-kb-modal"
      footer={
        <>
          <button className="aurora-kb-btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="aurora-kb-btn aurora-kb-btn--primary" onClick={save} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <label className="aurora-kb-label">名称</label>
      <input className="aurora-kb-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <label className="aurora-kb-label" style={{ marginTop: 12, display: 'block' }}>描述</label>
      <textarea className="aurora-kb-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
    </Modal>
  )
}
