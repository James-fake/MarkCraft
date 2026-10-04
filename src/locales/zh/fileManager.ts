export const sidebar = {
  createFolder: '创建新文件夹',
  folderNamePlaceholder: '请输入文件夹名...',
  newFolder: '新文件夹',
  searchPlaceholder: '搜索文件...',
  collapseSidebar: '收起文件列表',
  expandFileList: '展开文件列表',
}

export const sidebarExtra = {
  files: '文件',
  newFileTitle: '新建文件',
  newFolderTitle: '新建文件夹',
  importFile: '打开文件',
  searchResults: '搜索结果',
  noMatchFound: '未找到匹配的文件',
  blogStudio: '博客工作室',
  collapsePanel: '收起面板',
  batchMode: '批量选择',
  exitBatchMode: '退出批量选择',
  selectedCount: '已选 {count} 项',
  cancel: '取消',
  batchDelete: '批量删除',
  batchDeleteConfirm: '确认批量删除',
  batchDeleteMessage: '确定要删除选中的 {count} 个项目吗？此操作不可撤销。',
  fileTreeEmptyTitle: '还没有文件',
  fileTreeEmptyDesc: '创建你的第一篇笔记，开始构建知识库',
  fileTreeEmptyCta: '新建笔记',
    searchEmptyTitle: '没有匹配的结果',
    searchEmptyDesc: '换个关键词试试，或浏览全部文件',
    searchEmptyClear: '清除搜索',
    canvasSectionTitle: '画布',
    noCanvasTitle: '还没有画布',
    noCanvasDesc: '用白板自由组织灵感、流程图与关系网络',
    newCanvasCta: '新建画布',
  }

export const fileTreeNode = {
  newFile: '新建文件',
  newFolder: '新建文件夹',
  rename: '重命名',
  renamePlaceholder: '请输入新名称...',
  delete: '删除',
  confirmDelete: '确认删除',
  confirmDeleteMessage: '确定要删除「{name}」吗？',
  folderDeleteWarning: '该文件夹下的所有文件和子文件夹都将被删除。',
  cancel: '取消',
  createNewFolder: '创建新文件夹',
  folderNamePlaceholder: '请输入文件夹名...',
  newFolderDefault: '新文件夹',
  copyLink: '复制链接',
}

export const createFile = {
  defaultName: '新文件.md',
  rootFolder: '根目录',
  fileName: '文件名',
  folderName: '文件夹',
  selectFolder: '选择文件夹',
  create: '创建',
  cancel: '取消',
}

export const createFileExtra = {
  title: '创建新文件',
  subtitle: '在指定文件夹中创建 Markdown 文档',
  fileNameLabel: '文件名',
  fileNamePlaceholder: '请输入文件名...',
  targetFolder: '目标文件夹',
  noFolderAvailable: '没有可用的文件夹',
  willCreateTo: '将创建至',
  notSelected: '未选择',
  createFileBtn: '创建文件',
}

export const quickOpen = {
  searchPlaceholder: '搜索文件名... (Ctrl+P 打开, Esc 关闭)',
  noMatchFound: '未找到匹配的文件',
  recentSearches: '最近搜索',
  recentOpen: '最近打开',
  opened: '已打开',
  navigate: '↑↓ 导航',
  open: '↵ 打开',
  escClose: 'Esc 关闭',
  fileCount: '个文件',
}

export const globalSearch = {
  searchPlaceholder: '在所有文件中搜索... (Ctrl+Shift+F)',
  matchesCount: '个匹配',
  noMatchFound: '未找到匹配的内容',
  searchHint: '输入关键词搜索所有文件内容',
  matchCount: '处匹配',
  navigate: '↑↓ 导航',
  openFile: '↵ 打开文件',
  escClose: 'Esc 关闭',
  fileCount: '个文件',
  // 布尔查询模式
  booleanPlaceholder: '布尔查询：foo AND bar / foo OR bar / foo NOT bar',
  replaceDisabledInBoolean: '布尔查询模式下不支持替换',
  replaceMode: '替换模式',
  // 过滤器
  filter: '过滤器',
  // 开关状态（title）
  caseSensitiveOn: '区分大小写: 开',
  caseSensitiveOff: '区分大小写: 关',
  wholeWordOn: '全词匹配: 开',
  wholeWordOff: '全词匹配: 关',
  regexOn: '正则表达式: 开',
  regexOff: '正则表达式: 关',
  booleanOn: '布尔查询: 开（支持 AND / OR / NOT，"短语" 用引号）',
  booleanOff: '布尔查询: 关',
  // 替换栏
  replacePlaceholder: '替换为...',
  replaceAll: '全部替换',
  replaceCurrentFileTitle: '只替换当前活动文件中的所有匹配',
  noOpenFile: '没有打开的文件',
  replaceCurrentFile: '仅当前文件',
  undo: '撤销',
  // 过滤器选项
  pathAll: '📁 路径: 全部',
  tagAll: '🏷️ 标签: 全部',
  clear: '清除',
  // 单条替换内联
  replaceThis: '替换此条',
  replace: '替换',
  inputReplaceText: '输入替换文本...',
  cancel: '取消',
  // 结果列表超出阈值
  moreMatches: '...还有 {n} 处匹配',
  // 时间预设
  timeAll: '全部时间',
  timeToday: '今天',
  timeWeek: '本周',
  timeMonth: '本月',
  timeYear: '本年',
  // 替换预览（哑组件）
  confirmReplace: '确认替换',
  replacePreviewTitle: '替换预览（{changes} 处修改 / {files} 个文件）',
  noChanges: '没有实际变化',
  // 导出搜索结果（buildExportContent）
  exportTitle: '搜索结果',
  exportSummary: '共 {files} 个文件，{matches} 处匹配',
  exportPathLabel: '路径',
  exportCsvHeader: '文件,行号,列号,匹配,上下文',
  exportLinePrefix: 'L',
}

export const tabBar = {
  closeTab: '关闭标签页',
  closeAll: '关闭全部',
  closeOtherTabs: '关闭其他标签页',
  closeTabsToRight: '关闭右侧标签页',
}

export const defaultDocs = {
  rootFolder: '文件管理器',
  myNotes: '我的笔记',
  userManual: '用户手册.md',
  markdownTutorial: 'Markdown 入门教程.md',
}
