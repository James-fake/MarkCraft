/**
 * Aurora · 编辑器语法检查列表面板
 *
 * - 数据：EditorPanel 通过真实 `lintMarkdown(localContent)` 500ms 防抖后传入 issues
 * - 列表：error 优先，按行号排序；每行行号 / 级别色点 / 消息 / 一键修复按钮
 * - 跳转：点击列表项 → onJump（EditorPanel 实现：DOM 文本定位 + scrollIntoView + 设选区）
 * - 修复：fixIssue 走真实 `features/lint/fixFunctions`，修复后由 EditorPanel 触发重新 lint
 * - 定位：`position:absolute` 锚定 `.aurora-editor`（布局根，无 transform），
 *   坐标系确定，任何祖先 transform/重渲染都不会让它"漂移"到标题栏
 *   （此前 fixed 定位在用户环境被祖先 transform 劫持 containing block 导致跳动）
 *
 * 设计：Aurora 桌面语言（深色玻璃面板 / --mc-* token / 发丝分隔 / 非卡片化）
 */

import type { LintIssue } from '@utils/lintTypes'
import { Icon } from '../../icons'

interface AuroraLintListProps {
  issues: LintIssue[]
  open: boolean
  onClose: () => void
  onJump: (issue: LintIssue) => void
  onFix: (issue: LintIssue) => void
}

// 可一键修复的问题类型（与真实 LintPopover.canFix 保持同源）
const FIXABLE_TYPES = new Set([
  'unclosedCodeBlock',
  'incompleteLink',
  'missingSpaceAfterHash',
  'unclosedInlineCode',
  'incompleteImage',
  'missingImageAlt',
  'mixedHorizontalRule',
  'missingSpaceAfterListMarker',
  'missingSpaceAfterOrderedList',
  'mixedIndentation',
])

export function AuroraLintList({ issues, open, onClose, onJump, onFix }: AuroraLintListProps) {
  if (!open) return null

  const sorted = [...issues].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
    return a.line - b.line
  })
  const errorCount = sorted.filter((i) => i.severity === 'error').length
  const warningCount = sorted.filter((i) => i.severity === 'warning').length

  return (
    <div
      className="aurora-lint-panel"
      role="dialog"
      aria-label="语法检查问题列表"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="aurora-lint-panel__head">
        <span className="aurora-lint-panel__title">语法检查</span>
        <span className="aurora-lint-panel__count">
          {errorCount > 0 && (
            <span className="aurora-lint-panel__count-item aurora-lint-panel__count-item--error">
              <span className="aurora-lint-panel__dot" />
              <span>{errorCount} 错误</span>
            </span>
          )}
          {warningCount > 0 && (
            <span className="aurora-lint-panel__count-item aurora-lint-panel__count-item--warn">
              <span className="aurora-lint-panel__dot" />
              <span>{warningCount} 警告</span>
            </span>
          )}
        </span>
        <button
          type="button"
          className="aurora-lint-panel__close"
          onClick={onClose}
          aria-label="关闭语法检查列表"
        >
          <Icon.close size={14} />
        </button>
      </div>

      <div className="aurora-lint-panel__list">
        {sorted.length === 0 ? (
          <div className="aurora-lint-panel__empty"><Icon.check size={14} /> 当前文档无语法问题</div>
        ) : (
          sorted.map((issue, idx) => {
            const isError = issue.severity === 'error'
            const fixable = FIXABLE_TYPES.has(issue.issueType)
            const key = `${issue.line}-${issue.startCol}-${idx}`
            return (
              <div
                key={key}
                className={`aurora-lint-panel__item ${isError ? 'is-error' : 'is-warning'}`}
                role="button"
                tabIndex={0}
                onClick={() => onJump(issue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onJump(issue)
                  }
                }}
                title={issue.suggestion ? `提示：${issue.suggestion}` : undefined}
              >
                <span className="aurora-lint-panel__line">L{issue.line + 1}</span>
                <span className="aurora-lint-panel__msg">{issue.message}</span>
                {fixable && (
                  <button
                    type="button"
                    className="aurora-lint-panel__fix"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFix(issue)
                    }}
                    title="一键修复"
                    aria-label="一键修复"
                  >
                    <Icon.spark size={14} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}