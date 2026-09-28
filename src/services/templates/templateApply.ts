import type { Template } from './templateData'

/**
 * 应用模板变量：替换 {{date}}/{{time}}/{{title}}。
 *
 * 纯函数，无 React / 存储 / DOM 依赖。P2-4 从 `features/templates/templateManager`
 * 下沉至 services，使 features/fileManager（DailyNoteService）等低层 feature 可在不反向
 * 依赖 features/templates 的前提下套用模板变量。
 */
export function applyTemplate(template: Template, extraVars?: Record<string, string>): string {
  let result = template.content
  const now = new Date()
  result = result.replace(/\{\{date\}\}/g, now.toLocaleDateString('zh-CN'))
  result = result.replace(/\{\{time\}\}/g, now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  result = result.replace(/\{\{title\}\}/g, extraVars?.title ?? '')
  return result
}
