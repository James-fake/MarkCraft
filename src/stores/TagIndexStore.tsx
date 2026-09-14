import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode } from '../types/fileManager';
import { extractTags, buildTagTree, TagNode } from '../features/tags/tagExtractor';
import { collectAllFiles } from '../features/fileManager/fileManagerUtils';

// --- Types ---

interface TagIndexContextType {
  /** tagName -> Set<fileId> */
  tagIndex: Map<string, Set<string>>;
  /** 嵌套标签树根节点 */
  tagTree: TagNode;
  /** 索引版本号，每次重建自增 */
  indexVersion: number;
  /** 获取指定标签关联的所有文件 ID */
  getFilesForTag: (tag: string) => string[];
  /** 获取指定标签路径关联的所有文件 ID（含子标签） */
  getFilesByTag: (tagPath: string) => string[];
  /** 获取所有标签名列表 */
  getAllTags: () => string[];
  /** 获取指定标签关联的文件数 */
  getTagCount: (tag: string) => number;
  /** 获取指定文件的所有标签 */
  getTagsForFile: (fileId: string) => string[];
  /** P0.3: 增量更新单文件标签索引 */
  updateFileTags: (fileId: string, content: string) => void;
}

// --- Helpers ---

// --- Context ---

const TagIndexContext = createContext<TagIndexContextType | undefined>(undefined);

export const TagIndexProvider: React.FC<{ children: React.ReactNode; rootFolder: FileNode }> = ({
  children,
  rootFolder,
}) => {
  const [tagIndex, setTagIndex] = useState<Map<string, Set<string>>>(new Map());
  const [tagTree, setTagTree] = useState<TagNode>(() => ({
    name: '',
    fullPath: '',
    count: 0,
    children: new Map<string, TagNode>(),
  }));
  const [indexVersion, setIndexVersion] = useState(0);

  // 防抖计时器引用
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Core: 全量重建索引 ---

  const doRebuild = useCallback((folder: FileNode) => {
    const allFiles = collectAllFiles(folder);
    const newIndex = new Map<string, Set<string>>();

    for (const file of allFiles) {
      const content = file.content ?? '';
      const tags = extractTags(content);
      for (const tag of tags) {
        if (!newIndex.has(tag)) {
          newIndex.set(tag, new Set<string>());
        }
        newIndex.get(tag)!.add(file.id);
      }
    }

    setTagIndex(newIndex);
    setTagTree(buildTagTree(newIndex));
    setIndexVersion(v => v + 1);
  }, []);

  const rebuildIndex = useCallback((folder: FileNode) => {
    if (rebuildTimerRef.current) {
      clearTimeout(rebuildTimerRef.current);
    }
    rebuildTimerRef.current = setTimeout(() => {
      doRebuild(folder);
      rebuildTimerRef.current = null;
    }, 300);
  }, [doRebuild]);

  // 监听 rootFolder 变化，防抖后重建索引
  useEffect(() => {
    rebuildIndex(rootFolder);
    return () => {
      if (rebuildTimerRef.current) {
        clearTimeout(rebuildTimerRef.current);
      }
    };
  }, [rootFolder, rebuildIndex]);

  // P0.3: 增量更新单文件标签
  const updateFileTags = useCallback((fileId: string, content: string) => {
    setTagIndex(prev => {
      const newIndex = new Map(prev)
      const newTags = new Set(extractTags(content))

      // 移除旧标签中本文件的引用
      for (const [tag, fileIds] of newIndex) {
        if (fileIds.has(fileId) && !newTags.has(tag)) {
          const newSet = new Set(fileIds)
          newSet.delete(fileId)
          if (newSet.size === 0) {
            newIndex.delete(tag)
          } else {
            newIndex.set(tag, newSet)
          }
        }
      }

      // 添加新标签
      for (const tag of newTags) {
        const existing = newIndex.get(tag)
        if (existing) {
          if (!existing.has(fileId)) {
            const newSet = new Set(existing)
            newSet.add(fileId)
            newIndex.set(tag, newSet)
          }
        } else {
          newIndex.set(tag, new Set([fileId]))
        }
      }

      setTagTree(buildTagTree(newIndex))
      return newIndex
    })
    setIndexVersion(v => v + 1)
  }, [])

  // --- 查询函数 ---

  const getFilesForTag = useCallback((tag: string): string[] => {
    const set = tagIndex.get(tag);
    return set ? Array.from(set) : [];
  }, [tagIndex]);

  const getAllTags = useCallback((): string[] => {
    return Array.from(tagIndex.keys());
  }, [tagIndex]);

  const getTagCount = useCallback((tag: string): number => {
    return tagIndex.get(tag)?.size ?? 0;
  }, [tagIndex]);

  /** Get all tags associated with a given file */
  const getTagsForFile = useCallback((fileId: string): string[] => {
    const tags: string[] = [];
    for (const [tag, fileIds] of tagIndex) {
      if (fileIds.has(fileId)) {
        tags.push(tag);
      }
    }
    return tags;
  }, [tagIndex]);

  /** D1: 获取指定标签路径关联的所有文件 ID（含子标签） */
  const getFilesByTag = useCallback((tagPath: string): string[] => {
    const result = new Set<string>();
    for (const [tag, fileIds] of tagIndex) {
      if (tag === tagPath || tag.startsWith(tagPath + '/')) {
        for (const fid of fileIds) result.add(fid);
      }
    }
    return Array.from(result);
  }, [tagIndex]);

  // --- Context value ---

  const contextValue: TagIndexContextType = {
    tagIndex,
    tagTree,
    indexVersion,
    getFilesForTag,
    getFilesByTag,
    getAllTags,
    getTagCount,
    getTagsForFile,
    updateFileTags,
  };

  return (
    <TagIndexContext.Provider value={contextValue}>
      {children}
    </TagIndexContext.Provider>
  );
};

export function useTagIndex(): TagIndexContextType {
  const context = useContext(TagIndexContext);
  if (!context) {
    throw new Error('useTagIndex must be used within a TagIndexProvider');
  }
  return context;
}
