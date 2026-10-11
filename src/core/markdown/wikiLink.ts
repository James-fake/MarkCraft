/**
 * WikiLink 的**纯函数**层（不含状态 / 不含 UI）。
 *
 * 放在 `@core` 的原因：`stores`（链接索引）与 `features`（编辑器 / Aurora 面板）两侧都要用，
 * 而 core 被两者依赖、不反向依赖任何人。原 `@stores/linkIndexShared` 的 `isInsideLink`
 * 即由此处下沉，旧路径保留 re-export，既有导入不变。
 */

/**
 * 判断 content 中 index 处的文本是否已经位于 `[[...]]` 之内。
 *
 * 判据：向前找最近的 `[[`，若它之后（到 index 之前）**没有** `]]` 收尾，则说明仍在括号内。
 */
export function isInsideLink(content: string, index: number): boolean {
  const before = content.substring(0, index)
  const lastOpen = before.lastIndexOf('[[')
  if (lastOpen === -1) return false
  const between = before.substring(lastOpen)
  // 若 `[[` 之后已有 `]]` 闭合，则当前位置不在链接内
  const closeAfterOpen = between.indexOf(']]')
  return closeAfterOpen === -1
}

/**
 * 把「未链接提及」就地转成真正的 WikiLink：`某某` → `[[某某]]`。
 *
 * 背景（2026-10-11）：链接索引早已计算 `unlinkedMentions`（正文提到了某笔记名但没加 `[[]]`），
 * 但界面上没有任何入口消费它。补上界面后需要一个**安全的改写函数**：
 * 只改**指定行**、只改**第一个尚未被链接包裹**的出现，绝不全文乱替换
 * （`String.replace` 全量替换会把正文里同名的普通词一并改掉）。
 *
 * @param content   源文件完整内容
 * @param lineNumber 目标行号（**1-based**，与 `LinkRecord.line` 一致）
 * @param target    要包裹的笔记名（不含 .md 后缀）
 * @returns 改写后的内容；若该行找不到可包裹的出现，返回 `null`（调用方据此提示/降级）
 */
export function convertMentionToLink(
  content: string,
  lineNumber: number,
  target: string,
): string | null {
  if (!target) return null
  const lines = content.split('\n')
  const lineIdx = lineNumber - 1
  if (lineIdx < 0 || lineIdx >= lines.length) return null

  const line = lines[lineIdx]
  let searchFrom = 0
  while (searchFrom <= line.length - target.length) {
    const at = line.indexOf(target, searchFrom)
    if (at === -1) break
    // ⚠️ 传「行」而非全文 —— 与既有调用方（buildLinkIndex / LinkIndexStore）保持一致：
    //    那些地方也是按行判定。传全文会因上一行未闭合的 `[[` 而误判成「已在链接内」。
    if (!isInsideLink(line, at)) {
      const nextLines = [...lines]
      nextLines[lineIdx] = `${line.slice(0, at)}[[${target}]]${line.slice(at + target.length)}`
      return nextLines.join('\n')
    }
    searchFrom = at + 1
  }
  return null
}
