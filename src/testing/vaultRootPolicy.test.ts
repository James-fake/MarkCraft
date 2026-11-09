import { describe, it, expect } from 'vitest'
import { resolve, join } from 'node:path'
import {
  evaluateVaultRoot,
  isAncestorOrEqual,
  normalizeRoot,
  parseAuthorizedRoots,
} from '../../electron/main/vaultRootPolicy'

/**
 * C-1 回归锁：`mc:vault:registerRoot` 曾被渲染端任意字符串击穿 fs 白名单。
 * 这里锁死「根宽度 + 授权来源」判定，纯函数、不依赖 Electron。
 */
const HOME = resolve('C:', 'Users', 'HJN')
const USER_DATA = join(HOME, 'AppData', 'Roaming', 'MarkCraft')
const APP_PATH = resolve('D:', 'apps', 'MarkCraft', 'resources', 'app.asar')
const CWD = resolve('D:', 'work')
const PROTECTED = [HOME, USER_DATA, APP_PATH, CWD]
const VAULT = join(HOME, 'Documents', 'MyNotes')
const EXISTING = [USER_DATA]

describe('vaultRootPolicy · 根宽度校验', () => {
  it('[C-1 反例] 文件系统根一律拒绝', () => {
    const d = evaluateVaultRoot({
      candidate: parseRoot(),
      protectedPaths: PROTECTED,
      existingRoots: EXISTING,
      authorizedRoots: [],
      migrationPending: false,
    })
    expect(d.ok).toBe(false)
  })

  it('[C-1 反例] 用户主目录 / userData 的祖先拒绝', () => {
    for (const candidate of [HOME, join(HOME, 'AppData'), join(HOME, 'AppData', 'Roaming')]) {
      const d = evaluateVaultRoot({
        candidate,
        protectedPaths: PROTECTED,
        existingRoots: EXISTING,
        authorizedRoots: [],
        migrationPending: true,
      })
      expect(d.ok, candidate).toBe(false)
    }
  })

  it('[C-1 反例] 已登记允许根的祖先（扩权）拒绝', () => {
    const d = evaluateVaultRoot({
      candidate: join(HOME, 'Documents'),
      protectedPaths: PROTECTED,
      existingRoots: [USER_DATA, join(HOME, 'Documents', 'MyNotes', 'sub')],
      authorizedRoots: [],
      migrationPending: true,
    })
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toContain('扩权')
  })

  it('空值 / 相对路径形态的非法输入拒绝', () => {
    for (const candidate of [null, undefined, '', '   ', 42]) {
      expect(evaluateVaultRoot({
        candidate, protectedPaths: PROTECTED, existingRoots: EXISTING,
        authorizedRoots: [], migrationPending: true,
      }).ok).toBe(false)
    }
  })

  it('isAncestorOrEqual 自身与子路径判定正确', () => {
    expect(isAncestorOrEqual(VAULT, VAULT)).toBe(true)
    expect(isAncestorOrEqual(VAULT, join(VAULT, 'a', 'b.md'))).toBe(true)
    expect(isAncestorOrEqual(VAULT, join(HOME, 'Documents', 'Other'))).toBe(false)
  })
})

describe('vaultRootPolicy · 授权来源与迁移窗口', () => {
  it('[C-1 反例] 未授权根在非迁移窗口拒绝（即使结构合法）', () => {
    const d = evaluateVaultRoot({
      candidate: VAULT,
      protectedPaths: PROTECTED,
      existingRoots: EXISTING,
      authorizedRoots: [join(HOME, 'Documents', 'OtherVault')],
      migrationPending: false,
    })
    expect(d.ok).toBe(false)
  })

  it('已授权根放行，且不重复触发持久化', () => {
    const root = normalizeRoot(VAULT)
    const d = evaluateVaultRoot({
      candidate: root,
      protectedPaths: PROTECTED,
      existingRoots: EXISTING,
      authorizedRoots: [root],
      migrationPending: false,
    })
    expect(d).toEqual({ ok: true, root, authorize: false })
  })

  it('老版本升级的一次性窗口：首个合法根放行并要求持久化', () => {
    const d = evaluateVaultRoot({
      candidate: VAULT,
      protectedPaths: PROTECTED,
      existingRoots: EXISTING,
      authorizedRoots: [],
      migrationPending: true,
    })
    expect(d).toEqual({ ok: true, root: normalizeRoot(VAULT), authorize: true })
  })

  it('迁移窗口只开一次：集合非空后未授权根被拒', () => {
    const d = evaluateVaultRoot({
      candidate: join(HOME, 'Documents', 'AnotherVault'),
      protectedPaths: PROTECTED,
      existingRoots: EXISTING,
      authorizedRoots: [normalizeRoot(VAULT)],
      migrationPending: true,
    })
    expect(d.ok).toBe(false)
  })
})

describe('vaultRootPolicy · 持久化容错', () => {
  it('损坏 JSON / 非数组 / 混合类型一律安全降级', () => {
    expect(parseAuthorizedRoots(null)).toEqual([])
    expect(parseAuthorizedRoots('{not json')).toEqual([])
    expect(parseAuthorizedRoots('{"a":1}')).toEqual([])
    expect(parseAuthorizedRoots('[1, null, "", " /tmp/vault "]')).toEqual([normalizeRoot('/tmp/vault')])
  })

  it('正常列表规范化为绝对路径', () => {
    expect(parseAuthorizedRoots(JSON.stringify([VAULT]))).toEqual([normalizeRoot(VAULT)])
  })
})

function parseRoot(): string {
  return resolve(parseWinRoot())
}

function parseWinRoot(): string {
  // Windows 下 parse('C:\\').root；POSIX 下为 '/'
  return process.platform === 'win32' ? 'C:\\' : '/'
}
