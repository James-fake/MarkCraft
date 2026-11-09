import pkg from '../../../package.json'
import type { TelemetryPlatform } from './types'

/** 应用版本，取自 package.json（单一事实来源）。 */
export const APP_VERSION: string = (pkg as { version: string }).version || '0.0.0'

/**
 * 上报端点：从构建期环境变量读取。
 * 未配置（默认）时为空字符串 —— 此时即使已授权也**不会**上报任何数据。
 * 上线时在 `.env` / 构建环境中设置 `VITE_TELEMETRY_ENDPOINT` 指向你的隐私友好分析服务
 * （Umami / Plausible / PostHog 等的自定义事件接收接口）。
 */
export const TELEMETRY_ENDPOINT: string = (
  (import.meta.env.VITE_TELEMETRY_ENDPOINT as string | undefined) ?? ''
).trim()

/** 从 userAgent 推断桌面平台（Electron 渲染层无可靠 process.platform）。 */
export function detectPlatform(): TelemetryPlatform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/Win/i.test(ua)) return 'win'
  if (/Mac/i.test(ua)) return 'mac'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'unknown'
}
