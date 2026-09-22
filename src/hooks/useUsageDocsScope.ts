import { useMemo } from 'react'
import { useFileManager } from '../stores/FileStore'
import { resolveUsageDocsScope, type UsageDocsScope } from '@core/files/usageDocs'

/**
 * 内置「使用文档」作用域（响应式）—— 编辑器侧的统一取用入口。
 *
 * 判定逻辑全部在 `@core/files/usageDocs#resolveUsageDocsScope`（纯函数，可单测）；
 * 本 hook 只负责把它接到真实的文件树上，并用 useMemo 保证同一棵树只算一次，
 * 使 FileTree / EmptyFileBrowser / EditorPanel 三处共用**同一份**结果
 * —— 避免「同一判定各自手写 → 行为漂移」（项目已有教训）。
 */
export function useUsageDocsScope(): UsageDocsScope {
  const { rootFolder } = useFileManager()
  return useMemo(() => resolveUsageDocsScope(rootFolder), [rootFolder])
}
