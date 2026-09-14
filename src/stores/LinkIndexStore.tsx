import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode } from '../types/fileManager';
import { collectAllFiles } from '../features/fileManager/fileManagerUtils';

// --- Types ---

export interface LinkRecord {
  sourceFileId: string;
  sourceFileName: string;
  target: string;
  type: 'wikilink' | 'embed';
  line: number;
  matchedName?: string;
  text?: string;
  /** 引用行的上下文片段（当前行+前后各1行） */
  context?: string;
  /** 链接关系类型，如 引用、反驳、支撑 等 */
  relation?: string;
  /** 链接备注 */
  note?: string;
}

export interface FileLinkIndex {
  fileId: string;
  fileName: string;
  outgoingLinks: LinkRecord[];
  backlinks: LinkRecord[];
  unlinkedMentions: LinkRecord[];
}

export interface GraphNode {
  id: string;
  label: string;
  links: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'wikilink' | 'embed' | 'tag';
  relation?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface LinkIndexContextType {
  fileIndex: Map<string, FileLinkIndex>;
  indexVersion: number;
  rebuildIndex: (rootFolder: FileNode) => void;
  updateFileIndex: (fileId: string, content: string, fileName: string) => void;
  getBacklinks: (fileId: string) => LinkRecord[];
  getOutgoingLinks: (fileId: string) => LinkRecord[];
  getUnlinkedMentions: (fileId: string) => LinkRecord[];
  resolveTarget: (targetName: string) => string | undefined;
  resolveTargetFuzzy: (targetName: string) => { fileId: string; fuzzy: boolean } | undefined;
  getFilePath: (fileId: string) => string;
  searchFiles: (query: string) => FileNode[];
  getGraphData: (tagIndex?: Map<string, Set<string>>) => GraphData;
  getFileHeadings: (fileId: string) => string[];
  onFileUpdate: (listener: (fileId: string) => void) => () => void;
}

// --- Helpers ---

const LINK_REGEX = /(!?)\[\[([^\]]+)\]\]/g;


/** Strip .md extension if present. */
function stripMdExtension(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name;
}

/** Extract headings (H1-H6) from content */
function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) {
      headings.push(match[1].trim());
    }
  }
  return headings;
}

/** Parse content for wikilinks and embeds, returning LinkRecord[]. */
function parseLinks(sourceFileId: string, sourceFileName: string, content: string): LinkRecord[] {
  const links: LinkRecord[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let match: RegExpExecArray | null;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(lines[i])) !== null) {
      const isEmbed = match[1] === '!';
      // Support [[target|pipeContent]] syntax
      const rawTarget = match[2];
      const parts = rawTarget.split('|');
      const target = parts[0].trim();
      const pipeContent = parts.length > 1 ? parts.slice(1).join('|').trim() : '';

      // Parse relation and note from pipe content
      let relation = '';
      let note = '';
      if (pipeContent) {
        if (pipeContent.startsWith('关系:')) {
          relation = pipeContent.slice(3);
        } else if (pipeContent.startsWith('备注:')) {
          note = pipeContent.slice(3);
        }
      }

      // 提取上下文：当前行+前后各1行
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(lines.length, i + 2);
      const contextLines = lines.slice(contextStart, contextEnd);
      // 标记引用行（中间行）
      const contextOffset = i - contextStart;

      links.push({
        sourceFileId,
        sourceFileName,
        target,
        type: isEmbed ? 'embed' : 'wikilink',
        line: i + 1,
        context: contextLines.map((l, idx) => (idx === contextOffset ? '→ ' : '  ') + l).join('\n'),
        relation: relation || undefined,
        note: note || undefined,
      });
    }
  }

  return links;
}

/**
 * Build a name→fileId lookup map from all files in a root folder.
 * Strips .md extensions so links like [[Note]] match Note.md.
 */
function buildNameMap(rootFolder: FileNode): Map<string, string> {
  const map = new Map<string, string>();
  const files = collectAllFiles(rootFolder);
  for (const file of files) {
    const nameWithoutExt = stripMdExtension(file.name);
    // First match wins if there are duplicates
    if (!map.has(nameWithoutExt.toLowerCase())) {
      map.set(nameWithoutExt.toLowerCase(), file.id);
    }
    // Also map with the original case
    if (!map.has(nameWithoutExt)) {
      map.set(nameWithoutExt, file.id);
    }
  }
  return map;
}

/** Check whether a given target text in content is inside [[...]] brackets. */
function isInsideLink(content: string, index: number): boolean {
  // Look backwards for [[ that isn't closed by ]] before index
  const before = content.substring(0, index);
  const lastOpen = before.lastIndexOf('[[');
  if (lastOpen === -1) return false;
  const between = before.substring(lastOpen);
  // If there's a ]] after [[ but before the match, it's not inside
  const closeAfterOpen = between.indexOf(']]');
  return closeAfterOpen === -1;
}

