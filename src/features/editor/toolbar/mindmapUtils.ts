import { LayoutType, ColorTheme, colorThemes } from '@features/editor/toolbar/mindmapTemplates'

/** Layout direction marker embedded as a comment in the mindmap code */
const DIRECTION_MARKER = {
  radial: '%% direction: radial %%',
  right: '%% direction: right %%',
  down: '%% direction: down %%',
}

export function applyLayout(code: string, layout: LayoutType): string {
  // Remove any existing direction marker
  let cleaned = code
  for (const marker of Object.values(DIRECTION_MARKER)) {
    cleaned = cleaned.replace('\n' + marker, '')
  }

  if (layout === 'radial') return cleaned // radial is default, no marker needed

  const marker = DIRECTION_MARKER[layout]
  // Insert marker AFTER the "mindmap" keyword line so that
  // isMindmapCode() still sees "mindmap" as the first word
  const mindmapIdx = cleaned.indexOf('mindmap\n')
  if (mindmapIdx === -1) return cleaned
  const afterMindmap = mindmapIdx + 'mindmap\n'.length
  return cleaned.substring(0, afterMindmap) + marker + '\n' + cleaned.substring(afterMindmap)
}

/** Extract layout direction from mindmap code */
export function extractLayout(code: string): LayoutType {
  if (code.includes('%% direction: right %%')) return 'right'
  if (code.includes('%% direction: down %%')) return 'down'
  return 'radial'
}

export function applyColorTheme(code: string, theme: ColorTheme): string {
  if (theme === 'default') return code
  const themeData = colorThemes[theme]
  const closingIdx = code.lastIndexOf('\n```')
  if (closingIdx === -1) return code
  return code.substring(0, closingIdx) + themeData.classDef + code.substring(closingIdx)
}
