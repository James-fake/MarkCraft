import type { Translations } from '@src/types/translations'
import type { LintIssue } from '../markdownLinter'
import { isPositionInCodeBlockFast, getLineAndCol } from '../lintUtils'

export function checkUnclosedCodeBlocks(lines: string[], issues: LintIssue[], t?: Translations) {
  let inCodeBlock = false;
  let codeBlockStartLine = -1;
  let codeBlockFence = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStartLine = i;
        codeBlockFence = trimmed.substring(0, 3);
      } else {
        const fence = trimmed.substring(0, 3);
        if (fence === codeBlockFence) {
          inCodeBlock = false;
        }
      }
    }
  }

  if (inCodeBlock) {
    const line = lines[codeBlockStartLine];
    const startCol = line.indexOf(codeBlockFence);
    issues.push({
      line: codeBlockStartLine,
      startCol,
      endCol: startCol + codeBlockFence.length,
      severity: 'error',
      issueType: 'unclosedCodeBlock',
      message: t ? t.lint.unclosedCodeBlock : '未闭合的代码块',
      suggestion: t ? `${t.lint.unclosedCodeBlockFix} "${codeBlockFence}"` : `在代码块末尾添加 "${codeBlockFence}" 来闭合代码块`,
    });
  }
}

export function checkUnclosedInlineCode(text: string, _lines: string[], issues: LintIssue[], t?: Translations) {
  let count = 0;
  let lastBacktickPos = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '`' && (i === 0 || text[i - 1] !== '\\')) {
      if (i + 2 < text.length && text[i + 1] === '`' && text[i + 2] === '`') {
        i += 2;
        continue;
      }
      count++;
      lastBacktickPos = i;
    }
  }

  if (count % 2 !== 0 && lastBacktickPos >= 0) {
    if (isPositionInCodeBlockFast(text, lastBacktickPos)) return;
    const { line, col } = getLineAndCol(text, lastBacktickPos);
    issues.push({
      line,
      startCol: col,
      endCol: col + 1,
      severity: 'error',
      issueType: 'unclosedInlineCode',
      message: t ? t.lint.unclosedInlineCode : '未闭合的行内代码：反引号数量为奇数',
      suggestion: t ? t.lint.unclosedInlineCodeFix : '添加一个反引号 ` 来闭合行内代码',
    });
  }
}
