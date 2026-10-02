import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Tab, FileManagerState } from '../types/fileManager'
import { generateId, findNode } from '../services/fileService'
import { addRecentFile } from '@core/files/recentFiles'
import { resolveUsageDocsScope } from '@core/files/usageDocs'

/**
 * FileStore 的 Tab 方法组（P5-2 自 FileManagerProvider 拆出，实现逐字未动）。
 * 只依赖 setState / stateRef —— 与文件树方法、undoRedo 无耦合，是最干净的一组。
 * 调用方（Provider）以当前 state 的 ref 传入，行为与内联定义完全一致。
 */
export function useTabActions(
  setState: Dispatch<SetStateAction<FileManagerState>>,
  stateRef: MutableRefObject<FileManagerState>,
) {
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
  }, [setState, stateRef]);

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
  }, [setState]);

  const closeAllTabs = useCallback(() => {
    setState(prev => ({
      ...prev,
      tabs: [],
      activeTabId: null,
      // 关闭所有标签页时自动收起侧边栏
      sidebarVisible: false,
    }));
  }, [setState]);

  const switchTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
      activeTabId: tabId,
    }));
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId ? { ...tab, isDirty } : tab
      ),
    }));
  }, [setState]);

  const isAnyTabDirty = useCallback((): boolean => {
    return stateRef.current.tabs.some(tab => tab.isDirty);
  }, [stateRef]);

  return {
    openFile,
    closeTab,
    closeAllTabs,
    switchTab,
    reorderTabs,
    closeOtherTabs,
    closeTabsToRight,
    closeTransientTabs,
    updateTabName,
    removeTabsByFileIds,
    markTabDirty,
    isAnyTabDirty,
  };
}
