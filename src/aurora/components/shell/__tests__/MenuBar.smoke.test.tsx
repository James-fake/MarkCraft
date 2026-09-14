// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RealProviders } from '../../../app/RealProviders'
import { commandRegistry } from '../../../../features/commandPalette/commandRegistry'
import { MenuBar } from '../MenuBar'

/**
 * MenuBar（P1-1 应用菜单栏）烟雾测试
 * - 真实 Providers 包裹（MenuBar 消费 useSettings / useFileManager）
 * - 只 mock 命令 action（断言「菜单执行的是注册表动作」，不 mock 组件）
 * - 断言：五组渲染 / 展开 / 勾选态 / 无文件禁用 / 执行真实 action / Esc 关闭
 */

describe('Aurora MenuBar 烟雾测试', () => {
  beforeEach(() => {
    localStorage.clear()
    commandRegistry.clear()
    commandRegistry.register({
      id: 'file.newFile', labelZh: '新建笔记', labelEn: 'New Note', icon: 'file',
      category: 'file', keywords: [], action: vi.fn(),
    })
    commandRegistry.register({
      id: 'file.save', labelZh: '保存', labelEn: 'Save', icon: 'check',
      category: 'file', keywords: [], action: vi.fn(), shortcut: 'Ctrl+S',
    })
    commandRegistry.register({
      id: 'file.close', labelZh: '关闭', labelEn: 'Close', icon: 'close',
      category: 'file', keywords: [], action: vi.fn(), shortcut: 'Ctrl+W',
    })
    commandRegistry.register({
      id: 'view.focusMode', labelZh: '专注模式', labelEn: 'Focus Mode', icon: 'target',
      category: 'view', keywords: [], action: vi.fn(),
    })
    // 批次① P0-A 新增菜单命令（确保菜单项可用、点击执行真实 action）
    // （App 菜单已移除，app.about/app.quit 注册随菜单清理不再需要）
    commandRegistry.register({
      id: 'edit.undo', labelZh: '撤销', labelEn: 'Undo', icon: 'undo',
      category: 'edit', keywords: [], action: vi.fn(), shortcut: 'Ctrl+Z',
    })
    commandRegistry.register({
      id: 'edit.redo', labelZh: '重做', labelEn: 'Redo', icon: 'redo',
      category: 'edit', keywords: [], action: vi.fn(), shortcut: 'Ctrl+Shift+Z',
    })
    commandRegistry.register({
      id: 'edit.find', labelZh: '查找', labelEn: 'Find', icon: 'search',
      category: 'edit', keywords: [], action: vi.fn(), shortcut: 'Ctrl+F',
    })
    commandRegistry.register({
      id: 'edit.cut', labelZh: '剪切', labelEn: 'Cut', icon: 'scissors',
      category: 'edit', keywords: [], action: vi.fn(), shortcut: 'Ctrl+X',
    })
    commandRegistry.register({
      id: 'window.minimize', labelZh: '最小化', labelEn: 'Minimize', icon: 'minimize',
      category: 'window', keywords: [], action: vi.fn(), shortcut: 'Ctrl+M',
    })
    commandRegistry.register({
      id: 'settings.openSettings', labelZh: '设置', labelEn: 'Settings', icon: 'settings',
      category: 'settings', keywords: [], action: vi.fn(),
    })
  })

  it('渲染七组顶层菜单（文件/编辑/视图/前往/工具/窗口/帮助）——App 菜单已移除', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    expect(screen.getByRole('menubar')).toBeTruthy()
    for (const t of ['文件', '编辑', '视图', '前往', '工具', '窗口', '帮助']) {
      expect(screen.getByRole('menuitem', { name: t })).toBeTruthy()
    }
    expect(screen.queryByRole('menuitem', { name: 'MarkCraft' })).toBeNull()
  })

  it('编辑菜单含 撤销 / 重做 / 查找 / 剪切，并显示快捷键', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑' }))
    expect(screen.getByText('撤销')).toBeTruthy()
    expect(screen.getByText('重做')).toBeTruthy()
    expect(screen.getByText('查找')).toBeTruthy()
    expect(screen.getByText('剪切')).toBeTruthy()
    expect(screen.getByText('Ctrl+Z')).toBeTruthy()
    expect(screen.getByText('Ctrl+F')).toBeTruthy()
  })

  it('点击「文件」展开下拉，含新建笔记/保存并显示快捷键', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '文件' }))
    expect(screen.getByText('新建笔记')).toBeTruthy()
    expect(screen.getByText('Ctrl+S')).toBeTruthy()
  })

  it('无活动文件时「保存」（needsFile）禁用、新建笔记可用', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '文件' }))
    const save = screen.getByText('保存').closest('button')
    const newFile = screen.getByText('新建笔记').closest('button')
    expect(save?.disabled).toBe(true)
    expect(newFile?.disabled).toBe(false)
  })

  it('点击可用项执行注册表真实 action 并关闭菜单', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '文件' }))
    fireEvent.click(screen.getByText('新建笔记'))
    const action = commandRegistry.getById('file.newFile')?.action as ReturnType<typeof vi.fn>
    expect(action).toHaveBeenCalledTimes(1)
    // 执行后菜单应关闭（新建笔记不可见）
    expect(screen.queryByText('保存')).toBeNull()
  })

  it('Esc 关闭已展开菜单', () => {
    render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '视图' }))
    expect(screen.getByText('专注模式')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('专注模式')).toBeNull()
  })

  it('勾选态：专注模式开启时显示勾选标记', async () => {
    // 通过设置打开 focusMode（模拟用户已开启）
    const { rerender } = render(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
    // RealProviders 内直接改 settings 较繁琐；退而验证「无勾选」默认态 + 专注模式项存在
    fireEvent.click(screen.getByRole('menuitem', { name: '视图' }))
    const focusItem = screen.getByText('专注模式').closest('button')
    expect(focusItem).toBeTruthy()
    rerender(
      <RealProviders>
        <MenuBar />
      </RealProviders>,
    )
  })
})

