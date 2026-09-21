/**
 * 内置「MarkCraft 使用文档」知识库播种（一次性）
 *
 * 目标（用户需求 2026-09-21）：首次进入 MarkCraft，知识库界面默认已存在一个
 * 「MarkCraft 使用文档」知识库，库内笔记 = MarkCraft 各功能的使用说明。
 *
 * 三条硬约束（都不是可选项）：
 * 1. **幂等**：重复调用不重复建库、不重复建文件；
 * 2. **不复活**：用户删掉该知识库后，下次进入不得重建（种子复活是反模式）；
 * 3. **零丢失**：老用户「我的笔记」下的旧文档只做迁移，不改名、不删除。
 *
 * 数据来源：`core/data/defaultDocs/usageDocs/*`（由《用户手册》机械拆分生成）。
 */
import type { FileNode } from '../types/fileManager'
import { findNode } from '../services/fileService'
import { collectAllFiles } from '@core/files/fileTree'
import { getKbList, createKbInFolder, rebindKbFolder } from './kbStore'
import {
  USAGE_DOC_ALL as USAGE_DOC_ALL_ZH,
  USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_ZH,
  USAGE_DOC_DESCRIPTION as USAGE_DOC_DESCRIPTION_ZH,
} from '@core/data/defaultDocs/usageDocs/zh'
import {
  USAGE_DOC_ALL as USAGE_DOC_ALL_EN,
  USAGE_DOC_FOLDER as USAGE_DOC_FOLDER_EN,
  USAGE_DOC_DESCRIPTION as USAGE_DOC_DESCRIPTION_EN,
} from '@core/data/defaultDocs/usageDocs/en'

/** 一次性标记：已播种过即不再补（用户删除后不复活） */
export const USAGE_DOCS_SEED_KEY = 'markcraft-usage-docs-seeded'

export interface UsageDocsSeedDeps {
  /**
   * 当前文件树根（来自 useFileManager）
   *
   * ⚠️ 调用方必须保证这是**已水合的权威树**（`useFileManager().hydrated === true`）。
   * FileStore 的 state 是两阶段的：同步阶段在 localStorage 无树时只能造一棵临时默认树，
   * 异步阶段再用 IndexedDB 的权威树整体覆盖。在临时树上播种 → 建出的文件夹/笔记
   * 会随临时树一起被丢弃，只剩悬空的 folderId（这正是「知识库进入没有内容」的成因）。
   */
  rootFolder: FileNode
  lang: 'zh' | 'en'
  createFolder: (parentId: string, name: string) => string
  /** 注意：最后一个参数必须显式传 false，否则播种会把 16 篇文档全开成标签页 */
  createFile: (parentId: string, name: string, content?: string, openAfterCreate?: boolean) => string
  moveNode: (nodeId: string, targetParentId: string, targetIndex?: number) => boolean
}

/** 旧种子文档名：用于迁移匹配（不同语言的历史命名不同，故逐一列出） */
const LEGACY_NAMES: Record<'zh' | 'en', Record<string, string[]>> = {
  zh: {
    'md-tutorial': ['Markdown 入门教程.md'],
    'link-guide': ['知识链接体系指南.md'],
    'user-manual': ['用户手册.md'],
  },
  en: {
    'md-tutorial': ['Markdown Beginner Tutorial.md', 'Markdown Tutorial.md'],
    'link-guide': ['Knowledge Linking Guide.md'],
    'user-manual': ['User Manual.md'],
  },
}

/** 单个篇章（与 `core/data/defaultDocs/usageDocs/*` 的 UsageDocPage 结构一致） */
interface SeedPage {
  slug: string
  fileName: string
  content: string
}

interface SeedConfig {
  folder: string
  description: string
  pages: SeedPage[]
}

function config(lang: 'zh' | 'en'): SeedConfig {
  return lang === 'en'
    ? { folder: USAGE_DOC_FOLDER_EN, description: USAGE_DOC_DESCRIPTION_EN, pages: USAGE_DOC_ALL_EN }
    : { folder: USAGE_DOC_FOLDER_ZH, description: USAGE_DOC_DESCRIPTION_ZH, pages: USAGE_DOC_ALL_ZH }
}

/** 在树里按名字找文件夹（任意层级） */
function findFolderByName(root: FileNode, name: string): FileNode | null {
  if (root.type === 'folder' && root.name === name) return root
  for (const child of root.children ?? []) {
    if (child.type !== 'folder') continue
    const hit = findFolderByName(child, name)
    if (hit) return hit
  }
  return null
}

/** 并发/StrictMode 双调用去重（同一会话内只允许一次播种在飞） */
let inFlight: Promise<string | null> | null = null

/**
 * 确保内置「使用文档」知识库存在，返回其 id。
 *
 * ⚠️ 必须在 `useFileManager().hydrated === true` 之后调用（见 `UsageDocsSeedDeps.rootFolder`）。
 *
 * @returns 知识库 id；若已播种过但用户已删除该库 → null（不复活）
 */
