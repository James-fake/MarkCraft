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
import { generateReverseMoc } from '../../features/fileManager/MocGenerator'
import { findNode } from '@core/files/fileTree'

export interface AuroraActionDeps {
  rootFolder: ReturnType<typeof useFileManager>['rootFolder']
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
}

export function buildAuroraActions(deps: AuroraActionDeps): Record<string, (() => void) | undefined> {
  const { rootFolder, createFile, createFolder, openFile, getActiveFileId, tabs, closeTab, updateSetting, theme, focusMode, typewriterMode, getOutgoingLinks, toggleLanguage, nav, modalOpen, cmdBridge, viewRef, toast } = deps

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
    'file.newFile': () => { createFile(rootFolder.id, `未命名-${Date.now()}.md`, ''); nav('editor') },
    'file.openDailyNote': () => { openDailyNote(new Date(), rootFolder, createFile, createFolder, openFile) },
    'view.toggleTheme': () => updateSetting('theme', theme === 'dark' ? 'light' : 'dark'),
    'settings.switchLanguage': () => toggleLanguage(),
    'settings.openSettings': () => nav('settings'),
    'navigation.graphView': () => nav('graph'),
    'tools.openCanvas': () => nav('canvas'),
    'tools.openKnowledgeBase': () => nav('kb'),
    'tools.diary': () => nav('diary'),
    'tools.openBlogStudio': () => nav('blog'),
    // —— Phase 3d：弹层触发型命令（此前无 auroraAction → 命令面板缺失 + 弹层不可达）——
    'file.importFile': () => { nav('editor'); modalOpen('import') },
    'tools.linkRedirect': () => { nav('editor'); modalOpen('linkRedirect') },
    'tools.openBlockBacklinks': () => {
      if (!getActiveFileId()) { toast('请先在编辑器中打开一篇笔记'); return }
      modalOpen('blockBacklinks')
    },
    'tools.insertTemplate': () => { nav('editor'); modalOpen('templateInsert') },
    'tools.templateDiscovery': () => { nav('editor'); modalOpen('templateDiscovery') },
    'file.quickCapture': () => { nav('editor'); modalOpen('quickCapture') },
    'tools.librarySync': () => modalOpen('librarySync'),
    'tools.migrate': () => modalOpen('migrate'),
    'navigation.quickSwitcher': () => modalOpen('quickSwitcher'),
    // —— Phase 4 P0 · 1.6：补回 12 条此前不可达命令（真实 handler 注入）——
    'file.newFolder': () => { createFolder('root', '新文件夹') },
    // —— P1-3：依赖命令桥的编辑器内部动作，非编辑器视图下先跳编辑器再执行 ——
    'file.save': runInEditor(() => cmdBridge.current.save?.()),
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
    'window.minimize': () => window.blur(),
    'window.zoom': () => {
      const el = document.documentElement
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
      else void el.requestFullscreen().catch(() => {})
    },
    // 文件菜单 · 关闭当前标签（无标签则回欢迎）
    'file.close': () => {
      const fid = getActiveFileId()
      const tab = fid ? tabs.find((t) => t.fileId === fid) : undefined
      if (tab) closeTab(tab.id)
      else nav('welcome')
    },
  }
}
