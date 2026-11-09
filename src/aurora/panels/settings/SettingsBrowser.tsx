import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@stores/LanguageStore'
import { platform } from '@platform'
import type { WebviewElement } from '@src/types/webview'

interface SettingsBrowserProps {
  url: string
  onClose: () => void
}

/**
 * 「关于」里的**应用内浏览器视图**（Gitee 仓库 / Issues）。
 *
 * 为什么用 `<webview>` 而非 `<iframe>`：Gitee 响应头 `X-Frame-Options: SAMEORIGIN`
 * + CSP `frame-ancestors 'self'` 明确拒绝被第三方 iframe 嵌入；`<webview>` 是独立
 * webContents（等同浏览器标签），不受该限制。
 *
 * 非 Electron（jsdom 单测 / 纯浏览器）下 `<webview>` 不可用 → 降级为提示 + 可点链接。
 */
export function SettingsBrowser({ url, onClose }: SettingsBrowserProps) {
  const { t } = useLanguage()
  const B = t.settingsAbout
  const ref = useRef<HTMLElement | null>(null)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [loading, setLoading] = useState(true)
  const isElectron = platform.kind === 'electron'

  useEffect(() => {
    setCurrentUrl(url)
    setLoading(true)
    const el = ref.current as WebviewElement | null
    if (!el) return
    const onStart = () => setLoading(true)
    const onStop = () => {
      setLoading(false)
      try { setCurrentUrl(el.getURL() || url) } catch { /* ignore */ }
    }
    const onNav = (e: Event) => {
      const u = (e as unknown as { url?: string }).url
      if (u) setCurrentUrl(u)
    }
    el.addEventListener('did-start-loading', onStart)
    el.addEventListener('did-stop-loading', onStop)
    el.addEventListener('did-navigate', onNav)
    el.addEventListener('did-navigate-in-page', onNav)
    return () => {
      el.removeEventListener('did-start-loading', onStart)
      el.removeEventListener('did-stop-loading', onStop)
      el.removeEventListener('did-navigate', onNav)
      el.removeEventListener('did-navigate-in-page', onNav)
    }
  }, [url])

  const goBackInPage = useCallback(() => {
    const el = ref.current as WebviewElement | null
    try { if (el?.canGoBack?.()) el.goBack() } catch { /* ignore */ }
  }, [])

  const reload = useCallback(() => {
    const el = ref.current as WebviewElement | null
    try { el?.reload?.() } catch { /* ignore */ }
  }, [])

  return (
    <div className="aurora-settings__browser">
      <div className="aurora-settings__browser-bar">
        <button
          type="button"
          className="aurora-settings__browser-btn"
          onClick={onClose}
          title={B.browserBack}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span>{B.browserBack}</span>
        </button>
        <button
          type="button"
          className="aurora-settings__browser-btn"
          onClick={goBackInPage}
          disabled={!isElectron}
          title={B.browserBackOne}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="aurora-settings__browser-url" title={currentUrl}>{currentUrl}</div>
        <button
          type="button"
          className="aurora-settings__browser-btn"
          onClick={reload}
          disabled={!isElectron}
          title={B.browserReload}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
      {isElectron ? (
        <webview
          ref={ref}
          className="aurora-settings__browser-view"
          src={url}
          partition="persist:markcraft-web"
        />
      ) : (
        <div className="aurora-settings__browser-fallback">
          <p>{B.browserUnavailable}</p>
          <a href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
      {isElectron && loading && (
        <div className="aurora-settings__browser-loading" role="status" aria-label={B.browserLoading}>
          <div className="aurora-settings__browser-loading-inner">
            <svg
              className="aurora-settings__browser-spin"
              viewBox="0 0 64 64"
              width="60"
              height="60"
              aria-hidden="true"
              focusable="false"
            >
              <g>
                <rect x="8" y="8" width="48" height="48" rx="11" fill="var(--mc-accent)" opacity="0.12" />
                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="var(--mc-accent)" strokeWidth="3" />
                <path d="M18 44 L18 22 L32 36 L46 22 L46 44" fill="none" stroke="var(--mc-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <g className="aurora-settings__browser-spin-arc">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--mc-accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="44 132" />
              </g>
            </svg>
            <span className="aurora-settings__browser-loading-text">{B.browserLoading}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsBrowser
