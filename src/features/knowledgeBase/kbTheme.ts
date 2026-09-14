/**
 * 知识库 UI 主题常量
 * 所有颜色通过 CSS 变量适配深色/浅色模式
 */

/** 知识库主色调
 * 统一引用 --kb-* 语义 token；由 .kb-shell 映射到玻璃风 --cv-*，
 * 由 .aurora-kb 映射到 Aurora 桌面 --mc-*，实现一套组件两套皮肤。
 */
export const KB_COLORS = {
  primary: 'var(--kb-primary, #3b82f6)',
  primaryLight: 'var(--kb-primary-light, #dbeafe)',
  primaryDark: 'var(--kb-primary-dark, #1e40af)',
  success: 'var(--kb-success, #10b981)',
  warning: 'var(--kb-warning, #f59e0b)',
  danger: 'var(--kb-danger, #ef4444)',
  bg: 'var(--kb-bg, #ffffff)',
  bgCard: 'var(--kb-bg-card, #f8fafc)',
  bgHover: 'var(--kb-bg-hover, #f1f5f9)',
  textMain: 'var(--kb-text-main, #1e293b)',
  textSecondary: 'var(--kb-text-secondary, #64748b)',
  textTertiary: 'var(--kb-text-tertiary, #94a3b8)',
  border: 'var(--kb-border, #e2e8f0)',
  accent: 'var(--kb-accent, #3b82f6)',
  // 状态色
  successBg: 'var(--kb-success-bg, #d1fae5)',
  successText: 'var(--kb-success-text, #065f46)',
  dangerBg: 'var(--kb-danger-bg, #fee2e2)',
  dangerText: 'var(--kb-danger-text, #991b1b)',
  warningBg: 'var(--kb-warning-bg, #fef3c7)',
  warningText: 'var(--kb-warning-text, #92400e)',
  highlight: 'var(--kb-highlight, #fef08a)',
  // 通用
  onPrimary: 'var(--kb-on-primary, #ffffff)',
  mask: 'var(--kb-mask, rgba(0, 0, 0, 0.55))',
  shadow: 'var(--kb-shadow, rgba(0, 0, 0, 0.1))',
} as const

/** 统计卡片颜色（使用 CSS 变量适配深色模式） */
export const KB_STAT_COLORS = [
  { bg: 'var(--kb-primary-light, #dbeafe)', text: 'var(--kb-primary-dark, #1e40af)', icon: '' },
  { bg: 'var(--kb-danger-bg, #fce7f3)', text: 'var(--kb-danger-text, #9f1239)', icon: '' },
  { bg: 'var(--kb-success-bg, #d1fae5)', text: 'var(--kb-success-text, #065f46)', icon: '#' },
  { bg: 'var(--kb-warning-bg, #fef3c7)', text: 'var(--kb-warning-text, #92400e)', icon: '' },
  { bg: 'var(--kb-primary-light, #e0e7ff)', text: 'var(--kb-primary-dark, #3730a3)', icon: '' },
  { bg: 'var(--kb-danger-bg, #f3e8ff)', text: 'var(--kb-danger-text, #6b21a8)', icon: '' },
] as const

/** 知识库卡片渐变背景（保持渐变效果，深浅模式通用） */
export const KB_CARD_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
] as const

/** 获取知识库卡片的渐变色（基于 id 稳定取色） */
export function getKbGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return KB_CARD_GRADIENTS[Math.abs(hash) % KB_CARD_GRADIENTS.length]
}
