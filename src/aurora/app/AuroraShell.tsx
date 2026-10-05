import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ToastProvider, useToast } from '../../components/ui/ToastProvider'
import { logger } from '../../utils/logger'
import { useAuroraShell } from './useAuroraShell'
import { RealProviders } from '../providers/RealProviders'
import { CommandPalette, type CommandItem, type FileSearchItem } from '../components/command-palette/CommandPalette'
import { CommandPaletteContext } from '../components/command-palette/CommandPaletteContext'
import { commandRegistry } from '@services/command/commandRegistry'
import { COMMAND_CATALOG } from '../../features/commandPalette/commandCatalog'
import { adaptCommands } from './commandAdapter'
import { useFileManager } from '../../stores/FileStore'
import { useSettings } from '../../stores/SettingsStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useLanguage } from '../../stores/LanguageStore'
import { ensureUsageDocsKb } from '../../stores/kbSeed'
import { applyTheme } from '../../features/themes/ThemeManager'
import { collectFiles, exportLibraryBundle, parseLibraryBundle, mergeLibraryFiles, downloadTextFile } from '../../features/pwa/librarySync'
import LibrarySyncModal from '../../features/pwa/LibrarySyncModal'
import MigrateWizard from '../../features/migrate/MigrateWizard'
import QuickSwitcher from '../../features/editor/components/QuickSwitcher'
import QuickOpen from '../../features/search/QuickOpen'
import GlobalSearch from '../../features/search/GlobalSearch'
import { CrossKbSearch } from '../../features/knowledgeBase/components/CrossKbSearch'
import { navigationTracker } from '../../features/editor/NavigationTracker'
import { useAppGlobalEffects } from '../../features/appRuntime/useAppGlobalEffects'
import type { FileNode } from '../../types/fileManager'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getBackup, clearBackup } from '../../services/crashRecovery'
import type { CrashBackup } from '../../services/crashRecovery'
import type { AuroraModalControls, AuroraModalId, EditorCommandBridge } from '../panels/editor/EditorPanel'
import { WelcomePanel } from '../panels/welcome/WelcomePanel'
import { QuitModal } from '../components/shell/QuitModal'
import { EditorPanel } from '../panels/editor/EditorPanel'
import { CanvasPanel } from '../panels/canvas/CanvasPanel'
import { SettingsPanel } from '../panels/settings/SettingsPanel'
import { KbPanel } from '../panels/kb/KbPanel'
import { KbManagePanel } from '../panels/kb/KbManagePanel'
import { GraphPanel } from '../panels/kb/GraphPanel'
import { BlogPanel } from '../panels/blog/BlogPanel'
import { DiaryPanel } from '../panels/diary/DiaryPanel'
import { UserAccountNavContext } from '../components/shell/UserAccountNav'
import { buildAuroraActions } from './auroraActions'

/**
 * AuroraShell —— 迁移 Phase 1 的顶层外壳骨架。
 *
 * 与旧 aurora-main 的 `AuroraApp` 相比：
 * - 路由改为真实 `viewState`（`#view=`，决策 D3），不再使用演示 `#/route`；
 * - 提供全局 Toast / Confirm 上下文（Phase 3 弹层收口的基础设施）；
 * - 命令面板、快捷键统一在此一处管理；
 * - 各面板仍自带 PageFrame 外壳（Phase 2 再统一为单一外壳），故本层只负责路由 + 全局层。
 */

// buildAuroraActions / AuroraActionDeps 已抽离到 ./auroraActions（纯逻辑模块，
// 不再随 AuroraShell 的整棵 UI 树连坐加载 Excalidraw，避免测试环境收集阶段崩溃）。
// eslint-disable-next-line react-refresh/only-export-components -- 壳入口的动作聚合 re-export，与 AuroraShell 同文件为入口形态
export { buildAuroraActions, type AuroraActionDeps } from './auroraActions'

