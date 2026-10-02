import { FileNode } from '../types/fileManager';
import { collectAllFiles } from '@core/files/fileTree';
import { buildNameMap, collectFilePaths, extractHeadings, isInsideLink, parseLinks, stripMdExtension } from './linkIndexShared';
import type { FileLinkIndex, LinkRecord } from './linkIndexShared';

/**
 * 全量索引构建纯函数（P5-2 自 LinkIndexStore#doRebuild 的计算段拆出，逻辑逐字未动）。
 * 「算与报分离」：本函数只算快照（含 P0.3 内容缓存），落 state（setFileIndex/
 * setFileHeadings/…）与 contentCacheRef 写入由 Provider 承担。
 */
export interface LinkIndexSnapshot {
  fileIndex: Map<string, FileLinkIndex>;
  headingsMap: Map<string, string[]>;
  filePathMap: Map<string, string>;
  /** P0.3: 文件内容缓存，供增量计算 unlinkedMentions 使用 */
  contentCache: Map<string, { content: string; fileName: string }>;
}

export function buildIndexSnapshot(folder: FileNode): LinkIndexSnapshot {
  const allFiles = collectAllFiles(folder);
  const nameMap = buildNameMap(folder);

  // P0.3: 缓存所有文件内容，供增量更新使用
  const contentCache = new Map<string, { content: string; fileName: string }>();
  for (const file of allFiles) {
    contentCache.set(file.id, { content: file.content ?? '', fileName: file.name });
  }
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

  return {
    fileIndex: newIndex,
    headingsMap,
    filePathMap: collectFilePaths(folder),
    contentCache,
  };
}
