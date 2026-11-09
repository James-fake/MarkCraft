import { isAbsolute, parse, relative, resolve } from 'node:path'

/**
 * Vault 根登记策略（2026-11-08 上线前审查 C-1）。
 *
 * 抽成纯模块的原因：这是 S0 安全关键判定，必须能脱离 Electron 单测。
 * 修复前 `mc:vault:registerRoot` 对渲染端输入零校验，被注入的渲染端一句
 * `registerRoot('C:\\')` 即可把整机加入 fs 白名单。现在登记必须同时满足：
 *   ① 不是文件系统根、不是受保护路径（主目录 / userData / 应用目录）的祖先；
 *   ② 不是任何已登记允许根的祖先（防止用更宽的根扩权）；
 *   ③ 在「用户显式授权过的 Vault 根」集合内；或处于老版本升级的一次性迁移窗口。
 *
 * 迁移窗口：老版本把 Vault 路径只存在渲染端 localStorage，主进程没有授权记录。
 * 升级后首次启动（持久化文件不存在且集合为空）放行第一个通过结构校验的根并持久化，
 * 之后集合固定、严格校验。该窗口内仍受 ①② 约束，无法登记整机或系统目录。
 */

export interface VaultRootPolicyInput {
  candidate: unknown
  /** 主目录 / userData / appPath / cwd 等：候选若为它们的祖先即拒绝 */
  protectedPaths: string[]
  /** 当前 allowedRoots（含 userData） */
  existingRoots: string[]
  /** 已由用户显式授权或持久化的 Vault 根 */
  authorizedRoots: string[]
  /** 持久化文件不存在（老版本升级首次运行） */
  migrationPending: boolean
}

export type VaultRootDecision =
  | { ok: true; root: string; authorize: boolean }
  | { ok: false; reason: string }

export function normalizeRoot(p: string): string {
  return resolve(p)
}

/** parent 等于或包含 child（词法路径，入参需已规范化）。 */
export function isAncestorOrEqual(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export function evaluateVaultRoot(input: VaultRootPolicyInput): VaultRootDecision {
  const { candidate, protectedPaths, existingRoots, authorizedRoots, migrationPending } = input
  if (typeof candidate !== 'string' || !candidate.trim()) {
    return { ok: false, reason: 'Vault 根必须是非空字符串' }
  }
  const root = normalizeRoot(candidate)

  if (root === parse(root).root) {
    return { ok: false, reason: '拒绝把文件系统根登记为 Vault' }
  }
  for (const p of protectedPaths) {
    if (!p) continue
    const protectedPath = normalizeRoot(p)
    if (isAncestorOrEqual(root, protectedPath)) {
      return { ok: false, reason: `拒绝登记受保护路径的祖先: ${root}` }
    }
  }
  for (const r of existingRoots) {
    if (r !== root && isAncestorOrEqual(root, r)) {
      return { ok: false, reason: `拒绝用更宽的根扩权（已登记 ${r}）` }
    }
  }

  if (authorizedRoots.includes(root)) return { ok: true, root, authorize: false }
  if (migrationPending && authorizedRoots.length === 0) {
    return { ok: true, root, authorize: true }
  }
  return { ok: false, reason: '拒绝登记未经用户授权的 Vault 根' }
}

/** 容错解析持久化文件；损坏/非数组一律返回空集合，不抛给启动流程。 */
export function parseAuthorizedRoots(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => normalizeRoot(x.trim()))
  } catch {
    return []
  }
}
