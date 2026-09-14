export function generateRstBlob(markdown: string): Blob {
  const rst = markdownToRst(markdown)
  return new Blob([rst], { type: 'text/x-rst' })
}

function markdownToRst(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inCodeBlock = false
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.trimStart().slice(3).trim()
        result.push(`.. code-block:: ${codeLang || 'text'}`)
        result.push('')
      } else {
        inCodeBlock = false
      }
      continue
    }
    if (inCodeBlock) {
      result.push(`   ${line}`)
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const underline = level === 1 ? '=' : level === 2 ? '-' : level === 3 ? '~' : level === 4 ? '^' : '"'
      result.push(text)
      result.push(underline.repeat(text.length))
      continue
    }

    // Images: ![alt](url)
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch) {
      result.push(`.. image:: ${imgMatch[2]}`)
      if (imgMatch[1]) result.push(`   :alt: ${imgMatch[1]}`)
      continue
    }

    // Links: [text](url)
    let processedLine = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '`$1 <$2>`_')

    // Bold: **text** -> **text** (same in RST)
    // Italic: *text* -> *text* (same in RST)
    // Inline code: `code` -> ``code``
    processedLine = processedLine.replace(/`([^`]+)`/g, '``$1``')

    // Unordered lists: - item -> * item
    processedLine = processedLine.replace(/^(\s*)- /, '$1* ')

    result.push(processedLine)
  }

  return result.join('\n')
}
