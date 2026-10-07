/**
 * Canvas v2 主题系统
 *
 * 柔和质感色板（Apple Notes / Heptabase 风格）
 * 通过 CSS 变量注入，支持亮/暗色切换
 */

/** 亮色主题 CSS 变量 */
export const LIGHT_THEME = `
.tl-container, .canvas-v2-root {
  --cv-bg: #FFFFFF;
  --cv-card-bg: #F4F5F7;
  --cv-card-border: rgba(0, 0, 0, 0.08);
  --cv-card-border-selected: #7C8CFF;
  --cv-card-shadow: none;
  --cv-card-shadow-hover: none;
  --cv-card-shadow-selected: 0 0 0 1px #7C8CFF;
  --cv-accent: #7C8CFF;
  --cv-accent-soft: rgba(124, 140, 255, 0.12);
  --cv-text-main: #1F2937;
  --cv-text-secondary: #6B7280;
  --cv-text-tertiary: #9CA3AF;
  --cv-toolbar-bg: #FFFFFF;
  --cv-toolbar-border: rgba(0, 0, 0, 0.08);
  --cv-drawer-bg: #FFFFFF;
  --cv-overlay-bg: rgba(0, 0, 0, 0.4);
  --cv-hover-bg: rgba(0, 0, 0, 0.04);
  --cv-active-bg: rgba(124, 140, 255, 0.10);
  --cv-meta-bg: rgba(0, 0, 0, 0.03);

  /* ── 桌面原生设计 token（对齐 §18 基线：实心、发丝分隔、单一 accent、4/8/12 圆角、无玻璃/无辉光、扁平）── */
  --cv-radius-sm: 4px;
  --cv-radius-md: 8px;
  --cv-radius-lg: 12px;
  --cv-radius-xl: 12px;
  --cv-space-1: 8px;
  --cv-space-2: 12px;
  --cv-space-3: 16px;
  --cv-space-4: 24px;
  --cv-topbar-h: 52px;
  --cv-rail-w: 288px;
  --cv-bottombar-h: 46px;
  --cv-elev-1: none;
  --cv-elev-2: none;
  --cv-elev-3: none;
  --cv-elev-float: none;
  --cv-dot-grid: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px);
}
`

/** 暗色主题 CSS 变量 */
export const DARK_THEME = `
.tl-container, .canvas-v2-root {
  --cv-bg: #0D0F15;
  --cv-card-bg: #171A21;
  --cv-card-border: rgba(255, 255, 255, 0.08);
  --cv-card-border-selected: #7C8CFF;
  --cv-card-shadow: none;
  --cv-card-shadow-hover: none;
  --cv-card-shadow-selected: 0 0 0 1px #7C8CFF;
  --cv-accent: #7C8CFF;
  --cv-accent-soft: rgba(124, 140, 255, 0.16);
  --cv-text-main: #E5E7EB;
  --cv-text-secondary: #9CA3AF;
  --cv-text-tertiary: #6B7280;
  --cv-toolbar-bg: #171A21;
  --cv-toolbar-border: rgba(255, 255, 255, 0.08);
  --cv-drawer-bg: #171A21;
  --cv-overlay-bg: rgba(0, 0, 0, 0.5);
  --cv-hover-bg: rgba(255, 255, 255, 0.06);
  --cv-active-bg: rgba(124, 140, 255, 0.14);
  --cv-meta-bg: rgba(255, 255, 255, 0.04);

  /* ── 桌面原生设计 token（对齐 §18 基线）── */
  --cv-radius-sm: 4px;
  --cv-radius-md: 8px;
  --cv-radius-lg: 12px;
  --cv-radius-xl: 12px;
  --cv-space-1: 8px;
  --cv-space-2: 12px;
  --cv-space-3: 16px;
  --cv-space-4: 24px;
  --cv-topbar-h: 52px;
  --cv-rail-w: 288px;
  --cv-bottombar-h: 46px;
  --cv-elev-1: none;
  --cv-elev-2: none;
  --cv-elev-3: none;
  --cv-elev-float: none;
  --cv-dot-grid: radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
}
`

/**
 * 密度覆盖（阶段6 · 白板桌面化）
 *
 * 全局密度体系（阶段4/5 建立，广播到 <html data-density>）应让白板工具栏节奏联动，
 * 实现桌面全局一致。紧凑（默认）沿用上方 LIGHT/DARK 的既有 token；
 * 舒适模式在 .canvas-v2-root 范围内略放大栏高与间距，提升绘图呼吸感。
 * 随 injectCanvasTheme 一起注入，主题切换时不会被重设丢失。
 */
export const CANVAS_DENSITY_OVERRIDE = `
html[data-density="comfortable"] .canvas-v2-root {
  --cv-topbar-h: 56px;
  --cv-bottombar-h: 50px;
  --cv-space-1: 10px;
  --cv-space-2: 14px;
  --cv-space-3: 18px;
}
`

