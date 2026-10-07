/**
 * 命令注册表 - 定义所有可用命令
 *
 * 命令面板通过此注册表获取并执行命令，各功能模块可在初始化时
 * 调用 commandRegistry.register() 注册自己的命令。
 */

export type CommandCategory =
  | 'file'
  | 'app'
  | 'edit'
  | 'view'
  | 'tools'
  | 'settings'
  | 'navigation'
  | 'window';

export interface CommandItem {
  /** 命令唯一标识 */
  id: string;
  /** 中文标签 */
  labelZh: string;
  /** 英文标签 */
  labelEn: string;
  /** 图标（emoji 或字符） */
  icon: string;
  /** 命令分类，用于分组显示 */
  category: CommandCategory;
  /** 搜索关键字 */
  keywords: string[];
  /** 执行命令的回调 */
  action: () => void;
  /** 快捷键描述，例如 "Ctrl+P" */
  shortcut?: string;
  /** 可见性判断，返回 false 时不在面板中显示 */
  visible?: () => boolean;
}

/**
 * 命令注册中心，使用 Map 存储
 */
class CommandRegistryImpl {
  private commands = new Map<string, CommandItem>();

  /** 注册一个命令，若 id 已存在则覆盖 */
  register(cmd: CommandItem): void {
    this.commands.set(cmd.id, cmd);
  }

  /** 注销指定命令 */
  unregister(id: string): void {
    this.commands.delete(id);
  }

  /** 获取所有已注册命令 */
  getAll(): CommandItem[] {
    return Array.from(this.commands.values());
  }

  /** 按 id 获取命令 */
  getById(id: string): CommandItem | undefined {
    return this.commands.get(id);
  }

  /** 清空所有命令 */
  clear(): void {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistryImpl();

/**
 * 预设命令 ID 常量
 * 集中管理便于注册与查询时保持一致
 */
export const CommandIds = {
  // 文件
  NewFile: 'file.newFile',
  NewFolder: 'file.newFolder',
  OpenFile: 'file.openFile',
  Save: 'file.save',
  SaveAs: 'file.saveAs',
  ImportFile: 'file.importFile',
  // 编辑
  Undo: 'edit.undo',
  Redo: 'edit.redo',
  Find: 'edit.find',
  Replace: 'edit.replace',
  FormatDocument: 'edit.formatDocument',
  // 视图
  TogglePreview: 'view.togglePreview',
  ToggleSidebar: 'view.toggleSidebar',
  FocusMode: 'view.focusMode',
  TypewriterMode: 'view.typewriterMode',
  ToggleTheme: 'view.toggleTheme',
  ToggleEditorMode: 'view.toggleEditorMode',
  // 导航
  QuickOpen: 'navigation.quickOpen',
  GoToLine: 'navigation.goToLine',
  GlobalSearch: 'navigation.globalSearch',
  // 工具
  OpenBlogStudio: 'tools.openBlogStudio',
  OpenOutline: 'tools.openOutline',
  InsertTable: 'tools.insertTable',
  InsertEmoji: 'tools.insertEmoji',
  OpenVersionHistory: 'tools.openVersionHistory',
  OpenBlockBacklinks: 'tools.openBlockBacklinks',
  OpenCanvas: 'tools.openCanvas',
  OpenKnowledgeBase: 'tools.openKnowledgeBase',
  GenerateReverseMoc: 'tools.generateReverseMoc',
  // 设置
  OpenSettings: 'settings.openSettings',
  SwitchLanguage: 'settings.switchLanguage',
} as const;

/** 分类显示名称（中/英文） */
export const CategoryLabels: Record<CommandCategory, { zh: string; en: string }> = {
  file: { zh: '文件', en: 'File' },
  app: { zh: '应用', en: 'App' },
  edit: { zh: '编辑', en: 'Edit' },
  view: { zh: '视图', en: 'View' },
  tools: { zh: '工具', en: 'Tools' },
  settings: { zh: '设置', en: 'Settings' },
  navigation: { zh: '导航', en: 'Navigation' },
  window: { zh: '窗口', en: 'Window' },
};
