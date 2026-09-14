import { FileNode, FileManagerState } from '../types/fileManager';
import { createInitialFileTree } from '../features/fileManager/fileManagerUtils';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '../features/fileManager/defaultDocsZh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '../features/fileManager/defaultDocsEn';
import { logger } from '../utils/logger';
import { saveLargeData, loadLargeData, migrateToIndexedDB } from '../stores/storage/migrate';

const STORAGE_KEY = 'markcraft-file-manager';
const STORAGE_VERSION = 'v5';
const MIGRATED_LINK_GUIDE_KEY = 'markcraft-migrated-link-guide-v2';

// 防抖保存到 IndexedDB
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE = 300;

// 启动时触发后台迁移（不阻塞 UI）
migrateToIndexedDB().catch(e => logger.error('IDB migration failed:', e));

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 读取 defaultSidebarVisible 设置（仅用于首次启动时的默认侧栏可见性） */
function readDefaultSidebarVisible(): boolean {
  try {
    const raw = localStorage.getItem('markcraft_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.defaultSidebarVisible === 'boolean') {
        return parsed.defaultSidebarVisible
      }
    }
  } catch {}
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
      const parsed = JSON.parse(saved) as FileManagerState;
      if (parsed.rootFolder && parsed.rootFolder.children && parsed.rootFolder.children.length > 0) {
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
      const parsed = JSON.parse(saved) as FileManagerState;
      if (parsed.rootFolder && parsed.rootFolder.children && parsed.rootFolder.children.length > 0) {
        return migrateAddLinkGuide(parsed, lang);
      }
    }
  } catch (error) {
    logger.error('Failed to load state async:', error);
  }
  return null;
}

/** 保存状态到 IndexedDB（防抖 300ms，避免高频写入阻塞） */
export function saveState(state: FileManagerState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = JSON.stringify(state);
    saveLargeData(STORAGE_KEY, data).catch(e => logger.error('IDB save failed:', e));
  }, SAVE_DEBOUNCE);
}

/** 立即保存（无防抖，用于文件切换等关键时机） */
export function saveStateSync(state: FileManagerState): void {
  const data = JSON.stringify(state);
  saveLargeData(STORAGE_KEY, data).catch(e => logger.error('IDB save sync failed:', e));
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
