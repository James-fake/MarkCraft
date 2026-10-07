/**
 * Hash utility functions for MarkCraft
 * Centralizes all hash implementations to eliminate duplication
 */

/**
 * djb2 hash algorithm
 * Standard implementation: initial value 5381, bit operation (hash << 5) + hash
 * Used for image deduplication, undo/redo snapshot caching
 */
export function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return hash
}

/** djb2 hash, returns base-36 string representation */
export function djb2HashToString(str: string): string {
  return (djb2Hash(str) >>> 0).toString(36)
}

/**
 * Simple hash (for Mermaid cache and other non-security scenarios)
 * Note: This algorithm differs from djb2 — initial value is 0, operation is (hash << 5) - hash
 * Preserved for Mermaid cache key compatibility
 */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}
