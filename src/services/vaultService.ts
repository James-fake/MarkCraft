/**
 * VaultService —— 桌面端「真实磁盘存储」后端（P4）。
 *
 * 设计铁律（保证 54 个既有单测 / E2E 全绿）：
 *  - 本模块**只在 `platform.kind === 'electron'` 且已选 Vault 时被调用**；
 *    浏览器 / jsdom 走 `fileService` 的 IndexedDB 路径，行为逐字不变。
 *  - 内存树仍是「单一真相」：`loadVault` 把磁盘 `.md` 读进树节点（content 内联），
 *    `syncTree` 把变更写回磁盘。图谱 / 反链 / 搜索等消费者只读 `node.content`，
 *    故它们**零改动**即可透明工作。
 *  - 原子写 / 父目录自动建沿用 P3 的 `platform.fs.writeFile`。
 *
 * 增量同步（`syncTree`）：维护 `synced: Map<id, {path,content}>`，每次落盘只处理
 *  新增 / content 变更 / 路径变更（rename）的节点，并删除树中已消失的节点——避免每次
 *  编辑都把整个 Vault 重写一遍。大型 Vault 的性能优化（首启建索引 + 增量）留 P4-C。
 */
import type { FileNode } from '../types/fileManager'
import { platform } from '../platform'
import { generateId } from './fileService'
import { resolveUsageDocsScope } from '@core/files/usageDocs'

const LAST_VAULT_KEY = 'markcraft.lastVault'

/** 最近打开的 Vault 根路径（仅桌面端持久化到 localStorage） */
export function readLastVault(): string | null {
  if (platform.kind !== 'electron') return null
  try {
    return localStorage.getItem(LAST_VAULT_KEY) || null
  } catch {
    return null
  }
}

export function persistVaultRoot(root: string | null): void {
  if (platform.kind !== 'electron') return
  try {
    if (root) localStorage.setItem(LAST_VAULT_KEY, root)
    else localStorage.removeItem(LAST_VAULT_KEY)
  } catch {
    /* localStorage 不可用时静默忽略 */
  }
}

/**
 * 安装向导指定的存储位置「已采用过」的标记。
 *
 * 用途：让**安装时选的目录优先于历史 `lastVault`**（否则重装换了目录会被旧记录压住，
 * 新文件落到旧目录、用户在新目录里永远看不到），但**只生效一次** —— 采用后打上标记，
 * 之后用户在应用内改的目录仍然优先。
 */
const SETUP_VAULT_APPLIED_KEY = 'markcraft.setupVaultApplied'

export function readSetupVaultApplied(): string | null {
  if (platform.kind !== 'electron') return null
  try {
    return localStorage.getItem(SETUP_VAULT_APPLIED_KEY) || null
  } catch {
    return null
  }
}

export function markSetupVaultApplied(root: string): void {
  if (platform.kind !== 'electron') return
  try {
    localStorage.setItem(SETUP_VAULT_APPLIED_KEY, root)
  } catch {
    /* localStorage 不可用时静默忽略 */
  }
}

// —— 路径工具：统一处理 Windows(\) 与 POSIX(/) 分隔符 ——
function basename(p: string): string {
  return p.split(/[\\/]/).pop() || p
}
function dirname(p: string): string {
  const i = p.lastIndexOf('/')
  const j = p.lastIndexOf('\\')
  const k = Math.max(i, j)
  return k < 0 ? p : p.slice(0, k)
}
function sepOf(p: string): string {
  return /\\/.test(p) ? '\\' : '/'
}

/** 节点在磁盘上的文件名（file 补 .md，与 createFile 行为一致） */
function diskName(node: FileNode): string {
  return node.type === 'file' && !node.name.endsWith('.md') ? `${node.name}.md` : node.name
}

interface SyncedEntry {
  path: string
  content: string
  isDir: boolean
}

/** id → 上次已落盘状态；syncTree 据此做增量 */
let synced = new Map<string, SyncedEntry>()
let syncTimer: ReturnType<typeof setTimeout> | null = null

/** 把已加载的树登记为「已同步基线」，避免首次 save 把整 Vault 重写 */
export function resetSync(rootFolder: FileNode, vaultRoot: string): void {
  synced = new Map()
  const sep = sepOf(vaultRoot)
  for (const child of rootFolder.children || []) walk(child, vaultRoot + sep, synced, sep)
}

