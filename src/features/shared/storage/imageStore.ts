import { djb2HashToString } from '@utils/hash'

const IMAGE_STORE = new Map<string, string>()
const BASE64_HASH_MAP = new Map<string, string>()
const RELATIVE_PATH_MAP = new Map<string, string>() // relativePath -> imageId
let nextId = 1

export function storeBase64Image(base64DataUrl: string): string {
  const hash = djb2HashToString(base64DataUrl)
  const existingId = BASE64_HASH_MAP.get(hash)
  if (existingId && IMAGE_STORE.get(existingId) === base64DataUrl) {
    return existingId
  }
  const id = `img_${nextId++}`
  IMAGE_STORE.set(id, base64DataUrl)
  BASE64_HASH_MAP.set(hash, id)
  return id
}

export function getBase64Image(imageId: string): string | undefined {
  return IMAGE_STORE.get(imageId)
}

export function removeBase64Image(imageId: string): void {
  IMAGE_STORE.delete(imageId)
}

export function isImagePlaceholder(url: string): boolean {
  return url.startsWith('image:')
}

export function getPlaceholderId(url: string): string | null {
  if (!isImagePlaceholder(url)) return null
  return url.substring(6)
}

export function createPlaceholderUrl(imageId: string): string {
  return `image:${imageId}`
}

// H1: Global cleanup function — call when closing tabs or all tabs
export function cleanupAllImages(): void {
  IMAGE_STORE.clear()
  BASE64_HASH_MAP.clear()
  // V4-H2: Don't reset nextId to avoid ID collision with stale references
}

// H1: Cleanup images not referenced by any of the given file contents
export function cleanupImagesForMultipleFiles(fileContents: string[]): void {
  const usedIds = new Set<string>()
  const regex = /!\[([^\]]*)\]\(image:([^)]+)\)/g

  for (const text of fileContents) {
    let match
    while ((match = regex.exec(text)) !== null) {
      usedIds.add(match[2])
    }
  }

  for (const id of IMAGE_STORE.keys()) {
    if (!usedIds.has(id)) {
      IMAGE_STORE.delete(id)
      // V4-L1: Also clean up BASE64_HASH_MAP for deleted images
      for (const [hash, storedId] of BASE64_HASH_MAP.entries()) {
        if (storedId === id) {
          BASE64_HASH_MAP.delete(hash)
        }
      }
    }
  }
}

export function textToDisplay(text: string): string {
  return text.replace(
    /!\[([^\]]*)\]\(data:image\/[^)]+\)/g,
    (_match, alt) => `![${alt}](🖼️)`
  )
}

export function textToStorage(text: string): string {
  return text.replace(
    /!\[([^\]]*)\]\(image:([^)]+)\)/g,
    (_match, alt, imageId) => {
      const base64Data = IMAGE_STORE.get(imageId)
      if (base64Data) {
        return `![${alt}](${base64Data})`
      }
      return `![${alt}](${imageId})`
    }
  )
}

export function textFromStorage(text: string): string {
  return text.replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
    (_match, alt, dataUrl) => {
      const imageId = storeBase64Image(dataUrl)
      return `![${alt}](image:${imageId})`
    }
  )
}

export function cleanupOrphanedImages(text: string): void {
  const usedIds = new Set<string>()
  const regex = /!\[([^\]]*)\]\(image:([^)]+)\)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    usedIds.add(match[2])
  }

  for (const id of IMAGE_STORE.keys()) {
    if (!usedIds.has(id)) {
      IMAGE_STORE.delete(id)
    }
  }
}

export function getAllImageEntries(): { imageId: string; data: string }[] {
  const entries: { imageId: string; data: string }[] = []
  for (const [imageId, data] of IMAGE_STORE.entries()) {
    entries.push({ imageId, data })
  }
  return entries
}

import type { ImageStoreAPI } from './imageStoreTypes'

/** Typed API object conforming to ImageStoreAPI interface */
export const imageStore: ImageStoreAPI = {
  storeBase64Image,
  getBase64Image,
  createPlaceholderUrl,
  isImagePlaceholder,
  getPlaceholderId,
  textToStorage,
  textFromStorage,
}

// Relative path mapping functions
export function registerRelativePath(relativePath: string, imageId: string): void {
  RELATIVE_PATH_MAP.set(relativePath, imageId)
}

export function getImageIdByRelativePath(relativePath: string): string | undefined {
  return RELATIVE_PATH_MAP.get(relativePath)
}

export function isRelativeImagePath(url: string): boolean {
  return url.startsWith('assets/') || RELATIVE_PATH_MAP.has(url)
}
