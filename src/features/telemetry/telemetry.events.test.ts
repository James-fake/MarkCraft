import { describe, it, expect, vi, beforeEach } from 'vitest'

// 隔离 client，仅验证 events 层对 track 的调用形态（尤其是崩溃上报不得泄露消息/堆栈）。
vi.mock('./client', () => ({
  track: vi.fn(),
  configureTelemetry: vi.fn(),
  flushNow: vi.fn(),
  isTelemetryEnabled: vi.fn(),
}))

import { track } from './client'
import {
  trackAppLaunch,
  trackAppClose,
  trackFeatureUse,
  trackFeatureDwell,
  trackCrash,
  installErrorHandlers,
} from './events'

const mockedTrack = vi.mocked(track)

describe('telemetry events helpers', () => {
  beforeEach(() => {
    mockedTrack.mockClear()
  })

  it('trackAppLaunch emits app_launch', () => {
    trackAppLaunch()
    expect(mockedTrack).toHaveBeenCalledWith('app_launch')
  })

  it('trackAppClose emits app_close and flushes', async () => {
    const { flushNow } = await import('./client')
    const mockedFlush = vi.mocked(flushNow)
    mockedFlush.mockClear()
    trackAppClose()
    expect(mockedTrack).toHaveBeenCalledWith('app_close')
    expect(mockedFlush).toHaveBeenCalledWith(true)
  })

  it('trackFeatureUse emits feature_use with count', () => {
    trackFeatureUse('graph', 3)
    expect(mockedTrack).toHaveBeenCalledWith('feature_use', { feature: 'graph', count: 3 })
  })

  it('trackFeatureUse ignores empty feature', () => {
    trackFeatureUse('')
    expect(mockedTrack).not.toHaveBeenCalled()
  })

  it('trackFeatureDwell emits feature_dwell with durationMs', () => {
    trackFeatureDwell('editor.wysiwyg', 1500)
    expect(mockedTrack).toHaveBeenCalledWith('feature_dwell', { feature: 'editor.wysiwyg', durationMs: 1500 })
  })

  it('trackFeatureDwell rejects negative / non-finite durations', () => {
    trackFeatureDwell('editor', -5)
    trackFeatureDwell('editor', Number.NaN)
    expect(mockedTrack).not.toHaveBeenCalled()
  })

  it('trackCrash sends ONLY the error class name — never the message', () => {
    trackCrash(new Error('secret path /Users/me/notes/passwords.md'))
    expect(mockedTrack).toHaveBeenCalledWith('crash', { detail: 'Error' })
    expect(mockedTrack.mock.calls[0][1]).not.toHaveProperty('message')
  })

  it('[反例] trackCrash never serializes non-Error values — reports a fixed constant', () => {
    trackCrash('boom')
    expect(mockedTrack).toHaveBeenCalledWith('crash', { detail: 'unknown' })
  })

  it('[反例] trackCrash NEVER leaks non-Error payloads (paths, filenames, note content)', () => {
    const sensitive = 'file:///C:/Users/me/notes/秘密.md :: password content'
    trackCrash(sensitive)
    trackCrash({ message: sensitive })
    trackCrash(null)
    trackCrash(undefined)
    trackCrash(42)
    expect(mockedTrack).toHaveBeenCalledTimes(5)
    for (const call of mockedTrack.mock.calls) {
      expect(call[0]).toBe('crash')
      expect(call[1]).toEqual({ detail: 'unknown' })
    }
    expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain('秘密')
    expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain('C:/Users')
  })

  it('trackCrash truncates Error class name to 40 chars', () => {
    class AVeryLongErrorClassNameThatDefinitelyExceedsFortyCharacters extends Error {}
    trackCrash(new AVeryLongErrorClassNameThatDefinitelyExceedsFortyCharacters('secret'))
    const detail = (mockedTrack.mock.calls[0][1] as { detail: string }).detail
    expect(detail).toHaveLength(40)
    expect(detail).toBe(
      'AVeryLongErrorClassNameThatDefinitelyExceedsFortyCharacters'.slice(0, 40),
    )
  })

  describe('installErrorHandlers — H-6', () => {
    it('[反例] onError does NOT fall back to e.message when e.error is missing', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const uninstall = installErrorHandlers()
      const handler = addSpy.mock.calls.find((c) => c[0] === 'error')?.[1] as
        | ((e: ErrorEvent) => void)
        | undefined
      expect(typeof handler).toBe('function')
      handler?.({
        error: undefined,
        message: 'file:///C:/Users/me/notes/秘密.md',
      } as unknown as ErrorEvent)
      expect(mockedTrack).toHaveBeenCalledWith('crash', { detail: 'unknown' })
      expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain('C:/Users')
      expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain('秘密')
      uninstall()
      addSpy.mockRestore()
    })

    it('[反例] onRejection discards string reasons (never reports filenames/paths)', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const uninstall = installErrorHandlers()
      const handler = addSpy.mock.calls.find((c) => c[0] === 'unhandledrejection')?.[1] as
        | ((e: PromiseRejectionEvent) => void)
        | undefined
      expect(typeof handler).toBe('function')
      handler?.({ reason: 'open /path/秘密.md failed' } as unknown as PromiseRejectionEvent)
      expect(mockedTrack).toHaveBeenCalledWith('crash', { detail: 'unknown' })
      expect(JSON.stringify(mockedTrack.mock.calls)).not.toContain('秘密')
      uninstall()
      addSpy.mockRestore()
    })
  })
})
