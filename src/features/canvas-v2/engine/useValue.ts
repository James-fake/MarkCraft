import { useEffect, useRef, useState } from 'react'
import { useOptionalCanvasEngine } from './useCanvasEngine'

/**
 * 自研 useValue（P2 C3：替代 tldraw `useValue`，签名兼容 name/compute/deps）
 *
 * 从 CanvasEngineContext 取引擎，订阅 store document 变更后重算派生值。
 * - 与 tldraw useValue 相同签名（name / compute / deps），调用点零改动；
 * - deps 仅保留签名兼容，实际通过 ref 持有最新 compute（避免闭包捕获旧值）；
 * - 引擎就绪前（Provider 外或未挂载）返回 undefined。
 */
export function useValue<T>(_name: string, compute: () => T, _deps?: unknown[]): T {
  const editor = useOptionalCanvasEngine()
  const computeRef = useRef(compute)
  computeRef.current = compute
  const [val, setVal] = useState<T>(() => (editor ? compute() : (undefined as unknown as T)))

  useEffect(() => {
    if (!editor) return
    const unsub = editor.store.listen(() => setVal(computeRef.current()), { scope: 'document' })
    return unsub
  }, [editor])

  return val
}
