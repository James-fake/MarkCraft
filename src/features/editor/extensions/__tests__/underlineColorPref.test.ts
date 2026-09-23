import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLastUnderlineColor, persistLastUnderlineColor } from '../underlineColorPref'
import { DEFAULT_UNDERLINE_COLOR } from '../underlineColors'

const SETTINGS_KEY = 'markcraft_settings'

/** 直接往 localStorage 里塞一份 settings（模拟「用户上次选过色」的持久态） */
function seedSettings(patch: Record<string, unknown>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

/**
 * 「记住上次下划线色」读写回归锁（与 highlightColorPref 同构）。
 *
 * 语义约定（三条入口共用）：只有**在调色板里显式挑色**才写回上次色；
 * 主按钮 / Ctrl+U / 右键菜单都只是「应用上次色」。
 * 核心断言：非法存量值必须回退 **'auto'（跟随正文）**——既不能返回脏值，
 * 也不能落到 `setMark('underline', { color: undefined })`（那会静默丢色）。
 */
describe('underlineColorPref 上次下划线色', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('getLastUnderlineColor', () => {
    it('未存过任何设置时回退 auto（跟随正文）', () => {
      expect(getLastUnderlineColor()).toBe(DEFAULT_UNDERLINE_COLOR)
      expect(getLastUnderlineColor()).toBe('auto')
    })

    it('存过合法色名时原样返回（记住上次颜色）', () => {
      seedSettings({ lastUnderlineColor: 'red' })
      expect(getLastUnderlineColor()).toBe('red')
    })

    it("显式存过 'auto' 时返回 'auto'（用户主动切回「跟随正文」也要记住）", () => {
      seedSettings({ lastUnderlineColor: 'auto' })
      expect(getLastUnderlineColor()).toBe('auto')
    })

    it('支持 16 色中的连字符色名往返', () => {
      for (const color of ['deep-orange', 'light-blue', 'deep-purple', 'light-green'] as const) {
        seedSettings({ lastUnderlineColor: color })
        expect(getLastUnderlineColor()).toBe(color)
      }
    })

    it('存量是旧版已废弃 / 拼错的色名 → 回退 auto（而非返回脏值）', () => {
      for (const bad of ['grey', 'Auto', 'AUTO', 'underline', '', 'RED']) {
        seedSettings({ lastUnderlineColor: bad })
        expect(getLastUnderlineColor(), bad).toBe(DEFAULT_UNDERLINE_COLOR)
      }
    })

    it('存量是非字符串（手改 localStorage 成数字/对象）→ 回退 auto', () => {
      for (const bad of [42, null, {}, []]) {
        seedSettings({ lastUnderlineColor: bad })
        expect(getLastUnderlineColor(), String(bad)).toBe(DEFAULT_UNDERLINE_COLOR)
      }
    })

    it('localStorage 内容非法 JSON → 不抛异常，回退 auto', () => {
      localStorage.setItem(SETTINGS_KEY, '{ 这不是 JSON')
      expect(() => getLastUnderlineColor()).not.toThrow()
      expect(getLastUnderlineColor()).toBe(DEFAULT_UNDERLINE_COLOR)
    })

    it('localStorage 读取抛异常（隐私模式）→ 兜底 auto', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(() => getLastUnderlineColor()).not.toThrow()
      expect(getLastUnderlineColor()).toBe(DEFAULT_UNDERLINE_COLOR)
    })
  })

  describe('persistLastUnderlineColor', () => {
    it('写入后 getLastUnderlineColor 能立刻读回（同一数据源）', () => {
      persistLastUnderlineColor('teal')
      expect(getLastUnderlineColor()).toBe('teal')
    })

    it('写回的是 SettingsStore 的单一数据源 key（不另开 localStorage 键）', () => {
      persistLastUnderlineColor('indigo')
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) as string)
      expect(raw.lastUnderlineColor).toBe('indigo')
    })

    it('连续改色只保留最后一次（不累积）', () => {
      persistLastUnderlineColor('red')
      persistLastUnderlineColor('blue')
      persistLastUnderlineColor('green')
      expect(getLastUnderlineColor()).toBe('green')
    })

    it('可以写回 auto（切回「跟随正文」）', () => {
      persistLastUnderlineColor('pink')
      persistLastUnderlineColor('auto')
      expect(getLastUnderlineColor()).toBe('auto')
    })

    it('不覆盖其它既有设置项（含高亮的上次色）', () => {
      seedSettings({ lastHighlightColor: 'yellow', editorMaxWidth: 900 })
      persistLastUnderlineColor('pink')
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) as string)
      expect(raw.editorMaxWidth).toBe(900)
      expect(raw.lastHighlightColor).toBe('yellow')
      expect(raw.lastUnderlineColor).toBe('pink')
    })

    it('持久化抛异常（配额满）→ 静默失败、不打断交互', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => persistLastUnderlineColor('red')).not.toThrow()
    })
  })
})