/** Build a path→fileId map from a folder tree, e.g. "folderA/Note" → fileId */
function collectFilePaths(node: FileNode, basePath: string = ''): Map<string, string> {
  const map = new Map<string, string>()
  if (node.type === 'file') {
    const nameWithoutExt = stripMdExtension(node.name)
    const fullPath = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt
    if (!map.has(fullPath.toLowerCase())) {
      map.set(fullPath.toLowerCase(), node.id)
    }
    if (!map.has(fullPath)) {
      map.set(fullPath, node.id)
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const childPath = basePath ? `${basePath}/${child.name}` : child.name
      const childMap = child.type === 'folder'
        ? collectFilePaths(child, childPath)
        : collectFilePaths(child, basePath)
      for (const [key, value] of childMap) {
        if (!map.has(key)) map.set(key, value)
      }
    }
  }
  return map
}

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

  // --- Core: full rebuild ---

  const doRebuild = useCallback((folder: FileNode) => {
    const allFiles = collectAllFiles(folder);
    const nameMap = buildNameMap(folder);

    // P0.3: 缓存所有文件内容，供增量更新使用
    const contentCache = new Map<string, { content: string; fileName: string }>();
    for (const file of allFiles) {
      contentCache.set(file.id, { content: file.content ?? '', fileName: file.name });
    }
    contentCacheRef.current = contentCache;

    // Parse outgoing links for every file
    const outgoingMap = new Map<string, LinkRecord[]>();
    for (const file of allFiles) {
      const content = file.content ?? '';
      outgoingMap.set(file.id, parseLinks(file.id, file.name, content));
    }

    // Build headings map for every file
    const headingsMap = new Map<string, string[]>();
    for (const file of allFiles) {
      const content = file.content ?? '';
      headingsMap.set(file.id, extractHeadings(content));
    }

    // Build the index
    const newIndex = new Map<string, FileLinkIndex>();

    for (const file of allFiles) {
      const outgoing = outgoingMap.get(file.id) ?? [];

      // Compute backlinks: links from other files that target this file
      const backlinks: LinkRecord[] = [];
      for (const otherFile of allFiles) {
        if (otherFile.id === file.id) continue;
        const otherOutgoing = outgoingMap.get(otherFile.id) ?? [];
        for (const link of otherOutgoing) {
          const resolvedId = nameMap.get(link.target) ?? nameMap.get(link.target.toLowerCase());
          if (resolvedId === file.id) {
            backlinks.push(link);
          }
        }
      }

      // Compute unlinked mentions: other files that mention this file's name but not in [[...]]
      const unlinkedMentions: LinkRecord[] = [];
      const fileNameWithoutExt = stripMdExtension(file.name);
      if (fileNameWithoutExt.length >= 2) {
        for (const otherFile of allFiles) {
          if (otherFile.id === file.id) continue;
          const content = otherFile.content ?? '';
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let searchIdx = 0;
            while (searchIdx < line.length) {
              const mentionIdx = line.indexOf(fileNameWithoutExt, searchIdx);
              if (mentionIdx === -1) break;

              if (!isInsideLink(line, mentionIdx)) {
                const contextStart = Math.max(0, mentionIdx - 20);
                const contextEnd = Math.min(line.length, mentionIdx + fileNameWithoutExt.length + 20);
                const contextText = (contextStart > 0 ? '...' : '') + line.slice(contextStart, contextEnd) + (contextEnd < line.length ? '...' : '');

                unlinkedMentions.push({
                  sourceFileId: otherFile.id,
                  sourceFileName: otherFile.name,
                  target: fileNameWithoutExt,
                  type: 'wikilink',
                  line: i + 1,
                  matchedName: fileNameWithoutExt,
                  text: contextText,
                });
                // Only one mention per line per source file
                break;
              }

              searchIdx = mentionIdx + 1;
            }
          }
        }
      }

      newIndex.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        outgoingLinks: outgoing,
        backlinks,
        unlinkedMentions,
      });
    }

    setFileIndex(newIndex);
    setFileHeadings(headingsMap);
    setFilePathMap(collectFilePaths(folder));
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

  // --- Query functions ---

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

  const searchFiles = useCallback((query: string): FileNode[] => {
    // We don't have access to rootFolder as state here; accept it via closure
    // from the last rebuild. Since we track file names in the index, use that.
    if (!query) return [];
    const lower = query.toLowerCase();
    const results: FileNode[] = [];
    for (const [, entry] of fileIndex) {
      if (stripMdExtension(entry.fileName).toLowerCase().includes(lower)) {
        results.push({
          id: entry.fileId,
          name: entry.fileName,
          type: 'file',
          createdAt: 0,
          updatedAt: 0,
        });
      }
    }
    return results;
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

  // --- Context value ---

  const contextValue: LinkIndexContextType = {
    fileIndex,
    indexVersion,
    rebuildIndex,
    updateFileIndex,
    getBacklinks,
    getOutgoingLinks,
    getUnlinkedMentions,
    resolveTarget,
    resolveTargetFuzzy,
    getFilePath,
    searchFiles,
    getGraphData,
    getFileHeadings,
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
