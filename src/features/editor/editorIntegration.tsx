import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useTheme, type ThemeType } from '@features/themes/useTheme'
import { useAppLogic } from '@features/appRuntime/useAppLogic'
import { countWords } from '@features/editor/stats'
import { lintMarkdown, fixIssue } from '@features/lint/markdownLinter'
import type { LintIssue } from '@utils/lintTypes'
import VersionHistoryPanel from '@features/editor/VersionHistoryPanel'
import LinkRedirectDialog from '@features/fileManager/LinkRedirectDialog'
import BlockBacklinksPanel from '@features/editor/BlockBacklinksPanel'
import TemplateInsertModal from '@features/templates/TemplateInsertModal'
import TemplateDiscoveryModal from '@features/templates/TemplateDiscoveryModal'
import QuickCaptureModal from '@features/pwa/QuickCaptureModal'
import { findInboxId } from '@features/pwa'
import { textFromStorage, textToStorage } from '@core/storage/imageStore'
import { uniqueFileName } from '@services/fileService'
import type { FileNode } from '@src/types/fileManager'

/**
 * 编辑器功能接线聚合（P2-2，2026-09-28）
 * ==========================================================================
 * 背景：`aurora/panels/editor/EditorPanel.tsx`（1027 行）一次性直接引用 7 个 feature 域
 * （editor / fileManager / import / lint / pwa / templates / themes，外加 appRuntime），
 * 导致这个「壳层面板」同时承担 **布局** 与 **八路业务接线** 两种职责：
 * 新增/替换任一 feature 都要动布局文件，布局改动也可能碰坏接线。
 *
 * 拆分判据（唯一）：**这段东西是「功能接线」还是「布局」？**
 *   - 接线（本模块）：外部能力如何接到编辑器上 —— 自动保存/版本快照、语法检查、
 *     六个 feature 弹层的开关与回调、模板插入、快速捕捉、导入、主题。
 *   - 布局（留在 EditorPanel）：窗格/浮栏的显示态、hover-intent、面包屑、工具栏与右栏的摆位。
 *
 * 收敛后 EditorPanel 只 import `@features/editor/*`（EditorLayout 布局主体 + 本模块），
 * 按 feature **域**计引用数 8 → 1；且接线集中后可被单测独立覆盖。
 *
 * 边界（刻意保留在 EditorPanel，勿再往这里收）：
 *   - `AuroraLintList`：aurora 层本地组件。features 反向依赖 aurora 会触发
 *     反向依赖守卫（换界面铁律），故本模块只产出 lint 状态与回调，由面板渲染它。
 *   - 「发布为博客」与弹层开关 `openImport/openLinkRedirect`：只依赖 services / 壳层
 *     传入的 modal 控制器，与 feature 无关。
 */

export interface EditorIntegrationParams {
  /** 当前激活文件 id（无文件时传 null：部分接线会自动降级为「新建一篇」） */
  activeFileId: string | null
  /** 当前激活文件名（版本快照用） */
  activeFileName: string | undefined
  /** 草稿内容（受控于 EditorPanel 的 localContent） */
  localContent: string
  /** 写草稿（EditorPanel 持有 localStorage 草稿态） */
  setLocalContent: (next: string) => void
  activeTabId: string | null
  updateFileContent: (id: string, content: string) => void
  openFile: (id: string) => void
  markTabDirty: (tabId: string, dirty: boolean) => void
  rootFolder: FileNode
  createFile: (parentId: string, name: string, content?: string, isTransient?: boolean) => string | null
  /** 壳层弹层控制器（AuroraShell 单一数据源） */
  auroraModal?: {
    open: (id: string) => void
    close: (id: string) => void
    isOpen: (id: string) => boolean
  }
  language: 'zh' | 'en'
  /** 编辑器布局句柄：插入模板后聚焦编辑器并把光标移到末尾（可选，缺省则跳过） */
  editorLayoutRef?: React.RefObject<{ focusEnd: () => void } | null>
}

export interface EditorIntegration {
  /** 主题（EditorLayout / 状态栏用）：保留 useTheme 的真实派生类型，避免下游退化为 string 后再断言回来 */
  theme: ThemeType
  toggleTheme: () => void
  /** 内容变更入口：入草稿 + 防抖持久化 + dirty 标记（不直写 store） */
  handleChange: (value: string) => void
  /** Ctrl/Cmd+S：立即保存 + manual 版本 */
  handleManualSave: () => void
  /** 字数（真实 countWords 派生） */
  wordCount: number
  /** 语法检查（Aurora 层入口 · 真实 lintMarkdown 引擎，500ms 防抖） */
  lint: {
    issues: LintIssue[]
    panelOpen: boolean
    setPanelOpen: (open: boolean) => void
    jump: (issue: LintIssue) => void
    fix: (issue: LintIssue) => void
    errorCount: number
    warnCount: number
    hasIssues: boolean
  }
  /** 版本历史模态开关（EditorLayout 的按钮 + 本模块渲染的面板共用） */
  versionHistory: { isOpen: boolean; open: () => void; close: () => void }
  /** 六个 feature 弹层的 JSX（由 EditorPanel 在根部渲染一次） */
  modals: ReactNode
}

