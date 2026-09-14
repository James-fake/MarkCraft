import { useSyncExternalStore, useEffect } from 'react'

/**
 * 桌面密度偏好（紧凑 / 舒适）的共享数据源。
 *
 * 阶段4 起密度由 Sidebar 用本地存储键 `mc-sidebar-density` 持久化并广播到
 * `<html data-density>`（阶段5 提升为「应用级」，驱动编辑器/预览/知识库/白板等联动）。
 * 阶段10 把密度提升为「设置对话框中的桌面偏好」——设置面板与侧边栏切换按钮
 * 共享同一个来源，避免两处状态不一致、且设置面板改动会被 Sidebar 实时跟随。
 *
 * 设计要点：
 * - 单一真相：所有读写都经过本 store，写入时持久化 + 广播 + 通知订阅者。
 * - 广播目标 `<html data-density>` 是各模块（CSS 选择器 / BlogStudio 的只读 useDensity）
 *   统一消费的通道，本 store 是唯一写入方（Sidebar 不再单独写）。
 * - getSnapshot 每次直接读本地存储，天然无跨测试串扰（vitest 中 beforeEach 清存储即可隔离）。
 */

export type Density = 'compact' | 'comfortable'

export const DENSITY_STORAGE_KEY = 'mc-sidebar-density'

const listeners = new Set<() => void>()

function readStorage(): Density {
  try {
    return localStorage.getItem(DENSITY_STORAGE_KEY) === 'comfortable' ? 'comfortable' : 'compact'
  } catch {
    return 'compact'
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): Density {
  return readStorage()
}

/**
 * 写入密度偏好：持久化到本地存储、广播到 `<html data-density>`、通知订阅者。
 * 与当前值相同则跳过（避免无意义重渲染）。
 */
export function setDensitySetting(next: Density): void {
  const current = readStorage()
  if (current === next) return
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, next)
  } catch {
    // 隐私模式等写入失败时忽略，仍尝试广播内存态
  }
  document.documentElement.setAttribute('data-density', next)
  listeners.forEach((listener) => listener())
}

/** 组件用：响应式读取当前密度（compact | comfortable）。 */
export function useDensitySetting(): Density {
  const density = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  // 挂载 / 密度变化时把当前值重新广播到 <html data-density>，
  // 保证全局 CSS 选择器始终与共享来源一致（幂等、单写入方）。
  // 阶段4 原由 Sidebar 的 useEffect 负责，阶段10 收敛到本 store 后在此统一兜底。
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])
  return density
}

/** 非组件环境读取（测试 / 工具函数用）。 */
export function getDensity(): Density {
  return readStorage()
}

// 兜底初始广播：确保应用启动即与本地存储一致。
// （Sidebar 挂载时也会基于同一来源渲染，此处双保险，幂等无副作用）
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-density', readStorage())
}
