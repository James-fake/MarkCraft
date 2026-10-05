import { useCallback } from 'react'
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
    return newFolder.id;
  }, [setState]);

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
  }, [updateTabName, setState]);

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
