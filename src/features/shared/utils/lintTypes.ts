/**
 * Lint 问题类型定义
 *
 * 此类型被 editor、lint 等多个模块共享，
 * 提取到 shared 层以消除 editor → lint 的类型耦合。
 */
export interface LintIssue {
  line: number;
  startCol: number;
  endCol: number;
  severity: 'error' | 'warning';
  issueType: string;
  message: string;
  suggestion: string;
}
