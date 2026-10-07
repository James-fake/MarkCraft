import { linter, Diagnostic } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import type { LintIssue } from '@utils/lintTypes'
import type { Translations } from '@src/types/translations'

// 创建 Lint 扩展
export function createLintExtension(
  lintMarkdown: (content: string, t?: Translations) => LintIssue[],
  fixIssue: (content: string, issue: LintIssue) => string | null,
) {
  return linter((view: EditorView): Diagnostic[] => {
    const doc = view.state.doc.toString()
    const totalLines = view.state.doc.lines
    // lintMarkdown 需要 t 参数，但 linter 回调中无法使用 hooks
    // 传入 undefined，lintMarkdown 内部会使用默认消息
    const issues = lintMarkdown(doc, undefined)

    return issues
      // LintIssue.line 为 0-based（getLineAndCol 从 0 计；fixFunctions 用 lines[issue.line]），
      // 故合法区间为 [0, totalLines)；CodeMirror 的 doc.line(n) 是 1-based，需 +1。
      .filter((issue: LintIssue) => issue.line >= 0 && issue.line < totalLines)
      .map((issue: LintIssue): Diagnostic => ({
        from: view.state.doc.line(issue.line + 1).from + issue.startCol,
        to: view.state.doc.line(issue.line + 1).from + issue.endCol,
        severity: issue.severity === 'error' ? 'error' : 'warning',
        message: issue.message,
        source: 'markdown-lint',
        actions: issue.suggestion ? [{
          name: `修复: ${issue.suggestion}`,
          apply(view: EditorView, _from: number, _to: number) {
            const newContent = fixIssue(view.state.doc.toString(), issue)
            if (newContent !== null) {
              view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: newContent },
              })
            }
          },
        }] : undefined,
      }))
  }, {
    delay: 500,
  })
}
