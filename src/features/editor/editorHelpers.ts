export function scrollToLine(
  textarea: HTMLTextAreaElement,
  scrollContainer: HTMLElement,
  lineNumber: number,
  col: number
): void {
  const text = textarea.value
  const lines = text.split('\n')

  if (lineNumber < 0 || lineNumber >= lines.length) return

  let charIndex = 0
  for (let i = 0; i < lineNumber; i++) {
    charIndex += lines[i].length + 1
  }

  const targetCol = Math.min(col, lines[lineNumber].length)
  const cursorPos = charIndex + targetCol

  textarea.focus()
  textarea.setSelectionRange(cursorPos, cursorPos)

  const computedStyle = getComputedStyle(textarea)
  const lineHeight = parseFloat(computedStyle.lineHeight) || 24
  const paddingTop = parseFloat(computedStyle.paddingTop) || 16
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 16
  const paddingRight = parseFloat(computedStyle.paddingRight) || 16
  const fontSize = parseFloat(computedStyle.fontSize) || 14
  const fontFamily = computedStyle.fontFamily || 'Consolas, Monaco, Fira Code, monospace'
  const availableWidth = scrollContainer.clientWidth - paddingLeft - paddingRight

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let targetY = paddingTop
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`
    for (let i = 0; i < lineNumber; i++) {
      const textWidth = ctx.measureText(lines[i]).width
      const wrappedLines = Math.max(1, Math.ceil(textWidth / availableWidth))
      targetY += wrappedLines * lineHeight
    }
  } else {
    targetY = paddingTop + lineNumber * lineHeight
  }

  const containerHeight = scrollContainer.clientHeight
  const targetScrollTop = targetY - (containerHeight / 3)

  scrollContainer.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: 'smooth'
  })

  triggerLineHighlight(scrollContainer, lineNumber, lineHeight, lines, ctx, availableWidth, paddingTop)
}

function triggerLineHighlight(
  scrollContainer: HTMLElement,
  lineNumber: number,
  lineHeight: number,
  lines: string[],
  ctx: CanvasRenderingContext2D | null,
  availableWidth: number,
  paddingTop: number
): void {
  const existing = scrollContainer.querySelector('.lint-line-highlight')
  if (existing) existing.remove()

  let targetY = paddingTop
  let lineBlockHeight = lineHeight
  if (ctx) {
    for (let i = 0; i < lineNumber; i++) {
      const textWidth = ctx.measureText(lines[i]).width
      const wrappedLines = Math.max(1, Math.ceil(textWidth / availableWidth))
      targetY += wrappedLines * lineHeight
    }
    const textWidth = ctx.measureText(lines[lineNumber]).width
    const wrappedLines = Math.max(1, Math.ceil(textWidth / availableWidth))
    lineBlockHeight = wrappedLines * lineHeight
  } else {
    targetY = paddingTop + lineNumber * lineHeight
  }

  const highlight = document.createElement('div')
  highlight.className = 'lint-line-highlight'
  highlight.style.position = 'absolute'
  highlight.style.left = '0'
  highlight.style.right = '0'
  highlight.style.height = `${lineBlockHeight}px`
  highlight.style.top = `${targetY}px`
  highlight.style.pointerEvents = 'none'
  highlight.style.zIndex = '3'

  const contentDiv = scrollContainer.querySelector('.select-none') as HTMLElement
  if (contentDiv) {
    contentDiv.style.position = 'relative'
    contentDiv.appendChild(highlight)
  }

  setTimeout(() => {
    if (highlight.parentNode) highlight.remove()
  }, 1500)
}
