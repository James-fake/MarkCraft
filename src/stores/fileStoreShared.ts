import type { FileNode, Tab, FileManagerState } from '../types/fileManager';
import { resolveUsageDocsScope } from '@core/files/usageDocs';

/**
 * FileStore 的类型与落盘净化纯函数层（P5-2 自主文件拆出，实现逐字未动）。
 * 均为无副作用纯函数 —— Provider 在 setState / saveState 之前调用。
 */

/** 剥掉一批标签后把 `activeTabId` 与 `isActive` 修正到仍然存在的标签上（共享逻辑，防两处漂移）。
 *  悬空 activeTabId 的界面表现是「标题栏说打开了文件、编辑区却是空的」，比不打开更糟。
 *  被剥掉的正是激活标签 → 落到最后打开的那篇永久文档；一篇不剩则回到「未打开文档」空态。 */
export function fixActiveAfterRemoval(tabs: Tab[], activeTabId: string | null): { tabs: Tab[]; activeTabId: string | null } {
  const fixedActiveId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : (tabs.length ? tabs[tabs.length - 1].id : null);
  return {
    tabs: tabs.map((tab) => ({ ...tab, isActive: tab.id === fixedActiveId })),
    activeTabId: fixedActiveId,
  };
}

/**
 * 落盘前的标签净化：**瞬态（预览）标签永不持久化**。
 *
 * 为什么必须在**落盘**这一侧拦，而不是只在「打开」时拦：
 * `saveState` 是全量 state 序列化（含 tabs / activeTabId），且在每次 state 变更后 300ms 防抖触发。
 * 于是在「正看着使用文档」的这段时间里，随时可能落盘一次 —— 若把瞬态标签一起写进去，
 * 用户刷新 / 重启后 `loadState` 会把它还原成「上次打开的文档」，正是需求要禁掉的
 * 「被记住」。故此处剥掉瞬态标签，并把 `activeTabId` 一并修正到仍然存在的标签上
 * （否则会留下一个指向不存在标签的悬空 activeTabId，界面表现是「标题栏说打开了文件、
 * 编辑区却是空的」，比不打开更糟）。
 *
 * 幂等：没有瞬态标签时原样返回（不换引用）。
 */
export function stripTransientTabs(state: FileManagerState): FileManagerState {
  if (!state.tabs.some((tab) => tab.isTransient)) return state;
  const { tabs, activeTabId } = fixActiveAfterRemoval(
    state.tabs.filter((tab) => !tab.isTransient),
    state.activeTabId,
  );
  return { ...state, tabs, activeTabId };
}

/**
 * 启动迁移：剥掉**旧版本永久落盘**的内置使用文档标签（2026-09-22 第三轮报障修复）。
 *
 * 背景：瞬态标签机制上线**之前**的版本，`openFile` 对使用文档与普通文档一视同仁 ——
 * 点开的说明书作为普通标签（无 `isTransient` 字段）随 `tabs`/`activeTabId` 整体序列化进
 * IndexedDB。升级后 `loadStateAsync` 把这份旧数据原样还原 → 编辑器直接落在这篇说明书上，
 * 表现为「点击编辑功能进入后还是显示 markcraft 使用文档」。
 *
 * 识别**不依赖** `isTransient` 字段（旧数据没有），而按判定单源 `builtinFileIds` 命中
 * `fileId` —— 与只读简介页 / 瞬态打开 / 最近文件净化同源。
 *
 * 在**两条加载路径**都要拦：① `loadStateAsync`（IndexedDB 权威树，本次报障的真实路径）；
 * ② `loadState`（localStorage 兜底，IDB 为空的老用户升级路径）—— 后者若不拦，state 会带着
 * 旧标签熬到 hydrated，再被 save effect 整份写进 IndexedDB，把脏数据「转正」。
 *
 * 水合后的 save effect（`saveState(stripTransientTabs(state))`）会把净化版回写介质 ——
 * 净化必须发生在 `setState` 之前，才能借这次回写把落盘里的旧标签一并清掉（幂等）。
 *
 * 幂等：没有命中时原样返回（不换引用）；绝不触碰 `builtinFileIds` 之外的用户文档。
 */
