export function generateMediaWikiBlob(markdown: string): Blob {
  const wiki = markdownToMediaWiki(markdown)
  return new Blob([wiki], { type: 'text/x-mediawiki' })
}

function markdownToMediaWiki(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inCodeBlock = false

  for (const line of lines) {
    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        result.push('<syntaxhighlight lang="' + line.trimStart().slice(3).trim() + '">')
      } else {
        inCodeBlock = false
        result.push('</syntaxhighlight>')
      }
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const eq = '='.repeat(level)
      result.push(`${eq} ${text} ${eq}`)
      continue
    }

    let processedLine = line

    // Bold
    processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, "'''$1'''")
    // Italic
    processedLine = processedLine.replace(/\*([^*]+)\*/g, "''$1''")
    // Inline code
    processedLine = processedLine.replace(/`([^`]+)`/g, '<code>$1</code>')
    // Images
    processedLine = processedLine.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[[File:$2|alt=$1]]')
    // Links
    processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$2 $1]')
    // Unordered lists
    processedLine = processedLine.replace(/^(\s*)- /, '$1* ')

    result.push(processedLine)
  }

  return result.join('\n')
}
