import { useEffect, useRef } from 'react'
import { useFileManager } from '@stores/FileStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { findNode } from '@services/fileService'
import { startAutoBackupScheduler } from '@services/backupService'
import {
  isAutoMoc,
  parseMocFrontMatter,
  generateMocContent,
  hasAutoSection,
  updateAutoMoc,
} from '../fileManager/MocGenerator'
import type { FileNode } from '@src/types/fileManager'

/**
 * useAppGlobalEffects —— **应用级**副作用（P0 解耦，2026-09-27）。
 *
 * 🚨 为什么必须挂在壳（AuroraShell）而不是某个面板：
 * 这些副作用原本寄生在 `useAppLogic`，而 `useAppLogic` 只被 EditorPanel 挂载。
 * AuroraShell 的 renderView 是 switch/case ⇒ 切到白板/图谱/知识库等视图时
 * EditorPanel 卸载，MOC 自动更新、定时备份、beforeunload 守卫**全部停摆**——
 * 用户在白板改完链接关系回不到编辑器，MOC 就不更新；长时间停在白板，备份不跑。
 * 它们只依赖 store（文件树 / 索引），与「当前视图是不是编辑器」无关 ⇒ 常驻壳层。
 *
 * 承载：
 *  - S5  MOC 自动更新（防抖 2s，监听 link/tag 索引版本变化）
 *  - S7  定时自动备份调度器
 *  - S6b beforeunload 未保存守卫（脏标记来自 FileStore，非编辑器局部状态）
 *
 * 编辑器耦合的 S1/S2/S3/S4（自动保存 / 版本快照 / 块索引 / 块解析器）仍留在
 * `useAppLogic`，由 EditorPanel 挂载——它们本来只对活跃编辑器有意义。
 */
export function useAppGlobalEffects(): void {
  const { rootFolder, updateFileContent, isAnyTabDirty } = useFileManager()
  const {
    indexVersion: linkIndexVersion,
    getBacklinks: linkGetBacklinks,
    getOutgoingLinks: linkGetOutgoingLinks,
    getFileHeadings: linkGetFileHeadings,
  } = useLinkIndex()
  const { indexVersion: tagIndexVersion, getFilesByTag: tagGetFilesByTag } = useTagIndex()

  // —— S5: MOC 自动更新（防抖 2s）——
  // 遍历文件树，对标记为 autoUpdate 的 MOC 文件，仅在已有 auto section 时就地更新
  // body，避免丢失用户手动编辑（与旧 useAppLogic 行为逐一对应）。
  const mocUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mocUpdateTimerRef.current) clearTimeout(mocUpdateTimerRef.current)
    mocUpdateTimerRef.current = setTimeout(() => {
      const walkUpdate = (node: FileNode) => {
        if (node.type === 'file' && node.content) {
          const content = node.content
          if (isAutoMoc(content)) {
            const fm = parseMocFrontMatter(content)
            if (fm && fm.autoUpdate && fm.target) {
              const newContent = generateMocContent({
                tagPath: fm.source === 'tag' ? fm.target : undefined,
                centerFileId: fm.source === 'backlink' ? fm.target : undefined,
                template: (fm.template as unknown as 'summary') || 'summary',
                getFileContent: (fid: string) => findNode(rootFolder, fid)?.content ?? null,
                getFileName: (fid: string) => findNode(rootFolder, fid)?.name ?? fid,
                getFilesByTag: tagGetFilesByTag,
                getBacklinks: linkGetBacklinks,
                getOutgoingLinks: linkGetOutgoingLinks,
                getFileHeadings: linkGetFileHeadings,
              })
              if (newContent) {
                const bodyMatch = newContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
                const newBody = bodyMatch ? bodyMatch[1] : newContent
                if (hasAutoSection(content)) {
                  const updated = updateAutoMoc(content, newBody)
                  if (updated !== content) updateFileContent(node.id, updated)
                }
              }
            }
          }
        }
        if (node.children) for (const c of node.children) walkUpdate(c)
      }
      walkUpdate(rootFolder)
      mocUpdateTimerRef.current = null
    }, 2000)
    return () => {
      if (mocUpdateTimerRef.current) clearTimeout(mocUpdateTimerRef.current)
    }
  }, [
    linkIndexVersion,
    tagIndexVersion,
    rootFolder,
    tagGetFilesByTag,
    linkGetBacklinks,
    linkGetOutgoingLinks,
    linkGetFileHeadings,
    updateFileContent,
  ])

  // —— S7: 定时自动备份调度器 ——
  useEffect(() => {
    const timer = startAutoBackupScheduler()
    return () => clearInterval(timer)
  }, [])

  // —— S6b: beforeunload 未保存守卫（脏标记取自 FileStore，视图无关）——
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isAnyTabDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isAnyTabDirty])
}
