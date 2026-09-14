/**
 * Title and filename utility functions for MarkCraft
 * Extracted from useEditorState to follow single responsibility principle
 */

/**
 * Extract the first level-1 heading from Markdown content
 * @param content Markdown source text
 * @returns Heading text, or empty string if no heading found
 */
export function extractTitle(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim()
    }
  }
  return ''
}

/**
 * Replace illegal characters in a filename with underscores
 * Removes characters not allowed in Windows/macOS/Linux filenames
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_')
}
