/**
 * 快捷键显示归一（D4 单一数据源 · 批次④ P1-B）
 *
 * catalog 中 shortcut 统一以 Windows 字面记录（如 'Ctrl+S'，单一写法），
 * 显示层按平台归一：Mac（HIG 惯例）→ ⌘/⌥/⇧/⌃ 符号；Windows/Linux 保留字面。
 *
 * 纪律：本模块**仅作显示**，绝不参与真实键位判定——实际拦截统一在
 * useKeyboardShortcuts 以 metaKey/ctrlKey 跨平台判定（批次②）。
 *
 * 消费方：
 * - `MenuBar.tsx`：下拉右端 accelerator 整串渲染（formatShortcut）；
 * - `commandAdapter.ts`：命令面板按 key-cap token 渲染（normalizeShortcutToken）。
 */

/** Mac 修饰键符号映射（macOS HIG Menu Bar 惯例） */
const MAC_SYMBOLS: Record<string, string> = {
  Ctrl: '⌘',
  Meta: '⌘',
  Cmd: '⌘',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Control: '⌃',
}

/** Mac / iOS 平台判定（模块加载期一次性计算；jsdom 等测试环境缺省非 Mac） */
export const IS_MAC =
  typeof navigator !== 'undefined' &&
  (/Mac|iP(hone|ad|od)/.test(navigator.platform || '') ||
    /Mac/.test(navigator.userAgent || ''))

/** 单个键 token 归一（命令面板 key-cap 渲染用）：'Ctrl'→'⌘'，普通键原样 */
export function normalizeShortcutToken(token: string): string {
  if (!IS_MAC) return token
  return MAC_SYMBOLS[token] ?? token
}

/**
 * 整串 shortcut 归一（菜单栏 accelerator 渲染用）：
 * - 'Ctrl+Shift+N' → Mac '⌘⇧N'（和弦内修饰符无缝连接，macOS 惯例）/ Win 原样；
 * - 'G M' 两键序列 → 'G M'（按空格分组的序列不误伤）；
 * - 'Ctrl+,' → '⌘,'。
 */
export function formatShortcut(shortcut: string): string {
  if (!IS_MAC) return shortcut
  return shortcut
    .split(/\s+/)
    .map((chord) =>
      chord
        .split('+')
        .map((p) => MAC_SYMBOLS[p.trim()] ?? p.trim())
        .join(''),
    )
    .join(' ')
}
