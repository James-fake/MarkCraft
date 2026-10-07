// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CommandPalette, type CommandItem } from './CommandPalette'

const sampleCommands: CommandItem[] = [
  { id: 'file.newFile', title: '新建笔记', group: 'file', action: vi.fn() },
  { id: 'file.save', title: '保存', group: 'file', action: vi.fn() },
  { id: 'view.togglePreview', title: '切换预览', group: 'view', action: vi.fn() },
  { id: 'view.toggleSidebar', title: '切换侧边栏', group: 'view', action: vi.fn() },
  { id: 'file.quickCapture', title: '快速记一笔', group: 'file', keywords: ['capture', 'quick', '记一笔', '速记', '灵感'], action: vi.fn() },
  { id: 'tools.openBlogStudio', title: '博客工作室', group: 'tools', action: vi.fn() },
]

describe('Aurora CommandPalette P0 修复烟雾测试', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('P0-2 分组标题中文化：渲染 CategoryLabels 中文而非英文 category', () => {
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} />)
    // 英文 category（file/view/tools）不应作为分组标题出现
    expect(screen.queryByText('file')).toBeNull()
    expect(screen.queryByText('view')).toBeNull()
    expect(screen.queryByText('tools')).toBeNull()
    // 中文分组标题应出现
    expect(screen.getByText('文件')).toBeTruthy()
    expect(screen.getByText('视图')).toBeTruthy()
    expect(screen.getByText('工具')).toBeTruthy()
  })

  it('P0-3 footer 提示唤起快捷键（⌘K / Ctrl+K）', () => {
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} />)
    const hint = screen.getByText(/唤起/)
    expect(hint).toBeTruthy()
    // 快捷键提示应为 ⌘K（Mac）或 Ctrl+K（其他平台），至少其一
    const kbd = hint.parentElement?.querySelector('kbd')?.textContent
    expect(kbd === '⌘K' || kbd === 'Ctrl+K').toBe(true)
  })

  it('P1-1 搜索全量 keywords：长尾关键字「速记」召回「快速记一笔」', () => {
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/搜索命令/) as HTMLInputElement
    // 模拟输入（受控组件直接 fireEvent.change）
    fireEvent.change(input, { target: { value: '速记' } })
    expect(screen.getByText('快速记一笔')).toBeTruthy()
    // 该命令标题「快速记一笔」含「快速」，不应仍展示无关命令「新建笔记」
    expect(screen.queryByText('新建笔记')).toBeNull()
  })

  it('P1-1 子序列容错（中文漏字）：输入「切栏」命中「切换侧边栏」', () => {
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/搜索命令/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '切栏' } })
    expect(screen.getByText('切换侧边栏')).toBeTruthy()
  })

  it('P2-1 最近使用置顶：空查询时展示「最近使用」分组', () => {
    localStorage.setItem('markcraft.command.recent', JSON.stringify(['file.save']))
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} />)
    expect(screen.getByText('最近使用')).toBeTruthy()
    expect(screen.getAllByText('保存').length).toBeGreaterThan(0)
  })

  it('P2-4 融合文件搜索：查询命中文件名时在「文件」分组展示', () => {
    const fileItems = [{ id: 'f1', name: '我的笔记.md', path: 'root' }]
    render(<CommandPalette open commands={sampleCommands} onClose={vi.fn()} fileItems={fileItems} />)
    const input = screen.getByPlaceholderText(/搜索命令/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '我的笔记' } })
    expect(screen.getByText('我的笔记.md')).toBeTruthy()
    expect(screen.getByText('文件')).toBeTruthy()
  })
})
