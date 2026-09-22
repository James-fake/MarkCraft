import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { setBlogEntryFileId } from '../blog/BlogPanel'
import { getEditorReturn, clearEditorReturn } from '../../navigation/navReturn'
import type { EditorReturnContext } from '../../navigation/navReturn'
import { EditorToolbar } from './EditorToolbar'
import { Icon } from '../../icons'
import '../../styles/panels/editor.css'
// —— 语法检查：Aurora 层集成（复用真实 lintMarkdown + fixIssue 引擎；D4 单一数据源）
import { lintMarkdown, fixIssue } from '@features/lint/markdownLinter'
import type { LintIssue } from '@utils/lintTypes'
import { AuroraLintList } from './AuroraLintList'
// —— 字数统计：复用真实 features/editor/stats 单一数据源（D4，不维护平行实现）——
import { countWords } from '@features/editor/stats'
// —— 真实编辑器与渲染链路（D8：内部 body 由 mock 改为真实 EditorLayout）——
import { EditorLayout, type EditorLayoutHandle } from '@features/editor/EditorLayout'
import VersionHistoryPanel from '@features/editor/VersionHistoryPanel'
import ImportDialog from '@features/import/ImportDialog'
import LinkRedirectDialog from '@features/fileManager/LinkRedirectDialog'
import BlockBacklinksPanel from '@features/editor/BlockBacklinksPanel'
import TemplateInsertModal from '@features/templates/TemplateInsertModal'
import TemplateDiscoveryModal from '@features/templates/TemplateDiscoveryModal'
import QuickCaptureModal from '@features/pwa/QuickCaptureModal'
// 编辑器内部左侧文件树：Aurora 外壳 + 真实数据（详见 FileTree.tsx）
import { FileTree } from './FileTree'
import { EmptyFileBrowser } from './EmptyFileBrowser'
// 内置「使用文档」→ 只读简介页（2026-09-22：裁剪编辑 chrome，仅保留阅读所需元素）
import { UsageDocBrief } from './UsageDocBrief'
// 编辑器右栏：Aurora 外壳接管 EditorLayout 旧右栏（AuroraOutline + 真实功能面板）
import { RightSidebar, type InspectorTab } from './RightSidebar'
import { useFileManager } from '@stores/FileStore'
import { useSettings } from '@stores/SettingsStore'
import { useTheme } from '@features/themes/useTheme'
import { useLanguage } from '@stores/LanguageStore'
import { findNode } from '@core/files/fileTree'
import type { FileNode } from '@src/types/fileManager'
import { findParentId } from '@services/fileService'
import { findInboxId } from '@features/pwa'
// 注：「粘贴为脚注」（features/editor/footnoteAuto）随辅助 Tab 旧分区一并退役，本层不再直连；
// 脚注插入仍由编辑器内核与默认快捷键承担。
import { useMarkdownRenderer } from '@hooks/useMarkdownRenderer'
import { useAppLayout } from '@hooks/useAppLayout'
import { useUsageDocsScope } from '@hooks/useUsageDocsScope'
import { usePresence, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { useAppLogic } from '@app/useAppLogic'
import { textFromStorage, textToStorage } from '@core/storage/imageStore'

/** Aurora 弹层开关（由 AuroraShell 以单一数据源持有，命令与编辑器 UI 共用；方案 B 就近归属渲染） */
export interface AuroraModalControls {
  open: (id: AuroraModalId) => void
  close: (id: AuroraModalId) => void
  isOpen: (id: AuroraModalId) => boolean
}
export type AuroraModalId =
  | 'import' | 'linkRedirect' | 'blockBacklinks'
  | 'templateInsert' | 'templateDiscovery' | 'quickCapture'
  | 'librarySync' | 'migrate' | 'quickSwitcher'
  | 'quickOpen' | 'globalSearch' | 'crossKbSearch'
  | 'quit'

/**
 * 编辑器命令桥：供 AuroraShell（命令面板 / 全局快捷键）触发编辑器内部动作。
 * EditorPanel 挂载时注册实现，卸载时清空；未注册（非编辑器视图）时调用静默无操作。
 */
export interface EditorCommandBridge {
  /** Ctrl/Cmd+S 等价：保存当前文档并创建 manual 版本 */
  save?: () => void
  /** 切换预览窗格（叠加式，与源码可并存为双屏） */
  togglePreview?: () => void
  /** 切换编辑内核：源码 / 所见即所得 */
  toggleEditorMode?: () => void
  /** 切换编辑器内部文件树 */
  toggleSidebar?: () => void
  /** 打开版本历史模态 */
  openVersionHistory?: () => void
  /** 打开编辑器内置「跳转到行号」对话框（命令面板 navigation.goToLine 经此触达） */
  goToLine?: () => void
  /** 崩溃恢复：把备份内容写入当前草稿（配合 updateFileContent 双写） */
  restoreCrash?: (content: string) => void
  /** B3 发布闭环：标记当前笔记 → 跳转博客面板（命令面板 `editor.publish` 触达） */
  publish?: () => void
  /** 知识库串联：打开「加入知识库」菜单（命令面板 `editor.addToKb` 触达） */
  openKbMenu?: () => void
  /** 撤销（编辑菜单 · 命令桥） */
  undo?: () => void
  /** 重做（编辑菜单 · 命令桥） */
  redo?: () => void
  /** 编辑器内查找（编辑菜单 · 命令桥） */
  find?: () => void
  /** 删除选区（编辑菜单 · 命令桥） */
  deleteSelection?: () => void
}

export interface EditorPanelProps {
  nav?: (id: string, param?: string) => void
  auroraModal?: AuroraModalControls
  /** 命令桥引用（AuroraShell 持有并注入） */
  cmdBridge?: MutableRefObject<EditorCommandBridge>
  /** 打开全局命令面板（AuroraShell 透传 setCommandOpen，替换原 toast 假入口） */
  onOpenCommandPalette?: () => void
}

// 字数统计统一走真实 features/editor/stats.ts 的 countWords（D4 单一数据源）

// 新建文件同名去重：根目录子节点命中同名 .md 时追加 (n)，避免覆盖已有文件（VS Code 风格）
function uniqueFileName(root: FileNode, base: string): string {
  const want = base.endsWith('.md') ? base : `${base}.md`
  const names = new Set(
    (root.children ?? []).filter((c) => c.type === 'file').map((c) => c.name),
  )
  if (!names.has(want)) return want
  const stem = base.endsWith('.md') ? base.slice(0, -3) : base
  let i = 2
  while (names.has(`${stem} (${i}).md`)) i++
  return `${stem} (${i}).md`
}

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
  const { rootFolder, getActiveFileId, getActiveFileContent, updateFileContent, createFile, openFile, activeTabId, tabs, markTabDirty, isAnyTabDirty } = useFileManager()
  const { settings, updateSetting } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  // 知识库列表（辅助 Tab · 就地展开）的展开态与目标文件：受控持有，使 ⌘K 命令
  // 与标签右键菜单都能远程召唤同一个列表（数据与归集动作在 AuroraPublish 内闭环）。
  const [kbMenuOpen, setKbMenuOpen] = useState(false)
  // 目标文件（右键标签菜单可指向非激活文件；缺省取当前激活文件）
  const [kbMenuFileId, setKbMenuFileId] = useState<string | null>(null)
  const [returnCtx, setReturnCtx] = useState<EditorReturnContext | null>(() => getEditorReturn())

  // —— 编辑模式机制（对齐项目真实实现 useEditorSettings）——
  // editorMode：源码 / 所见即所得（TipTap 富文本）双内核；sourceVisible/previewVisible 为源码模式下的窗格开关
  // 默认范式收敛：初始值取真实设置 settings.editorMode（P1-1.2 E1，默认 wysiwyg）
  const [editorMode, setEditorMode] = useState<'source' | 'wysiwyg'>(settings.editorMode)
  const [sourceVisible, setSourceVisible] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  // —— v7 边缘悬停召唤面板：左=文件树，右=检查器（大纲/反链/脚注/辅助）——
  // 默认进入即纯编辑区（两栏均隐藏）；鼠标靠到屏幕左/右缘滑入，移开收起；
  // 图钉 pin 可钉成常驻栏；⌘B / ⌘⇧O 快捷键切换。
  const [leftHover, setLeftHover] = useState(false)
  const [leftPinned, setLeftPinned] = useState(false)
  const [rightHover, setRightHover] = useState(false)
  const [rightPinned, setRightPinned] = useState(false)
  // 空态「新建笔记」文件名输入：需求改为自定义文件名，不再直接生成未命名
  const [newFileName, setNewFileName] = useState('')
  const newFileInputRef = useRef<HTMLInputElement>(null)
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
  // 鼠标靠到缘侧需“停留”约 HOVER_INTENT_MS 才滑入面板；快速掠过 / 误触会在到期前离开而被取消，
  // 不再一碰边缘就弹出。已钉住（pinned）时无需 hover，离开也不收起。
  const HOVER_INTENT_MS = 220
  const HOVER_CLOSE_DELAY_MS = 180
  const leftHoverTimer = useRef<number | null>(null)
  const leftCloseTimer = useRef<number | null>(null)
  const rightHoverTimer = useRef<number | null>(null)
  const rightCloseTimer = useRef<number | null>(null)
  const cancelLeftClose = useCallback(() => {
    if (leftCloseTimer.current) { window.clearTimeout(leftCloseTimer.current); leftCloseTimer.current = null }
  }, [])
  const cancelRightClose = useCallback(() => {
    if (rightCloseTimer.current) { window.clearTimeout(rightCloseTimer.current); rightCloseTimer.current = null }
  }, [])
  const openLeftIntent = useCallback(() => {
    if (leftPinned) return
    if (leftHoverTimer.current) window.clearTimeout(leftHoverTimer.current)
    cancelLeftClose()
    leftHoverTimer.current = window.setTimeout(() => setLeftHover(true), HOVER_INTENT_MS)
  }, [leftPinned, cancelLeftClose])
  const scheduleLeftClose = useCallback(() => {
    if (leftPinned) return
    if (leftCloseTimer.current) window.clearTimeout(leftCloseTimer.current)
    leftCloseTimer.current = window.setTimeout(() => setLeftHover(false), HOVER_CLOSE_DELAY_MS)
  }, [leftPinned])
  const closeLeftIntent = useCallback(() => {
    if (leftHoverTimer.current) { window.clearTimeout(leftHoverTimer.current); leftHoverTimer.current = null }
    scheduleLeftClose()
  }, [scheduleLeftClose])
  const openRightIntent = useCallback(() => {
    if (rightPinned) return
    if (rightHoverTimer.current) window.clearTimeout(rightHoverTimer.current)
    cancelRightClose()
    rightHoverTimer.current = window.setTimeout(() => setRightHover(true), HOVER_INTENT_MS)
  }, [rightPinned, cancelRightClose])
  const scheduleRightClose = useCallback(() => {
    if (rightPinned) return
    if (rightCloseTimer.current) window.clearTimeout(rightCloseTimer.current)
    rightCloseTimer.current = window.setTimeout(() => setRightHover(false), HOVER_CLOSE_DELAY_MS)
  }, [rightPinned])
  const closeRightIntent = useCallback(() => {
    if (rightHoverTimer.current) { window.clearTimeout(rightHoverTimer.current); rightHoverTimer.current = null }
    scheduleRightClose()
  }, [scheduleRightClose])
  // 卸载时清理挂起的 hover 定时器，避免泄漏
  useEffect(() => () => {
    if (leftHoverTimer.current) window.clearTimeout(leftHoverTimer.current)
    if (rightHoverTimer.current) window.clearTimeout(rightHoverTimer.current)
    if (leftCloseTimer.current) window.clearTimeout(leftCloseTimer.current)
    if (rightCloseTimer.current) window.clearTimeout(rightCloseTimer.current)
  }, [])
  const [showVersionHistory, setShowVersionHistory] = useState(false)

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
  const usageDocs = useUsageDocsScope()
  const isUsageDoc = !!activeFileId && usageDocs.hiddenIds.has(activeFileId)

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
  const [localContent, setLocalContent] = useState<string>(() => getActiveFileContent() ?? '')
  useEffect(() => {
    setLocalContent(getActiveFileContent() ?? '')
    // 仅当激活文件变化时重置草稿，避免受 store 回写影响光标
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId])

  // —— Phase 4 B2：接入共享 useAppLogic（策略 A 单一来源）——
  // 使 Aurora 编辑器获得 S1–S6 等价（自动保存/崩溃备份/版本快照/块索引/tab dirty/beforeunload）。
  // S5/S7（MOC/备份调度）此前由 AuroraShell 壳层 useAppLogic() 承担；本步统一后将从壳层移除，
  // 避免 S5/S7 双跑（尤其双备份调度器会写两份备份）。灰度期 S5/S7 仅在编辑器视图运行，
  // 非编辑器视图不跑 —— 此为已知取舍，待 4.4（AuroraShell 成为唯一外壳）时再评估「常驻壳层」放置。
  const { scheduleSave, createVersion } = useAppLogic({
    activeFileId,
    activeFileName: activeNode?.name,
    localContent,
    activeTabId,
    updateFileContent,
    openFile,
    markTabDirty,
    isAnyTabDirty,
  })

  const handleChange = useCallback(
    (value: string) => {
      // 对齐 App.tsx 的 useContentHandler.handleChange：
      // 经 textFromStorage 入草稿、textToStorage 入存储，由 scheduleSave 统一负责
      // 崩溃备份 + 500ms 防抖持久化(updateFileContent) + isDirty 标记(S6)。不直写 store。
      const convertedValue = textFromStorage(value)
      setLocalContent(convertedValue)
      scheduleSave(textToStorage(convertedValue))
    },
    [scheduleSave, setLocalContent, textFromStorage, textToStorage],
  )

  // —— S15 全局保存（对齐 App.tsx handleSave：Ctrl/Cmd+S → scheduleSave + manual 版本）——
  // 阻止浏览器默认「保存网页」行为；无活跃文件时静默跳过（与 App.tsx 一致）。
  const handleManualSave = useCallback(() => {
    if (!activeFileId) return
    scheduleSave(textToStorage(localContent))
    createVersion(activeFileId, localContent, 'manual')
  }, [activeFileId, localContent, scheduleSave, createVersion, textToStorage])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handleManualSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleManualSave])

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

  // —— 模式切换状态机（Aurora 工具栏驱动，映射真实 EditorLayout props）——
  // 叠加式视图切换：源码 / 预览 两个独立窗格，二者同开 = 双屏（左源码右预览）
  // 所见即所得为独立内核，与源码/预览互斥。
  // 切换语义（对齐用户确认的 4 态循环）：
  //   - 纯源码(A) ⇄ 纯预览(C) 独占互切；双屏(B)下点某窗格 = 收起该窗格转入独占
  //   - 点「源码」：A→C, B→C, C→B ；点「预览」：A→C, B→A, C→A
  //   （分段控件是互斥单选，天生无法表达 B 这个复合态，故用两个窗格按钮 + 一个内核按钮）
  const handleSourceClick = useCallback(() => {
    if (editorMode === 'wysiwyg') {
      // 从所见即所得切回：纯源码视图
      setEditorMode('source'); setSourceVisible(true); setPreviewVisible(false); return
    }
    if (sourceVisible && !previewVisible) {
      // A → C（关源码 → 纯预览）
      setSourceVisible(false); setPreviewVisible(true)
    } else if (sourceVisible && previewVisible) {
      // B → C（收起源码 → 纯预览）
      setSourceVisible(false)
    } else {
      // C（S关P开）→ B（开源码 → 双屏）
      setSourceVisible(true)
    }
  }, [editorMode, sourceVisible, previewVisible])

  const togglePreview = useCallback(() => {
    if (editorMode === 'wysiwyg') {
      // 从所见即所得切回：纯预览视图
      setEditorMode('source'); setSourceVisible(false); setPreviewVisible(true); return
    }
    if (sourceVisible && !previewVisible) {
      // A → C（开预览 → 纯预览）
      setSourceVisible(false); setPreviewVisible(true)
    } else if (sourceVisible && previewVisible) {
      // B → A（收起预览 → 纯源码）
      setPreviewVisible(false)
    } else {
      // C（S关P开）→ A（开源码 → 纯源码）
      setSourceVisible(true); setPreviewVisible(false)
    }
  }, [editorMode, sourceVisible, previewVisible])

  const toggleWysiwyg = useCallback(() => {
    setEditorMode((m) => (m === 'wysiwyg' ? 'source' : 'wysiwyg'))
    // 退出所见即所得后回到纯源码视图
    if (editorMode === 'wysiwyg') {
      setSourceVisible(true); setPreviewVisible(false)
    }
  }, [editorMode])

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
    cmdBridge.current.save = handleManualSave
    cmdBridge.current.togglePreview = togglePreview
    cmdBridge.current.toggleEditorMode = toggleWysiwyg
    cmdBridge.current.toggleSidebar = () => { if (isUsageDoc) return; setLeftPinned((p) => !p) }
    cmdBridge.current.openVersionHistory = () => setShowVersionHistory(true)
    cmdBridge.current.goToLine = () => editorLayoutRef.current?.openGoToLine()
    cmdBridge.current.restoreCrash = handleChange
    // —— 极简顶栏整治：发布/知识库移出顶栏，经命令桥供 ⌘K 命令面板触达 ——
    cmdBridge.current.publish = handlePublish
    cmdBridge.current.openKbMenu = openKbMenu
    // —— 批次① P0-A：编辑菜单经命令桥触达编辑器内部动作（撤销/重做/查找/删除选区）——
    cmdBridge.current.undo = () => editorLayoutRef.current?.undo()
    cmdBridge.current.redo = () => editorLayoutRef.current?.redo()
    cmdBridge.current.find = () => editorLayoutRef.current?.find()
    cmdBridge.current.deleteSelection = () => editorLayoutRef.current?.deleteSelection()
    return () => {
      cmdBridge.current.save = undefined
      cmdBridge.current.togglePreview = undefined
      cmdBridge.current.toggleEditorMode = undefined
      cmdBridge.current.toggleSidebar = undefined
      cmdBridge.current.openVersionHistory = undefined
      cmdBridge.current.goToLine = undefined
      cmdBridge.current.restoreCrash = undefined
      cmdBridge.current.publish = undefined
      cmdBridge.current.openKbMenu = undefined
      cmdBridge.current.undo = undefined
      cmdBridge.current.redo = undefined
      cmdBridge.current.find = undefined
      cmdBridge.current.deleteSelection = undefined
    }
  }, [cmdBridge, handleManualSave, togglePreview, toggleWysiwyg, handleChange, handlePublish, openKbMenu, isUsageDoc])

  const wordCount = useMemo(() => countWords(localContent), [localContent])
  const isDiary = !!activeNode?.name && /^(\d{4}-\d{2}-\d{2})\.md$/.test(activeNode.name)

  // —— 语法检查（Aurora 层入口 · 复用真实 lintMarkdown + fixIssue；检测 500ms 防抖）——
  // 真实 lint 引擎已在 CodeMirror/TipTap 内核内运行（波浪线由 CM6 linter + TipTap LintExtension 渲染），
  // 此处仅在 Aurora 层暴露「编辑信息栏入口 + 常驻问题列表面板 + 跳转/修复」交互，
  // 与原界面 EditorStatusBar（真实）+ LintPopover（hover）形成双通道，用户可在 Aurora 状态栏直观发现。
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([])
  const [lintPanelOpen, setLintPanelOpen] = useState(false)
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    lintTimerRef.current = setTimeout(() => {
      setLintIssues(lintMarkdown(localContent))
    }, 500)
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    }
  }, [localContent])

  // 点击跳转：DOM 文本定位 + scrollIntoView + 选区（不依赖内核 view ref，Aurora 层独立完成）
  // 源码模式：在 .cm-content 内 TreeWalker 找首个包含该行 trim 前 30 字符的 .cm-line
  // 所见即所得：在 .ProseMirror / .tiptap-editor-content 内 TreeWalker 找首个包含的文本节点
  // 长文档不可视行（CM6 虚拟渲染）：不可见时退化为按行号估算 scrollDOM 滚动百分比
  const handleJumpToAuroraLint = useCallback((issue: LintIssue) => {
    const lines = localContent.split('\n')
    const targetLine = lines[issue.line]
    if (targetLine === undefined) return
    const searchText = targetLine.trim().substring(0, 30)
    if (!searchText) return

    // 模式 1：所选即所得（ProseMirror DOM）
    const tiptapDom = document.querySelector('.aurora-editor__main .tiptap-editor-content, .aurora-editor__main .ProseMirror') as HTMLElement | null
    // 模式 2：CodeMirror（虚拟化渲染，超大文档仅可视行有 .cm-line DOM）
    const cmDom = document.querySelector('.aurora-editor__main .cm-content') as HTMLElement | null
    const root = tiptapDom ?? cmDom
    if (!root) return

    // 优先 DOM 文本定位（精确、对齐原 Tiptap 跳转实现）
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const t = node.textContent || ''
      if (t.includes(searchText)) {
        const el = (node.parentElement as HTMLElement) ?? undefined
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 尝试设选区（仅在 CM6 / ProseMirror 内有效）
          const range = document.createRange()
          try {
            const idx = t.indexOf(searchText)
            range.setStart(node, idx)
            range.setEnd(node, idx + searchText.length)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
          } catch {
            // 选区失败不影响滚动
          }
          return
        }
      }
    }

    // 兜底：CM6 不可视行时按行号估算滚动
    if (cmDom && cmDom.parentElement) {
      const scroller = cmDom.closest('.cm-scroller') as HTMLElement | null
      const totalLines = lines.length || 1
      const ratio = Math.min(1, Math.max(0, issue.line / Math.max(1, totalLines - 1)))
      if (scroller) {
        scroller.scrollTo({ top: ratio * (scroller.scrollHeight - scroller.clientHeight), behavior: 'smooth' })
      }
    }
  }, [localContent])

  // 一键修复：走真实 fixIssue → 写回 handleChange → 触发下次 lint（500ms 防抖）
  const handleFixAuroraLint = useCallback((issue: LintIssue) => {
    const next = fixIssue(localContent, issue)
    if (next !== null) handleChange(next)
  }, [localContent, handleChange])

  const lintErrorCount = useMemo(() => lintIssues.filter((i) => i.severity === 'error').length, [lintIssues])
  const lintWarnCount = useMemo(() => lintIssues.filter((i) => i.severity === 'warning').length, [lintIssues])
  const lintHasIssues = lintIssues.length > 0

  const statusModeLabel = useMemo(() => {
    // 只读简介页不呈现编辑内核状态（此时编辑模式选择框已不存在，状态栏也不该声称「所见即所得」）
    if (isUsageDoc) return '简介'
    if (editorMode === 'wysiwyg') return '所见即所得'
    if (sourceVisible && previewVisible) return '预览'
    if (previewVisible) return '预览'
    return '源码'
  }, [editorMode, sourceVisible, previewVisible, isUsageDoc])

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

  // 「← 返回 XX」芯片的回跳动作：来源可能是知识库详情，也可能是双链图谱（按来源存 kbId 或 view）
  const handleReturnToSource = useCallback(() => {
    if (!returnCtx) return
    if (returnCtx.kbId) nav?.('kb', returnCtx.kbId)
    else nav?.(returnCtx.view)
    clearEditorReturn()
    setReturnCtx(null)
  }, [returnCtx, nav])

  const openImport = useCallback(() => auroraModal?.open('import'), [auroraModal])
  const openLinkRedirect = useCallback(() => auroraModal?.open('linkRedirect'), [auroraModal])

  // —— 真实弹层回调（与 App.tsx 行为守恒，复用真实 FileStore API）——
  const handleImportFile = useCallback(
    (fileName: string, content: string) => {
      createFile(rootFolder.id, fileName, content)
      auroraModal?.close('import')
    },
    [auroraModal, createFile, rootFolder.id],
  )

  const handleTemplateInsert = useCallback(
    (content: string) => {
      if (!activeFileId) {
        // 无活跃文件：用模板新建一篇并打开（对齐真实 handleTemplateInsert 无文件分支）
        const name = `未命名-${Date.now()}.md`
        const id = createFile(rootFolder.id, name, content)
        if (id) openFile(id)
      } else {
        const next = localContent ? localContent + '\n\n' + content : content
        setLocalContent(next)
        scheduleSave(textToStorage(next))
      }
      auroraModal?.close('templateInsert')
    },
    [activeFileId, auroraModal, createFile, localContent, openFile, rootFolder.id, scheduleSave],
  )

  const handleQuickCapture = useCallback(
    (name: string, content: string) => {
      const inboxId = findInboxId(rootFolder)
      createFile(inboxId ?? rootFolder.id, name, content, true)
      auroraModal?.close('quickCapture')
    },
    [auroraModal, createFile, rootFolder],
  )

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
      onOpenVersionHistory={() => setShowVersionHistory(true)}
      isVersionHistoryOpen={showVersionHistory}
      isDiary={isDiary}
      onPrint={() => window.print()}
      onOpenImportDialog={openImport}
      onBrokenLinkClick={openLinkRedirect}
      onUseTemplate={() => auroraModal?.open('templateInsert')}
    />
  )

  return (
    <div className="aurora-editor">
      <PageFrame
        sidebarGroups={AURORA_SIDEBAR_GROUPS}
        sidebarActiveId="编辑器"
        onSidebarSelect={(id) => nav?.(resolveAuroraNav(id))}
        breadcrumbs={breadcrumbItems}
        titlebarModified={activeTabDirty}
        savedState={activeFileId ? (activeTabDirty ? 'unsaved' : 'saved') : undefined}
        statusLeftItems={
          activeFileId
            ? [
              { content: `${wordCount} 字` },
              { content: 'UTF-8' },
              // 语法检查入口（与真实 EditorStatusBar 状态栏互补 · 点击展开 AuroraLintList 常驻面板）
              ...(lintHasIssues
                ? [{
                    clickable: true,
                    onClick: () => setLintPanelOpen((v) => !v),
                    content: (
                      <span
                        className="aurora-lint-entry"
                        title="点击查看语法检查列表"
                        aria-label="打开语法检查列表"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLintPanelOpen((v) => !v) } }}
                      >
                        {lintErrorCount > 0 && (
                          <span className="aurora-lint-entry__dot aurora-lint-entry__dot--error" />
                        )}
                        {lintErrorCount > 0 && (
                          <span className="aurora-lint-entry__num aurora-lint-entry__num--error">{lintErrorCount}</span>
                        )}
                        {lintWarnCount > 0 && (
                          <span className="aurora-lint-entry__dot aurora-lint-entry__dot--warn" />
                        )}
                        {lintWarnCount > 0 && (
                          <span className="aurora-lint-entry__num aurora-lint-entry__num--warn">{lintWarnCount}</span>
                        )}
                        <span className="aurora-lint-entry__label">语法</span>
                      </span>
                    ),
                  }]
                : []),
            ]
            : []
        }
        statusRightItems={[
          { content: statusModeLabel },
          { content: 'Markdown' },
          { content: '⌘K 命令面板', clickable: true, onClick: () => onOpenCommandPalette?.() },
        ]}
      >
        {/* 空态引导界面不渲染编辑器工具栏：未打开文档时「编辑模式切换框 / 多文件标签栏」均无意义，
            且文件浏览已由内嵌列表承担；编辑态仍正常渲染。
            内置「使用文档」简介页同样不渲染：该行承载的「多文件标签栏（含标签 × 关闭）」与
            「源码 / 预览 / 所见即所得」编辑模式选择框，正是需求要求移除的两类编辑元素。 */}
        {activeFileId && !isUsageDoc && (
          <EditorToolbar
            editorMode={editorMode}
            sourceVisible={sourceVisible}
            previewVisible={previewVisible}
            onToggleSource={handleSourceClick}
            onTogglePreview={togglePreview}
            onToggleWysiwyg={toggleWysiwyg}
            onPublishFile={handlePublish}
            onAddToKbFile={openKbMenu}
          />
        )}

        {returnCtx && (
          <div className="aurora-editor__returnbar">
            <button type="button" className="aurora-editor__return" onClick={handleReturnToSource}>
              ← 返回 {returnCtx.label}
            </button>
          </div>
        )}

        {/* 知识库列表不再走独立浮层：已迁入右栏检查器「辅助」Tab（AuroraPublish），
            展开态由 kbMenuOpen 受控、目标文件由 kbMenuFileId 决定（见 openKbMenu）。 */}

        <div className="aurora-editor__layout">
          {/* 左缘 hoverzone：编辑态下鼠标靠左缘滑入文件树；图钉可钉成常驻栏。
              空态引导界面已内嵌文件列表，不再需要边缘滑入，故仅编辑态渲染。
              内置「使用文档」简介页不渲染：需求要求**隐藏左侧文件列表**，而此 hoverzone
              正是它的唯一入口（含图钉常驻与 ⌘B 切换），整块缺席才是「隐藏」。 */}
          {activeFileId && !isUsageDoc && (
          <div
            className={`aurora-editor__hoverzone aurora-editor__hoverzone--left ${leftPinned ? 'is-pinned' : ''}`}
            onMouseEnter={openLeftIntent}
            onMouseLeave={closeLeftIntent}
          >
            <div className="aurora-editor__edge aurora-editor__edge--left" aria-hidden />
            {leftOverlay.mounted && (
              <div
                className="aurora-editor__overlay aurora-editor__overlay--left"
                data-exiting={leftOverlay.exiting || undefined}
                onMouseEnter={cancelLeftClose}
                onMouseLeave={scheduleLeftClose}
              >
                <div className="aurora-editor__overlay-head">
                  <span className="aurora-editor__overlay-title">文件</span>
                  <div className="aurora-editor__overlay-actions">
                    <button
                      type="button"
                      className={`aurora-editor__pin ${leftPinned ? 'is-on' : ''}`}
                      onClick={() => setLeftPinned((p) => !p)}
                      aria-label={leftPinned ? '取消钉住文件栏' : '钉住文件栏'}
                      title={leftPinned ? '取消钉住' : '钉住常驻'}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                    </button>
                    <button
                      type="button"
                      className="aurora-editor__overlay-close"
                      onClick={closeLeft}
                      aria-label="收起文件栏"
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
              <div className="aurora-editor__empty">
                <div className="aurora-editor__empty-icon">
                  <Icon.fileText size={20} />
                </div>
                <div className="aurora-editor__empty-title">未打开文档</div>
                <div className="aurora-editor__empty-sub">
                  在下方文件列表中选择一篇笔记，或按 <kbd className="aurora-editor__empty-kbd">⌘K</kbd> 打开命令面板快速定位
                </div>
                <div className="aurora-editor__empty-actions">
                  <div className="aurora-editor__newfile">
                    <Icon.fileText size={15} className="aurora-editor__newfile-icon" />
                    <input
                      ref={newFileInputRef}
                      className="aurora-editor__filename-input"
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNote() }}
                      placeholder="为这篇笔记起个名字…"
                      aria-label="新文件名"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="aurora-editor__newfile-btn"
                      onClick={handleCreateNote}
                    >
                      新建笔记
                    </button>
                  </div>
                </div>
                {/* 文件列表直接内嵌于引导界面：轻量定制列表（非侧栏 FileTree），点文件即打开，无需再点按钮唤起侧栏 */}
                <div className="aurora-editor__empty-files">
                  <EmptyFileBrowser />
                </div>
              </div>
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
            onMouseEnter={openRightIntent}
            onMouseLeave={closeRightIntent}
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
                      aria-label="收起检查器"
                      title="收起"
                    >
                      <Icon.chevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className={`aurora-editor__pin ${rightPinned ? 'is-on' : ''}`}
                      onClick={() => setRightPinned((p) => !p)}
                      aria-label={rightPinned ? '取消钉住检查器' : '钉住检查器'}
                      title={rightPinned ? '取消钉住' : '钉住常驻'}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                    </button>
                  </div>
                  <span className="aurora-editor__overlay-title">检查器</span>
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

      {showVersionHistory && (
        <VersionHistoryPanel
          fileId={activeFileId ?? undefined}
          currentContent={localContent}
          onClose={() => setShowVersionHistory(false)}
          onRestore={(content) => {
            setLocalContent(content)
            handleChange(content)
            setShowVersionHistory(false)
          }}
          language={language}
        />
      )}

      {/* —— Phase 3d：编辑器相关真实弹层（方案 B 就近归属，由 AuroraShell 共享开关驱动）——
          全部 portal 到 document.body，层级天然在 Aurora 之上。 */}
      {auroraModal?.isOpen('import') && (
        <ImportDialog
          isOpen={auroraModal.isOpen('import')}
          onClose={() => auroraModal.close('import')}
          onImport={handleImportFile}
        />
      )}

      {auroraModal?.isOpen('linkRedirect') && (
        <LinkRedirectDialog
          visible={auroraModal.isOpen('linkRedirect')}
          onClose={() => auroraModal.close('linkRedirect')}
        />
      )}

      {auroraModal?.isOpen('blockBacklinks') && (
        <BlockBacklinksPanel
          fileId={activeFileId ?? undefined}
          onOpenFile={(id) => {
            openFile(id)
            auroraModal?.close('blockBacklinks')
          }}
        />
      )}

      {auroraModal?.isOpen('templateInsert') && (
        <TemplateInsertModal
          isOpen={auroraModal.isOpen('templateInsert')}
          onClose={() => auroraModal.close('templateInsert')}
          onInsert={handleTemplateInsert}
          onOpenDiscovery={() => auroraModal?.open('templateDiscovery')}
        />
      )}

      {auroraModal?.isOpen('templateDiscovery') && (
        <TemplateDiscoveryModal
          isOpen={auroraModal.isOpen('templateDiscovery')}
          onClose={() => auroraModal.close('templateDiscovery')}
          onAcquire={handleTemplateInsert}
        />
      )}

      {auroraModal?.isOpen('quickCapture') && (
        <QuickCaptureModal
          isOpen={auroraModal.isOpen('quickCapture')}
          onClose={() => auroraModal.close('quickCapture')}
          onCreate={handleQuickCapture}
        />
      )}

      {/* —— 语法检查列表面板（Aurora 层常驻入口 · 复用真实 lintMarkdown 引擎）—— */}
      <AuroraLintList
        issues={lintIssues}
        open={lintPanelOpen && !!activeFileId}
        onClose={() => setLintPanelOpen(false)}
        onJump={(issue) => { handleJumpToAuroraLint(issue); setLintPanelOpen(false) }}
        onFix={handleFixAuroraLint}
      />
    </div>
  )
}
