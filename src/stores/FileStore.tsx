import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode } from '../types/fileManager';
import type { FileManagerState } from '../types/fileManager';
import { loadState, loadStateAsync, saveState, generateId, findNode, searchFiles } from '../services/fileService';
import { useLanguage } from './LanguageStore';
import { useUndoRedo } from './UndoRedoStore';
import { getRecentFiles, removeRecentFile } from '@core/files/recentFiles';
import { resolveUsageDocsScope } from '@core/files/usageDocs';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '@core/data/defaultDocs/zh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '@core/data/defaultDocs/en';
import { logger } from '@utils/logger';
// —— P5-2 拆分：类型/落盘净化下沉 fileStoreShared，Tab 方法组与文件树方法组各成 hook ——
// 本文件保留 Provider 编排（两阶段初始化 / 自动保存 / 一次性迁移）与读取型 getter。
import { stripTransientTabs, stripLegacyUsageDocTabs } from './fileStoreShared';
import type { FileManagerContextType } from './fileStoreShared';
import { useTabActions } from './useTabActions';
import { useFileTreeActions } from './useFileTreeActions';

// 对外类型路径保稳（消费方从本模块导入）
export type { FileManagerContextType } from './fileStoreShared';

const FileManagerContext = createContext<FileManagerContextType | undefined>(undefined);

export const FileManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const undoRedo = useUndoRedo();

  // ⚠️ 同步兜底树也要过一遍「旧版落盘使用文档标签」迁移：IDB 为空的老用户走的就是
  //    localStorage 这条路，若不拦，旧标签会熬到 hydrated 后被 save effect 转正进 IDB。
  const [state, setState] = useState<FileManagerState>(() => stripLegacyUsageDocTabs(loadState(language)));
  // 「权威树是否就位」——初始 false；loadStateAsync 返回后置 true（无论有没有读到树）。
  // 该窗口内 state 可能只是 T0（同步兜底树），故：① 不可据此做程序化写入（会落在随后
  // 被丢弃的幽灵节点上）；② 不可回存 IDB（会以 T0 覆盖用户真实的旧树）。
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state)
  stateRef.current = state

  // —— Tab 方法组（P5-2：openFile/closeTab/…/isAnyTabDirty 见 useTabActions）——
  const tabActions = useTabActions(setState, stateRef);

  // —— 文件树方法组（P5-2：createFile/deleteNode/moveNode/… 见 useFileTreeActions；
  //     依赖 Tab 组的 openFile / updateTabName / removeTabsByFileIds 单向装配）——
  const fileActions = useFileTreeActions({
    setState,
    stateRef,
    undoRedo,
    openFile: tabActions.openFile,
    updateTabName: tabActions.updateTabName,
    removeTabsByFileIds: tabActions.removeTabsByFileIds,
  });

  // 启动后异步从 IndexedDB 加载最新数据（覆盖 localStorage 的同步初始值）
  useEffect(() => {
    let cancelled = false
    loadStateAsync(language).then(asyncState => {
      if (cancelled) return
      if (asyncState) {
        // ⚠️ setState 前剥掉旧版永久落盘的使用文档标签（stripLegacyUsageDocTabs 的说明）。
        //    必须在 setState 之前：随后 hydrated 翻转会触发 save effect 把净化版回写 IndexedDB，
        //    落盘里的旧标签借此一并清掉 —— 若在 setState 之后修，则要再补一次显式回写。
        setState(stripLegacyUsageDocTabs(asyncState))
      }
      // 无论读没读到，都算「水合完成」：读不到时 T0 本身就是应然状态（新用户首启 / 版本升级重建）
      setHydrated(true)
      logger.info('[FileStore] hydrated=true；来源 =', asyncState ? 'IndexedDB 权威树' : '无（新用户首启或已清空，沿用同步树）')
    })
    return () => { cancelled = true }
  }, [language])

  // 自动保存状态
  // ⚠️ hydrated 之前不回存：此时 state 可能还是 T0，早于 IndexedDB 读取返回写入会**覆盖
  //    用户真实的旧树**（比「进库 0 篇」更严重的静默数据丢失）。读取结束后立即恢复保存。
  useEffect(() => {
    if (!hydrated) return;
    // ⚠️ 落盘前剥掉瞬态标签（内置使用文档，见 stripTransientTabs 的说明）——
    //    「看着说明书时刷新」不得把说明书记成「上次打开的文档」。
    saveState(stripTransientTabs(state));
  }, [state, hydrated]);

  // 一次性净化：清掉**历史遗留在「最近文件」里的内置使用文档条目**。
  //
  // 这些条目是旧版 openFile「无条件 addRecentFile」的产物。留着的危害不只是「最近列表多一条」：
  // 编辑器内文件树的最近列表有 hiddenIds 过滤（看不见），但另有两处**直接读 getRecentFiles()**
  // 的消费者看不到该过滤 —— ① 欢迎页「继续《…》」取 `getRecentFiles()[0]` 当英雄卡；
  // ② 格式工具条的「插入双链」用最近文件名做候选。两者都会把写死的说明书当成用户文档。
  //
  // 幂等：没有命中时零写入；跑在 hydrated 之后（需要权威树才能算出 builtinFileIds 集合）。
  useEffect(() => {
    if (!hydrated) return;
    const builtin = resolveUsageDocsScope(stateRef.current.rootFolder).builtinFileIds;
    if (builtin.size === 0) return;
    for (const f of getRecentFiles()) {
      if (builtin.has(f.fileId)) removeRecentFile(f.fileId);
    }
  }, [hydrated]);

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
    // 只运行一次：MIGRATION_KEY 幂等守卫使重复运行零写入，补 deps 顺带修复
    // 「语言在首帧后才就绪时建错语言指南」与「两阶段初始化覆盖 rootFolder 后的过期读取」
  }, [language, state.rootFolder]);

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
    createFile: fileActions.createFile,
    createFolder: fileActions.createFolder,
    renameNode: fileActions.renameNode,
    deleteNode: fileActions.deleteNode,
    batchDeleteNodes: fileActions.batchDeleteNodes,
    toggleFolder: fileActions.toggleFolder,
    moveNode: fileActions.moveNode,
    isDescendant: fileActions.isDescendant,
    openFile: tabActions.openFile,
    closeTab: tabActions.closeTab,
    closeAllTabs: tabActions.closeAllTabs,
    switchTab: tabActions.switchTab,
    reorderTabs: tabActions.reorderTabs,
    closeOtherTabs: tabActions.closeOtherTabs,
    closeTabsToRight: tabActions.closeTabsToRight,
    closeTransientTabs: tabActions.closeTransientTabs,
    updateFileContent: fileActions.updateFileContent,
    getFileContent: fileActions.getFileContent,
    getActiveFileContent,
    getActiveFileId,
    markTabDirty: tabActions.markTabDirty,
    isAnyTabDirty: tabActions.isAnyTabDirty,
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
