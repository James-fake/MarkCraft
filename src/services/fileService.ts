import { FileNode, FileManagerState } from '../types/fileManager';
import { createInitialFileTree } from '@core/files/fileTree';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '@core/data/defaultDocs/zh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '@core/data/defaultDocs/en';
import { logger } from '../utils/logger';
import { safeJsonParse } from '@utils/safeJson'
import { isFileManagerState } from '@utils/schemaGuards';
import { saveLargeData, loadLargeData, migrateToIndexedDB } from '@core/storage/migrate';

const STORAGE_KEY = 'markcraft-file-manager';
const STORAGE_VERSION = 'v5';
const MIGRATED_LINK_GUIDE_KEY = 'markcraft-migrated-link-guide-v2';

// 防抖保存到 IndexedDB
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** 防抖窗口内暂存的待写状态（卸载时据此补写，见 flushPendingSave） */
let pendingState: FileManagerState | null = null;
const SAVE_DEBOUNCE = 300;

// 启动时触发后台迁移（不阻塞 UI）
migrateToIndexedDB().catch(e => logger.error('IDB migration failed:', e));

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 读取 defaultSidebarVisible 设置（仅用于首次启动时的默认侧栏可见性） */
function readDefaultSidebarVisible(): boolean {
  const raw = localStorage.getItem('markcraft_settings')
  const parsed = raw ? safeJsonParse<{ defaultSidebarVisible?: boolean }>(raw, {}) : {}
  if (typeof parsed.defaultSidebarVisible === 'boolean') {
    return parsed.defaultSidebarVisible
  }
  return true
}

/** 从 localStorage 加载状态 */
export function loadState(lang: 'zh' | 'en' = 'zh'): FileManagerState {
  const initialTree = createInitialFileTree(lang);

  const defaultState: FileManagerState = {
    rootFolder: initialTree,
    tabs: [],
    activeTabId: null,
    searchQuery: '',
    // 首次启动时按用户设置决定侧栏是否显示
    sidebarVisible: readDefaultSidebarVisible(),
  };

  try {
    const savedVersion = localStorage.getItem(STORAGE_KEY + '-version');
    if (savedVersion !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY + '-version', STORAGE_VERSION);
      localStorage.setItem(MIGRATED_LINK_GUIDE_KEY, '1');
      return defaultState;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = safeJsonParse(saved, null as unknown as FileManagerState);
      if (isFileManagerState(parsed)) {
        return migrateAddLinkGuide(parsed, lang);
      }
    }
  } catch (error) {
    logger.error('Failed to load file manager state:', error);
  }

  return defaultState;
}

