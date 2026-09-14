import type { LintIssue } from './markdownLinter'
import { isPositionInCodeBlockFast, getLineAndCol } from './lintUtils'

export function fixIssue(content: string, issue: LintIssue): string | null {
  const lines = content.split('\n');
  const lineText = lines[issue.line];
  if (lineText === undefined) return null;

  if (issue.issueType === 'unclosedCodeBlock') {
    return content + '\n```';
  }

  if (issue.issueType === 'incompleteLink') {
    const incompleteLinkPattern = /\[([^\]]*)\]\(/g;
    let match: RegExpExecArray | null;
    incompleteLinkPattern.lastIndex = 0;
    while ((match = incompleteLinkPattern.exec(content)) !== null) {
      const pos = match.index;
      const afterParen = content.substring(pos + match[0].length, pos + match[0].length + 50);
      const hasClosingParen = afterParen.includes(')');
      if (!hasClosingParen) {
        if (isPositionInCodeBlockFast(content, pos)) continue;
        const { line, col } = getLineAndCol(content, pos);
        if (line === issue.line && col === issue.startCol) {
          return content.substring(0, pos + match[0].length) + ')' + content.substring(pos + match[0].length);
        }
      }
    }
    return null;
  }

  if (issue.issueType === 'emptyLinkText') {
    return null;
  }

  if (issue.issueType === 'emptyLinkUrl') {
    return null;
  }

  if (issue.issueType === 'possibleIncompleteLink') {
    return null;
  }

  if (issue.issueType === 'missingSpaceAfterHash') {
    const headingMatch = lineText.match(/^(#{1,6})([^#\s])/);
    if (headingMatch) {
      const hashPart = headingMatch[1];
      const insertPos = lineText.indexOf(hashPart) + hashPart.length;
      lines[issue.line] = lineText.substring(0, insertPos) + ' ' + lineText.substring(insertPos);
      return lines.join('\n');
    }
    return null;
  }

  if (issue.issueType === 'headingLevelSkip') {
    return null;
  }

  if (issue.issueType === 'emptyHeading') {
    return null;
  }

  if (issue.issueType === 'missingSpaceAfterListMarker' || issue.issueType === 'missingSpaceAfterOrderedList') {
    const trimmed = lineText.trimStart();
    const indent = lineText.length - trimmed.length;
    const unorderedMatch = trimmed.match(/^([-*+])([^ ])/);
    if (unorderedMatch) {
      const markerPos = indent + 1;
      lines[issue.line] = lineText.substring(0, markerPos) + ' ' + lineText.substring(markerPos);
      return lines.join('\n');
    }
    const orderedMatch = trimmed.match(/^(\d+\.)([^ ])/);
    if (orderedMatch) {
      const markerEnd = indent + orderedMatch[1].length;
      lines[issue.line] = lineText.substring(0, markerEnd) + ' ' + lineText.substring(markerEnd);
      return lines.join('\n');
    }
    return null;
  }

  if (issue.issueType === 'mixedIndentation') {
    const mixedIndent = lineText.match(/^( +\t|\t +)/);
    if (mixedIndent) {
      const newIndent = mixedIndent[0].replace(/\t/g, '  ');
      lines[issue.line] = newIndent + lineText.substring(mixedIndent[0].length);
      return lines.join('\n');
    }
    return null;
  }

  if (issue.issueType === 'unclosedInlineCode') {
    let count = 0;
    let lastBacktickPos = -1;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '`' && (i === 0 || content[i - 1] !== '\\')) {
        if (i + 2 < content.length && content[i + 1] === '`' && content[i + 2] === '`') {
          i += 2;
          continue;
        }
        count++;
        lastBacktickPos = i;
      }
    }
    if (count % 2 !== 0 && lastBacktickPos >= 0) {
      if (isPositionInCodeBlockFast(content, lastBacktickPos)) return null;
      const { line } = getLineAndCol(content, lastBacktickPos);
      if (line === issue.line) {
        const lineEnd = content.indexOf('\n', lastBacktickPos);
        const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
        return content.substring(0, actualLineEnd) + '`' + content.substring(actualLineEnd);
      }
    }
    return null;
  }

  if (issue.issueType === 'incompleteImage') {
    const incompleteImagePattern = /!\[([^\]]*)\]\(/g;
    let match: RegExpExecArray | null;
    incompleteImagePattern.lastIndex = 0;
    while ((match = incompleteImagePattern.exec(content)) !== null) {
      const pos = match.index;
      const afterParen = content.substring(pos + match[0].length, pos + match[0].length + 100);
      const hasClosingParen = afterParen.includes(')');
      if (!hasClosingParen) {
        if (isPositionInCodeBlockFast(content, pos)) continue;
        const { line, col } = getLineAndCol(content, pos);
        if (line === issue.line && col === issue.startCol) {
          return content.substring(0, pos + match[0].length) + ')' + content.substring(pos + match[0].length);
        }
      }
    }
    return null;
  }

  if (issue.issueType === 'missingImageAlt') {
    const emptyImageAlt = /!\[\s*\]\([^)]*\)/g;
    let match: RegExpExecArray | null;
    emptyImageAlt.lastIndex = 0;
    while ((match = emptyImageAlt.exec(content)) !== null) {
      if (isPositionInCodeBlockFast(content, match.index)) continue;
      const { line, col } = getLineAndCol(content, match.index);
      if (line === issue.line && col === issue.startCol) {
        const insertPos = match.index + 2;
        return content.substring(0, insertPos) + 'image' + content.substring(insertPos);
      }
    }
    return null;
  }

  if (issue.issueType === 'mixedHorizontalRule') {
    const trimmed = lineText.trim();
    if (trimmed.length >= 3 && /^[*\-_]+$/.test(trimmed)) {
      const chars = new Set(trimmed.split(''));
      if (chars.size > 1) {
        const indent = lineText.indexOf(trimmed);
        lines[issue.line] = lineText.substring(0, indent) + '---' + lineText.substring(indent + trimmed.length);
        return lines.join('\n');
      }
    }
    return null;
  }

  return null;
}
