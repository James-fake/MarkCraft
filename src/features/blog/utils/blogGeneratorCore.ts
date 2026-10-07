/**
 * Blog generator core — barrel re-export for backward compatibility
 */

export { generateBlog, downloadBlogAsZip } from './blogMultiFileGenerator'
export type { BlogFile, BlogGenerationResult } from './blogMultiFileGenerator'
export { generateSingleFileBlog } from './blogSingleFileGenerator'
