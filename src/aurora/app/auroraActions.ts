// 命令动作构建（纯逻辑，独立于 AuroraShell UI 树）
//
// 抽离自 AuroraShell.tsx：buildAuroraActions 是一组纯函数，仅依赖
// features/fileManager 的工具函数与一组回调/类型，不依赖任何 UI 组件，
// 更不依赖 Excalidraw 画布引擎。原先它随 AuroraShell 导出，导致任何
// import 它的测试都会被 AuroraShell 的整棵 UI 树（含 CanvasPanel → Excalidraw）
// 连坐加载，在 jsdom 下因缺 Path2D 等浏览器 API 而收集阶段崩溃。
// 抽到本模块后，逻辑测试可直接 import 此处，彻底切断 Excalidraw 加载链。

import type { MutableRefObject } from 'react'
import type { useFileManager } from '../../stores/FileStore'
import type { useSettings } from '../../stores/SettingsStore'
import type { useLinkIndex } from '../../stores/LinkIndexStore'
import type { EditorCommandBridge, AuroraModalId } from '../panels/editor/EditorPanel'
import { openDailyNote } from '../../features/fileManager/DailyNoteService'
import { getAllTemplates } from '../../features/templates/templateManager'
import { loadSettings } from '../../stores/SettingsStore'
import { generateReverseMoc } from '../../features/fileManager/MocGenerator'
import { pickAndImportFile } from '../../features/import/importFlow'
import { findNode } from '@core/files/fileTree'
import { platform } from '@platform'

export interface AuroraActionDeps {
  rootFolder: ReturnType<typeof useFileManager>['rootFolder']
  /** 延迟取最新 root —— 导入流程专用：在文件选中回调内求值，避免用点击时的过期快照（审查 L1-2026-10-07） */
  getRootFolder: () => ReturnType<typeof useFileManager>['rootFolder']
  createFile: ReturnType<typeof useFileManager>['createFile']
  createFolder: ReturnType<typeof useFileManager>['createFolder']
  openFile: ReturnType<typeof useFileManager>['openFile']
  getActiveFileId: ReturnType<typeof useFileManager>['getActiveFileId']
  /** 标签管理（file.close 关闭当前标签） */
  tabs: ReturnType<typeof useFileManager>['tabs']
  closeTab: ReturnType<typeof useFileManager>['closeTab']
  updateSetting: ReturnType<typeof useSettings>['updateSetting']
  theme: string
  focusMode: boolean
  typewriterMode: boolean
  getOutgoingLinks: ReturnType<typeof useLinkIndex>['getOutgoingLinks']
  toggleLanguage: () => void
  nav: (id: string, param?: string) => void
  modalOpen: (id: AuroraModalId) => void
  /** 编辑器命令桥（EditorPanel 挂载时注册，命令可触达编辑器内部动作） */
  cmdBridge: MutableRefObject<EditorCommandBridge>
  /** 实时当前视图（ref 读取，避免动作闭包捕获过期视图） */
  viewRef: MutableRefObject<string>
  /** 轻量 toast 提示（条件命令无活动文件等场景引导） */
  toast: (msg: string) => void
  /** 默认命名与提示文案（走语言包，避免英文界面下仍出现中文硬编码） */
  labels: {
    /** 新建文件默认名前缀 */
    untitled: string
    /** 新建文件夹默认名 */
    newFolder: string
    /** 「请先在编辑器中打开一篇笔记」引导语 */
    openNoteFirst: string
  }
}

