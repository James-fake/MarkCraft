import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { useLanguage } from '@stores/LanguageStore'

export interface QuitModalProps {
  isOpen: boolean
  /** 用户确认退出（AuroraShell 在此尝试 window.close() 并处理 Web 外壳限制） */
  onConfirm: () => void
  /** 用户取消（Esc / 遮罩 / 取消按钮） */
  onCancel: () => void
}

/**
 * 「退出 MarkCraft」确认弹窗 —— 自定义桌面风退出确认（批次② P0-B，用户拍板决策）。
 * 共享 Modal 单源（size=sm，z-index 走 modal 带 9980，Esc/遮罩关闭）。
 * 真正退出逻辑（window.close + Web 限制兜底）由 onConfirm 注入，本组件保持纯呈现。
 */
export function QuitModal({ isOpen, onConfirm, onCancel }: QuitModalProps) {
  const { t } = useLanguage()
  const sh = t.shell
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title={sh.quitTitle}
      description={sh.quitDescription}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {sh.quitCancel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {sh.quitConfirm}
          </Button>
        </>
      }
    />
  )
}
