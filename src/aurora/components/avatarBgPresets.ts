/**
 * 头像背景预设（与组件分离，避免破坏 Fast Refresh 的「文件只导出组件」约束）。
 *
 * 全部为中深色，保证白色表情 / 首字母清晰 —— 见 UserProfileStore 的
 * `resolveAvatarForeground`：只有 #rrggbb 纯色会做亮度反转，渐变一律白字。
 * 想要任意颜色请用选择器里的原生取色器；这里只提供「搭配好的」成品，降低选择成本。
 */
export interface AvatarBgPreset {
  /** '' 表示回到默认品牌渐变 */
  value: string
  zh: string
  en: string
}

export const AVATAR_BG_PRESETS: AvatarBgPreset[] = [
  { value: '', zh: '品牌渐变', en: 'Brand' },
  { value: 'linear-gradient(135deg, #3B6EF6 0%, #5B8DEF 100%)', zh: '晴空蓝', en: 'Sky' },
  { value: 'linear-gradient(135deg, #7448E8 0%, #A46BF5 100%)', zh: '暮光紫', en: 'Twilight' },
  { value: 'linear-gradient(135deg, #1F8A8A 0%, #33A9A0 100%)', zh: '薄荷青', en: 'Mint' },
  { value: 'linear-gradient(135deg, #2E8B57 0%, #4BAE79 100%)', zh: '森野绿', en: 'Forest' },
  { value: 'linear-gradient(135deg, #C2455E 0%, #DD6E6E 100%)', zh: '落日红', en: 'Sunset' },
  { value: 'linear-gradient(135deg, #B84A88 0%, #D972A6 100%)', zh: '樱粉', en: 'Blossom' },
  { value: 'linear-gradient(135deg, #B96A24 0%, #DC9A3B 100%)', zh: '琥珀橙', en: 'Amber' },
  { value: 'linear-gradient(135deg, #36435E 0%, #5A6B8C 100%)', zh: '石板灰', en: 'Slate' },
  { value: 'linear-gradient(135deg, #1F2637 0%, #3B4763 100%)', zh: '深夜', en: 'Midnight' },
]