// ⚠️ 已移除 `html[data-density="comfortable"] .cv-pill-btn { height: 38px; … }`（2026-09-17）
//    原因：`.cv-pill-btn` 的**唯一定义处**曾是 `features/canvas-v2/components/canvas.css`，
//    而该文件从未被任何模块 import（孤儿文件，已随本轮 2.5-A 删除）。
//    同时 `canvas-v2/engine/*.tsx` 的 className 只有 `excalidraw-canvas-host` / `note-card-md`
//    → `.cv-pill-btn` **零 DOM 消费者**。定义与消费者双缺 ⇒ 这条规则是恒不生效的 no-op。
//    引擎迁移（tldraw → Excalidraw）后，子视图改走「内联 style + var(--cv-*)」，
//    class 驱动的按钮体系整体退役。若日后要重建顶栏按钮 class，**需同时更新守卫清单**
//    （`aurora/styles/deadCssPurge.test.ts` 的 `.cv-*` 回流项）。

/** 卡片色板（语义化颜色，用于标题渐变色带） */
export interface CardColorDef {
  name: string
  /** 英文名（双语数据伴生字段；UI 按语言取值，未门控时回退 name） */
  nameEn?: string
  from: string  // 渐变起点
  to: string    // 渐变终点
}

export const CARD_COLORS_V2: CardColorDef[] = [
  { name: '靛蓝', nameEn: 'Indigo', from: '#6366F1', to: '#6366F1' },
  { name: '翠绿', nameEn: 'Emerald', from: '#10B981', to: '#10B981' },
  { name: '琥珀', nameEn: 'Amber', from: '#F59E0B', to: '#F59E0B' },
  { name: '玫红', nameEn: 'Rose', from: '#EC4899', to: '#EC4899' },
  { name: '青蓝', nameEn: 'Cyan', from: '#06B6D4', to: '#06B6D4' },
  { name: '紫罗兰', nameEn: 'Violet', from: '#8B5CF6', to: '#8B5CF6' },
  { name: '石板', nameEn: 'Slate', from: '#64748B', to: '#64748B' },
  { name: '橙红', nameEn: 'Orange', from: '#F97316', to: '#F97316' },
]

/** 兼容 v1 的 hex 色板 */
export const CARD_COLORS_LEGACY = CARD_COLORS_V2.map(c => c.from)

/** 关系类型（连线标签） */
export interface RelationType {
  id: string
  name: string
  /** 英文名（双语数据伴生字段；关系推断匹配用 id，UI 展示按语言取值） */
  nameEn?: string
  color: string
  dash: 'solid' | 'dashed'
}

export const RELATION_TYPES: RelationType[] = [
  { id: 'ref', name: '引用', nameEn: 'Reference', color: '#6B7280', dash: 'solid' },
  { id: 'support', name: '支撑', nameEn: 'Support', color: '#10B981', dash: 'solid' },
  { id: 'refute', name: '反驳', nameEn: 'Refute', color: '#EF4444', dash: 'solid' },
  { id: 'derive', name: '衍生', nameEn: 'Derive', color: '#8B5CF6', dash: 'solid' },
  { id: 'relate', name: '关联', nameEn: 'Relate', color: '#06B6D4', dash: 'dashed' },
  { id: 'example', name: '示例', nameEn: 'Example', color: '#F59E0B', dash: 'dashed' },
]

/**
 * 相对时间格式化。
 *
 * 语言开关（与博客模板 `bl` 形参同范式）：默认中文（保持既有调用点不变），
 * 传 'en' 时输出英文。纯函数、无 React 依赖 —— 供引擎/HTML 字符串等非组件上下文复用。
 */
export function formatRelativeTime(timestamp: number, lang: 'zh' | 'en' = 'zh'): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (lang === 'en') {
    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} h ago`
    if (days < 30) return `${days} d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(timestamp).toLocaleDateString()
}

/** 主题注入：将 CSS 变量注入到 document head */
export function injectCanvasTheme(): void {
  const id = 'canvas-v2-theme'
  let style = document.getElementById(id) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = id
    document.head.appendChild(style)
  }
  const isDark = document.documentElement.dataset.theme === 'dark'
  style.textContent = (isDark ? DARK_THEME : LIGHT_THEME) + '\n' + CANVAS_DENSITY_OVERRIDE
}

/** 监听主题变化，自动更新 CSS 变量 */
export function watchThemeChange(callback?: () => void): () => void {
  const observer = new MutationObserver(() => {
    injectCanvasTheme()
    callback?.()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  injectCanvasTheme()
  return () => observer.disconnect()
}

/** 颜色样式定义（P2 C3：替代 tldraw DefaultColorStyle；setStyleForSelectedShapes 只需 style.id） */
export const DefaultColorStyle = { id: 'color', type: 'enum' } as const

/** 几何样式定义（P2 C3：替代 tldraw GeoShapeGeoStyle；setStyleForNextShapes 只需 style.id） */
export const GeoShapeGeoStyle = { id: 'geo', type: 'enum' } as const
