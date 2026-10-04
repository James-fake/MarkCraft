export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * CSS 上下文转义。用于拼接进 <style> 或 style="..." 的值。
 * 注意：在 HTML 属性（style="..."）内联时，外层属性用双引号分隔，
 * 故调用方应配合 safeCssUrl 的协议白名单 + 单引号包裹策略，避免双引号逃逸。
 */
export function escapeCss(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/;/g, '\\;')
    .replace(/</g, '\\3c ')
    .replace(/>/g, '\\3e ')
    // eslint-disable-next-line no-control-regex -- 剥离 CSS 文本中的控制字符，避免注入
    .replace(/[\u0000-\u001f]/g, '')
}

/** JS 字符串字面量转义（用于内联 onclick 等脚本上下文）。 */
export function escapeJsString(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
}

// 在 HTML style="..." 属性内、以单引号包裹的 url() 中不允许出现的字符
// 非 data 场景额外禁止分号/空白（防 CSS 声明注入）；data:image 允许 ; 与 ,（媒体类型/base64 语法）
const CSS_URL_FORBIDDEN = /["'()\\<>]/
const CSS_URL_FORBIDDEN_STRICT = /["'()\\;<>\s]/

/**
 * 生成 style 属性安全的 background-image: url(...) 片段。
 * - 协议白名单：http/https、data:image，拒绝 file:/javascript:/内网等
 * - 拒绝引号/括号/反斜杠/尖括号；非 data 场景额外拒绝分号与空白，避免 CSS 与 HTML 双重逃逸
 * - 失败时返回空串（不渲染背景图），保证不注入
 */
export function safeCssUrl(raw: string): string {
  const v = (raw ?? '').trim()
  if (!v) return ''
  const schemeMatch = v.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
  let isDataImage = false
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase()
    if (scheme === 'http' || scheme === 'https') {
      // ok
    } else if (scheme === 'data') {
      if (!/^data:image\//i.test(v)) return ''
      isDataImage = true
    } else {
      return '' // 拒绝 file:/javascript:/mailto: 等
    }
  }
  const forbidden = isDataImage ? CSS_URL_FORBIDDEN : CSS_URL_FORBIDDEN_STRICT
  if (forbidden.test(v)) return ''
  return `url('${v}')`
}

export function tagId(tag: string): string {
  return 'tag-' + tag.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
}

export function optimizeImages(html: string): string {
  let imageIndex = 0
  return html.replace(/<img\s+/g, (match) => {
    // 已有 loading 属性则跳过
    if (match.includes('loading=')) return match;
    // 前2张图片不使用 lazy loading（首屏内容）
    if (imageIndex < 2) {
      imageIndex++
      return '<img data-lightbox ';
    }
    imageIndex++
    return '<img loading="lazy" decoding="async" data-lightbox ';
  })
}

export { formatDate } from '../utils/date'