export function buildAuroraActions(deps: AuroraActionDeps): Record<string, (() => void) | undefined> {
  const { rootFolder, getRootFolder, createFile, createFolder, openFile, getActiveFileId, tabs, closeTab, updateSetting, theme, focusMode, typewriterMode, getOutgoingLinks, toggleLanguage, nav, modalOpen, cmdBridge, viewRef, toast, labels } = deps

  // 非编辑器视图下，先跳编辑器并延迟执行，待 EditorPanel 挂载并注册 cmdBridge 后再触达编辑器内部动作。
  const runInEditor = (fn: () => void) => () => {
    if (viewRef.current !== 'editor') {
      nav('editor')
      setTimeout(fn, 60)
    } else {
      fn()
    }
  }

  return {
    'file.newFile': () => { createFile(rootFolder.id, `${labels.untitled}-${Date.now()}.md`, ''); nav('editor') },
    'file.openDailyNote': () => {
      // 日记模板可在设置里指定（空 = 内置 daily-journal）；日期格式亦来自设置。
      const s = loadSettings()
      const dailyTemplate = s.dailyTemplateId
        ? getAllTemplates().find(t => t.id === s.dailyTemplateId)
        : undefined
      openDailyNote(new Date(), rootFolder, createFile, createFolder, openFile, {
        template: dailyTemplate,
        dateFormat: s.templateDateFormat,
      })
    },
    'view.toggleTheme': () => updateSetting('theme', theme === 'dark' ? 'light' : 'dark'),
    'settings.switchLanguage': () => toggleLanguage(),
    'settings.openSettings': () => nav('settings'),
    'navigation.graphView': () => nav('graph'),
    'tools.openCanvas': () => nav('canvas'),
    'tools.openKnowledgeBase': () => nav('kb'),
    'tools.diary': () => nav('diary'),
    'tools.openBlogStudio': () => nav('blog'),
    // —— Phase 3d：弹层触发型命令（此前无 auroraAction → 命令面板缺失 + 弹层不可达）——
    // 「打开文件」：直达系统文件框（去掉中间弹窗，遵循 macOS HIG「不为简单操作弹 sheet」/ Cmd+O 惯例）
    'file.importFile': () => { nav('editor'); pickAndImportFile({ getRootFolder, createFile, onError: toast }) },
    'tools.linkRedirect': () => { nav('editor'); modalOpen('linkRedirect') },
    'tools.openBlockBacklinks': () => {
      if (!getActiveFileId()) { toast(labels.openNoteFirst); return }
      // 与其它弹层型命令保持一致：先切到编辑器视图，否则在非编辑视图下弹层不可见（静默无效）
      nav('editor')
      modalOpen('blockBacklinks')
    },
    'tools.insertTemplate': () => { nav('editor'); modalOpen('templateInsert') },
    'tools.templateDiscovery': () => { nav('editor'); modalOpen('templateDiscovery') },
    'file.quickCapture': () => { nav('editor'); modalOpen('quickCapture') },
    'tools.librarySync': () => modalOpen('librarySync'),
    'tools.migrate': () => modalOpen('migrate'),
    'navigation.quickSwitcher': () => modalOpen('quickSwitcher'),
    // —— Phase 4 P0 · 1.6：补回 12 条此前不可达命令（真实 handler 注入）——
    'file.newFolder': () => { createFolder('root', labels.newFolder) },
    // —— P1-3：依赖命令桥的编辑器内部动作，非编辑器视图下先跳编辑器再执行 ——
    'file.save': runInEditor(() => cmdBridge.current.save?.()),
    // L-2 修复：另存为补入命令面板（此前只挂工具栏「更多」，命令面板不可达）
    'file.saveAs': runInEditor(() => cmdBridge.current.saveAs?.()),
    'view.togglePreview': runInEditor(() => cmdBridge.current.togglePreview?.()),
    'view.toggleSidebar': runInEditor(() => cmdBridge.current.toggleSidebar?.()),
    'view.focusMode': () => updateSetting('focusMode', !focusMode),
    'view.typewriterMode': () => updateSetting('typewriterMode', !typewriterMode),
    'view.toggleEditorMode': runInEditor(() => cmdBridge.current.toggleEditorMode?.()),
    'navigation.quickOpen': () => modalOpen('quickOpen'),
    'navigation.globalSearch': () => modalOpen('globalSearch'),
    // P2-2 跳转到行号：非编辑器视图先跳编辑器（编辑器内部 GoToLineDialog 经命令桥打开）
    'navigation.goToLine': runInEditor(() => cmdBridge.current.goToLine?.()),
    'tools.openVersionHistory': runInEditor(() => cmdBridge.current.openVersionHistory?.()),
    // —— 极简顶栏整治：发布/知识库移出顶栏，经命令面板触达（复用 EditorPanel 内部 handler）——
    'editor.publish': runInEditor(() => cmdBridge.current.publish?.()),
    'editor.addToKb': runInEditor(() => cmdBridge.current.openKbMenu?.()),
    'tools.crossKbSearch': () => modalOpen('crossKbSearch'),
    'tools.generateReverseMoc': () => {
      const id = getActiveFileId()
      if (!id) { toast('请先在编辑器中打开一篇笔记'); return }
      const content = generateReverseMoc(
        id,
        (fid) => findNode(rootFolder, fid)?.name ?? fid,
        getOutgoingLinks,
        (fid) => findNode(rootFolder, fid)?.content ?? null,
      )
      if (content) {
        const fileName = findNode(rootFolder, id)?.name?.replace(/\.md$/, '') ?? id
        createFile(rootFolder.id, `Reverse-MOC-${fileName}.md`, content)
      }
    },
    // —— 批次① P0-A · 完整 HIG 菜单命令（Edit / Window）——
    // App 菜单按钮已移除（使用优化 2026-09-10）；app.hide 系列死命令随之清剿。
    'app.about': () => nav('settings', 'about'),
    // 退出：打开自定义「退出 MarkCraft」确认弹窗（批次② QuitModal），
    // 真正尝试 window.close() 的逻辑由 AuroraShell 的确认回调执行（Web 外壳限制已诚实处理）。
    'app.quit': () => modalOpen('quit'),
    // 编辑菜单
    'edit.undo': runInEditor(() => cmdBridge.current.undo?.()),
    'edit.redo': runInEditor(() => cmdBridge.current.redo?.()),
    'edit.cut': () => document.execCommand('cut'),
    'edit.copy': () => document.execCommand('copy'),
    'edit.paste': () => document.execCommand('paste'),
    'edit.selectAll': () => document.execCommand('selectAll'),
    'edit.delete': runInEditor(() => cmdBridge.current.deleteSelection?.()),
    'edit.find': runInEditor(() => cmdBridge.current.find?.()),
    // 窗口菜单（Web 降级：最小化/全部前置无真实能力，缩放映射全屏切换）
    // P1 起统一走平台抽象层：浏览器保持上述降级行为；桌面为真实窗口操作。
    'window.minimize': () => platform.window.minimize(),
    'window.zoom': () => platform.window.toggleMaximize(),
    // 文件菜单 · 关闭当前标签（无标签则回欢迎）
    'file.close': () => {
      const fid = getActiveFileId()
      const tab = fid ? tabs.find((t) => t.fileId === fid) : undefined
      if (tab) closeTab(tab.id)
      else nav('welcome')
    },
  }
}
