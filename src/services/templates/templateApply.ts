/**
 * 应用模板变量（纯函数，无 React / 存储 / DOM 依赖）。
 *
 * 支持的变量：
 * - `{{date}}`              默认中文日期（如 2026/10/11）
 * - `{{date:YYYY-MM-DD}}`   自定义格式（YYYY/YY/MM/M/DD/D/HH/H/mm/m/ss/s）
 * - `{{time}}`              默认时间（HH:mm）
 * - `{{time:HH:mm:ss}}`     自定义时间格式
 * - `{{weekday}}`           星期几（如 星期六）
 * - `{{year}}` `{{month}}` `{{day}}`  数字年/月/日
 * - `{{title}}`             标题（由调用方传入：当前笔记名 / 新建名）
 * - `{{filename}}`          文件名（缺省回退到 title）
 *
 * P2-4 自 features 下沉至 services；本次（模板优化 A 档）扩展变量集并修复 `{{title}}`
 * 恒为空的问题（此前插入方从不传 extraVars）。
 */
export interface TemplateVars {
  title?: string
  filename?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 把日期/时间按 pattern 格式化（YYYY/YY/MM/M/DD/D/HH/H/mm/m/ss/s）。 */
export function formatDatePattern(now: Date, pattern: string): string {
  const map: Record<string, string> = {
    YYYY: String(now.getFullYear()),
    YY: String(now.getFullYear()).slice(-2),
    MM: pad2(now.getMonth() + 1),
    M: String(now.getMonth() + 1),
    DD: pad2(now.getDate()),
    D: String(now.getDate()),
    HH: pad2(now.getHours()),
    H: String(now.getHours()),
    mm: pad2(now.getMinutes()),
    m: String(now.getMinutes()),
    ss: pad2(now.getSeconds()),
    s: String(now.getSeconds()),
  }
  // 交替顺序：长 token 在前，避免 MM 被 M 抢先匹配
  return pattern.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, (token) => map[token] ?? token)
}

/** 变量替换（不含 {{cursor}} 处理），供 applyTemplate / resolveTemplate 共用。 */
function substitute(text: string, now: Date, extraVars?: TemplateVars): string {
  let result = text
  result = result.replace(/\{\{date:([^}]+)\}\}/g, (_m, fmt: string) => formatDatePattern(now, fmt))
  result = result.replace(/\{\{time:([^}]+)\}\}/g, (_m, fmt: string) => formatDatePattern(now, fmt))
  result = result.replace(/\{\{date\}\}/g, now.toLocaleDateString('zh-CN'))
  result = result.replace(/\{\{time\}\}/g, now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  result = result.replace(/\{\{weekday\}\}/g, now.toLocaleDateString('zh-CN', { weekday: 'long' }))
  result = result.replace(/\{\{year\}\}/g, String(now.getFullYear()))
  result = result.replace(/\{\{month\}\}/g, String(now.getMonth() + 1))
  result = result.replace(/\{\{day\}\}/g, String(now.getDate()))
  result = result.replace(/\{\{title\}\}/g, extraVars?.title ?? '')
  result = result.replace(/\{\{filename\}\}/g, extraVars?.filename ?? extraVars?.title ?? '')
  return result
}

/** 应用模板变量，返回最终 markdown 文本。接受任意带 content 的对象（模板 / 范例通用）。 */
export function applyTemplate(template: { content: string }, extraVars?: TemplateVars): string {
  return substitute(template.content, new Date(), extraVars)
}
