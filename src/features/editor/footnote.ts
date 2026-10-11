export interface FootnoteItem {
  id: string;
  content: string;
  line: number;
  fullContent: string;
}

export function extractFootnotes(markdown: string): FootnoteItem[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const footnotes: FootnoteItem[] = [];
  const definitionRegex = /^[ \t]*\[\^([^\]]+)\]:\s*(.*)$/;

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(definitionRegex);
    if (match) {
      const id = match[1];
      const firstLine = match[2];
      const definitionLine = i;
      const contentLines: string[] = [firstLine];

      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine === '' || nextLine.match(/^[ \t]{4,}/)) {
          contentLines.push(nextLine.replace(/^[ \t]{4}/, ''));
          j++;
        } else {
          break;
        }
      }

      const fullContent = contentLines.join('\n').trim();
      const displayContent = fullContent.length > 50
        ? fullContent.substring(0, 50) + '...'
        : fullContent;

      footnotes.push({
        id,
        content: displayContent,
        line: definitionLine,
        fullContent,
      });

      i = j;
    } else {
      i++;
    }
  }

  const refRegex = /\[\^([^\]]+)\]/g;
  const refOrder: string[] = [];
  let refMatch: RegExpExecArray | null;
  const tempRegex = new RegExp(refRegex.source, 'g');
  while ((refMatch = tempRegex.exec(markdown)) !== null) {
    const refId = refMatch[1];
    if (!refOrder.includes(refId)) {
      refOrder.push(refId);
    }
  }

  const orderedFootnotes = footnotes.sort((a, b) => {
    const aIndex = refOrder.indexOf(a.id);
    const bIndex = refOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return orderedFootnotes;
}

export function getFootnoteCount(markdown: string): number {
  return extractFootnotes(markdown).length;
}

export function getNextFootnoteId(markdown: string): number {
  const usedIds = new Set<number>();
  const allIds = new Set<string>();

  const defRegex = /\[\^([^\]]+)\]:/g;
  let match: RegExpExecArray | null;
  while ((match = defRegex.exec(markdown)) !== null) {
    allIds.add(match[1]);
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && String(num) === match[1]) {
      usedIds.add(num);
    }
  }

  const refRegex = /\[\^([^\]]+)\]/g;
  while ((match = refRegex.exec(markdown)) !== null) {
    allIds.add(match[1]);
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && String(num) === match[1]) {
      usedIds.add(num);
    }
  }

  if (usedIds.size === 0) return 1;

  let next = 1;
  while (usedIds.has(next)) {
    next++;
  }
  return next;
}

export function insertFootnote(
  markdown: string,
  cursorPos: number
): { newText: string; refCursorPos: number; defCursorPos: number } {
  const nextId = getNextFootnoteId(markdown);
  const refText = `[^${nextId}]`;

  const lines = markdown.split('\n');
  let defLineIndex = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/^[ \t]*\[\^[^\]]+\]:/)) {
      defLineIndex = i + 1;
      break;
    }
    if (lines[i].trim() === '' && i > 0 && lines[i - 1].match(/^[ \t]*\[\^[^\]]+\]:/)) {
      defLineIndex = i + 1;
      break;
    }
  }

  let charCount = 0;
  for (let i = 0; i < defLineIndex; i++) {
    charCount += lines[i].length + 1;
  }

  const beforeCursor = markdown.substring(0, cursorPos);
  const afterCursor = markdown.substring(cursorPos);

  const newMarkdown = beforeCursor + refText + afterCursor;

  const defText = `[^${nextId}]: `;
  const insertPos = charCount + refText.length;

  const finalText =
    newMarkdown.substring(0, insertPos) +
    (insertPos > 0 && newMarkdown[insertPos - 1] !== '\n' ? '\n' : '') +
    defText +
    '\n' +
    newMarkdown.substring(insertPos);

  const refCursorPos = cursorPos + refText.length;
  const actualDefInsertPos = insertPos + (insertPos > 0 && newMarkdown[insertPos - 1] !== '\n' ? 1 : 0);
  const defCursorPos = actualDefInsertPos + defText.length;

  return {
    newText: finalText,
    refCursorPos,
    defCursorPos,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 统计某脚注 id 在正文中的引用次数（排除定义行 `[^id]:`）。
 * 用于面板显示「被引用 N 处」。
 */
export function countFootnoteReferences(markdown: string, id: string): number {
  const refRe = new RegExp(`\\[\\^${escapeRegExp(id)}\\](?!:)`, 'g')
  return (markdown.match(refRe) || []).length
}

/** 第一条 `[^id]` 引用所在的行号（1-based），无则 -1。用于「跳回引用」。 */
export function firstFootnoteReferenceLine(markdown: string, id: string): number {
  const lines = markdown.split('\n')
  const refRe = new RegExp(`\\[\\^${escapeRegExp(id)}\\](?!:)`)
  for (let i = 0; i < lines.length; i++) {
    if (refRe.test(lines[i])) return i + 1
  }
  return -1
}

/** 编辑某脚注的定义内容（替换 `[^id]:` 后的正文，含续行）。 */
export function editFootnoteDefinition(markdown: string, id: string, newContent: string): string {
  const lines = markdown.split('\n')
  const defRe = new RegExp(`^(\\s*)\\[\\^${escapeRegExp(id)}\\]:\\s*(.*)$`)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(defRe)
    if (m) {
      let j = i + 1
      while (j < lines.length && (lines[j] === '' || /^\s{4,}/.test(lines[j]))) j++
      const indent = m[1] || ''
      lines[i] = `${indent}[^${id}]: ${newContent}`
      if (j > i + 1) lines.splice(i + 1, j - i - 1)
      break
    }
  }
  return lines.join('\n')
}

/** 删除某脚注：移除定义行（及续行）与正文中所有 `[^id]` 引用。 */
export function deleteFootnote(markdown: string, id: string): string {
  const lines = markdown.split('\n')
  const defRe = new RegExp(`^(\\s*)\\[\\^${escapeRegExp(id)}\\]:`)
  const refRe = new RegExp(`\\[\\^${escapeRegExp(id)}\\]`, 'g')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (defRe.test(lines[i])) {
      let j = i + 1
      while (j < lines.length && (lines[j] === '' || /^\s{4,}/.test(lines[j]))) j++
      i = j - 1
      continue
    }
    out.push(lines[i].replace(refRe, ''))
  }
  return out.join('\n')
}

/**
 * 新增脚注：在文末追加 `[^n]` 引用标记与 `[^n]:` 定义占位，返回新内容与新 id。
 * 供脚注面板「+ 新增」使用（面板无光标，故引用标记置于文末）。
 */
export function addFootnote(markdown: string, content = ''): { text: string; newId: string } {
  const nextId = getNextFootnoteId(markdown)
  const id = String(nextId)
  const base = markdown.replace(/\s*$/, '')
  const text = `${base}\n\n[^${id}]\n\n[^${id}]: ${content}`
  return { text, newId: id }
}
