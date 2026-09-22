import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, Tab, FileManagerState } from '../types/fileManager';
import { loadState, loadStateAsync, saveState, generateId, findNode, updateNodeContent, searchFiles, updateNode, deleteNodeRecursive, addChildNode, renumberChildrenOrder, collectFileIds, isDescendantOf, findParentId } from '../services/fileService';
import { useLanguage } from './LanguageStore';
import { useUndoRedo } from './UndoRedoStore';
import { addRecentFile, removeRecentFile } from '@core/files/recentFiles';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '@core/data/defaultDocs/zh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '@core/data/defaultDocs/en';

interface FileManagerContextType {
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

const FileManagerContext = createContext<FileManagerContextType | undefined>(undefined);

export const FileManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const undoRedo = useUndoRedo();

  const [state, setState] = useState<FileManagerState>(() => loadState(language));
  // 「权威树是否就位」——初始 false；loadStateAsync 返回后置 true（无论有没有读到树）。
  // 该窗口内 state 可能只是 T0（同步兜底树），故：① 不可据此做程序化写入（会落在随后
  // 被丢弃的幽灵节点上）；② 不可回存 IDB（会以 T0 覆盖用户真实的旧树）。
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state)
  stateRef.current = state

  // 启动后异步从 IndexedDB 加载最新数据（覆盖 localStorage 的同步初始值）
  useEffect(() => {
    let cancelled = false
    loadStateAsync(language).then(asyncState => {
      if (cancelled) return
      if (asyncState) setState(asyncState)
      // 无论读没读到，都算「水合完成」：读不到时 T0 本身就是应然状态（新用户首启 / 版本升级重建）
      setHydrated(true)
      console.info('[FileStore] hydrated=true；来源 =', asyncState ? 'IndexedDB 权威树' : '无（新用户首启或已清空，沿用同步树）')
    })
    return () => { cancelled = true }
  }, [language])

  // 自动保存状态
  // ⚠️ hydrated 之前不回存：此时 state 可能还是 T0，早于 IndexedDB 读取返回写入会**覆盖
  //    用户真实的旧树**（比「进库 0 篇」更严重的静默数据丢失）。读取结束后立即恢复保存。
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  // 一次性迁移：添加知识链接体系指南
  useEffect(() => {
    const MIGRATION_KEY = 'markcraft-link-guide-added';
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const isEn = language === 'en';
    const guideName = isEn ? 'Knowledge Linking Guide.md' : '知识链接体系指南.md';

    // 检查是否已存在
    const checkExists = (node: FileNode): boolean => {
      if (node.type === 'file' && (node.name === guideName || node.name === '知识链接体系指南.md' || node.name === 'Knowledge Linking Guide.md')) return true;
      return node.children?.some(checkExists) ?? false;
    };

    if (checkExists(state.rootFolder)) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    // 找到包含内置文档的文件夹
    const guideContent = isEn ? knowledgeLinkGuideContentEn : knowledgeLinkGuideContentZh;
    const newFileId = generateId();

    const addGuide = (node: FileNode): FileNode => {
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
            children: [...node.children, {
              id: newFileId,
              name: guideName,
              type: 'file' as const,
              content: guideContent,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }],
          };
        }
        return { ...node, children: node.children.map(addGuide) };
      }
      return node;
    };

    setState(prev => ({ ...prev, rootFolder: addGuide(prev.rootFolder) }));
    localStorage.setItem(MIGRATION_KEY, '1');
  }, []); // 只运行一次

  // --- Tab methods (merged from TabStore) ---

  // V6-L3: Move setActiveTabId out of setState updater to avoid side effects in updater
  /**
   * 打开（或切到）某个文件的标签页。
   *
   * 🚨 铁律：**新状态必须在同一个 updater 里一次算完**（含 `activeTabId`）。
   *    旧实现把「找/建标签」与「设 activeTabId」拆成两次 `setState`，中间靠一个
   *    `let newActiveTabId` 旁路变量传值 —— 而 `setState(updater)` 的 updater 只在
   *    **渲染期**才运行，只有 React 的「急切求值」（该 fiber 队列为空）才会让它同步跑一次。
   *    一旦该 fiber 上还有未处理的更新（React 18 自动批处理、或高负载/测试下的调度延迟），
   *    急切求值被跳过 ⇒ 变量仍是 `null` ⇒ **第二次 setState 被整段跳过 ⇒ activeTabId 不更新**。
   *    症状：「点一个已经在标签栏里打开的文件，没有切过去」，且 `isActive` 标记与
   *    `activeTabId` 互相矛盾（由 `usageDocBrief.test.tsx` 用例 8 在高负载整跑下抓出：
   *    内置说明书的 tab `isActive=true`，但 `activeTabId` 仍指向另一篇笔记 → 渲染了错误文档）。
   */
  const openFile = useCallback((fileId: string) => {
    setState(prev => {
      const existingTab = prev.tabs.find(tab => tab.fileId === fileId);

      if (existingTab) {
        // 已经一致就原样返回（避免无谓重渲染）；不一致则一次性把两者都纠正过来。
        const alreadyConsistent =
          prev.activeTabId === existingTab.id &&
          prev.tabs.every(tab => tab.isActive === (tab.id === existingTab.id))
        if (alreadyConsistent) return prev
        return {
          ...prev,
          activeTabId: existingTab.id,
          tabs: prev.tabs.map(tab => ({
            ...tab,
            isActive: tab.id === existingTab.id,
          })),
        };
      }

      const fileNode = findNode(prev.rootFolder, fileId);
      if (!fileNode || fileNode.type !== 'file') return prev;

      const newTab: Tab = {
        id: generateId(),
        fileId,
        name: fileNode.name,
        isActive: true,
      };

      return {
        ...prev,
        tabs: [
          ...prev.tabs.map(tab => ({ ...tab, isActive: false })),
          newTab,
        ],
        activeTabId: newTab.id,
      };
    });

    // Add to recent files（纯副作用，留在 updater 之外）
    const fileNode = findNode(stateRef.current.rootFolder, fileId);
    if (fileNode && fileNode.type === 'file') {
      addRecentFile(fileId, fileNode.name);
    }
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const updatedTabs = prev.tabs.filter(tab => tab.id !== tabId);
      const wasActive = prev.tabs.find(t => t.id === tabId)?.isActive ?? false;
      let newActiveTabId: string | null = prev.activeTabId;

      if (wasActive && updatedTabs.length > 0) {
        newActiveTabId = updatedTabs[0].id;
      } else if (wasActive) {
        newActiveTabId = null;
      }

      return {
        ...prev,
        tabs: updatedTabs.map(tab => ({
          ...tab,
          isActive: tab.id === newActiveTabId,
        })),
        activeTabId: newActiveTabId,
        // 关闭最后一个标签页时自动收起侧边栏
        sidebarVisible: updatedTabs.length === 0 ? false : prev.sidebarVisible,
      };
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    setState(prev => ({
      ...prev,
      tabs: [],
      activeTabId: null,
      // 关闭所有标签页时自动收起侧边栏
      sidebarVisible: false,
    }));
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
      activeTabId: tabId,
    }));
  }, []);

  const reorderTabs = useCallback((fromTabId: string, toTabId: string) => {
    setState(prev => {
      const fromIdx = prev.tabs.findIndex(t => t.id === fromTabId);
      const toIdx = prev.tabs.findIndex(t => t.id === toTabId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const newTabs = [...prev.tabs];
      const [moved] = newTabs.splice(fromIdx, 1);
      newTabs.splice(toIdx, 0, moved);
      return { ...prev, tabs: newTabs };
    });
  }, []);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    setState(prev => {
      const keepTab = prev.tabs.find(t => t.id === keepTabId);
      if (!keepTab) return prev;
      return {
        ...prev,
        tabs: [{ ...keepTab, isActive: true }],
        activeTabId: keepTabId,
      };
    });
  }, []);

  const closeTabsToRight = useCallback((tabId: string) => {
    setState(prev => {
      const idx = prev.tabs.findIndex(t => t.id === tabId);
      if (idx === -1) return prev;
      const newTabs = prev.tabs.slice(0, idx + 1);
      const activeTabStillExists = newTabs.some(t => t.isActive);
      return {
        ...prev,
        tabs: activeTabStillExists ? newTabs : newTabs.map((t, i) => ({ ...t, isActive: i === newTabs.length - 1 })),
        activeTabId: activeTabStillExists ? prev.activeTabId : newTabs[newTabs.length - 1].id,
      };
    });
  }, []);

  const updateTabName = useCallback((fileId: string, name: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.fileId === fileId) {
          return { ...tab, name };
        }
        return tab;
      }),
    }));
  }, []);

  // V4-M8: Directly update state instead of returning values
  const removeTabsByFileIds = useCallback((fileIds: string[]) => {
    setState(prev => {
      const updatedTabs = prev.tabs.filter(tab => !fileIds.includes(tab.fileId));
      const activeTab = prev.tabs.find(tab => tab.isActive);
      let newActiveTabId: string | null = null;

      if (activeTab && fileIds.includes(activeTab.fileId)) {
        newActiveTabId = updatedTabs.length > 0 ? updatedTabs[0].id : null;
      } else if (activeTab) {
        newActiveTabId = activeTab.id;
      }

      return {
        ...prev,
        tabs: updatedTabs.map(tab => ({
          ...tab,
          isActive: tab.id === newActiveTabId,
        })),
        activeTabId: newActiveTabId,
      };
    });
  }, []);

  // --- File methods ---

  const createFile = useCallback((parentId: string, name: string, content: string = '', openAfterCreate = true): string => {
    const newFile: FileNode = {
      id: generateId(),
      name: name.endsWith('.md') ? name : `${name}.md`,
      type: 'file',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // V5-M3: Compute newRoot inside setState and use it for openFile
    setState(prev => {
      const newRoot = addChildNode(prev.rootFolder, parentId, newFile);
      if (openAfterCreate) {
        setTimeout(() => {
          openFile(newFile.id);
        }, 0);
        // 新文件创建时默认隐藏侧边栏，保持纯净的编辑区域
        return { ...prev, rootFolder: newRoot, sidebarVisible: false };
      }
      return { ...prev, rootFolder: newRoot };
    });
    // 通知 UI 层隐藏大纲等其他面板
    if (openAfterCreate) {
      window.dispatchEvent(new CustomEvent('markcraft:new-file-created'));
    }
    return newFile.id;
  }, [openFile]);

  const createFolder = useCallback((parentId: string, name: string) => {
    const newFolder: FileNode = {
      id: generateId(),
      name,
      type: 'folder',
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpanded: true,
    };

    setState(prev => ({
      ...prev,
      rootFolder: addChildNode(prev.rootFolder, parentId, newFolder),
    }));
    return newFolder.id;
  }, []);

  const renameNode = useCallback((id: string, newName: string) => {
    setState(prev => {
      const updatedRoot = updateNode(prev.rootFolder, id, node => ({
        ...node,
        name: node.type === 'file' && !newName.endsWith('.md') ? `${newName}.md` : newName,
        updatedAt: Date.now(),
      }));

      const fileNode = findNode(updatedRoot, id);
      if (fileNode) {
        updateTabName(id, fileNode.name);
      }

      return {
        ...prev,
        rootFolder: updatedRoot,
      };
    });
  }, [updateTabName]);

  const deleteNode = useCallback((id: string) => {
    // V5-H3+M4: Move side effects out of setState updater and clean up undo/redo history
    const nodeToDelete = findNode(stateRef.current.rootFolder, id);
    const fileIdsToRemove = nodeToDelete
      ? (nodeToDelete.type === 'folder' ? collectFileIds(nodeToDelete) : [id])
      : [id];

    // Execute side effects before state update
    removeTabsByFileIds(fileIdsToRemove);
    fileIdsToRemove.forEach(fid => undoRedo.removeFileHistory(fid));
    fileIdsToRemove.forEach(fid => removeRecentFile(fid));

    setState(prev => ({
      ...prev,
      rootFolder: deleteNodeRecursive(prev.rootFolder, id),
    }));
  }, [removeTabsByFileIds, undoRedo]);

  const batchDeleteNodes = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    // 收集所有要删除的文件 ID（包括文件夹内的文件）
    const allFileIdsToRemove: string[] = [];
    ids.forEach(id => {
      const nodeToDelete = findNode(stateRef.current.rootFolder, id);
      if (nodeToDelete) {
        if (nodeToDelete.type === 'folder') {
          allFileIdsToRemove.push(...collectFileIds(nodeToDelete));
        } else {
          allFileIdsToRemove.push(id);
        }
      }
    });

    // 清理标签页和撤销/重做历史
    removeTabsByFileIds(allFileIdsToRemove);
    allFileIdsToRemove.forEach(fid => undoRedo.removeFileHistory(fid));
    allFileIdsToRemove.forEach(fid => removeRecentFile(fid));

    // 逐个删除节点
    setState(prev => {
      let root = prev.rootFolder;
      for (const id of ids) {
        root = deleteNodeRecursive(root, id);
      }
      return { ...prev, rootFolder: root };
    });
  }, [removeTabsByFileIds, undoRedo]);

  const toggleFolder = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      rootFolder: updateNode(prev.rootFolder, id, node => ({
        ...node,
        isExpanded: !node.isExpanded,
      })),
    }));
  }, []);

  // V5-M1: Use stateRef.current to avoid stale closure
  const isDescendant = useCallback((parentId: string, childId: string): boolean => {
    return isDescendantOf(stateRef.current.rootFolder, parentId, childId);
  }, []);

  const moveNode = useCallback((nodeId: string, targetParentId: string, targetIndex?: number): boolean => {
    if (nodeId === targetParentId) return false;
    if (isDescendantOf(stateRef.current.rootFolder, nodeId, targetParentId)) return false;

    const nodeToMove = findNode(stateRef.current.rootFolder, nodeId);
    if (!nodeToMove) return false;

    const currentParentId = findParentId(stateRef.current.rootFolder, nodeId);
    if (currentParentId === targetParentId && targetIndex === undefined) {
      return false;
    }

    const movedNode = { ...nodeToMove };

    // ⚠️ 树变换必须基于 `prev` 求值，不可沿用 stateRef 快照：
    //    同一批处理批次里的先前 updater（如「建文件夹→往里放文件」这类复合写入）
    //    已经把新节点累积进 prev；若用快照重算并整体替换 rootFolder，
    //    不仅会丢掉这些新节点，还会因为目标父节点不在快照里而令 movedNode **静默消失**
    //    （deleteNodeRecursive 已先把它从原位置摘除）—— 这是数据丢失，不是显示问题。
    setState(prev => {
      const parentIdInPrev = findParentId(prev.rootFolder, nodeId);
      let root = deleteNodeRecursive(prev.rootFolder, nodeId);

      if (targetIndex !== undefined) {
        root = updateNode(root, targetParentId, (parent) => {
          const children = [...(parent.children || [])];
          const insertIdx = Math.min(targetIndex, children.length);
          children.splice(insertIdx, 0, movedNode);
          return { ...parent, children, isExpanded: true };
        });
      } else {
        root = addChildNode(root, targetParentId, movedNode);
      }

      // G6: 移动后重排受影响父级下子节点的 order，保持手动排序连续
      root = renumberChildrenOrder(root, targetParentId);
      if (parentIdInPrev && parentIdInPrev !== targetParentId) {
        root = renumberChildrenOrder(root, parentIdInPrev);
      }

      return { ...prev, rootFolder: root };
    });
    return true;
  }, []);

  const updateFileContent = useCallback((fileId: string, content: string) => {
    setState(prev => ({
      ...prev,
      rootFolder: updateNodeContent(prev.rootFolder, fileId, content),
      tabs: prev.tabs.map(tab =>
        tab.fileId === fileId ? { ...tab, isDirty: false } : tab
      ),
    }));
  }, []);

  const getFileContent = useCallback((fileId: string): string | null => {
    const fileNode = findNode(stateRef.current.rootFolder, fileId);
    return fileNode?.content !== undefined ? fileNode.content : null;
  }, []);

  const getActiveFileContent = useCallback((): string | null => {
    if (!state.activeTabId) return null;
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    if (!activeTab) return null;
    const fileNode = findNode(state.rootFolder, activeTab.fileId);
    return fileNode?.content !== undefined ? fileNode.content : null;
  }, [state.activeTabId, state.tabs, state.rootFolder]);

  const getActiveFileId = useCallback((): string | null => {
    if (!state.activeTabId) return null;
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    return activeTab?.fileId || null;
  }, [state.activeTabId, state.tabs]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  // V5-L4: Use fine-grained dependencies instead of entire state object
  const getSearchResults = useCallback((): FileNode[] => {
    if (!state.searchQuery) return [];
    return searchFiles(state.rootFolder, state.searchQuery);
  }, [state.searchQuery, state.rootFolder]);

  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId ? { ...tab, isDirty } : tab
      ),
    }));
  }, []);

  const isAnyTabDirty = useCallback((): boolean => {
    return stateRef.current.tabs.some(tab => tab.isDirty);
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({
      ...prev,
      sidebarVisible: !prev.sidebarVisible,
    }));
  }, []);

  const contextValue: FileManagerContextType = {
    rootFolder: state.rootFolder,
    hydrated,
    searchQuery: state.searchQuery,
    sidebarVisible: state.sidebarVisible,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    batchDeleteNodes,
    toggleFolder,
    moveNode,
    isDescendant,
    openFile,
    closeTab,
    closeAllTabs,
    switchTab,
    reorderTabs,
    closeOtherTabs,
    closeTabsToRight,
    updateFileContent,
    getFileContent,
    getActiveFileContent,
    getActiveFileId,
    markTabDirty,
    isAnyTabDirty,
    setSearchQuery,
    getSearchResults,
    toggleSidebar,
  };

  return (
    <FileManagerContext.Provider value={contextValue}>
      {children}
    </FileManagerContext.Provider>
  );
};

export function useFileManager(): FileManagerContextType {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error('useFileManager must be used within a FileManagerProvider');
  }
  return context;
}
