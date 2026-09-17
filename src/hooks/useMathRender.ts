import { useState, useRef, useEffect } from 'react'
import { renderMathInHtml, renderMathInHtmlAsync } from '@utils/mathRenderer'
import { logger } from '../utils/logger'

/**
 * Hook for asynchronous KaTeX math rendering.
 *
 * Given a base HTML string, detects whether it contains KaTeX markers
 * and renders math formulas with debouncing. Returns null when no
 * math rendering is needed, allowing the caller to use the base HTML directly.
 */
export function useMathRender(baseHtml: string): string | null {
  const [mathRenderedHtml, setMathRenderedHtml] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)
  const prevRef = useRef(baseHtml)

  useEffect(() => {
    if (baseHtml === prevRef.current) return
    prevRef.current = baseHtml

    const hasKatexMarker =
      baseHtml.includes('katex-display-wrapper') ||
      baseHtml.includes('katex-inline-wrapper') ||
      baseHtml.includes('katex-error-wrapper')

    if (!hasKatexMarker) {
      setMathRenderedHtml(null)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    abortRef.current = false

    const isLargeDoc = baseHtml.length > 50000

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) return

      try {
        if (isLargeDoc) {
          const result = await renderMathInHtmlAsync(baseHtml)
          if (!abortRef.current) {
            setMathRenderedHtml(result)
          }
        } else {
          const result = renderMathInHtml(baseHtml)
          if (!abortRef.current) {
            setMathRenderedHtml(result)
          }
        }
      } catch (error) {
        logger.error('KaTeX Render failed:', error)
        if (!abortRef.current) {
          setMathRenderedHtml(baseHtml)
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      abortRef.current = true
    }
  }, [baseHtml])

  const needsMathRender =
    baseHtml.includes('katex-display-wrapper') ||
    baseHtml.includes('katex-inline-wrapper') ||
    baseHtml.includes('katex-error-wrapper')

  return needsMathRender && mathRenderedHtml !== null ? mathRenderedHtml : null
}
