import type { TelemetryEvent } from './types'

export interface PostEventsOptions {
  /** 上报端点（隐私友好分析服务的 events API）。空字符串 = 不发送。 */
  endpoint: string
  events: TelemetryEvent[]
  /** 关闭应用时用 sendBeacon 尽力送达 */
  beacon?: boolean
}

/**
 * 将一批事件 POST 到配置的上报端点。
 *
 * 关键约束：**静默失败** —— 网络异常、端点未配置都必须被吞掉，
 * 绝不能让遥测影响主应用功能或抛出未捕获错误。
 *
 * 载荷形态（与 Umami / Plausible / PostHog 等隐私友好服务的自定义事件接口兼容）：
 *   { "events": TelemetryEvent[] }
 */
export function postEvents({ endpoint, events, beacon }: PostEventsOptions): boolean {
  if (!endpoint) return false
  if (events.length === 0) return false
  const body = JSON.stringify({ events })
  try {
    if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      return navigator.sendBeacon(endpoint, blob)
    }
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {
      /* 静默失败 */
    })
    return true
  } catch {
    return false
  }
}
