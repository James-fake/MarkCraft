import type { Translations } from '@src/types/translations'
import type { LintIssue } from '../markdownLinter'

export function checkHorizontalRules(lines: string[], issues: LintIssue[], t?: Translations) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length >= 3 && /^[*\-_]+$/.test(trimmed)) {
      const chars = new Set(trimmed.split(''));
      if (chars.size > 1) {
        issues.push({
          line: i,
          startCol: lines[i].indexOf(trimmed),
          endCol: lines[i].indexOf(trimmed) + trimmed.length,
          severity: 'warning',
          issueType: 'mixedHorizontalRule',
          message: t ? t.lint.mixedHorizontalRule : '水平分割线混用了不同字符',
          suggestion: t ? t.lint.mixedHorizontalRuleFix : '水平分割线应使用同一种字符，如 --- 或 *** 或 ___',
        });
      }
    }
  }
}
