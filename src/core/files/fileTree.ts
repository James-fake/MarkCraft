// L1 core/files —— 文件树基础能力（纯函数，无 UI / 无状态）。
//
// Phase 2（2026-09-17）自 features/fileManager/fileManagerUtils.ts **原样下沉**
// （仅改文件名 + 内部 defaultDocs 引用路径，函数体未作任何改写）：
// 该文件通篇为纯函数，却被 stores(4) / services(2) / features(3) / aurora(10) 共用，
// 寄居业务模块会迫使下层反向引用上层 —— 这是环 #3 #4 #5 的共同成因。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.1。
import { FileNode, FileManagerState } from '../../types/fileManager';
import { userManualContent as userManualContentZh, markdownTutorialContent as markdownTutorialContentZh, knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '../data/defaultDocs/zh';
import { userManualContent as userManualContentEn, markdownTutorialContent as markdownTutorialContentEn, knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '../data/defaultDocs/en';
import { logger } from '../../utils/logger';

const STORAGE_KEY = 'markcraft-file-manager';
const STORAGE_VERSION = 'v5';
const MIGRATED_LINK_GUIDE_KEY = 'markcraft-migrated-link-guide';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createInitialFileTree(lang: 'zh' | 'en' = 'zh'): FileNode {
  const isEn = lang === 'en';
  const names = isEn
    ? { root: 'File Manager', folder: 'My Notes', manual: 'User Manual.md', tutorial: 'Markdown Tutorial.md', linkGuide: 'Knowledge Linking Guide.md' }
    : { root: '文件管理器', folder: '我的笔记', manual: '用户手册.md', tutorial: 'Markdown 入门教程.md', linkGuide: '知识链接体系指南.md' };
  const userManualContent = isEn ? userManualContentEn : userManualContentZh;
  const markdownTutorialContent = isEn ? markdownTutorialContentEn : markdownTutorialContentZh;
  const knowledgeLinkGuideContent = isEn ? knowledgeLinkGuideContentEn : knowledgeLinkGuideContentZh;

  return {
    id: 'root',
    name: names.root,
    type: 'folder',
    children: [
      {
        id: generateId(),
        name: names.folder,
        type: 'folder',
        children: [
          {
            id: generateId(),
            name: names.manual,
            type: 'file',
            content: userManualContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: generateId(),
            name: names.tutorial,
            type: 'file',
            content: markdownTutorialContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: generateId(),
            name: names.linkGuide,
            type: 'file',
            content: knowledgeLinkGuideContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isExpanded: true,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: true,
  };
}

export function loadState(lang: 'zh' | 'en' = 'zh'): FileManagerState {
  const initialTree = createInitialFileTree(lang);

  const defaultState: FileManagerState = {
    rootFolder: initialTree,
    tabs: [],
    activeTabId: null,
    searchQuery: '',
    sidebarVisible: true,
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
         // Migrate: add knowledge link guide if missing
         const migrated = migrateAddLinkGuide(parsed, lang);
         return migrated;
       }
     }
   } catch (error) {
     logger.error('Failed to load file manager state:', error);
   }

  return defaultState;
}

/** Check if the knowledge link guide file exists in the tree, add it if not. */
function migrateAddLinkGuide(state: FileManagerState, lang: 'zh' | 'en'): FileManagerState {
  const migrated = localStorage.getItem(MIGRATED_LINK_GUIDE_KEY);
  if (migrated) return state; // Already migrated

  const isEn = lang === 'en';
  const guideName = isEn ? 'Knowledge Linking Guide.md' : '知识链接体系指南.md';
  const guideContent = isEn ? knowledgeLinkGuideContentEn : knowledgeLinkGuideContentZh;

  // Check if file already exists
  const fileExists = (node: FileNode): boolean => {
    if (node.type === 'file' && node.name === guideName) return true;
    if (node.children) return node.children.some(fileExists);
    return false;
  };

  if (fileExists(state.rootFolder)) {
    localStorage.setItem(MIGRATED_LINK_GUIDE_KEY, '1');
    return state;
  }

  // Find the first folder to add the file into
  const addToFile = (node: FileNode): FileNode => {
    if (node.type === 'folder' && node.children) {
      // Add to the first non-root folder that has existing docs, or the first folder
      const hasDocs = node.children.some(
        c => c.type === 'file' && (c.name.includes('手册') || c.name.includes('Manual') || c.name.includes('教程') || c.name.includes('Tutorial'))
      );
      if (hasDocs || node.id === 'root') {
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
        children: node.children.map(addToFile),
      };
    }
    return node;
  };

  const newRoot = addToFile(state.rootFolder);
  localStorage.setItem(MIGRATED_LINK_GUIDE_KEY, '1');
  return { ...state, rootFolder: newRoot };
}

export function saveState(state: FileManagerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Failed to save file manager state:', error);
  }
}

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

export function updateNodeContent(root: FileNode, id: string, content: string): FileNode {
  if (root.id === id) {
    return {
      ...root,
      content,
      updatedAt: Date.now(),
    };
  }

  if (root.children) {
    return {
      ...root,
      children: root.children.map(child => updateNodeContent(child, id, content)),
    };
  }

  return root;
}

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

/** 递归收集节点树下的所有 Markdown 文件（.md）节点，供博客/白板等按文件集合派生视图 */
export function collectMarkdownFiles(node: FileNode): FileNode[] {
  if (node.type === 'file') {
    if (!node.name.toLowerCase().endsWith('.md')) return [];
    return [node];
  }
  if (!node.children) return []
  return node.children.flatMap(collectMarkdownFiles)
}

/**
 * 递归收集文件树下的全部「文件」节点（含根自身为文件的情况）。
 * 与 collectMarkdownFiles 区别：本函数不过滤扩展名，返回所有 file 节点。
 * 纯数据遍历（无 UI / store 依赖），供 dashboard / export / pwa / 各 store 共用（D4 单一数据源）。
 * 已合并此前分散在 useDashboardData / backupService / librarySync 中的同名副本。
 */
export function collectAllFiles(root: FileNode | null): FileNode[] {
  const out: FileNode[] = []
  const walk = (node: FileNode | null | undefined) => {
    if (!node) return
    if (node.type === 'file') {
      out.push(node)
      return
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(root)
  return out
}

/**
 * 收集全部文件夹 id（初始全展开用）：确保文件列表打开即可见所有层级。
 * 纯数据遍历（无 UI 依赖），供编辑器 FileTree 与白板「文件」Tab 等共用（D4 单一数据源）。
 */
export function collectFolderIds(nodes: FileNode[]): string[] {
  const ids: string[] = []
  for (const n of nodes) {
    if (n.type === 'folder') {
      ids.push(n.id)
      if (n.children) ids.push(...collectFolderIds(n.children))
    }
  }
  return ids
}

/**
 * 扁平化文件树为带 depth 的可见节点序列（供侧栏列表渲染）。
 * - depth 0 为虚拟根（自身行不渲染）；其余文件夹行始终渲染，子节点按 expanded 集合控制展开/折叠。
 * - 纯数据遍历（无 UI 依赖），供 FileTree 与白板「文件」Tab 共用。
 */
export function flattenFileTree(
  node: FileNode,
  depth: number,
  expanded: Set<string>,
): { node: FileNode; depth: number }[] {
  const out: { node: FileNode; depth: number }[] = []
  if (node.type === 'folder') {
    out.push({ node, depth })
    // depth 0 是虚拟根（自身行不渲染），其直接子级必须始终展开；其余按 expanded 控制。
    const isRoot = depth === 0
    if ((isRoot || expanded.has(node.id)) && node.children) {
      for (const child of node.children) {
        out.push(...flattenFileTree(child, depth + 1, expanded))
      }
    }
  } else {
    out.push({ node, depth })
  }
  return out
}
