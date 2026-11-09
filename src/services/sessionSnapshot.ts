import { kvGet, kvSet, kvDelete } from '@core/storage/kv'
import { logger } from '@utils/logger'

/**
 * 会话快照（Vault 模式的标签页持久化，2026-11-03 审查 P1）。
 *
 * 背景：桌面 Vault 模式的 save effect 只把**树**同步到磁盘（磁盘为真相源），
 * 然后直接 return —— 标签页 / 活动标签 / 侧栏状态全部不落盘，重启即丢失。
 * 树与磁盘不冲突，会话态是独立的一层，应当单独持久化。
 *
 * 存**相对路径**而不是节点 id：Vault 每次 loadVault 都会为同一批文件重新生成 id，
 * id 跨会话无意义；路径是稳定标识。恢复时按路径映射回新树的 id。
 */
export interface SessionTabSnapshot {
  /** 相对 Vault 根的路径（`文件夹/文件.md`） */
  path: string
  name: string
}

export interface SessionSnapshot {
  tabs: SessionTabSnapshot[]
  /** 活动标签的相对路径 */
  activeTabPath: string | null
  searchQuery: string
  sidebarVisible: boolean
}

const SESSION_KEY = 'markcraft-session-v1'

export async function saveSessionSnapshot(snapshot: SessionSnapshot): Promise<void> {
  try {
    await kvSet(SESSION_KEY, JSON.stringify(snapshot))
  } catch (err) {
    // 会话态丢失不影响数据，但要让排查有据可依
    logger.error('[session] 会话快照写入失败：', err)
  }
}

export async function loadSessionSnapshot(): Promise<SessionSnapshot | null> {
  try {
    const raw = await kvGet(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionSnapshot
    if (!parsed || !Array.isArray(parsed.tabs)) return null
    return {
      tabs: parsed.tabs.filter((t) => typeof t?.path === 'string' && t.path.length > 0),
      activeTabPath: typeof parsed.activeTabPath === 'string' ? parsed.activeTabPath : null,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      sidebarVisible: parsed.sidebarVisible !== false,
    }
  } catch (err) {
    logger.error('[session] 会话快照读取失败：', err)
    return null
  }
}

export async function clearSessionSnapshot(): Promise<void> {
  try {
    await kvDelete(SESSION_KEY)
  } catch {
    /* 清理失败无害 */
  }
}
