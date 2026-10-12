import domToImage from 'dom-to-image-more'
import { downloadBlob } from './downloadBlob'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { textToStorage } from '@core/storage/imageStore'
import { EXPORT_CSS } from './exportCss'

export interface ExportImageOptions {
  format: 'png' | 'jpeg'
  quality?: number  // 0-1, for jpeg
  scale?: number    // 1, 2, or 3
  maxWidth?: number
  backgroundColor?: string
}

export async function exportToImage(
  content: string,
  options: ExportImageOptions = { format: 'png' }
): Promise<Blob> {
  const {
    format = 'png',
    quality = 0.92,
    scale = 2,
    maxWidth = 800,
    backgroundColor = '#ffffff',
  } = options

  // Convert markdown to HTML
  const storageContent = textToStorage(content)
  const bodyHtml = marked.parse(storageContent, { gfm: true, breaks: true, async: false }) as string
  const contentHtml = DOMPurify.sanitize(bodyHtml, { ADD_TAGS: ['style'], ADD_ATTR: ['data-theme', 'data-code'] })

  const theme = document.documentElement.getAttribute('data-theme') || 'light'

  // Create a temporary container
  const container = document.createElement('div')
  container.setAttribute('data-theme', theme)
  container.className = 'markdown-preview'
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${maxWidth}px;
    background: ${backgroundColor};
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
  `
  container.innerHTML = contentHtml

  // Add CSS
  const styleEl = document.createElement('style')
  styleEl.textContent = EXPORT_CSS
  container.prepend(styleEl)

  document.body.appendChild(container)

  try {
    const dataUrl = await domToImage.toPng(container, {
      quality: format === 'jpeg' ? quality : 1,
      width: maxWidth + 80, // padding
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      },
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          return !node.classList.contains('scrollbar')
        }
        return true
      },
    })

    // Convert dataUrl to Blob
    const res = await fetch(dataUrl)
    const blob = await res.blob()

    // Convert PNG to JPEG if needed
    if (format === 'jpeg' && blob.type === 'image/png') {
      return await convertToJpeg(blob, quality)
    }

    return blob
  } finally {
    document.body.removeChild(container)
  }
}

async function convertToJpeg(pngBlob: Blob, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to convert to JPEG')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(pngBlob)
  })
}

export function downloadImage(blob: Blob, fileName: string): void {
  downloadBlob(blob, fileName)
}
