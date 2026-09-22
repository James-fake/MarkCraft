import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, Tab, FileManagerState } from '../types/fileManager';
import { loadState, loadStateAsync, saveState, generateId, findNode, updateNodeContent, searchFiles, updateNode, deleteNodeRecursive, addChildNode, renumberChildrenOrder, collectFileIds, isDescendantOf, findParentId } from '../services/fileService';
import { useLanguage } from './LanguageStore';
import { useUndoRedo } from './UndoRedoStore';
import { addRecentFile, getRecentFiles, removeRecentFile } from '@core/files/recentFiles';
import { resolveUsageDocsScope } from '@core/files/usageDocs';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '@core/data/defaultDocs/zh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '@core/data/defaultDocs/en';

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
/** 剥掉一批标签后把 `activeTabId` 与 `isActive` 修正到仍然存在的标签上（共享逻辑，防两处漂移）。
 *  悬空 activeTabId 的界面表现是「标题栏说打开了文件、编辑区却是空的」，比不打开更糟。
 *  被剥掉的正是激活标签 → 落到最后打开的那篇永久文档；一篇不剩则回到「未打开文档」空态。 */
function fixActiveAfterRemoval(tabs: Tab[], activeTabId: string | null): { tabs: Tab[]; activeTabId: string | null } {
  const fixedActiveId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : (tabs.length ? tabs[tabs.length - 1].id : null);
  return {
    tabs: tabs.map((tab) => ({ ...tab, isActive: tab.id === fixedActiveId })),
    activeTabId: fixedActiveId,
  };
}

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
      console.info('[FileStore] hydrated=true；来源 =', asyncState ? 'IndexedDB 权威树' : '无（新用户首启或已清空，沿用同步树）')
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
   *
   * 🚨 铁律二（2026-09-22）：**内置「使用文档」只能以「瞬态标签」打开**。
   *    用户语义：「使用文档的笔记只能从这个知识库中点击进入，不能变成编辑器里一个被打开 /
   *    被记住的文档。」故命中内置篇章清单的文件，一律：
   *      · 不进「最近文件」（跳过 addRecentFile）；
   *      · 不出现在标签栏（见 AuroraTabs 的过滤）；
   *      · 不落盘（见 stripTransientTabs）；
   *      · 离开编辑器视图即回收（AuroraShell / EditorPanel 调 closeTransientTabs）。
   *    判定单源 = `core/files/usageDocs#resolveUsageDocsScope`，与 EditorPanel 的「只读简介页」
   *    判定**同源** —— 两处若各自手写，会出现「开了标签却没走简介页」（或反之）的错配。
   *
   *    另：打开**普通文档**时会把现存瞬态标签一并回收 —— 预览被正式打开替换（VS Code 同款语义），
   *    避免「从使用文档点回自己的笔记」后在标签栏底下留一个隐形的说明书标签。
   */
  const openFile = useCallback((fileId: string) => {
    // 只读参考页判定（读已提交的权威树；openFile 由用户行为触发，非热路径，无需缓存）
    const transientOpen = resolveUsageDocsScope(stateRef.current.rootFolder).builtinFileIds.has(fileId);

    setState(prev => {
      // 打开普通文档 = 离开预览态：先回收全部瞬态标签（VS Code「预览标签被正式打开替换」语义）
      const baseTabs = transientOpen ? prev.tabs : prev.tabs.filter(tab => !tab.isTransient);

      const existingTab = baseTabs.find(tab => tab.fileId === fileId);

      if (existingTab) {
        // 已经一致就原样返回（避免无谓重渲染）；不一致则一次性把两者都纠正过来。
        // ⚠️ 「本批次回收过瞬态标签」也算不一致（baseTabs.length !== prev.tabs.length）——
        //    否则回收结果会被这次 `return prev` 一起丢掉。
        // ⚠️ 已存在的**永久**标签不会被降级为瞬态：已固化的文档比预览强。
        const alreadyConsistent =
          prev.activeTabId === existingTab.id &&
          baseTabs.length === prev.tabs.length &&
          baseTabs.every(tab => tab.isActive === (tab.id === existingTab.id))
        if (alreadyConsistent) return prev
        return {
          ...prev,
          activeTabId: existingTab.id,
          tabs: baseTabs.map(tab => ({
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
        ...(transientOpen ? { isTransient: true } : {}),
      };

      return {
        ...prev,
        tabs: [
          ...baseTabs.map(tab => ({ ...tab, isActive: false })),
          newTab,
        ],
        activeTabId: newTab.id,
      };
    });

    // Add to recent files（纯副作用，留在 updater 之外）。
    // 瞬态（使用文档）跳过：写死的说明书不是用户的文档，不该出现在「最近」。
    if (!transientOpen) {
      const fileNode = findNode(stateRef.current.rootFolder, fileId);
      if (fileNode && fileNode.type === 'file') {
        addRecentFile(fileId, fileNode.name);
      }
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

  /**
   * 回收全部**瞬态（预览）标签** —— 内置「使用文档」的「退出即无痕」。
   *
   * 调用时机（三者覆盖所有「离开预览」的路径）：
   *   · `AuroraShell`：路由离开编辑器视图（editor → 任意其它视图 / welcome / settings）；
   *   · `EditorPanel`：视图内显式导航（点击侧栏，含「点了编辑器想回到自己的笔记」）；
   *   · `openFile`：打开任意普通文档时内联完成（预览被正式打开替换）。
   *
   * ⚠️ **不在 EditorPanel 卸载时回收**：根节点是 `<StrictMode>`（dev 下 mount → cleanup →
   *    mount），卸载清理会被这次假卸载误触发 —— 而「从知识库点开使用文档」正是
   *    「先建瞬态标签、再切路由挂载 EditorPanel」，于是刚点开的那篇会被当场关掉。
   *    改为由**路由**（视图真正切换）驱动，判据与 StrictMode 无关。
   *
   * 关掉后落到**最后打开的那篇永久文档**（标签按打开顺序追加）；一篇不剩时回到空态
   * （`activeTabId=null`，编辑区显示「未打开文档」）—— 这正是需求要的「不留痕」。
   */
  const closeTransientTabs = useCallback(() => {
    setState(prev => {
      if (!prev.tabs.some(tab => tab.isTransient)) return prev;
      const remaining = prev.tabs.filter(tab => !tab.isTransient);
      const activeWasTransient = !!prev.tabs.find(tab => tab.id === prev.activeTabId)?.isTransient;
      const nextActiveTabId = activeWasTransient
        ? (remaining.length ? remaining[remaining.length - 1].id : null)
        : prev.activeTabId;
      return {
        ...prev,
        tabs: remaining.map(tab => ({ ...tab, isActive: tab.id === nextActiveTabId })),
        activeTabId: nextActiveTabId,
        // 与 closeTab / closeAllTabs 同款：一篇不剩时收起侧栏
        sidebarVisible: remaining.length === 0 ? false : prev.sidebarVisible,
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
    closeTransientTabs,
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
