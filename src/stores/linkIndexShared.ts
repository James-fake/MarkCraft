import { FileNode } from '../types/fileManager';
import { collectAllFiles } from '@core/files/fileTree';

/**
 * LinkIndexStore 的类型与纯函数层（P5-2 自主文件拆出，实现逐字未动）。
 * 类型经 LinkIndexStore.tsx 再导出，消费方 import 路径不变。
 */

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

export interface LinkIndexContextType {
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

export const LINK_REGEX = /(!?)\[\[([^\]]+)\]\]/g;


/** Strip .md extension if present. */
// 已下沉 @core/files/fileMatch（两种编辑模式共用同一份匹配与排序）。
// 此处 import 供本文件使用，并 re-export 保持既有导入路径不变。
import { stripMdExtension } from '@core/files/fileMatch';

export { stripMdExtension };

/** Extract headings (H1-H6) from content */
export function extractHeadings(content: string): string[] {
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
export function parseLinks(sourceFileId: string, sourceFileName: string, content: string): LinkRecord[] {
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
export function buildNameMap(rootFolder: FileNode): Map<string, string> {
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

// 已下沉 @core/markdown/wikiLink（core 被 stores 与 features 两侧依赖，避免反向依赖）。
// 此处保留 re-export，既有导入路径不变。
export { isInsideLink } from '@core/markdown/wikiLink';

/** Build a path→fileId map from a folder tree, e.g. "folderA/Note" → fileId */
export function collectFilePaths(node: FileNode, basePath: string = ''): Map<string, string> {
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
