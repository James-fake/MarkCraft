import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode } from '../types/fileManager';
// —— P5-2 拆分：类型/纯函数层下沉 linkIndexShared，全量构建纯函数化 buildIndexSnapshot，
//    查询方法组收编 useLinkIndexQueries —— 本文件保留 Provider 编排与增量更新（updateFileIndex）。
import { buildIndexSnapshot } from './buildLinkIndex';
import { useLinkIndexQueries } from './useLinkIndexQueries';
import { extractHeadings, isInsideLink, parseLinks, stripMdExtension } from './linkIndexShared';
import type { FileLinkIndex, LinkIndexContextType, LinkRecord } from './linkIndexShared';

// 对外类型路径保稳（消费方从本模块导入 LinkRecord / GraphData 等）
export type {
  LinkRecord,
  FileLinkIndex,
  GraphNode,
  GraphEdge,
  GraphData,
} from './linkIndexShared';

// --- Context ---

const LinkIndexContext = createContext<LinkIndexContextType | undefined>(undefined);

// F3: File update event emitter for embed sync
type FileUpdateListener = (fileId: string) => void
const fileUpdateListeners = new Set<FileUpdateListener>()

export const LinkIndexProvider: React.FC<{ children: React.ReactNode; rootFolder: FileNode }> = ({
  children,
  rootFolder,
}) => {
  const [fileIndex, setFileIndex] = useState<Map<string, FileLinkIndex>>(new Map());
  const [fileHeadings, setFileHeadings] = useState<Map<string, string[]>>(new Map());
  const [filePathMap, setFilePathMap] = useState<Map<string, string>>(new Map());
  const [indexVersion, setIndexVersion] = useState(0);

  // Ref-based debounce for rebuilds
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P0.3: 文件内容缓存，用于增量计算 unlinkedMentions
  const contentCacheRef = useRef<Map<string, { content: string; fileName: string }>>(new Map());

  // F3: onFileUpdate - subscribe to file updates
  const onFileUpdate = useCallback((listener: FileUpdateListener) => {
    fileUpdateListeners.add(listener)
    return () => fileUpdateListeners.delete(listener)
  }, [])

  // F3: notifyFileUpdate - notify listeners when a file is updated
  const notifyFileUpdate = useCallback((fileId: string) => {
    fileUpdateListeners.forEach(l => l(fileId))
  }, [])

  // --- Core: full rebuild（计算段见 buildLinkIndex#buildIndexSnapshot，算与报分离）---

  const doRebuild = useCallback((folder: FileNode) => {
    const snapshot = buildIndexSnapshot(folder);
    contentCacheRef.current = snapshot.contentCache;
    setFileIndex(snapshot.fileIndex);
    setFileHeadings(snapshot.headingsMap);
    setFilePathMap(snapshot.filePathMap);
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

  // Subscribe to rootFolder changes
  useEffect(() => {
    rebuildIndex(rootFolder);
    return () => {
      if (rebuildTimerRef.current) {
        clearTimeout(rebuildTimerRef.current);
      }
    };
  }, [rootFolder, rebuildIndex]);

  // --- Incremental update ---

  const updateFileIndex = useCallback((fileId: string, content: string, fileName: string) => {
    setFileIndex(prev => {
      const newIndex = new Map(prev);

      // Parse new outgoing links for this file
      const newOutgoing = parseLinks(fileId, fileName, content);

      // Build a quick name map from existing index entries (we need their fileIds for resolve)
      // For resolving targets, we reuse existing fileNames in the index
      const nameToId = new Map<string, string>();
      for (const [, entry] of newIndex) {
        const nameWithoutExt = stripMdExtension(entry.fileName);
        if (!nameToId.has(nameWithoutExt.toLowerCase())) {
          nameToId.set(nameWithoutExt.toLowerCase(), entry.fileId);
        }
        if (!nameToId.has(nameWithoutExt)) {
          nameToId.set(nameWithoutExt, entry.fileId);
        }
      }

      // Update this file's entry
      const thisFileId = fileId;
      const thisFileNameWithoutExt = stripMdExtension(fileName);

      // Recompute backlinks for all other files that might target this file
      // First, remove old outgoing links from this file from other files' backlinks
      const oldEntry = newIndex.get(fileId);
      const oldOutgoing = oldEntry?.outgoingLinks ?? [];

      // Remove backlinks from other entries that came from this file's old outgoing
      for (const oldLink of oldOutgoing) {
        const resolvedId = nameToId.get(oldLink.target) ?? nameToId.get(oldLink.target.toLowerCase());
        if (resolvedId && resolvedId !== thisFileId) {
          const targetEntry = newIndex.get(resolvedId);
          if (targetEntry) {
            targetEntry.backlinks = targetEntry.backlinks.filter(bl => bl.sourceFileId !== thisFileId);
          }
        }
      }

      // Add new outgoing links as backlinks to target files
      for (const newLink of newOutgoing) {
        const resolvedId = nameToId.get(newLink.target) ?? nameToId.get(newLink.target.toLowerCase());
        if (resolvedId && resolvedId !== thisFileId) {
          const targetEntry = newIndex.get(resolvedId);
          if (targetEntry) {
            targetEntry.backlinks = [...targetEntry.backlinks, newLink];
          }
        }
      }

      // Recompute backlinks for this file from all other files
      const backlinks: LinkRecord[] = [];
      for (const [otherId, otherEntry] of newIndex) {
        if (otherId === thisFileId) continue;
        for (const link of otherEntry.outgoingLinks) {
          const resolvedId = nameToId.get(link.target) ?? nameToId.get(link.target.toLowerCase());
          if (resolvedId === thisFileId) {
            backlinks.push(link);
          }
        }
      }

      // Recompute unlinked mentions for this file
      const unlinkedMentions: LinkRecord[] = [];

      // P0.3: 增量计算 unlinkedMentions —— 利用缓存的内容，而非全量 rebuild
      // 1. 更新缓存中本文件的内容
      contentCacheRef.current.set(thisFileId, { content, fileName });
      // 2. 清除其它文件中对本文件的旧提及
      for (const [otherId, otherEntry] of newIndex) {
        if (otherId === thisFileId) continue;
        otherEntry.unlinkedMentions = otherEntry.unlinkedMentions.filter(
          m => m.target.toLowerCase() !== thisFileNameWithoutExt.toLowerCase()
        );
      }
      // 3. 重新扫描其它文件内容，查找对本文件名的新提及
      if (thisFileNameWithoutExt.length >= 2) {
        for (const [otherId, cached] of contentCacheRef.current) {
          if (otherId === thisFileId) continue;
          const otherEntry = newIndex.get(otherId);
          if (!otherEntry) continue;
          const otherContent = cached.content;
          const lines = otherContent.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let searchIdx = 0;
            while (searchIdx < line.length) {
              const mentionIdx = line.indexOf(thisFileNameWithoutExt, searchIdx);
              if (mentionIdx === -1) break;
              if (!isInsideLink(line, mentionIdx)) {
                const contextStart = Math.max(0, mentionIdx - 20);
                const contextEnd = Math.min(line.length, mentionIdx + thisFileNameWithoutExt.length + 20);
                const contextText = (contextStart > 0 ? '...' : '') + line.slice(contextStart, contextEnd) + (contextEnd < line.length ? '...' : '');
                otherEntry.unlinkedMentions.push({
                  sourceFileId: otherId,
                  sourceFileName: cached.fileName,
                  target: thisFileNameWithoutExt,
                  type: 'wikilink',
                  line: i + 1,
                  matchedName: thisFileNameWithoutExt,
                  text: contextText,
                });
                break;
              }
              searchIdx = mentionIdx + 1;
            }
          }
        }
      }

      newIndex.set(thisFileId, {
        fileId: thisFileId,
        fileName,
        outgoingLinks: newOutgoing,
        backlinks,
        unlinkedMentions,
      });

      return newIndex;
    });
    setFileHeadings(prev => {
      const next = new Map(prev);
      next.set(fileId, extractHeadings(content));
      return next;
    });
    setIndexVersion(v => v + 1);
    // F3: Notify embed views that this file was updated
    notifyFileUpdate(fileId);
  }, [notifyFileUpdate]);

  // --- Query functions（P5-2：方法组收编于 useLinkIndexQueries，闭合当前索引 state）---

  const queries = useLinkIndexQueries(fileIndex, fileHeadings, filePathMap);

  // --- Context value ---

  const contextValue: LinkIndexContextType = {
    fileIndex,
    indexVersion,
    rebuildIndex,
    updateFileIndex,
    getBacklinks: queries.getBacklinks,
    getOutgoingLinks: queries.getOutgoingLinks,
    getUnlinkedMentions: queries.getUnlinkedMentions,
    resolveTarget: queries.resolveTarget,
    resolveTargetFuzzy: queries.resolveTargetFuzzy,
    getFilePath: queries.getFilePath,
    searchFiles: queries.searchFiles,
    getGraphData: queries.getGraphData,
    getFileHeadings: queries.getFileHeadings,
    onFileUpdate,
  };

  return (
    <LinkIndexContext.Provider value={contextValue}>
      {children}
    </LinkIndexContext.Provider>
  );
};

export function useLinkIndex(): LinkIndexContextType {
  const context = useContext(LinkIndexContext);
  if (!context) {
    throw new Error('useLinkIndex must be used within a LinkIndexProvider');
  }
  return context;
}
