/**
 * 知识库详情页「Tab 现场」记忆（模块级单例）
 * ==========================================================================
 * 为什么需要（2026-09-22 第六轮报障）：
 *   「在 MarkCraft 使用文档知识库中点击笔记，没能进入对应界面，而是直接回到了知识库
 *     详细界面的概览页面中。」
 *   真机链路：知识库详情（笔记 Tab）→ 点笔记 → 编辑器只读简介页 → 点「← 返回 XX」→
 *   落回知识库详情，但 Tab **复位成「概览」**。根因：KbPanel 的 Tab 是组件内 useState，
 *   AuroraShell 按 view 切换渲染（无 keep-alive）→ KB → 编辑器 → KB 的往返中 KbPanel
 *   整体卸载重挂，用户离开时所在的 Tab（如「笔记」）随之丢失，表现为「我明明在笔记里
 *   点的，回来却掉进概览」。
 *
 * 语义范围严格限定为「用户最后一次停留的 Tab」（每库各记一份），与 graphSession 的
 * 「空间现场」同属**会话级现场**：刷新页面即清空（与 `#view=` 不带参数的既有约定一致），
 * 不落盘、不入 IndexedDB。
 *
 * 采用模块级单例（与 navigation/navReturn.ts、kb/graphSession.ts、BlogPanel 的来源
 * 文件 id 同源模式），避免为传递返回上下文而改动 nav() 签名。
 */
import type { KbTab } from './KbPanel'

/**
 * 记「哪一库的哪个 Tab」。键用**面板收到的 kbId 参数**（可能为空串 = 未带参数、
 * 由面板自行取列表首项）—— 与「← 返回 XX」回跳时 `nav('kb', kbId)` 传入的值同源，
 * 故往返两侧的键必然一致。
 */
let session: { kbId: string; tab: KbTab } | null = null

/** 读取记忆的 Tab；kbId 不匹配（换了另一个库）视为无记忆 → 返回 null 由调用方兜底 */
export function readKbTab(kbId: string | undefined): KbTab | null {
  if (!session) return null
  if ((kbId ?? '') !== session.kbId) return null
  return session.tab
}

/** 记住当前 Tab（用户每次切换都写；同一库覆盖，换库则另记一份） */
export function saveKbTab(kbId: string | undefined, tab: KbTab): void {
  session = { kbId: kbId ?? '', tab }
}

/** 仅供测试/极端场景使用：清空记忆 */
export function clearKbTab(): void {
  session = null
}
