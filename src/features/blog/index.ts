// blog module — public API (barrel)

export * from './blogGenerator'
export * from './BlogModal'
export * from './BlogStudio'
export * from './templates'
export * from './themes'

// Explicit re-exports to resolve ambiguous `export *` collisions (helpers
// re-exported from multiple sibling modules). Canonical source: blogGenerator.
export { escapeHtml, escapeAttr, tagId } from './blogGenerator'
