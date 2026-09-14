/**
 * 阶段8 密度联动回归测试
 * 验证知识库模块已消费全局密度广播（<html data-density="comfortable">），
 * 在 .kb-shell 范围内放大栏高、内边距与间距，与侧边栏/白板/编辑器节奏一致。
 *
 * 全局密度广播由 Sidebar 写入 document.documentElement（见 Sidebar.tsx），
 * 知识库通过 kb-ui.css 中的 CSS 选择器联动（与白板 CANVAS_DENSITY_OVERRIDE 同构）。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'kb-ui.css'), 'utf-8')

describe('知识库密度联动', () => {
  it('kb-ui.css 消费全局密度广播，在舒适模式放大 .kb-shell 间距', () => {
    expect(css).toContain('html[data-density="comfortable"] .kb-shell')
    // 关键节奏元素均被覆盖
    for (const sel of ['.kb-topbar', '.kb-nav', '.kb-nav-item', '.kb-content', '.kb-manage', '.kb-row', '.kb-btn', '.kb-icon-btn']) {
      expect(css).toContain(sel)
    }
  })

  it('舒适模式放大值为合理间距（非紧凑默认值）', () => {
    // 顶栏纵向内边距在舒适模式由 14px 放大到 18px
    expect(css).toContain('html[data-density="comfortable"] .kb-shell .kb-topbar { padding-top: 18px; padding-bottom: 18px; }')
    // 内容区舒适模式内边距大于紧凑（clamp 上限 38px > 30px）
    expect(css).toContain('html[data-density="comfortable"] .kb-shell .kb-content { padding: clamp(22px, 3vw, 38px); }')
  })
})
