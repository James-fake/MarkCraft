import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title="退出 MarkCraft"
      description="当前为 Web 外壳运行环境，确认后将尝试关闭此标签页 / 浏览器窗口。未保存的内容已在本地自动保存，可放心退出。"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            退出
          </Button>
        </>
      }
    />
  )
}
