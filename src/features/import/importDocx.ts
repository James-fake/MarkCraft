import mammoth from 'mammoth'
import TurndownService from 'turndown'

export async function importDocxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  })
  return td.turndown(result.value)
}