function walk(
  node: FileNode,
  parentPath: string,
  out: Map<string, SyncedEntry>,
  sep: string,
  skipIds: Set<string> = new Set(),
): void {
  // 内置「使用文档」不落盘（与 flattenNotes 的 skipIds 同一意图）：
  // 它们是应用自带内容，不该混进用户的 Vault 文件夹。
  if (skipIds.has(node.id)) return
  const path = parentPath + diskName(node)
  if (node.type === 'folder') {
    out.set(node.id, { path, content: '', isDir: true })
    for (const c of node.children || []) walk(c, path + sep, out, sep, skipIds)
  } else {
    out.set(node.id, { path, content: node.content || '', isDir: false })
  }
}

/**
 * 收集树中所有笔记的**相对路径 + 内容**（P4-D 旧数据迁移用）。
 * - 跳过 `skipIds`（内置「使用文档」，它们不该落成真实文件）；
 * - 文件名补 `.md`（与 createFile / diskName 一致）；
 * - 路径统一用 `/` 分隔，由调用方按平台拼根（不在纯函数里掺平台判断）。
 */
export function flattenNotes(
  rootFolder: FileNode,
  skipIds: Set<string> = new Set(),
): Array<{ relPath: string; content: string }> {
  const out: Array<{ relPath: string; content: string }> = []
  const walk = (node: FileNode, prefix: string): void => {
    for (const c of node.children || []) {
      if (skipIds.has(c.id)) continue
      const name = diskName(c)
      const rel = prefix ? `${prefix}/${name}` : name
      if (c.type === 'folder') walk(c, rel)
      else out.push({ relPath: rel, content: c.content || '' })
    }
  }
  walk(rootFolder, '')
  return out
}

/**
 * 求某个节点在 Vault 内的**相对路径**（`/` 分隔，文件名按 diskName 补 `.md`）。
 * 找不到返回 null。与 `flattenNotes` 同一套 walk，保证路径与落盘一致。
 */
export function findNodeRelPath(rootFolder: FileNode, id: string): string | null {
  const walk = (node: FileNode, prefix: string): string | null => {
    for (const c of node.children || []) {
      const rel = prefix ? `${prefix}/${diskName(c)}` : diskName(c)
      if (c.id === id) return rel
      if (c.type === 'folder') {
        const hit = walk(c, rel)
        if (hit) return hit
      }
    }
    return null
  }
  return walk(rootFolder, '')
}

/** 把 Vault 内相对路径拼成绝对路径（分隔符跟随根路径风格） */
export function toVaultAbsPath(root: string, relPath: string): string {
  const sep = root.includes('\\') ? '\\' : '/'
  return `${root}${sep}${relPath.split('/').join(sep)}`
}

/**
 * 从磁盘读取一个 Vault 目录，构建 FileNode 树（content 内联）。
 * 仅纳入 `.md`/`.markdown` 文件与文件夹；跳过所有点开头项（含 `.markcraft` 配置目录）。
 */
export async function loadVault(root: string): Promise<FileNode> {
  const entries = await platform.fs.readDirectory(root, { recursive: true, includeHidden: true })

  // 按「所在目录」分组，便于自底向上重建层级
  const byDir = new Map<string, DirEntryLike[]>()
  for (const e of entries) {
    const d = dirname(e.path)
    if (!byDir.has(d)) byDir.set(d, [])
    byDir.get(d)!.push(e)
  }

  const build = async (dirPath: string): Promise<FileNode[]> => {
    const list = (byDir.get(dirPath) || []).filter((e) => !e.name.startsWith('.'))
    list.sort((a, b) => a.name.localeCompare(b.name))
    const nodes = await Promise.all(
      list.map(async (e, idx): Promise<FileNode | null> => {
        if (e.isDirectory) {
          return {
            id: generateId(),
            name: e.name,
            type: 'folder',
            children: await build(e.path),
            createdAt: e.mtimeMs,
            updatedAt: e.mtimeMs,
            isExpanded: true,
            order: idx,
          }
        }
        if (!e.name.endsWith('.md') && !e.name.endsWith('.markdown')) {
          // 非 markdown 文件不进树（真实存在于磁盘，但 Vault 视图只管笔记）
          return null
        }
        return {
          id: generateId(),
          name: e.name,
          type: 'file',
          content: await platform.fs.readFile(e.path),
          createdAt: e.mtimeMs,
          updatedAt: e.mtimeMs,
          order: idx,
        }
      }),
    )
    return nodes.filter(Boolean) as FileNode[]
  }

  const rootNode: FileNode = {
    id: generateId(),
    name: basename(root) || 'Vault',
    type: 'folder',
    children: await build(root),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: true,
  }
  resetSync(rootNode, root)
  return rootNode
}

