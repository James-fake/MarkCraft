export function generateOpmlBlob(markdown: string): Blob {
  const opml = markdownToOpml(markdown)
  return new Blob([opml], { type: 'text/x-opml+xml' })
}

function markdownToOpml(markdown: string): string {
  const lines = markdown.split('\n')
  const headings: { level: number; text: string }[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)/)
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim() })
    }
  }

  if (headings.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Document Outline</title>
  </head>
  <body>
    <outline text="(No headings found)"/>
  </body>
</opml>`
  }

  // Build nested outline
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Document Outline</title>
  </head>
  <body>
`

  for (const heading of headings) {
    const indent = '    '.repeat(heading.level)
    const escapedText = heading.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    xml += `${indent}<outline text="${escapedText}"/>\n`
  }

  xml += `  </body>
</opml>`

  return xml
}
