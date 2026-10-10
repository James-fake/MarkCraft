import { useState, useRef, useEffect } from 'react'
import { renderMathInHtml, renderMathInHtmlAsync } from '@utils/mathRenderer'
import { unwrapLatexPlaceholders } from '@core/markdown/customSyntax'
import { logger } from '../utils/logger'

/**
 * 这段 HTML 是否需要走 KaTeX 渲染。
 *
 * ⚠️ 真实事故（2026-10-11）：原来只认 `katex-*-wrapper` 标记 —— 那是**所见即所得内核**
 *    产出的节点标记。而**预览**走的是另一条管线（`useMarkdownRenderer` → marked），
 *    它产出的是**原始 `$$...$$` / `$...$` 文本**，不含任何 katex 标记 ✗
 *    → 闸门直接早返回 → 预览里公式原样显示 `$$\sqrt{}$$`（用户报障）。
 *    `renderMathInHtml` 本身**是能处理原始 `$$`** 的（它扫的就是 `$`），缺的只是这个触发条件。
 */
export function needsMathRenderHtml(html: string): boolean {
  if (!html) return false
  if (
    html.includes('katex-display-wrapper') ||
    html.includes('katex-inline-wrapper') ||
    html.includes('katex-error-wrapper')
  ) {
    return true
  }
  // 公式占位 HTML（编辑器与预览管线产出）：只有 Tiptap 认识它，预览必须自己解包渲染
  if (html.includes('data-type="mathBlock"') || html.includes('data-type="mathInlineNode"')) {
    return true
  }
  // 原始公式：块级 `$$...$$`，或「两侧非空白」的行内 `$...$`（避免把「$100 和 $200」这类误判）
  return /\$\$/.test(html) || /\$[^\s$][^$\n]*[^\s$]\$/.test(html)
}

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
  // 哨兵初值：不能初始化为 baseHtml，否则首挂载立即命中 `===` 早返回 → 首屏 KaTeX 不渲染（只留 katex-* 原始标记）
  const prevRef = useRef<string | null>(null)

  useEffect(() => {
    if (baseHtml === prevRef.current) return
    prevRef.current = baseHtml

    if (!needsMathRenderHtml(baseHtml)) {
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
          const result = await renderMathInHtmlAsync(unwrapLatexPlaceholders(baseHtml))
          if (!abortRef.current) {
            setMathRenderedHtml(result)
          }
        } else {
          const result = renderMathInHtml(unwrapLatexPlaceholders(baseHtml))
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

  return needsMathRenderHtml(baseHtml) && mathRenderedHtml !== null ? mathRenderedHtml : null
}
