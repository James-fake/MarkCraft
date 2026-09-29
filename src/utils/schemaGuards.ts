/**
 * 最小 schema 守卫（M-2 收口）。
 *
 * `safeJsonParse` 已解决「非法 JSON 抛异常 → 白屏」；本模块解决第二类问题：
 * **JSON 合法但结构损坏 / 旧 schema** 的记录。这类数据若直接喂给业务逻辑，会静默装错
 * 数据，或在访问某些字段时崩溃。守卫只校验「关键不变量」（不递归子树、不强制可选字段），
 * 调用方据此在损坏时回退默认值，而非崩溃或带病运行。
 */

import type { FileNode, FileManagerState } from '../types/fileManager'

/** 非 null 的纯对象（非数组、非原始值）。用于拦截「合法 JSON 但形状错误」的记录。 */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** FileNode 最小守卫：id/name 为字符串、type 合法、children 若存在须为数组。 */
export function isFileNode(x: unknown): x is FileNode {
  if (!isRecord(x)) return false
  const n = x as Record<string, unknown>
  return (
    typeof n.id === 'string' &&
    typeof n.name === 'string' &&
    (n.type === 'file' || n.type === 'folder') &&
    (n.children === undefined || Array.isArray(n.children))
  )
}

/**
 * FileManagerState 最小守卫：rootFolder 须为合法 FileNode（自带 children 数组校验）、
 * tabs 若存在须为数组。不递归校验子树、不强制 createdAt/updatedAt，避免误拒合法数据。
 */
export function isFileManagerState(x: unknown): x is FileManagerState {
  if (!isRecord(x)) return false
  const s = x as Record<string, unknown>
  return isFileNode(s.rootFolder) && (s.tabs === undefined || Array.isArray(s.tabs))
}
