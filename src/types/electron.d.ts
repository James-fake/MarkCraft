/**
 * Electron preload 注入的桌面能力契约（实现见 `electron/preload/index.ts`）。
 *
 * ⚠️ 业务代码**不得**直接访问 `window.markcraft` —— 一律经 `@platform`
 * （`src/platform/index.ts`）。这样 jsdom 单测与浏览器 E2E 走 browser 实现，
 * 正式桌面版走 IPC 实现，两者契约一致。
 *
 * 新增能力顺序：① `electron/preload` 加方法 → ② 本文件加契约 →
 * ③ `src/platform/electron.ts` 包装 → ④ 业务代码只经 `@platform`。
 */

export interface MarkCraftWindowControls {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  /** 订阅最大化状态变化；返回取消订阅函数 */
  onStateChanged(cb: (state: { maximized: boolean }) => void): () => void
}

/**
 * Pandoc sidecar（P6 才接线）。
 * 契约先留位：避免 `exportEpub` 再引入第二套 window 全局命名空间。
 */
export interface MarkCraftPandocAPI {
  convert(content: string, fromFormat: string, toFormat: string): Promise<{
    error?: string
    buffer?: ArrayBuffer
  }>
}

export interface MarkCraftDesktopAPI {
  window: MarkCraftWindowControls
  pandoc?: MarkCraftPandocAPI
}

declare global {
  interface Window {
    markcraft?: MarkCraftDesktopAPI
  }
}
