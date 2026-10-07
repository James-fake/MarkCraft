import type { FileNode } from '@src/types/fileManager'
import { uniqueFileName } from '@services/fileService'
import { importFileToMarkdown } from './importFile'
import { openFilePicker } from './openFilePicker'

export interface ImportFlowDeps {
  /**
   * 取**当前**文件树根（函数形式，在文件选中回调内延迟求值）。
   * 不可用值快照：从「点击」到「用户选完文件、转换完成」期间应用会重渲染，快照会过期 ——
   * 若用户在第一次导入完成前再次触发并选中同名文件，两次都基于同一旧树判定「不冲突」而重名
   * （审查 L1-2026-10-07）。
   */
  getRootFolder: () => FileNode
  /** 新建文件的落点父节点 id，默认 'root' */
  parentId?: string
  /** 新建文件（openAfterCreate=true 时创建后自动打开） */
  createFile: (parentId: string, name: string, content: string, openAfterCreate?: boolean) => string
  /** 失败提示（可选） */
  onError?: (message: string) => void
}

/**
 * 一步式导入编排：调起系统文件框 → 转 Markdown → 在 parentId 下新建（同名自动加序号）并打开。
 *
 * 「打开文件」命令、编辑器工具栏按钮共用此编排，保证行为一致；拖拽路径复用同一
 * `importFileToMarkdown` + `uniqueFileName`，只是入口不同。
 */
export function pickAndImportFile(deps: ImportFlowDeps): void {
  const { getRootFolder, parentId = 'root', createFile, onError } = deps
  openFilePicker((file) => {
    void (async () => {
      try {
        const { baseName, content } = await importFileToMarkdown(file)
        const name = uniqueFileName(getRootFolder(), baseName)
        createFile(parentId, name, content, true)
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err))
      }
    })()
  })
}
