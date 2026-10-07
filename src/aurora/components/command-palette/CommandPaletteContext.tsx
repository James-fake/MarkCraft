/**
 * 命令面板上下文（P2-3 跨视图状态栏入口一致）。
 *
 * 将「唤起命令面板」能力上提为共享 context，避免逐面板 prop drilling。
 * AuroraShell 在 ShellInner 内提供实现（`() => setCommandOpen(true)`）；
 * 各视图状态栏统一渲染「⌘K 命令面板」项并消费本 context。
 */
import { createContext, useContext } from 'react'

export interface CommandPaletteContextValue {
  openCommandPalette: () => void
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  openCommandPalette: () => {},
})

export const useCommandPalette = () => useContext(CommandPaletteContext)