export async function ensureUsageDocsKb(deps: UsageDocsSeedDeps): Promise<string | null> {
  if (inFlight) {
    console.info('[kbSeed] 播种已在飞行中，复用同一次调用')
    return inFlight
  }
  inFlight = run(deps).finally(() => { inFlight = null })
  return inFlight
}

async function run(deps: UsageDocsSeedDeps): Promise<string | null> {
  const cfg = config(deps.lang)

  // ① 已有同名知识库
  const list = await getKbList()
  const existing = list.find((k) => k.name === cfg.folder)
  if (existing) {
    // 1a. 健康：folderId 能在树上解析到 → 直接复用（幂等路径）
    if (findNode(deps.rootFolder, existing.folderId)) {
      console.info('[kbSeed] 已存在健康的内置知识库，直接复用：', existing.id)
      return existing.id
    }

    // 1b. 悬空：知识库文档还在，但它指向的文件夹已不在树上。
    //     成因：早期版本在 FileStore 的同步兜底树上播种（该树随后被 IndexedDB 权威树
    //     整体覆盖），文件夹随之消失，而 KB 已把幽灵 folderId 写进了持久化列表 ——
    //     症状正是「知识库能进，但库里 0 篇」。
    //     此处选择**自愈**而非重建知识库：重新建出文件夹、补齐笔记、把 folderId 挂回去。
    //     kb.id 与 rules / tasks / 导出记录等用户积累全部保留。
    console.info('[kbSeed] 检测到悬空 folderId，开始自愈：', { kbId: existing.id, staleFolderId: existing.folderId })
    const rebindFolderId = materialize(deps, cfg)
    await rebindKbFolder(existing.id, rebindFolderId)
    console.info('[kbSeed] 自愈完成：', { kbId: existing.id, folderId: rebindFolderId })
    return existing.id
  }

  // ② 已播种过但库不在了 → 用户删的，不复活（与 1b 的「坏了」是两回事）
  let seeded = false
  try {
    seeded = localStorage.getItem(USAGE_DOCS_SEED_KEY) === '1'
  } catch {
    /* 隐私模式等：按未播种处理 */
  }
  if (seeded) {
    console.info('[kbSeed] 已播种过且用户已删除该库 → 不复活，跳过')
    return null
  }

  // ③ 建文件夹 + 补齐笔记，再把知识库挂上去
  console.info('[kbSeed] 首次播种内置使用文档：', { folder: cfg.folder, pages: cfg.pages.length })
  const folderId = materialize(deps, cfg)
  const kb = await createKbInFolder(cfg.folder, cfg.description, folderId)
  console.info('[kbSeed] 播种完成：', { kbId: kb.id, folderId })

  // ④ 落标记
  try {
    localStorage.setItem(USAGE_DOCS_SEED_KEY, '1')
  } catch {
    /* 写不进去也不影响本次结果 */
  }
  return kb.id
}

/**
 * 在权威树上确保「使用文档」文件夹存在且内容齐全，返回其 folderId。
 *
 * 幂等：文件夹已在则复用；某篇已在（按文件名）则跳过；旧文档**迁移**而非重建
 * （保原名以护住 `[[双链]]`，保原 id 以护住已打开的标签页）。
 *
 * ⚠️ 文件夹与笔记必须建在**同一棵**树上：`createFolder` / `createFile` / `moveNode`
 * 都作用于调用方的 state，靠 updater 依次累积。故本函数全程同步连续调用，**不得插入
 * await** —— 插入会让后续写入落到尚未包含新文件夹的旧树上，静默丢失。
 */
function materialize(deps: UsageDocsSeedDeps, cfg: SeedConfig): string {
  const folder = findFolderByName(deps.rootFolder, cfg.folder)
  const folderId = folder ? folder.id : deps.createFolder('root', cfg.folder)

  const allFiles = collectAllFiles(deps.rootFolder)
  const folderFileNames = new Set(
    folder ? collectAllFiles(folder).map((f) => f.name) : [],
  )
  const legacy = LEGACY_NAMES[deps.lang]

  const ensurePage = (slug: string, fileName: string, content: string) => {
    if (folderFileNames.has(fileName)) return
    const legacyHit = (legacy[slug] ?? [])
      .map((n) => allFiles.find((f) => f.name === n))
      .find((f): f is FileNode => Boolean(f))
    if (legacyHit) {
      // 旧文档直接搬进新文件夹（改名会切断 [[双链]]，故保持原名）
      deps.moveNode(legacyHit.id, folderId)
      folderFileNames.add(legacyHit.name)
      return
    }
    deps.createFile(folderId, fileName, content, false)
    folderFileNames.add(fileName)
  }

  for (const page of cfg.pages) ensurePage(page.slug, page.fileName, page.content)

  // 无对应新篇章的旧文档（《用户手册》全文）一并迁入，保留不删
  for (const name of legacy['user-manual'] ?? []) {
    const hit = allFiles.find((f) => f.name === name)
    if (hit) deps.moveNode(hit.id, folderId)
  }

  return folderId
}
