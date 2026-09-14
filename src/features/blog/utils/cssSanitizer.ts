/**
 * CSS 安全过滤器 — 移除已知的 CSS XSS 向量
 * 参考 OWASP CSS XSS Prevention Cheat Sheet
 *
 * 防护的攻击向量：
 * 1. IE expression() — 在属性值中执行 JS
 * 2. javascript:/vbscript: 协议 — 旧浏览器在 url() 中执行 JS
 * 3. -moz-binding — Firefox XBL 绑定
 * 4. behavior — IE 行为绑定
 * 5. @import javascript: — 导入恶意资源
 * 6. data:text/html — data URL 中的 HTML
 */

/** 危险模式列表 */
const DANGEROUS_PATTERNS: ReadonlyArray<{
  regex: RegExp
  replacement: string
  reason: string
}> = [
  // 1. IE expression() — 在属性值中执行 JS
  { regex: /expression\s*\(/gi, replacement: 'expression_disabled(', reason: 'IE expression() XSS 向量' },

  // 2. javascript: 协议 — 旧浏览器在 url() 中执行 JS
  { regex: /url\s*\(\s*["']?\s*javascript:/gi, replacement: 'url(javascript_disabled:', reason: 'url(javascript:) 协议' },

  // 3. vbscript: 协议
  { regex: /url\s*\(\s*["']?\s*vbscript:/gi, replacement: 'url(vbscript_disabled:', reason: 'url(vbscript:) 协议' },

  // 4. -moz-binding — Firefox XBL 绑定（可加载恶意 XML）
  { regex: /-moz-binding\s*:/gi, replacement: '-moz-binding-disabled:', reason: 'Firefox XBL 绑定' },

  // 5. behavior — IE 行为绑定（可加载恶意 HTC 文件）
  { regex: /(^|[^a-zA-Z-])behavior\s*:/gi, replacement: '$1behavior-disabled:', reason: 'IE behavior 绑定' },

  // 6. @import javascript: — 导入恶意资源
  { regex: /@import\s+["']?\s*javascript:/gi, replacement: '@import "javascript_disabled:', reason: '@import javascript:' },

  // 7. data: URL 中的 HTML/JS（允许图片 data: URL，仅过滤 text/html）
  { regex: /url\s*\(\s*["']?\s*data:text\/html/gi, replacement: 'url(data:text/disabled', reason: 'data:text/html in url()' },
]

/** 检测到的威胁记录 */
export interface CssSanitizationThreat {
  line: number
  pattern: string
  reason: string
}

/** 过滤结果 */
export interface CssSanitizationResult {
  /** 过滤后的安全 CSS */
  sanitized: string
  /** 检测到的威胁列表 */
  threats: CssSanitizationThreat[]
  /** 是否检测到威胁 */
  hasThreats: boolean
}

/**
 * 对 CSS 进行安全过滤，移除已知的 XSS 向量
 * @param css 原始 CSS 字符串
 * @returns 过滤结果，含安全 CSS 和威胁列表
 */
export function sanitizeCss(css: string): CssSanitizationResult {
  if (!css || !css.trim()) {
    return { sanitized: css, threats: [], hasThreats: false }
  }

  const threats: CssSanitizationThreat[] = []
  let sanitized = css

  for (const { regex, replacement, reason } of DANGEROUS_PATTERNS) {
    // 使用一个新的正则实例进行检测（避免 lastIndex 状态污染）
    const testRegex = new RegExp(regex.source, regex.flags)

    if (testRegex.test(sanitized)) {
      // 记录威胁位置 — 逐行扫描
      const lines = sanitized.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const lineTestRegex = new RegExp(regex.source, regex.flags)
        if (lineTestRegex.test(lines[i])) {
          threats.push({
            line: i + 1,
            pattern: lines[i].trim().slice(0, 80),
            reason,
          })
        }
      }

      // 执行替换 — 使用全局正则
      const replaceRegex = new RegExp(regex.source, regex.flags)
      sanitized = sanitized.replace(replaceRegex, replacement)
    }
  }

  return {
    sanitized,
    threats,
    hasThreats: threats.length > 0,
  }
}

/**
 * 快速过滤版本 — 仅返回安全 CSS，不收集威胁详情
 * 用于性能敏感的路径（如实时预览注入）
 */
export function sanitizeCssFast(css: string): string {
  if (!css || !css.trim()) return css

  let sanitized = css
  for (const { regex, replacement } of DANGEROUS_PATTERNS) {
    const replaceRegex = new RegExp(regex.source, regex.flags)
    sanitized = sanitized.replace(replaceRegex, replacement)
  }
  return sanitized
}
