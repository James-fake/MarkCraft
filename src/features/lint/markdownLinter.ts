import type { Translations } from '../../types/translations'
import {
  checkUnclosedCodeBlocks,
  checkLinks,
  checkHeadings,
  checkListFormat,
  checkUnclosedInlineCode,
  checkImages,
  checkHorizontalRules,
} from './rules'

export type { LintIssue } from '../shared/utils/lintTypes'
import type { LintIssue } from '../shared/utils/lintTypes'

export function lintMarkdown(text: string, t?: Translations): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = text.split('\n');

  checkUnclosedCodeBlocks(lines, issues, t);
  checkLinks(text, lines, issues, t);
  checkHeadings(lines, issues, t);
  checkListFormat(lines, issues, t);
  checkUnclosedInlineCode(text, lines, issues, t);
  checkImages(text, lines, issues, t);
  checkHorizontalRules(lines, issues, t);

  return issues;
}

export { fixIssue } from './fixFunctions'
