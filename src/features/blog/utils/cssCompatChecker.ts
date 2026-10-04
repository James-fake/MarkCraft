/**
 * CSS 兼容性检查器 — 检测需要浏览器前缀的属性和兼容性有限的新特性
 * 数据基于 Can I Use 简化版
 */

/** 兼容性问题类型 */
export type CompatIssueType = 'prefix_needed' | 'low_support' | 'experimental'

/** 兼容性问题 */
export interface CompatIssue {
  line: number
  property: string
  type: CompatIssueType
  detail: string
  suggestion?: string
  browsers?: { ie: string; firefox: string; chrome: string; safari: string }
}

/** 检查 CSS 兼容性时返回的用户可见文案（可被调用方以目标语言覆盖） */
export interface CssCompatMessages {
  /** 建议添加前缀模板（{prefixes} = 形如 -webkit-backdrop-filter 的逗号分隔列表） */
  prefixSuggestion: string
  /** 按特性 property 键入的本地化描述 */
  details: Record<string, string>
}

export const DEFAULT_CSS_COMPAT_MESSAGES: CssCompatMessages = {
  prefixSuggestion: '建议添加浏览器前缀: {prefixes}',
  details: {
    ':has()': '较新的 CSS 选择器，旧浏览器不支持',
    '@scope': '实验性特性，仅 Chrome 118+ 支持',
    'color-mix()': '较新的 CSS 颜色函数',
    'container-type': '容器查询，较新特性',
    ':is()': '较新的选择器函数',
    ':where()': '较新的选择器函数（零优先级）',
    'aspect-ratio': '宽高比属性，较新',
    'gap (flex)': 'Flex 布局中的 gap 在旧 Safari 中不支持',
    'text-wrap: balance': '文本平衡换行，非常新的特性',
    '@property': 'CSS 属性注册，较新',
    '@layer': 'CSS 层叠层，较新',
    ':nth-child() of': '带 of 的 nth-child 语法，较新',
  },
}

/** 需要浏览器前缀的属性 */
const PREFIX_NEEDED: Record<string, string[]> = {
  'backdrop-filter': ['-webkit-'],
  'user-select': ['-webkit-', '-moz-'],
  'appearance': ['-webkit-', '-moz-'],
  'clip-path': ['-webkit-'],
  'text-fill-color': ['-webkit-'],
  'background-clip': ['-webkit-'],
  'hyphens': ['-webkit-', '-ms-'],
  'tab-size': ['-moz-'],
  'text-size-adjust': ['-webkit-', '-moz-'],
  'scroll-snap-type': ['-webkit-'],
  'scroll-snap-align': ['-webkit-'],
  'font-feature-settings': ['-webkit-'],
  'mask': ['-webkit-'],
  'mask-image': ['-webkit-'],
  'filter': ['-webkit-'],
  'writing-mode': ['-webkit-', '-ms-'],
  'text-orientation': ['-webkit-'],
  'box-decoration-break': ['-webkit-'],
  'line-clamp': ['-webkit-'],
  'text-stroke': ['-webkit-'],
  'column-count': ['-webkit-'],
  'column-gap': ['-webkit-'],
  'column-rule': ['-webkit-'],
}

