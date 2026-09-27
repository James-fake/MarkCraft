/**
 * 博客「单篇发布」入口通道（P2-1 panel→panel 解耦，2026-09-28）。
 *
 * 背景：编辑器「发布为博客」（右栏辅助 Tab / 标签右键菜单 / ⌘K）需要把一个目标文件 id
 * 带给尚未挂载的博客面板。此前该标记是 **BlogPanel 的模块级变量**，导致
 * `aurora/panels/editor/EditorPanel → aurora/panels/blog/BlogPanel` 这条**面板横向 import**
 * （审计中唯一的业务性 panel→panel 边）——两个平级面板因此产生编译期耦合，
 * 谁改文件名/拆文件都会波及对方。
 *
 * 解法：把通道下沉到 services 层（零依赖、无 React、无 store），两端各自依赖它：
 *   生产者 EditorPanel  → setBlogEntryFileId(id) + nav(博客)
 *   消费者 BlogPanel    → peekBlogEntryFileId() / clearBlogEntryFileId()
 *
 * 为何是「模块级变量」而非 store：这是一个**一次性、消费即清除的导航意图**，
 * 不是需要订阅/持久化的应用状态；放进 store 会引入订阅开销且需要额外的清理时机。
 */

let blogEntryFileId: string | null = null

/** 生产者：编辑器「发布为博客」写入目标文件 id（随后跳转博客面板）。 */
export function setBlogEntryFileId(id: string | null): void {
  blogEntryFileId = id
}

/** 消费者：读取当前入口目标（不清除，供渲染期/effect 内多次判定）。 */
export function peekBlogEntryFileId(): string | null {
  return blogEntryFileId
}

/** 消费者：确认已接管该意图后清除，避免重复生效。 */
export function clearBlogEntryFileId(): void {
  blogEntryFileId = null
}

/** 测试用：重置通道（避免用例间互相污染）。 */
export function __resetBlogEntryFileIdForTest(): void {
  blogEntryFileId = null
}
