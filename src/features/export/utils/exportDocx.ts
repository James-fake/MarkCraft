import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  LevelFormat,
  UnderlineType,
  convertInchesToTwip,
} from 'docx'
import { marked } from 'marked'
import type { Token, Tokens } from 'marked'
import type {
  HeadingToken,
  ParagraphToken,
  CodeToken,
  BlockquoteToken,
  ListToken,
  TableToken,
  TableCellToken,
  InlineToken,
} from './markedTypes'

// Walk marked tokens and convert to docx elements
function tokensToDocxElements(tokens: Token[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const headingToken = token as HeadingToken
        const text = extractText(headingToken.tokens || [])
        const headingLevel = headingToken.depth <= 6
          ? [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][headingToken.depth - 1]
          : HeadingLevel.HEADING_6
        elements.push(new Paragraph({
          text,
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        }))
        break
      }
      case 'paragraph': {
        const paraToken = token as ParagraphToken
        const runs = inlineTokensToRuns(paraToken.tokens || [])
        elements.push(new Paragraph({
          children: runs,
          spacing: { after: 120 },
        }))
        break
      }
      case 'code': {
        const codeToken = token as CodeToken
        const codeLines = codeToken.text.split('\n')
        for (const line of codeLines) {
          elements.push(new Paragraph({
            children: [new TextRun({
              text: line || ' ',
              font: 'Consolas',
              size: 20,
            })],
            spacing: { after: 0 },
            shading: { type: ShadingType.CLEAR, fill: 'f5f5f5' },
          }))
        }
        break
      }
      case 'blockquote': {
        const bqToken = token as BlockquoteToken
        const bqText = extractText(bqToken.tokens || [])
        elements.push(new Paragraph({
          children: [new TextRun({ text: bqText, italics: true })],
          indent: { left: convertInchesToTwip(0.5) },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: 'cccccc', space: 1 },
          },
        }))
        break
      }
      case 'list': {
        const listToken = token as ListToken
        for (const item of listToken.items) {
          const itemText = extractText(item.tokens || [])
          elements.push(new Paragraph({
            children: [new TextRun({
              text: listToken.ordered ? `${item.task ? '' : ''}${itemText}` : itemText,
            })],
            bullet: listToken.ordered ? undefined : { level: 0 },
            numbering: listToken.ordered ? { reference: 'default-numbering', level: 0 } : undefined,
            spacing: { after: 60 },
          }))
        }
        break
      }
      case 'hr': {
        elements.push(new Paragraph({
          children: [new TextRun({ text: '─'.repeat(50), color: 'cccccc' })],
          spacing: { before: 120, after: 120 },
          alignment: AlignmentType.CENTER,
        }))
        break
      }
      case 'table': {
        const tableToken = token as TableToken
        try {
          const headerCells = (tableToken.header || []).map((cell: TableCellToken) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: extractText(cell.tokens || []), bold: true })] })],
              width: { size: Math.floor(100 / (tableToken.header?.length || 1)), type: WidthType.PERCENTAGE },
            })
          )
          const bodyRows = (tableToken.rows || []).map((row: TableCellToken[]) =>
            new TableRow({
              children: row.map((cell: TableCellToken) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: extractText(cell.tokens || []) })] })],
                  width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
                })
              ),
            })
          )
          elements.push(new Table({
            rows: [
              new TableRow({ children: headerCells, tableHeader: true }),
              ...bodyRows,
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }))
        } catch {
          // Fallback: render as text
          elements.push(new Paragraph({ children: [new TextRun({ text: '[Table]' })] }))
        }
        break
      }
      case 'space':
        break
      default: {
        // Fallback for unknown token types
        const inlineToken = token as InlineToken
        const text = inlineToken.text || inlineToken.raw || ''
        if (text.trim()) {
          elements.push(new Paragraph({ children: [new TextRun({ text })] }))
        }
        break
      }
    }
  }

  return elements
}

function extractText(tokens: Token[]): string {
  let text = ''
  for (const token of tokens) {
    if (token.type === 'text') {
      text += (token as Tokens.Text).text || ''
    } else if (token.type === 'codespan') {
      text += (token as Tokens.Codespan).text || ''
    } else if ('tokens' in token && (token as InlineToken).tokens) {
      text += extractText((token as InlineToken).tokens!)
    } else if ('text' in token) {
      text += (token as InlineToken).text || ''
    }
  }
  return text
}

function inlineTokensToRuns(tokens: Token[]): TextRun[] {
  const runs: TextRun[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const textToken = token as Tokens.Text
        runs.push(new TextRun({ text: textToken.text }))
        break
      }
      case 'strong': {
        const strongToken = token as Tokens.Strong
        const text = extractText(strongToken.tokens || [])
        runs.push(new TextRun({ text, bold: true }))
        break
      }
      case 'em': {
        const emToken = token as Tokens.Em
        const text = extractText(emToken.tokens || [])
        runs.push(new TextRun({ text, italics: true }))
        break
      }
      case 'codespan': {
        const codeToken = token as Tokens.Codespan
        runs.push(new TextRun({
          text: codeToken.text,
          font: 'Consolas',
          size: 20,
          shading: { type: ShadingType.CLEAR, fill: 'f0f0f0' },
        }))
        break
      }
      case 'del': {
        const delToken = token as Tokens.Del
        const text = extractText(delToken.tokens || [])
        runs.push(new TextRun({ text, strike: true }))
        break
      }
      case 'link': {
        const linkToken = token as Tokens.Link
        const text = extractText(linkToken.tokens || [])
        runs.push(new TextRun({
          text,
          style: 'Hyperlink',
          color: '0563C1',
          underline: { type: UnderlineType.SINGLE },
        }))
        break
      }
      case 'image': {
        const imgToken = token as Tokens.Image
        runs.push(new TextRun({ text: `[Image: ${imgToken.text || imgToken.href}]`, italics: true, color: '888888' }))
        break
      }
      case 'br': {
        runs.push(new TextRun({ text: '', break: 1 }))
        break
      }
      default: {
        const inlineToken = token as InlineToken
        const text = inlineToken.text || ''
        if (text) runs.push(new TextRun({ text }))
        break
      }
    }
  }

  return runs
}

export async function generateDocxBlob(content: string): Promise<Blob> {
  const tokens = marked.lexer(content, { gfm: true, breaks: true })
  const elements = tokensToDocxElements(tokens)

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.START,
        }],
      }],
    },
    // F3 导出保真：文档默认样式 + 标题样式表（Heading1-6 品牌化）
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 22, // 11pt
            color: '333333',
          },
          paragraph: {
            spacing: { after: 120, line: 360 },
          },
        },
      },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: '1f4e79', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 360, after: 160 } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '2e74b5', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 280, after: 120 } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: '2e74b5', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 220, after: 100 } } },
        { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, color: '404040', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 180, after: 80 } } },
        { id: 'Heading5', name: 'Heading 5', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: '404040', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 160, after: 60 } } },
        { id: 'Heading6', name: 'Heading 6', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, italics: true, color: '595959', font: 'Microsoft YaHei' }, paragraph: { spacing: { before: 160, after: 60 } } },
        { id: 'Quote', name: 'Quote', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { italics: true, color: '595959', size: 21 }, paragraph: { spacing: { before: 100, after: 140 }, indent: { left: convertInchesToTwip(0.4) } } },
        { id: 'CodeBlock', name: 'Code Block', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Consolas', size: 19, color: '24292e' }, paragraph: { spacing: { after: 0 }, shading: { type: ShadingType.CLEAR, fill: 'f6f8fa' } } },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: elements,
    }],
  })

  return await Packer.toBlob(doc)
}
