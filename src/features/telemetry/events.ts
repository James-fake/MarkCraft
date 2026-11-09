import { useEffect, useRef } from 'react'
import { configureTelemetry, flushNow, isTelemetryEnabled, track } from './client'

export { configureTelemetry, isTelemetryEnabled, flushNow }

/** 应用启动（≈安装后首次运行的时间点，用于推算「装多久」）。 */
export function trackAppLaunch(): void {
  track('app_launch')
}

/** 应用关闭：先记一条 close，再用 beacon 尽力刷新缓冲。 */
export function trackAppClose(): void {
  track('app_close')
  flushNow(true)
}

/** 某功能被使用一次（计数）。 */
export function trackFeatureUse(feature: string, count = 1): void {
  if (!feature) return
  track('feature_use', { feature, count })
}

/** 在某功能面板停留了 durationMs 毫秒。 */
export function trackFeatureDwell(feature: string, durationMs: number): void {
  if (!feature) return
  if (durationMs < 0 || !Number.isFinite(durationMs)) return
  track('feature_dwell', { feature, durationMs })
}

/**
 * 未捕获异常：只上报错误类名（截断），绝不携带消息 / 堆栈内容。
 * H-6：非 Error 值（字符串 reject、含路径的 ErrorEvent.message 等）一律上报固定常量，
 * 不把笔记内容 / 文件名 / 路径带出端。
 */
export function trackCrash(error: unknown): void {
  const detail =
    error instanceof Error
      ? error.constructor.name.slice(0, 40)
      : 'unknown'
  track('crash', { detail })
}

/**
 * 启动每日心跳（last-seen）。返回停止函数。
 * 服务端可用「N 天未活跃」反推流失，比硬抓卸载事件更可靠。
 */
export function startHeartbeat(intervalMs = 24 * 60 * 60 * 1000): () => void {
  const id = setInterval(() => track('heartbeat'), intervalMs)
  return () => clearInterval(id)
}

/**
 * React Hook：记录某功能面板的停留时长。
 * 面板挂载时记起点，卸载 / 失活时上报停留毫秒数。
 */
export function useFeatureDwell(feature: string): void {
  const startRef = useRef<number>(0)
  useEffect(() => {
    startRef.current = Date.now()
    return () => {
      trackFeatureDwell(feature, Date.now() - startRef.current)
    }
  }, [feature])
}

/** 安装全局错误 / 未处理 Promise 拒绝的监听，用于崩溃统计。返回卸载函数。 */
export function installErrorHandlers(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onError = (e: ErrorEvent) => trackCrash(e.error)
  const onRejection = (e: PromiseRejectionEvent) => trackCrash(e.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
