import TurndownService from 'turndown'

export function importHtmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  })
  return td.turndown(html)
}
