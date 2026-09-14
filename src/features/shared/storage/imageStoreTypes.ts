/**
 * Stable interface for the image store module.
 *
 * Provides a contract for image placeholder management,
 * enabling consumers to depend on the interface rather
 * than the concrete implementation.
 */

export interface ImageStoreAPI {
  storeBase64Image: (base64DataUrl: string) => string
  getBase64Image: (imageId: string) => string | undefined
  createPlaceholderUrl: (imageId: string) => string
  isImagePlaceholder: (url: string) => boolean
  getPlaceholderId: (url: string) => string | null
  textToStorage: (markdown: string) => string
  textFromStorage: (markdown: string) => string
}
