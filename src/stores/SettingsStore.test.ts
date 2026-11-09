import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings } from './SettingsStore'

const SETTINGS_KEY = 'markcraft_settings'

beforeEach(() => {
  localStorage.clear()
})

describe('SettingsStore · 默认主题', () => {
  it('首次运行默认「跟随系统」，而非固定深色', () => {
    // 用户明确要求默认跟随系统（浅色系统→浅色，深色系统→深色），
    // 老用户已显式存的 'dark'/'light' 不会被覆盖（走 loadSettings 合并逻辑）。
    expect(DEFAULT_SETTINGS.theme).toBe('system')
  })

  it('新用户（无存储）→ system（跟随系统）', () => {
    expect(loadSettings().theme).toBe('system')
  })

  it('老用户（有存储但缺 theme 字段）→ 一次性迁移为显式 dark（修复前被切到 system）', () => {
    // 旧版本默认 'dark'，但从未把 theme 写进 JSON 的老数据（更早版本 / 手工精简过的配置）
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ fontSize: 16, spellCheck: true }))

    const settings = loadSettings()
    expect(settings.theme).toBe('dark')
    // 其他字段照旧合并且不丢
    expect(settings.fontSize).toBe(16)
    expect(settings.spellCheck).toBe(true)
    // 一次性：迁移结果必须落盘，否则下次加载又会退回 system
    const persisted = JSON.parse(localStorage.getItem(SETTINGS_KEY) as string) as { theme?: string }
    expect(persisted.theme).toBe('dark')
  })

  it('已显式存过 theme 的用户 → 原值保留（迁移不误伤）', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'light' }))
    expect(loadSettings().theme).toBe('light')

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'system' }))
    expect(loadSettings().theme).toBe('system')
  })

  it('theme 字段类型非法（null）→ 同样迁移为 dark，避免空主题 id', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: null }))
    expect(loadSettings().theme).toBe('dark')
  })
})
