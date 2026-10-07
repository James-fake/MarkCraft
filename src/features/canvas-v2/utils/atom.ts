/**
 * 自研最小 atom（P2 C3：替代 `@tldraw/state` 的 atom）
 *
 * 仅需 get/set 语义（状态存储）；响应式重渲染由 useValue 订阅 store document 变更完成，
 * 不再依赖原子级信号跟踪。与 tldraw atom 签名兼容（name/initial → get/set/update）。
 */
export interface Atom<T> {
  get: () => T
  set: (value: T | ((prev: T) => T)) => void
}

export function atom<T>(_name: string, initial: T): Atom<T> {
  let value = initial
  return {
    get: () => value,
    set: (v) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(value) : v
      if (next !== value) value = next
    },
  }
}
