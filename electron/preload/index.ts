/**
 * Electron preload —— 系统能力的**唯一入口**。
 *
 * 经 `contextBridge` 在 `window.markcraft` 上暴露一个**最小白名单**；渲染进程不得
 * 直接 `require('electron')`，也不得直接访问 fs。新增能力时：
 *   ① 在本文件加方法 → ② 在 `src/types/electron.d.ts` 加契约 →
 *   ③ 在 `src/platform/electron.ts` 包装成平台实现 → ④ 业务代码只经 `@platform`。
 */
import { contextBridge, ipcRenderer } from 'electron'

export interface WindowStateChanged {
  maximized: boolean
}

const api = {
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('mc:window:minimize'),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke('mc:window:toggle-maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('mc:window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('mc:window:is-maximized') as Promise<boolean>,
    /** 订阅最大化状态变化；返回取消订阅函数 */
    onStateChanged: (cb: (state: WindowStateChanged) => void): (() => void) => {
      const handler = (_e: unknown, state: WindowStateChanged) => cb(state)
      ipcRenderer.on('mc:window:state', handler)
      return () => ipcRenderer.removeListener('mc:window:state', handler)
    },
  },
}

contextBridge.exposeInMainWorld('markcraft', api)

export type MarkCraftPreloadApi = typeof api
