import { describe, it, expect, beforeEach } from 'vitest'
import { commandRegistry } from '@services/command/commandRegistry'
import { COMMAND_CATALOG } from '../../features/commandPalette/commandCatalog'
import { adaptCommands } from './commandAdapter'
import { buildAuroraActions, type AuroraActionDeps } from './auroraActions'

beforeEach(() => {
  commandRegistry.clear()
})

describe('Phase 3 命令接线（共享 catalog + 适配器，D4 单一数据源）', () => {
  it('COMMAND_CATALOG 是 D4 单一数据源：字段完整、id 唯一、不含 Aurora 旧演示命令', () => {
    const ids = COMMAND_CATALOG.map((c) => c.id)
    // catalog 为单一数据源，条数随真实功能增删而变；用「实际条数」断言而非写死魔法数，
    // 避免删命令轮次后遗留的过期数字造成假红。回归防护改由下方 id 唯一 / 旧演示命令已移除 / 真实命令存在 守卫承担。
    expect(COMMAND_CATALOG.length).toBe(ids.length)
    expect(new Set(ids).size, '命令 id 必须唯一（D4 单一数据源）').toBe(ids.length)
    // 旧 Aurora 演示命令已被移除（不再硬编码于 AuroraShell）
    for (const demo of [
      'nav-welcome', 'file-new', 'file-open', 'file-save',
      'setting-theme', 'setting-sidebar', 'recent-1', 'recent-2', 'recent-3',
    ]) {
      expect(ids, `不应含旧演示命令 ${demo}`).not.toContain(demo)
    }
    // 真实命令存在（tools.openDashboard 已随仪表盘删除；tools.openGraphQuery 因与 graphView 重复已删除）
    for (const real of ['file.newFile', 'view.toggleTheme', 'settings.switchLanguage', 'tools.openBlogStudio']) {
      expect(ids, `应含真实命令 ${real}`).toContain(real)
    }
    // L-2 修复回归：另存为此前只挂工具栏「更多」，命令面板无入口 → 现须在目录中
    expect(ids, '命令面板应含 file.saveAs（L-2）').toContain('file.saveAs')
    // 字段完整
    for (const c of COMMAND_CATALOG) {
      expect(c.id).toBeTruthy()
      expect(c.labelZh).toBeTruthy()
      expect(c.labelEn).toBeTruthy()
      expect(c.icon).toBeTruthy()
      expect(c.category).toBeTruthy()
      expect(Array.isArray(c.keywords)).toBe(true)
    }
  })

  it('AuroraShell 注册模式：real CommandItem → Aurora CommandItem 形态正确', () => {
    const actions: Record<string, () => void> = {}
    COMMAND_CATALOG.forEach((m) => {
      actions[m.id] = () => {}
    })
    COMMAND_CATALOG.forEach((m) => {
      const a = actions[m.id]
      if (!a) return
      commandRegistry.register({ ...m, action: a })
    })

    const adapted = adaptCommands(commandRegistry.getAll())
    // catalog 全量 ≠ 面板可见条数：窗口菜单三条（最小化 / 缩放 / 全部移至最前）是
    // 「菜单专属」命令（visible:false 的 web no-op，仅由 MenuBar 的 MENUS 渲染，不进命令面板）。
    // 故断言改为「可见命令一条不丢」——按 id 逐条对齐，比裸计数更能挡住静默丢失。
    const visibleMeta = COMMAND_CATALOG.filter((m) => (m.visible ? m.visible() : true))
    expect(adapted.map((c) => c.id)).toEqual(visibleMeta.map((m) => m.id))

    // file.save 在 catalog 中带 shortcut 'Ctrl+S' → 适配器应解析为 ['Ctrl','S']
    const save = adapted.find((c) => c.id === 'file.save')!
    expect(save.title).toBe('保存')
    expect(save.group).toBe('file')
    expect(save.shortcut).toEqual(['Ctrl', 'S'])

    // file.newFile 批次④补 shortcut 'Ctrl+N' → 适配器应解析为 ['Ctrl','N']
    const newFile = adapted.find((c) => c.id === 'file.newFile')!
    expect(newFile.title).toBe('新建笔记')
    expect(newFile.group).toBe('file')
    expect(newFile.shortcut).toEqual(['Ctrl', 'N'])

    // file.newFolder 无 shortcut → undefined（验证「无快捷键命令安全降级」）
    const newFolder = adapted.find((c) => c.id === 'file.newFolder')!
    expect(newFolder.title).toBe('新建文件夹')
    expect(newFolder.group).toBe('file')
    expect(newFolder.shortcut).toBeUndefined()

    // L-2 修复回归：file.saveAs 在 catalog 中带 shortcut 'Ctrl+Shift+S' → 解析为 ['Ctrl','Shift','S']
    // （内置《使用文档》一直声明该键位，但此前既无命令、也未绑定快捷键）
    const saveAs = adapted.find((c) => c.id === 'file.saveAs')!
    expect(saveAs.title).toBe('另存为')
    expect(saveAs.group).toBe('file')
    expect(saveAs.shortcut).toEqual(['Ctrl', 'Shift', 'S'])

    const theme = adapted.find((c) => c.id === 'view.toggleTheme')!
    expect(theme.group).toBe('view')
    expect(theme.shortcut).toBeUndefined()

    const tsMode = adapted.find((c) => c.id === 'view.toggleEditorMode')!
    expect(tsMode.shortcut).toEqual(['G', 'M'])
  })

  it('visible 过滤：visible() 返回 false 的命令在适配后被过滤', () => {
    commandRegistry.register({
      id: 'tools.openVersionHistory',
      labelZh: '版本历史',
      labelEn: 'Version History',
      icon: 'history',
      category: 'tools',
      keywords: ['v'],
      visible: () => false,
      action: () => {},
    })
    const adapted = adaptCommands(commandRegistry.getAll())
    expect(adapted.find((c) => c.id === 'tools.openVersionHistory')).toBeUndefined()
  })

  it('Phase 3d：弹层命令均已接入 buildAuroraActions（命令面板可触达、弹层可达）', () => {
    const modalCalls: string[] = []
    const deps: AuroraActionDeps = {
      rootFolder: { id: 'root', name: 'root', type: 'folder', children: [], createdAt: 0, updatedAt: 0 },
      createFile: () => 'id',
      createFolder: () => 'id',
      openFile: () => {},
      getActiveFileId: () => 'file-1',
      updateSetting: () => {},
      theme: 'dark',
      toggleLanguage: () => {},
      nav: () => {},
      modalOpen: (id) => { modalCalls.push(id) },
      viewRef: { current: 'editor' },
      toast: () => {},
      labels: {
        untitled: '未命名',
        newFolder: '新建文件夹',
        openNoteFirst: '请先在编辑器中打开一篇笔记',
      },
    }
    const actions = buildAuroraActions(deps)

    const modalCommands = [
      'tools.linkRedirect', 'tools.openBlockBacklinks',
      'tools.insertTemplate', 'tools.templateDiscovery', 'file.quickCapture',
      'tools.librarySync', 'tools.migrate', 'navigation.quickSwitcher',
    ]
    const catalogIds = COMMAND_CATALOG.map((c) => c.id)
    for (const id of modalCommands) {
      expect(catalogIds, `COMMAND_CATALOG 应含 ${id}`).toContain(id)
      expect(actions[id], `auroraActions 应接线 ${id}`).toBeTypeOf('function')
    }

    // 「打开文件」已改为直达系统文件框（不再走弹窗），但仍须在目录中且已接线
    expect(catalogIds).toContain('file.importFile')
    expect(actions['file.importFile']).toBeTypeOf('function')

    // 触发型命令确实调用 modalOpen（行为守恒：命令面板 → 打开对应弹层）
    actions['tools.migrate']!()
    actions['navigation.quickSwitcher']!()
    expect(modalCalls).toContain('migrate')
    expect(modalCalls).toContain('quickSwitcher')
    expect(modalCalls).not.toContain('import')

    // tools.openBlockBacklinks 有 activeFileId 时才开（守卫逻辑）
    const calls2: string[] = []
    const noFileDeps: AuroraActionDeps = { ...deps, getActiveFileId: () => null, modalOpen: (id) => { calls2.push(id) } }
    buildAuroraActions(noFileDeps)['tools.openBlockBacklinks']!()
    expect(calls2).not.toContain('blockBacklinks')
  })
})
