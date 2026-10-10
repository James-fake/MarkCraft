import type { ThemeType } from '@features/themes/useTheme'
import { useLanguage } from '../../stores/LanguageStore'
import { useRef, useCallback, useEffect, forwardRef, ForwardedRef } from 'react'
import { sanitizeHtml } from '@services/sanitizeHtml'
import morphdom from 'morphdom'
import ScrollButtons from '@components/ui/ScrollButtons'
import { savePreviewScroll } from '../../services/scrollPositionManager'
import { renderMermaidInDom } from '@features/editor/extensions/mermaidCache'

interface PreviewProps {
  content: string
  theme: ThemeType
  onScroll?: (scrollPosition: number, element: HTMLElement) => void
  onContentChange?: (markdown: string) => void
  onDeleteImage?: (imageIndex: number) => void
  fileId?: string
}

const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (err) {
      reject(err)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

const Preview = forwardRef(function Preview(
  { content, theme, onScroll, onDeleteImage, fileId }: PreviewProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  // V6-M4: Use ref instead of state for isSyncing to avoid stale closure in isSyncingRef
  const isSyncingRef = useRef(false)
  const { t } = useLanguage()

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop, e.currentTarget)
    }
    // 保存预览区滚动位置（用于切换标签页后恢复）
    if (fileId) {
      // 同时保存 scrollHeight，恢复时用比例计算避免偏差
      savePreviewScroll(fileId, e.currentTarget.scrollTop, e.currentTarget.scrollHeight)
    }
  }, [onScroll, fileId])

  const originalHtmlRef = useRef('')

  const attachDeleteButtons = useCallback(() => {
    const container = previewContainerRef.current
    if (!container) return

    const images = container.querySelectorAll('.markdown-preview img, img')
    images.forEach((img, index) => {
      const imgEl = img as HTMLImageElement
      const parent = imgEl.parentElement
      if (parent && parent.classList.contains('preview-image-container')) return

      const wrapper = document.createElement('div')
      wrapper.className = 'preview-image-container'
      wrapper.setAttribute('data-image-index', String(index))

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'preview-image-delete-btn'
      deleteBtn.setAttribute('data-image-index', String(index))
      deleteBtn.setAttribute('title', t.previewExtra.deleteImage)
      deleteBtn.setAttribute('aria-label', t.previewExtra.deleteImage)
      deleteBtn.innerHTML = '&times;'

      imgEl.parentNode?.insertBefore(wrapper, imgEl)
      wrapper.appendChild(imgEl)
      wrapper.appendChild(deleteBtn)
    })
  }, [t])

  // P1.1 块嵌入：在 morphdom 完成后解析 !((block-id)) 占位为实际块内容
  const resolveBlockEmbeds = useCallback(() => {
    const container = previewContainerRef.current
    if (!container) return
    const embeds = container.querySelectorAll('.block-embed[data-embed="true"]')
    if (embeds.length === 0) return
    import('../../services/blockReferenceBridge').then(({ resolveBlock }) => {
      for (const el of Array.from(embeds)) {
        const blockId = el.getAttribute('data-block-id') || ''
        const info = resolveBlock(blockId)
        const loading = el.querySelector('.block-embed-loading')
        if (info) {
          // 使用 DOM API 而非 innerHTML 拼接，避免 XSS
          el.innerHTML = ''
          const sourceDiv = document.createElement('div')
          sourceDiv.className = 'block-embed-source'
          sourceDiv.textContent = info.fileName
          const textDiv = document.createElement('div')
          textDiv.className = 'block-embed-text'
          textDiv.textContent = info.text
          el.appendChild(sourceDiv)
          el.appendChild(textDiv)
        } else if (loading) {
          loading.textContent = `未找到块: ${blockId}`
        }
      }
    })
  }, [])

  // M5: Render content with requestAnimationFrame for smooth updates
  const renderRafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!previewContainerRef.current || content === originalHtmlRef.current) return

    isSyncingRef.current = true

    if (renderRafRef.current !== null) cancelAnimationFrame(renderRafRef.current)

    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null
      if (!previewContainerRef.current) return
      // Double-check in case content changed during the frame delay
      if (content === originalHtmlRef.current) return

      // Sanitize HTML before inserting into DOM to prevent XSS（统一经由 sanitizeHtml 闸门）
      const cleanContent = sanitizeHtml(content)

      // 使用 morphdom 增量更新 DOM，而非 innerHTML 全量替换
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = cleanContent

      morphdom(previewContainerRef.current, tempDiv, {
        childrenOnly: true,
        onBeforeElUpdated(fromEl, toEl) {
          // 保留代码块折叠状态
          if (fromEl.classList.contains('code-block-collapsed') && !toEl.classList.contains('code-block-collapsed')) {
            return false
          }
          // 保留已渲染的 mermaid 图表，避免 morphdom 将 SVG 替换回 loading 状态。
          // ⚠️ 必须同时比对 data-code：只按 data-rendered 判断的话，用户**改了图表代码**
          //    也会被保留成旧图，改了不生效。
          if (
            fromEl.classList.contains('mermaid-diagram') &&
            fromEl.dataset.rendered === 'true' &&
            fromEl.dataset.code === toEl.dataset.code
          ) {
            return false
          }
          return true
        },
        onElUpdated(_el) {
          // morphdom 已完成更新
        },
      })

      // Update ref AFTER rendering to avoid race condition
      originalHtmlRef.current = content

      requestAnimationFrame(() => {
        attachDeleteButtons()
        resolveBlockEmbeds()
        // ⚠️ 预览窗格必须自己渲染 mermaid/mindmap（真实事故 2026-10-11：思维导图在预览里一直转圈）。
        //    渲染器是全仓唯一的 —— 见 mermaidCache.renderMermaidInDom 的说明。
        const host = previewContainerRef.current
        if (host) {
          void renderMermaidInDom(host, theme, {
            syntaxError: t.embedView.diagramSyntaxError,
            renderError: t.embedView.diagramRenderError,
          })
        }
      })
      setTimeout(() => isSyncingRef.current = false, 50)
    })

    return () => {
      if (renderRafRef.current !== null) {
        cancelAnimationFrame(renderRafRef.current)
        renderRafRef.current = null
      }
    }
    // theme / t 参与 mermaid 渲染（主题决定配色、t 决定错误文案），必须进依赖
  }, [content, attachDeleteButtons, resolveBlockEmbeds, theme, t])

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(previewContainerRef.current)
    } else if (ref) {
      ref.current = previewContainerRef.current
    }
  }, [ref])

  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // P1.1 块引用点击：跳转到块所在文件
      const blockRef = target.closest('.block-reference') as HTMLElement
      if (blockRef) {
        e.preventDefault()
        e.stopPropagation()
        const blockId = blockRef.getAttribute('data-block-id') || ''
        if (blockId) {
          import('../../services/blockReferenceBridge').then(({ triggerBlockClick }) => {
            triggerBlockClick(blockId)
          })
        }
        return
      }

      const link = target.closest('a') as HTMLAnchorElement
      if (link && link.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        e.stopPropagation()
        const href = link.getAttribute('href') || ''
        const targetId = href.slice(1)
        const targetElement = document.getElementById(targetId)
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }

      const deleteBtn = target.closest('.preview-image-delete-btn') as HTMLElement
      if (deleteBtn) {
        e.preventDefault()
        e.stopPropagation()
        const imageIndex = parseInt(deleteBtn.getAttribute('data-image-index') || '-1', 10)
        if (imageIndex >= 0 && onDeleteImage) {
          onDeleteImage(imageIndex)
        }
        return
      }

      const copyBtn = target.closest('.code-copy-btn') as HTMLElement
      if (copyBtn) {
        e.preventDefault()
        e.stopPropagation()
        const wrapper = copyBtn.closest('.code-block-wrapper')
        if (!wrapper) return
        const codeEl = wrapper.querySelector('code')
        if (!codeEl) return
        const text = codeEl.textContent || ''

        try {
          await copyToClipboard(text)
          copyBtn.textContent = t.previewExtra.copied
          copyBtn.classList.add('copied')
          setTimeout(() => {
            copyBtn.textContent = t.previewExtra.copy
            copyBtn.classList.remove('copied')
          }, 2000)
        } catch {
          copyBtn.textContent = t.previewExtra.failed
          setTimeout(() => {
            copyBtn.textContent = t.previewExtra.copy
          }, 2000)
        }
        return
      }

      const foldBtn = target.closest('.code-fold-btn') as HTMLElement
      if (foldBtn) {
        e.preventDefault()
        e.stopPropagation()
        const wrapper = foldBtn.closest('.code-block-wrapper')
        if (!wrapper) return
        const body = wrapper.querySelector('.code-block-body') as HTMLElement
        if (!body) return
        const isCollapsed = wrapper.classList.contains('code-block-collapsed')

        if (isCollapsed) {
          body.style.maxHeight = body.scrollHeight + 'px'
          wrapper.classList.remove('code-block-collapsed')
          foldBtn.textContent = t.previewExtra.collapse
          foldBtn.title = t.previewExtra.collapseCode
          const footer = wrapper.querySelector('.code-block-footer') as HTMLElement
          if (footer) footer.style.display = 'none'
          const onEnd = () => {
            body.style.maxHeight = 'none'
            body.removeEventListener('transitionend', onEnd)
          }
          body.addEventListener('transitionend', onEnd)
        } else {
          body.style.maxHeight = body.scrollHeight + 'px'
          requestAnimationFrame(() => {
            body.style.maxHeight = '150px'
            wrapper.classList.add('code-block-collapsed')
            foldBtn.textContent = t.previewExtra.expand
            foldBtn.title = t.previewExtra.expandCode
            const footer = wrapper.querySelector('.code-block-footer') as HTMLElement
            if (footer) footer.style.display = ''
          })
        }
        return
      }

      const footer = target.closest('.code-block-footer') as HTMLElement
      if (footer) {
        e.preventDefault()
        e.stopPropagation()
        const wrapper = footer.closest('.code-block-wrapper')
        if (!wrapper) return
        const body = wrapper.querySelector('.code-block-body') as HTMLElement
        if (!body) return
        const foldBtn2 = wrapper.querySelector('.code-fold-btn') as HTMLElement

        body.style.maxHeight = body.scrollHeight + 'px'
        wrapper.classList.remove('code-block-collapsed')
        if (foldBtn2) {
          foldBtn2.textContent = t.previewExtra.collapse
          foldBtn2.title = t.previewExtra.collapseCode
        }
        footer.style.display = 'none'
        const onEnd = () => {
          body.style.maxHeight = 'none'
          body.removeEventListener('transitionend', onEnd)
        }
        body.addEventListener('transitionend', onEnd)
        return
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onDeleteImage, t])

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={previewContainerRef}
          id="preview-content"
          className="preview-container h-full overflow-y-auto px-6 py-4 markdown-preview"
          data-theme={theme}
          onScroll={handlePreviewScroll}
        />
        <ScrollButtons scrollContainerRef={previewContainerRef} scrollToTopLabel={t.scrollButtons.scrollToTop} scrollToBottomLabel={t.scrollButtons.scrollToBottom} />
      </div>
    </div>
  )
})

export default Preview
