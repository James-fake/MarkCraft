import type { Translations } from '@src/types/translations'
import type { LintIssue } from '../markdownLinter'
import { isPositionInCodeBlockFast, getLineAndCol } from '../lintUtils'

export function checkLinks(text: string, lines: string[], issues: LintIssue[], t?: Translations) {
  const incompleteLinkPattern = /\[([^\]]*)\]\(/g;
  const emptyLinkPattern = /\[\s*\]\([^)]*\)/g;
  const emptyUrlPattern = /\[([^\]]+)\]\(\s*\)/g;
  const orphanBracketPattern = /\[([^\]]{1,50})\](?!\(|\[)/g;

  let match: RegExpExecArray | null;

  incompleteLinkPattern.lastIndex = 0;
  while ((match = incompleteLinkPattern.exec(text)) !== null) {
    const pos = match.index;
    const afterParen = text.substring(pos + match[0].length, pos + match[0].length + 50);
    const hasClosingParen = afterParen.includes(')');

    if (!hasClosingParen) {
      if (isPositionInCodeBlockFast(text, pos)) continue;
      const { line, col } = getLineAndCol(text, pos);
      issues.push({
        line,
        startCol: col,
        endCol: col + match[0].length,
        severity: 'error',
        issueType: 'incompleteLink',
        message: t ? t.lint.incompleteLink : '链接格式不完整：缺少右括号 ")"',
        suggestion: t ? t.lint.incompleteLinkFix : '补全链接地址并添加右括号，如 [文字](url)',
      });
    }
  }

  emptyLinkPattern.lastIndex = 0;
  while ((match = emptyLinkPattern.exec(text)) !== null) {
    if (isPositionInCodeBlockFast(text, match.index)) continue;
    const { line, col } = getLineAndCol(text, match.index);
    issues.push({
      line,
      startCol: col,
      endCol: col + match[0].length,
      severity: 'warning',
      issueType: 'emptyLinkText',
      message: t ? t.lint.emptyLinkText : '链接文字为空',
      suggestion: t ? t.lint.emptyLinkTextFix : '在方括号内添加链接描述文字，如 [描述](url)',
    });
  }

  emptyUrlPattern.lastIndex = 0;
  while ((match = emptyUrlPattern.exec(text)) !== null) {
    if (isPositionInCodeBlockFast(text, match.index)) continue;
    const { line, col } = getLineAndCol(text, match.index);
    issues.push({
      line,
      startCol: col,
      endCol: col + match[0].length,
      severity: 'error',
      issueType: 'emptyLinkUrl',
      message: t ? t.lint.emptyLinkUrl : '链接地址为空',
      suggestion: t ? t.lint.emptyLinkUrlFix : '在圆括号内添加链接地址，如 [文字](https://example.com)',
    });
  }

  orphanBracketPattern.lastIndex = 0;
  while ((match = orphanBracketPattern.exec(text)) !== null) {
    if (isPositionInCodeBlockFast(text, match.index)) continue;
    const before = text.substring(Math.max(0, match.index - 1), match.index);
    if (before === '!' || before === '[') continue;

    const content = match[1];
    if (content.includes(']') || content.length > 40) continue;

    const { line, col } = getLineAndCol(text, match.index);
    const lineText = lines[line];
    if (lineText && lineText.trimStart().startsWith('[')) continue;

    issues.push({
      line,
      startCol: col,
      endCol: col + match[0].length,
      severity: 'warning',
      issueType: 'possibleIncompleteLink',
      message: t ? t.lint.possibleIncompleteLink : '可能的未完成链接：方括号后缺少圆括号',
      suggestion: t ? t.lint.possibleIncompleteLinkFix : '如果是链接，请添加 (url)；如果是普通文本，可忽略此提示',
    });
  }
}

export function checkImages(text: string, _lines: string[], issues: LintIssue[], t?: Translations) {
  const incompleteImagePattern = /!\[([^\]]*)\]\(/g;

  let match: RegExpExecArray | null;

  incompleteImagePattern.lastIndex = 0;
  while ((match = incompleteImagePattern.exec(text)) !== null) {
    const pos = match.index;
    const afterParen = text.substring(pos + match[0].length, pos + match[0].length + 100);
    const hasClosingParen = afterParen.includes(')');

    if (!hasClosingParen) {
      if (isPositionInCodeBlockFast(text, pos)) continue;
      const { line, col } = getLineAndCol(text, pos);
      issues.push({
        line,
        startCol: col,
        endCol: col + match[0].length,
        severity: 'error',
        issueType: 'incompleteImage',
        message: t ? t.lint.incompleteImage : '图片格式不完整：缺少右括号 ")"',
        suggestion: t ? t.lint.incompleteImageFix : '补全图片地址并添加右括号，如 ![描述](url)',
      });
    }
  }

  const emptyImageAlt = /!\[\s*\]\((image:[^)]+|[^)]*)\)/g;
  emptyImageAlt.lastIndex = 0;
  while ((match = emptyImageAlt.exec(text)) !== null) {
    if (isPositionInCodeBlockFast(text, match.index)) continue;
    const urlMatch = match[0].match(/\]\(([^)]*)\)/);
    if (urlMatch && urlMatch[1].startsWith('image:')) continue;
    const { line, col } = getLineAndCol(text, match.index);
    issues.push({
      line,
      startCol: col,
      endCol: col + match[0].length,
      severity: 'warning',
      issueType: 'missingImageAlt',
      message: t ? t.lint.missingImageAlt : '图片缺少替代文字',
      suggestion: t ? t.lint.missingImageAltFix : '在方括号内添加图片描述，如 ![图片描述](url)，有助于无障碍访问',
    });
  }
}