/** 检查并添加知识链接指南文件 */
function migrateAddLinkGuide(state: FileManagerState, lang: 'zh' | 'en'): FileManagerState {
  const alreadyMigrated = localStorage.getItem(MIGRATED_LINK_GUIDE_KEY);
  if (alreadyMigrated) return state;

  const isEn = lang === 'en';
  const guideName = isEn ? 'Knowledge Linking Guide.md' : '知识链接体系指南.md';
  const guideContent = isEn ? knowledgeLinkGuideContentEn : knowledgeLinkGuideContentZh;

  // 检查文件是否已存在
  const fileExists = (node: FileNode): boolean => {
    if (node.type === 'file' && (node.name === guideName || node.name === '知识链接体系指南.md' || node.name === 'Knowledge Linking Guide.md')) return true;
    if (node.children) return node.children.some(fileExists);
    return false;
  };

  if (fileExists(state.rootFolder)) {
    localStorage.setItem(MIGRATED_LINK_GUIDE_KEY, '1');
    return state;
  }

  // 找到第一个包含手册/教程文件的文件夹，将指南添加到同一文件夹
  const addGuideToFolder = (node: FileNode): FileNode => {
    if (node.type === 'folder' && node.children) {
      const hasDocs = node.children.some(
        c => c.type === 'file' && (
          c.name.includes('手册') || c.name.includes('Manual') ||
          c.name.includes('教程') || c.name.includes('Tutorial')
        )
      );
      if (hasDocs) {
        return {
          ...node,
          children: [
            ...node.children,
            {
              id: generateId(),
              name: guideName,
              type: 'file' as const,
              content: guideContent,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        };
      }
      return {
        ...node,
        children: node.children.map(addGuideToFolder),
      };
    }
    return node;
  };

  const newRoot = addGuideToFolder(state.rootFolder);
  localStorage.setItem(MIGRATED_LINK_GUIDE_KEY, '1');
  return { ...state, rootFolder: newRoot };
}

/** 异步加载状态（从 IndexedDB 优先，降级 localStorage） */
export async function loadStateAsync(lang: 'zh' | 'en' = 'zh'): Promise<FileManagerState | null> {
  try {
    const savedVersion = localStorage.getItem(STORAGE_KEY + '-version');
    if (savedVersion !== STORAGE_VERSION) return null;
    const saved = await loadLargeData(STORAGE_KEY);
    if (saved) {
      const parsed = safeJsonParse(saved, null as unknown as FileManagerState);
      if (isFileManagerState(parsed)) {
        return migrateAddLinkGuide(parsed, lang);
      }
    }
  } catch (error) {
    logger.error('Failed to load state async:', error);
  }
  return null;
}

/** 把暂存的待写状态立即落盘（无防抖）。幂等：无待写内容时零写入。 */
function writePendingNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const state = pendingState;
  if (!state) return;
  pendingState = null;
  saveLargeData(STORAGE_KEY, JSON.stringify(state)).catch(e => logger.error('IDB save failed:', e));
}

/**
 * 立即落盘挂起的变更（供「页面卸载 / 切到后台」时机调用）。
 *
 * ⚠️ 为什么必须有（E2E 报告 L-1）：`saveState` 是 **300ms 防抖**，用户若在这 300ms 内
 * 刷新或关闭标签，定时器根本不会触发 —— 这次变更**连写都没开始**，而不是「写了一半」。
 * 真机复现：新建笔记后立即 reload，文件消失（等约 2s 再刷新则正常）。
 */
export function flushPendingSave(): void {
  writePendingNow();
}

// 卸载期补写：pagehide / beforeunload / 切到后台，三条路径都覆盖（注册幂等，模块加载时一次）
let unloadFlushRegistered = false;
function registerUnloadFlush(): void {
  if (unloadFlushRegistered || typeof window === 'undefined') return;
  unloadFlushRegistered = true;
  const flush = () => flushPendingSave();
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
}
registerUnloadFlush();

/**
 * 保存状态到 IndexedDB（防抖 300ms，避免高频写入阻塞）。
 * 防抖窗口内的变更由 `flushPendingSave` 在卸载时补写，故不会丢。
 */
export function saveState(state: FileManagerState): void {
  pendingState = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writePendingNow, SAVE_DEBOUNCE);
}

/** 立即保存（无防抖，用于文件切换等关键时机） */
export function saveStateSync(state: FileManagerState): void {
  // 先作废防抖中的旧快照，避免它随后把更新的数据覆盖回旧的
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingState = null;
  saveLargeData(STORAGE_KEY, JSON.stringify(state)).catch(e => logger.error('IDB save sync failed:', e));
}

/**
 * 为「新建 / 导入」文件生成不冲突的 .md 文件名（VS Code 风格）。
 * 根目录下已有 `A.md` 时，依次尝试 `A (1).md`、`A (2).md` … 返回带 `.md` 的最终名。
 * 自 aurora/panels/editor/editorPanelShared 下沉（导入/拖拽等非 aurora 场景需复用）。
 *
 * @param extraTaken 额外的已占用文件名（可选）。用于**批量**创建场景：一次拖入多个同名文件时，
 *   `root` 快照在循环内不会更新（`createFile` 只改 store，需重渲染才反映到闭包），
 *   若只用快照判重，每个文件都会认为「不冲突」而产出重名。调用方需把本轮已生成的名字累积传入。
 */
export function uniqueFileName(root: FileNode, base: string, extraTaken?: Iterable<string>): string {
  const want = base.endsWith('.md') ? base : `${base}.md`;
  const names = new Set(
    (root.children ?? []).filter((c) => c.type === 'file').map((c) => c.name),
  );
  if (extraTaken) for (const n of extraTaken) names.add(n);
  if (!names.has(want)) return want;
  const stem = base.endsWith('.md') ? base.slice(0, -3) : base;
  let i = 1;
  while (names.has(`${stem} (${i}).md`)) i++;
  return `${stem} (${i}).md`;
}

