import { describe, it, expect } from 'vitest'
import { DEFAULT_BINDINGS } from './ShortcutManager'

/**
 * 守卫：绑定表内不允许出现重复键位。
 *
 * 真实事故（2026-11-02 修复）：`format.strike` 与 `file.saveAs` 的 defaultKey
 * 都是 `Mod+Shift+s` —— 编辑器内按 Ctrl+Shift+S 时 Tiptap Strike 加删除线、
 * 全局 useKeyboardShortcuts 同时弹「另存为」，两个动作一起发生。
 * 修复后删除线 = Mod+Shift+x；此测试锁死「表内无重复」，同类冲突不再溜进来。
 */
describe('ShortcutManager 绑定表守卫', () => {
  it('defaultKey 在表内无重复', () => {
    const keys = DEFAULT_BINDINGS.map((b) => b.defaultKey)
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i)
    expect(duplicates).toEqual([])
  })

  it('format.strike = Mod+Shift+x（让位给另存为的回归锁）', () => {
    const strike = DEFAULT_BINDINGS.find((b) => b.id === 'format.strike')
    expect(strike?.defaultKey).toBe('Mod+Shift+x')
  })

  it('format.subscript = Mod+Shift+,（让位给设置的回归锁）', () => {
    const sub = DEFAULT_BINDINGS.find((b) => b.id === 'format.subscript')
    expect(sub?.defaultKey).toBe('Mod+Shift+,')
  })

  it('链接不声明快捷键（Ctrl+K 实际是命令面板，此前 tooltip 虚假声明已删）', () => {
    expect(DEFAULT_BINDINGS.find((b) => b.id === 'format.link')).toBeUndefined()
    expect(DEFAULT_BINDINGS.find((b) => b.id === 'insert.link')).toBeUndefined()
  })

  it('file.saveAs 保持 Mod+Shift+s（与内置文档/命令面板/右键菜单声明一致）', () => {
    const saveAs = DEFAULT_BINDINGS.find((b) => b.id === 'file.saveAs')
    expect(saveAs?.defaultKey).toBe('Mod+Shift+s')
  })

  it('view.settings 保持 Mod+,（下标已让位，不再冲突）', () => {
    const settings = DEFAULT_BINDINGS.find((b) => b.id === 'view.settings')
    expect(settings?.defaultKey).toBe('Mod+,')
  })
})
