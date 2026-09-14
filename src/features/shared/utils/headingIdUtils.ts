/**
 * Generate a stable heading ID from heading text content.
 *
 * Uses a slug-based approach: lowercase, replace non-alphanumeric with hyphens,
 * then append a collision suffix if needed.
 *
 * This function is shared between:
 *   - HeadingIdAssign (ProseMirror doc traversal)
 *   - outlineUtils (Markdown text traversal)
 *   - useMarkdownRenderer (preview rendering)
 *
 * Using text-based IDs ensures consistency regardless of traversal method,
 * since the same heading text always produces the same ID.
 */

export interface OutlineItem {
  id: string;
  text: string;
  level: number;
  children?: OutlineItem[];
}

export function generateHeadingId(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-') // keep alphanumeric + CJK, replace rest with -
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
  return slug || 'heading'
}

/**
 * Assign unique IDs to a list of headings, handling collisions
 * by appending -2, -3, etc.
 */
export function assignHeadingIds<T extends { text: string }>(
  headings: T[]
): Array<T & { id: string }> {
  const usedIds = new Map<string, number>()

  return headings.map((h) => {
    const base = generateHeadingId(h.text)
    const count = usedIds.get(base) || 0
    usedIds.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count + 1}`
    return { ...h, id }
  })
}

/**
 * Strip markdown inline syntax from heading text so that
 * generateHeadingId produces the same result as the Tiptap editor
 * (which uses plain textContent without markdown syntax).
 */
function stripMarkdownInline(text: string): string {
  return text
    // Images: ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links: [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Reference-style links: [text][ref] → text
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    // Footnote references: [^id] → empty
    .replace(/\[\^[^\]]+\]/g, '')
    // Bold: **text** or __text__ → text
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    // Italic: *text* or _text_ → text (avoid matching within words)
    .replace(/(?<!\w)(\*|_)(?=\S)([\s\S]*?\S)\1(?!\w)/g, '$2')
    // Strikethrough: ~~text~~ → text
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1')
    // Inline code: `code` → code
    .replace(/`([^`]+)`/g, '$1')
    // Highlight: ==text== → text
    .replace(/==(?=\S)([\s\S]*?\S)==/g, '$1')
    .trim()
}

export function parseMarkdownHeadings(markdown: string): OutlineItem[] {
  const lines = markdown.split('\n');
  const rawHeadings: { text: string; level: number }[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = stripMarkdownInline(match[2].trim());
      rawHeadings.push({ text, level });
    }
  }

  // Use shared ID generation to ensure consistency with HeadingIdAssign
  const withIds = assignHeadingIds(rawHeadings)

  // Build tree structure
  const headings: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const h of withIds) {
    const item: OutlineItem = { id: h.id, text: h.text, level: h.level, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      headings.push(item);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    }

    stack.push(item);
  }

  return headings;
}

export function getFlatHeadingList(markdown: string): Array<{ id: string; text: string; level: number }> {
  const tree = parseMarkdownHeadings(markdown);
  const result: Array<{ id: string; text: string; level: number }> = [];

  function flatten(items: OutlineItem[]) {
    for (const item of items) {
      result.push({ id: item.id, text: item.text, level: item.level });
      if (item.children && item.children.length > 0) {
        flatten(item.children);
      }
    }
  }

  flatten(tree);
  return result;
}

/**
 * 根据 headingId 查找其在 markdown 源码中所在的行号（1-based）。
 * 与 parseMarkdownHeadings 使用相同的 ID 生成规则，保证大纲点击与源码行号对齐。
 * 找不到时返回 -1。
 */
export function findHeadingLine(markdown: string, headingId: string): number {
  const lines = markdown.split('\n');
  const usedIds = new Map<string, number>();
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const text = stripMarkdownInline(match[2].trim());
      const base = generateHeadingId(text);
      const count = usedIds.get(base) || 0;
      usedIds.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      if (id === headingId) {
        return i + 1; // 1-based
      }
    }
  }

  return -1;
}
