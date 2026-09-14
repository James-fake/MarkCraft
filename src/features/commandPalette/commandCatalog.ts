/**
 * 命令元数据目录（D4 单一数据源）
 *
 * 抽取自 `src/App.tsx` 的 ~35 条 `commandRegistry.register` 调用。
 * 仅承载**壳无关的静态元数据**（id / 标签 / 图标 / 分类 / 关键字 / 快捷键）；
 * `action` 与 `visible` 由各自外壳（旧 App / AuroraShell）在注册时注入，
 * 因为它们依赖外壳本地的状态与处理器（如 `activeFileId`、各 modal 开关）。
 *
 * 两处消费方：
 * - `src/App.tsx`：配 App 本地 action/visible 注册（旧壳，Phase 4 退役）。
 * - `src/aurora/app/*`：配 Aurora 本地 action/overlay 注册（Phase 3 接管）。
 */

import type { CommandCategory } from './commandRegistry'

/** 命令静态元数据（不含 action / visible） */
export interface CommandMeta {
  id: string
  labelZh: string
  labelEn: string
  icon: string
  category: CommandCategory
  keywords: string[]
  shortcut?: string
  /** 命令面板可见性（菜单栏不受影响，始终按 MENUS 渲染）。缺省可见 */
  visible?: () => boolean
}

