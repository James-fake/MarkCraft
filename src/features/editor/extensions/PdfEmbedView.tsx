import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { getPdfBlob } from '@core/storage/blobStore'
import { logger } from '@utils/logger'
import { useLanguage } from '@stores/LanguageStore'

/** 一次最多渲染的页数，避免超大 PDF 占满内存（C3 风险缓解） */
const MAX_PAGES = 30

type LoadStatus = 'loading' | 'ready' | 'error'

export default function PdfEmbedView({ node }: NodeViewProps) {
  const { t } = useLanguage()
  const { src, pdfId } = node.attrs
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function renderInto(pdfjs: typeof import('pdfjs-dist'), source: Uint8Array | string) {
      const loadingTask = pdfjs.getDocument({ data: source as never, isEvalSupported: false })
      const pdf = await loadingTask.promise
      if (cancelled) return
      setPageCount(pdf.numPages)

      const container = containerRef.current
      if (!container) return
      container.innerHTML = ''

      const max = Math.min(pdf.numPages, MAX_PAGES)
      for (let i = 1; i <= max; i++) {
        if (cancelled) return
        const page = await pdf.getPage(i)
        if (cancelled) return
        const viewport = page.getViewport({ scale: 1.3 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.maxWidth = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        canvas.style.margin = '0 auto 8px'
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        await page.render({ canvasContext: ctx, viewport }).promise
        container.appendChild(canvas)
      }
      setStatus('ready')
    }

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default
        if (cancelled) return

        if (pdfId) {
          const blob = await getPdfBlob(pdfId)
          if (!blob) throw new Error(t.embedView.pdfDataMissing)
          const bytes = new Uint8Array(await blob.arrayBuffer())
          await renderInto(pdfjs, bytes)
        } else if (src) {
          if (src.startsWith('blob:')) {
            const resp = await fetch(src)
            const blob = await resp.blob()
            const bytes = new Uint8Array(await blob.arrayBuffer())
            await renderInto(pdfjs, bytes)
          } else {
            // 外链 URL：pdfjs 自行 fetch（需服务端 CORS 允许）
            await renderInto(pdfjs, src)
          }
        } else {
          setStatus('error')
          setError(t.embedView.pdfSrcMissing)
        }
      } catch (err) {
        if (cancelled) return
        logger.error('[PdfEmbedView] load failed:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : t.embedView.pdfLoadFailed)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [src, pdfId, t])

  return (
    <NodeViewWrapper>
      <div
        style={{
          margin: '8px 0',
          border: '1px solid var(--editor-border, rgba(128,128,128,0.2))',
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--code-bg, #f6f8fa)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--editor-text, #666)',
            borderBottom: '1px solid var(--editor-border, rgba(128,128,128,0.15))',
          }}
        >
          <span>📄 PDF</span>
          {pageCount > 0 && <span>{t.embedView.pagesCount.replace('{n}', String(pageCount))}</span>}
          {src && !pdfId && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 'auto', color: 'var(--link-color, #2563eb)' }}
            >
              {t.embedView.openOriginal}
            </a>
          )}
        </div>

        {status === 'loading' && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--editor-text, #666)' }}>{t.embedView.loading}</div>
        )}

        {status === 'error' && (
          <div style={{ padding: 16, color: '#ef4444', fontSize: 13 }}>
            <div>{t.embedView.pdfPreviewFailed.replace('{error}', error)}</div>
            {src && (
              <a href={src} target="_blank" rel="noreferrer" style={{ color: '#ef4444' }}>
                {t.embedView.tryOpenDirect}
              </a>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            padding: 8,
            maxHeight: 600,
            overflowY: 'auto',
            display: status === 'ready' ? 'block' : 'none',
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
