import { describe, it, expect, beforeEach } from 'vitest'
import {
  LIGHT_THEME,
  DARK_THEME,
  CANVAS_DENSITY_OVERRIDE,
  injectCanvasTheme,
} from './canvasTheme'

describe('白板主题系统（canvas-v2）', () => {
  beforeEach(() => {
    // 清理注入的 style 标签，避免跨用例污染
    const prev = document.getElementById('canvas-v2-theme')
    if (prev) prev.remove()
  })

  it('亮/暗主题均定义关键布局变量（未被破坏）', () => {
    for (const theme of [LIGHT_THEME, DARK_THEME]) {
      expect(theme).toContain('--cv-topbar-h')
      expect(theme).toContain('--cv-bottombar-h')
      expect(theme).toContain('--cv-space-1')
    }
  })

  it('密度覆盖仅放大舒适模式：含 comfortable 与放大后的栏高', () => {
    expect(CANVAS_DENSITY_OVERRIDE).toContain('data-density="comfortable"')
    expect(CANVAS_DENSITY_OVERRIDE).toContain('--cv-topbar-h: 56px')
    expect(CANVAS_DENSITY_OVERRIDE).toContain('--cv-bottombar-h: 50px')
    // 紧凑模式不覆盖（沿用默认），不应出现 compact 关键字
    expect(CANVAS_DENSITY_OVERRIDE).not.toContain('compact')
  })

  it('injectCanvasTheme 把密度覆盖一并注入到 .canvas-v2-root 作用域', () => {
    injectCanvasTheme()
    const style = document.getElementById('canvas-v2-theme') as HTMLStyleElement
    expect(style).toBeTruthy()
    expect(style.textContent).toContain('--cv-bg') // 基础主题已注入
    expect(style.textContent).toContain('data-density="comfortable"') // 密度联动已注入
    expect(style.textContent).toContain('html[data-density="comfortable"] .canvas-v2-root')
    // 密度覆盖曾同时含一条 `.cv-pill-btn { height: 38px }` —— 该类的唯一定义处是
    // 孤儿文件 components/canvas.css（0 import），消费者也缺席 ⇒ 恒不生效，已于 2.5-A 移除。
    expect(style.textContent).not.toContain('.cv-pill-btn')
  })
})
