import type { FileNode } from '@src/types/fileManager'
import { uniqueFileName } from '@services/fileService'
import { importFileToMarkdown } from './importFile'
import { openFilePicker } from './openFilePicker'

export interface ImportFlowDeps {
  /** 当前文件树根（用于同名去重） */
  rootFolder: FileNode
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
  const { rootFolder, parentId = 'root', createFile, onError } = deps
  openFilePicker((file) => {
    void (async () => {
      try {
        const { baseName, content } = await importFileToMarkdown(file)
        const name = uniqueFileName(rootFolder, baseName)
        createFile(parentId, name, content, true)
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err))
      }
    })()
  })
}
