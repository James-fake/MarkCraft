/**
 * 内置「MarkCraft 使用文档」的**单源判定**（core 层：纯数据遍历，无 UI / 无 store 依赖）
 * ==========================================================================
 * 需求（用户 2026-09-22，第二条为紧急修复）：
 *   ① 内置使用文档**不该出现在编辑功能的文件列表**里；
 *   ② 点开内置使用文档 → 编辑区呈现**只读简介页**（无工具栏 / 无左右栏）；
 *      **其他一切笔记（含用户自建知识库里的笔记）必须仍是完整可编辑的编辑器**。
 *   两条都需要同一个问题的答案：「这个文件是不是内置说明书本身？」——
 *   故在这里给出**唯一实现**，由 `hooks/useUsageDocsScope` 包成响应式 hook 供三层共用
 *   （FileTree / EmptyFileBrowser / EditorPanel）。绝不在各处再写一份判定
 *   （项目已有教训：同款逻辑手写多份 → 交互能力各自漂移）。
 *
 * ── 判定口径（2026-09-22 收窄，这是紧急修复的核心）────────────────────────────
 * 「内置使用文档」= **内置使用文档文件夹内、且文件名属于内置篇章清单的文件**（两者同时满足）。
 *    · 文件夹：名字命中内置库名（zh / en），递归任意层级 —— 与 `createInitialFileTree`、
 *      `kbSeed.materialize` 共用同一批常量，不存在第二份字面量。
 *    · 文件名：`core/data/defaultDocs/usageDocs/zh|en#USAGE_DOC_ALL` 的全部 fileName，
 *      外加 `legacyNames.ts` 的历史文件名（老用户迁移进该文件夹的《用户手册》全文等）。
 *
 * ⚠️ **为什么不能只看文件夹**（上一版的漏洞，用户实测踩到）：
 *    「凡在该文件夹内的文件都算使用文档」这一口径会把**用户自己的笔记**一起吞掉 ——
 *    用户一旦把自己的笔记放进该文件夹（拖进去 / 建在里面 / 用模板生成子目录），
 *    那些笔记就会被降级成只读简介页，且从文件列表里消失。用户语义是
 *    「内置的那几篇**使用说明**是写死的、不能改」，不是「这个文件夹是禁区」。
 *    故现在只读范围 = **说明书文件本身**；文件夹里用户自己的文件照常可见、可编辑。
 *
 * ⚠️ 为什么必须**同步**、零异步：若改用「知识库列表」判定需读 IndexedDB（异步）→
 *    渲染期会先渲染完整编辑器 chrome 再降级，出现可见闪烁；且文件列表在未建库时也应过滤。
 *
 * 边界（有意为之，写清楚以免被当成 bug）：
 *   · 文件夹**改名**后不再命中 → 该文件夹与其文档回到普通列表（`renameKb` 会同时重命名文件夹，
 *     即以「重命名内置库」表达「我不想要这个内置库」——尊重用户意图）。
 *   · 内置文档被**移出**该文件夹后按普通笔记处理（用户主动把它拿出来编辑，是明确意图）。
 */
import type { FileNode } from '../../types/fileManager'
import { USAGE_DOC_ALL as USAGE_DOC_ALL_ZH, USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_ZH } from '@core/data/defaultDocs/usageDocs/zh'
import { USAGE_DOC_ALL as USAGE_DOC_ALL_EN, USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_EN } from '@core/data/defaultDocs/usageDocs/en'
import {
  USAGE_DOC_LEGACY_NAMES_ZH,
  USAGE_DOC_LEGACY_NAMES_EN,
} from '@core/data/defaultDocs/usageDocs/legacyNames'

/**
 * 内置「使用文档」文件夹名（多语言）。
 * 与 `createInitialFileTree` / `kbSeed.materialize` 使用的是同一批常量，故不会漂移。
 */
export const USAGE_DOC_FOLDER_NAMES: readonly string[] = [
  USAGE_DOC_FOLDER_ZH,
  USAGE_DOC_FOLDER_EN,
]

/**
 * 内置说明书的**文件名清单**（多语言；含历史旧名）。
 * 由数据层派生，故新增/改名篇章时自动跟随，不需要在这里维护第二份列表。
 */
export const BUILTIN_USAGE_DOC_FILE_NAMES: ReadonlySet<string> = new Set([
  ...USAGE_DOC_ALL_ZH.map((p) => p.fileName),
  ...USAGE_DOC_ALL_EN.map((p) => p.fileName),
  ...Object.values(USAGE_DOC_LEGACY_NAMES_ZH).flat(),
  ...Object.values(USAGE_DOC_LEGACY_NAMES_EN).flat(),
])

export interface UsageDocsScope {
  /** 内置使用文档文件夹节点 id；树里不存在该文件夹时为 null */
  folderId: string | null
  /**
   * **内置说明书文件本身**的 id 集合（只读简介页的适用范围）。
   * ⚠️ 只包含「在该文件夹内、且文件名命中内置篇章清单」的文件；
   *    用户放进去的自己的笔记**不在其中** → 仍是完整可编辑的编辑器。
   */
  builtinFileIds: Set<string>
  /**
   * 应从**编辑器文件列表**排除的节点 id 集合 =
   * 内置说明书文件 + （该文件夹内没有任何用户内容时）文件夹自身。
   * 注意这是「视图过滤」用途，**不动数据**：文件仍在树里、仍属知识库。
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
 * @returns `folderId` + `builtinFileIds` + `hiddenIds`；
 *          未播种（或用户已删除/改名该文件夹）时 folderId=null、两个集合皆空
 */
export function resolveUsageDocsScope(root: FileNode | null | undefined): UsageDocsScope {
  const empty: UsageDocsScope = { folderId: null, builtinFileIds: new Set(), hiddenIds: new Set() }
  const folder = findFolderByName(root, USAGE_DOC_FOLDER_NAMES)
  if (!folder) return empty

  const builtinFileIds = new Set<string>()
  /** 文件夹内是否还有**非说明书**的东西（用户的文件或子目录） */
  let hasUserContent = false

  const walk = (node: FileNode, depth: number) => {
    if (node.type === 'file') {
      // ⚠️ 只认**说明书文件夹直属**的同名文件（2026-11-03 审查 P2）：此前不限层级，
      //    用户在任意子目录自建的《快速入门.md》等同名文件会被判为内置 → 隐藏 + 只读。
      //    播种只会平铺文件、不建子目录，故 depth > 1 一定是用户自己的结构。
      if (depth === 1 && BUILTIN_USAGE_DOC_FILE_NAMES.has(node.name)) builtinFileIds.add(node.id)
      else hasUserContent = true
      return
    }
    // 子文件夹一律视为用户自己的结构（播种只会平铺文件，不会建子目录）
    if (node.id !== folder.id) hasUserContent = true
    for (const child of node.children ?? []) walk(child, depth + 1)
  }
  walk(folder, 0)

  const hiddenIds = new Set(builtinFileIds)
  // 文件夹行只在「里面全是内置说明」时一起隐藏 —— 否则会连用户的文件一起藏掉（上一版的漏洞）。
  // 反过来说：文件夹里有用户内容时保留该行，用户在列表里看得见、点得开自己的文件。
  if (!hasUserContent) hiddenIds.add(folder.id)

  return { folderId: folder.id, builtinFileIds, hiddenIds }
}
