import { platform } from '@platform'
import { migrateLegacyIndexedDb } from './legacyIdbMigrate'

/**
 * 存储后端 —— 替代原先的 IndexedDB / Dexie。
 *
 * 为什么换：桌面端不该依赖浏览器数据库。原先 IndexedDB 是**应用级**的（非 Vault 级），
 * 故这里把根目录放在 Electron `userData` 下（`<userData>/storage/`），**换介质不换语义** ——
 * 知识库 / 白板 / 版本历史不随 Vault 切换而丢失。
 *
 * 后端可切换：
 * - `disk`：桌面端，走 `platform.fs`（真实文件，人类可读可备份）
 * - `memory`：jsdom 单测（`platform.app.userData()` 为 null 时），内存 Map
 */
export interface StorageBackend {
  getText(key: string): Promise<string | null>
  setText(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  /** 已存在的全部键 */
  keys(): Promise<string[]>
}

/** 键 → 安全文件名（键里可能出现 `/` `:` 等） */
function encodeKey(key: string): string {
  return encodeURIComponent(key)
}

function decodeKey(fileName: string): string {
  return decodeURIComponent(fileName.replace(/\.json$/, ''))
}

/**
 * 磁盘后端：每个键一个 JSON 文件（`<root>/storage/kv/<encoded>.json`）。
 * 值本身已是 JSON 字符串，直接落盘 —— 文件可被人类阅读/备份/git 管理。
 */
function makeDiskBackend(root: string): StorageBackend {
  const dir = `${root}/storage/kv`
  const fileOf = (key: string): string => `${dir}/${encodeKey(key)}.json`
  return {
    async getText(key: string): Promise<string | null> {
      const p = fileOf(key)
      try {
        if (!(await platform.fs.exists(p))) return null
        return await platform.fs.readFile(p)
      } catch {
        return null
      }
    },
    async setText(key: string, value: string): Promise<void> {
      await platform.fs.writeFile(fileOf(key), value)
    },
    async remove(key: string): Promise<void> {
      try {
        await platform.fs.remove(fileOf(key))
      } catch {
        /* 不存在即视为已删除 */
      }
    },
    async keys(): Promise<string[]> {
      try {
        const entries = await platform.fs.readDirectory(dir)
        return entries.filter((e) => !e.isDirectory).map((e) => decodeKey(e.name))
      } catch {
        return [] // 目录尚未创建
      }
    },
  }
}

/** 内存后端：jsdom 单测用（不落盘、不依赖 Electron） */
function makeMemoryBackend(): StorageBackend {
  const m = new Map<string, string>()
  return {
    async getText(key: string): Promise<string | null> {
      return m.has(key) ? (m.get(key) as string) : null
    },
    async setText(key: string, value: string): Promise<void> {
      m.set(key, value)
    },
    async remove(key: string): Promise<void> {
      m.delete(key)
    },
    async keys(): Promise<string[]> {
      return [...m.keys()]
    },
  }
}

let backendPromise: Promise<StorageBackend> | null = null

/** 取当前后端（首次调用时按平台决定，之后缓存） */
export function getStorageBackend(): Promise<StorageBackend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      const root = await platform.app?.userData?.().catch(() => null)
      const backend = root ? makeDiskBackend(root) : makeMemoryBackend()
      // 首次使用时把旧 IndexedDB（Dexie 时代）的数据搬过来 —— 一次性，失败不阻断启动。
      // 放在这里而非启动流程里：任何走存储的调用都会先等它完成，不会读到「还没搬完」的空数据。
      await migrateLegacyIndexedDb(backend).catch(() => false)
      return backend
    })()
  }
  return backendPromise
}

/**
 * 重置后端缓存（仅测试用）。
 * 内存后端是模块级单例，测试间需清干净，避免用例互相污染。
 */
export function resetStorageBackendForTests(): void {
  backendPromise = null
}
