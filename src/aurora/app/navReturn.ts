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
