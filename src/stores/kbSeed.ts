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
import { logger } from '../utils/logger'
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
import {
  USAGE_DOC_LEGACY_NAMES_ZH,
  USAGE_DOC_LEGACY_NAMES_EN,
} from '@core/data/defaultDocs/usageDocs/legacyNames'

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
  /** 覆盖某篇内置文档的正文（智能刷新用；仅在判定「用户未改动该篇」时才调用） */
  updateFileContent: (fileId: string, content: string) => void
}

/**
 * 旧种子文档名：用于迁移匹配（不同语言的历史命名不同）。
 *
 * ⚠️ 单一来源 = `core/data/defaultDocs/usageDocs/legacyNames.ts`
 *    —— `core/files/usageDocs.ts` 判定「哪些文件是内置说明书本身」时读同一份。
 *    两处若各写一份，迁移进来、但不在新篇章名清单里的历史文档（《用户手册》全文）
 *    就会漏判成「用户笔记」→ 在编辑器里变成可编辑，与「内置说明只读」相悖。
 */
const LEGACY_NAMES: Record<'zh' | 'en', Record<string, string[]>> = {
  zh: USAGE_DOC_LEGACY_NAMES_ZH,
  en: USAGE_DOC_LEGACY_NAMES_EN,
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

// ─────────────────────────────────────────────────────────────────────────
// 智能刷新（内置文档升级时只更新「用户没改过」的篇章）
// ─────────────────────────────────────────────────────────────────────────

/** 记录「上次写入文件的内置内容哈希」——刷新时据此判断用户是否改过 */
const DOCS_WRITTEN_KEY = 'markcraft-usage-docs-written-v1'
/** 内置文档整体内容签名：变化时才触发刷新 */
const DOCS_SIG_KEY = 'markcraft-usage-docs-sig-v1'

/** 轻量字符串哈希（djb2），仅用于变更检测，非安全用途 */
function hashStr(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function computeSig(cfg: SeedConfig): string {
  return hashStr(cfg.folder + '|' + cfg.pages.map((p) => p.fileName + ':' + hashStr(p.content)).join('|'))
}

function readWritten(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DOCS_WRITTEN_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeWritten(map: Record<string, string>): void {
  try {
    localStorage.setItem(DOCS_WRITTEN_KEY, JSON.stringify(map))
  } catch {
    /* 写不进去不影响主流程 */
  }
}

function readSig(): string {
  try {
    return localStorage.getItem(DOCS_SIG_KEY) || ''
  } catch {
    return ''
  }
}

function writeSig(sig: string): void {
  try {
    localStorage.setItem(DOCS_SIG_KEY, sig)
  } catch {
    /* ignore */
  }
}

/** 首次播种 / 首次记录：写入当前内置内容哈希与整体签名 */
function recordBaseline(cfg: SeedConfig): void {
  const written = readWritten()
  for (const page of cfg.pages) written[page.fileName] = hashStr(page.content)
  writeWritten(written)
  writeSig(computeSig(cfg))
}

/**
 * 智能刷新：内置文档内容升级时，只更新「用户没改过」的篇章。
 *   判据：文件当前内容哈希 == 上次写入的内置内容哈希 → 未改 → 安全覆盖；
 *        不等 → 用户改过 → 跳过（永不覆盖）。
 *   旧版安装（无 written 记录）：一次性视为未改并覆盖；此后 written 生效，用户改动即受保护。
 * 只在内容签名变化时执行（readSig !== 当前 sig），日常启动零开销。
 */
function refreshDocs(deps: UsageDocsSeedDeps, cfg: SeedConfig, folder: FileNode): void {
  const sig = computeSig(cfg)
  if (readSig() === sig) return // 内置内容未变 → 无需刷新

  const written = readWritten()
  const filesByName = new Map<string, FileNode>()
  for (const child of folder.children ?? []) {
    if (child.type === 'file') filesByName.set(child.name, child)
  }

  let updated = 0
  for (const page of cfg.pages) {
    const newHash = hashStr(page.content)
    const node = filesByName.get(page.fileName)
    if (!node) continue // 缺失交由 materialize 补建
    const fileHash = hashStr(node.content ?? '')
    if (fileHash === newHash) {
      if (written[page.fileName] !== newHash) written[page.fileName] = newHash
      continue
    }
    const lastWritten = written[page.fileName]
    if (lastWritten === undefined || lastWritten === fileHash) {
      // 旧版安装（无记录）或「上次写入后未改动」→ 安全覆盖
      deps.updateFileContent(node.id, page.content)
      written[page.fileName] = newHash
      updated++
    }
    // 否则：用户改过 → 跳过（保留用户内容）
  }

  writeWritten(written)
  writeSig(sig)
  if (updated > 0) logger.info('[kbSeed] 内置使用文档智能刷新：更新', updated, '篇')
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
    logger.info('[kbSeed] 播种已在飞行中，复用同一次调用')
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
    // 1a. 健康：folderId 能在树上解析到 → 复用（幂等路径），并尝试智能刷新内置文档内容
    const folderNode = findFolderByName(deps.rootFolder, cfg.folder)
    if (folderNode && findNode(deps.rootFolder, existing.folderId)) {
      refreshDocs(deps, cfg, folderNode)
      logger.info('[kbSeed] 已存在健康的内置知识库，直接复用：', existing.id)
      return existing.id
    }

    // 1b. 悬空：知识库文档还在，但它指向的文件夹已不在树上。
    //     成因：早期版本在 FileStore 的同步兜底树上播种（该树随后被 IndexedDB 权威树
    //     整体覆盖），文件夹随之消失，而 KB 已把幽灵 folderId 写进了持久化列表 ——
    //     症状正是「知识库能进，但库里 0 篇」。
    //     此处选择**自愈**而非重建知识库：重新建出文件夹、补齐笔记、把 folderId 挂回去。
    //     kb.id 与 rules / tasks / 导出记录等用户积累全部保留。
    logger.info('[kbSeed] 检测到悬空 folderId，开始自愈：', { kbId: existing.id, staleFolderId: existing.folderId })
    const rebindFolderId = materialize(deps, cfg)
    await rebindKbFolder(existing.id, rebindFolderId)
    logger.info('[kbSeed] 自愈完成：', { kbId: existing.id, folderId: rebindFolderId })
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
    logger.info('[kbSeed] 已播种过且用户已删除该库 → 不复活，跳过')
    return null
  }

  // ③ 建文件夹 + 补齐笔记，再把知识库挂上去
  logger.info('[kbSeed] 首次播种内置使用文档：', { folder: cfg.folder, pages: cfg.pages.length })
  const folderId = materialize(deps, cfg)
  const kb = await createKbInFolder(cfg.folder, cfg.description, folderId)
  recordBaseline(cfg)
  logger.info('[kbSeed] 播种完成：', { kbId: kb.id, folderId })

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
  // ⚠️ 父节点必须用**真实的根 id**，不能写字面量 'root'：
  //    Vault 模式下 loadVault 给根节点生成的是随机 id，写死 'root' 会找不到父节点，
  //    addChildNode 静默 no-op，却照样返回一个**幽灵 folderId** →
  //    知识库指向不存在的文件夹 → 「使用文档」全空白（真实事故）。
  const folderId = folder ? folder.id : deps.createFolder(deps.rootFolder.id, cfg.folder)

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
