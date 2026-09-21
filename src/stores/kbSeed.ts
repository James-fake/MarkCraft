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
import { collectAllFiles } from '@core/files/fileTree'
import { getKbList, createKbInFolder } from './kbStore'
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
  /** 当前文件树根（来自 useFileManager） */
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

function config(lang: 'zh' | 'en') {
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
 * @returns 知识库 id；若已播种过但用户已删除该库 → null（不复活）
 */
export async function ensureUsageDocsKb(deps: UsageDocsSeedDeps): Promise<string | null> {
  if (inFlight) return inFlight
  inFlight = run(deps).finally(() => { inFlight = null })
  return inFlight
}

async function run(deps: UsageDocsSeedDeps): Promise<string | null> {
  const cfg = config(deps.lang)

  // ① 已有同名知识库 → 直接复用（幂等）
  const list = await getKbList()
  const existing = list.find((k) => k.name === cfg.folder)
  if (existing) return existing.id

  // ② 已播种过但库不在了 → 用户删的，不复活
  let seeded = false
  try {
    seeded = localStorage.getItem(USAGE_DOCS_SEED_KEY) === '1'
  } catch {
    /* 隐私模式等：按未播种处理 */
  }
  if (seeded) return null

  // ③ 定位/创建「使用文档」文件夹
  let folder = findFolderByName(deps.rootFolder, cfg.folder)
  const folderId = folder ? folder.id : deps.createFolder('root', cfg.folder)

  // ④ 逐个 slug 对账：已存在则跳过；有同名旧文档则迁移；否则新建
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

  // ⑤ 无对应新篇章的旧文档（《用户手册》全文）一并迁入，保留不删
  for (const name of legacy['user-manual'] ?? []) {
    const hit = allFiles.find((f) => f.name === name)
    if (hit) deps.moveNode(hit.id, folderId)
  }

  // ⑥ 建库 + 落标记
  const kb = await createKbInFolder(cfg.folder, cfg.description, folderId)
  try {
    localStorage.setItem(USAGE_DOCS_SEED_KEY, '1')
  } catch {
    /* 写不进去也不影响本次结果 */
  }
  return kb.id
}
