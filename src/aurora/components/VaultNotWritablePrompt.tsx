import { Modal, Button } from '@components/ui'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 「文件夹不可写」告警。
 *
 * 背景（真实事故）：Windows 上目录可能对当前用户只给 RX（只读），此时所有写盘都会 EPERM。
 * 原先 `syncTree` 把写盘错误**静默吞掉** → 界面一切正常、文件却一个都不落盘，用户完全无从察觉。
 * 现在改为：采用 Vault 前预检可写性 + 写盘失败上报 → 由本组件显式告知，并给出「换一个文件夹」出口。
 *
 * 数据此时是安全的（暂存在应用内部存储），所以文案要说明「尚未落盘」而不是「已丢失」。
 */
export function VaultNotWritablePrompt() {
  const { vaultError, dismissVaultError, openVault } = useFileManager()
  const { t } = useLanguage()

  const V = t.vaultNotWritable

  return (
    <Modal
      isOpen={!!vaultError}
      onClose={dismissVaultError}
      title={V.title}
      description={V.body.replace('{path}', vaultError?.path ?? '')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={dismissVaultError}>
            {V.later}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              void openVault()
            }}
          >
            {V.chooseAnother}
          </Button>
        </>
      }
    />
  )
}
