import { useCallback, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { FileNode, FileManagerState } from '../types/fileManager'
import { generateId, findNode, updateNodeContent, updateNode, deleteNodeRecursive, addChildNode, renumberChildrenOrder, collectFileIds, isDescendantOf, findParentId } from '../services/fileService'
import { removeRecentFile } from '@core/files/recentFiles'
import type { useUndoRedo } from './UndoRedoStore'

/**
 * FileStore 的文件树方法组（P5-2 自 FileManagerProvider 拆出，实现逐字未动）。
 * 依赖 Tab 方法组的三员（openFile / updateTabName / removeTabsByFileIds）+ undoRedo
 * （删除时清理撤销历史）—— 由 Provider 装配后传入，依赖方向单向无环。
 */
export function useFileTreeActions(args: {
  setState: Dispatch<SetStateAction<FileManagerState>>
  stateRef: MutableRefObject<FileManagerState>
  undoRedo: ReturnType<typeof useUndoRedo>
  openFile: (fileId: string) => void
  updateTabName: (fileId: string, name: string) => void
  removeTabsByFileIds: (fileIds: string[]) => void
}) {
  const { setState, stateRef, undoRedo, openFile, updateTabName, removeTabsByFileIds } = args

  /**
   * 本会话内由 createFile/createFolder 新建、但可能还没进入 `stateRef` 快照的节点 id。
   *
   * 用途（2026-11-08 审查 M-C-5）：moveNode 的返回值必须在 updater 外同步算定，
   * 而「目标父级在快照里不存在」有两种截然不同的含义 —— ① 同一批次里刚创建的文件夹
   * （必须放行，见 FileStore.batch 的 prev 链回归）② 根本不存在（应如实返回 false）。
   * 这份登记表让两者同步可区分，返回值不再依赖 updater 的执行时机。
   */
  const pendingCreatedIdsRef = useRef<Set<string>>(new Set())

  const createFile = useCallback((parentId: string, name: string, content: string = '', openAfterCreate = true): string => {
    const newFile: FileNode = {
      id: generateId(),
      name: name.endsWith('.md') ? name : `${name}.md`,
      type: 'file',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // V5-M3: Compute newRoot inside setState. 副作用（openFile / 事件）移到 updater 之外，
    // 否则在 StrictMode 下 updater 会被重复调用导致 openFile 被调度两次（审查 M4-useFileTreeActions）。
    setState(prev => {
      const newRoot = addChildNode(prev.rootFolder, parentId, newFile);
      if (openAfterCreate) {
        // 新文件创建时默认隐藏侧边栏，保持纯净的编辑区域
        return { ...prev, rootFolder: newRoot, sidebarVisible: false };
      }
      return { ...prev, rootFolder: newRoot };
    });
    // 副作用在 updater 之外执行（仍用 setTimeout(0) 延后到 state commit 之后）
    if (openAfterCreate) {
      setTimeout(() => {
        openFile(newFile.id);
      }, 0);
      // 通知 UI 层隐藏大纲等其他面板
      window.dispatchEvent(new CustomEvent('markcraft:new-file-created'));
    }
    pendingCreatedIdsRef.current.add(newFile.id);
    return newFile.id;
  }, [openFile, setState]);

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
    pendingCreatedIdsRef.current.add(newFolder.id);
    return newFolder.id;
  }, [setState]);

  /**
   * 重命名节点。返回 false 表示因目标父级下已有同名节点被拒绝。
   *
   * S0 红线守卫（2026-11-03 审查 P0-2）：store 层不挡重名时，vaultService.doSync 的
   * `fs.rename(prev.path, cur.path)` 会**静默覆盖**磁盘上的同名文件 —— 树里两个节点
   * 共享一条磁盘路径，原文件内容永久丢失。Windows 磁盘大小写不敏感，故用
   * toLowerCase 比较（`A.md` → `a.md` 对自身改名是合法的，由 id !== 自身排除）。
   *
   * 两层防御（缺一不可）：
   * - 同步预检（stateRef）：用户交互路径（树已稳定）立即拿到拒绝结果；
   * - updater 内深度防御（prev）：同批次复合写入（createFolder → renameNode）时
   *   stateRef 快照滞后，预检看不到新树 —— updater 内再查一次，碰撞时返回 prev
   *   原引用（React bail out）+ console.error 留痕，**数据安全不依赖返回值**。
   */
  const renameNode = useCallback((id: string, newName: string): boolean => {
    const current = findNode(stateRef.current.rootFolder, id);
    if (!current) return false;
    const finalName = current.type === 'file' && !newName.toLowerCase().endsWith('.md') ? `${newName}.md` : newName;

    const parentId = findParentId(stateRef.current.rootFolder, id);
    const parent = parentId ? findNode(stateRef.current.rootFolder, parentId) : null;
    if (parent) {
      const clash = (parent.children || []).some(
        (c) => c.id !== id && c.name.toLowerCase() === finalName.toLowerCase(),
      );
      if (clash) return false;
    }

    setState(prev => {
      const parentIdInPrev = findParentId(prev.rootFolder, id);
      const parentInPrev = parentIdInPrev ? findNode(prev.rootFolder, parentIdInPrev) : null;
      const clashInPrev = (parentInPrev?.children || []).some(
        (c) => c.id !== id && c.name.toLowerCase() === finalName.toLowerCase(),
      );
      if (clashInPrev) {
        // 深度防御路径：同步预检已放行（快照滞后），但最新树上确实碰撞
        console.error(`[FileStore] 重命名被拒绝：目标父级下已存在同名节点「${finalName}」`);
        return prev;
      }

      const updatedRoot = updateNode(prev.rootFolder, id, node => ({
        ...node,
        name: finalName,
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
    return true;
  }, [updateTabName, setState, stateRef]);

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
  }, [removeTabsByFileIds, undoRedo, setState, stateRef]);

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
  }, [removeTabsByFileIds, undoRedo, setState, stateRef]);

  const toggleFolder = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      rootFolder: updateNode(prev.rootFolder, id, node => ({
        ...node,
        isExpanded: !node.isExpanded,
      })),
    }));
  }, [setState]);

  // V5-M1: Use stateRef.current to avoid stale closure
  const isDescendant = useCallback((parentId: string, childId: string): boolean => {
    return isDescendantOf(stateRef.current.rootFolder, parentId, childId);
  }, [stateRef]);

  const moveNode = useCallback((nodeId: string, targetParentId: string, targetIndex?: number): boolean => {
    if (nodeId === targetParentId) return false;
    if (isDescendantOf(stateRef.current.rootFolder, nodeId, targetParentId)) return false;

    // S0 红线守卫（2026-11-03 审查 P0-2，与 renameNode 同源）：目标父级下已有同名节点
    // 时拒绝移动 —— 放行会让 vaultService 的 rename/write 回退静默覆盖磁盘同名文件。
    //
    // ⚠️ 返回值必须在 updater **之外**同步算定（2026-11-08 审查 M-C-5）：此前把
    //    `rejected` 写在 setState updater 里再 `return !rejected`，而 React 18 批处理下
    //    updater 可能延后到渲染时才执行（同一批次里已有 pending update 时跳过 eager 求值），
    //    返回值与实际结果脱节（对已发生的拒绝返回 true）。这里与 renameNode 对齐：
    //    先用 stateRef 快照做完整判定并立即返回，updater 内只保留**数据安全**用的深度防御。
    //
    // 两层防御的分工：
    // - 同步预检（stateRef）：树稳定时的用户交互路径，返回值 = 真实结果；
    // - updater 内深度防御（prev）：同批次复合写入（createFolder → moveNode）时快照滞后，
    //   碰撞在 prev 上再查一次 → bail out + console.error 留痕，**数据安全不依赖返回值**。
    const movingSnapshot = findNode(stateRef.current.rootFolder, nodeId);
    if (!movingSnapshot) return false;
    const targetParentSnapshot = findNode(stateRef.current.rootFolder, targetParentId);
    if (targetParentSnapshot) {
      const clash = (targetParentSnapshot.children || []).some(
        (c) => c.id !== nodeId && c.name.toLowerCase() === movingSnapshot.name.toLowerCase(),
      );
      if (clash) return false;
    } else if (!pendingCreatedIdsRef.current.has(targetParentId)) {
      // 快照里没有、也不是本会话刚创建的 → 目标不存在，同步如实拒绝
      return false;
    }
    const currentParentSnapshot = findParentId(stateRef.current.rootFolder, nodeId);
    if (currentParentSnapshot === targetParentId && targetIndex === undefined) return false;

    // ⚠️ 树变换必须基于 `prev` 求值，不可沿用 stateRef 快照：同一批次里的先前 updater
    //    （「建文件夹 → 往里放文件」这类复合写入）已把新节点累积进 prev；用快照重算并
    //    整体替换会丢掉这些节点，且目标父节点不在快照里会让 movedNode **静默消失**
    //    （deleteNodeRecursive 已先把它从原位置摘除）—— 这是数据丢失，不是显示问题。
    setState(prev => {
      const moving = findNode(prev.rootFolder, nodeId);
      if (!moving) return prev;
      const targetParent = findNode(prev.rootFolder, targetParentId);
      if (!targetParent) return prev;
      const clash = (targetParent.children || []).some(
        (c) => c.id !== nodeId && c.name.toLowerCase() === moving.name.toLowerCase(),
      );
      if (clash) {
        // 深度防御路径：同步预检已放行（快照滞后），但最新树上确实碰撞
        console.error(`[FileStore] 移动被拒绝：目标父级下已存在同名节点「${moving.name}」`);
        return prev;
      }

      const currentParentId = findParentId(prev.rootFolder, nodeId);
      if (currentParentId === targetParentId && targetIndex === undefined) return prev;

      const movedNode = { ...moving };

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
  }, [setState, stateRef]);

  const updateFileContent = useCallback((fileId: string, content: string) => {
    setState(prev => ({
      ...prev,
      rootFolder: updateNodeContent(prev.rootFolder, fileId, content),
      tabs: prev.tabs.map(tab =>
        tab.fileId === fileId ? { ...tab, isDirty: false } : tab
      ),
    }));
  }, [setState]);

  const getFileContent = useCallback((fileId: string): string | null => {
    const fileNode = findNode(stateRef.current.rootFolder, fileId);
    return fileNode?.content !== undefined ? fileNode.content : null;
  }, [stateRef]);

  return {
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    batchDeleteNodes,
    toggleFolder,
    isDescendant,
    moveNode,
    updateFileContent,
    getFileContent,
  };
}
