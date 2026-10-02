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

/** P1.2: 导出搜索结果 —— 内容构建纯函数；Blob 下载由调用方承担 */
export function buildExportContent(
  format: 'md' | 'csv' | 'json',
  data: { query: string; results: GlobalSearchResult[]; totalMatches: number },
): string {
  const { query, results, totalMatches } = data;
  let content = '';

  if (format === 'md') {
    content = `# 搜索结果: ${query}\n\n共 ${results.length} 个文件，${totalMatches} 处匹配\n\n`;
    for (const r of results) {
      content += `## ${r.fileName}\n\n路径: ${r.filePath}\n\n`;
      for (const m of r.matches) {
        content += `- L${m.line}: ${m.text.trim()}\n`;
      }
      content += '\n';
    }
  } else if (format === 'csv') {
    content = '文件,行号,列号,匹配,上下文\n';
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
