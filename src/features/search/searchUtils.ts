import type { FileNode } from '../../types/fileManager'
import type { GlobalSearchResult } from './useGlobalSearch'

export const CONTEXT_CHARS = 40;
export const MAX_VISIBLE_MATCHES = 5;

/** 收集所有文件夹节点用于路径过滤下拉 */
export function collectFolders(node: FileNode, path = ''): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  if (node.type === 'folder' && node.id !== 'root') {
    const fullPath = path ? `${path} / ${node.name}` : node.name;
    result.push({ id: node.id, name: fullPath });
  }
  if (node.children) {
    const childPath = node.id === 'root' ? '' : (path ? `${path} / ${node.name}` : node.name);
    for (const child of node.children) {
      result.push(...collectFolders(child, childPath));
    }
  }
  return result;
}

export const TIME_PRESETS = [
  { id: 'all', label: '全部时间' },
  { id: 'today', label: '今天' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'year', label: '本年' },
];

export function getTimeRange(preset: string): { start: number; end: number } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (preset) {
    case 'today': return { start: now - day, end: now };
    case 'week': return { start: now - 7 * day, end: now };
    case 'month': return { start: now - 30 * day, end: now };
    case 'year': return { start: now - 365 * day, end: now };
    default: return { start: 0, end: 0 };
  }
}

/** 递归查找文件节点 */
export function findFile(node: FileNode, fileId: string): FileNode | null {
  if (node.id === fileId) return node;
  if (node.children) {
    for (const c of node.children) {
      const found = findFile(c, fileId);
      if (found) return found;
    }
  }
  return null;
}

/** P1.2 任务3: 全部替换 diff 预览数据（modifications 待应用修改 / diffs 逐行差异） */
export interface ReplaceDiffPreview {
  modifications: { fileId: string; fileName: string; oldContent: string; newContent: string }[];
  diffs: { fileName: string; line: number; oldLine: string; newLine: string }[];
}

/** 导出搜索结果时使用的用户可见文案（可被调用方以目标语言覆盖） */
export interface SearchExportMessages {
  /** 导出标题（用于 Markdown 一级标题，后接 ": {query}"） */
  exportTitle: string
  /** 摘要模板（{files}=文件数，{matches}=匹配数） */
  exportSummary: string
  /** 路径标签（后接 ": {path}"） */
  exportPathLabel: string
  /** CSV 表头 */
  exportCsvHeader: string
  /** 行号前缀（后接行号，如 L42） */
  exportLinePrefix: string
}

export const DEFAULT_SEARCH_EXPORT_MESSAGES: SearchExportMessages = {
  exportTitle: '搜索结果',
  exportSummary: '共 {files} 个文件，{matches} 处匹配',
  exportPathLabel: '路径',
  exportCsvHeader: '文件,行号,列号,匹配,上下文',
  exportLinePrefix: 'L',
}

/** P1.2: 导出搜索结果 —— 内容构建纯函数；Blob 下载由调用方承担 */
export function buildExportContent(
  format: 'md' | 'csv' | 'json',
  data: { query: string; results: GlobalSearchResult[]; totalMatches: number },
  messages: SearchExportMessages = DEFAULT_SEARCH_EXPORT_MESSAGES,
): string {
  const { query, results, totalMatches } = data;
  let content = '';

  if (format === 'md') {
    content = `# ${messages.exportTitle}: ${query}\n\n${messages.exportSummary.replace('{files}', String(results.length)).replace('{matches}', String(totalMatches))}\n\n`;
    for (const r of results) {
      content += `## ${r.fileName}\n\n${messages.exportPathLabel}: ${r.filePath}\n\n`;
      for (const m of r.matches) {
        content += `- ${messages.exportLinePrefix}${m.line}: ${m.text.trim()}\n`;
      }
      content += '\n';
    }
  } else if (format === 'csv') {
    content = `${messages.exportCsvHeader}\n`;
    for (const r of results) {
      for (const m of r.matches) {
        const ctx = m.text.replace(/"/g, '""').trim();
        const matchText = m.text.substring(m.highlightStart, m.highlightEnd).replace(/"/g, '""');
        content += `"${r.fileName}",${m.line},${m.column},"${matchText}","${ctx}"\n`;
      }
    }
  } else {
    content = JSON.stringify({ query, totalMatches, results }, null, 2);
  }

  return content;
}
