import type { Translations } from '@src/types/translations'
import type { LintIssue } from '../markdownLinter'

export function checkListFormat(lines: string[], issues: LintIssue[], t?: Translations) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    const isBoldOrItalic = /^\*{1,3}[^ *]/.test(trimmed) && /\*{1,3}(?:\s|$)/.test(trimmed)
      || /^_{1,3}[^ _]/.test(trimmed) && /_{1,3}(?:\s|$)/.test(trimmed)
    const isHorizontalRule = /^[-*_]{2,}$/.test(trimmed)
    if (!isBoldOrItalic && !isHorizontalRule) {
      const unorderedMatch = trimmed.match(/^([-*+])([^ ])/);
      if (unorderedMatch) {
        const indent = line.length - trimmed.length;
        issues.push({
          line: i,
          startCol: indent + 1,
          endCol: indent + 1 + unorderedMatch[2].length,
          severity: 'warning',
          issueType: 'missingSpaceAfterListMarker',
          message: t ? `${t.lint.missingSpaceAfterListMarker}: "${unorderedMatch[1]}"` : `列表标记 "${unorderedMatch[1]}" 后缺少空格`,
          suggestion: t ? t.lint.missingSpaceAfterListMarkerFix : `在列表标记后添加空格，如 "${unorderedMatch[1]} 项目"`,
        });
      }
    }

    const orderedMatch = trimmed.match(/^(\d+\.)([^ ])/);
    if (orderedMatch) {
      const indent = line.length - trimmed.length;
      issues.push({
        line: i,
        startCol: indent + orderedMatch[1].length,
        endCol: indent + orderedMatch[1].length + orderedMatch[2].length,
        severity: 'warning',
        issueType: 'missingSpaceAfterOrderedList',
        message: t ? t.lint.missingSpaceAfterOrderedList : '有序列表标记后缺少空格',
        suggestion: t ? t.lint.missingSpaceAfterOrderedListFix : `在列表标记后添加空格，如 "${orderedMatch[1]} 项目"`,
      });
    }

    const mixedIndent = line.match(/^( +\t|\t +)/);
    if (mixedIndent) {
      issues.push({
        line: i,
        startCol: 0,
        endCol: mixedIndent[0].length,
        severity: 'warning',
        issueType: 'mixedIndentation',
        message: t ? t.lint.mixedIndentation : '缩进混用了空格和制表符',
        suggestion: t ? t.lint.mixedIndentationFix : '统一使用空格或制表符进行缩进',
      });
    }
  }
}