/**
 * 防抖地把内存树增量写回磁盘（300ms，与历史 saveState 防抖同档）。
 *
 * ⚠️ 互斥（2026-11-03 审查 P1）：防抖只合并「300ms 内的多次调用」，一次 doSync 在
 * 大 Vault 上完全可能超过 300ms —— 期间新的编辑会再起一个 timer，第二个 doSync 与
 * 第一个**并发**跑，两者共享可变模块级 `synced` Map，交错读写会导致重复写入、
 * rename 失败回退 writeFile 等不可预测行为。这里串行化：正在跑时只记下最新一次请求，
 * 本轮结束后补跑（覆盖式，中间态无需逐次落盘）。
 */
let syncRunning = false
let syncPending: { root: FileNode; vaultRoot: string; onError?: (err: unknown) => void } | null = null
/** 最近一次被防抖合并的请求（flushSync 用它立刻补跑，不必等满 300ms） */
let syncRequest: { root: FileNode; vaultRoot: string; onError?: (err: unknown) => void } | null = null
/** 串行链彻底空闲时要唤醒的等待者（flushSync 用，避免轮询） */
let syncIdleWaiters: Array<() => void> = []

function notifySyncIdle(): void {
  if (syncRunning || syncPending) return
  const waiters = syncIdleWaiters
  syncIdleWaiters = []
  for (const wake of waiters) wake()
}

function waitSyncIdle(): Promise<void> {
  if (!syncRunning && !syncPending) return Promise.resolve()
  return new Promise((resolve) => syncIdleWaiters.push(resolve))
}

export function syncTree(
  rootFolder: FileNode,
  vaultRoot: string,
  onError?: (err: unknown) => void,
): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncRequest = { root: rootFolder, vaultRoot, onError }
  syncTimer = setTimeout(() => {
    syncRequest = null
    void runSyncSerialized(rootFolder, vaultRoot, onError)
  }, 300)
}

/**
 * 立刻把挂起的写盘冲刷干净（退出应用 / 恢复备份后需要「落盘完成」的确定信号时用）。
 *
 * 为什么需要：`syncTree` 是 300ms 防抖 + 串行补跑，调用方拿不到任何完成信号 ——
 * 「恢复备份 → 用户马上关应用」会丢掉最后一批写入（2026-11-08 审查 M-C-2）。
 * 这里取消防抖 timer、立刻跑掉被合并的请求，并等到串行链彻底空闲。
 */
export async function flushSync(): Promise<void> {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  const req = syncRequest
  syncRequest = null
  if (req) await runSyncSerialized(req.root, req.vaultRoot, req.onError)
  // 已在跑时 runSyncSerialized 只是把请求排进 syncPending 并立即返回，
  // 必须继续等串行链（含补跑）跑完。
  await waitSyncIdle()
}

async function runSyncSerialized(
  rootFolder: FileNode,
  vaultRoot: string,
  onError?: (err: unknown) => void,
): Promise<void> {
  if (syncRunning) {
    syncPending = { root: rootFolder, vaultRoot, onError }
    return
  }
  syncRunning = true
  try {
    // ⚠️ 不再静默吞错：写盘失败（最常见 = 目录只读 EPERM）必须能冒到 UI，
    //    否则界面一切正常、文件却一个不落 —— 用户完全无从察觉（真实事故）。
    await doSync(rootFolder, vaultRoot, onError)
  } catch (err) {
    onError?.(err)
  } finally {
    syncRunning = false
    const next = syncPending
    syncPending = null
    if (next) void runSyncSerialized(next.root, next.vaultRoot, next.onError)
    else notifySyncIdle()
  }
}

