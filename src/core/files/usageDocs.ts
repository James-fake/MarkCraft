/**
 * 内置「MarkCraft 使用文档」的**单源判定**（core 层：纯数据遍历，无 UI / 无 store 依赖）
 * ==========================================================================
 * 背景（用户需求 2026-09-22）：
 *   ① 使用文档的笔记不该出现在**编辑功能的文件列表**里；
 *   ② 点开使用文档笔记后，编辑区应呈现为**只读简介页**（隐藏左栏文件列表、标签栏、
 *      编辑模式选择框与格式工具条），仅保留阅读所需元素。
 *   两条需求都需要同一个问题的答案：「这篇笔记是不是内置使用文档？」——
 *   故在这里给出**唯一实现**，由 `hooks/useUsageDocsScope` 包成响应式 hook 供三层共用
 *   （FileTree / EmptyFileBrowser / EditorPanel）。绝不在各处再写一份判定
 *   （项目已有教训：同款逻辑手写多份 → 交互能力各自漂移）。
 *
 * 判定依据 = **文件夹名**命中内置库名（zh / en），递归任意层级：
 *   · 内置使用文档由两处创建，**名字同源**：
 *       - `core/files/fileTree.ts#createInitialFileTree`（默认树即带该文件夹，jsdom 测试亦可见）
 *       - `stores/kbSeed.ts#materialize`（老用户播种 / 自愈）
 *   · 名字常量与上述两处共用同一导出（`USAGE_DOC_FOLDER`），故不存在第二份字面量。
 *   · 同步、零异步：若改用「知识库列表」判定需读 IndexedDB（异步）→ 渲染期会先渲染完整
 *     编辑器 chrome 再降级，出现可见闪烁；且文件列表在未建库时也应过滤。
 *
 * 边界（有意为之，写清楚以免被当成 bug）：
 *   · 用户若把该文件夹**改名**，它就不再被识别为内置使用文档（文档会回到普通列表）。
 *     `renameKb` 会同时重命名文件夹，即以「重命名内置库」表达「我不想要这个内置库」——
 *     尊重用户意图，不做名字之外的兜底猜测。
 *   · 判定的是**整棵子树**：用户手动拖进该文件夹的笔记同样被隐藏（该文件夹即「内置文档区」）。
 */
import type { FileNode } from '../../types/fileManager'
import { USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_ZH } from '@core/data/defaultDocs/usageDocs/zh'
import { USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_EN } from '@core/data/defaultDocs/usageDocs/en'

/**
 * 内置「使用文档」文件夹名（多语言）。
 * 与 `createInitialFileTree` / `kbSeed.materialize` 使用的是同一批常量，故不会漂移。
 */
export const USAGE_DOC_FOLDER_NAMES: readonly string[] = [
  USAGE_DOC_FOLDER_ZH,
  USAGE_DOC_FOLDER_EN,
]

export interface UsageDocsScope {
  /** 内置使用文档文件夹节点 id；树里不存在该文件夹时为 null */
  folderId: string | null
  /**
   * 应从**编辑器文件列表**排除的节点 id 集合 =
   * 文件夹自身 + 其下全部文件后代（含多级嵌套）。
   * 注意这是「视图过滤」用途，**不动数据**：文件仍在树里、仍属于知识库，
   * 只是不在编辑器的浏览列表中出现。
   */
  hiddenIds: Set<string>
}

/** 递归按名查找文件夹（任意层级；根自身也参与匹配） */
function findFolderByName(node: FileNode | null | undefined, names: readonly string[]): FileNode | null {
  if (!node || node.type !== 'folder') return null
  if (names.includes(node.name)) return node
  for (const child of node.children ?? []) {
    const hit = findFolderByName(child, names)
    if (hit) return hit
  }
  return null
}

/**
 * 解析内置使用文档作用域。
 *
 * @param root 文件树根（来自 `useFileManager().rootFolder`）；null/undefined 视为「无」
 * @returns `folderId` + `hiddenIds`；未播种（或用户已删除该文件夹）时 folderId=null、集合为空
 */
export function resolveUsageDocsScope(root: FileNode | null | undefined): UsageDocsScope {
  const folder = findFolderByName(root, USAGE_DOC_FOLDER_NAMES)
  if (!folder) return { folderId: null, hiddenIds: new Set() }

  // ⚠️ 必须收集**整棵子树的所有节点**（文件夹 + 文件），不能只用 collectAllFiles
  //    （它只返回 file 节点）。否则嵌套子文件夹会残留在文件列表里，成为一个
  //    「父级已被过滤、自己却还在」的孤儿行 —— 首版实现即栽在此处（由单测抓出）。
  const hiddenIds = new Set<string>()
  const walk = (node: FileNode) => {
    hiddenIds.add(node.id)
    for (const child of node.children ?? []) walk(child)
  }
  walk(folder)
  return { folderId: folder.id, hiddenIds }
}
