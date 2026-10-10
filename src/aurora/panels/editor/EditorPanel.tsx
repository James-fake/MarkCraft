import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { setBlogEntryFileId } from '@services/blogEntry'
import { getEditorReturn, clearEditorReturn } from '../../navigation/navReturn'
import type { EditorReturnContext } from '../../navigation/navReturn'
import { EditorToolbar } from './EditorToolbar'
import { EditorReturnButton } from './EditorReturnButton'
import { Icon } from '../../icons'
import '../../styles/panels/editor.css'
// —— 语法检查列表：Aurora 层本地组件（lint 状态/回调由 editorIntegration 产出）——
import { AuroraLintList } from './AuroraLintList'
// —— 真实编辑器与渲染链路（D8：内部 body 由 mock 改为真实 EditorLayout）——
import { EditorLayout, type EditorLayoutHandle } from '@features/editor/EditorLayout'
// —— P2-2：功能接线聚合（lint/弹层/模板/快速捕捉/导入/主题/自动保存）统一在此 ——
// EditorPanel 因此只 import `@features/editor/*` 一个域，回归「布局 + 组合」角色。
import { useEditorIntegration } from '@features/editor/editorIntegration'
import { pickAndImportFile } from '@features/import/importFlow'
import { useToast } from '@components/ui/ToastProvider'
// 编辑器内部左侧文件树：Aurora 外壳 + 真实数据（详见 FileTree.tsx）
import { FileTree } from './FileTree'
// 内置「使用文档」→ 只读简介页（2026-09-22：裁剪编辑 chrome，仅保留阅读所需元素）
import { UsageDocBrief } from './UsageDocBrief'
// 编辑器右栏：Aurora 外壳接管 EditorLayout 旧右栏（AuroraOutline + 真实功能面板）
import { RightSidebar, type InspectorTab } from './RightSidebar'
import { useFileManager } from '@stores/FileStore'
import { useSettings } from '@stores/SettingsStore'
import { useLanguage } from '@stores/LanguageStore'
import { findNode } from '@core/files/fileTree'
import { findParentId } from '@services/fileService'
// 注：「粘贴为脚注」（features/editor/footnoteAuto）随辅助 Tab 旧分区一并退役，本层不再直连；
// 脚注插入仍由编辑器内核与默认快捷键承担。
import { useMarkdownRenderer } from '@hooks/useMarkdownRenderer'
import { useAppLayout } from '@hooks/useAppLayout'
import { useUsageDocsScope } from '@hooks/useUsageDocsScope'
import { usePresence, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { textToStorage, rehydrateImagesFromContent } from '@core/storage/imageStore'
// —— P4-4 拆分：类型/纯函数下沉 shared，定时器逻辑与模式状态机各成 hook，空态与徽标为哑组件 ——
import type { AuroraModalId, EditorPanelProps } from './editorPanelShared'
import { uniqueFileName } from './editorPanelShared'
import { usePanelHoverIntent } from './usePanelHoverIntent'
import { useEditorModeSwitch } from './useEditorModeSwitch'
import { EditorEmptyState } from './EditorEmptyState'
import { AuroraLintEntry } from './AuroraLintEntry'

// 对外类型路径保稳（AuroraShell / auroraActions 从 EditorPanel 导入）
export type { AuroraModalControls, AuroraModalId, EditorCommandBridge, EditorPanelProps } from './editorPanelShared'

/**
 * Aurora 编辑器面板（Phase 2 换芯 · D8）
 *
 * 策略：保留 Aurora `PageFrame` 桌面外壳 + `EditorToolbar` 作新 chrome（模式状态机），
 * 内部编辑体由 mock 的 renderEditor/renderSourceLine/renderPreview 替换为**真实**
 * `features/editor/EditorLayout`，严格对齐真实项目编辑器功能：
 *   - 双内核（CodeMirror 源码 / TipTap 所见即所得）+ 实时预览
 *   - 大纲 / 反链（迷你图谱）/ 脚注 / 写作辅助 / 成稿核查（EditorLayout 内置右栏，真实数据）
 *   - 浮动格式工具栏 / 跳转到行（EditorLayout 内置，真实选区驱动）
 *   - 版本历史（真实 VersionHistoryPanel 模态）
 *
 * 真实接线：activeFileId / 内容 来自 FileStore；onChange 写回 updateFileContent；
 * renderedHtml 由 useMarkdownRenderer 计算；gridColumns 由 useAppLayout 推导。
 */
export function EditorPanel({ nav, auroraModal, cmdBridge, onOpenCommandPalette }: EditorPanelProps) {
  // 注：isAnyTabDirty 不再由此处透传——beforeunload 守卫已上提到应用级 useAppGlobalEffects，
  // 它自己从 FileStore 取脏标记（视图无关）。
  const { rootFolder, getActiveFileId, getActiveFileContent, updateFileContent, createFile, openFile, activeTabId, tabs, markTabDirty, closeTransientTabs } = useFileManager()
  // 导入流程需在「用户选完文件」的回调里读**最新** root（而非点击时的快照），否则第一次
  // 导入未完成时再次触发并选中同名文件会重名（审查 L1-2026-10-07）。
  const rootFolderRef = useRef(rootFolder)
  rootFolderRef.current = rootFolder
  const { settings, updateSetting } = useSettings()
  const { t, language, toggleLanguage } = useLanguage()
  const toast = useToast()
  const EP = t.editorPanel
  // 知识库列表（辅助 Tab · 就地展开）的展开态与目标文件：受控持有，使 ⌘K 命令
  // 与标签右键菜单都能远程召唤同一个列表（数据与归集动作在 AuroraPublish 内闭环）。
  const [kbMenuOpen, setKbMenuOpen] = useState(false)
  // 目标文件（右键标签菜单可指向非激活文件；缺省取当前激活文件）
  const [kbMenuFileId, setKbMenuFileId] = useState<string | null>(null)
  const [returnCtx, setReturnCtx] = useState<EditorReturnContext | null>(() => getEditorReturn())

  // —— 编辑模式机制（对齐项目真实实现 useEditorSettings）——
  // editorMode：源码 / 所见即所得（TipTap 富文本）双内核；sourceVisible/previewVisible 为源码模式下的窗格开关
  // 默认范式收敛：初始值取真实设置 settings.editorMode（P1-1.2 E1，默认 wysiwyg）
  // 模式状态机（handleSourceClick/togglePreview/toggleWysiwyg 的 4 态循环）见 useEditorModeSwitch。
  const {
    editorMode, setEditorMode,
    sourceVisible, setSourceVisible,
    previewVisible, setPreviewVisible,
    handleSourceClick, togglePreview, toggleWysiwyg,
  } = useEditorModeSwitch(settings.editorMode)
  // —— v7 边缘悬停召唤面板：左=文件树，右=检查器（大纲/反链/脚注/辅助）——
  // 默认进入即纯编辑区（两栏均隐藏）；鼠标靠到屏幕左/右缘滑入，移开收起；
  // 图钉 pin 可钉成常驻栏；⌘B / ⌘⇧O 快捷键切换。
  const [leftHover, setLeftHover] = useState(false)
  const [leftPinned, setLeftPinned] = useState(false)
  const [rightHover, setRightHover] = useState(false)
  const [rightPinned, setRightPinned] = useState(false)
  // 空态「新建笔记」文件名输入：需求改为自定义文件名，不再直接生成未命名
  const [newFileName, setNewFileName] = useState('')
  // 右栏检查器当前 Tab：受控于 RightSidebar（大纲/脚注/块级反链/辅助），默认大纲
  const [rightTab, setRightTab] = useState<InspectorTab>('outline')
  const leftShown = leftPinned || leftHover
  const rightShown = rightPinned || rightHover
  // 退场相位（动效审计 P1-5）：面板悬浮栏关闭时不再瞬时卸载，先播 180ms 沿原路滑出
  // （入场 420ms ↔ 退场 180ms = Modal 同一进出比例）。可中断 —— hover 重新召回立即回 open。
  const leftOverlay = usePresence(leftShown, OVERLAY_EXIT_MS)
  const rightOverlay = usePresence(rightShown, OVERLAY_EXIT_MS)
  const closeLeft = useCallback(() => { setLeftHover(false); setLeftPinned(false) }, [])
  const closeRight = useCallback(() => { setRightHover(false); setRightPinned(false) }, [])
  // —— 边缘 hover 防误触（hover-intent）——
  // 鼠标靠到缘侧需“停留”约 220ms 才滑入面板；快速掠过 / 误触会在到期前离开而被取消，
  // 不再一碰边缘就弹出。已钉住（pinned）时无需 hover，离开也不收起。
  // 定时器逻辑收编于 usePanelHoverIntent（P4-4 拆分）；动效相位（usePresence/data-exiting）留在本文件
  // —— motionExit.test 直接扫描本文件源码断言接线存在。
  const leftIntent = usePanelHoverIntent(leftPinned, setLeftHover)
  const rightIntent = usePanelHoverIntent(rightPinned, setRightHover)

  const activeFileId = getActiveFileId()
  const activeNode = activeFileId ? findNode(rootFolder, activeFileId) : null
  useEffect(() => { setReturnCtx(getEditorReturn()) }, [activeFileId])

  // —— 内置「使用文档」→ 只读简介页（2026-09-22 用户需求）——
  // 判定单源：`core/files/usageDocs#resolveUsageDocsScope`（纯函数）经 hooks 接入真实文件树。
  // 为真时，下方若干处条件渲染会把编辑 chrome 整体裁掉：
  //   ① 顶部工具栏（标签栏 + 编辑模式选择框）  ② 左缘文件列表（含 ⌘B 钉住）
  //   ③ 右缘检查器（含大纲右键「删除章节」）    ④ 主区由 EditorLayout 换为只读 UsageDocBrief
  // ⚠️ 全部条件都挂在 isUsageDoc 上：普通笔记 / 日记 / 空态路径的 isUsageDoc 恒为 false，
  //    行为与改动前逐字节一致（回归锁见 usageDocBrief.test.tsx 的对照组）。
  // ⚠️ 判定用 `builtinFileIds`（**内置说明书文件本身**），不用 `hiddenIds`：
  //    hiddenIds 是「视图过滤」集合（含文件夹行），语义是「从列表里藏起来」；
  //    只读简介页该问的是「这个文件是不是那几篇写死的说明书」——
  //    用户放进该文件夹的自己的笔记**不在** builtinFileIds 里 → 仍是完整可编辑的编辑器。
  //
  // 🔗 与「瞬态标签」的关系（2026-09-22 第二轮需求）：命中内置篇章的文件在 FileStore.openFile
  //    里就被打上 `isTransient`（不进最近 / 不落盘 / 不进标签栏 / 离开视图即回收），
  //    故「只读简介页 + 瞬态生命周期」共用**同一个** builtinFileIds 判定，不会各自漂移。
  const usageDocs = useUsageDocsScope()
  const isUsageDoc = !!activeFileId && usageDocs.builtinFileIds.has(activeFileId)

  // —— 「编辑 chrome 是否在位」= 顶部工具栏 / 左缘文件栏的统一判据 ——
  // 单源派生：三处条件渲染（工具栏、返回按钮的落点选择、左缘 hoverzone）都用它，
  // 避免「工具栏不渲染了但返回按钮仍以为自己在栏内」这类漂移。
  const editorChromeShown = !!activeFileId && !isUsageDoc

  // 面包屑：逐级向上收集文件夹路径（根目录不计入），末级为文件名（去 .md）
  // —— P1-2 顶栏文档上下文强化：不再只取一级父文件夹，深层文件也能回溯完整层级
  const folderCrumbs: string[] = []
  if (activeFileId) {
    let pid: string | null = findParentId(rootFolder, activeFileId)
    let depth = 0
    while (pid && pid !== rootFolder.id && depth < 8) {
      const p = findNode(rootFolder, pid)
      if (!p || p.type !== 'folder') break
      folderCrumbs.unshift(p.name)
      pid = findParentId(rootFolder, pid)
      depth++
    }
  }
  const breadcrumbItems: string[] = activeNode
    ? [...folderCrumbs, activeNode.name.replace(/\.md$/, '')]
    : []

  // 辅助 Tab（发布 / 归集）的目标笔记：⌘K 或标签右键菜单可指向非激活文件，
  // 故按 kbMenuFileId 反查文件名（面板上的「作用于谁」必须与目标一致）。
  const aidTargetFileId = kbMenuFileId ?? activeFileId ?? null
  const aidTargetFileName = aidTargetFileId
    ? findNode(rootFolder, aidTargetFileId)?.name
    : undefined

  // 未保存态：真实 dirty 标记（useAppLogic S6 同步 tab.isDirty）→ 顶栏文档名前圆点
  const activeTabDirty = !!tabs.find((t) => t.id === activeTabId)?.isDirty

  // 真实文件内容：以 store 当前激活文件内容初始化，切换文件时重置（受控于真实 store）
  const [localContent, setLocalContent] = useState<string>(() => {
    const c = getActiveFileContent() ?? ''
    // 首次挂载也要水合：图片数据只活在 imageStore 的内存 Map 里，其唯一持久化方式是
    // 「被嵌进 markdown」。不做水合的话，重启后 Map 是空的 → 内容里的 image:<id> 全都解析不出来。
    rehydrateImagesFromContent(c)
    return c
  })
  useEffect(() => {
    const c = getActiveFileContent() ?? ''
    // 切换文件 / 重新载入时同样水合（真实事故：切模式回来图片只剩「无法显示」占位）
    rehydrateImagesFromContent(c)
    setLocalContent(c)
    // 仅当激活文件变化时重置草稿，避免受 store 回写影响光标
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId])

  // —— P2-2：功能接线一次性接入（自动保存 / 版本快照 / lint / 六个弹层 / 模板 / 快速捕捉 / 导入 / 主题）——
  // 原先散在本文件的 8 个 feature 域引用全部收敛到 useEditorIntegration；
  // 本文件只保留「布局 + 组合」：窗格与浮栏显示态、hover-intent、面包屑、工具栏与右栏摆位。
  const integration = useEditorIntegration({
    activeFileId,
    activeFileName: activeNode?.name,
    localContent,
    setLocalContent,
    activeTabId,
    updateFileContent,
    openFile,
    markTabDirty,
    rootFolder,
    createFile,
    // 窄化适配：features 层不得依赖 aurora 的 AuroraModalId 联合类型（反向依赖守卫），
    // 接线为此声明为 string；此处在 aurora 侧做一层转换，面板内部仍是强类型模态 id。
    auroraModal: auroraModal && {
      open: (id: string) => auroraModal.open(id as AuroraModalId),
      close: (id: string) => auroraModal.close(id as AuroraModalId),
      isOpen: (id: string) => auroraModal.isOpen(id as AuroraModalId),
    },
    language,
  })
  const { theme, toggleTheme, handleChange, handleManualSave, wordCount, lint, versionHistory, modals } = integration

  const { renderedHtml } = useMarkdownRenderer(localContent, textToStorage)

  // 编辑器布尔开关来自真实设置（focusMode/typewriterMode/autocomplete/livePreview）
  const focusMode = !!settings.focusMode
  const typewriterMode = !!settings.typewriterMode
  const autocompleteEnabled = !!settings.autocomplete
  const livePreview = !!settings.livePreview

  // 布局列推导（与真实 App 一致；右栏由 Aurora RightSidebar 接管，故 editorLayout 不再渲染 outline）
  const { effectiveShowSource, effectiveShowPreview, effectiveShowOutline, gridColumns } = useAppLayout({
    focusMode,
    sidebarVisible: false,
    showOutline: false,
    showPreview: previewVisible,
    showSource: sourceVisible,
    editorMode,
  })

  // B3 发布闭环：标记目标笔记 → 跳转博客面板（博客按「单篇」呈现该文件；无参时取当前激活文件）
  const handlePublish = useCallback((fileId?: string) => {
    const id = fileId ?? getActiveFileId()
    if (id) setBlogEntryFileId(id)
    nav?.(resolveAuroraNav('博客'))
  }, [getActiveFileId, nav])

  // —— 面板串联：编辑器「添加到知识库」列表（辅助 Tab）+ 从知识库/双链图谱进来的「返回来源」芯片 ——
  // 召唤动作 = 钉住右栏检查器 + 切到辅助 Tab + 展开知识库列表（三者由不同 state 驱动，缺一不可见）；
  // 归集关系查询与增删由 AuroraPublish 自行闭环，此处只负责「把列表摆到用户眼前」。
  // fileId 缺省取当前激活文件（⌘K 入口）；标签右键菜单传入右键目标文件。
  const openKbMenu = useCallback((fileId?: string) => {
    const id = fileId ?? getActiveFileId()
    if (!id) return
    setKbMenuFileId(id)
    setKbMenuOpen(true)
    setRightTab('aid')
    setRightPinned(true)
  }, [getActiveFileId])

  // —— 命令桥注册（P0 · 1.6：命令面板 / 全局快捷键经 AuroraShell 触达编辑器内部动作）——
  const editorLayoutRef = useRef<EditorLayoutHandle>(null)
  useEffect(() => {
    if (!cmdBridge) return
    // cleanup 必须用「捕获时的同一份 ref 对象」：直接写 cmdBridge.current 会读到卸载后的最新值
    const bridge = cmdBridge.current
    bridge.save = handleManualSave
    bridge.togglePreview = togglePreview
    bridge.toggleEditorMode = toggleWysiwyg
    bridge.toggleSidebar = () => { if (isUsageDoc) return; setLeftPinned((p) => !p) }
    bridge.openVersionHistory = versionHistory.open
    bridge.goToLine = () => editorLayoutRef.current?.openGoToLine()
    bridge.restoreCrash = handleChange
    // —— 极简顶栏整治：发布/知识库移出顶栏，经命令桥供 ⌘K 命令面板触达 ——
    bridge.publish = handlePublish
    bridge.openKbMenu = openKbMenu
    // —— 批次① P0-A：编辑菜单经命令桥触达编辑器内部动作（撤销/重做/查找/删除选区）——
    bridge.undo = () => editorLayoutRef.current?.undo()
    bridge.redo = () => editorLayoutRef.current?.redo()
    bridge.find = () => editorLayoutRef.current?.find()
    bridge.deleteSelection = () => editorLayoutRef.current?.deleteSelection()
    // —— 文件菜单：另存为（此前只挂在工具栏「更多」里，命令面板无法触达 → E2E 报告 L-2）——
    bridge.saveAs = () => editorLayoutRef.current?.openSaveAs()
    return () => {
      bridge.save = undefined
      bridge.togglePreview = undefined
      bridge.toggleEditorMode = undefined
      bridge.toggleSidebar = undefined
      bridge.openVersionHistory = undefined
      bridge.goToLine = undefined
      bridge.restoreCrash = undefined
      bridge.publish = undefined
      bridge.openKbMenu = undefined
      bridge.undo = undefined
      bridge.redo = undefined
      bridge.find = undefined
      bridge.deleteSelection = undefined
      bridge.saveAs = undefined
    }
  }, [cmdBridge, handleManualSave, togglePreview, toggleWysiwyg, handleChange, handlePublish, openKbMenu, isUsageDoc, versionHistory.open])

  // 日记文件判定（EditorLayout 的 isDiary）：命名 YYYY-MM-DD.md —— 属布局派生，留在本层
  const isDiary = !!activeNode?.name && /^(\d{4}-\d{2}-\d{2})\.md$/.test(activeNode.name)

  const statusModeLabel = useMemo(() => {
    // 只读简介页不呈现编辑内核状态（此时编辑模式选择框已不存在，状态栏也不该声称「所见即所得」）
    if (isUsageDoc) return EP.modeIntro
    if (editorMode === 'wysiwyg') return EP.modeWysiwyg
    if (sourceVisible && previewVisible) return EP.modePreview
    if (previewVisible) return EP.modePreview
    return EP.modeSource
  }, [editorMode, sourceVisible, previewVisible, isUsageDoc, EP])

  // 键盘快捷键：Ctrl/Cmd+G 跳转到行；Ctrl/Cmd+B 切换文件树（编辑器交互，非工具栏按钮）
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    // 只读简介页：焦点区内的编辑器快捷键整体不参与（无文件栏可钉、无编辑区可跳行）
    if (isUsageDoc) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
      e.preventDefault()
      // 跳行由真实 EditorLayout 内部 Ctrl+G 处理；此处仅保证焦点在编辑区时不冲突
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      setLeftPinned((p) => !p)
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault()
      setRightPinned((p) => !p)
    }
  }

  // 空态「新建笔记」：读取文件名输入框，按自定义名在根目录创建空笔记并打开；
  // 留空回退未命名（与原行为守恒）；同名自动追加序号避免覆盖（VS Code 风格）
  const handleCreateNote = useCallback(() => {
    const raw = (newFileName || '').trim()
    const base = raw || `未命名-${Date.now()}`
    const finalName = uniqueFileName(rootFolder, base)
    const id = createFile(rootFolder.id, finalName, '')
    if (id) {
      openFile(id)
      setNewFileName('')
    }
  }, [createFile, openFile, rootFolder, newFileName])

  // 归集增删 / 新建知识库已下沉到 AuroraPublish（消费 useKbStore 单一来源），本层不再持有镜像状态。

  // 「← 返回 XX」芯片的回跳动作。来源有两类，且**都可以带 kbId**：
  //  - 知识库详情（view='kb'）  → nav('kb', kbId) 回该库
  //  - 双链图谱（view='graph'） → 带 kbId 时 nav('graph', kbId) 回**同一范围的图谱**
  //    （2026-09-23：知识库 →「查看完整图谱」进入的是「该库范围」的图，返回若丢 kbId 会无声退回全局图）
  // 不带 kbId 时保持单参调用形态（nav(srcView)），与既有「全局图谱 / 其他来源」行为逐字节一致。
  const handleReturnToSource = useCallback(() => {
    if (!returnCtx) return
    const { view: srcView, kbId: srcKbId } = returnCtx
    if (srcView === 'kb' && srcKbId) nav?.('kb', srcKbId)
    else if (srcKbId) nav?.(srcView, srcKbId)
    else nav?.(srcView)
    clearEditorReturn()
    setReturnCtx(null)
  }, [returnCtx, nav])

  // 弹层开关：只依赖壳层传入的 modal 控制器，与 feature 无关，故留在本层（布局/交互）
  // 「打开文件」：直达系统文件框（去掉中间弹窗）
  const openImport = useCallback(
    () => pickAndImportFile({
      getRootFolder: () => rootFolderRef.current,
      createFile,
      onError: (m) => toast.show(m, 'error'),
    }),
    [createFile, toast],
  )
  const openLinkRedirect = useCallback(() => auroraModal?.open('linkRedirect'), [auroraModal])
  // 弹层**回调**（导入 / 模板插入 / 快速捕捉）已随弹层一并迁入 useEditorIntegration。

  const realEditor = (
    <EditorLayout
      ref={editorLayoutRef}
      key={activeFileId ?? 'no-active'}
      localContent={localContent}
      onChange={handleChange}
      renderedHtml={renderedHtml}
      theme={theme}
      language={language}
      onToggleTheme={toggleTheme}
      onToggleLanguage={toggleLanguage}
      editorMode={editorMode}
      onSwitchEditorMode={setEditorMode}
      effectiveShowPreview={effectiveShowPreview}
      effectiveShowSource={effectiveShowSource}
      effectiveShowOutline={effectiveShowOutline}
      focusMode={focusMode}
      typewriterMode={typewriterMode}
      autocompleteEnabled={autocompleteEnabled}
      onTogglePreview={() => setPreviewVisible((v) => !v)}
      onToggleSource={() => setSourceVisible((v) => !v)}
      showSource={sourceVisible}
      showPreview={previewVisible}
      onToggleFocusMode={() => updateSetting('focusMode', !focusMode)}
      onToggleTypewriterMode={() => updateSetting('typewriterMode', !typewriterMode)}
      onToggleAutocomplete={() => updateSetting('autocomplete', !autocompleteEnabled)}
      onToggleLivePreview={() => updateSetting('livePreview', !livePreview)}
      livePreview={livePreview}
      onContentChange={(md: string) => handleChange(md)}
      onDeleteImage={() => { /* 图片删除持久化留待 Phase 3/4 接入真实 deleteImage */ }}
      activeFileId={activeFileId ?? undefined}
      gridColumns={gridColumns}
      showModeToolbar={false}
      onOpenVersionHistory={versionHistory.open}
      isVersionHistoryOpen={versionHistory.isOpen}
      isDiary={isDiary}
      onPrint={() => window.print()}
      onImportFile={openImport}
      onBrokenLinkClick={openLinkRedirect}
      onUseTemplate={() => auroraModal?.open('templateInsert')}
    />
  )

  return (
    <div className="aurora-editor">
      <PageFrame
        sidebarGroups={buildAuroraSidebarGroups(t)}
        // 🚨 使用文档简介页：侧栏点亮**「知识库」**（2026-09-22 用户需求，两轮收敛）：
        //    ① 首轮报障「不要显示跳转至编辑器功能的图标」——点亮「编辑器」会让用户以为
        //       自己已被带走进编辑器；简介页是只读参考页，不属于编辑器工作区。
        //    ② 次轮报障「点击进入笔记，左侧知识库的图标就不亮了」——把激活态整个置空
        //       （undefined）是过度修正：使用文档的用户语义是「只能从知识库点进去看」，
        //       故它属于**知识库语境**，应点亮「知识库」。
        sidebarActiveId={isUsageDoc ? 'knowledge' : 'editor'}
        onSidebarSelect={(id) => {
          // 视图内显式导航 = 离开只读参考页：先回收瞬态标签再跳。
          // ⚠️ 这一步不能只靠 AuroraShell 的「路由离开编辑器」——
          //    点侧栏「编辑器」时视图 id 没变（仍是 editor），路由 effect 不会触发；
          //    但用户意图明确是「回到我自己的编辑器」，此时若留着瞬态标签，
          //    编辑区会继续显示使用文档 → 正是「退出后还看得见这篇」的报障场景。
          closeTransientTabs()
          nav?.(resolveAuroraNav(id))
        }}
        breadcrumbs={breadcrumbItems}
        titlebarModified={activeTabDirty}
        savedState={activeFileId ? (activeTabDirty ? 'unsaved' : 'saved') : undefined}
        statusLeftItems={
          activeFileId
            ? [
              { content: `${wordCount} 字` },
              { content: 'UTF-8' },
              // 语法检查入口（与真实 EditorStatusBar 状态栏互补 · 点击展开 AuroraLintList 常驻面板）
              ...(lint.hasIssues
                ? [{
                    clickable: true,
                    onClick: () => lint.setPanelOpen(!lint.panelOpen),
                    content: (
                      <AuroraLintEntry
                        errorCount={lint.errorCount}
                        warnCount={lint.warnCount}
                        onToggle={() => lint.setPanelOpen(!lint.panelOpen)}
                      />
                    ),
                  }]
                : []),
            ]
            : []
        }
        statusRightItems={[
          { content: statusModeLabel },
          { content: 'Markdown' },
          { content: t.welcome.cmdPalette, clickable: true, onClick: () => onOpenCommandPalette?.() },
        ]}
      >
        {/* 空态引导界面不渲染编辑器工具栏：未打开文档时「编辑模式切换框 / 多文件标签栏」均无意义，
            且文件浏览已由内嵌列表承担；编辑态仍正常渲染。
            内置「使用文档」简介页同样不渲染：该行承载的「多文件标签栏（含标签 × 关闭）」与
            「源码 / 预览 / 所见即所得」编辑模式选择框，正是需求要求移除的两类编辑元素。 */}
        {editorChromeShown && (
          <EditorToolbar
            editorMode={editorMode}
            sourceVisible={sourceVisible}
            previewVisible={previewVisible}
            onToggleSource={handleSourceClick}
            onTogglePreview={togglePreview}
            onToggleWysiwyg={toggleWysiwyg}
            onPublishFile={handlePublish}
            onAddToKbFile={openKbMenu}
            returnLabel={returnCtx?.label}
            onReturn={handleReturnToSource}
          />
        )}

        {/* 返回来源按钮的落点（2026-09-23 用户报障「位置非常不合理」）——
            ① **有标签行时**（常态编辑）：按钮已并入标签行首位、落在文件标签左侧（见 EditorToolbar），
               这里**不再**另起一行；此前它独占一整行、且压在标签行下方，既浪费纵向空间又像游离的杂条。
            ② **无标签行时**（内置《使用文档》只读简介页 / 未打开文档的空态）：退回这条只含该按钮的极简行
               —— 在那些版式里它是**唯一回跳入口**，不能随工具栏一起消失（回归锁见 EditorReturnPlacement.test.tsx）。
            判据与工具栏**同源**（editorChromeShown 的取反），不会出现「工具栏没渲染、按钮却以为自己在行内」。 */}
        {returnCtx && !editorChromeShown && (
          <div className="aurora-editor__returnbar">
            <EditorReturnButton label={returnCtx.label} onReturn={handleReturnToSource} />
          </div>
        )}

        {/* 知识库列表不再走独立浮层：已迁入右栏检查器「辅助」Tab（AuroraPublish），
            展开态由 kbMenuOpen 受控、目标文件由 kbMenuFileId 决定（见 openKbMenu）。 */}

        <div className="aurora-editor__layout">
          {/* 左缘 hoverzone：编辑态下鼠标靠左缘滑入文件树；图钉可钉成常驻栏。
              空态引导界面已内嵌文件列表，不再需要边缘滑入，故仅编辑态渲染。
              内置「使用文档」简介页不渲染：需求要求**隐藏左侧文件列表**，而此 hoverzone
              正是它的唯一入口（含图钉常驻与 ⌘B 切换），整块缺席才是「隐藏」。 */}
          {editorChromeShown && (
          <div
            className={`aurora-editor__hoverzone aurora-editor__hoverzone--left ${leftPinned ? 'is-pinned' : ''}`}
            onMouseEnter={leftIntent.openIntent}
            onMouseLeave={leftIntent.closeIntent}
          >
            <div className="aurora-editor__edge aurora-editor__edge--left" aria-hidden />
            {leftOverlay.mounted && (
              <div
                className="aurora-editor__overlay aurora-editor__overlay--left"
                data-exiting={leftOverlay.exiting || undefined}
                onMouseEnter={leftIntent.cancelClose}
                onMouseLeave={leftIntent.scheduleClose}
              >
                <div className="aurora-editor__overlay-head">
                  <span className="aurora-editor__overlay-title">{EP.fileOverlay}</span>
                  <div className="aurora-editor__overlay-actions">
                    <button
                      type="button"
                      className={`aurora-editor__pin ${leftPinned ? 'is-on' : ''}`}
                      onClick={() => setLeftPinned((p) => !p)}
                      aria-label={leftPinned ? EP.unpinFile : EP.pinFile}
                      title={leftPinned ? EP.unpin : EP.pin}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                    </button>
                    <button
                      type="button"
                      className="aurora-editor__overlay-close"
                      onClick={closeLeft}
                      aria-label={EP.collapseFile}
                      title="收起"
                    >
                      <Icon.chevronLeft size={14} />
                    </button>
                  </div>
                </div>
                <div className="aurora-editor__overlay-body">
                  <FileTree onCollapse={closeLeft} hideTopbar />
                </div>
              </div>
            )}
          </div>
          )}

          <div className="aurora-editor__main" onKeyDown={handleEditorKeyDown} tabIndex={0}>
            {!activeFileId ? (
              <EditorEmptyState
                value={newFileName}
                onChange={setNewFileName}
                onCreate={handleCreateNote}
                onImportFile={openImport}
              />
            ) : isUsageDoc ? (
              /* 内置「使用文档」→ 只读简介页（需求②）：不挂 EditorLayout，因此没有编辑区、
                 没有格式工具条（撤销/加粗/…/删除线/更多）与模式切换；只呈现渲染后的正文。
                 上方「← 返回 …」芯片仍在，是这里唯一的回跳入口（有意保留，属导航所需）。 */
              <UsageDocBrief
                html={renderedHtml}
                theme={theme}
                title={activeNode?.name ?? 'MarkCraft 使用文档'}
                fileId={activeFileId ?? undefined}
              />
            ) : (
              realEditor
            )}
          </div>

          {/* 右缘 hoverzone：鼠标靠右缘滑入检查器（大纲/反链/脚注/辅助）；图钉可钉成常驻栏。
              内置「使用文档」简介页不渲染：检查器（含大纲右键「删除章节」、辅助 Tab 的发布/归集）
              属编辑期工具，与「仅保留阅读所需元素」相悖。 */}
          {!isUsageDoc && (
          <div
            className={`aurora-editor__hoverzone aurora-editor__hoverzone--right ${rightPinned ? 'is-pinned' : ''}`}
            onMouseEnter={rightIntent.openIntent}
            onMouseLeave={rightIntent.closeIntent}
          >
            <div className="aurora-editor__edge aurora-editor__edge--right" aria-hidden />
            {rightOverlay.mounted && activeFileId && (
              <div
                className="aurora-editor__overlay aurora-editor__overlay--right"
                data-exiting={rightOverlay.exiting || undefined}
              >
                <div className="aurora-editor__overlay-head">
                  <div className="aurora-editor__overlay-actions aurora-editor__overlay-actions--left">
                    <button
                      type="button"
                      className="aurora-editor__overlay-close"
                      onClick={closeRight}
                      aria-label={EP.collapseInspector}
                      title="收起"
                    >
                      <Icon.chevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className={`aurora-editor__pin ${rightPinned ? 'is-on' : ''}`}
                      onClick={() => setRightPinned((p) => !p)}
                      aria-label={rightPinned ? EP.unpinInspector : EP.pinInspector}
                      title={rightPinned ? '取消钉住' : '钉住常驻'}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                    </button>
                  </div>
                  <span className="aurora-editor__overlay-title">{EP.inspectorOverlay}</span>
                </div>
                <div className="aurora-editor__overlay-body">
                  <RightSidebar
                    content={localContent}
                    activeFileId={activeFileId}
                    activeTab={rightTab}
                    forceExpand
                    onTabChange={setRightTab}
                    onOpenNote={(id) => openFile(id)}
                    onChange={handleChange}
                    activeFileName={aidTargetFileName}
                    onPublishNote={handlePublish}
                    kbMenuOpen={kbMenuOpen}
                    kbMenuFileId={aidTargetFileId}
                    onKbMenuOpenChange={setKbMenuOpen}
                  />
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </PageFrame>

      {/* —— P2-2：编辑器功能弹层（版本历史 / 导入 / 链接重定向 / 块反向链接 / 模板×2 / 快速捕捉）——
          原先这七个弹层的接线与 JSX 散在本文件；现由 useEditorIntegration 统一产出，
          本文件只在根部挂载一次，不再各自渲染。 */}
      {modals}

      {/* —— 语法检查列表面板（Aurora 层常驻入口 · 引擎与回调由 integration 产出，组件是 aurora 本地 UI）—— */}
      <AuroraLintList
        issues={lint.issues}
        open={lint.panelOpen && !!activeFileId}
        onClose={() => lint.setPanelOpen(false)}
        onJump={(issue) => { lint.jump(issue); lint.setPanelOpen(false) }}
        onFix={lint.fix}
      />
    </div>
  )
}
