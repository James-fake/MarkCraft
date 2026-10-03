import { useState } from 'react'
import { Modal } from '@components/ui/Modal'
import { useLanguage } from '@stores/LanguageStore'
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
  const { t } = useLanguage()
  const km = t.kbModal

  const confirm = async () => {
    setBusy(true)
    try {
      await deleteKb(kb.id, true, deleteNode)
      toast?.(km.deleted.replace('{name}', kb.name))
      onDeleted()
    } catch (err) {
      toast?.(km.deleteFailed.replace('{msg}', (err as Error).message))
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={km.deleteTitle}
      size="md"
      contentClassName="aurora-kb-modal"
      footer={
        <>
          <button className="aurora-kb-btn" onClick={onClose} disabled={busy}>{km.cancel}</button>
          <button className="aurora-kb-btn aurora-kb-btn--danger" onClick={confirm} disabled={busy}>
            {busy ? km.deleting : km.delete}
          </button>
        </>
      }
    >
      <p className="aurora-kb-modal__desc">
        {km.deleteConfirm.replace('{name}', kb.name)}
      </p>
    </Modal>
  )
}
