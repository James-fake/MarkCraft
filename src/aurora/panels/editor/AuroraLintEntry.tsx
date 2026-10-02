/**
 * 状态栏语法检查入口（与真实 EditorStatusBar 状态栏互补）：
 * 呈现错误/警告计数徽标；点击展开 AuroraLintList 常驻面板。
 * 注：点击行为挂在 PageFrame statusLeftItems 的 clickable 项上（宿主接线），
 * 本组件只负责徽标展示与键盘可达（Enter/Space 触发 onToggle），不自带 onClick，
 * 避免与 clickable 项的点击处理叠加热区造成双触发。
 */
interface AuroraLintEntryProps {
  errorCount: number
  warnCount: number
  /** 键盘触发（Enter / Space）时展开/收起检查面板 */
  onToggle: () => void
}

export function AuroraLintEntry({ errorCount, warnCount, onToggle }: AuroraLintEntryProps) {
  return (
    <span
      className="aurora-lint-entry"
      title="点击查看语法检查列表"
      aria-label="打开语法检查列表"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
    >
      {errorCount > 0 && (
        <span className="aurora-lint-entry__dot aurora-lint-entry__dot--error" />
      )}
      {errorCount > 0 && (
        <span className="aurora-lint-entry__num aurora-lint-entry__num--error">{errorCount}</span>
      )}
      {warnCount > 0 && (
        <span className="aurora-lint-entry__dot aurora-lint-entry__dot--warn" />
      )}
      {warnCount > 0 && (
        <span className="aurora-lint-entry__num aurora-lint-entry__num--warn">{warnCount}</span>
      )}
      <span className="aurora-lint-entry__label">语法</span>
    </span>
  )
}
