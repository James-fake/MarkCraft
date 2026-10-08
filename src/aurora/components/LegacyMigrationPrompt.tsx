import { useState } from 'react'
import { Modal, Button } from '@components/ui'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'

/**
 * P4-D：IndexedDB 旧笔记 → 本地 Vault 一次性迁移引导。
 *
 * 桌面端检测到「IDB 里还有笔记、但尚未选 Vault」时弹一次；用户点「迁移」选文件夹落盘，
 * 或点「暂不」忽略（都不破坏 IDB 原数据）。数据/动作来自 `useFileManager()`，
 * 本组件只负责呈现与触发，不含任何平台/存储逻辑。
 */
export function LegacyMigrationPrompt() {
  const { legacyMigration, migrateLegacyToVault, dismissLegacyMigration } = useFileManager()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)

  const M = t.legacyMigration
  const count = legacyMigration?.count ?? 0
  const open = !!legacyMigration

  const handleClose = () => {
    if (!busy) dismissLegacyMigration()
  }

  const handleMigrate = async () => {
    setBusy(true)
    try {
      await migrateLegacyToVault()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={M.title}
      description={M.body.replace('{n}', String(count))}
      size="sm"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={dismissLegacyMigration} disabled={busy}>
            {M.later}
          </Button>
          <Button variant="primary" onClick={handleMigrate} disabled={busy}>
            {busy ? M.migrating : M.migrate}
          </Button>
        </>
      }
    />
  )
}
