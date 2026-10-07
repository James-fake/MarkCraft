import { useEffect, useState } from 'react'

/**
 * 全局密度类型。
 * - compact：默认紧凑（侧边栏/工具栏/面板等基础间距基线）
 * - comfortable：舒适（放大行高、内边距与间距）
 */
export type Density = 'compact' | 'comfortable'

/** 密度广播写入的属性名（与 Sidebar.tsx 一致） */
export const DENSITY_ATTR = 'data-density'

/** 默认密度（无法读取 DOM 时） */
export const DEFAULT_DENSITY: Density = 'compact'

/** 舒适模式相对紧凑模式的间距放大系数 */
export const COMFORTABLE_SCALE = 1.25

function readDensity(): Density {
  if (typeof document === 'undefined') return DEFAULT_DENSITY
  const v = document.documentElement.getAttribute(DENSITY_ATTR)
  return v === 'comfortable' ? 'comfortable' : 'compact'
}

/**
 * 读取并订阅全局密度广播（由 Sidebar 写入 <html data-density>）。
 *
 * 适用场景：纯内联样式组件（BlogStudio 等）。因为内联样式优先级高于 CSS，
 * html[data-density="comfortable"] 选择器无法覆盖内联间距，因此必须由 JS 主动读取并缩放。
 * 与白板（canvasTheme CSS 选择器）、知识库（kb-ui.css 选择器）、编辑器（tiptap.css）同构，
 * 共享同一广播源，零架构风险。
 */
export function useDensity(): Density {
  const [density, setDensity] = useState<Density>(readDensity)

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => {
      setDensity(readDensity())
    })
    observer.observe(el, { attributes: true, attributeFilter: [DENSITY_ATTR] })
    // 挂载时再同步一次，防止与 DOM 当前值不一致（如首屏未触发 mutation）
    setDensity(readDensity())
    return () => observer.disconnect()
  }, [])

  return density
}

/**
 * 缩放基础间距：舒适模式按 COMFORTABLE_SCALE 放大并取整，紧凑模式返回原值。
 * 纯函数，便于单测与复用。
 */
export function scaleGap(base: number, density: Density): number {
  return density === 'comfortable' ? Math.round(base * COMFORTABLE_SCALE) : base
}
