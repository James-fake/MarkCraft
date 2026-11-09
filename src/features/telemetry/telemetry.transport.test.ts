import { describe, it, expect, afterEach, vi } from 'vitest'
import { postEvents } from './transport'
import type { TelemetryEvent } from './types'

function makeEvent(over: Partial<TelemetryEvent> = {}): TelemetryEvent {
  return {
    type: 'heartbeat',
    installId: 'install-1',
    ts: 1,
    appVersion: '1.0.0',
    platform: 'win',
    locale: 'en',
    ...over,
  }
}

describe('transport.postEvents', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false and sends nothing when endpoint is empty', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(postEvents({ endpoint: '', events: [makeEvent()] })).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false and sends nothing when events is empty', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(postEvents({ endpoint: 'https://x.test/events', events: [] })).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs JSON with credentials omitted and keepalive on (non-beacon)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const ev = makeEvent()
    const res = postEvents({ endpoint: 'https://x.test/events', events: [ev] })
    expect(res).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://x.test/events')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(init.keepalive).toBe(true)
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ events: [ev] }))
  })

  it('silently swallows a rejected fetch (never throws, returns true)', () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    expect(() => postEvents({ endpoint: 'https://x.test/events', events: [makeEvent()] })).not.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses navigator.sendBeacon when beacon=true and available', () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon: beacon } as unknown as Navigator)
    const res = postEvents({ endpoint: 'https://x.test/events', events: [makeEvent()], beacon: true })
    expect(res).toBe(true)
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe('https://x.test/events')
    expect(beacon.mock.calls[0][1]).toBeInstanceOf(Blob)
  })

  it('falls back to fetch when beacon requested but sendBeacon unavailable', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', { sendBeacon: undefined } as unknown as Navigator)
    const res = postEvents({ endpoint: 'https://x.test/events', events: [makeEvent()], beacon: true })
    expect(res).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
