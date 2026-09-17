// aurora/navigation —— 跨面板「返回来源」导航上下文（模块级单例，零依赖）。
//
// Phase 3（2026-09-18）自 aurora/app/navReturn.ts **原样搬迁**（内容零改动）：
// 它被 panels 的 3 处源码（EditorPanel / GraphPanel / KbPanel）消费，
// 寄居 aurora/app 会构成 panels → app 反向边 —— 即环 #7 #8 的成因边。
// 归入 navigation 层后，app / panels / components 三者均可向下引用，不再成环。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 3.1。
/**
 * 编辑器「返回来源」上下文
 * 当从其他面板（知识库笔记 / 双链图谱节点）跳转进编辑器时，记录来源视图，
 * 编辑器据此显示「← 返回 XX」芯片，点击后跳回来源面板。
 * 采用模块级单例（与 BlogPanel 的 setBlogEntryFileId 同源模式），
 * 避免改动 nav() 签名即可传递回跳上下文。
 */
export interface EditorReturnContext {
  /** 来源路由 id（如 'graph'）；带 kbId 时优先回知识库详情 */
  view: string
  kbId?: string
  /** 芯片上的中文名（如「甲库」「双链图谱」） */
  label: string
}

let editorReturn: EditorReturnContext | null = null

export function setEditorReturn(ctx: EditorReturnContext | null): void {
  editorReturn = ctx
}

export function getEditorReturn(): EditorReturnContext | null {
  return editorReturn
}

export function clearEditorReturn(): void {
  editorReturn = null
}
