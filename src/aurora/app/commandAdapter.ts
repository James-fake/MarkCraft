/**
 * 真实 CommandItem → Aurora CommandItem 适配器
 *
 * 真实 `commandRegistry` 的 `CommandItem` 用 `labelZh/labelEn/icon:string/category/keywords`，
 * Aurora `CommandPalette` 用 `id/title/description/icon:IconName/group/shortcut[]`。
 * 本适配器做字段映射 + 可见性过滤。
 *
 * 图标：真实 `icon` 已是名称字符串（如 'file'/'moon'），直接 as IconName 透传；
 * 若 Aurora `icons.tsx` 无该名，CommandPalette 内部 `Icon[item.icon]` 为 undefined → 渲染 null（安全降级）。
 */

import type { CommandItem as RealCommandItem } from '@services/command/commandRegistry'
import type { CommandItem as AuroraCommandItem } from '../components/command-palette/CommandPalette'
import { normalizeShortcutToken } from '@services/command/shortcutFormat'
import type { IconName } from '../types'

function parseShortcut(shortcut?: string): string[] | undefined {
  if (!shortcut) return undefined
  // 同时按 '+' 与空白拆分：'Ctrl+S' → ['Ctrl','S']，'G M'（两键序按和弦）→ ['G','M']。
  // token 再经 shortcutFormat 平台归一（Mac 'Ctrl'→'⌘'），catalog 原始字符串不变。
  return shortcut
    .split(/[+\s]+/)
    .map((s) => normalizeShortcutToken(s.trim()))
    .filter(Boolean)
}

export function adaptCommand(cmd: RealCommandItem): AuroraCommandItem {
  return {
    id: cmd.id,
    title: cmd.labelZh,
    description: [cmd.labelEn, ...cmd.keywords].join(' · '),
    icon: cmd.icon as IconName,
    group: cmd.category,
    keywords: cmd.keywords,
    shortcut: parseShortcut(cmd.shortcut),
    action: cmd.action,
  }
}

export function adaptCommands(cmds: RealCommandItem[]): AuroraCommandItem[] {
  return cmds
    .filter((cmd) => (cmd.visible ? cmd.visible() : true))
    .map(adaptCommand)
}
