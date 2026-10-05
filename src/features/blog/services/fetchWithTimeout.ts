/**
 * 带超时的 fetch（AbortController）—— 博客部署/发布链路的统一出口。
 *
 * 背景：原 `src/features/blog/services/*.ts` 的所有网络调用都没有超时，
 * 服务端挂起时 UI 会无限转圈、用户无法取消（审查 M4-blog services）。
 * 这里统一加 AbortController 超时，并把超时错误包装成语义明确的 FetchTimeoutError。
 */

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