function ShellInner() {
  const { view, params, auxView, commandOpen, setCommandOpen, nav, settingsInitialCategory } = useAuroraShell()
  const toast = useToast()

  // —— P0 · 应用级副作用常驻壳层（S5 MOC 自动更新 / S7 备份调度 / S6b beforeunload）——
  // 🚨 这三组原本寄生在 useAppLogic，而 useAppLogic 只被 EditorPanel 挂载；
  // renderView 是 switch/case ⇒ 切到白板/图谱/知识库时 EditorPanel 卸载，它们全部停摆
  // （白板改完链接关系 MOC 不更新；长时间停在白板备份不跑）。它们只依赖 store，与视图无关，
  // 故常驻于此。编辑器耦合的 S1/S2/S3/S4/S6a 仍由 EditorPanel 的 useAppLogic 承载，不双跑。
  useAppGlobalEffects()

  const renderPanel = () => {
    if (auxView === 'welcome') return <WelcomePanel nav={nav} toast={toast.show} onUseTemplate={() => { nav('editor'); modalOpen('templateInsert') }} />
    if (auxView === 'settings') return <SettingsPanel nav={nav} toast={toast.show} initialCategory={settingsInitialCategory ?? undefined} />
    switch (view) {
      case 'editor':
        return <EditorPanel nav={nav} auroraModal={auroraModal} cmdBridge={cmdBridge} onOpenCommandPalette={() => setCommandOpen(true)} />
      case 'canvas':
        return params?.canvasId
          ? <CanvasPanel canvasId={params.canvasId} nav={nav} toast={toast.show} />
          : <CanvasPanel nav={nav} toast={toast.show} />
      case 'diary':
        return <DiaryPanel nav={nav} toast={toast.show} />
      case 'graph':
        return params?.kbId
          ? <GraphPanel kbId={params.kbId} nav={nav} toast={toast.show} />
          : <GraphPanel nav={nav} toast={toast.show} />
      case 'blog':
        return params?.kbId ? (
          <BlogPanel kbId={params.kbId} nav={nav} toast={toast.show} />
        ) : (
          <BlogPanel nav={nav} toast={toast.show} />
        )
      case 'kb':
        return params?.kbId ? (
          <KbPanel kbId={params.kbId} nav={nav} toast={toast.show} />
        ) : (
          <KbManagePanel nav={nav} toast={toast.show} />
        )
      default:
        return <EditorPanel nav={nav} onOpenCommandPalette={() => setCommandOpen(true)} />
    }
  }

  // 命令：从共享 COMMAND_CATALOG 注册真实命令（D4 单一数据源），Aurora 接真实 action
  const { rootFolder, hydrated, createFile, createFolder, openFile, updateFileContent, getActiveFileId, tabs, closeTab, moveNode, closeTransientTabs } = useFileManager()
  const { settings, updateSetting } = useSettings()
  const theme = settings.theme
  const focusMode = !!settings.focusMode
  const typewriterMode = !!settings.typewriterMode
  const { getOutgoingLinks } = useLinkIndex()
  // 编辑器命令桥：EditorPanel 挂载时注册内部动作（保存/切预览/切内核/版本历史等）
  const cmdBridge = useRef<EditorCommandBridge>({})
  // 实时视图 ref：供 buildAuroraActions 在调用时读取最新视图，决定是否先跳编辑器（P1-3）
  const viewRef = useRef(view)
  viewRef.current = view

  // —— 瞬态（预览）标签随「离开编辑器视图」回收 ——
  // 用户需求（2026-09-22）：「使用文档的笔记只能从这个知识库中点击进入，退出来到编辑器界面
  // 不要再次显示这个笔记」→ 离开编辑器那一刻必须把这篇只读参考页整体丢掉（不留标签、不进最近、
  // 不落盘，见 FileStore.closeTransientTabs）。
  //
  // ⚠️ 判据落在**路由**、而不是 EditorPanel 的卸载清理：根节点是 `<StrictMode>`，dev 下
  //    每个组件 mount 都会 effect → cleanup → effect 走一轮；而「从知识库点开使用文档」正是
  //    「先建瞬态标签 → 再切路由挂载 EditorPanel」——卸载清理会被那次**假卸载**误触发，
  //    把刚点开的那篇当场关掉。视图切换与 StrictMode 无关，天然规避。
  //
  // ⚠️ 生效视图 = `auxView ?? view`：welcome / settings 是 Aurora 本地 aux 视图，它们的挂载
  //    本身即「离开了编辑器」。两个 aux 视图下的 effect 触发都是幂等空转（此时必然没有瞬态标签）。
  const effectiveView = auxView ?? view
  useEffect(() => {
    if (effectiveView !== 'editor') closeTransientTabs()
  }, [effectiveView, closeTransientTabs])
  // —— 运行时应用主题（补偿入口切换后 legacy App 的 useEditorSettings 主题应用被移除）——
  // settings.theme 为单一数据源；首屏由 index.html 的 app-theme-preference 脚本打底，
  // 此处在其变化（含主题切换/设置改动）时即时重应用，确保 Aurora 接管真实界面后主题切换有效。
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])
  // —— 高对比度备选（批次⑫ P3-E）：settings.contrast 单一数据源广播到 <html data-contrast>，
  // tokens.css `html[data-contrast='high']` 消费；'normal' 显式回写保证开关回退即时生效。
  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', settings.contrast)
  }, [settings.contrast])
  const { toggleLanguage, language, t } = useLanguage()

  // —— 内置「使用文档」知识库：一次性播种 ——
  // 用户需求（2026-09-21）：首次进入 MarkCraft，知识库界面默认已有「MarkCraft 使用文档」。
  // ensureUsageDocsKb 自身保证幂等（已有同名库直接复用）与「不复活」（用户删过就不再建）；
  // 此处仅做「终态去重」——rootFolder 每次变更都会换引用，避免重复走一遍对账。
  //
  // ⚠️ 必须等 `hydrated` —— FileStore 的 state 先给同步兜底树、再由 IndexedDB 权威树整体覆盖。
  //    若在兜底树上播种，建出的文件夹会被随后的权威树覆盖成幽灵节点，而 KB 已把该幽灵
  //    folderId 持久化 → 「知识库能进、里面 0 篇」（老用户升级路径的真实缺陷）。
  const usageDocsSeededRef = useRef(false)
  useEffect(() => {
    if (!hydrated) return
    if (usageDocsSeededRef.current) return
    logger.info('[kbSeed] 播种 effect 触发（hydrated 已就位）')
    void ensureUsageDocsKb({ rootFolder, lang: language, createFolder, createFile, moveNode })
      .then(() => { usageDocsSeededRef.current = true })   // 有 id 或 null（不复活）都算终态
      .catch((err) => { console.warn('[KB] 内置使用文档播种失败，将在下次树变更时重试：', err) })
  }, [hydrated, rootFolder, language, createFolder, createFile, moveNode])

  // —— 弹层开关（Phase 3d · 方案 B：单一数据源在 AuroraShell，面板就近渲染）——
  const [modals, setModals] = useState<Partial<Record<AuroraModalId, boolean>>>({})
  const [isDragOver, setIsDragOver] = useState(false)

  // —— P0 · 1.4 崩溃恢复：备份写入已由 useAppLogic S1(useAutoSave) 覆盖，此处仅补恢复入口 ——
  const [crashBackup, setCrashBackup] = useState<CrashBackup | null>(() => {
    try {
      return getBackup()
    } catch {
      return null
    }
  })
  const handleCrashRestore = useCallback(() => {
    if (!crashBackup) return
    // 双写：先落 store（保证文件已激活时 EditorPanel 的 activeFileId effect 读到新内容），
    // 再经命令桥写入当前草稿（处理文件本就激活、effect 不会重置的场景）
    updateFileContent(crashBackup.fileId, crashBackup.content)
    openFile(crashBackup.fileId)
    cmdBridge.current.restoreCrash?.(crashBackup.content)
    clearBackup()
    setCrashBackup(null)
  }, [crashBackup, updateFileContent, openFile, cmdBridge])
  const handleCrashDismiss = useCallback(() => {
    clearBackup()
    setCrashBackup(null)
  }, [])
  const modalOpen = useCallback((id: AuroraModalId) => {
    setModals((prev) => ({ ...prev, [id]: true }))
  }, [])
  const modalClose = useCallback((id: AuroraModalId) => {
    setModals((prev) => ({ ...prev, [id]: false }))
  }, [])
  const modalIsOpen = useCallback((id: AuroraModalId) => !!modals[id], [modals])
  const auroraModal: AuroraModalControls = { open: modalOpen, close: modalClose, isOpen: modalIsOpen }

  // —— S14 全局拖拽打开 .md（对齐 App.tsx App.tsx:377-436）——
  // 拖入 .md/.markdown/.txt 文件 → 在 root 新建并打开；拖拽中显示遮罩。
  useEffect(() => {
    let dragCounter = 0
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter++
      if (e.dataTransfer?.types.includes('Files')) setIsDragOver(true)
    }
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter--
      if (dragCounter === 0) setIsDragOver(false)
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter = 0
      setIsDragOver(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      for (const file of Array.from(files)) {
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
          try {
            const content = await file.text()
            const fileName = file.name.replace(/\.(md|markdown|txt)$/, '')
            createFile('root', fileName, content)
          } catch (err) {
            console.error('Failed to read dropped file', err)
          }
        }
      }
    }
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [createFile])

  const auroraActions = buildAuroraActions({
    rootFolder,
    createFile,
    createFolder,
    openFile,
    getActiveFileId,
    tabs,
    closeTab,
    updateSetting,
    theme,
    focusMode,
    typewriterMode,
    getOutgoingLinks,
    toggleLanguage,
    nav,
    modalOpen,
    cmdBridge,
    viewRef,
    toast: toast.show,
    labels: {
      untitled: t.editorPanel.untitled,
      newFolder: t.editorPanel.newFolder,
      openNoteFirst: t.editorPanel.openNoteFirst,
    },
  })

  // —— P0 · 1.5 全局键盘快捷键（真实 useKeyboardShortcuts hook，对齐 LegacyApp 键位）——
  useKeyboardShortcuts({
    onQuickOpen: () => modalOpen('quickOpen'),
    onGlobalSearch: () => modalOpen('globalSearch'),
    onToggleTypewriter: () => updateSetting('typewriterMode', !typewriterMode),
    onToggleFullscreen: () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen()
      } else {
        void document.documentElement.requestFullscreen()
      }
    },
    // 注：Ctrl+, 已由 useAuroraShell 绑定（settings aux 视图），此处不再绑定 onSettings 避免双触发
    onPrint: () => window.print(),
    onGraphView: () => nav('graph'),
    onCommandPalette: () => setCommandOpen(true),
    onTemplateInsert: () => { nav('editor'); modalOpen('templateInsert') },
    onNavigateBack: () => { const id = navigationTracker.back(); if (id) openFile(id) },
    onNavigateForward: () => { const id = navigationTracker.forward(); if (id) openFile(id) },
    onQuickSwitcher: () => modalOpen('quickSwitcher'),
    onSave: () => cmdBridge.current.save?.(),
    // —— 批次② P0-B：⌘Q/⌘W/⌘N/⌘F 应用层拦截（与菜单命令同一动作源）——
    onNewFile: () => auroraActions['file.newFile']?.(),
    onCloseFile: () => auroraActions['file.close']?.(),
    onQuit: () => auroraActions['app.quit']?.(),
    onFind: () => auroraActions['edit.find']?.(),
    onUndo: () => auroraActions['edit.undo']?.(),
    onRedo: () => auroraActions['edit.redo']?.(),
  })

  const [commands, setCommands] = useState<CommandItem[]>([])
  useEffect(() => {
    commandRegistry.clear()
    COMMAND_CATALOG.forEach((meta) => {
      const action = auroraActions[meta.id]
      if (!action) return
      commandRegistry.register({ ...meta, action })
    })
    setCommands(adaptCommands(commandRegistry.getAll(), language))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interop: auroraActions 由 buildAuroraActions 每渲染新建，补入将使注册表每帧重建并触发 setCommands 死循环；下方 deps 已枚举其全部实际输入
  }, [rootFolder, createFile, createFolder, openFile, theme, focusMode, typewriterMode, getOutgoingLinks, updateSetting, toggleLanguage, language, nav, getActiveFileId, modalOpen, cmdBridge, toast])

  // P2-4 融合文件搜索：从文件树派生全量文件列表（含嵌套），供命令面板按名称/路径检索
  const fileItems = useMemo<FileSearchItem[]>(() => {
    const acc: FileSearchItem[] = []
    const walk = (node: FileNode, base: string) => {
      if (node.type === 'folder') {
        const nextBase = base ? `${base}/${node.name}` : node.name
        for (const child of node.children ?? []) walk(child, nextBase)
      } else {
        acc.push({ id: node.id, name: node.name, path: base })
      }
    }
    walk(rootFolder, '')
    return acc
  }, [rootFolder])

  const handleOpenFileFromPalette = useCallback((id: string) => {
    openFile(id)
    nav('editor')
  }, [openFile, nav])

  // 侧栏头像「点击 → 账户设置」：一处定义，经上下文下发至全局 Sidebar
  const openUserSettings = useCallback(() => nav('settings', 'user'), [nav])

  // 批次② P0-B：确认退出 MarkCraft（自定义 QuitModal 主按钮）
  // Web 外壳下多数浏览器静默拒绝脚本关窗 —— 诚实处理：退出全屏并提示手动关闭。
  const handleQuitConfirm = useCallback(() => {
    modalClose('quit')
    try { window.close() } catch { /* 浏览器禁止脚本关窗时忽略 */ }
    if (!window.closed) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
      toast.show('当前为 Web 外壳，请在浏览器中手动关闭此标签页')
    }
  }, [modalClose, toast])

  return (
    <CommandPaletteContext.Provider value={{ openCommandPalette: () => setCommandOpen(true) }}>
    <UserAccountNavContext.Provider value={{ open: openUserSettings }}>
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 真实 Provider/Store 树已在 AuroraShell 顶层包住 ShellInner 本体，
          此处直接渲染面板（面板子树自然处于 RealProviders 上下文内）。 */}
      {/* 视图切换不做整屏动效（P1-A 回退，2026-09-11）：.aurora-view 曾包整屏淡入
          （PageFrame 含 MenuBar/Sidebar，整屏从 opacity:0 浮现）→ 用户感知「整体闪一下」。
          桌面应用外壳不应随视图重绘，切换回瞬时（与 VS Code 等一致）。 */}
      {renderPanel()}

      {/* —— Phase 3d：全局型真实弹层（方案 B：AuroraShell 持有渲染，portal 到 body）——
          编辑器相关弹层（import/linkRedirect/blockBacklinks/templateInsert/templateDiscovery/quickCapture）
          由 EditorPanel 就近渲染（见 EditorPanel.tsx）。 */}
      {modalIsOpen('librarySync') && (
        <LibrarySyncModal
          isOpen={modalIsOpen('librarySync')}
          onClose={() => modalClose('librarySync')}
          onExport={() => {
            const bundle = exportLibraryBundle(rootFolder)
            const stamp = new Date().toISOString().slice(0, 10)
            downloadTextFile(`markcraft-library-${stamp}.json`, bundle)
          }}
          onImportFile={async (file: File) => {
            const text = await file.text()
            const bundle = parseLibraryBundle(text)
            const existing = collectFiles(rootFolder).map((f) => ({
              id: f.id,
              name: f.name,
              content: f.content ?? '',
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
            }))
            const res = mergeLibraryFiles(existing, bundle.files)
            const existingById = new Map(existing.map((f) => [f.id, f]))
            for (const f of bundle.files) {
              const ex = existingById.get(f.id)
              if (!ex) createFile(rootFolder.id, f.name, f.content, false)
              else if (f.updatedAt > ex.updatedAt) updateFileContent(f.id, f.content)
            }
            return res
          }}
        />
      )}

      {modalIsOpen('migrate') && (
        <MigrateWizard isOpen={modalIsOpen('migrate')} onClose={() => modalClose('migrate')} />
      )}

      {modalIsOpen('quickSwitcher') && (
        <QuickSwitcher
          visible={modalIsOpen('quickSwitcher')}
          onClose={() => modalClose('quickSwitcher')}
          onOpenFile={(id) => {
            openFile(id)
            modalClose('quickSwitcher')
          }}
        />
      )}

      {/* —— P0 · 1.6 补回的 3 个真实搜索/跨库模态（quickOpen / globalSearch / crossKbSearch）——
          均渲染自身 fixed 浮层，层级天然在 Aurora 之上。 */}
      {modalIsOpen('quickOpen') && (
        <QuickOpen isOpen={modalIsOpen('quickOpen')} onClose={() => modalClose('quickOpen')} />
      )}

      {modalIsOpen('globalSearch') && (
        <GlobalSearch isOpen={modalIsOpen('globalSearch')} onClose={() => modalClose('globalSearch')} />
      )}

      {modalIsOpen('crossKbSearch') && (
        <CrossKbSearch
          onClose={() => modalClose('crossKbSearch')}
          onOpenFile={() => {
            modalClose('crossKbSearch')
            nav('kb')
          }}
        />
      )}

      {/* 批次② P0-B：自定义「退出 MarkCraft」确认弹窗（⌘Q / App 菜单「退出 MarkCraft」触发） */}
      {modalIsOpen('quit') && (
        <QuitModal
          isOpen={modalIsOpen('quit')}
          onConfirm={handleQuitConfirm}
          onCancel={() => modalClose('quit')}
        />
      )}

      {/* 命令面板（全局唯一，仍使用 Aurora 原生 toast/confirm） */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commands}
        fileItems={fileItems}
        onOpenFile={handleOpenFileFromPalette}
      />

      {/* S14 拖拽遮罩 */}
      {isDragOver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            color: 'var(--mc-text-inverse)',
            fontSize: 18,
            pointerEvents: 'none',
          }}
        >
          {t.shell.dropToOpenHint}
        </div>
      )}

      {/* P0 · 1.4 崩溃恢复模态：检测到自动备份时弹窗，恢复/放弃（Aurora chrome） */}
      {crashBackup && (
        <div className="aurora-crash">
          <div className="aurora-crash__backdrop" />
          <div className="aurora-crash__panel">
            <div className="aurora-crash__title">{t.shell.crashTitle}</div>
            <div className="aurora-crash__desc">
              {t.shell.crashDescPrefix}
              <strong>{crashBackup.fileName}</strong>,
              {new Date(crashBackup.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
              {t.shell.crashDescSuffix}
            </div>
            <div className="aurora-crash__actions">
              <button type="button" className="aurora-crash__btn" onClick={handleCrashDismiss}>
                {t.shell.crashDiscard}
              </button>
              <button
                type="button"
                className="aurora-crash__btn aurora-crash__btn--primary"
                onClick={handleCrashRestore}
              >
                {t.shell.crashRestore}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </UserAccountNavContext.Provider>
    </CommandPaletteContext.Provider>
  )
}

export function AuroraShell() {
  return (
    <ToastProvider>
      {/* RealProviders 提供完整真实运行时上下文（FileManager/Settings/Language/Toast/Confirm…），
          必须包住 ShellInner 本体——ShellInner 自身就调用 useFileManager/useSettings/useLanguage，
          仅包面板会导致 ShellInner 缺 Provider（useFileManager must be used within a FileManagerProvider）。
          Confirm 已单源化：由 RealProviders 内共享 ConfirmProvider（components/ui）提供，aurora 自家宿主已退役（㉚）。 */}
      <RealProviders>
        <ShellInner />
      </RealProviders>
    </ToastProvider>
  )
}
