import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../icons'
import { useLanguage } from '@stores/LanguageStore'

export interface QuitModalProps {
  isOpen: boolean
  /** 用户确认退出（AuroraShell 在此尝试 window.close() 并处理 Web 外壳限制） */
  onConfirm: () => void
  /** 用户取消（Esc / 遮罩 / 取消按钮） */
  onCancel: () => void
}

/**
 * 「退出 MarkCraft」确认弹窗 —— 按 Aurora 设计体系重做的桌面风退出确认。
 * 居中英雄式布局（告警徽标 + 标题 + 说明），与 Modal 底层视觉同源、Esc/遮罩关闭。
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
    >
      <div className="aurora-quit">
        <div className="aurora-quit__badge" aria-hidden="true">
          <Icon.alert size={24} />
        </div>
        <h2 className="aurora-quit__title">{sh.quitTitle}</h2>
        <p className="aurora-quit__desc">{sh.quitDescription}</p>
      </div>
    </Modal>
  )
}
