import type { TelemetryEvent, TelemetryEventType, TelemetryPlatform } from './types'
import { getInstallId } from './installId'
import { postEvents } from './transport'

export interface TelemetryConfig {
  /** 返回用户是否已授权；默认（未授权）为 false。 */
  getConsent: () => boolean
  /** 上报端点；空字符串时即使已授权也不发送。 */
  endpoint: string
  appVersion: string
  platform: TelemetryPlatform
  /** 静态 locale，或返回最新 locale 的 getter（用户切换语言后无需重建配置）。 */
  locale: string | (() => string)
  /** 防抖刷新窗口（ms），默认 5000 */
  flushIntervalMs?: number
  /** 单批最大事件数，默认 50 */
  maxBatchSize?: number
}

let config: TelemetryConfig | null = null
const buffer: TelemetryEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

// 缓存的基础字段（configureTelemetry 时填充，避免每条事件重复传参）
let baseAppVersion = ''
let basePlatform: TelemetryPlatform = 'unknown'
let baseLocale: () => string = () => ''

/** 在应用启动早期调用一次，注入授权判定、端点与基础字段。 */
export function configureTelemetry(cfg: TelemetryConfig): void {
  config = cfg
  baseAppVersion = cfg.appVersion
  basePlatform = cfg.platform
  const loc = cfg.locale
  baseLocale = typeof loc === 'function' ? loc : () => loc
}

/** 是否真正允许上报：已配置 + 端点非空 + 用户授权。 */
export function isTelemetryEnabled(): boolean {
  if (!config) return false
  if (!config.endpoint) return false
  return config.getConsent()
}

/**
 * 记录一条事件。未授权 / 未配置端点时是无操作（连缓冲都不进）。
 */
export function track(
  type: TelemetryEventType,
  extra?: Partial<Omit<TelemetryEvent, 'type' | 'installId' | 'ts' | 'appVersion' | 'platform' | 'locale'>>,
): void {
  if (!isTelemetryEnabled()) return
  buffer.push({
    type,
    installId: getInstallId(),
    ts: Date.now(),
    appVersion: baseAppVersion,
    platform: basePlatform,
    locale: baseLocale(),
    ...extra,
  })
  scheduleFlush()
}

function scheduleFlush(): void {
  if (!config || flushTimer) return
  const interval = config.flushIntervalMs ?? 5000
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushNow()
  }, interval)
}

/**
 * 立即刷新缓冲（用于应用关闭等场景，可传 beacon=true 用 sendBeacon 尽力送达）。
 * 未授权 / 未配置时清空缓冲，保证撤销授权后不再有任何遗留数据。
 */
export function flushNow(beacon = false): void {
  if (!config || !isTelemetryEnabled()) {
    buffer.length = 0
    return
  }
  if (buffer.length === 0) return
  const batch = buffer.splice(0, config.maxBatchSize ?? 50)
  postEvents({ endpoint: config.endpoint, events: batch, beacon })
  // 缓冲仍有剩余（事件数 > 单批上限）：立即排程下一轮 flush，
  // 否则残留事件要等下次 track() 才会再排程；而关闭时的 flushNow(beacon)
  // 不会再有 track() 触发 → 残留事件被丢弃。
  if (buffer.length > 0) scheduleFlush()
}
