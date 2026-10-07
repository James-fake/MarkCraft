/**
 * CSS 条件生效范围包裹器
 * 将 CSS 规则的选择器加上父级作用域前缀，实现"仅在特定页面生效"
 */

export type CssScope = 'global' | 'homepage' | 'post' | 'archive' | 'tags' | 'custom'

export interface ScopeOption {
  key: CssScope
  zh: string
  en: string
  zhDesc: string
  enDesc: string
  /** 包裹父选择器（scope 为 'custom' 时由用户输入） */
  parentSelector?: string
}

/** 预定义的作用域选项 */
export const SCOPE_OPTIONS: ScopeOption[] = [
  { key: 'global', zh: '全局', en: 'Global', zhDesc: '所有页面生效', enDesc: 'Applies to all pages', parentSelector: '' },
  { key: 'homepage', zh: '仅首页', en: 'Home page', zhDesc: '仅在首页生效', enDesc: 'Applies to the home page only', parentSelector: '#page-index' },
  { key: 'post', zh: '文章页', en: 'Post page', zhDesc: '仅在文章详情页生效', enDesc: 'Applies to post detail pages only', parentSelector: '[data-section="post"]' },
  { key: 'archive', zh: '归档页', en: 'Archive page', zhDesc: '仅在归档页生效', enDesc: 'Applies to the archive page only', parentSelector: '#page-archive' },
  { key: 'tags', zh: '标签页', en: 'Tags page', zhDesc: '仅在标签页生效', enDesc: 'Applies to the tags page only', parentSelector: '#page-tags' },
]

/**
 * 将 CSS 规则包裹在指定的作用域选择器下
 * 例如：.tag { color: red; } + #page-index → #page-index .tag { color: red; }
 *
 * @param css 原始 CSS
 * @param scope 作用域类型
 * @param customSelector 自定义选择器（scope 为 'custom' 时使用）
 * @returns 包裹后的 CSS
 */
export function applyScope(css: string, scope: CssScope, customSelector?: string): string {
  if (!css || !css.trim()) return css
  if (scope === 'global') return css

  let parentSelector = ''
  if (scope === 'custom') {
    parentSelector = customSelector?.trim() || ''
    if (!parentSelector) return css
  } else {
    const option = SCOPE_OPTIONS.find(o => o.key === scope)
    parentSelector = option?.parentSelector || ''
    if (!parentSelector) return css
  }

  // 解析 CSS 规则，为每个选择器添加父级前缀
  // 处理 @media 块：内部规则也需要包裹
  return wrapCssRules(css, parentSelector)
}

/**
 * 将 CSS 中的每个规则选择器加上父级前缀
 */
function wrapCssRules(css: string, parentSelector: string): string {
  let result = css

  // 处理 @media 块
  result = result.replace(/@media\s+([^{]+)\{([\s\S]*?)\}/g, (_match, condition, body) => {
    return `@media ${condition}{\n${wrapCssRules(body, parentSelector)}\n}`
  })

  // 处理 @keyframes — 不包裹内部百分比选择器
  result = result.replace(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\}/g, (match) => {
    return match // 保持原样，不包裹
  })

  // 处理普通规则：选择器 { ... }
  // 匹配模式：选择器列表（不含 @规则开头）后跟 { 属性 }
  result = result.replace(/(^|})(\s*)([^@{}]+?)\{/g, (_match, prefix, ws, selectorPart) => {
    const selectors = selectorPart.split(',').map((s: string) => s.trim()).filter((s: string) => s)

    const wrappedSelectors = selectors.map((sel: string) => {
      // 跳过 @ 规则、keyframes 百分比、已包裹的
      if (sel.startsWith('@')) return sel
      if (/^\d+%$/.test(sel)) return sel
      if (sel.startsWith(parentSelector)) return sel
      // :root 特殊处理 — 替换为父选择器
      if (sel === ':root') return parentSelector
      return `${parentSelector} ${sel}`
    }).join(', ')

    return `${prefix}${ws}${wrappedSelectors}{`
  })

  return result
}
