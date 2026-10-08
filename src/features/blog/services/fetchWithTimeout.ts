/**
 * 带超时的 fetch（AbortController）—— 博客部署/发布链路的统一出口。
 *
 * 背景：原 `src/features/blog/services/*.ts` 的所有网络调用都没有超时，
 * 服务端挂起时 UI 会无限转圈、用户无法取消（审查 M4-blog services）。
 * 这里统一加 AbortController 超时，并把超时错误包装成语义明确的 FetchTimeoutError。
 *
 * P6：**桌面端改走主进程网络代理**（`platform.net.fetch`）—— 渲染进程是 Chromium、
 * 跨域受 CORS 约束，GitHub / Vercel / Cloudflare 等 API 会被拦；主进程是 Node、不受
 * CORS 约束。调用方（5 个 deploy 适配器）零改动，超时语义不变（改由主进程执行）。
 */
import { platform } from '@platform'

/** 默认超时：部署/发布接口通常较慢，给 30s；调用方可按接口用 timeoutMs 覆盖。 */
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000

export class FetchTimeoutError extends Error {
  readonly url: string
  readonly timeoutMs: number
  constructor(url: string, timeoutMs: number) {
    super(`请求超时：${timeoutMs}ms 内未收到响应（${url}）`)
    this.name = 'FetchTimeoutError'
    this.url = url
    this.timeoutMs = timeoutMs
  }
}

export interface FetchWithTimeoutInit extends RequestInit {
  /** 覆盖默认超时（毫秒） */
  timeoutMs?: number
}

/**
 * 与 fetch 同签名，额外支持 timeoutMs。超时后以 FetchTimeoutError 抛出。
 */
export async function fetchWithTimeout(
  url: string,
  init?: FetchWithTimeoutInit,
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = init ?? {}

  // —— P6：桌面端 → 主进程代理（无 CORS）；超时由主进程执行 ——
  if (platform.kind === 'electron') {
    try {
      return await platform.net.fetch(url, { ...rest, timeoutMs })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NET_TIMEOUT')) throw new FetchTimeoutError(url, timeoutMs)
      throw err
    }
  }

  // —— 浏览器 / jsdom：原有路径，行为逐字不变 ——
  // 环境无 AbortController（老运行时 / 测试桩）时退化为普通 fetch
  if (typeof AbortController === 'undefined') return fetch(url, rest)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } catch (err) {
    // 只有我们自己的 controller 触发的 abort 才是超时
    if (controller.signal.aborted) throw new FetchTimeoutError(url, timeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