/** 兼容性有限的 CSS 特性（选择器/函数/规则） */
const LOW_SUPPORT_FEATURES: Array<{
  pattern: RegExp
  property: string
  detail: string
  browsers: { ie: string; firefox: string; chrome: string; safari: string }
  type: CompatIssueType
}> = [
  {
    pattern: /:has\s*\(/,
    property: ':has()',
    detail: '较新的 CSS 选择器，旧浏览器不支持',
    browsers: { ie: '❌', firefox: '103+', chrome: '105+', safari: '15.4+' },
    type: 'low_support',
  },
  {
    pattern: /@scope/,
    property: '@scope',
    detail: '实验性特性，仅 Chrome 118+ 支持',
    browsers: { ie: '❌', firefox: '❌', chrome: '118+', safari: '❌' },
    type: 'experimental',
  },
  {
    pattern: /color-mix\s*\(/,
    property: 'color-mix()',
    detail: '较新的 CSS 颜色函数',
    browsers: { ie: '❌', firefox: '113+', chrome: '111+', safari: '16.2+' },
    type: 'low_support',
  },
  {
    pattern: /container-type\s*:/,
    property: 'container-type',
    detail: '容器查询，较新特性',
    browsers: { ie: '❌', firefox: '110+', chrome: '106+', safari: '16+' },
    type: 'low_support',
  },
  {
    pattern: /:is\s*\(/,
    property: ':is()',
    detail: '较新的选择器函数',
    browsers: { ie: '❌', firefox: '78+', chrome: '88+', safari: '14+' },
    type: 'low_support',
  },
  {
    pattern: /:where\s*\(/,
    property: ':where()',
    detail: '较新的选择器函数（零优先级）',
    browsers: { ie: '❌', firefox: '78+', chrome: '88+', safari: '14+' },
    type: 'low_support',
  },
  {
    pattern: /aspect-ratio\s*:/,
    property: 'aspect-ratio',
    detail: '宽高比属性，较新',
    browsers: { ie: '❌', firefox: '89+', chrome: '88+', safari: '15+' },
    type: 'low_support',
  },
  {
    pattern: /gap\s*:/,
    property: 'gap (flex)',
    detail: 'Flex 布局中的 gap 在旧 Safari 中不支持',
    browsers: { ie: '❌', firefox: '63+', chrome: '84+', safari: '14.1+' },
    type: 'low_support',
  },
  {
    pattern: /text-wrap\s*:\s*balance/,
    property: 'text-wrap: balance',
    detail: '文本平衡换行，非常新的特性',
    browsers: { ie: '❌', firefox: '❌', chrome: '114+', safari: '17.5+' },
    type: 'experimental',
  },
  {
    pattern: /@property\s+/,
    property: '@property',
    detail: 'CSS 属性注册，较新',
    browsers: { ie: '❌', firefox: '128+', chrome: '85+', safari: '16.4+' },
    type: 'low_support',
  },
  {
    pattern: /@layer\s+/,
    property: '@layer',
    detail: 'CSS 层叠层，较新',
    browsers: { ie: '❌', firefox: '97+', chrome: '99+', safari: '15.4+' },
    type: 'low_support',
  },
  {
    pattern: /:nth-child\s*\(\s*[^)]*of/,
    property: ':nth-child() of',
    detail: '带 of 的 nth-child 语法，较新',
    browsers: { ie: '❌', firefox: '113+', chrome: '111+', safari: '9+' },
    type: 'low_support',
  },
]

/**
 * 检查 CSS 代码的浏览器兼容性
 * @param css CSS 字符串
 * @returns 兼容性问题列表
 */
export function checkCssCompat(
  css: string,
  messages: CssCompatMessages = DEFAULT_CSS_COMPAT_MESSAGES,
): CompatIssue[] {
  if (!css || !css.trim()) return []
  const issues: CompatIssue[] = []
  const lines = css.split('\n')

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    // 跳过注释行和空行
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('//')) return

    // 1. 检查需前缀属性
    for (const [prop, prefixes] of Object.entries(PREFIX_NEEDED)) {
      const propRegex = new RegExp(`(^|[^a-zA-Z-])${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i')
      if (propRegex.test(trimmed) && !trimmed.includes(`-webkit-${prop}`) && !trimmed.includes(`-moz-${prop}`)) {
        issues.push({
          line: i + 1,
          property: prop,
          type: 'prefix_needed',
          detail: messages.prefixSuggestion.replace('{prefixes}', prefixes.map(p => p + prop).join(', ')),
          suggestion: prefixes.map(p => p + prop).join('; '),
        })
      }
    }

    // 2. 检查兼容性有限的特性
    for (const feature of LOW_SUPPORT_FEATURES) {
      if (feature.pattern.test(trimmed)) {
        issues.push({
          line: i + 1,
          property: feature.property,
          type: feature.type,
          detail: messages.details[feature.property] ?? feature.detail,
          browsers: feature.browsers,
        })
      }
    }
  })

  return issues
}
