// Phase 4（2026-09-18）自 features/shared/storage/ **原样迁入**（内容一字未改）。
// 定位：imageStore 的稳定接口契约（消费者依赖接口而非实现），与实现同置
// src/core/storage。6 个消费者全在 features/editor。
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
