import { useCallback } from 'react';
import { FileNode } from '../types/fileManager';
import { stripMdExtension } from './linkIndexShared';
import { rankFileMatches } from '@core/files/fileMatch';
import { getRecentFiles } from '@core/files/recentFiles';
import type { FileLinkIndex, GraphData, GraphEdge, GraphNode, LinkRecord } from './linkIndexShared';

/**
 * LinkIndexStore 的查询方法组（P5-2 自主文件拆出，实现逐字未动）。
 * 全部只读闭合于三份索引 state 上，不持有可变状态 —— Provider 每次渲染以
 * 当前 fileIndex / fileHeadings / filePathMap 调用即可，useCallback 语义与原实现一致。
 */
export function useLinkIndexQueries(
  fileIndex: Map<string, FileLinkIndex>,
  fileHeadings: Map<string, string[]>,
  filePathMap: Map<string, string>,
) {
  const getBacklinks = useCallback((fileId: string): LinkRecord[] => {
    return fileIndex.get(fileId)?.backlinks ?? [];
  }, [fileIndex]);

  const getOutgoingLinks = useCallback((fileId: string): LinkRecord[] => {
    return fileIndex.get(fileId)?.outgoingLinks ?? [];
  }, [fileIndex]);

  const getUnlinkedMentions = useCallback((fileId: string): LinkRecord[] => {
    return fileIndex.get(fileId)?.unlinkedMentions ?? [];
  }, [fileIndex]);

  const getFileHeadings = useCallback((fileId: string): string[] => {
    return fileHeadings.get(fileId) ?? [];
  }, [fileHeadings]);

  const resolveTarget = useCallback((targetName: string): string | undefined => {
    // Strip #heading part for file name matching
    const fileName = targetName.split('#')[0].trim();
    // 也去掉 target 的 .md 后缀（用户可能在 [[...]] 中写了 .md 后缀）
    const fileNameNoExt = stripMdExtension(fileName);
    // Try exact match first, then case-insensitive
    for (const [, entry] of fileIndex) {
      if (stripMdExtension(entry.fileName) === fileName || stripMdExtension(entry.fileName) === fileNameNoExt) {
        return entry.fileId;
      }
    }
    const lower = fileName.toLowerCase();
    const lowerNoExt = fileNameNoExt.toLowerCase();
    for (const [, entry] of fileIndex) {
      const entryName = stripMdExtension(entry.fileName).toLowerCase();
      if (entryName === lower || entryName === lowerNoExt) {
        return entry.fileId;
      }
    }
    // Path match: support [[folder/file]] format
    if (fileName.includes('/')) {
      const pathLower = fileName.toLowerCase();
      if (filePathMap.has(pathLower)) {
        return filePathMap.get(pathLower)!;
      }
      if (filePathMap.has(fileName)) {
        return filePathMap.get(fileName)!;
      }
    }
    return undefined;
  }, [fileIndex, filePathMap]);

  const resolveTargetFuzzy = useCallback((targetName: string): { fileId: string; fuzzy: boolean } | undefined => {
    // Strip #heading part for file name matching
    const fileName = targetName.split('#')[0].trim();

    // 1. Exact match (same as resolveTarget)
    for (const [, entry] of fileIndex) {
      if (stripMdExtension(entry.fileName) === fileName) {
        return { fileId: entry.fileId, fuzzy: false };
      }
    }
    const lower = fileName.toLowerCase();
    for (const [, entry] of fileIndex) {
      if (stripMdExtension(entry.fileName).toLowerCase() === lower) {
        return { fileId: entry.fileId, fuzzy: false };
      }
    }

    // 1.5. Path match: support [[folder/file]] format
    if (fileName.includes('/')) {
      const pathLower = fileName.toLowerCase();
      if (filePathMap.has(pathLower)) {
        return { fileId: filePathMap.get(pathLower)!, fuzzy: false };
      }
      if (filePathMap.has(fileName)) {
        return { fileId: filePathMap.get(fileName)!, fuzzy: false };
      }
    }

    // 2. Contains match: targetName is a substring of the file name
    for (const [, entry] of fileIndex) {
      const nameWithoutExt = stripMdExtension(entry.fileName);
      if (nameWithoutExt.toLowerCase().includes(lower)) {
        return { fileId: entry.fileId, fuzzy: true };
      }
    }
    // Reverse: file name contains target
    for (const [, entry] of fileIndex) {
      const nameWithoutExt = stripMdExtension(entry.fileName);
      if (lower.includes(nameWithoutExt.toLowerCase())) {
        return { fileId: entry.fileId, fuzzy: true };
      }
    }

    // 3. Ignore spaces match
    const noSpaces = lower.replace(/\s+/g, '');
    for (const [, entry] of fileIndex) {
      const nameNoSpaces = stripMdExtension(entry.fileName).toLowerCase().replace(/\s+/g, '');
      if (nameNoSpaces === noSpaces) {
        return { fileId: entry.fileId, fuzzy: true };
      }
    }

    return undefined;
  }, [fileIndex, filePathMap]);

  const getFilePath = useCallback((fileId: string): string => {
    for (const [path, id] of filePathMap) {
      if (id === fileId) return path;
    }
    return '';
  }, [filePathMap]);

  /**
   * 补全用的笔记搜索（所见即所得）。
   *
   * ⚠️ 2026-10-11：原实现是 `includes` 过滤后**按 Map 遍历顺序返回** —— 输入完整文件名时
   *    它不一定排第一，补全就得上下翻找。现改用 `@core/files/fileMatch` 的统一排序
   *    （精确 > 前缀 > 子串，再叠加最近打开 / 被引用数），与源码模式行为一致。
   */
  const searchFiles = useCallback((query: string): FileNode[] => {
    if (!query) return [];
    const candidates = [...fileIndex.values()].map((entry) => ({
      id: entry.fileId,
      name: entry.fileName,
      // 被引用得多 = 更可能是用户想链的那篇（枢纽笔记）
      backlinkCount: entry.backlinks.length,
    }));
    const recentFileIds = getRecentFiles().map((r) => r.fileId);
    const ranked = rankFileMatches(query, candidates, { recentFileIds });
    return ranked.map((c) => ({
      id: c.id,
      name: c.name,
      type: 'file' as const,
      createdAt: 0,
      updatedAt: 0,
    }));
  }, [fileIndex]);

  const getGraphData = useCallback((tagIndex?: Map<string, Set<string>>): GraphData => {
    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const [, entry] of fileIndex) {
      const label = stripMdExtension(entry.fileName);
      nodeMap.set(entry.fileId, {
        id: entry.fileId,
        label,
        links: entry.outgoingLinks.length,
      });

      for (const link of entry.outgoingLinks) {
        const targetId = resolveTarget(link.target);
        if (targetId) {
          edges.push({
            source: entry.fileId,
            target: targetId,
            type: link.type,
            relation: link.relation || undefined,
          });
        }
      }
    }

    // D3: Add tag nodes and tag edges
    if (tagIndex) {
      for (const [tagPath, fileIds] of tagIndex) {
        const tagNodeId = `tag:${tagPath}`;
        const tagName = tagPath.includes('/') ? tagPath.split('/').pop()! : tagPath;
        nodeMap.set(tagNodeId, {
          id: tagNodeId,
          label: tagName,
          links: fileIds.size,
        });
        for (const fileId of fileIds) {
          // Only add edge if the file exists in the graph
          if (nodeMap.has(fileId)) {
            edges.push({
              source: tagNodeId,
              target: fileId,
              type: 'tag',
            });
          }
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }, [fileIndex, resolveTarget]);

  return {
    getBacklinks,
    getOutgoingLinks,
    getUnlinkedMentions,
    getFileHeadings,
    resolveTarget,
    resolveTargetFuzzy,
    getFilePath,
    searchFiles,
    getGraphData,
  };
}