export function stripLegacyUsageDocTabs(state: FileManagerState): FileManagerState {
  const builtin = resolveUsageDocsScope(state.rootFolder).builtinFileIds;
  if (builtin.size === 0) return state;
  if (!state.tabs.some((tab) => builtin.has(tab.fileId))) return state;
  const { tabs, activeTabId } = fixActiveAfterRemoval(
    state.tabs.filter((tab) => !builtin.has(tab.fileId)),
    state.activeTabId,
  );
  return { ...state, tabs, activeTabId };
}

/** 节点 id → 相对路径（会话快照与重载合并都用路径做稳定标识；根节点本身返回 null） */
export function pathOfNode(root: FileNode, id: string): string | null {
  let found: string | null = null;
  const walk = (node: FileNode, prefix: string): void => {
    if (found) return;
    const rel = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.id === id) {
      found = rel;
      return;
    }
    for (const c of node.children || []) walk(c, rel);
  };
  // ⚠️ 从 children 起遍历：把 root 自身算进去会得到 `root/工作/a.md`，
  //    与 nodeByPath（从 root 的 children 起匹配）不对称，导致会话恢复/合并全部落空。
  for (const c of root.children || []) walk(c, '');
  return found;
}

/** 相对路径 → 节点（恢复标签页时用） */
export function nodeByPath(root: FileNode, rel: string): FileNode | null {
  const parts = rel.split('/');
  let cur: FileNode = root;
  for (const part of parts) {
    const next = (cur.children || []).find((c) => c.name === part);
    if (!next) return null;
    cur = next;
  }
  return cur;
}

/**
 * 外部改动触发整树 reload 时，把**确有未落盘编辑**的标签合并回新树（2026-11-03 审查 P1；
 * 2026-11-08 H-7 修正：仅 dirty 标签保留内存版本，避免覆盖外部改动导致数据丢失）。
 *
 * 竞态现场：用户输入 → state 更新 → syncTree 的 300ms 防抖未到盘 → 外部事件触发
 * reload → loadVault 读到磁盘旧内容 → setState 整树替换 → 这批编辑从 state 和磁盘
 * **双双消失**。故对**确有未落盘编辑**（`tab.isDirty`）的标签保留内存版本，
 * 并返回其新 id（调用方据此维持 isDirty，下次 save effect 写回磁盘）。
 *
 * ⚠️ 判据必须是 `isDirty`，而不是「内存内容 !== 磁盘内容」：后者无法区分
 * ① 用户主动编辑（内存比磁盘新，要保住）与 ② 纯外部改动（磁盘比内存新，要采用）。
 * 若仅凭内容差异就用内存旧内容覆盖磁盘新内容并标脏，用户在外部编辑器 / 同步盘改过的
 * .md 会被随后 save effect 用旧内容写回，外部修改永久丢失（H-7）。非 dirty 标签一律采用
 * 磁盘版本：不加入 dirtyNewIds、不标脏、不回写。
 *
 * 纯函数，不修改入参。`tabs` 只需 fileId 与可选 isDirty（便于单测）。
 */
export function mergeUnsavedEdits(
  prevRoot: FileNode,
  nextRoot: FileNode,
  tabs: Array<{ fileId: string; isDirty?: boolean }>,
): { root: FileNode; dirtyNewIds: Set<string> } {
  const dirtyNewIds = new Set<string>();
  let root = nextRoot;
  for (const tab of tabs) {
    // 只有确有未落盘编辑的标签才保留内存版本；其余（含纯外部改动）一律采用磁盘内容。
    if (!tab.isDirty) continue;
    const oldNode = findNodeById(prevRoot, tab.fileId);
    if (!oldNode || oldNode.type !== 'file') continue;
    const rel = pathOfNode(prevRoot, tab.fileId);
    if (!rel) continue;
    const newNode = nodeByPath(nextRoot, rel);
    if (!newNode || newNode.type !== 'file') continue;
    if ((oldNode.content ?? '') === (newNode.content ?? '')) continue;
    dirtyNewIds.add(newNode.id);
    root = replaceNodeContent(root, newNode.id, oldNode.content ?? '');
  }
  return { root, dirtyNewIds };
}