/**
 * 预检目录**可写性**（写一个探针文件再删掉）。
 *
 * 为什么要预检：Windows 上目录可能对当前用户只给 RX（只读），此时所有写盘都会 EPERM。
 * 若不预检就采用为 Vault，用户会进入「界面正常、文件全丢」的静默失败状态。
 */
export async function checkVaultWritable(dir: string): Promise<boolean> {
  const sep = sepOf(dir)
  const probe = `${dir}${sep}.markcraft-write-probe`
  try {
    await platform.fs.mkdir(dir).catch(() => {})
    await platform.fs.writeFile(probe, '')
    await platform.fs.remove(probe).catch(() => {})
    return true
  } catch {
    return false
  }
}

async function doSync(
  rootFolder: FileNode,
  vaultRoot: string,
  onError?: (err: unknown) => void,
): Promise<void> {
  const sep = sepOf(vaultRoot)
  const desired = new Map<string, SyncedEntry>()
  await platform.fs.mkdir(vaultRoot).catch(() => {})
  // 内置「使用文档」不落盘（与 flattenNotes 的 skipIds 同一意图）
  const skipIds = resolveUsageDocsScope(rootFolder).hiddenIds
  for (const child of rootFolder.children || [])
    walk(child, vaultRoot + sep, desired, sep, skipIds)

  const fs = platform.fs
  /** 记录首个**写入类**失败（删除类失败多为「文件已不在」的良性 ENOENT，不报） */
  let firstError: unknown = null
  const write = async (fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn()
    } catch (err) {
      if (!firstError) firstError = err
    }
  }

  // 1) 删除：树中已消失的节点 → 删文件（文件夹留盘，避免误删用户手动放的目录）
  for (const [id, prev] of synced) {
    if (!desired.has(id)) {
      if (!prev.isDir) await fs.remove(prev.path).catch(() => {})
      synced.delete(id)
    }
  }

  // 2) 新增 / 更新
  for (const [id, cur] of desired) {
    const prev = synced.get(id)
    if (cur.isDir) {
      if (!prev) {
        await write(() => fs.mkdir(cur.path))
        synced.set(id, cur)
      } else if (prev.path !== cur.path) {
        // 目录改名 / 移动：连同子树 rename（walk 保证父先于子入 Map，故父目录先搬，
        // 子节点随后各自标记为已同步；其 rename 会因旧路径已不在而静默跳过）。
        await write(() => fs.mkdir(dirname(cur.path)))
        try {
          await fs.rename(prev.path, cur.path)
        } catch {
          // 旧目录不在盘上（如外部已删/移走）→ 退化为新建，避免改名后目录整体消失
          await write(() => fs.mkdir(cur.path))
        }
        synced.set(id, cur)
      }
      continue
    }
    if (!prev) {
      await write(() => fs.writeFile(cur.path, cur.content))
      synced.set(id, cur)
    } else if (prev.path !== cur.path) {
      await write(() => fs.mkdir(dirname(cur.path)))
      try {
        await fs.rename(prev.path, cur.path)
      } catch {
        // 旧文件不在盘上（外部已删/移动）→ 直接在新路径写出内容，避免改名丢文件。
        // ⚠️ S0 红线深度防御（2026-11-03 审查 P0-2）：目标**已存在**时绝不覆盖 ——
        //    writeFile 回退原本无差别覆盖，同名碰撞（store 层守卫被绕过的场景）会
        //    静默摧毁磁盘数据。此时跳过写入并上报，让树与磁盘的分歧走用户可见的错误。
        const targetExists = await platform.fs.exists(cur.path).catch(() => false)
        if (targetExists) {
          const err = new Error(`改名目标已存在，拒绝覆盖：${cur.path}`)
          firstError = firstError ?? err
          synced.set(id, cur)
        } else {
          await write(() => fs.writeFile(cur.path, cur.content))
          synced.set(id, cur)
        }
      }
      synced.set(id, cur)
    } else if (prev.content !== cur.content) {
      await write(() => fs.writeFile(cur.path, cur.content))
      synced.set(id, cur)
    }
  }

  if (firstError) onError?.(firstError)
}

/** readDirectory 返回项的精简形态（避免直接依赖 electron.d.ts 的具体类型） */
interface DirEntryLike {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  mtimeMs: number
}
