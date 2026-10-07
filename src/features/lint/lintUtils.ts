// Optimized check: avoids creating a full-length boolean array.
// Returns true if `pos` falls inside a fenced code block.
export function isPositionInCodeBlockFast(text: string, pos: number): boolean {
  let inBlock = false
  for (let i = 0; i < text.length && i <= pos; i++) {
    if (i === 0 || text[i - 1] === '\n') {
      const rest = text.substring(i)
      if (rest.startsWith('```') || rest.startsWith('~~~')) {
        inBlock = !inBlock
      }
    }
  }
  return inBlock
}

export function getLineAndCol(text: string, pos: number): { line: number; col: number } {
  let line = 0;
  let lastNewline = -1;

  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }

  return { line, col: pos - lastNewline - 1 };
}
