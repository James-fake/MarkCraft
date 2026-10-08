import { browserPlatform } from './browser'
import type { Platform, WindowControls } from './types'
import type { MarkCraftDesktopAPI } from '../types/electron'

/**
 * Electron 实现（P2 骨架）。
 *
 * 本阶段**只有窗口控制**走真实 IPC；文件选择 / 保存 / reveal 仍回落 `browserPlatform`，
 * 待 P3 打通 fs 后逐个替换 —— 这样 P2 可以先落地骨架而不阻塞任何既有能力。
 *
 * ⚠️ 与 `browserPlatform` 的语义必须逐条对齐（契约测试见 `browser.test.ts`）：
 * 取消返回 null、非取消错误上抛、目录写入支持嵌套相对路径。
 */

function api(): MarkCraftDesktopAPI | undefined {
  if (typeof window === 'undefined') return undefined
  return window.markcraft
}

/**
 * 最大化状态快照。
 * 契约 `WindowControls.isMaximized()` 是**同步**的，而 IPC 是异步的 → 这里维护
 * 一份由「主进程事件推送 + 首次查询」更新的快照。用户把窗口拖到屏幕边缘触发的
 * 最大化也能被推送覆盖。
 */
let maximizedSnapshot = false

function refreshMaximized(): void {
  const a = api()
  if (!a) return
  void a.window
    .isMaximized()
    .then((v) => {
      maximizedSnapshot = v
    })
    .catch(() => {
      /* 查询失败保持上一次快照，不打断 UI */
    })
}

const desktopWindowControls: WindowControls = {
  minimize() {
    void api()?.window.minimize().catch(() => {})
  },
  toggleMaximize() {
    void api()
      ?.window.toggleMaximize()
      .then(refreshMaximized)
      .catch(() => {})
  },
  close() {
    void api()?.window.close().catch(() => {})
  },
  isMaximized() {
    return maximizedSnapshot
  },
}

/** 建立最大化状态订阅（应在平台分派时调用一次） */
export function initElectronPlatform(): void {
  const a = api()
  if (!a) return
  a.window.onStateChanged((s) => {
    maximizedSnapshot = s.maximized
  })
  refreshMaximized()
}

export const electronPlatform: Platform = {
  ...browserPlatform,
  kind: 'electron',
  window: desktopWindowControls,
}
