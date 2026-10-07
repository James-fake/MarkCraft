import { getStyleCss } from './exportStyleManager'

export function printDocument(html: string, stylePresetId: string = 'default'): void {
  const css = getStyleCss(stylePresetId)
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Print</title>
<style>
${css}
@media print {
  body { margin: 0; padding: 20px; }
  @page { margin: 1cm; }
}
</style>
</head>
<body>${html}</body>
</html>`)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300)
  }
}
