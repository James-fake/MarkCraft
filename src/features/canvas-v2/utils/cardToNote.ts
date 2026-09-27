/**
 * 卡片 → 笔记（「便签转笔记」）的**纯规划函数**（无 UI / 无 store 依赖）
 * ==========================================================================
 * 需求（用户 2026-09-27）：白板自由便签此前没有「转成真实笔记文件」的路径 ——
 * 便签内容只存在画布里，与文件管理器完全无关。本模块给出转换的**规划**部分：
 *   · 标题 = 卡片首行（复用 engine/cardHelpers#getCardTitle：去 Markdown 装饰、截 40 字）；
 *   · 文件名 = 标题 + `.md`（复用 #safeNoteName：去非法字符，空回退「未命名笔记」）；
 *   · 同级去重：与目标文件夹已有节点重名（大小写不敏感）时递增「 (2)」，
 *     镜像编辑器 FileTree 行内重命名的同名策略；
 *   · 内容 = 卡片全文（markdown 原文，不做改写）。
 * 编排部分（读选中卡片 → createFile → 回写 fileId → toast）在 CanvasPanel；
 * 本文件保持纯函数可单测，依赖全部显式传参。
 */
import { getCardTitle, safeNoteName } from '../engine/cardHelpers'

export interface CardToNotePlan {
  /** 最终文件名（含 .md，已对 existingNames 去重） */
  fileName: string
  /** 笔记内容 = 卡片全文（markdown 原文） */
  content: string
}

/**
 * 规划一次「卡片 → 笔记」转换。
 * @param text 卡片全文
 * @param existingNames 目标文件夹下已有节点名（文件/文件夹都算，大小写不敏感比对）。
 *   批量转换时调用方须把**本批次已创建的名字**也并入（每次转换后追加），避免同批撞名。
 */
export function cardToNotePlan(text: string, existingNames: Iterable<string>): CardToNotePlan {
  const title = getCardTitle(text)
  const base = safeNoteName(title) // 空卡回退「未命名笔记」
  const taken = new Set([...existingNames].map((n) => n.toLowerCase()))
  let fileName = `${base}.md`
  let i = 2
  while (taken.has(fileName.toLowerCase())) {
    fileName = `${base} (${i}).md`
    i++
  }
  return { fileName, content: text ?? '' }
}
