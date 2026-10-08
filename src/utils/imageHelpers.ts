import { platform } from '@platform'

export interface ImageMarkRange {
  start: number
  end: number
  alt: string
  url: string
  isBase64: boolean
  isPlaceholder: boolean
}

export function findImageMarkRange(content: string, cursorPos: number): ImageMarkRange | null {
  if (cursorPos < 0 || cursorPos > content.length) return null

  const imgRegex = /!\[([^\]]*)\]\(([^)]*)\)/g
  let match: RegExpExecArray | null

  while ((match = imgRegex.exec(content)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (cursorPos >= start && cursorPos <= end) {
      const isPlaceholder = match[2].startsWith('image:')
      return {
        start,
        end,
        alt: match[1],
        url: match[2],
        isBase64: match[2].startsWith('data:'),
        isPlaceholder,
      }
    }
  }

  return null
}

export function findAllBase64Images(content: string): ImageMarkRange[] {
  const images: ImageMarkRange[] = []
  const imgRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = imgRegex.exec(content)) !== null) {
    images.push({
      start: match.index,
      end: match.index + match[0].length,
      alt: match[1],
      url: match[2],
      isBase64: true,
      isPlaceholder: false,
    })
  }

  return images
}

export function extractBase64Info(dataUrl: string): { mimeType: string; base64: string; extension: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1]
  const base64 = match[2]

  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  }

  return {
    mimeType,
    base64,
    extension: extMap[mimeType] || 'png',
  }
}

export async function saveBase64ToFile(
  dataUrl: string,
  suggestedName: string
): Promise<{ filePath: string; fileName: string } | null> {
  const info = extractBase64Info(dataUrl)
  if (!info) return null

  const target = await platform.pickSaveFile({
    suggestedName: suggestedName || `image.${info.extension}`,
    types: [{
      description: 'Image file',
      accept: { [info.mimeType]: [`.${info.extension}`] },
    }],
  })
  // 能力不可用或用户取消 → null（调用方据此回退）
  if (!target) return null

  const binaryStr = atob(info.base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  await target.write(new Blob([bytes], { type: info.mimeType }))

  return {
    filePath: target.name,
    fileName: target.name,
  }
}

export function base64SizeInBytes(dataUrl: string): number {
  const info = extractBase64Info(dataUrl)
  if (!info) return 0
  return Math.ceil(info.base64.length * 3 / 4)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
