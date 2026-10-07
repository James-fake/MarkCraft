// Markdown → LaTeX converter (pure JS, no Pandoc dependency)

interface LaTeXContext {
  inCodeBlock: boolean
  inList: boolean
  listDepth: number
}

function escapeLaTeXText(text: string): string {
  // Less aggressive escaping for text that may contain LaTeX math ($...$)
  let result = ''
  let inMath = false
  let i = 0
  while (i < text.length) {
    if (text[i] === '$') {
      inMath = !inMath
      result += '$'
      i++
      continue
    }
    if (inMath) {
      result += text[i]
    } else {
      // Escape special LaTeX characters outside math mode
      const char = text[i]
      switch (char) {
        case '\\': result += '\\textbackslash{}'; break
        case '{': result += '\\{'; break
        case '}': result += '\\}'; break
        case '&': result += '\\&'; break
        case '%': result += '\\%'; break
        case '#': result += '\\#'; break
        case '_': result += '\\_'; break
        case '~': result += '\\textasciitilde{}'; break
        case '^': result += '\\textasciicircum{}'; break
        default: result += char
      }
    }
    i++
  }
  return result
}

function processInlineMarkdown(text: string): string {
  let result = escapeLaTeXText(text)

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
  result = result.replace(/__(.+?)__/g, '\\textbf{$1}')

  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '\\textit{$1}')
  result = result.replace(/(?<!\\)_(.+?)_(?!\{)/g, '\\textit{$1}')

  // Inline code: `text`
  result = result.replace(/`(.+?)`/g, '\\texttt{$1}')

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '\\sout{$1}')

  // Links: [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '\\href{$2}{$1}')

  // Images: ![alt](url)
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '\\includegraphics{$2}')

  return result
}

export function markdownToLatex(content: string): string {
  const lines = content.split('\n')
  const latexLines: string[] = []
  const ctx: LaTeXContext = { inCodeBlock: false, inList: false, listDepth: 0 }

  // LaTeX preamble
  latexLines.push('\\documentclass[12pt,a4paper]{article}')
  latexLines.push('\\usepackage[utf8]{inputenc}')
  latexLines.push('\\usepackage[T1]{fontenc}')
  latexLines.push('\\usepackage{hyperref}')
  latexLines.push('\\usepackage{graphicx}')
  latexLines.push('\\usepackage{listings}')
  latexLines.push('\\usepackage{ulem}') // strikethrough
  latexLines.push('\\usepackage{amsmath}')
  latexLines.push('\\usepackage{amssymb}')
  latexLines.push('\\usepackage{booktabs}')
  latexLines.push('\\usepackage{longtable}')
  latexLines.push('')
  latexLines.push('\\hypersetup{')
  latexLines.push('  colorlinks=true,')
  latexLines.push('  linkcolor=blue,')
  latexLines.push('  urlcolor=blue')
  latexLines.push('}')
  latexLines.push('')
  latexLines.push('\\begin{document}')
  latexLines.push('')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.trimStart().startsWith('```')) {
      if (!ctx.inCodeBlock) {
        ctx.inCodeBlock = true
        const lang = line.trim().slice(3).trim()
        latexLines.push('\\begin{lstlisting}' + (lang ? `[language=${lang}]` : ''))
        i++
        continue
      } else {
        ctx.inCodeBlock = false
        latexLines.push('\\end{lstlisting}')
        latexLines.push('')
        i++
        continue
      }
    }

    if (ctx.inCodeBlock) {
      latexLines.push(line)
      i++
      continue
    }

    // Empty line
    if (line.trim() === '') {
      latexLines.push('')
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = processInlineMarkdown(headingMatch[2])
      const commands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph', '\\subparagraph', '\\subparagraph']
      const cmd = commands[Math.min(level - 1, 5)]
      latexLines.push(`${cmd}{${text}}`)
      latexLines.push('')
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      latexLines.push('\\noindent\\rule{\\textwidth}{0.4pt}')
      latexLines.push('')
      i++
      continue
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      latexLines.push('\\begin{quote}')
      for (const ql of quoteLines) {
        latexLines.push(processInlineMarkdown(ql))
      }
      latexLines.push('\\end{quote}')
      latexLines.push('')
      continue
    }

    // Unordered list
    if (/^[-*+]\s/.test(line.trimStart())) {
      latexLines.push('\\begin{itemize}')
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trimStart())) {
        const itemText = lines[i].replace(/^\s*[-*+]\s+/, '')
        latexLines.push(`  \\item ${processInlineMarkdown(itemText)}`)
        i++
      }
      latexLines.push('\\end{itemize}')
      latexLines.push('')
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trimStart())) {
      latexLines.push('\\begin{enumerate}')
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '')
        latexLines.push(`  \\item ${processInlineMarkdown(itemText)}`)
        i++
      }
      latexLines.push('\\end{enumerate}')
      latexLines.push('')
      continue
    }

    // Display math block ($$...$$)
    if (line.trimStart().startsWith('$$')) {
      const mathLines: string[] = []
      if (line.trim() === '$$') {
        i++
        while (i < lines.length && lines[i].trim() !== '$$') {
          mathLines.push(lines[i])
          i++
        }
        i++ // skip closing $$
      } else {
        // Single line $$...$$
        mathLines.push(line.trim().slice(2, -2))
        i++
      }
      latexLines.push('\\begin{equation}')
      for (const ml of mathLines) {
        latexLines.push(ml)
      }
      latexLines.push('\\end{equation}')
      latexLines.push('')
      continue
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+[-|\s:]*$/.test(lines[i + 1])) {
      const tableRows: string[][] = []
      // Parse header
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean)
      tableRows.push(headerCells)
      i++ // skip to separator
      i++ // skip separator line
      // Parse body rows
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean)
        tableRows.push(cells)
        i++
      }
      const colCount = tableRows[0]?.length || 1
      const colSpec = 'l'.repeat(colCount).split('').join('|')
      latexLines.push(`\\begin{longtable}{${colSpec}}`)
      latexLines.push('\\toprule')
      latexLines.push(tableRows[0].map(c => processInlineMarkdown(c)).join(' & ') + ' \\\\')
      latexLines.push('\\midrule')
      for (let r = 1; r < tableRows.length; r++) {
        latexLines.push(tableRows[r].map(c => processInlineMarkdown(c)).join(' & ') + ' \\\\')
      }
      latexLines.push('\\bottomrule')
      latexLines.push('\\end{longtable}')
      latexLines.push('')
      continue
    }

    // Regular paragraph
    latexLines.push(processInlineMarkdown(line))
    i++
  }

  latexLines.push('')
  latexLines.push('\\end{document}')

  return latexLines.join('\n')
}

export function generateLatexBlob(content: string): Blob {
  const latex = markdownToLatex(content)
  return new Blob([latex], { type: 'application/x-latex;charset=utf-8' })
}
