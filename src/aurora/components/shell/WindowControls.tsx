/**
 * Aurora 窗口控制按钮（美化的 Windows 风格）
 * - 最小化 / 最大化 / 关闭
 * - 关闭按钮 hover 时变红（Windows 标准色 #E81123）
 */
import { Icon } from '../../icons'
import { useLanguage } from '@stores/LanguageStore'

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
  const { t } = useLanguage()
  const sh = t.shell
  return (
    <div className="aurora-wincontrols" role="group" aria-label={sh.windowControlsAria}>
      <button
        className="aurora-wincontrol aurora-wincontrol--min"
        onClick={onMinimize}
        aria-label={sh.minimize}
        title={sh.minimize}
      >
        <Icon.minimize size={10} />
      </button>
      <button
        className="aurora-wincontrol aurora-wincontrol--max"
        onClick={onMaximize}
        aria-label={maximized ? sh.restore : sh.maximize}
        title={maximized ? sh.restore : sh.maximize}
      >
        {maximized ? <Icon.restore size={10} /> : <Icon.maximize size={10} />}
      </button>
      <button
        className="aurora-wincontrol aurora-wincontrol--close"
        onClick={onClose}
        aria-label={sh.close}
        title={sh.close}
      >
        <Icon.close size={10} />
      </button>
    </div>
  )
}