export const COMMAND_CATALOG: CommandMeta[] = [
  // 文件
  { id: 'file.newFile', labelZh: '新建笔记', labelEn: 'New Note', icon: 'file', category: 'file', keywords: ['create', 'note', '文件', '创建', '新建'], shortcut: 'Ctrl+N' },
  { id: 'file.importFile', labelZh: '打开文件', labelEn: 'Open File', icon: 'folder', category: 'file', keywords: ['open', 'import', '打开', '导入', '文件'] },
  { id: 'file.save', labelZh: '保存', labelEn: 'Save', icon: 'check', category: 'file', keywords: ['save', '保存', '存储'], shortcut: 'Ctrl+S' },
  { id: 'file.newFolder', labelZh: '新建文件夹', labelEn: 'New Folder', icon: 'folder', category: 'file', keywords: ['folder', '文件夹', '新建', '目录'] },
  { id: 'file.openDailyNote', labelZh: '打开今日笔记', labelEn: 'Open Daily Note', icon: 'calendar', category: 'file', keywords: ['daily', 'note', '日记', '今日', '笔记'] },
  { id: 'file.quickCapture', labelZh: '快速记一笔', labelEn: 'Quick Capture', icon: 'pen', category: 'file', keywords: ['capture', 'quick', '记一笔', '速记', '灵感'], shortcut: 'Ctrl+Shift+N' },
  { id: 'file.close', labelZh: '关闭', labelEn: 'Close', icon: 'close', category: 'file', keywords: ['close', '关闭', 'tab', '标签页'], shortcut: 'Ctrl+W' },

  // 应用（使用优化 2026-09-10：App 菜单按钮已移除；关于/退出保留——⌘Q 拦截 + 命令面板可达；
  // hide 系列为菜单专属死命令（visible:false 的 web no-op），随菜单清剿）
  { id: 'app.about', labelZh: '关于 MarkCraft', labelEn: 'About MarkCraft', icon: 'info', category: 'app', keywords: ['about', '关于', '版本', '信息'] },
  { id: 'app.quit', labelZh: '退出 MarkCraft', labelEn: 'Quit MarkCraft', icon: 'power', category: 'app', keywords: ['quit', 'exit', '退出', '关闭'], shortcut: 'Ctrl+Q' },

  // 编辑（HIG §1.1 Edit 菜单：撤销 / 重做 / 剪贴板 / 查找）
  { id: 'edit.undo', labelZh: '撤销', labelEn: 'Undo', icon: 'undo', category: 'edit', keywords: ['undo', '撤销', '回退'], shortcut: 'Ctrl+Z' },
  { id: 'edit.redo', labelZh: '重做', labelEn: 'Redo', icon: 'redo', category: 'edit', keywords: ['redo', '重做', '重做'], shortcut: 'Ctrl+Shift+Z' },
  { id: 'edit.cut', labelZh: '剪切', labelEn: 'Cut', icon: 'scissors', category: 'edit', keywords: ['cut', '剪切', '剪下'], shortcut: 'Ctrl+X' },
  { id: 'edit.copy', labelZh: '复制', labelEn: 'Copy', icon: 'copy', category: 'edit', keywords: ['copy', '复制'], shortcut: 'Ctrl+C' },
  { id: 'edit.paste', labelZh: '粘贴', labelEn: 'Paste', icon: 'clipboard', category: 'edit', keywords: ['paste', '粘贴'], shortcut: 'Ctrl+V' },
  { id: 'edit.selectAll', labelZh: '全选', labelEn: 'Select All', icon: 'select-all', category: 'edit', keywords: ['select', 'all', '全选'], shortcut: 'Ctrl+A' },
  { id: 'edit.delete', labelZh: '删除', labelEn: 'Delete', icon: 'trash', category: 'edit', keywords: ['delete', '删除'] },
  { id: 'edit.find', labelZh: '查找', labelEn: 'Find', icon: 'search', category: 'edit', keywords: ['find', 'search', '查找', '搜索'], shortcut: 'Ctrl+F' },

  // 窗口（HIG §1.1 Window 菜单：最小化 / 缩放 / 全部前置）
  { id: 'window.minimize', labelZh: '最小化', labelEn: 'Minimize', icon: 'minimize', category: 'window', keywords: ['minimize', '最小化'], shortcut: 'Ctrl+M', visible: () => false },
  { id: 'window.zoom', labelZh: '缩放', labelEn: 'Zoom', icon: 'maximize', category: 'window', keywords: ['zoom', '缩放', '全屏'], visible: () => false },
  { id: 'window.bringAllToFront', labelZh: '全部移至最前', labelEn: 'Bring All to Front', icon: 'layers', category: 'window', keywords: ['front', '最前', '全部前置'], visible: () => false },

  // 视图
  { id: 'view.togglePreview', labelZh: '切换预览', labelEn: 'Toggle Preview', icon: 'eye', category: 'view', keywords: ['preview', '预览', '切换'] },
  { id: 'view.toggleSidebar', labelZh: '切换侧边栏', labelEn: 'Toggle Sidebar', icon: 'sidebar', category: 'view', keywords: ['sidebar', '侧边栏', '切换'] },
  { id: 'view.focusMode', labelZh: '专注模式', labelEn: 'Focus Mode', icon: 'target', category: 'view', keywords: ['focus', '专注', '模式'] },
  { id: 'view.typewriterMode', labelZh: '打字机模式', labelEn: 'Typewriter Mode', icon: 'keyboard', category: 'view', keywords: ['typewriter', '打字机', '模式'], shortcut: 'Ctrl+Shift+T' },
  { id: 'view.toggleTheme', labelZh: '切换深色/浅色主题', labelEn: 'Toggle Dark/Light Theme', icon: 'moon', category: 'view', keywords: ['theme', '主题', 'dark', 'light', '暗色', '亮色', '深色', '浅色'] },
  { id: 'view.toggleEditorMode', labelZh: '切换编辑模式（源码 / 所见即所得）', labelEn: 'Toggle Editor Mode', icon: 'edit', category: 'view', keywords: ['mode', '模式', '源码', 'wysiwyg', '切换', 'source', '编辑'], shortcut: 'G M' },

  // 导航
  { id: 'navigation.quickOpen', labelZh: '快速打开文件', labelEn: 'Quick Open', icon: 'search', category: 'navigation', keywords: ['open', 'quick', '快速', '打开', '文件'], shortcut: 'Ctrl+Shift+O' },
  { id: 'navigation.globalSearch', labelZh: '全局搜索', labelEn: 'Global Search', icon: 'search', category: 'navigation', keywords: ['search', 'global', '搜索', '全局'], shortcut: 'Ctrl+Shift+F' },
  { id: 'navigation.graphView', labelZh: '双链图谱', labelEn: 'Graph View', icon: 'knowledgeGraph', category: 'navigation', keywords: ['graph', '图谱', '双链', '双链图谱', '知识图谱', '链接'], shortcut: 'Ctrl+Shift+G' },
  { id: 'navigation.quickSwitcher', labelZh: '快速切换文件', labelEn: 'Quick Switcher', icon: 'bolt', category: 'navigation', keywords: ['switch', 'quick', '快速', '切换', '文件'], shortcut: 'Ctrl+O' },
  { id: 'navigation.goToLine', labelZh: '跳转到行号', labelEn: 'Go to Line', icon: 'hash', category: 'navigation', keywords: ['goto', 'line', '行号', '跳转', '跳行'], shortcut: 'Ctrl+G' },

  // 工具
  { id: 'tools.linkRedirect', labelZh: '链接重定向', labelEn: 'Link Redirect', icon: 'sync', category: 'tools', keywords: ['redirect', 'link', '重定向', '链接', '批量'] },
  { id: 'tools.insertTemplate', labelZh: '插入模板', labelEn: 'Insert Template', icon: 'template', category: 'tools', keywords: ['template', '模板', '插入'], shortcut: 'Ctrl+Alt+T' },
  { id: 'tools.templateDiscovery', labelZh: '发现社区模板', labelEn: 'Discover Templates', icon: 'search', category: 'tools', keywords: ['template', 'community', '发现', '社区', '模板', '范例'] },
  { id: 'tools.librarySync', labelZh: '库同步（导出/导入）', labelEn: 'Library Sync', icon: 'sync', category: 'tools', keywords: ['sync', 'backup', '同步', '备份', '导出', '导入'] },
  { id: 'tools.openBlogStudio', labelZh: '博客工作室', labelEn: 'Blog Studio', icon: 'pen', category: 'tools', keywords: ['blog', '博客', '工作室', 'studio', '发布'] },
  { id: 'tools.migrate', labelZh: '迁移笔记（Obsidian/Notion）', labelEn: 'Migrate Notes (Obsidian/Notion)', icon: 'import', category: 'tools', keywords: ['migrate', '迁移', 'obsidian', 'notion', '导入', 'import', 'zip'] },
  { id: 'tools.openVersionHistory', labelZh: '版本历史', labelEn: 'Version History', icon: 'history', category: 'tools', keywords: ['version', 'history', '版本', '历史', '恢复', 'restore'] },
  { id: 'tools.openBlockBacklinks', labelZh: '块反链面板', labelEn: 'Block Backlinks', icon: 'backlinks', category: 'tools', keywords: ['block', 'reference', 'backlink', '块', '引用', '反链'] },
  { id: 'tools.diary', labelZh: '日记', labelEn: 'Diary', icon: 'book', category: 'tools', keywords: ['diary', 'journal', 'daily', '日记', '日历', '时间线', '回顾'] },
  { id: 'tools.openCanvas', labelZh: '白板', labelEn: 'Canvas', icon: 'canvasList', category: 'tools', keywords: ['canvas', 'whiteboard', '白板', '画布'] },
  { id: 'tools.openKnowledgeBase', labelZh: '知识库', labelEn: 'Knowledge Base', icon: 'library', category: 'tools', keywords: ['knowledge', 'base', '知识库', 'workspace'] },
  { id: 'tools.crossKbSearch', labelZh: '跨知识库搜索', labelEn: 'Cross-KB Search', icon: 'search', category: 'tools', keywords: ['cross', 'kb', 'search', '跨库', '搜索', '跨知识库'] },
  { id: 'tools.generateReverseMoc', labelZh: '生成反向 MOC（当前文件）', labelEn: 'Generate Reverse MOC', icon: 'sync', category: 'tools', keywords: ['reverse', 'moc', 'outgoing', '反向', '出链'] },
  { id: 'editor.publish', labelZh: '发布为博客', labelEn: 'Publish to Blog', icon: 'send', category: 'tools', keywords: ['publish', 'blog', '发布', '博客', '导出', '分享'] },
  { id: 'editor.addToKb', labelZh: '加入知识库', labelEn: 'Add to Knowledge Base', icon: 'plus', category: 'tools', keywords: ['knowledge', 'base', '知识库', '关联', '加入', 'kb', '收藏'] },

  // 设置
  { id: 'settings.openSettings', labelZh: '打开设置', labelEn: 'Open Settings', icon: 'settings', category: 'settings', keywords: ['settings', '设置', '配置'], shortcut: 'Ctrl+,' },
  { id: 'settings.switchLanguage', labelZh: '切换中/英文', labelEn: 'Switch Language', icon: 'globe', category: 'settings', keywords: ['language', '语言', '中英文', 'english', 'chinese', '切换'] },
]

/** id → 元数据 快速查表 */
export const COMMAND_CATALOG_BY_ID: Record<string, CommandMeta> = Object.fromEntries(
  COMMAND_CATALOG.map((m) => [m.id, m]),
)