/** 在文件树中查找节点 */
export function findNode(root: FileNode, id: string): FileNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** 查找节点的父节点 */
export function findParentNode(root: FileNode, id: string): FileNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParentNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** 更新节点内容 */
export function updateNodeContent(root: FileNode, id: string, content: string): FileNode {
  if (root.id === id) {
    return { ...root, content, updatedAt: Date.now() };
  }
  if (root.children) {
    return { ...root, children: root.children.map(child => updateNodeContent(child, id, content)) };
  }
  return root;
}

/** 搜索文件 */
export function searchFiles(root: FileNode, query: string): FileNode[] {
  const results: FileNode[] = [];
  const searchLower = query.toLowerCase();
  const searchRecursive = (node: FileNode) => {
    if (node.type === 'file' && node.name.toLowerCase().includes(searchLower)) {
      results.push(node);
    }
    if (node.children) {
      node.children.forEach(searchRecursive);
    }
  };
  searchRecursive(root);
  return results;
}

/** 递归更新节点 */
export function updateNode(root: FileNode, id: string, updater: (node: FileNode) => FileNode): FileNode {
  if (root.id === id) return updater(root);
  if (root.children) {
    return { ...root, children: root.children.map(child => updateNode(child, id, updater)) };
  }
  return root;
}

/** 递归删除节点 */
export function deleteNodeRecursive(root: FileNode, id: string): FileNode {
  if (root.children) {
    return {
      ...root,
      children: root.children
        .filter(child => child.id !== id)
        .map(child => deleteNodeRecursive(child, id)),
    };
  }
  return root;
}

/** 添加子节点 */
export function addChildNode(root: FileNode, parentId: string, newNode: FileNode): FileNode {
  if (root.id === parentId) {
    const children = root.children || [];
    const maxOrder = children.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
    const nodeWithOrder = { ...newNode, order: newNode.order ?? maxOrder + 1 };
    return { ...root, children: [...children, nodeWithOrder], isExpanded: true };
  }
  if (root.children) {
    // V4-M4: Also expand the target parent folder when found in nested children
    const newChildren = root.children.map(child => addChildNode(child, parentId, newNode));
    const found = root.children.some(child => child.id === parentId || findNode(child, parentId));
    return { ...root, children: newChildren, isExpanded: found ? true : root.isExpanded };
  }
  return root;
}

/**
 * 将某个父节点下的直接子节点按当前数组顺序重新编号 order（1..n）。
 * 用于移动/插入/删除后保持手动排序的连续性。
 */
export function renumberChildrenOrder(root: FileNode, parentId: string): FileNode {
  return updateNode(root, parentId, (parent) => {
    if (!parent.children || parent.children.length === 0) return parent;
    const children = parent.children.map((child, i) => ({ ...child, order: i + 1 }));
    return { ...parent, children };
  });
}

/**
 * 文件/文件夹排序：folder 优先，其次按 order 升序（无 order 的旧节点排末尾），
 * 同 order 时按创建时间维持稳定顺序。用于侧栏文件树展示。
 */
export function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.createdAt - b.createdAt;
  });
}

/** 收集节点下所有文件 ID */
export function collectFileIds(node: FileNode): string[] {
  const ids: string[] = [];
  if (node.type === 'file') ids.push(node.id);
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectFileIds(child));
    }
  }
  return ids;
}

/** 检查是否为后代节点 */
export function isDescendantOf(root: FileNode, parentId: string, childId: string): boolean {
  const parentNode = findNode(root, parentId);
  if (!parentNode || !parentNode.children) return false;
  const checkChildren = (node: FileNode): boolean => {
    if (node.id === childId) return true;
    if (node.children) return node.children.some(checkChildren);
    return false;
  };
  return parentNode.children.some(checkChildren);
}

/** 查找父节点 ID */
export function findParentId(root: FileNode, targetId: string): string | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === targetId) return root.id;
      const found = findParentId(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
