import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, Tab, FileManagerState } from '../types/fileManager';
import { loadState, loadStateAsync, saveState, generateId, findNode, updateNodeContent, searchFiles, updateNode, deleteNodeRecursive, addChildNode, renumberChildrenOrder, collectFileIds, isDescendantOf, findParentId } from '../services/fileService';
import { useLanguage } from './LanguageStore';
import { useUndoRedo } from './UndoRedoStore';
import { addRecentFile, removeRecentFile } from '../features/fileManager/recentFilesManager';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '../features/fileManager/defaultDocsZh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '../features/fileManager/defaultDocsEn';

interface FileManagerContextType {
  rootFolder: FileNode;
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
  const stateRef = useRef(state)
  stateRef.current = state

  // 启动后异步从 IndexedDB 加载最新数据（覆盖 localStorage 的同步初始值）
  useEffect(() => {
    let cancelled = false
    loadStateAsync(language).then(asyncState => {
      if (!cancelled && asyncState) {
        setState(asyncState)
      }
    })
    return () => { cancelled = true }
  }, [language])

  // 自动保存状态
  useEffect(() => {
    saveState(state);
  }, [state]);

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
  const openFile = useCallback((fileId: string) => {
    let newActiveTabId: string | null = null

    setState(prev => {
      const existingTab = prev.tabs.find(tab => tab.fileId === fileId);

      if (existingTab) {
        newActiveTabId = existingTab.id
        return {
          ...prev,
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

      newActiveTabId = newTab.id
      return {
        ...prev,
        tabs: [
          ...prev.tabs.map(tab => ({ ...tab, isActive: false })),
          newTab,
        ],
        activeTabId: newTab.id,
      };
    });

    if (newActiveTabId) {
      // activeTabId is already set inside setState above when creating a new tab,
      // but for the existing-tab case we still need to update it
      setState(prev => {
        if (prev.activeTabId === newActiveTabId) return prev;
        return { ...prev, activeTabId: newActiveTabId };
      });
    }

    // Add to recent files
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
    let newRoot = deleteNodeRecursive(stateRef.current.rootFolder, nodeId);

    if (targetIndex !== undefined) {
      newRoot = updateNode(newRoot, targetParentId, (parent) => {
        const children = [...(parent.children || [])];
        const insertIdx = Math.min(targetIndex, children.length);
        children.splice(insertIdx, 0, movedNode);
        return { ...parent, children, isExpanded: true };
      });
    } else {
      newRoot = addChildNode(newRoot, targetParentId, movedNode);
    }

    // G6: 移动后重排受影响父级下子节点的 order，保持手动排序连续
    newRoot = renumberChildrenOrder(newRoot, targetParentId);
    if (currentParentId && currentParentId !== targetParentId) {
      newRoot = renumberChildrenOrder(newRoot, currentParentId);
    }

    setState(prev => ({ ...prev, rootFolder: newRoot }));
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
