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
): void {
  const path = parentPath + diskName(node)
  if (node.type === 'folder') {
    out.set(node.id, { path, content: '', isDir: true })
    for (const c of node.children || []) walk(c, path + sep, out, sep)
  } else {
    out.set(node.id, { path, content: node.content || '', isDir: false })
  }
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

/** 防抖地把内存树增量写回磁盘（300ms，与历史 saveState 防抖同档） */
export function syncTree(rootFolder: FileNode, vaultRoot: string): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void doSync(rootFolder, vaultRoot).catch(() => {})
  }, 300)
}

async function doSync(rootFolder: FileNode, vaultRoot: string): Promise<void> {
  const sep = sepOf(vaultRoot)
  const desired = new Map<string, SyncedEntry>()
  await platform.fs.mkdir(vaultRoot).catch(() => {})
  for (const child of rootFolder.children || []) walk(child, vaultRoot + sep, desired, sep)

  const fs = platform.fs

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
        await fs.mkdir(cur.path).catch(() => {})
        synced.set(id, cur)
      } else if (prev.path !== cur.path) {
        // 目录改名 / 移动：连同子树 rename（walk 保证父先于子入 Map，故父目录先搬，
        // 子节点随后各自标记为已同步；其 rename 会因旧路径已不在而静默跳过）。
        await fs.mkdir(dirname(cur.path)).catch(() => {})
        try {
          await fs.rename(prev.path, cur.path)
        } catch {
          // 旧目录不在盘上（如外部已删/移走）→ 退化为新建，避免改名后目录整体消失
          await fs.mkdir(cur.path).catch(() => {})
        }
        synced.set(id, cur)
      }
      continue
    }
    if (!prev) {
      await fs.writeFile(cur.path, cur.content).catch(() => {})
      synced.set(id, cur)
    } else if (prev.path !== cur.path) {
      await fs.mkdir(dirname(cur.path)).catch(() => {})
      try {
        await fs.rename(prev.path, cur.path)
      } catch {
        // 旧文件不在盘上（外部已删/移动）→ 直接在新路径写出内容，避免改名丢文件
        await fs.writeFile(cur.path, cur.content).catch(() => {})
      }
      synced.set(id, cur)
    } else if (prev.content !== cur.content) {
      await fs.writeFile(cur.path, cur.content).catch(() => {})
      synced.set(id, cur)
    }
  }
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
