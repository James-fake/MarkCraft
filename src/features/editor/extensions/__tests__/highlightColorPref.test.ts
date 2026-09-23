import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLastHighlightColor, persistLastHighlightColor } from '../highlightColorPref'
import { DEFAULT_HIGHLIGHT_COLOR } from '../highlightColors'

const SETTINGS_KEY = 'markcraft_settings'

/** 直接往 localStorage 里塞一份 settings（模拟「用户上次选过色」的持久态） */
function seedSettings(patch: Record<string, unknown>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

/**
 * 「记住上次高亮色」读写回归锁。
 *
 * 语义约定（三条入口共用）：只有**在调色板里显式挑色**才写回上次色；
 * 主按钮 / Ctrl+Shift+H / 右键菜单都只是「应用上次色」。
 * 因此这里的核心断言是：**非法存量值必须回退默认黄**，不能让脏数据落到
 * `setHighlight({ color: undefined })`（那会静默丢色）。
 */
describe('highlightColorPref 上次高亮色', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('getLastHighlightColor', () => {
    it('未存过任何设置时回退默认黄', () => {
      expect(getLastHighlightColor()).toBe(DEFAULT_HIGHLIGHT_COLOR)
    })

    it('存过合法色名时原样返回（记住上次颜色）', () => {
      seedSettings({ lastHighlightColor: 'red' })
      expect(getLastHighlightColor()).toBe('red')
    })

    it('支持新扩的全部 16 色往返', () => {
      for (const color of ['deep-orange', 'light-blue', 'deep-purple', 'light-green'] as const) {
        seedSettings({ lastHighlightColor: color })
        expect(getLastHighlightColor()).toBe(color)
      }
    })

    it('存量是旧版已废弃 / 拼错的色名 → 回退默认黄（而非返回脏值）', () => {
      for (const bad of ['grey', 'chartreuse', 'Yellow', '', 'RED']) {
        seedSettings({ lastHighlightColor: bad })
        expect(getLastHighlightColor(), bad).toBe(DEFAULT_HIGHLIGHT_COLOR)
      }
    })

    it('存量是非字符串（手改 localStorage 成数字/对象）→ 回退默认黄', () => {
      for (const bad of [42, null, {}, []]) {
        seedSettings({ lastHighlightColor: bad })
        expect(getLastHighlightColor(), String(bad)).toBe(DEFAULT_HIGHLIGHT_COLOR)
      }
    })

    it('localStorage 内容非法 JSON → 不抛异常，回退默认黄', () => {
      localStorage.setItem(SETTINGS_KEY, '{ 这不是 JSON')
      expect(() => getLastHighlightColor()).not.toThrow()
      expect(getLastHighlightColor()).toBe(DEFAULT_HIGHLIGHT_COLOR)
    })

    it('localStorage 读取抛异常（隐私模式）→ 兜底默认黄', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(() => getLastHighlightColor()).not.toThrow()
      expect(getLastHighlightColor()).toBe(DEFAULT_HIGHLIGHT_COLOR)
    })
  })

  describe('persistLastHighlightColor', () => {
    it('写入后 getLastHighlightColor 能立刻读回（同一数据源）', () => {
      persistLastHighlightColor('teal')
      expect(getLastHighlightColor()).toBe('teal')
    })

    it('写回的是 SettingsStore 的单一数据源 key（不另开 localStorage 键）', () => {
      persistLastHighlightColor('indigo')
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) as string)
      expect(raw.lastHighlightColor).toBe('indigo')
    })

    it('连续改色只保留最后一次（不累积）', () => {
      persistLastHighlightColor('red')
      persistLastHighlightColor('blue')
      persistLastHighlightColor('green')
      expect(getLastHighlightColor()).toBe('green')
    })

    it('不覆盖其它既有设置项', () => {
      seedSettings({ lastHighlightColor: 'yellow', editorMaxWidth: 900 })
      persistLastHighlightColor('pink')
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) as string)
      expect(raw.editorMaxWidth).toBe(900)
      expect(raw.lastHighlightColor).toBe('pink')
    })

    it('持久化抛异常（配额满）→ 静默失败、不打断交互', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => persistLastHighlightColor('red')).not.toThrow()
    })
  })
})
