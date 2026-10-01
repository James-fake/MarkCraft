import { useState } from 'react'
import { Modal } from '@components/ui/Modal'
import type { KnowledgeBase } from '@stores/kbTypes'

// ─── 删除知识库对话框 ───

export function DeleteKbModal({
  kb,
  deleteKb,
  deleteNode,
  onClose,
  onDeleted,
  toast,
  open,
}: {
  kb: KnowledgeBase
  deleteKb: (id: string, delFolder: boolean, delNode?: (id: string) => void) => Promise<void>
  deleteNode: (id: string) => void
  onClose: () => void
  onDeleted: () => void
  toast?: (m: string) => void
  open: boolean
}) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await deleteKb(kb.id, true, deleteNode)
      toast?.(`已删除知识库「${kb.name}」`)
      onDeleted()
    } catch (err) {
      toast?.(`删除失败：${(err as Error).message}`)
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="删除知识库"
      size="md"
      contentClassName="aurora-kb-modal"
      footer={
        <>
          <button className="aurora-kb-btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="aurora-kb-btn aurora-kb-btn--danger" onClick={confirm} disabled={busy}>
            {busy ? '删除中…' : '删除'}
          </button>
        </>
      }
    >
      <p className="aurora-kb-modal__desc">
        确定要删除「{kb.name}」吗？此操作将同时删除其关联文件夹与所有收录文件，且不可撤销。
      </p>
    </Modal>
  )
}
