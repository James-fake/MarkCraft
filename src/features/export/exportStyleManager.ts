import { EXPORT_CSS } from './utils/exportHtml'

// i18n：非 React 模块，由调用方注入 messages（UI 侧传 t.exportKit 映射后的对象）。
// 中文 DEFAULT_* 兜底，保证既有断言（中文）测试零改动通过。
export interface ExportStyleMessages {
  defaultName: string
  defaultDesc: string
  academicName: string
  academicDesc: string
  technicalName: string
  technicalDesc: string
  minimalName: string
  minimalDesc: string
  importedDesc: string
}

export const DEFAULT_EXPORT_STYLE_MESSAGES: ExportStyleMessages = {
  defaultName: '默认样式',
  defaultDesc: 'MarkCraft 默认导出样式',
  academicName: '学术论文',
  academicDesc: '适合学术论文的排版样式',
  technicalName: '技术文档',
  technicalDesc: '适合技术文档的样式',
  minimalName: '简约风格',
  minimalDesc: '极简排版样式',
  importedDesc: '导入的自定义样式',
}

export interface ExportStylePreset {
  id: string
  name: string
  description: string
  css: string
  isBuiltIn: boolean
}

const CUSTOM_STYLES_KEY = 'markcraft_custom_export_styles'

const BUILT_IN_PRESETS: ExportStylePreset[] = [
  {
    id: 'default',
    name: '默认样式',
    description: 'MarkCraft 默认导出样式',
    css: '',  // Will use EXPORT_CSS
    isBuiltIn: true,
  },
  {
    id: 'academic',
    name: '学术论文',
    description: '适合学术论文的排版样式',
    css: `body { font-family: 'Times New Roman', 'SimSun', serif; font-size: 12pt; line-height: 2; max-width: 700px; margin: 0 auto; color: #000; } h1 { font-size: 18pt; text-align: center; margin: 24pt 0 12pt; } h2 { font-size: 15pt; margin: 18pt 0 8pt; } h3 { font-size: 13pt; margin: 12pt 0 6pt; } p { text-indent: 2em; margin: 6pt 0; } blockquote { border-left: 3px solid #999; padding-left: 12pt; color: #555; margin: 8pt 0; } code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; padding: 1pt 3pt; } pre { background: #f5f5f5; padding: 10pt; border-radius: 3pt; overflow-x: auto; } table { border-collapse: collapse; width: 100%; margin: 8pt 0; } th, td { border: 1px solid #000; padding: 4pt 8pt; font-size: 10.5pt; } th { background: #e8e8e8; font-weight: bold; } img { max-width: 100%; margin: 8pt auto; display: block; }`,
    isBuiltIn: true,
  },
  {
    id: 'technical',
    name: '技术文档',
    description: '适合技术文档的样式',
    css: `body { font-family: 'Consolas', 'Source Code Pro', 'Microsoft YaHei', monospace; font-size: 14px; line-height: 1.7; max-width: 900px; margin: 0 auto; color: #24292e; background: #fff; } h1, h2, h3 { font-family: -apple-system, 'Segoe UI', sans-serif; border-bottom: 1px solid #eaecef; padding-bottom: 8px; } h1 { font-size: 24px; } h2 { font-size: 20px; } h3 { font-size: 16px; } code { font-family: 'Consolas', monospace; background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 85%; } pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; line-height: 1.45; } pre code { background: none; padding: 0; } blockquote { border-left: 4px solid #dfe2e5; padding: 0 16px; color: #6a737d; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #dfe2e5; padding: 6px 13px; } th { background: #f6f8fa; } img { max-width: 100%; }`,
    isBuiltIn: true,
  },
  {
    id: 'minimal',
    name: '简约风格',
    description: '极简排版样式',
    css: `body { font-family: -apple-system, 'Helvetica Neue', sans-serif; font-size: 16px; line-height: 1.8; max-width: 600px; margin: 0 auto; color: #333; } h1 { font-size: 28px; font-weight: 300; letter-spacing: -0.5px; margin: 40px 0 20px; } h2 { font-size: 22px; font-weight: 400; margin: 32px 0 16px; } h3 { font-size: 18px; font-weight: 500; margin: 24px 0 12px; } p { margin: 12px 0; } blockquote { border-left: 2px solid #ddd; padding-left: 16px; color: #777; font-style: italic; } code { font-family: 'SF Mono', monospace; font-size: 14px; background: #f9f9f9; padding: 2px 4px; } pre { background: #f9f9f9; padding: 16px; border-radius: 4px; } img { max-width: 100%; border-radius: 4px; }`,
    isBuiltIn: true,
  },
]

export function getExportStylePresets(
  messages: ExportStyleMessages = DEFAULT_EXPORT_STYLE_MESSAGES
): ExportStylePreset[] {
  const builtIns = BUILT_IN_PRESETS.map((p) => {
    const labels: Record<string, { name: string; description: string }> = {
      default: { name: messages.defaultName, description: messages.defaultDesc },
      academic: { name: messages.academicName, description: messages.academicDesc },
      technical: { name: messages.technicalName, description: messages.technicalDesc },
      minimal: { name: messages.minimalName, description: messages.minimalDesc },
    }
    const lbl = labels[p.id] ?? { name: p.name, description: p.description }
    return { ...p, ...lbl }
  })
  return [...builtIns, ...getCustomStyles()]
}

export function getCustomStyles(): ExportStylePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STYLES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomStyle(style: ExportStylePreset): void {
  const styles = getCustomStyles()
  const existingIdx = styles.findIndex(s => s.id === style.id)
  if (existingIdx !== -1) {
    styles[existingIdx] = style
  } else {
    styles.push(style)
  }
  try {
    localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(styles))
  } catch {}
}

export function deleteCustomStyle(id: string): void {
  const styles = getCustomStyles().filter(s => s.id !== id)
  try {
    localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(styles))
  } catch {}
}

export function getStyleCss(presetId: string): string {
  const preset = BUILT_IN_PRESETS.find(p => p.id === presetId)
  if (preset) {
    return preset.id === 'default' ? EXPORT_CSS : preset.css
  }
  const custom = getCustomStyles().find(s => s.id === presetId)
  return custom?.css || EXPORT_CSS
}

export function importCssFile(
  cssText: string,
  name: string,
  messages: ExportStyleMessages = DEFAULT_EXPORT_STYLE_MESSAGES
): ExportStylePreset {
  return {
    id: `custom_${Date.now()}`,
    name,
    description: messages.importedDesc,
    css: cssText,
    isBuiltIn: false,
  }
}
