/**
 * 轻量 CSS 压缩器 — 移除注释、多余空白、合并规则
 * 不使用第三方库，纯正则实现
 * 参考 clean-css 的基础压缩策略
 */

/**
 * 压缩 CSS 代码
 * @param css 原始 CSS 字符串
 * @returns 压缩后的 CSS 字符串
 */
export function minifyCss(css: string): string {
  if (!css || !css.trim()) return css

  let result = css

  // 1. 移除注释（保留 /*! ... */ 重要注释，如版权声明）
  result = result.replace(/\/\*(?!\!)[\s\S]*?\*\//g, '')

  // 2. 移除首尾空白
  result = result.trim()

  // 3. 移除选择器和大括号前后的空白
  result = result.replace(/\s*([{}:;,>~+])\s*/g, '$1')

  // 4. 移除最后一个分号（} 前的分号）
  result = result.replace(/;}/g, '}')

  // 5. 合并多个空白为一个
  result = result.replace(/\s+/g, ' ')

  // 6. 移除换行符
  result = result.replace(/\n/g, '')

  // 7. 压缩颜色 #ffffff → #fff, #aabbcc → #abc
  result = result.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3\b/g, '#$1$2$3')

  // 8. 压缩 0px / 0em / 0rem / 0% → 0（仅在非选择器上下文）
  result = result.replace(/(\D)0(px|em|rem|%|vh|vw|pt|pc|in|cm|mm)/g, '$10')

  // 9. 移除 0.5 → .5（小数前的 0 可省略）
  result = result.replace(/(\D)0\.(\d)/g, '$1.$2')

  // 10. 最终 trim
  result = result.trim()

  return result
}

/** 压缩统计信息 */
export interface CompressionStats {
  originalSize: number
  minifiedSize: number
  saved: number
  ratio: string
}

/**
 * 计算压缩前后的大小统计
 */
export function getCompressionStats(original: string, minified: string): CompressionStats {
  const originalSize = new Blob([original]).size
  const minifiedSize = new Blob([minified]).size
  return {
    originalSize,
    minifiedSize,
    saved: originalSize - minifiedSize,
    ratio: originalSize > 0 ? ((1 - minifiedSize / originalSize) * 100).toFixed(1) : '0.0',
  }
}
