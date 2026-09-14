import type { Translations } from '@src/types/translations'
import type { LintIssue } from '../markdownLinter'

export function checkHeadings(lines: string[], issues: LintIssue[], t?: Translations) {
  let lastHeadingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    const headingMatch = trimmed.match(/^(#{1,6})\s/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const startCol = lines[i].indexOf('#');

      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        issues.push({
          line: i,
          startCol,
          endCol: startCol + headingMatch[1].length,
          severity: 'warning',
          issueType: 'headingLevelSkip',
          message: t ? `${t.lint.headingLevelSkip}: H${lastHeadingLevel} → H${level}` : `标题层级跳跃：从 H${lastHeadingLevel} 直接跳到 H${level}`,
          suggestion: t ? t.lint.headingLevelSkipFix : `建议在 H${lastHeadingLevel} 和 H${level} 之间添加 H${lastHeadingLevel + 1} 标题`,
        });
      }

      const afterHash = trimmed.substring(headingMatch[1].length);
      if (!afterHash.startsWith(' ')) {
        issues.push({
          line: i,
          startCol,
          endCol: startCol + headingMatch[1].length,
          severity: 'warning',
          issueType: 'missingSpaceAfterHash',
          message: t ? t.lint.missingSpaceAfterHash : '# 号后缺少空格',
          suggestion: t ? t.lint.missingSpaceAfterHashFix : '在 # 号和标题文字之间添加一个空格，如 "# 标题"',
        });
      }

      const headingText = trimmed.substring(headingMatch[1].length).trim();
      if (!headingText) {
        issues.push({
          line: i,
          startCol,
          endCol: startCol + headingMatch[1].length + 1,
          severity: 'error',
          issueType: 'emptyHeading',
          message: t ? t.lint.emptyHeading : '标题内容为空',
          suggestion: t ? t.lint.emptyHeadingFix : '在 # 号后添加标题文字',
        });
      }

      lastHeadingLevel = level;
    }
  }
}
