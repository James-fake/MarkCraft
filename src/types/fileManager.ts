export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  parentId?: string;
  createdAt: number;
  updatedAt: number;
  isExpanded?: boolean;
  order?: number;
}

export interface Tab {
  id: string;
  fileId: string;
  name: string;
  isActive: boolean;
  isDirty?: boolean;
  /**
   * **瞬态（预览）标签**：内置「使用文档」这类**只读参考页**专用。
   *
   * 用户语义（2026-09-22）：使用文档「只能从知识库点进去看」，不能变成编辑器里一个
   * 「被打开 / 被记住」的文档。故瞬态标签在四处被特殊对待：
   *   ① 不出现在标签栏（`AuroraTabs` 过滤）——它不是「打开的文件」；
   *   ② 不进「最近文件」（`FileStore.openFile` 跳过 addRecentFile）；
   *   ③ 不落盘（`stripTransientTabs`）——「看着说明书时刷新」不该被记成上次打开的文档；
   *   ④ 离开编辑器视图即整体回收（`closeTransientTabs`）。
   * 打开任意普通文档时也会把瞬态标签一并回收（预览被正式打开替换，VS Code 同款语义）。
   */
  isTransient?: boolean;
}

export interface FileManagerState {
  rootFolder: FileNode;
  tabs: Tab[];
  activeTabId: string | null;
  searchQuery: string;
  sidebarVisible: boolean;
}
