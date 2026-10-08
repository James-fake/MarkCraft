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

  // —— P3：真实文件系统（主进程磁盘访问）——
  fs: {
    readDirectory: (path: string, options?: { recursive?: boolean; includeHidden?: boolean }) =>
      ipcRenderer.invoke('mc:fs:readDir', path, options),
    readFile: (path: string) => ipcRenderer.invoke('mc:fs:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('mc:fs:writeFile', path, content),
    exists: (path: string) => ipcRenderer.invoke('mc:fs:exists', path),
    stat: (path: string) => ipcRenderer.invoke('mc:fs:stat', path),
    mkdir: (path: string) => ipcRenderer.invoke('mc:fs:mkdir', path),
    rename: (path: string, newPath: string) => ipcRenderer.invoke('mc:fs:rename', path, newPath),
    remove: (path: string) => ipcRenderer.invoke('mc:fs:remove', path),
    // —— P4-C：文件监听 ——
    // 主进程开 fs.watch(root, {recursive:true})，事件经 per-path 去抖后 send 回来；
    // 渲染端注册监听，关闭/卸载时调 unwatch 回收。闭包跨 contextBridge 合法。
    watch: (
      root: string,
      onEvent: (event: { type: 'create' | 'change' | 'delete'; path: string }) => void,
    ): (() => void) => {
      let stopped = false
      let watchId: string | null = null
      const listener = (_e: unknown, payload: { type: 'create' | 'change' | 'delete'; path: string }) => {
        if (stopped) return
        onEvent(payload)
      }
      ipcRenderer.on('mc:fs:watch', listener)
      ipcRenderer
        .invoke('mc:fs:watch', root)
        .then((id) => {
          if (stopped) {
            // invoke 期间被取消 → 立刻回收
            ipcRenderer.invoke('mc:fs:unwatch', id)
            ipcRenderer.removeListener('mc:fs:watch', listener)
            return
          }
          watchId = id
        })
        .catch(() => {
          // 启动失败也解绑监听
          ipcRenderer.removeListener('mc:fs:watch', listener)
        })
      return () => {
        if (stopped) return
        stopped = true
        ipcRenderer.removeListener('mc:fs:watch', listener)
        if (watchId) ipcRenderer.invoke('mc:fs:unwatch', watchId)
      }
    },
  },

  // —— P3：原生对话框 ——
  dialog: {
    openDirectory: (): Promise<string | null> => ipcRenderer.invoke('mc:dialog:openDirectory'),
    openFile: (options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean }) =>
      ipcRenderer.invoke('mc:dialog:openFile', options),
    saveFile: (options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
      ipcRenderer.invoke('mc:dialog:saveFile', options),
  },

  // —— P3：系统 shell ——
  shell: {
    showItemInFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('mc:fs:reveal', path),
  },
}

contextBridge.exposeInMainWorld('markcraft', api)

export type MarkCraftPreloadApi = typeof api
