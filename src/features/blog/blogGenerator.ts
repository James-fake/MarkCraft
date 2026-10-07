/**
 * Re-export from split modules for backward compatibility
 *
 * Original blogGenerator.ts has been split into:
 *   - utils/blogConvert.ts     — conversion and utility functions
 *   - utils/blogGeneratorCore.ts — main generation logic
 */

export {
  generateBlog,
  downloadBlogAsZip,
  generateSingleFileBlog,
} from './utils/blogGeneratorCore'

export type {
  BlogFile,
  BlogGenerationResult,
} from './utils/blogGeneratorCore'

export {
  extractTitleFromContent,
  inferTagsFromContent,
  inferDateFromContent,
  extractExcerpt,
  tagId,
  sectionIdFromText,
  escapeHtml,
  escapeAttr,
  formatDate,
  estimateReadingTime,
  extractToc,
} from './utils/blogConvert'
