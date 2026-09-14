/**
 * Aurora 窗口控制按钮（美化的 Windows 风格）
 * - 最小化 / 最大化 / 关闭
 * - 关闭按钮 hover 时变红（Windows 标准色 #E81123）
 */
import { Icon } from '../../icons'

export interface WindowControlsProps {
  /** 最小化点击 */
  onMinimize?: () => void
  /** 最大化/还原点击 */
  onMaximize?: () => void
  /** 关闭点击 */
  onClose?: () => void
  /** 是否最大化状态 */
  maximized?: boolean
}

export function WindowControls({
  onMinimize,
  onMaximize,
  onClose,
  maximized = false,
}: WindowControlsProps) {
  return (
    <div className="aurora-wincontrols" role="group" aria-label="窗口控制">
      <button
        className="aurora-wincontrol aurora-wincontrol--min"
        onClick={onMinimize}
        aria-label="最小化"
        title="最小化"
      >
        <Icon.minimize size={10} />
      </button>
      <button
        className="aurora-wincontrol aurora-wincontrol--max"
        onClick={onMaximize}
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
      >
        {maximized ? <Icon.restore size={10} /> : <Icon.maximize size={10} />}
      </button>
      <button
        className="aurora-wincontrol aurora-wincontrol--close"
        onClick={onClose}
        aria-label="关闭"
        title="关闭"
      >
        <Icon.close size={10} />
      </button>
    </div>
  )
}
