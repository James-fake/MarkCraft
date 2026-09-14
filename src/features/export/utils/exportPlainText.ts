export function generatePlainTextBlob(markdown: string): Blob {
  const text = markdownToPlainText(markdown)
  return new Blob([text], { type: 'text/plain' })
}

function markdownToPlainText(md: string): string {
  let text = md

  // Remove YAML front matter
  text = text.replace(/^---[\s\S]*?---\n?/, '')

  // Remove images: ![alt](url) -> [alt]
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]')

  // Remove links: [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove bold markers
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')

  // Remove italic markers
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')

  // Remove inline code markers
  text = text.replace(/`([^`]+)`/g, '$1')

  // Remove code block markers
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '')
  })

  // Remove heading markers
  text = text.replace(/^#{1,6}\s+/gm, '')

  // Remove horizontal rules
  text = text.replace(/^---+$/gm, '')
  text = text.replace(/^\*\*\*+$/gm, '')
  text = text.replace(/^___+$/gm, '')

  // Remove blockquote markers
  text = text.replace(/^>\s+/gm, '')

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1')

  // Clean up excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim() + '\n'
}