export function useEditorIntegration(p: EditorIntegrationParams): EditorIntegration {
  const {
    activeFileId, activeFileName, localContent, setLocalContent,
    activeTabId, updateFileContent, openFile, markTabDirty,
    rootFolder, createFile, auroraModal, language, editorLayoutRef,
  } = p

  // —— 主题（EditorLayout 需要 theme / onToggleTheme）——
  const { theme, toggleTheme } = useTheme()

  // —— 编辑器视图级副作用（S1 自动保存 / S2 版本快照 / S3 块索引 / S4 块解析器 / S6a tab dirty）——
  // P0 解耦后应用级的 S5/S7/S6b 已上提 useAppGlobalEffects（AuroraShell 常驻），此处只跑视图级。
  const { scheduleSave, createVersion } = useAppLogic({
    activeFileId,
    activeFileName,
    localContent,
    activeTabId,
    updateFileContent,
    openFile,
    markTabDirty,
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
    [scheduleSave, setLocalContent],
  )

  // —— S15 全局保存（Ctrl/Cmd+S → scheduleSave + manual 版本）——
  const handleManualSave = useCallback(() => {
    if (!activeFileId) return
    scheduleSave(textToStorage(localContent))
    createVersion(activeFileId, localContent, 'manual')
  }, [activeFileId, localContent, scheduleSave, createVersion])

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

  const wordCount = useMemo(() => countWords(localContent), [localContent])

  // —— 语法检查（检测 500ms 防抖）——
  // 真实 lint 引擎已在 CodeMirror/TipTap 内核内运行（波浪线由 CM6 linter + TipTap LintExtension 渲染），
  // 此处仅在 Aurora 层暴露「编辑信息栏入口 + 常驻问题列表面板 + 跳转/修复」交互。
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

    const tiptapDom = document.querySelector('.aurora-editor__main .tiptap-editor-content, .aurora-editor__main .ProseMirror') as HTMLElement | null
    const cmDom = document.querySelector('.aurora-editor__main .cm-content') as HTMLElement | null
    const root = tiptapDom ?? cmDom
    if (!root) return

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const t = node.textContent || ''
      if (t.includes(searchText)) {
        const el = (node.parentElement as HTMLElement) ?? undefined
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

  // —— 弹层回调（与 App.tsx 行为守恒，复用真实 FileStore API）——

  const handleTemplateInsert = useCallback(
    (content: string, meta?: { name?: string; at?: 'start' | 'end' }) => {
      if (!activeFileId) {
        // 无活跃文件：用模板新建一篇，并**按模板名命名**（此前是「未命名-<时间戳>」）
        const base = (meta?.name || '未命名').replace(/[\\/:*?"<>|]/g, '').trim() || '未命名'
        const finalName = uniqueFileName(rootFolder, base)
        const id = createFile(rootFolder.id, finalName, content)
        if (id) openFile(id)
      } else {
        // 插入位置：末尾（默认）或开头
        const next = meta?.at === 'start'
          ? (localContent ? content + '\n\n' + localContent : content)
          : (localContent ? localContent + '\n\n' + content : content)
        setLocalContent(next)
        scheduleSave(textToStorage(next))
      }
      auroraModal?.close('templateInsert')
      // 聚焦编辑器并把光标移到文档末尾（插入到开头时不动光标，避免跳到文末）
      if (meta?.at !== 'start') requestAnimationFrame(() => editorLayoutRef?.current?.focusEnd())
    },
    [activeFileId, auroraModal, createFile, localContent, openFile, rootFolder, scheduleSave, setLocalContent, editorLayoutRef],
  )

  const handleQuickCapture = useCallback(
    (name: string, content: string) => {
      const inboxId = findInboxId(rootFolder)
      createFile(inboxId ?? rootFolder.id, name, content, true)
      auroraModal?.close('quickCapture')
    },
    [auroraModal, createFile, rootFolder],
  )

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const closeVersionHistory = useCallback(() => setShowVersionHistory(false), [])
  const openVersionHistory = useCallback(() => setShowVersionHistory(true), [])

  // —— 六个 feature 弹层（方案 B 就近归属，由 AuroraShell 共享开关驱动）——
  // 全部 portal 到 document.body，层级天然在 Aurora 之上。
  const modals = (
    <>
      {showVersionHistory && (
        <VersionHistoryPanel
          fileId={activeFileId ?? undefined}
          currentContent={localContent}
          onClose={closeVersionHistory}
          onRestore={(content) => {
            setLocalContent(content)
            handleChange(content)
            closeVersionHistory()
          }}
          language={language}
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
          currentTitle={activeFileName ?? ''}
          currentContent={localContent}
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
    </>
  )

  return {
    theme,
    toggleTheme,
    handleChange,
    handleManualSave,
    wordCount,
    lint: {
      issues: lintIssues,
      panelOpen: lintPanelOpen,
      setPanelOpen: setLintPanelOpen,
      jump: handleJumpToAuroraLint,
      fix: handleFixAuroraLint,
      errorCount: lintErrorCount,
      warnCount: lintWarnCount,
      hasIssues: lintHasIssues,
    },
    versionHistory: { isOpen: showVersionHistory, open: openVersionHistory, close: closeVersionHistory },
    modals,
  }
}