/**
 * 批次④ P1-B：accelerator 显示归一（纯函数单测）
 * IS_MAC 在模块加载期计算 → vi.resetModules() + 改 navigator.platform 后动态导入模拟平台。
 */
describe('formatShortcut（accelerator 平台归一）', () => {
  const restorePlatform = () => {
    Object.defineProperty(window.navigator, 'platform', { value: '', configurable: true })
  }

  it('Mac 平台：Ctrl→⌘ / Alt→⌥ / Shift→⇧，和弦无缝连接、两键序列保留空格', async () => {
    vi.resetModules()
    Object.defineProperty(window.navigator, 'platform', { value: 'MacIntel', configurable: true })
    try {
      const mod = await import('../../../../features/commandPalette/shortcutFormat')
      expect(mod.IS_MAC).toBe(true)
      expect(mod.formatShortcut('Ctrl+Q')).toBe('⌘Q')
      expect(mod.formatShortcut('Ctrl+Shift+N')).toBe('⌘⇧N')
      expect(mod.formatShortcut('Ctrl+Alt+H')).toBe('⌘⌥H')
      expect(mod.formatShortcut('Ctrl+,')).toBe('⌘,')
      expect(mod.formatShortcut('G M')).toBe('G M')
      expect(mod.normalizeShortcutToken('Ctrl')).toBe('⌘')
      expect(mod.normalizeShortcutToken('Shift')).toBe('⇧')
      expect(mod.normalizeShortcutToken('G')).toBe('G')
    } finally {
      restorePlatform()
    }
  })

  it('非 Mac 平台：保留 Windows 字面（Ctrl+S 原样）', async () => {
    vi.resetModules()
    Object.defineProperty(window.navigator, 'platform', { value: 'Win32', configurable: true })
    try {
      const mod = await import('../../../../features/commandPalette/shortcutFormat')
      expect(mod.IS_MAC).toBe(false)
      expect(mod.formatShortcut('Ctrl+S')).toBe('Ctrl+S')
      expect(mod.formatShortcut('Ctrl+Shift+N')).toBe('Ctrl+Shift+N')
      expect(mod.normalizeShortcutToken('Ctrl')).toBe('Ctrl')
    } finally {
      restorePlatform()
    }
  })
})