function findNodeById(root: FileNode, id: string): FileNode | null {
  if (root.id === id) return root;
  for (const c of root.children || []) {
    const hit = findNodeById(c, id);
    if (hit) return hit;
  }
  return null;
}

function replaceNodeContent(root: FileNode, id: string, content: string): FileNode {
  if (root.id === id) return { ...root, content };
  if (!root.children) return root;
  let changed = false;
  const children = root.children.map((c) => {
    const next = replaceNodeContent(c, id, content);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export interface FileManagerContextType {
  rootFolder: FileNode;
  /**
   * 权威文件树是否已从 IndexedDB 就位（`loadStateAsync` 已返回）。
   *
   * ⚠️ 为什么必须暴露这个信号：state 是**两阶段**初始化的 —— 同步阶段 `loadState()`
   * 在 localStorage 只有版本号时只能造一棵全新的默认树 T0，异步阶段再用 IndexedDB 的
   * 权威树**整体覆盖**。在两者之间的窗口里，任何「先建文件夹再往里放文件」的程序化
   * 写入都会落在 T0 上，随后连同 T0 一起被丢弃 —— 只留下悬空的 id（见 kbSeed 的
   * 「进库 0 篇」缺陷）。需要按树写入的调用方（如内置使用文档播种）必须等它为 true。
   */
  hydrated: boolean;
  /**
   * 当前打开的 Vault 根路径（桌面端）。浏览器 / 未选 Vault 时为 `null`。
   * 消费方据此判断「是否处于真实磁盘 Vault 模式」（如显示完整路径、启用 reveal 等）。
   */
  vaultRoot: string | null;
  /** 打开一个文件夹作为 Vault（桌面端）；浏览器无此能力 → 调用无副作用 */
  openVault: () => Promise<void>;
  /**
   * P4-D：桌面端检测到 IndexedDB 有旧笔记、尚未选 Vault 时的迁移提示。
   * `null` = 无需提示（已迁移 / 已忽略 / 无旧数据 / 浏览器环境）；`{count}` = 可迁移笔记数。
   */
  legacyMigration: { count: number } | null;
  /** 把当前 IDB 树里的全部笔记写成真实 `.md` 到用户选定文件夹并采用为 Vault（保留 IDB） */
  migrateLegacyToVault: () => Promise<void>;
  /** 忽略迁移提示（不再弹；不影响已有数据） */
  dismissLegacyMigration: () => void;
  /**
   * 目标 Vault **不可写**（Windows 只读目录最常见）或写盘中途失败。
   * 非 null 即表示「当前没在用磁盘 Vault，笔记暂存应用内部」—— UI 必须显式告警，
   * 否则就是静默数据丢失。
   */
  vaultError: { path: string } | null;
  /** 关闭不可写告警 */
  dismissVaultError: () => void;
  searchQuery: string;
  sidebarVisible: boolean;
  tabs: Tab[];
  activeTabId: string | null;

  createFile: (parentId: string, name: string, content?: string, openAfterCreate?: boolean) => string;
  createFolder: (parentId: string, name: string) => string;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  batchDeleteNodes: (ids: string[]) => void;
  toggleFolder: (id: string) => void;
  moveNode: (nodeId: string, targetParentId: string, targetIndex?: number) => boolean;
  isDescendant: (parentId: string, childId: string) => boolean;

  openFile: (fileId: string) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (fromTabId: string, toTabId: string) => void;
  closeOtherTabs: (keepTabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  /**
   * 回收全部**瞬态（预览）标签**（内置「使用文档」）—— 即「退出使用文档后编辑器不留痕」。
   * 由 `AuroraShell`（离开编辑器视图时）与 `EditorPanel`（视图内显式导航时）调用。
   */
  closeTransientTabs: () => void;

  updateFileContent: (fileId: string, content: string) => void;
  getFileContent: (fileId: string) => string | null;
  getActiveFileContent: () => string | null;
  getActiveFileId: () => string | null;

  markTabDirty: (tabId: string, isDirty: boolean) => void;
  isAnyTabDirty: () => boolean;

  setSearchQuery: (query: string) => void;
  getSearchResults: () => FileNode[];

  toggleSidebar: () => void;
}
