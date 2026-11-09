import { describe, it, expect, vi, beforeEach } from 'vitest'

// 自动模拟 transport，避免任何真实网络；client 行为与缓冲逻辑完全可控。
vi.mock('./transport', () => ({
  postEvents: vi.fn(() => true),
}))

import { postEvents } from './transport'
const mockedPost = vi.mocked(postEvents)

async function freshClient() {
  vi.resetModules()
  return (await import('./client')) as typeof import('./client')
}

const ENABLED = {
  getConsent: () => true,
  endpoint: 'https://telemetry.test/events',
  appVersion: '1.0.0',
  platform: 'win' as const,
  locale: 'en',
}

describe('client telemetry', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockedPost.mockClear()
    localStorage.clear()
  })

  it('is disabled by default before configureTelemetry is called', async () => {
    const c = await freshClient()
    expect(c.isTelemetryEnabled()).toBe(false)
  })

  it('is disabled when endpoint is empty even if consented', async () => {
    const c = await freshClient()
    c.configureTelemetry({ ...ENABLED, endpoint: '' })
    expect(c.isTelemetryEnabled()).toBe(false)
  })

  it('is disabled when consent is denied (even with endpoint)', async () => {
    const c = await freshClient()
    c.configureTelemetry({ ...ENABLED, getConsent: () => false })
    expect(c.isTelemetryEnabled()).toBe(false)
  })

  it('track() is a no-op before configure (never buffers)', async () => {
    const c = await freshClient()
    c.track('heartbeat')
    c.flushNow()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('track() is a no-op when consent denied', async () => {
    const c = await freshClient()
    c.configureTelemetry({ ...ENABLED, getConsent: () => false })
    c.track('heartbeat')
    c.flushNow()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('buffers and posts when enabled; event carries base fields', async () => {
    const c = await freshClient()
    c.configureTelemetry(ENABLED)
    c.track('heartbeat')
    c.flushNow()
    expect(mockedPost).toHaveBeenCalledTimes(1)
    const arg = mockedPost.mock.calls[0][0]
    expect(arg.endpoint).toBe(ENABLED.endpoint)
    expect(arg.events).toHaveLength(1)
    expect(arg.events[0].type).toBe('heartbeat')
    expect(arg.events[0].appVersion).toBe('1.0.0')
    expect(arg.events[0].platform).toBe('win')
    expect(arg.events[0].locale).toBe('en')
    expect(arg.events[0].installId).toBeTruthy()
  })

  it('flushNow clears the buffer when disabled (no data leaks after revoke)', async () => {
    const c = await freshClient()
    c.configureTelemetry(ENABLED)
    c.track('heartbeat')
    // 用户撤销授权
    c.configureTelemetry({ ...ENABLED, getConsent: () => false })
    c.flushNow()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('respects maxBatchSize on flush', async () => {
    const c = await freshClient()
    c.configureTelemetry({ ...ENABLED, maxBatchSize: 2 })
    c.track('heartbeat')
    c.track('heartbeat')
    c.track('heartbeat')
    c.flushNow()
    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(mockedPost.mock.calls[0][0].events).toHaveLength(2)
  })

  it('installId is generated once and persisted (no PII)', async () => {
    const { getInstallId } = (await import('./installId')) as typeof import('./installId')
    const a = getInstallId()
    const b = getInstallId()
    expect(a).toBeTruthy()
    expect(a).toBe(b)
    expect(localStorage.getItem('markcraft_telemetry_install_id')).toBe(a)
    // 不应包含任何可识别信息：纯随机 UUID / 随机串
    expect(a).not.toContain('@')
  })
})
